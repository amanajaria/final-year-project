"""
auth/routes.py — /auth/login and /auth/register endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt

from database import get_db
from models import User, Department
from schemas import LoginRequest, RegisterRequest, TokenResponse
from auth.jwt import create_access_token
from auth.crypto import _encrypt_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user (any role). In production, restrict ADMIN creation."""
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    # Validate department
    if payload.dept_id:
        dept_result = await db.execute(
            select(Department).where(Department.id == payload.dept_id)
        )
        if not dept_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with id={payload.dept_id} not found.",
            )

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=_hash_password(payload.password),
        encrypted_password=_encrypt_password(payload.password),
        role=payload.role,
        dept_id=payload.dept_id,
        semester=payload.semester,
        section=payload.section,
        roll_no=payload.roll_no,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=user.id,
        name=user.name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and return a JWT bearer token."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user: User | None = result.scalar_one_or_none()

    if not user or not getattr(user, "hashed_password", None) or not _verify_password(
        payload.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact administrator.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=user.id,
        name=user.name,
    )
