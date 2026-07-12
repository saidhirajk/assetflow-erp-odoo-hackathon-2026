from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import api_ok, get_current_user
from .schemas import TransferRequest, TransferResolve
from .repository import list_transfers, create_transfer, resolve_transfer

router = APIRouter(prefix="/api/v1/transfers", tags=["Transfers"])


@router.get("")
def get_transfers(current_user=Depends(get_current_user)):
    return api_ok("Transfers retrieved", list_transfers())


@router.post("")
def request_transfer(payload: TransferRequest, current_user=Depends(get_current_user)):
    result = create_transfer(
        int(payload.asset_id), int(payload.to_user_id),
        current_user["user_id"], payload.reason,
    )
    return api_ok("Transfer requested", result)


@router.post("/{transfer_id}/resolve")
def do_resolve(transfer_id: int, payload: TransferResolve, current_user=Depends(get_current_user)):
    result = resolve_transfer(transfer_id, payload.approve, current_user["user_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return api_ok("Transfer resolved")
