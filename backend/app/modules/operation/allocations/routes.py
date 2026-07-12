from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import api_ok, get_current_user
from .schemas import AllocationCreate, ReturnRequest
from .repository import list_allocations, check_conflict, create_allocation, return_allocation

router = APIRouter(prefix="/api/v1/allocations", tags=["Allocations"])


@router.get("")
def get_allocations(
    status: str | None = Query(None),
    current_user=Depends(get_current_user),
):
    return api_ok("Allocations retrieved", list_allocations(status))


@router.post("")
def allocate_asset(payload: AllocationCreate, current_user=Depends(get_current_user)):
    asset_id = int(payload.asset_id)
    conflict = check_conflict(asset_id)
    if conflict:
        raise HTTPException(
            status_code=409,
            detail=f"Asset is currently allocated to {conflict[1]}. Please request a transfer instead.",
        )
    user_id = int(payload.allocated_to_user_id) if payload.allocated_to_user_id else None
    dept_id = int(payload.allocated_to_department_id) if payload.allocated_to_department_id else None
    result = create_allocation(asset_id, user_id, dept_id, payload.expected_return_date)
    return api_ok("Asset allocated", result)


@router.post("/{allocation_id}/return")
def do_return(allocation_id: int, payload: ReturnRequest, current_user=Depends(get_current_user)):
    result = return_allocation(allocation_id, payload.return_condition_notes)
    if not result:
        raise HTTPException(status_code=404, detail="Active allocation not found")
    return api_ok("Asset returned")
