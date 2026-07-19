from pydantic import BaseModel
from datetime import datetime


class SessionOut(BaseModel):
    id: int
    user_id: int
    access_request_id: int
    started_at: datetime
    expires_at: datetime
    is_active: bool
    ended_at: datetime | None

    model_config = {"from_attributes": True}
