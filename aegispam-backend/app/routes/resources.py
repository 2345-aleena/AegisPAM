from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.resource import Resource
from app.schemas.resource import ResourceCreate, ResourceOut
from app.core.deps import get_current_user, require_role
from app.services.audit_service import log_action

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.post("/", response_model=ResourceOut, status_code=201)
def create_resource(
    resource: ResourceCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    new_resource = Resource(
        name=resource.name,
        description=resource.description,
        resource_type=resource.resource_type,
        created_by=current_user.id,
    )
    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)
    log_action(db, current_user.id, "resource_created", "resource", new_resource.id, detail=new_resource.name)
    return new_resource


@router.get("/", response_model=list[ResourceOut])
def list_resources(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Resource).order_by(Resource.created_at.desc()).all()


@router.get("/{resource_id}", response_model=ResourceOut)
def get_resource(resource_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    return resource


@router.delete("/{resource_id}", status_code=204)
def delete_resource(
    resource_id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    db.delete(resource)
    db.commit()
    log_action(db, current_user.id, "resource_deleted", "resource", resource_id)
    return None
