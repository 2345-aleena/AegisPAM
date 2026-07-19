from pydantic import BaseModel
from datetime import datetime


class AuditLogOut(BaseModel):
    id: int
    user_id: int | None
    action: str
    target_type: str | None
    target_id: int | None
    detail: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
