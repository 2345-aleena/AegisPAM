from pydantic import BaseModel
from typing import List


class RequestsOverTimePoint(BaseModel):
    date: str
    count: int


class RiskBadgeCount(BaseModel):
    badge: str
    count: int


class DashboardSummary(BaseModel):
    requests_over_time: List[RequestsOverTimePoint]
    active_sessions_count: int
    high_risk_user_count: int
    pending_requests_count: int
    total_resources: int
    total_secrets: int
    risk_breakdown: List[RiskBadgeCount]
