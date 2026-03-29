import asyncio
import logging
import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from backend.models import Conversation, Message, Admin, Employee
from backend.security import get_current_active_user
from backend.database import get_next_uid
from backend.websocket_manager import manager as ws_manager
from backend.utils.logger import setup_logger

router = APIRouter(
    prefix="/messages",
    tags=["Messages"],
    dependencies=[Depends(get_current_active_user)]
)

logger = setup_logger("MessagesRouter", log_file="logs/messages.log", level=logging.DEBUG)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def _get_current_user_profile(current_user: dict):
    """
    Returns (profile_object, uid, sender_role, sender_type).
    Checks Admin first, then Employee.
    """
    me = await Admin.find_one(Admin.email == current_user.get("sub"))
    if me:
        sender_type = "admin" if me.role in ["SuperAdmin", "Admin"] else "manager"
        return me, me.uid, me.role, sender_type

    uid = current_user.get("uid") or current_user.get("id")
    if uid:
        me = await Employee.find_one(Employee.uid == uid)
        if me:
            return me, me.uid, "Employee", "employee"

    raise HTTPException(status_code=404, detail="User profile not found")


async def create_conversation(
    conversation_type: str,
    created_by_id: int,
    created_by_name: str,
    created_by_role: str,
    participant_ids: List[int],
    participant_names: List[str],
    title: str,
) -> Conversation:
    """Helper to create a new conversation."""
    new_conv = Conversation(
        uid=await get_next_uid("conversations"),
        conversation_type=conversation_type,
        created_by_id=created_by_id,
        created_by_name=created_by_name,
        created_by_role=created_by_role,
        participant_ids=participant_ids,
        participant_names=participant_names,
        title=title,
        unread_count_map={str(pid): 0 for pid in participant_ids},
    )
    await new_conv.insert()
    logger.info(
        f"Created conversation: {title} (Type: {conversation_type}, Participants: {len(participant_ids)})"
    )
    return new_conv


async def add_message_to_conversation(
    conversation_id: int,
    sender_id: int,
    sender_name: str,
    sender_role: str,
    sender_type: str,
    content: str,
) -> Message:
    """Add a message to a conversation and update conversation metadata."""

    new_message = Message(
        uid=await get_next_uid("messages"),
        conversation_id=conversation_id,
        sender_id=sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        sender_type=sender_type,
        content=content,
        read_by_ids=[sender_id],
    )
    await new_message.insert()

    conv = await Conversation.find_one(Conversation.uid == conversation_id)
    if conv:
        conv.last_message_at = datetime.now()
        conv.last_message_preview = content[:50]

        for pid in conv.participant_ids:
            if pid != sender_id:
                key = str(pid)
                conv.unread_count_map[key] = conv.unread_count_map.get(key, 0) + 1

        await conv.save()

    logger.info(f"Message added to conversation {conversation_id} by {sender_name}")

    # WebSocket broadcast
    await ws_manager.broadcast(
        json.dumps(
            {
                "type": "new_message",
                "conversation_id": conversation_id,
                "message": {
                    "id": new_message.uid,
                    "sender_name": sender_name,
                    "content": content,
                    "timestamp": new_message.timestamp.isoformat(),
                },
            }
        )
    )

    return new_message


# =============================================================================
# ENDPOINT 1: BROADCAST TO ALL (PHASE 1)
# =============================================================================

@router.post("/broadcast/all", status_code=status.HTTP_201_CREATED)
async def broadcast_to_all(
    content: str,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Admin broadcasts a message to everyone (all admins, managers, employees).
    """
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can create broadcasts")

    me = await Admin.find_one(Admin.email == current_user.get("sub"))
    if not me:
        raise HTTPException(status_code=404, detail="Admin profile not found")

    admins = await Admin.find(Admin.is_active == True).to_list()
    employees = await Employee.find(Employee.is_active == True).to_list()

    participant_ids = [a.uid for a in admins] + [e.uid for e in employees]
    participant_names = [a.full_name for a in admins] + [e.name for e in employees]

    conv = await create_conversation(
        conversation_type="broadcast_all",
        created_by_id=me.uid,
        created_by_name=me.full_name,
        created_by_role=me.role,
        participant_ids=participant_ids,
        participant_names=participant_names,
        title="📢 Broadcast: All",
    )

    await add_message_to_conversation(
        conversation_id=conv.uid,
        sender_id=me.uid,
        sender_name=me.full_name,
        sender_role=me.role,
        sender_type="admin",
        content=content,
    )

    return {"message": "Broadcast sent to all users", "conversation_id": conv.uid}


# =============================================================================
# ENDPOINT 2: BROADCAST TO MANAGERS ONLY
# =============================================================================

@router.post("/broadcast/managers", status_code=status.HTTP_201_CREATED)
async def broadcast_to_managers(
    content: str,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Admin broadcasts a message to all Site Managers and Admins only.
    """
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can create broadcasts")

    me = await Admin.find_one(Admin.email == current_user.get("sub"))
    if not me:
        raise HTTPException(status_code=404, detail="Admin profile not found")

    managers = await Admin.find(Admin.is_active == True).to_list()

    participant_ids = [a.uid for a in managers]
    participant_names = [a.full_name for a in managers]

    conv = await create_conversation(
        conversation_type="broadcast_managers",
        created_by_id=me.uid,
        created_by_name=me.full_name,
        created_by_role=me.role,
        participant_ids=participant_ids,
        participant_names=participant_names,
        title="📢 Broadcast: Managers",
    )

    await add_message_to_conversation(
        conversation_id=conv.uid,
        sender_id=me.uid,
        sender_name=me.full_name,
        sender_role=me.role,
        sender_type="admin",
        content=content,
    )

    return {"message": "Broadcast sent to managers", "conversation_id": conv.uid}


# =============================================================================
# ENDPOINT 3: BROADCAST TO EMPLOYEES ONLY
# =============================================================================

@router.post("/broadcast/employees", status_code=status.HTTP_201_CREATED)
async def broadcast_to_employees(
    content: str,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Admin broadcasts a message to all Employees and Admins only.
    """
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can create broadcasts")

    me = await Admin.find_one(Admin.email == current_user.get("sub"))
    if not me:
        raise HTTPException(status_code=404, detail="Admin profile not found")

    admins = await Admin.find(Admin.is_active == True).to_list()
    employees = await Employee.find(Employee.is_active == True).to_list()

    participant_ids = [a.uid for a in admins] + [e.uid for e in employees]
    participant_names = [a.full_name for a in admins] + [e.name for e in employees]

    conv = await create_conversation(
        conversation_type="broadcast_employees",
        created_by_id=me.uid,
        created_by_name=me.full_name,
        created_by_role=me.role,
        participant_ids=participant_ids,
        participant_names=participant_names,
        title="📢 Broadcast: Employees",
    )

    await add_message_to_conversation(
        conversation_id=conv.uid,
        sender_id=me.uid,
        sender_name=me.full_name,
        sender_role=me.role,
        sender_type="admin",
        content=content,
    )

    return {"message": "Broadcast sent to employees", "conversation_id": conv.uid}


# =============================================================================
# ENDPOINT 4: BROADCAST TO CUSTOM RECIPIENTS
# =============================================================================


class CustomBroadcastRequest(BaseModel):
    content: str
    recipient_ids: List[int]  # UIDs of selected admins/employees


@router.post("/broadcast/custom", status_code=status.HTTP_201_CREATED)
async def broadcast_to_custom(
    payload: CustomBroadcastRequest,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Admin broadcasts a message to a specific subset of users.
    """
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can create broadcasts")

    me = await Admin.find_one(Admin.email == current_user.get("sub"))
    if not me:
        raise HTTPException(status_code=404, detail="Admin profile not found")

    if not payload.recipient_ids:
        raise HTTPException(status_code=400, detail="recipient_ids must not be empty")

    # Ensure sender is always included
    all_ids = list(set(payload.recipient_ids) | {me.uid})

    # Resolve names for all recipients
    admins = await Admin.find(Admin.is_active == True).to_list()
    employees = await Employee.find(Employee.is_active == True).to_list()

    uid_to_name: dict = {}
    for a in admins:
        uid_to_name[a.uid] = a.full_name
    for e in employees:
        uid_to_name[e.uid] = e.name

    participant_names = [uid_to_name.get(pid, f"User {pid}") for pid in all_ids]

    conv = await create_conversation(
        conversation_type="broadcast_custom",
        created_by_id=me.uid,
        created_by_name=me.full_name,
        created_by_role=me.role,
        participant_ids=all_ids,
        participant_names=participant_names,
        title="📢 Broadcast: Custom",
    )

    await add_message_to_conversation(
        conversation_id=conv.uid,
        sender_id=me.uid,
        sender_name=me.full_name,
        sender_role=me.role,
        sender_type="admin",
        content=payload.content,
    )

    return {"message": "Custom broadcast sent", "conversation_id": conv.uid}


# =============================================================================
# ENDPOINT 5: START PRIVATE CHAT (Admin ↔ Manager)
# =============================================================================

class PrivateChatRequest(BaseModel):
    recipient_id: int
    content: str


@router.post("/private", status_code=status.HTTP_201_CREATED)
async def start_private_chat(
    payload: PrivateChatRequest,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Start (or reuse) a private one-on-one conversation between the current user
    and another user. Each pair shares at most one private conversation.
    """
    me, my_id, my_role, my_type = await _get_current_user_profile(current_user)

    # Look up recipient
    recipient = await Admin.find_one(Admin.uid == payload.recipient_id)
    if not recipient:
        recipient = await Employee.find_one(Employee.uid == payload.recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    recipient_name = getattr(recipient, "full_name", None) or getattr(recipient, "name", "Unknown")

    # Check if a private conversation already exists between these two users
    # (exactly two participants - not a group conversation)
    existing = await Conversation.find(
        Conversation.conversation_type == "private",
        Conversation.participant_ids == my_id,
        Conversation.participant_ids == payload.recipient_id,
    ).first_or_none()

    # Verify it really is a 1-on-1 thread (no extra participants)
    if existing and len(existing.participant_ids) != 2:
        existing = None

    if existing:
        conv = existing
    else:
        my_name = getattr(me, "full_name", None) or getattr(me, "name", "Unknown")
        conv = await create_conversation(
            conversation_type="private",
            created_by_id=my_id,
            created_by_name=my_name,
            created_by_role=my_role,
            participant_ids=[my_id, payload.recipient_id],
            participant_names=[my_name, recipient_name],
            title=f"💬 Chat: {my_name} & {recipient_name}",
        )

    await add_message_to_conversation(
        conversation_id=conv.uid,
        sender_id=my_id,
        sender_name=getattr(me, "full_name", None) or getattr(me, "name", "Unknown"),
        sender_role=my_role,
        sender_type=my_type,
        content=payload.content,
    )

    return {"message": "Private message sent", "conversation_id": conv.uid}


# =============================================================================
# ENDPOINT 6: GET MY CONVERSATIONS
# =============================================================================

@router.get("/conversations")
async def get_my_conversations(current_user: dict = Depends(get_current_active_user)):
    """Get all conversations visible to the current user, sorted by most recent."""
    _, my_id, _, _ = await _get_current_user_profile(current_user)

    conversations = (
        await Conversation.find(Conversation.participant_ids == my_id)
        .sort(-Conversation.last_message_at)
        .to_list()
    )

    result = []
    for conv in conversations:
        result.append(
            {
                "id": conv.uid,
                "type": conv.conversation_type,
                "title": conv.title,
                "last_message_at": conv.last_message_at.isoformat(),
                "last_message_preview": conv.last_message_preview,
                "unread_count": conv.unread_count_map.get(str(my_id), 0),
                "participant_count": len(conv.participant_ids),
                "created_by_name": conv.created_by_name,
            }
        )

    return result


# =============================================================================
# ENDPOINT 7: GET MESSAGES IN A CONVERSATION
# =============================================================================

@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: int,
    current_user: dict = Depends(get_current_active_user),
):
    """Get all messages in a conversation and mark them as read."""
    conv = await Conversation.find_one(Conversation.uid == conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    _, my_id, _, _ = await _get_current_user_profile(current_user)

    if my_id not in conv.participant_ids:
        raise HTTPException(
            status_code=403, detail="You are not a participant in this conversation"
        )

    messages = (
        await Message.find(Message.conversation_id == conversation_id)
        .sort(+Message.timestamp)
        .to_list()
    )

    # Batch-mark unread messages as read in parallel to avoid N+1 saves
    unread_msgs = [msg for msg in messages if my_id not in msg.read_by_ids]
    for msg in unread_msgs:
        msg.read_by_ids.append(my_id)
    if unread_msgs:
        await asyncio.gather(*[msg.save() for msg in unread_msgs])

    conv.unread_count_map[str(my_id)] = 0
    await conv.save()

    return [
        {
            "id": msg.uid,
            "sender_id": msg.sender_id,
            "sender_name": msg.sender_name,
            "sender_role": msg.sender_role,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat(),
            "is_read": my_id in msg.read_by_ids,
        }
        for msg in messages
    ]


# =============================================================================
# ENDPOINT 8: REPLY TO A CONVERSATION
# =============================================================================

@router.post("/{conversation_id}/reply", status_code=status.HTTP_201_CREATED)
async def reply_to_conversation(
    conversation_id: int,
    content: str,
    current_user: dict = Depends(get_current_active_user),
):
    """Reply to an existing conversation (broadcast or private)."""
    conv = await Conversation.find_one(Conversation.uid == conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    me, sender_id, sender_role, sender_type = await _get_current_user_profile(current_user)
    sender_name = getattr(me, "full_name", None) or getattr(me, "name", "Unknown")

    if sender_id not in conv.participant_ids:
        raise HTTPException(
            status_code=403, detail="You are not a participant in this conversation"
        )

    await add_message_to_conversation(
        conversation_id=conversation_id,
        sender_id=sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        sender_type=sender_type,
        content=content,
    )

    return {"message": "Reply sent"}
