import json
import os
import shutil
import logging
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File

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
    basic_salary: float = Form(...),
    standard_work_days: int = Form(...),
    passport_file: UploadFile = File(...),
    visa_file: UploadFile = File(...),
    manager_id: Optional[int] = Form(None),
    current_user: dict = Depends(get_current_active_user)
):
    # Only High-level admins can add new employees to the system
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can create new employee records.")

    # Validate manager exists and has the correct role if provided
    if manager_id is not None:
        manager = await Admin.find_one(Admin.uid == manager_id)
        if not manager or manager.role != "Site Manager":
            raise HTTPException(status_code=400, detail="Invalid manager ID: must be an active Site Manager.")

    try:
        # File pathing
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        passport_path = os.path.join(UPLOAD_DIRECTORY, "passports", f"pp_{timestamp}_{passport_file.filename}")
        visa_path = os.path.join(UPLOAD_DIRECTORY, "visas", f"visa_{timestamp}_{visa_file.filename}")
        
        save_upload_file(passport_file, passport_path)
        save_upload_file(visa_file, visa_path)

        new_uid = await get_next_uid("employees")
        new_employee = Employee(
            uid=new_uid,
            name=name,
            designation=designation,
            basic_salary=basic_salary,
            standard_work_days=standard_work_days,
            passport_path=passport_path,
            visa_path=visa_path,
            status="Active",
            allowance=0.0,
            manager_id=manager_id
        )
        
        await new_employee.insert()
        
        # Broadcast via WebSocket
        emp_dict = new_employee.model_dump(mode='json')
        emp_dict['id'] = new_employee.uid
        await manager.broadcast(json.dumps({"type": "employee_update", "data": emp_dict}))
        
        return new_employee

    except Exception as e:
        logger.error(f"Creation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create employee")

# =============================================================================
# 4. UPDATE EMPLOYEE (Managers can update their own team)
# =============================================================================
@router.put("/{employee_id}", response_model=schemas.EmployeeFull)
async def update_employee(
    employee_id: int, 
    employee_update: schemas.EmployeeUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    emp = await Employee.find_one(Employee.uid == employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Manager Check
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        me = await Admin.find_one(Admin.email == current_user.get("sub"))
        if emp.manager_id != me.uid:
            raise HTTPException(status_code=403, detail="You can only update employees assigned to you.")

    # Apply updates
    data = employee_update.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(emp, key, value)
    
    await emp.save()
    
    # WebSocket Broadcast
    emp_dict = emp.model_dump(mode='json')
    emp_dict['id'] = emp.uid
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