from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogOut
from app.core.deps import require_role

router = APIRouter(prefix="/audit-logs", tags=["Audit"])


@router.get("/", response_model=list[AuditLogOut])
def list_audit_logs(
    action: str | None = Query(default=None, description="Filter by action type"),
    user_id: int | None = Query(default=None, description="Filter by acting user"),
    limit: int = Query(default=100, le=500),
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Admin-only, paginated, append-only audit trail. This table is the
    single most important artifact during a compliance review -- it is
    never mutated by any other route in this codebase."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()
