from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import api_ok, get_current_user
from .schemas import AuditCycleCreate, AuditItemMark
from .repository import list_cycles, create_cycle, mark_item, close_cycle

router = APIRouter(prefix="/api/v1/audits", tags=["Audits"])


@router.get("")
def get_cycles(current_user=Depends(get_current_user)):
    return api_ok("Audit cycles retrieved", list_cycles())


@router.post("")
def add_cycle(payload: AuditCycleCreate, current_user=Depends(get_current_user)):
    dept_id = int(payload.scope_department_id) if payload.scope_department_id else None
    aid = create_cycle(
        dept_id, payload.scope_location,
        payload.start_date, payload.end_date,
        payload.auditor_user_ids,
    )
    return api_ok("Audit cycle created", {"id": str(aid)})


@router.post("/{audit_id}/items/{asset_id}/mark")
def do_mark(audit_id: int, asset_id: int, payload: AuditItemMark, current_user=Depends(get_current_user)):
    mark_item(audit_id, asset_id, current_user["user_id"], payload.result, payload.notes)
    return api_ok("Item marked")


@router.post("/{audit_id}/close")
def do_close(audit_id: int, current_user=Depends(get_current_user)):
    result = close_cycle(audit_id)
    if not result:
        raise HTTPException(status_code=404, detail="Audit cycle not found or not in progress")
    return api_ok("Audit cycle closed", result)
