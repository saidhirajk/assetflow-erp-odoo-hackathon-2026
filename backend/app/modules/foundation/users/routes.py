from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import api_ok, get_current_user
from .schemas import RoleUpdate
from .repository import get_all_users, get_active_users, update_user_role

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("")
def list_users(current_user=Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return api_ok("Users retrieved", get_all_users())


@router.get("/active")
def list_active_users(current_user=Depends(get_current_user)):
    return api_ok("Active users retrieved", get_active_users())


@router.patch("/{user_id}/role")
def set_user_role(user_id: int, payload: RoleUpdate, current_user=Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    valid_roles = ["admin", "asset_manager", "department_head", "employee"]
    if payload.role not in valid_roles:
        raise HTTPException(status_code=422, detail=f"Invalid role. Must be one of: {valid_roles}")
    role_db = payload.role.replace("_", " ").title()
    update_user_role(user_id, role_db)
    return api_ok("Role updated")
