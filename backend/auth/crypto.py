import os
# pyrefly: ignore [missing-import]
from cryptography.fernet import Fernet

# Stable base64 32-byte key fallback for local development
DEFAULT_KEY = "G6Qn7J5vC92_eXW1o_U1k7u3Yq5A2e8vF1yP4w9a8sE="
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", DEFAULT_KEY)

# Strip any surrounding byte literal markers (e.g. b'...' from environment variables)
if ENCRYPTION_KEY.startswith("b'") or ENCRYPTION_KEY.startswith('b"'):
    ENCRYPTION_KEY = ENCRYPTION_KEY[2:-1]

fernet = Fernet(ENCRYPTION_KEY.encode())

def _encrypt_password(password: str) -> str:
    """Encrypts plain-text password symmetrically using Fernet AES-256."""
    if not password:
        return None
    return fernet.encrypt(password.encode()).decode()

def _decrypt_password(encrypted: str) -> str:
    """Decrypts symmetrically encrypted Fernet token back to plain-text."""
    if not encrypted:
        return None
    return fernet.decrypt(encrypted.encode()).decode()
