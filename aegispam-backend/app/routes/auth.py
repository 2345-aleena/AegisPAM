from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, RoleEnum
from app.schemas.user import UserCreate, UserOut, UserLogin, MFAVerifyRequest, RoleUpdate
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_mfa_secret,
    get_totp_uri,
    verify_totp_code,
)
from app.core.deps import get_current_user, require_role
from app.services.audit_service import log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# ---------------- Registration & login ----------------

@router.post("/register", response_model=UserOut, status_code=201)
def register(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing_user = (
        db.query(User).filter((User.username == user.username) | (User.email == user.email)).first()
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already in use.")

    # Security note: self-registration always creates a "requester" -- the
    # lowest-privilege role. Only an existing admin can promote a user to
    # approver/admin via PATCH /auth/users/{id}/role. This closes a real
    # privilege-escalation gap that existed in the original prototype,
    # where callers could register directly as admin.
    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password),
        role=RoleEnum.requester,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_action(db, new_user.id, "register", "user", new_user.id, ip_address=_client_ip(request))
    return new_user


@router.post("/login")
def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == credentials.username).first()

    if not db_user or not verify_password(credentials.password, db_user.password_hash):
        if db_user:
            log_action(db, db_user.id, "login_failed", "user", db_user.id, ip_address=_client_ip(request))
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated.")

    if db_user.mfa_enabled:
        return {"mfa_required": True, "user_id": db_user.id}

    access_token = create_access_token(data={"sub": str(db_user.id), "role": db_user.role.value})
    log_action(db, db_user.id, "login", "user", db_user.id, ip_address=_client_ip(request))
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


# ---------------- MFA / TOTP ----------------

@router.post("/mfa/enroll")
def mfa_enroll(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Issues a fresh TOTP secret + otpauth URI for the user to scan into
    an authenticator app (Google Authenticator, Authy, etc)."""
    secret = generate_mfa_secret()
    current_user.mfa_secret = secret
    db.commit()

    uri = get_totp_uri(secret, current_user.username)
    return {"mfa_secret": secret, "otpauth_uri": uri}


@router.post("/mfa/activate")
def mfa_activate(
    payload: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="Call /auth/mfa/enroll first.")

    if not verify_totp_code(current_user.mfa_secret, payload.code):
        raise HTTPException(status_code=401, detail="Invalid MFA code.")

    current_user.mfa_enabled = True
    db.commit()
    log_action(db, current_user.id, "mfa_enabled", "user", current_user.id)
    return {"message": "MFA enabled for this account."}


@router.post("/mfa/verify-login")
def mfa_verify_login(user_id: int, payload: MFAVerifyRequest, request: Request, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user or not db_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA is not configured for this account.")

    if not verify_totp_code(db_user.mfa_secret, payload.code):
        log_action(db, db_user.id, "login_failed", "user", db_user.id, detail="bad_mfa_code")
        raise HTTPException(status_code=401, detail="Invalid MFA code.")

    access_token = create_access_token(data={"sub": str(db_user.id), "role": db_user.role.value})
    log_action(db, db_user.id, "login", "user", db_user.id, detail="mfa_verified", ip_address=_client_ip(request))
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------- Break-glass emergency override ----------------

@router.post("/break-glass/{resource_id}")
def break_glass(
    resource_id: int,
    reason: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Emergency override that bypasses the normal request/approve flow.
    Always logged and always visible on the audit trail + risk score --
    this is by design a trust-but-verify escape hatch, not a free pass."""
    if len(reason.strip()) < 10:
        raise HTTPException(status_code=422, detail="A break-glass reason of at least 10 characters is required.")

    log_action(
        db,
        current_user.id,
        "break_glass",
        "resource",
        resource_id,
        detail=reason.strip(),
    )
    return {
        "message": "Break-glass override granted and logged.",
        "resource_id": resource_id,
        "granted_to": current_user.username,
    }


# ---------------- Admin: role management ----------------

@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: RoleUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    old_role = target.role.value
    target.role = payload.role
    db.commit()
    db.refresh(target)
    log_action(
        db,
        current_user.id,
        "role_changed",
        "user",
        target.id,
        detail=f"{old_role} -> {payload.role.value}",
    )
    return target


@router.get("/users", response_model=list[UserOut])
def list_users(
    current_user: User = Depends(require_role(["admin", "approver"])),
    db: Session = Depends(get_db),
):
    return db.query(User).all()
