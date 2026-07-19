from pydantic import BaseModel, field_validator
from datetime import datetime

SECRET_TYPES = ("password", "ssh_key", "api_token", "certificate")


class SecretCreate(BaseModel):
    resource_id: int
    secret_type: str
    secret_value: str

    @field_validator("secret_type")
    @classmethod
    def type_allowed(cls, v: str) -> str:
        if v not in SECRET_TYPES:
            raise ValueError(f"secret_type must be one of {SECRET_TYPES}.")
        return v

    @field_validator("secret_value")
    @classmethod
    def value_not_empty(cls, v: str) -> str:
        if len(v.strip()) == 0:
            raise ValueError("Secret value cannot be empty.")
        return v


class SecretOut(BaseModel):
    """Metadata only -- plaintext is never returned by list/get endpoints."""

    id: int
    resource_id: int
    secret_type: str
    rotation_interval_days: int
    last_rotated_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SecretReveal(BaseModel):
    secret: str
