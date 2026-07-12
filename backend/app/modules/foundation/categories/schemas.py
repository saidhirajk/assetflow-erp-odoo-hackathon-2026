from pydantic import BaseModel
from typing import Any


class CategoryCreate(BaseModel):
    name: str
    custom_fields: list[dict[str, Any]] = []
    status: str = "Active"


class CategoryUpdate(BaseModel):
    name: str | None = None
    custom_fields: list[dict[str, Any]] | None = None
    status: str | None = None
