from datetime import datetime, timezone

from sqlalchemy.orm import Session as DBSession

from app.models.session import Session as SessionModel
from app.services.audit_service import log_action


def apply_lazy_expiry(db: DBSession, session: SessionModel) -> SessionModel:
    """Just-In-Time sessions don't need a background scheduler to expire --
    any read of a session checks its own expiry and flips is_active off
    the moment it's discovered to be past expires_at."""
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if session.is_active and datetime.now(timezone.utc) > expires_at:
        session.is_active = False
        session.ended_at = datetime.now(timezone.utc)
        db.add(session)
        db.commit()
        db.refresh(session)
        log_action(db, session.user_id, "session_expired", "session", session.id)
    return session


def revoke_session(db: DBSession, session: SessionModel, revoked_by_user_id: int) -> SessionModel:
    session.is_active = False
    session.ended_at = datetime.now(timezone.utc)
    session.revoked_by = revoked_by_user_id
    db.add(session)
    db.commit()
    db.refresh(session)
    log_action(db, revoked_by_user_id, "session_revoked", "session", session.id)
    return session
