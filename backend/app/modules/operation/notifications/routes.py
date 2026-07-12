from fastapi import APIRouter, Depends

from app.core.deps import api_ok, get_current_user
from .repository import list_notifications, count_unread, mark_read, mark_all_read

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get("")
def get_notifications(limit: int = 100, current_user=Depends(get_current_user)):
    return api_ok("Notifications retrieved", list_notifications(current_user["user_id"], limit))


@router.get("/unread-count")
def get_unread_count(current_user=Depends(get_current_user)):
    return api_ok("Unread count", count_unread(current_user["user_id"]))


@router.post("/mark-all-read")
def do_mark_all_read(current_user=Depends(get_current_user)):
    mark_all_read(current_user["user_id"])
    return api_ok("All notifications marked as read")


@router.post("/{notification_id}/read")
def do_mark_read(notification_id: int, current_user=Depends(get_current_user)):
    mark_read(notification_id, current_user["user_id"])
    return api_ok("Notification marked as read")
