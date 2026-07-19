from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.user import User
from app.models.session import Session as SessionModel
from app.schemas.session import SessionOut
from app.core.deps import get_current_user, require_role
from app.services.session_service import apply_lazy_expiry, revoke_session

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("/", response_model=list[SessionOut])
def list_sessions(current_user: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    """Admins/approvers see all sessions; requesters see only their own."""
    query = db.query(SessionModel)
    if current_user.role.value == "requester":
        query = query.filter(SessionModel.user_id == current_user.id)
    sessions = query.order_by(SessionModel.started_at.desc()).all()
    return [apply_lazy_expiry(db, s) for s in sessions]


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: int, current_user: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if current_user.role.value == "requester" and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot view another user's session.")
    return apply_lazy_expiry(db, session)


@router.post("/{session_id}/revoke", response_model=SessionOut)
def revoke(
    session_id: int,
    current_user: User = Depends(require_role(["admin", "approver"])),
    db: DBSession = Depends(get_db),
):
    """Manual kill-switch -- lets an admin/approver immediately terminate
    an in-progress JIT session, e.g. in response to a high risk score."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session is already inactive.")
    return revoke_session(db, session, current_user.id)
