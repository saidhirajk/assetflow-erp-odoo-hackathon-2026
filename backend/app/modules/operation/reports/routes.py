from fastapi import APIRouter, Depends

from app.core.deps import api_ok, get_current_user
from .repository import get_all_reports

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


@router.get("")
def get_reports(current_user=Depends(get_current_user)):
    return api_ok("Reports retrieved", get_all_reports(current_user))
