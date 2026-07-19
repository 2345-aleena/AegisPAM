from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.access_request import AccessRequest
from app.models.user import User


def _is_off_hours(dt: datetime) -> bool:
    """Flags activity between 11 PM and 6 AM local-server-time as off-hours."""
    return dt.hour >= 23 or dt.hour < 6


def score_user_risk(db: Session, user_id: int) -> dict:
    """
    Rule-based risk scoring combining four signals:
      1. Failed logins in the last 24h
      2. Rapid-fire access requests (>3 in 10 minutes)
      3. Off-hours login activity
      4. Any break-glass emergency override usage

    Returns a numeric score (0-100+) and a Low/Medium/High badge.
    This is intentionally transparent/rule-based (not a black-box ML
    model) so every score is explainable during an audit.
    """
    now = datetime.now(timezone.utc)
    score = 0
    reasons: list[str] = []

    user = db.query(User).filter(User.id == user_id).first()
    username = user.username if user else f"user_{user_id}"

    since_24h = now - timedelta(hours=24)
    failed_logins = (
        db.query(AuditLog)
        .filter(
            AuditLog.user_id == user_id,
            AuditLog.action == "login_failed",
            AuditLog.created_at >= since_24h,
        )
        .count()
    )
    if failed_logins >= 5:
        score += 40
        reasons.append(f"{failed_logins} failed logins in the last 24h")
    elif failed_logins >= 2:
        score += 15
        reasons.append(f"{failed_logins} failed logins in the last 24h")

    since_10min = now - timedelta(minutes=10)
    rapid_requests = (
        db.query(AccessRequest)
        .filter(
            AccessRequest.requester_id == user_id,
            AccessRequest.created_at >= since_10min,
        )
        .count()
    )
    if rapid_requests > 3:
        score += 30
        reasons.append(f"{rapid_requests} access requests submitted in 10 minutes")

    last_login = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user_id, AuditLog.action == "login")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    if last_login and _is_off_hours(last_login.created_at):
        score += 20
        reasons.append("Most recent login occurred off-hours (11pm-6am)")

    break_glass_count = (
        db.query(AuditLog).filter(AuditLog.user_id == user_id, AuditLog.action == "break_glass").count()
    )
    if break_glass_count > 0:
        score += 25
        reasons.append(f"{break_glass_count} break-glass override(s) used")

    if score >= 60:
        badge = "High"
    elif score >= 25:
        badge = "Medium"
    else:
        badge = "Low"

    return {"user_id": user_id, "username": username, "score": score, "badge": badge, "reasons": reasons}
