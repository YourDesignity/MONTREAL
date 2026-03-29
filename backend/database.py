import os
import platform
from pathlib import Path
from urllib.parse import quote_plus
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

# 1. IMPORTS: Models
from backend.models import (
    Counter, Admin, Employee, Site, Attendance, Schedule, Designation, 
    Overtime, Deduction, DutyAssignment, Vehicle, TripLog, 
    MaintenanceLog, FuelLog, VehicleExpense, Contract, InventoryItem,
    Invoice, Conversation, Message
)

# Load Environment Variables
env_path = Path("./backend/.env") 
load_dotenv(dotenv_path=env_path)

DB_NAME = os.getenv("DB_NAME", "payroll_db")
CURRENT_OS = platform.system()

def get_mongo_connection_url():
    if CURRENT_OS == "Windows":
        return os.getenv("MONGO_URL", "mongodb://localhost:27017")
    else:
        db_user, db_pass = os.getenv("DB_USER", "destiny_mind")
        db_pass = os.getenv("DB_PASS", "iamironman")
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "27017")
        auth_db = os.getenv("AUTH_SOURCE", "destiny-neural-memory")
        return f"mongodb://{quote_plus(db_user)}:{quote_plus(db_pass)}@{db_host}:{db_port}/?authSource={auth_db}"

MONGO_URL = get_mongo_connection_url()

async def init_db():
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        await init_beanie(
            database=client[DB_NAME],
            document_models=[
                Counter, Admin, Employee, Site, Attendance, Schedule, Designation, 
                Overtime, Deduction, DutyAssignment, Vehicle, TripLog, 
                MaintenanceLog, FuelLog, VehicleExpense, Contract, InventoryItem,
                Invoice, Conversation, Message
            ]
        )
        print(f"✅ Connected to MongoDB at {DB_NAME}")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise e

async def get_next_uid(collection_name: str) -> int:
    counter = await Counter.find_one(Counter.collection_name == collection_name)
    if not counter:
        counter = Counter(collection_name=collection_name, current_uid=0)
        await counter.create()
    await counter.inc({Counter.current_uid: 1})
    return counter.current_uid









# # backend/database.py
# import os
# from pathlib import Path
# from motor.motor_asyncio import AsyncIOMotorClient
# from beanie import init_beanie
# from dotenv import load_dotenv

# # 1. UPDATE IMPORTS: Added DutyAssignment here
# from backend.models import (
#     Counter,
#     Admin,
#     Employee,
#     Site,
#     Attendance,
#     Schedule,
#     Designation,
#     Overtime,  
#     Deduction,
#     DutyAssignment  # <--- CRITICAL FIX: Added this
# )

# env_path = Path("./backend/.env") 
# load_dotenv(dotenv_path=env_path)

# # --- Configuration ---
# MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
# DB_NAME = os.getenv("DB_NAME", "payroll_db")

# async def init_db():
#     """
#     Initializes the MongoDB connection and registers the Beanie models.
#     """
#     try:
#         # 1. Create the Low-Level Motor Client
#         client = AsyncIOMotorClient(MONGO_URL)
        
#         # 2. Initialize Beanie (The ODM)
#         await init_beanie(
#             database=client[DB_NAME],
#             document_models=[
#                 Counter,
#                 Admin,
#                 Employee,
#                 Site,
#                 Attendance,
#                 Schedule,
#                 Designation,
#                 Overtime,   
#                 Deduction,
#                 DutyAssignment   # <--- CRITICAL FIX: Registered here
#             ]
#         )
#         print(f"✅ Connected to MongoDB at {MONGO_URL} (DB: {DB_NAME})")
        
#     except Exception as e:
#         print(f"❌ Failed to connect to MongoDB: {e}")
#         raise e

# async def get_next_uid(collection_name: str) -> int:
#     """
#     Atomically increments and returns the next Integer ID (UID) for a collection.
#     """
#     counter = await Counter.find_one(Counter.collection_name == collection_name)
    
#     if not counter:
#         counter = Counter(collection_name=collection_name, current_uid=0)
#         await counter.create()
    
#     await counter.inc({Counter.current_uid: 1})
    
#     return counter.current_uid