# backend/routers/workflow_contracts.py

import logging
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.models import Project, Contract, Site
from backend.database import get_next_uid
from backend.security import get_current_active_user
from backend.utils.logger import setup_logger

router = APIRouter(
    prefix="/workflow/contracts",
    tags=["Workflow Contracts"],
    dependencies=[Depends(get_current_active_user)]
)

logger = setup_logger("WorkflowContractsRouter", log_file="logs/workflow_contracts_router.log", level=logging.DEBUG)

# ===== SCHEMAS =====

class ContractCreate(BaseModel):
    project_id: int
    contract_name: Optional[str] = None
    start_date: date
    end_date: date
    contract_value: float
    payment_terms: Optional[str] = None
    contract_terms: Optional[str] = None
    notes: Optional[str] = None

class ContractUpdate(BaseModel):
    contract_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    contract_value: Optional[float] = None
    payment_terms: Optional[str] = None
    contract_terms: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# ===== ENDPOINTS =====

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_contract(
    contract_data: ContractCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new contract under a project."""
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can create contracts")

    project = await Project.find_one(Project.uid == contract_data.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from backend.models import CompanySettings
    settings = await CompanySettings.find_one(CompanySettings.uid == 1)

    new_uid = await get_next_uid("contracts")
    if settings and settings.auto_generate_contract_codes:
        prefix = settings.contract_code_prefix or "CNT"
        contract_code = f"{prefix}-{new_uid:03d}"
    else:
        contract_code = f"CNT-{new_uid:03d}"

    new_contract = Contract(
        uid=new_uid,
        contract_code=contract_code,
        contract_name=contract_data.contract_name,
        project_id=contract_data.project_id,
        project_name=project.project_name,
        start_date=contract_data.start_date,
        end_date=contract_data.end_date,
        contract_value=contract_data.contract_value,
        payment_terms=contract_data.payment_terms,
        contract_terms=contract_data.contract_terms,
        notes=contract_data.notes,
        created_by_admin_id=current_user.get("id")
    )

    await new_contract.calculate_duration()

    if new_contract.uid not in project.contract_ids:
        project.contract_ids.append(new_contract.uid)
        await project.save()

    logger.info(f"Contract created: {contract_code} for project {project.project_code}")

    return new_contract


@router.get("/", response_model=List[dict])
async def get_all_contracts(
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all contracts. Optionally filter by project_id or status."""
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can view contracts")

    filters = []
    if project_id:
        filters.append(Contract.project_id == project_id)
    if status:
        filters.append(Contract.status == status)

    if filters:
        contracts = await Contract.find(*filters).sort("+uid").to_list()
    else:
        contracts = await Contract.find_all().sort("+uid").to_list()

    for contract in contracts:
        await contract.calculate_duration()

    logger.info(f"Retrieved {len(contracts)} contracts")
    return contracts


@router.get("/{contract_id}")
async def get_contract_details(
    contract_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Get detailed information about a specific contract."""
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can view contract details")

    contract = await Contract.find_one(Contract.uid == contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    await contract.calculate_duration()

    sites = await Site.find(Site.contract_id == contract_id).to_list()

    return {
        "contract": contract,
        "sites": sites
    }


@router.put("/{contract_id}")
async def update_contract(
    contract_id: int,
    contract_update: ContractUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update contract details."""
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can update contracts")

    contract = await Contract.find_one(Contract.uid == contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    update_data = contract_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contract, key, value)

    contract.updated_at = datetime.now()

    if "start_date" in update_data or "end_date" in update_data:
        await contract.calculate_duration()
    else:
        await contract.save()

    logger.info(f"Contract {contract_id} updated")

    return contract


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(
    contract_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a contract. Only allowed if no active sites exist."""
    if current_user.get("role") not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Admins can delete contracts")

    contract = await Contract.find_one(Contract.uid == contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    active_sites = await Site.find(
        Site.contract_id == contract_id,
        Site.status == "Active"
    ).count()

    if active_sites > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete contract with {active_sites} active site(s)."
        )

    project = await Project.find_one(Project.uid == contract.project_id)
    if project and contract.uid in project.contract_ids:
        project.contract_ids.remove(contract.uid)
        await project.save()

    await contract.delete()
    logger.info(f"Contract {contract_id} deleted")

    return None
