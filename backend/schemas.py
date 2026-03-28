from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# =============================================================================
# 1. DESIGNATION SCHEMAS
# =============================================================================
class DesignationBase(BaseModel):
    title: str

class DesignationCreate(DesignationBase):
    pass

class DesignationResponse(DesignationBase):
    id: int = Field(..., validation_alias="uid")
    model_config = ConfigDict(from_attributes=True)

# =============================================================================
# 2. EMPLOYEE SCHEMAS
# =============================================================================
class EmployeeBase(BaseModel):
    id: int = Field(..., validation_alias="uid")
    name: str
    designation: str
    status: str

class EmployeePublic(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

class EmployeeFull(EmployeeBase):
    basic_salary: float
    allowance: float
    standard_work_days: int
    default_hourly_rate: float
    passport_path: Optional[str] = None
    visa_path: Optional[str] = None
    manager_id: Optional[int] = None 
    model_config = ConfigDict(from_attributes=True)

class EmployeeCreate(BaseModel):
    name: str
    designation: str
    basic_salary: float
    allowance: float
    standard_work_days: int
    status: str = "Active"
    default_hourly_rate: float = 0.0

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    designation: Optional[str] = None
    basic_salary: Optional[float] = None
    allowance: Optional[float] = None
    standard_work_days: Optional[int] = None
    status: Optional[str] = None
    manager_id: Optional[int] = None

# =============================================================================
# 3. ADMIN SCHEMAS
# =============================================================================
class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    designation: str
    role: str 

class AdminUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class AdminPublic(BaseModel):
    id: int = Field(..., validation_alias="uid")
    email: EmailStr
    full_name: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# =============================================================================
# 4. SITE SCHEMAS
# =============================================================================
class SiteBase(BaseModel):
    name: str
    location: str
    site_manager: Optional[str] = None 
    description: Optional[str] = None 
    phone: Optional[str] = None

class SiteCreate(SiteBase):
    pass

class SiteUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    site_manager: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class SiteResponse(SiteBase):
    id: int = Field(..., validation_alias="uid")
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

# =============================================================================
# 5. SCHEDULE SCHEMAS
# =============================================================================
class ScheduleCreate(BaseModel):
    site_id: int
    employee_ids: List[int]
    start_date: str 
    end_date: str   
    task: str
    shift_type: Optional[str] = None

class ScheduleResponse(BaseModel):
    id: int = Field(..., validation_alias="uid")
    employee_id: int = Field(..., validation_alias="employee_uid")
    site_id: int = Field(..., validation_alias="site_uid")
    work_date: str
    task: str
    shift_type: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# =============================================================================
# 6. ATTENDANCE SCHEMAS
# =============================================================================
class AttendanceRecord(BaseModel):
    employee_id: int
    date: str
    status: str
    shift: Optional[str] = "Morning"
    overtime_hours: Optional[int] = 0 

class AttendanceUpdateBatch(BaseModel):
    records: List[AttendanceRecord]

# =============================================================================
# 7. DUTY LIST SCHEMAS
# =============================================================================
class DutyAssignmentCreate(BaseModel):
    employee_id: int
    site_id: int
    date: str
    manager_id: int 

# =============================================================================
# 8. PAYSLIP / FINANCIAL SCHEMAS
# =============================================================================
class PayslipRequest(BaseModel):
    employee_ids: List[int]
    pay_period: str 

class DeductionCreate(BaseModel):
    employee_id: int
    pay_period: str 
    amount: float
    reason: str

class OvertimeCreate(BaseModel):
    employee_id: int
    date: str
    hours: float
    type: str = "Normal"