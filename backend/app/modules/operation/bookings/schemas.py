from pydantic import BaseModel


class BookingCreate(BaseModel):
    asset_id: str
    start_time: str
    end_time: str
    purpose: str = ""
