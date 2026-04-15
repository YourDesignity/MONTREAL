"""
Montreal Test Data Cleanup Script
====================================
Safely clears all test data from the MongoDB database.

Usage:
    python -m backend.scripts.clear_test_data

Options (prompted interactively):
    - Clear ALL collections
    - Clear specific collections only

WARNING: NEVER run against a production database!
"""

import asyncio
import sys
from pathlib import Path

# Bootstrap path so script can be run from repo root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.database import init_db, DB_NAME
from backend.models import (
    Admin, Employee, Site, Designation,
    Attendance, Overtime, Deduction,
    Vehicle, FuelLog, MaintenanceLog,
    Invoice, Conversation, Message,
    Project, Contract, EmployeeAssignment, TemporaryAssignment,
    Counter,
)

# Collections available for selective clearing
COLLECTIONS = {
    "1": ("Admins", Admin),
    "2": ("Employees", Employee),
    "3": ("Designations", Designation),
    "4": ("Projects", Project),
    "5": ("Contracts", Contract),
    "6": ("Sites", Site),
    "7": ("Employee Assignments", EmployeeAssignment),
    "8": ("Temporary Assignments", TemporaryAssignment),
    "9": ("Vehicles", Vehicle),
    "10": ("Fuel Logs", FuelLog),
    "11": ("Maintenance Logs", MaintenanceLog),
    "12": ("Attendance Records", Attendance),
    "13": ("Overtime Records", Overtime),
    "14": ("Deductions", Deduction),
    "15": ("Invoices", Invoice),
    "16": ("Conversations", Conversation),
    "17": ("Messages", Message),
    "18": ("Counters (reset IDs)", Counter),
}

# Safe deletion order respects foreign-key logic
ALL_IN_ORDER = [
    Message, Conversation,
    Invoice,
    Deduction, Overtime,
    Attendance,
    TemporaryAssignment, EmployeeAssignment,
    FuelLog, MaintenanceLog,
    Vehicle,
    Site,
    Contract, Project,
    Employee,
    Admin,
    Designation,
    Counter,
]


def safety_check() -> bool:
    """Refuse to run if DB_NAME looks like production."""
    db_lower = DB_NAME.lower()
    if any(kw in db_lower for kw in ("prod", "production", "live", "real")):
        print(f"\n SAFETY BLOCK: DB_NAME=''{DB_NAME}' looks like PRODUCTION!")
        print("   Refusing to run. Rename your test DB or set DB_NAME env var.\n")
        return False
    return True


async def count_documents(model) -> int:
    """Return document count for a given model."""
    try:
        return await model.count()
    except Exception:
        return -1


async def clear_all() -> None:
    """Delete all records in proper dependency order."""
    for model in ALL_IN_ORDER:
        name = model.__name__
        try:
            count = await count_documents(model)
            await model.delete_all()
            print(f"   Cleared {name}: {count} records removed")
        except Exception as e:
            print(f"   Warning: Could not clear {name}: {e}")


async def clear_selected(keys: list) -> None:
    """Delete records for selected collection keys."""
    for num in keys:
        if num not in COLLECTIONS:
            print(f"   Unknown selection: {num}")
            continue
        label, model = COLLECTIONS[num]
        try:
            count = await count_documents(model)
            await model.delete_all()
            print(f"   Cleared {label}: {count} records removed")
        except Exception as e:
            print(f"   Warning: Could not clear {label}: {e}")


async def show_counts() -> None:
    """Display current document counts for all collections."""
    print()
    print("Current database state:")
    for num, (label, model) in sorted(COLLECTIONS.items(), key=lambda x: int(x[0])):
        count = await count_documents(model)
        status = f"{count} records" if count >= 0 else "unavailable"
        print(f"   [{num:>2}] {label:<30} {status}")
    print()


async def main() -> None:
    print()
    print("Montreal Test Data Cleanup Script")
    print("=" * 50)
    print()

    if not safety_check():
        sys.exit(1)

    print("Connecting to MongoDB...")
    await init_db()
    print(f"   Database: {DB_NAME}")

    await show_counts()

    print("Choose an action:")
    print("   [A] Clear ALL collections (full reset)")
    print("   [S] Clear SPECIFIC collections (choose below)")
    print("   [Q] Quit")
    print()

    choice = input("Enter choice (A/S/Q): ").strip().upper()

    if choice == "Q":
        print("Aborted.")
        return

    if choice == "A":
        confirm = input(
            "\nThis will DELETE ALL TEST DATA from the database.\n"
            f"Database: {DB_NAME}\n"
            "Are you sure? Type 'yes' to confirm: "
        ).strip().lower()
        if confirm not in ("yes", "y"):
            print("Aborted.")
            return
        print()
        print("Clearing all collections...")
        await clear_all()

    elif choice == "S":
        print()
        print("Available collections:")
        for num, (label, model) in sorted(COLLECTIONS.items(), key=lambda x: int(x[0])):
            print(f"   [{num:>2}] {label}")
        print()
        raw = input("Enter collection numbers to clear (comma-separated, e.g. 1,2,9): ")
        keys = [k.strip() for k in raw.split(",") if k.strip()]
        if not keys:
            print("No collections selected. Aborted.")
            return
        confirm = input(f"Clear {len(keys)} collection(s)? (yes/no): ").strip().lower()
        if confirm not in ("yes", "y"):
            print("Aborted.")
            return
        print()
        await clear_selected(keys)

    else:
        return

    print()
    await show_counts()
    print()


if __name__ == "__main__":
    asyncio.run(main())
