from pydantic import BaseModel
from datetime import datetime
from typing import List


class RotationHistoryOut(BaseModel):
    id: int
    secret_id: int
    rotated_at: datetime
    rotated_by: str

    model_config = {"from_attributes": True}


class RiskScoreOut(BaseModel):
    user_id: int
    username: str
    score: int
    badge: str
    reasons: List[str]
