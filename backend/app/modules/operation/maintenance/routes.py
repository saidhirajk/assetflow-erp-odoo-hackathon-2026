from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import api_ok, get_current_user
from .schemas import MaintenanceCreate, MaintenanceUpdate
from .repository import list_maintenance, create_maintenance, update_maintenance_status

router = APIRouter(prefix="/api/v1/maintenance", tags=["Maintenance"])


@router.get("")
def get_maintenance(current_user=Depends(get_current_user)):
    return api_ok("Maintenance requests retrieved", list_maintenance())


@router.post("")
def raise_request(payload: MaintenanceCreate, current_user=Depends(get_current_user)):
    result = create_maintenance(
        int(payload.asset_id), current_user["user_id"],
        payload.issue_description, payload.priority, payload.photo_url,
    )
    return api_ok("Maintenance request raised", result)


@router.patch("/{request_id}")
def update_status(request_id: int, payload: MaintenanceUpdate, current_user=Depends(get_current_user)):
    if current_user["role"] not in ("Admin", "Asset Manager"):
        raise HTTPException(status_code=403, detail="Only Admin or Asset Manager can update maintenance status")
    result = update_maintenance_status(
        request_id, payload.status, payload.technician_name,
        payload.resolution_notes, current_user["user_id"],
    )
    if not result:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    return api_ok("Status updated")
