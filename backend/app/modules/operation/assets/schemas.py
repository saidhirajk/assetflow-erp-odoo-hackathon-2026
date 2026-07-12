from pydantic import BaseModel


class AssetCreate(BaseModel):
    name: str
    category_id: str | None = None
    department_id: str | None = None
    serial_number: str = ""
    acquisition_date: str | None = None
    acquisition_cost: float | None = None
    condition: str = "New"
    location: str = ""
    is_bookable: bool = False
    photo_url: str = ""
    customValues: dict = {}


class AssetUpdate(AssetCreate):
    status: str = "Available"
