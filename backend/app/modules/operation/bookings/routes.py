from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import api_ok, get_current_user
from .schemas import BookingCreate
from .repository import list_bookings, check_overlap, create_booking, cancel_booking

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])


@router.get("")
def get_bookings(current_user=Depends(get_current_user)):
    return api_ok("Bookings retrieved", list_bookings())


@router.post("")
def add_booking(payload: BookingCreate, current_user=Depends(get_current_user)):
    if check_overlap(int(payload.asset_id), payload.start_time, payload.end_time):
        raise HTTPException(status_code=409, detail="This time slot conflicts with an existing booking")
    result = create_booking(
        int(payload.asset_id), current_user["user_id"],
        payload.start_time, payload.end_time, payload.purpose,
    )
    return api_ok("Booking created", result)


@router.post("/{booking_id}/cancel")
def do_cancel(booking_id: int, current_user=Depends(get_current_user)):
    if not cancel_booking(booking_id):
        raise HTTPException(status_code=404, detail="Booking not found or already completed")
    return api_ok("Booking cancelled")
