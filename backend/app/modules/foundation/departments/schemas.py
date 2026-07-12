from pydantic import BaseModel


class DepartmentCreate(BaseModel):
    name: str
    code: str


class DepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    head_user_id: int | None = None
    parent_department_id: int | None = None
    status: str | None = None
