from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.resource import Resource
from app.models.access_request import AccessRequest
from app.models.session import Session as SessionModel
from app.schemas.access_request import AccessRequestCreate, AccessRequestOut, ApprovalDecision
from app.core.deps import get_current_user, require_role
from app.services.audit_service import log_action

router = APIRouter(prefix="/access-requests", tags=["Access Requests"])


@router.post("/", response_model=AccessRequestOut, status_code=201)
def create_access_request(
    payload: AccessRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == payload.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")

    new_request = AccessRequest(
        requester_id=current_user.id,
        resource_id=payload.resource_id,
        justification=payload.justification,
        requested_duration_minutes=payload.requested_duration_minutes,
        status="pending",
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    log_action(db, current_user.id, "request_created", "access_request", new_request.id, detail=resource.name)
    return new_request


@router.get("/", response_model=list[AccessRequestOut])
def list_access_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Admins/approvers see every request; requesters only see their own."""
    query = db.query(AccessRequest)
    if current_user.role.value == "requester":
        query = query.filter(AccessRequest.requester_id == current_user.id)
    return query.order_by(AccessRequest.created_at.desc()).all()


@router.patch("/{request_id}/decision")
def decide_request(
    request_id: int,
    decision: ApprovalDecision,
    current_user: User = Depends(require_role(["admin", "approver"])),
    db: Session = Depends(get_db),
):
    access_request = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    if not access_request:
        raise HTTPException(status_code=404, detail="Access request not found.")

    if access_request.status != "pending":
        raise HTTPException(status_code=400, detail="This request has already been decided.")

    access_request.approver_id = current_user.id
    access_request.decided_at = datetime.now(timezone.utc)

    if decision.status == "approved":
        access_request.status = "approved"

        new_session = SessionModel(
            user_id=access_request.requester_id,
            access_request_id=access_request.id,
            started_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=access_request.requested_duration_minutes),
            is_active=True,
        )
        db.add(new_session)
        db.commit()
        log_action(
            db,
            current_user.id,
            "request_approved",
            "access_request",
            access_request.id,
            detail=f"session created for user {access_request.requester_id}",
        )
    else:
        access_request.status = "denied"
        db.commit()
        log_action(db, current_user.id, "request_denied", "access_request", access_request.id)

    return {"message": f"Request {decision.status} successfully."}
