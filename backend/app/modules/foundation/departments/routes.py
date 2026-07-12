from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import api_ok, get_current_user
from .schemas import DepartmentCreate, DepartmentUpdate
from .repository import get_departments, create_department, update_department

router = APIRouter(prefix="/api/v1/departments", tags=["Departments"])


@router.get("")
def list_departments(current_user=Depends(get_current_user)):
    rows = get_departments()
    result = []
    for row in rows:
        result.append({
            "id": str(row[0]),
            "name": row[1],
            "code": row[2],
            "head_user_id": str(row[3]) if row[3] else None,
            "parent_department_id": str(row[4]) if row[4] else None,
            "status": row[5].lower(),
        })
    return api_ok("Departments retrieved", result)


@router.get("/active")
def list_active_departments():
    rows = get_departments()
    data = [
        {"id": str(row[0]), "name": row[1]}
        for row in rows
        if row[5] == "Active"
    ]
    return api_ok("Active departments retrieved", data)


@router.post("")
def add_department(department: DepartmentCreate, current_user=Depends(get_current_user)):
    department_id = create_department(department)
    return api_ok("Department created", {"id": str(department_id)})


@router.patch("/{department_id}")
def edit_department(department_id: int, payload: DepartmentUpdate, current_user=Depends(get_current_user)):
    update_department(
        department_id,
        name=payload.name,
        code=payload.code,
        head_user_id=payload.head_user_id,
        parent_department_id=payload.parent_department_id,
        status=payload.status,
    )
    return api_ok("Department updated")
