from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.user import User
from app.models.resource import Resource
from app.models.secret import Secret
from app.models.session import Session as SessionModel
from app.models.access_request import AccessRequest
from app.schemas.secret import SecretCreate, SecretOut, SecretReveal
from app.core.deps import get_current_user, require_role
from app.core.encryption import encrypt_secret, decrypt_secret
from app.services.audit_service import log_action

router = APIRouter(prefix="/secrets", tags=["Secrets"])


@router.post("/", response_model=SecretOut, status_code=201)
def create_secret(
    payload: SecretCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: DBSession = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == payload.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")

    new_secret = Secret(
        resource_id=payload.resource_id,
        encrypted_value=encrypt_secret(payload.secret_value),
        secret_type=payload.secret_type,
    )
    db.add(new_secret)
    db.commit()
    db.refresh(new_secret)
    log_action(db, current_user.id, "secret_created", "secret", new_secret.id, detail=resource.name)
    return new_secret


@router.get("/", response_model=list[SecretOut])
def list_secrets(
    current_user: User = Depends(require_role(["admin", "approver"])),
    db: DBSession = Depends(get_db),
):
    """Metadata only -- plaintext never appears in a list response."""
    return db.query(Secret).order_by(Secret.created_at.desc()).all()


@router.get("/{secret_id}/reveal", response_model=SecretReveal)
def reveal_secret(
    secret_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """
    Reveals plaintext only if the CALLER holds an active JIT session for
    the SAME resource this secret belongs to.

    Security note: the original prototype accepted reveal if *any* active
    session existed anywhere in the system, which let any user with any
    approved access read every secret. This version scopes the check to
    (a) the requesting user's own sessions and (b) the resource the
    secret is attached to, via the access_request the session came from.
    """
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found.")

    active_session = (
        db.query(SessionModel)
        .join(AccessRequest, SessionModel.access_request_id == AccessRequest.id)
        .filter(
            SessionModel.user_id == current_user.id,
            SessionModel.is_active == True,  # noqa: E712
            AccessRequest.resource_id == secret.resource_id,
        )
        .first()
    )

    if not active_session:
        raise HTTPException(
            status_code=403,
            detail="No active approved session for this resource. Request access first.",
        )

    expires_at = active_session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        active_session.is_active = False
        db.commit()
        raise HTTPException(status_code=403, detail="Your session has expired.")

    decrypted = decrypt_secret(secret.encrypted_value)
    log_action(db, current_user.id, "secret_revealed", "secret", secret.id)
    return {"secret": decrypted}
