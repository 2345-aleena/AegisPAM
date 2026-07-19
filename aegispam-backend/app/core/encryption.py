"""
Layer 4 -- Secret Vault encryption.

Secrets (passwords, SSH keys, API tokens) are never stored in plaintext.
They are symmetrically encrypted with Fernet (AES-128 in CBC mode + HMAC
for authenticity) before hitting the database, and only decrypted
in-memory, on demand, for a user holding an active JIT session.
"""
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

_fernet = Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt_secret(plaintext: str) -> str:
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    try:
        return _fernet.decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Secret could not be decrypted -- key mismatch or corrupted data") from exc
