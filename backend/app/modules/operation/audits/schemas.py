from pydantic import BaseModel


class AuditCycleCreate(BaseModel):
    scope_department_id: str | None = None
    scope_location: str = ""
    start_date: str
    end_date: str
    auditor_user_ids: list[str] = []


class AuditItemMark(BaseModel):
    asset_id: str
    result: str
    notes: str = ""
