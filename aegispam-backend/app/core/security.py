from datetime import datetime, timedelta, timezone

import pyotp
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------- Password hashing ----------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ---------- JWT access tokens ----------
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ---------- TOTP / MFA ----------
def generate_mfa_secret() -> str:
    """Generate a new base32 secret for a user enrolling in MFA."""
    return pyotp.random_base32()


def get_totp_uri(mfa_secret: str, username: str, issuer: str = "AegisPAM") -> str:
    """otpauth:// URI used to render a QR code in an authenticator app."""
    return pyotp.totp.TOTP(mfa_secret).provisioning_uri(name=username, issuer_name=issuer)


def verify_totp_code(mfa_secret: str, code: str) -> bool:
    totp = pyotp.TOTP(mfa_secret)
    return totp.verify(code, valid_window=1)
