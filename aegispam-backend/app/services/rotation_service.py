import secrets as pysecrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.encryption import encrypt_secret
from app.models.secret import Secret
from app.models.rotation_history import RotationHistory


def generate_new_secret_value() -> str:
    """Cryptographically strong replacement value (32 chars, URL-safe)."""
    return pysecrets.token_urlsafe(24)


def rotate_secret(db: Session, secret_id: int, trigger_type: str = "manual") -> Secret:
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if not secret:
        raise ValueError(f"Secret {secret_id} not found")

    new_value = generate_new_secret_value()
    secret.encrypted_value = encrypt_secret(new_value)
    secret.last_rotated_at = datetime.now(timezone.utc)
    db.add(secret)

    db.add(RotationHistory(secret_id=secret.id, rotated_by=trigger_type))
    db.commit()
    db.refresh(secret)
    return secret


def find_secrets_due_for_rotation(db: Session) -> list[Secret]:
    """Secrets whose last_rotated_at + rotation_interval_days has elapsed."""
    now = datetime.now(timezone.utc)
    due = []
    for secret in db.query(Secret).all():
        last_rotated = secret.last_rotated_at
        if last_rotated.tzinfo is None:
            last_rotated = last_rotated.replace(tzinfo=timezone.utc)
        deadline = last_rotated + timedelta(days=secret.rotation_interval_days)
        if now >= deadline:
            due.append(secret)
    return due
