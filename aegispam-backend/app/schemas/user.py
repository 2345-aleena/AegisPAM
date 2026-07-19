import re

from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime

from app.models.user import RoleEnum


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not re.fullmatch(r"[a-zA-Z0-9_]{3,32}", v):
            raise ValueError("Username must be 3-32 characters: letters, numbers, underscores only.")
        return v

    @field_validator("password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number.")
        return v


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: RoleEnum
    mfa_enabled: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    username: str
    password: str


class MFAVerifyRequest(BaseModel):
    code: str

    @field_validator("code")
    @classmethod
    def code_format(cls, v: str) -> str:
        if not re.fullmatch(r"\d{6}", v):
            raise ValueError("MFA code must be exactly 6 digits.")
        return v


class RoleUpdate(BaseModel):
    role: RoleEnum
