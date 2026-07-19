from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class AuditLog(Base):
    """Append-only trail of every security-relevant action. Rows are
    never updated or deleted by application code -- that immutability is
    what makes this usable as compliance evidence (PCI-DSS/SOC2-style)."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    action = Column(String(50), nullable=False)
    # login, login_failed, register, request_created, request_approved,
    # request_denied, secret_created, secret_revealed, secret_rotated,
    # session_revoked, session_expired, break_glass, mfa_enabled

    target_type = Column(String(50), nullable=True)  # resource | secret | access_request | session | user
    target_id = Column(Integer, nullable=True)

    detail = Column(String(500), nullable=True)
    ip_address = Column(String(64), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
