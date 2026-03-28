import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from backend import schemas
from backend.models import DutyAssignment, Admin
from backend.security import get_current_active_user
from backend.utils.logger import setup_logger 

router = APIRouter(
    prefix="/duty_list",
    tags=["Duty List"],
    dependencies=[Depends(get_current_active_user)]
)

logger = setup_logger("DutyListRouter", log_file="logs/duty_list.log", level=logging.DEBUG)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_duty_assignment(assignments: List[schemas.DutyAssignmentCreate], current_user: dict = Depends(get_current_active_user)):
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can assign workforce duties.")

    created_records = []
    try:
        for item in assignments:
            # Check for existing assignment to prevent duplicates
            existing = await DutyAssignment.find_one(
                DutyAssignment.employee_id == item.employee_id, 
                DutyAssignment.date == item.date
            )
            
            if existing:
                existing.site_id = item.site_id
                existing.manager_id = item.manager_id
                await existing.save()
            else:
                new_duty = DutyAssignment(
                    employee_id=item.employee_id, 
                    site_id=item.site_id, 
                    manager_id=item.manager_id, 
                    date=item.date
                )
                await new_duty.insert()
        return {"message": "Duty assignments saved successfully"}
    except Exception as e:
        logger.error(f"POST Duty Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save assignments.")

@router.get("/{date}")
async def get_duty_list_by_date(date: str, current_user: dict = Depends(get_current_active_user)):
    try:
        user_role = current_user.get("role")
        user_email = current_user.get("sub")
        
        # 1. Fetch the Admin profile safely
        me = await Admin.find_one(Admin.email == user_email)
        
        # 2. If it's an Owner, show all assignments for that date
        if user_role in ["SuperAdmin", "Admin"]:
            return await DutyAssignment.find(DutyAssignment.date == date).to_list()
        
        # 3. If it's a Manager, filter by their UID
        if not me:
            # Fallback if the user is a manager but not in Admin table
            return []

        return await DutyAssignment.find(
            DutyAssignment.date == date, 
            DutyAssignment.manager_id == me.uid
        ).to_list()
    except Exception as e:
        logger.error(f"GET Duty Error: {e}")
        # Return empty list instead of crashing with 500
        return []

@router.delete("/{id}")
async def delete_duty_assignment(id: str):
    try:
        record = await DutyAssignment.get(id)
        if not record: 
            raise HTTPException(status_code=404, detail="Assignment not found")
        await record.delete()
        return {"message": "Assignment removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Delete failed")