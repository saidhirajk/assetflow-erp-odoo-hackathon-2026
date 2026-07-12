from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import api_ok, get_current_user
from .schemas import AssetCreate, AssetUpdate
from .repository import (
    list_assets, list_assets_filtered, get_asset_by_id,
    create_asset, update_asset,
    get_asset_allocation_history, get_asset_maintenance_history,
)

router = APIRouter(prefix="/api/v1/assets", tags=["Assets"])


@router.get("")
def get_assets(
    bookable: bool | None = Query(None),
    current_user=Depends(get_current_user),
):
    if bookable:
        return api_ok("Assets retrieved", list_assets_filtered(bookable_only=True))
    return api_ok("Assets retrieved", list_assets())


@router.get("/{asset_id}")
def get_asset(asset_id: int, current_user=Depends(get_current_user)):
    asset = get_asset_by_id(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return api_ok("Asset retrieved", asset)


@router.post("")
def register_asset(payload: AssetCreate, current_user=Depends(get_current_user)):
    aid, tag = create_asset(payload)
    return api_ok("Asset registered", {"id": str(aid), "asset_tag": tag})


@router.put("/{asset_id}")
def edit_asset(asset_id: int, payload: AssetUpdate, current_user=Depends(get_current_user)):
    asset = get_asset_by_id(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    update_asset(asset_id, payload)
    return api_ok("Asset updated")


@router.get("/{asset_id}/allocations")
def asset_allocation_history(asset_id: int, current_user=Depends(get_current_user)):
    return api_ok("Allocation history", get_asset_allocation_history(asset_id))


@router.get("/{asset_id}/maintenance")
def asset_maintenance_history(asset_id: int, current_user=Depends(get_current_user)):
    return api_ok("Maintenance history", get_asset_maintenance_history(asset_id))
