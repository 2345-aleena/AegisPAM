from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class Secret(Base):
    """Encrypted privileged credential tied to a resource. The plaintext
    value never touches the database -- only Fernet ciphertext does."""

    __tablename__ = "secrets"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)

    encrypted_value = Column(Text, nullable=False)
    secret_type = Column(String(50), nullable=False)  # password | ssh_key | api_token | certificate

    rotation_interval_days = Column(Integer, default=30)
    last_rotated_at = Column(DateTime(timezone=True), server_default=func.now())

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
