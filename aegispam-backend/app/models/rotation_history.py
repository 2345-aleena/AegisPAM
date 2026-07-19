from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class RotationHistory(Base):
    __tablename__ = "rotation_history"

    id = Column(Integer, primary_key=True, index=True)
    secret_id = Column(Integer, ForeignKey("secrets.id"), nullable=False)
    rotated_at = Column(DateTime(timezone=True), server_default=func.now())
    rotated_by = Column(String(20), nullable=False)  # "scheduled" or "manual" trigger type
