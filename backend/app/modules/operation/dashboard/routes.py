from fastapi import APIRouter, Depends

from app.core.deps import api_ok, get_current_user
from .repository import get_overview_counts

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/overview")
def get_overview(current_user=Depends(get_current_user)):
    return api_ok("Dashboard overview", get_overview_counts(current_user))
