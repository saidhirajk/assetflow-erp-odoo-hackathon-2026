from pydantic import BaseModel


class AllocationCreate(BaseModel):
    asset_id: str
    allocated_to_user_id: str | None = None
    allocated_to_department_id: str | None = None
    expected_return_date: str | None = None


class ReturnRequest(BaseModel):
    return_condition_notes: str = ""
