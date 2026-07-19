from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.rotation_history import RotationHistory
from app.core.deps import get_current_user, require_role
from app.services.rotation_service import rotate_secret, find_secrets_due_for_rotation
from app.services.risk_scoring import score_user_risk
from app.services.audit_service import log_action
from app.schemas.secret import SecretOut
from app.schemas.rotation import RotationHistoryOut, RiskScoreOut

router = APIRouter(tags=["Rotation & Risk"])


# ---------------- Rotation ----------------

@router.post("/secrets/{secret_id}/rotate", response_model=SecretOut)
def rotate_secret_now(
    secret_id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Manual on-demand rotation trigger."""
    try:
        rotated = rotate_secret(db, secret_id, trigger_type="manual")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    log_action(db, current_user.id, "secret_rotated", "secret", secret_id, detail="manual")
    return rotated


@router.post("/secrets/rotate-due")
def rotate_all_due(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """
    Scheduled rotation sweep -- intended to be called by a cron job or
    scheduler (e.g. APScheduler, or an external cron hitting this
    endpoint with a service credential) rather than a human.
    """
    due_secrets = find_secrets_due_for_rotation(db)
    rotated_ids = [rotate_secret(db, s.id, trigger_type="scheduled").id for s in due_secrets]
    if rotated_ids:
        log_action(
            db,
            current_user.id,
            "secret_rotated",
            detail=f"scheduled sweep rotated {len(rotated_ids)} secret(s): {rotated_ids}",
        )
    return {"rotated_secret_ids": rotated_ids, "count": len(rotated_ids)}


@router.get("/secrets/{secret_id}/rotation-history", response_model=list[RotationHistoryOut])
def get_rotation_history(
    secret_id: int,
    current_user: User = Depends(require_role(["admin", "approver"])),
    db: Session = Depends(get_db),
):
    return (
        db.query(RotationHistory)
        .filter(RotationHistory.secret_id == secret_id)
        .order_by(RotationHistory.rotated_at.desc())
        .all()
    )


# ---------------- Risk scoring ----------------

@router.get("/risk-score/{user_id}", response_model=RiskScoreOut)
def get_user_risk_score(
    user_id: int,
    current_user: User = Depends(require_role(["admin", "approver"])),
    db: Session = Depends(get_db),
):
    return score_user_risk(db, user_id)


@router.get("/risk-score/me/current", response_model=RiskScoreOut)
def get_my_risk_score(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return score_user_risk(db, current_user.id)
