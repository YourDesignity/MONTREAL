from fastapi import APIRouter, Depends
from typing import Dict, List
from backend.models import Employee, Contract, VehicleExpense, FuelLog, MaintenanceLog, Invoice, Attendance
from datetime import datetime

router = APIRouter(prefix="/finance", tags=["Finance & Analytics"])

@router.get("/summary")
async def get_financial_summary():
    # 1. TOTAL INCOME (From Invoices)
    invoices = await Invoice.find_all().to_list()
    total_billed = sum(i.total_amount for i in invoices)
    total_received = sum(i.total_amount for i in invoices if i.status == "Paid")

    # 2. FLEET LOSS (Fuel + Maint + Daily Exp)
    fuel = await FuelLog.find_all().to_list()
    maint = await MaintenanceLog.find_all().to_list()
    v_exp = await VehicleExpense.find_all().to_list()
    total_fleet_loss = sum(f.cost for f in fuel) + sum(m.cost for m in maint) + sum(e.amount for e in v_exp)

    # 3. PROJECT LOSS (Material + Sub-con from Contracts)
    contracts = await Contract.find_all().to_list()
    total_project_loss = 0
    for c in contracts:
        total_project_loss += sum(e.amount for e in (c.expenses or []))

    # 4. HR LOSS (Total Salaries + OT)
    employees = await Employee.find_all().to_list()
    monthly_salary_burn = sum(e.basic_salary + (e.allowance or 0) for e in employees)
    
    attendance = await Attendance.find_all().to_list()
    total_ot_hours = sum(a.overtime_hours or 0 for a in attendance)
    total_ot_payout = total_ot_hours * 2.5 # Estimate

    total_hr_loss = monthly_salary_burn + total_ot_payout

    # 5. OVERALL CALCULATION
    grand_total_loss = total_fleet_loss + total_project_loss + total_hr_loss
    net_profit = total_billed - grand_total_loss
    
    # Efficiency logic
    total_hours = (len(attendance) * 8) + total_ot_hours

    return {
        "revenue": {
            "billed": total_billed,
            "received": total_received,
            "pending": total_billed - total_received
        },
        "expenses": {
            "hr": total_hr_loss,
            "fleet": total_fleet_loss,
            "projects": total_project_loss,
            "total": grand_total_loss
        },
        "net_profit": net_profit,
        "metrics": {
            "profit_margin": (net_profit / total_billed * 100) if total_billed > 0 else 0,
            "burn_rate_daily": grand_total_loss / 30,
            "profit_per_man_hour": (net_profit / total_hours) if total_hours > 0 else 0
        }
    }