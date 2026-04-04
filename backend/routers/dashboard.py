# backend/routers/dashboard.py

import os
import psutil
from datetime import date
from fastapi import APIRouter, Depends
from backend.security import get_current_active_user
from backend.models import Employee, Admin, Site, Attendance, Schedule, Project, Contract, TemporaryAssignment

router = APIRouter(
    prefix="/dashboard",
    tags=["System Dashboard"]
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


@router.get("/summary", dependencies=[Depends(get_current_active_user)])
async def get_dashboard_summary():
    """
    Returns a comprehensive dashboard summary for the Phase 6 overview page.
    Includes project stats, workforce counts, contract alerts, and workforce gaps.
    """
    today = date.today()

    # --- Core counts ---
    total_employees = await Employee.find(Employee.status == "Active").count()
    available_employees = await Employee.find(
        Employee.status == "Active",
        Employee.is_currently_assigned == False
    ).count()
    assigned_employees = total_employees - available_employees

    all_projects = await Project.find().to_list()
    total_projects = len(all_projects)
    active_projects = sum(1 for p in all_projects if p.status == "Active")
    completed_projects = sum(1 for p in all_projects if p.status == "Completed")
    on_hold_projects = sum(1 for p in all_projects if p.status == "On Hold")

    all_sites = await Site.find().to_list()
    total_sites = len(all_sites)

    active_external = await TemporaryAssignment.find(
        TemporaryAssignment.status == "Active"
    ).count()

    # --- Contract expiry alerts ---
    all_contracts = await Contract.find(Contract.status == "Active").to_list()
    expiring_soon = []
    for c in all_contracts:
        if c.end_date:
            days_left = (c.end_date - today).days
            if days_left <= 30:
                expiring_soon.append({
                    "contract_id": c.uid,
                    "contract_code": c.contract_code,
                    "contract_name": c.contract_name,
                    "project_name": c.project_name,
                    "end_date": c.end_date.isoformat(),
                    "days_remaining": days_left,
                    "alert_level": "danger" if days_left <= 7 else "warning",
                })
    expiring_soon.sort(key=lambda x: x["days_remaining"])

    # --- Workforce gaps ---
    workforce_gaps = []
    for s in all_sites:
        if s.status == "Active" and s.required_workers > 0:
            gap = s.required_workers - s.assigned_workers
            if gap > 0:
                workforce_gaps.append({
                    "site_id": s.uid,
                    "site_name": s.name,
                    "project_name": s.project_name,
                    "required_workers": s.required_workers,
                    "assigned_workers": s.assigned_workers,
                    "gap": gap,
                    "fill_percentage": round(
                        (s.assigned_workers / s.required_workers) * 100, 1
                    ) if s.required_workers else 0,
                })
    workforce_gaps.sort(key=lambda x: x["gap"], reverse=True)

    # --- Projects list (active only) ---
    projects_data = []
    for p in all_projects:
        if p.status == "Active":
            # Find latest contract expiry for this project
            project_contracts = [c for c in all_contracts if c.project_id == p.uid]
            nearest_expiry = None
            days_to_expiry = None
            if project_contracts:
                nearest = min(project_contracts, key=lambda c: c.end_date)
                nearest_expiry = nearest.end_date.isoformat()
                days_to_expiry = (nearest.end_date - today).days

            projects_data.append({
                "project_id": p.uid,
                "project_code": p.project_code,
                "project_name": p.project_name,
                "client_name": p.client_name,
                "status": p.status,
                "total_sites": p.total_sites,
                "total_assigned_employees": p.total_assigned_employees,
                "nearest_contract_expiry": nearest_expiry,
                "days_to_expiry": days_to_expiry,
                "contract_alert": days_to_expiry is not None and days_to_expiry <= 30,
            })

    workforce_utilization = round(
        (assigned_employees / total_employees * 100) if total_employees > 0 else 0, 1
    )

    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "on_hold_projects": on_hold_projects,
        "total_sites": total_sites,
        "total_employees": total_employees,
        "available_employees": available_employees,
        "assigned_employees": assigned_employees,
        "active_external_workers": active_external,
        "contracts_expiring_soon": len(expiring_soon),
        "workforce_utilization": workforce_utilization,
        "projects": projects_data,
        "expiring_contracts": expiring_soon,
        "workforce_gaps": workforce_gaps,
    }