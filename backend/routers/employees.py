import json
import os
import shutil
import logging
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Query
from fastapi.responses import FileResponse

# --- Imports ---
from backend import schemas
from backend.models import Employee, Admin
from backend.database import get_next_uid
from backend.security import get_current_active_user
from backend.utils.logger import setup_logger 

# WebSocket Manager
try:
    from backend.websocket_manager import manager
except ImportError:
    from backend.websocket_manager import manager 

router = APIRouter(
    prefix="/employees",
    tags=["Employees"],
    dependencies=[Depends(get_current_active_user)]
)

logger = setup_logger("EmployeesRouter", log_file="logs/employees_router.log", level=logging.DEBUG)

UPLOAD_DIRECTORY = os.path.join("backend", "uploads")
PHOTO_DIR = os.path.join(UPLOAD_DIRECTORY, "photos")
DOCUMENT_DIR = os.path.join(UPLOAD_DIRECTORY, "documents")

# Ensure upload directories exist
os.makedirs(PHOTO_DIR, exist_ok=True)
os.makedirs(DOCUMENT_DIR, exist_ok=True)

# --- Helper: Save Uploaded Files ---
def save_upload_file(upload_file: UploadFile, destination: str) -> str:
    try:
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        logger.debug(f"File Saved: {destination}")
    except Exception as e:
        logger.error(f"File Save Error: {e}")
        raise HTTPException(status_code=500, detail="Could not save file.")
    finally:
        upload_file.file.close()
    return destination

# =============================================================================
# 1. GET EMPLOYEES (Manager-Aware Filtering)
# =============================================================================
# =============================================================================
# 1. GET EMPLOYEES (Manager-Aware Filtering)
# =============================================================================
@router.get("/", response_model=List[schemas.EmployeeFull])
async def get_all_employees(current_user: dict = Depends(get_current_active_user)):
    user_role = current_user.get("role")
    user_email = current_user.get("sub")
    
    try:
        if user_role in ["SuperAdmin", "Admin"]:
            # Admins see ALL employees (no filtering needed)
            employees = await Employee.find_all().sort(+Employee.uid).to_list()
            logger.info(f"Admin Access ({user_email}): Retrieved all {len(employees)} employees.")
        
        else:
            # Site Managers see only their assigned employees
            # Fetch manager's profile to get their UID
            me = await Admin.find_one(Admin.email == user_email)
            if not me:
                logger.error(f"Manager profile not found for email: {user_email}")
                raise HTTPException(status_code=404, detail="Manager profile not found")
            
            # Filter employees by manager_id
            employees = await Employee.find(Employee.manager_id == me.uid).sort(+Employee.uid).to_list()
            logger.info(f"Manager Access (UID: {me.uid}, Email: {user_email}): Retrieved {len(employees)} assigned employees.")

        return employees

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching employees: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")




# @router.get("/", response_model=List[schemas.EmployeeFull])
# async def get_all_employees(current_user: dict = Depends(get_current_active_user)):
#     user_role = current_user.get("role")
#     user_email = current_user.get("sub")
    
#     # Fetch current user's profile to get their UID
#     me = await Admin.find_one(Admin.email == user_email)
#     if not me:
#         raise HTTPException(status_code=404, detail="Admin profile not found")

#     try:
#         if user_role in ["SuperAdmin", "Admin"]:
#             # Owners see everyone
#             employees = await Employee.find_all().sort(+Employee.uid).to_list()
#             logger.info(f"Admin Access: Retrieved all {len(employees)} employees.")
#         else:
#             # Managers see only employees explicitly assigned to them
#             employees = await Employee.find(Employee.manager_id == me.uid).sort(+Employee.uid).to_list()
#             logger.info(f"Manager Access (ID: {me.uid}): Retrieved {len(employees)} assigned employees.")

#         return employees

#     except Exception as e:
#         logger.error(f"Error fetching employees: {e}")
#         raise HTTPException(status_code=500, detail="Internal Server Error")

# =============================================================================
# 2. GET SINGLE EMPLOYEE
# =============================================================================
@router.get("/{employee_id}", response_model=schemas.EmployeeFull)
async def get_employee_by_id(employee_id: int, current_user: dict = Depends(get_current_active_user)):
    emp = await Employee.find_one(Employee.uid == employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Permission Check for Managers
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        me = await Admin.find_one(Admin.email == current_user.get("sub"))
        if emp.manager_id != me.uid:
            raise HTTPException(status_code=403, detail="Access Denied to this employee record.")

    return emp

# =============================================================================
# 3. CREATE EMPLOYEE (Admins Only)
# =============================================================================
@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.EmployeeFull)
async def create_employee(
    name: str = Form(...),
    designation: str = Form(...),
    basic_salary: float = Form(0.0),
    standard_work_days: int = Form(28),
    employee_type: str = Form("Company"),
    allowance: float = Form(0.0),
    default_hourly_rate: float = Form(0.0),
    status_field: str = Form("Active", alias="status"),
    nationality: Optional[str] = Form(None),
    permanent_address: Optional[str] = Form(None),
    phone_kuwait: Optional[str] = Form(None),
    phone_home_country: Optional[str] = Form(None),
    emergency_contact_name: Optional[str] = Form(None),
    emergency_contact_number: Optional[str] = Form(None),
    civil_id_number: Optional[str] = Form(None),
    civil_id_expiry: Optional[str] = Form(None),
    passport_number: Optional[str] = Form(None),
    passport_expiry: Optional[str] = Form(None),
    date_of_joining: Optional[str] = Form(None),
    contract_end_date: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    passport_file: Optional[UploadFile] = File(None),
    visa_file: Optional[UploadFile] = File(None),
    manager_id: Optional[int] = Form(None),
    current_user: dict = Depends(get_current_active_user)
):
    # Only High-level admins can add new employees to the system
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can create new employee records.")

    # Validate manager exists and has the correct role if provided
    if manager_id is not None:
        mgr = await Admin.find_one(Admin.uid == manager_id)
        if not mgr or mgr.role != "Site Manager":
            raise HTTPException(status_code=400, detail="Invalid manager ID: must be an active Site Manager.")

    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        passport_path = None
        visa_path = None

        if passport_file and passport_file.filename:
            passport_path = os.path.join(UPLOAD_DIRECTORY, "passports", f"pp_{timestamp}_{passport_file.filename}")
            save_upload_file(passport_file, passport_path)

        if visa_file and visa_file.filename:
            visa_path = os.path.join(UPLOAD_DIRECTORY, "visas", f"visa_{timestamp}_{visa_file.filename}")
            save_upload_file(visa_file, visa_path)

        # Parse date fields
        def parse_date(val):
            if not val:
                return None
            try:
                from datetime import date as date_type
                return date_type.fromisoformat(val)
            except (ValueError, TypeError):
                return None

        new_uid = await get_next_uid("employees")
        new_employee = Employee(
            uid=new_uid,
            name=name,
            designation=designation,
            basic_salary=basic_salary,
            standard_work_days=standard_work_days,
            employee_type=employee_type,
            allowance=allowance,
            default_hourly_rate=default_hourly_rate,
            status=status_field,
            nationality=nationality,
            permanent_address=permanent_address,
            phone_kuwait=phone_kuwait,
            phone_home_country=phone_home_country,
            emergency_contact_name=emergency_contact_name,
            emergency_contact_number=emergency_contact_number,
            civil_id_number=civil_id_number,
            civil_id_expiry=parse_date(civil_id_expiry),
            passport_number=passport_number,
            passport_expiry=parse_date(passport_expiry),
            date_of_joining=parse_date(date_of_joining),
            contract_end_date=parse_date(contract_end_date),
            date_of_birth=parse_date(date_of_birth),
            passport_path=passport_path,
            visa_path=visa_path,
            manager_id=manager_id
        )
        
        await new_employee.insert()
        
        # Broadcast via WebSocket - use schema to convert uid → id correctly
        emp_dict = schemas.EmployeeFull.model_validate(new_employee).model_dump(mode='json')
        await manager.broadcast(json.dumps({"type": "employee_update", "data": emp_dict}))
        
        return new_employee

    except Exception as e:
        logger.error(f"Creation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create employee")

# =============================================================================
# 4. UPDATE EMPLOYEE (Admins Only - Managers have view-only access)
# =============================================================================
@router.put("/{employee_id}", response_model=schemas.EmployeeFull)
async def update_employee(
    employee_id: int, 
    employee_update: schemas.EmployeeUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    # Only SuperAdmin and Admin can edit employee details (including salary/allowance)
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only Admins can edit employee details. Site Managers have view-only access."
        )

    emp = await Employee.find_one(Employee.uid == employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Apply updates
    data = employee_update.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(emp, key, value)
    
    await emp.save()
    
    # WebSocket Broadcast - use schema to convert uid → id correctly
    emp_dict = schemas.EmployeeFull.model_validate(emp).model_dump(mode='json')
    await manager.broadcast(json.dumps({"type": "employee_update", "data": emp_dict}))
    
    return emp

# =============================================================================
# 5. DELETE EMPLOYEE (Admins Only)
# =============================================================================
@router.delete("/{employee_id}", status_code=204)
async def delete_employee(employee_id: int, current_user: dict = Depends(get_current_active_user)):
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can delete employees from the system.")

    emp = await Employee.find_one(Employee.uid == employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    await emp.delete()
    
    # WebSocket Broadcast delete event
    await manager.broadcast(json.dumps({"type": "employee_delete", "id": employee_id}))
    
    return None


# =============================================================================
# 6. UPLOAD EMPLOYEE PHOTO
# =============================================================================

# Map content-type → safe file extension (avoids using user-provided filename)
_CONTENT_TYPE_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
}

@router.post("/{employee_id}/upload-photo")
async def upload_employee_photo(
    employee_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    """Upload employee photo (JPG/PNG)"""
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can upload employee photos.")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")

    # Validate file signature (magic bytes) for common image types
    is_jpeg = len(content) >= 3 and content[:3] == b"\xff\xd8\xff"
    is_png = len(content) >= 8 and content[:8] == b"\x89PNG\r\n\x1a\n"
    is_gif = len(content) >= 6 and content[:6] in (b"GIF87a", b"GIF89a")
    is_webp = len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    if not (is_jpeg or is_png or is_gif or is_webp):
        raise HTTPException(status_code=400, detail="File content does not match an allowed image format")

    emp = await Employee.find_one(Employee.uid == employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Delete old photo if exists
    if emp.photo_path and os.path.exists(emp.photo_path):
        try:
            os.remove(emp.photo_path)
        except OSError:
            pass

    # Derive extension from content-type (NOT from user-provided filename)
    ext = _CONTENT_TYPE_EXT.get(file.content_type.lower(), "jpg")
    filename = f"emp_{employee_id}_photo_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
    file_path = os.path.join(PHOTO_DIR, filename)

    os.makedirs(PHOTO_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    emp.photo_path = file_path
    emp.updated_at = datetime.datetime.now()
    await emp.save()

    logger.debug("Photo uploaded for employee uid=%s", employee_id)
    return {"message": "Photo uploaded successfully", "path": file_path}


# =============================================================================
# 7. UPLOAD EMPLOYEE DOCUMENT
# =============================================================================
_VALID_DOCUMENT_TYPES = frozenset(["civil_id", "passport", "visa"])

@router.post("/{employee_id}/upload-document")
async def upload_employee_document(
    employee_id: int,
    document_type: str = Query(..., description="'civil_id' | 'passport' | 'visa'"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    """Upload employee documents (PDF only)"""
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can upload employee documents.")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    if document_type not in _VALID_DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid document type. Must be 'civil_id', 'passport', or 'visa'.")

    # Validate file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")

    # Validate PDF magic bytes
    if not (len(content) >= 4 and content[:4] == b"%PDF"):
        raise HTTPException(status_code=400, detail="File content is not a valid PDF")

    emp = await Employee.find_one(Employee.uid == employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Build filename using only the integer employee_id and a timestamp (no user strings)
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    filename = f"emp_{employee_id}_{timestamp}.pdf"
    file_path = os.path.join(DOCUMENT_DIR, filename)

    os.makedirs(DOCUMENT_DIR, exist_ok=True)

    # Delete old document if exists; update employee record field
    old_path = None
    if document_type == "civil_id":
        old_path = emp.civil_id_document_path
        emp.civil_id_document_path = file_path
    elif document_type == "passport":
        old_path = emp.passport_document_path
        emp.passport_document_path = file_path
    elif document_type == "visa":
        old_path = emp.visa_document_path
        emp.visa_document_path = file_path

    if old_path and os.path.exists(old_path):
        try:
            os.remove(old_path)
        except OSError:
            pass

    with open(file_path, "wb") as f:
        f.write(content)

    emp.updated_at = datetime.datetime.now()
    await emp.save()

    logger.debug("Document uploaded for employee uid=%s", employee_id)
    return {"message": f"{document_type} document uploaded successfully", "path": file_path}


# =============================================================================
# 8. DOWNLOAD EMPLOYEE DOCUMENT / PHOTO
# =============================================================================
@router.get("/{employee_id}/download/{document_type}")
async def download_employee_document(
    employee_id: int,
    document_type: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Download employee document or photo"""
    emp = await Employee.find_one(Employee.uid == employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Permission check for managers
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        me = await Admin.find_one(Admin.email == current_user.get("sub"))
        if not me or emp.manager_id != me.uid:
            raise HTTPException(status_code=403, detail="Access denied.")

    file_path = None
    if document_type == "photo":
        file_path = emp.photo_path
    elif document_type == "civil_id":
        file_path = emp.civil_id_document_path
    elif document_type == "passport":
        file_path = emp.passport_document_path or emp.passport_path
    elif document_type == "visa":
        file_path = emp.visa_document_path or emp.visa_path
    else:
        raise HTTPException(status_code=400, detail="Invalid document type.")

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found")

    return FileResponse(file_path, filename=os.path.basename(file_path))





























# router = APIRouter(
#     prefix="/employees",
#     tags=["Employees"],
#     dependencies=[Depends(get_current_active_user)]
# )

# UPLOAD_DIRECTORY = os.path.join("backend", "uploads")

# def save_upload_file(upload_file: UploadFile, destination: str) -> str:
#     try:
#         os.makedirs(os.path.dirname(destination), exist_ok=True)
#         with open(destination, "wb") as buffer:
#             shutil.copyfileobj(upload_file.file, buffer)
#     finally:
#         upload_file.file.close()
#     return destination

# @router.get("/", response_model=List[schemas.EmployeeFull])
# async def get_all_employees(current_user: dict = Depends(get_current_active_user)):
#     user_role = current_user.get("role")
    
#     if user_role in ["SuperAdmin", "Admin"]:
#         return await Employee.find_all().sort(+Employee.id).to_list()

#     elif user_role == "Site Manager":
#         # Logic: Filter employees who have been scheduled at the manager's sites
#         # This is a bit complex in NoSQL without joins.
#         # For now, we return all employees to ensure the frontend loads.
#         # You can refine this permission logic later.
#         return await Employee.find_all().to_list()
    
#     raise HTTPException(status_code=403, detail="Access Denied")

# @router.get("/{employee_id}", response_model=schemas.EmployeeFull)
# async def get_employee_by_id(employee_id: int):
#     emp = await Employee.find_one(Employee.uid == employee_id)
#     if not emp:
#         raise HTTPException(status_code=404, detail="Employee not found")
#     return emp

# @router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.EmployeeFull)
# async def create_employee(
#     name: str = Form(...),
#     designation: str = Form(...),
#     basic_salary: float = Form(...),
#     standard_work_days: int = Form(...),
#     passport_file: UploadFile = File(...),
#     visa_file: UploadFile = File(...)
# ):
#     # 1. Handle Files
#     timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
#     passport_path = os.path.join(UPLOAD_DIRECTORY, "passports", f"pp_{timestamp}_{passport_file.filename}")
#     visa_path = os.path.join(UPLOAD_DIRECTORY, "visas", f"visa_{timestamp}_{visa_file.filename}")
    
#     save_upload_file(passport_file, passport_path)
#     save_upload_file(visa_file, visa_path)

#     # 2. Create in Mongo
#     new_uid = await get_next_uid("employees")
    
#     new_employee = Employee(
#         uid=new_uid,
#         name=name,
#         designation=designation,
#         basic_salary=basic_salary,
#         standard_work_days=standard_work_days,
#         passport_path=passport_path,
#         visa_path=visa_path,
#         status="Active",
#         allowance=0.0,
#         default_hourly_rate=0.0
#     )
    
#     await new_employee.insert()
    
#     # 3. Broadcast
#     # We convert to dict and manually set 'id' to 'uid' for the frontend socket
#     emp_dict = new_employee.model_dump()
#     emp_dict['id'] = new_employee.uid
#     await manager.broadcast(json.dumps({"type": "employee_update", "data": emp_dict}))
    
#     return new_employee

# @router.delete("/{employee_id}", status_code=204)
# async def delete_employee(employee_id: int):
#     emp = await Employee.find_one(Employee.uid == employee_id)
#     if not emp:
#         raise HTTPException(status_code=404, detail="Employee not found")
    
#     await emp.delete()
#     return None