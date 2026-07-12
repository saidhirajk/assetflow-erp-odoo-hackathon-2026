from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import api_ok, get_current_user
from .schemas import CategoryCreate, CategoryUpdate
from .repository import get_all_categories, create_category, update_category

router = APIRouter(prefix="/api/v1/categories", tags=["Categories"])


@router.get("")
def list_categories(current_user=Depends(get_current_user)):
    return api_ok("Categories retrieved", get_all_categories())


@router.post("")
def add_category(payload: CategoryCreate, current_user=Depends(get_current_user)):
    cid = create_category(payload.name, payload.custom_fields, payload.status)
    return api_ok("Category created", {"id": str(cid)})


@router.patch("/{category_id}")
def edit_category(category_id: int, payload: CategoryUpdate, current_user=Depends(get_current_user)):
    update_category(category_id, payload.name, payload.custom_fields, payload.status)
    return api_ok("Category updated")
