from typing import Literal

from pydantic import BaseModel, field_validator
from datetime import datetime

from app.core.config import settings


class AccessRequestCreate(BaseModel):
    resource_id: int
    justification: str
    requested_duration_minutes: int

    @field_validator("justification")
    @classmethod
    def justification_length(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Justification must be at least 10 characters -- explain why access is needed.")
        if len(v) > 1000:
            raise ValueError("Justification must be under 1000 characters.")
        return v.strip()

    @field_validator("requested_duration_minutes")
    @classmethod
    def duration_in_range(cls, v: int) -> int:
        if v < settings.MIN_ACCESS_DURATION_MINUTES or v > settings.MAX_ACCESS_DURATION_MINUTES:
            raise ValueError(
                f"Requested duration must be between {settings.MIN_ACCESS_DURATION_MINUTES} "
                f"and {settings.MAX_ACCESS_DURATION_MINUTES} minutes."
            )
        return v


class AccessRequestOut(BaseModel):
    id: int
    requester_id: int
    resource_id: int
    justification: str
    requested_duration_minutes: int
    status: str
    approver_id: int | None
    is_break_glass: bool
    created_at: datetime
    decided_at: datetime | None

    model_config = {"from_attributes": True}


class ApprovalDecision(BaseModel):
    status: Literal["approved", "denied"]
