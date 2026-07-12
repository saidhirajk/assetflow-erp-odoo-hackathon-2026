from pydantic import BaseModel


class MaintenanceCreate(BaseModel):
    asset_id: str
    issue_description: str
    priority: str = "Medium"
    photo_url: str = ""


class MaintenanceUpdate(BaseModel):
    request_id: str
    status: str
    technician_name: str | None = None
    resolution_notes: str | None = None
