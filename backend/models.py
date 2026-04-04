from typing import List, Optional, Dict, Any, Annotated
from datetime import datetime, date, time
from beanie import Document, Indexed
from pydantic import Field, BaseModel

# =============================================================================
# 1. UTILITIES & BASE MODEL
# =============================================================================

class Counter(Document):
    collection_name: Annotated[str, Indexed(unique=True)] 
    current_uid: int = 0
    class Settings:
        name = "counters"

class MemoryNode(BaseModel):
    uid: Optional[int] = None 
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_active: bool = True
    specs: Dict[str, Any] = {}
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

# =============================================================================
# 2. CORE ENTITIES
# =============================================================================

class Admin(Document, MemoryNode):
    email: Annotated[str, Indexed(unique=True)]
    hashed_password: str
    full_name: str
    designation: str
    role: str                       
    permissions: List[str] = []     
    assigned_site_uids: List[int] = []
    has_manager_profile: bool = False
    class Settings:
        name = "admins"

class Employee(Document, MemoryNode):
    # ===== BASIC INFO =====
    name: str
    designation: str
    status: str = "Active"

    # ===== EMPLOYEE TYPE =====
    employee_type: str = "Company"  # "Company" | "Outsourced"

    # ===== PERSONAL DETAILS =====
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = None
    permanent_address: Optional[str] = None

    # ===== CONTACT INFORMATION =====
    phone_kuwait: Optional[str] = None
    phone_home_country: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None

    # ===== IDENTITY DOCUMENTS =====
    civil_id_number: Optional[str] = None
    civil_id_expiry: Optional[date] = None
    civil_id_document_path: Optional[str] = None  # PDF file path

    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    passport_document_path: Optional[str] = None  # PDF file path

    visa_document_path: Optional[str] = None  # PDF file path

    # ===== EMPLOYEE PHOTO =====
    photo_path: Optional[str] = None  # Image file path

    # ===== CUSTOM LOCAL STORAGE PATHS (user-accessible folder) =====
    custom_photo_path: Optional[str] = None
    custom_civil_id_path: Optional[str] = None
    custom_passport_path: Optional[str] = None
    custom_visa_path: Optional[str] = None

    # ===== FINANCIAL INFO =====
    basic_salary: float = 0.0
    allowance: float = 0.0
    standard_work_days: int = 28
    default_hourly_rate: float = 0.0  # Used for Outsourced employees

    # ===== EMPLOYMENT DETAILS =====
    date_of_joining: Optional[date] = None
    contract_end_date: Optional[date] = None  # For Outsourced employees

    # ===== DEPRECATED FIELDS (kept for backward compatibility) =====
    passport_path: Optional[str] = None   # DEPRECATED - use passport_document_path
    visa_path: Optional[str] = None       # DEPRECATED - use visa_document_path

    manager_id: Optional[int] = None

    class Settings:
        name = "employees"
        indexes = [
            "name",
            "employee_type",
            "status",
            "civil_id_number",
            "passport_number",
        ]

class Site(Document, MemoryNode):
    name: Annotated[str, Indexed(unique=True)]
    location: str
    manager_uid: Optional[int] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    class Settings:
        name = "sites"

class Designation(Document, MemoryNode):
    title: Annotated[str, Indexed(unique=True)]
    class Settings:
        name = "designations"

# =============================================================================
# 3. OPERATIONS
# =============================================================================

class Attendance(Document, MemoryNode):
    employee_uid: Optional[int] = None
    site_uid: Optional[int] = None
    date: str       
    status: str
    shift: Optional[str] = "Morning"
    overtime_hours: Optional[int] = 0 
    class Settings:
        name = "attendance"
        indexes = [[("employee_uid", 1), ("date", 1)]]

class Schedule(Document, MemoryNode):
    employee_uid: Optional[int] = None
    site_uid: int
    work_date: str
    task: str
    shift_type: Optional[str] = None
    class Settings:
        name = "schedules"
        indexes = [[("employee_uid", 1), ("work_date", 1)]]

class Overtime(Document, MemoryNode):
    employee_uid: Optional[int] = None
    date: str
    hours: float
    type: str 
    reason: Optional[str] = None
    class Settings:
        name = "overtime"

class Deduction(Document, MemoryNode):
    employee_uid: Optional[int] = None
    pay_period: str
    amount: float
    reason: Optional[str] = None
    class Settings:
        name = "deductions"

class DutyAssignment(Document):
    """
    Duty assignment join table.

    IMPORTANT: Uses ``*_id`` convention (not ``*_uid``) by design:
    - ``employee_id`` references ``Employee.uid``
    - ``site_id`` references ``Site.uid``
    - ``manager_id`` references ``Admin.uid``

    This is intentional. The frontend handles both patterns defensively
    (``emp.id || emp.uid``). Do NOT change this to ``*_uid`` naming.

    Note: ``manager_id``, ``start_date``, and ``end_date`` are Optional for
    backward compatibility with legacy records created before these fields
    were required. New records always populate all fields.
    """
    employee_id: int
    site_id: int
    manager_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    class Settings:
        name = "duty_assignments"

# =============================================================================
# 4. VEHICLE MANAGEMENT
# =============================================================================

class Vehicle(Document, MemoryNode):
    model: str
    plate: Annotated[str, Indexed(unique=True)]
    type: str  
    status: str = "Available" 
    current_mileage: float = 0.0
    registration_expiry: Optional[str] = None 
    insurance_expiry: Optional[str] = None
    pollution_expiry: Optional[str] = None
    class Settings:
        name = "vehicles"

class TripLog(Document, MemoryNode):
    vehicle_uid: int
    vehicle_plate: Optional[str] = None
    driver_name: str
    out_time: Optional[datetime] = None
    in_time: Optional[datetime] = None
    purpose: str
    status: str = "Ongoing"
    start_mileage: float = 0.0
    end_mileage: float = 0.0 
    start_condition: str = "Good"
    end_condition: Optional[str] = None
    class Settings:
        name = "vehicle_trips"

class VehicleExpense(Document, MemoryNode):
    vehicle_uid: int
    vehicle_plate: Optional[str] = None
    driver_name: str
    category: str
    amount: float
    date: str
    description: Optional[str] = None
    class Settings:
        name = "vehicle_expenses"

class MaintenanceLog(Document, MemoryNode):
    vehicle_uid: int
    vehicle_plate: Optional[str] = None
    service_type: str 
    cost: float
    service_date: str
    next_due_date: Optional[str] = None
    notes: Optional[str] = None
    class Settings:
        name = "vehicle_maintenance"

class FuelLog(Document, MemoryNode):
    vehicle_uid: int
    vehicle_plate: Optional[str] = None
    date: str
    liters: float
    cost: float
    odometer: float
    filled_by: Optional[str] = None
    class Settings:
        name = "vehicle_fuel"

# =============================================================================
# 5. CONTRACTS & INVOICE MANAGEMENT
# =============================================================================

class ProjectExpense(BaseModel):
    uid: Optional[int] = None
    category: str 
    description: str
    amount: float
    date: datetime = Field(default_factory=datetime.now)

class ContractItem(BaseModel): 
    item_code: Optional[str] = None
    description: str
    quantity: float = 0.0
    unit_rate: float = 0.0
    total_value: float = 0.0

class ContractWorkforce(BaseModel):
    name: str
    role: str
    days: int = 0

class Contract(Document, MemoryNode):
    title: str
    client: str
    contract_type: str = "Labour" 
    status: str = "Active" 
    total_value: float = 0.0
    payment_terms: Optional[str] = None 
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    workforce: List[ContractWorkforce] = [] 
    items: List[ContractItem] = []           
    expenses: List[ProjectExpense] = [] 
    class Settings:
        name = "contracts"

class InvoiceItem(BaseModel):
    description: str
    quantity: float
    unit_rate: float
    total: float

class Invoice(Document, MemoryNode):
    invoice_no: Optional[str] = None # FIXED: Made optional for 422 error
    project_uid: int
    client_name: str
    date: str
    due_date: str
    items: List[InvoiceItem] = []
    total_amount: float
    status: str = "Unpaid"
    class Settings:
        name = "invoices"

# =============================================================================
# 6. INVENTORY MANAGEMENT
# =============================================================================

class InventoryItem(Document, MemoryNode):
    name: str
    category: str 
    stock: int
    unit: str      
    price: float   
    supplier: Optional[str] = None
    status: str = "In Stock"
    class Settings:
        name = "inventory_items"

# =============================================================================
# 7. MESSAGING SYSTEM
# =============================================================================

class Conversation(Document, MemoryNode):
    """
    Represents a message thread (broadcast or private chat).

    Types:
    - broadcast_all: Everyone can see
    - broadcast_managers: Only managers + admins (Phase 2)
    - broadcast_employees: Only employees + admins (Phase 2)
    - broadcast_custom: Selected recipients only (Phase 2)
    - private: One-on-one chat (Phase 3)
    """
    conversation_type: str  # "broadcast_all", "broadcast_managers", "broadcast_employees", "broadcast_custom", "private"
    created_by_id: int  # Admin.uid who created conversation
    created_by_name: str  # For display purposes
    created_by_role: str  # "SuperAdmin", "Admin", "Site Manager", "Employee"

    participant_ids: List[int] = []  # UIDs of people who can see this thread
    participant_names: List[str] = []  # For display (denormalized for performance)

    title: str  # "Broadcast: All", "Chat with Manager John", etc.
    last_message_at: datetime = Field(default_factory=datetime.now)
    last_message_preview: Optional[str] = None  # First 50 chars of last message

    unread_count_map: Dict[str, int] = {}  # {str(user_id): unread_count}

    class Settings:
        name = "conversations"
        indexes = [
            [("created_by_id", 1)],
            [("last_message_at", -1)]
        ]


class Message(Document, MemoryNode):
    """
    Individual message within a conversation thread.
    """
    conversation_id: int  # Links to Conversation.uid

    sender_id: int  # Who sent it (Admin.uid / Employee.uid)
    sender_name: str  # Display name
    sender_role: str  # "SuperAdmin", "Admin", "Site Manager", "Employee"
    sender_type: str  # "admin", "manager", "employee" (lowercase for filtering)

    content: str  # Message text
    timestamp: datetime = Field(default_factory=datetime.now)

    read_by_ids: List[int] = []  # UIDs of users who have read this message

    class Settings:
        name = "messages"
        indexes = [
            [("conversation_id", 1), ("timestamp", -1)],
            [("sender_id", 1)]
        ]

# =============================================================================
# 8. MANAGER PROFILE
# =============================================================================

class ManagerProfile(Document):
    """
    Manager Profile - Stores detailed information about Site Managers.
    Linked to Admin table via admin_id.
    """
    uid: int
    admin_id: int  # Foreign key to Admin.uid

    # Required Fields
    full_name: str
    designation: str
    monthly_salary: float
    allowances: float = 0.0
    date_of_joining: datetime
    is_active: bool = True

    # Optional Fields
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    nationality: Optional[str] = None
    passport_number: Optional[str] = None
    civil_id: Optional[str] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    created_by_admin_id: int

    class Settings:
        name = "manager_profiles"
        indexes = [
            "admin_id",
            "full_name",
            "is_active"
        ]




















# =============================================================================
# 8. MANAGER ATTENDANCE SYSTEM
# =============================================================================

class ManagerAttendanceConfig(Document):
    """
    Manager Attendance Configuration - Customizable check-in windows per manager.
    Each manager can have different time windows set by admin.
    """
    uid: int
    manager_id: int  # Foreign key to Admin.uid (Site Manager)

    # Morning Segment
    morning_enabled: bool = True
    morning_window_start: str = "08:00"  # HH:MM (24-hour)
    morning_window_end: str = "09:30"    # HH:MM (24-hour)

    # Afternoon Segment
    afternoon_enabled: bool = True
    afternoon_window_start: str = "13:00"  # HH:MM (24-hour)
    afternoon_window_end: str = "14:00"    # HH:MM (24-hour)

    # Evening Segment
    evening_enabled: bool = True
    evening_window_start: str = "17:00"  # HH:MM (24-hour)
    evening_window_end: str = "18:30"    # HH:MM (24-hour)

    # Rules
    require_all_segments: bool = True

    # Metadata
    configured_by_admin_id: int
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "manager_attendance_configs"
        indexes = ["manager_id"]


class ManagerAttendance(Document):
    """
    Manager Attendance Record - Tracks daily 3-segment check-ins.
    """
    uid: int
    manager_id: int  # Foreign key to Admin.uid (Site Manager)
    date: date

    # Morning Segment
    morning_check_in: Optional[datetime] = None
    morning_status: Optional[str] = None  # "On Time" | "Late" | "Missed" | "Admin Override" | "Disabled"

    # Afternoon Segment
    afternoon_check_in: Optional[datetime] = None
    afternoon_status: Optional[str] = None

    # Evening Segment
    evening_check_out: Optional[datetime] = None
    evening_status: Optional[str] = None

    # Overall Day Status
    day_status: str = "Pending"  # "Full Day" | "Partial" | "Absent" | "Leave" | "Pending"

    # Override Information
    is_overridden: bool = False
    overridden_by_admin_id: Optional[int] = None
    override_reason: Optional[str] = None
    override_timestamp: Optional[datetime] = None

    # Additional Info
    notes: Optional[str] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "manager_attendance"
        indexes = [
            "manager_id",
            "date",
            [("manager_id", 1), ("date", -1)]
        ]



# =============================================================================
# 9. COMPANY SETTINGS
# =============================================================================

class CompanySettings(Document):
    """
    Company-wide configuration for salary calculations and business rules.
    Only one settings document should exist (singleton pattern).
    """
    uid: int = 1  # Always 1 (singleton)

    # Overtime Multipliers
    normal_overtime_multiplier: float = 1.25      # Normal OT rate (default: 25% premium)
    offday_overtime_multiplier: float = 1.5       # Off-day OT rate (default: 50% premium)

    # Work Hours
    standard_hours_per_day: int = 8               # Default work hours per day

    # Absence Penalties
    enable_absence_deduction: bool = True         # Whether to deduct for absences

    # File Storage Configuration
    custom_storage_path: Optional[str] = None     # e.g., "D:\\MONTREAL_Files"
    enable_local_storage: bool = True             # Enable/disable custom folder backup
    use_employee_name_in_filename: bool = True    # Use "13_Naveen.jpg" vs "emp_13_20260404.jpg"

    # Metadata
    updated_at: datetime = Field(default_factory=datetime.now)
    updated_by_admin_id: Optional[int] = None
    updated_by_admin_name: Optional[str] = None

    class Settings:
        name = "company_settings"


# from typing import List, Optional, Dict, Any, Annotated # <--- Added Annotated
# from datetime import datetime
# from beanie import Document, Indexed
# from pydantic import Field, EmailStr

# # =============================================================================
# # 1. THE ENGINE ROOM (Utilities)
# # =============================================================================

# class Counter(Document):
#     """
#     Internal Helper: Keeps track of the auto-increment numbers.
#     """
#     # FIX: Use Annotated for Pylance compatibility
#     collection_name: Annotated[str, Indexed(unique=True)] 
#     current_uid: int = 0
    
#     class Settings:
#         name = "counters"

# # =============================================================================
# # 2. THE UNIVERSAL MEMORY TEMPLATE (Base Class)
# # =============================================================================

# class MemoryNode(Document):
#     """
#     The DNA shared by all entities.
#     """
#     # FIX: Use Annotated[int, Indexed(...)]
#     # This tells Pylance: "It is an int, and it has an Index of unique=True"
#     uid: Annotated[int, Indexed(unique=True)]
    
#     created_at: datetime = Field(default_factory=datetime.now)
#     updated_at: datetime = Field(default_factory=datetime.now)
#     is_active: bool = True
    
#     # DYNAMIC MEMORY (The "One Time Code" Feature)
#     specs: Dict[str, Any] = {}

#     class Settings:
#         is_root = True 
#         # Maps 'uid' to 'id' when converting to JSON for Frontend
#         json_encoders = {datetime: lambda v: v.isoformat()}

# # =============================================================================
# # 3. THE ENTITIES (The Actors)
# # =============================================================================

# class Admin(MemoryNode):
#     email: Annotated[str, Indexed(unique=True)] # FIX
#     hashed_password: str
#     full_name: str
#     designation: str
    
#     # Security Profile
#     role: str                       
#     permissions: List[str] = []     
#     assigned_site_uids: List[int] = [] 

#     class Settings:
#         name = "admins"

# class Employee(MemoryNode):
#     name: str
#     designation: str
    
#     # Financials
#     basic_salary: float
#     allowance: float = 0.0
#     standard_work_days: int
#     default_hourly_rate: float = 0.0
#     status: str = "Active"
    
#     # Documents
#     passport_path: Optional[str] = None
#     visa_path: Optional[str] = None

#     class Settings:
#         name = "employees"

# class Site(MemoryNode):
#     name: Annotated[str, Indexed(unique=True)] # FIX
#     location: str
    
#     manager_uid: Optional[int] = None
    
#     description: Optional[str] = None
#     phone: Optional[str] = None

#     class Settings:
#         name = "sites"

# class Designation(MemoryNode):
#     title: Annotated[str, Indexed(unique=True)] # FIX
    
#     class Settings:
#         name = "designations"

# # =============================================================================
# # 4. THE EVENTS (The Synapses)
# # =============================================================================

# class Attendance(MemoryNode):
#     employee_uid: Annotated[int, Indexed()] # FIX: Simple Index (not unique globally)
#     site_uid: Optional[int] = None
    
#     date: str       
#     status: str     
    
#     class Settings:
#         name = "attendance"
#         indexes = [
#             [("employee_uid", 1), ("date", 1)]
#         ]

# class Schedule(MemoryNode):
#     employee_uid: Annotated[int, Indexed()] # FIX
#     site_uid: int
    
#     work_date: str
#     task: str
#     shift_type: Optional[str] = None

#     class Settings:
#         name = "schedules"
#         indexes = [
#             [("employee_uid", 1), ("work_date", 1)]
#         ]