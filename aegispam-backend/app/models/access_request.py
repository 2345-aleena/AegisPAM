from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func

from app.database import Base


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, index=True)

    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)

    justification = Column(Text, nullable=False)
    requested_duration_minutes = Column(Integer, nullable=False)

    status = Column(String(20), default="pending")  # pending | approved | denied | expired
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    is_break_glass = Column(Boolean, default=False)  # emergency override, always audited

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    decided_at = Column(DateTime(timezone=True), nullable=True)
