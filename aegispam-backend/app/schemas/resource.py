from typing import Literal

from pydantic import BaseModel, field_validator
from datetime import datetime

RESOURCE_TYPES = ("Database", "Server", "Cloud Account", "Application", "Network Device", "Other")


class ResourceCreate(BaseModel):
    name: str
    description: str | None = None
    resource_type: str

    @field_validator("name")
    @classmethod
    def name_length(cls, v: str) -> str:
        if not (2 <= len(v.strip()) <= 100):
            raise ValueError("Resource name must be between 2 and 100 characters.")
        return v.strip()

    @field_validator("resource_type")
    @classmethod
    def type_allowed(cls, v: str) -> str:
        if v not in RESOURCE_TYPES:
            raise ValueError(f"resource_type must be one of {RESOURCE_TYPES}.")
        return v


class ResourceOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    resource_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
