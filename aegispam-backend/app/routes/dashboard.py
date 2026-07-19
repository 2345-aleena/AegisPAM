from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.resource import Resource
from app.models.secret import Secret
from app.models.access_request import AccessRequest
from app.models.session import Session as SessionModel
from app.core.deps import require_role
from app.services.risk_scoring import score_user_risk
from app.schemas.dashboard import DashboardSummary, RequestsOverTimePoint

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _requests_over_time(db: Session, days: int = 14) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            func.date(AccessRequest.created_at).label("day"),
            func.count(AccessRequest.id).label("count"),
        )
        .filter(AccessRequest.created_at >= since)
        .group_by(func.date(AccessRequest.created_at))
        .order_by(func.date(AccessRequest.created_at))
        .all()
    )
    return [{"date": str(row.day), "count": row.count} for row in rows]


@router.get("/requests-over-time", response_model=list[RequestsOverTimePoint])
def requests_over_time(
    days: int = 14,
    current_user: User = Depends(require_role(["admin", "approver"])),
    db: Session = Depends(get_db),
):
    return _requests_over_time(db, days)


@router.get("/active-sessions")
def active_sessions_overview(
    current_user: User = Depends(require_role(["admin", "approver"])),
    db: Session = Depends(get_db),
):
    active_count = db.query(SessionModel).filter(SessionModel.is_active == True).count()  # noqa: E712
    return {"active_sessions_count": active_count}


@router.get("/risk-trends")
def risk_trends(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    users = db.query(User).all()
    return [score_user_risk(db, u.id) for u in users]


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    current_user: User = Depends(require_role(["admin", "approver"])),
    db: Session = Depends(get_db),
):
    """One-shot endpoint that feeds the main dashboard landing view."""
    requests_series = _requests_over_time(db, 14)
    active_sessions = db.query(SessionModel).filter(SessionModel.is_active == True).count()  # noqa: E712
    pending_requests = db.query(AccessRequest).filter(AccessRequest.status == "pending").count()
    total_resources = db.query(Resource).count()
    total_secrets = db.query(Secret).count()

    users = db.query(User).all()
    scores = [score_user_risk(db, u.id) for u in users]
    high_risk_count = sum(1 for s in scores if s["badge"] == "High")

    breakdown: dict[str, int] = {"Low": 0, "Medium": 0, "High": 0}
    for s in scores:
        breakdown[s["badge"]] += 1

    return {
        "requests_over_time": requests_series,
        "active_sessions_count": active_sessions,
        "high_risk_user_count": high_risk_count,
        "pending_requests_count": pending_requests,
        "total_resources": total_resources,
        "total_secrets": total_secrets,
        "risk_breakdown": [{"badge": k, "count": v} for k, v in breakdown.items()],
    }
