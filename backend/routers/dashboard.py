# backend/routers/dashboard.py

import os
import psutil 
from fastapi import APIRouter
# NOTE: Removed 'Depends' and 'get_current_active_user' to make this dashboard public/automatic
from backend.models import Employee, Admin, Site, Attendance, Schedule

router = APIRouter(
    prefix="/dashboard",
    tags=["System Dashboard"]
    # dependencies=[Depends(get_current_active_user)] <--- REMOVED THIS LINE
)

@router.get("/stats")
async def get_system_stats():
    """
    Returns counts of all major collections for the UI cards.
    """
    return {
        "employees": await Employee.count(),
        "admins": await Admin.count(),
        "sites": await Site.count(),
        "attendance_records": await Attendance.count(),
        "schedules": await Schedule.count()
    }

@router.get("/system_health")
async def get_system_health():
    """
    Returns Server RAM/CPU usage.
    """
    process = psutil.Process(os.getpid())
    return {
        "cpu_usage": psutil.cpu_percent(),
        "ram_usage_mb": process.memory_info().rss / 1024 / 1024,
        "total_ram_percent": psutil.virtual_memory().percent
    }

@router.get("/schema_graph")
async def get_schema_visualization():
    """
    Defines the nodes and edges for the Graph.
    """
    # Nodes: The Collections
    nodes = [
        {"id": 1, "label": "Employees", "color": "#4CAF50"},
        {"id": 2, "label": "Sites", "color": "#2196F3"},
        {"id": 3, "label": "Admins\n(Managers)", "color": "#FF9800"},
        {"id": 4, "label": "Attendance", "color": "#9C27B0"},
        {"id": 5, "label": "Schedules", "color": "#607D8B"},
    ]
    
    # Edges: The 'uid' Links
    edges = [
        {"from": 3, "to": 2, "label": "manages", "arrows": "to"},    # Admin -> Site
        {"from": 3, "to": 1, "label": "manages", "arrows": "to"},    # Admin -> Employee
        {"from": 1, "to": 4, "label": "logs", "arrows": "to"},       # Employee -> Attendance
        {"from": 2, "to": 4, "label": "location", "arrows": "to"},   # Site -> Attendance
        {"from": 1, "to": 5, "label": "assigned", "arrows": "to"},   # Employee -> Schedule
        {"from": 2, "to": 5, "label": "location", "arrows": "to"},   # Site -> Schedule
    ]
    
    return {"nodes": nodes, "edges": edges}

@router.get("/logs/live")
async def get_live_logs():
    """
    Reads the last 50 lines of the main app log.
    """
    log_file = "logs/app_main.log"
    if not os.path.exists(log_file):
        return ["Log file not created yet."]
    
    with open(log_file, "r") as f:
        # Read all lines and take the last 50
        lines = f.readlines()
        return lines[-50:]