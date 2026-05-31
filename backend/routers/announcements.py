"""
routers/announcements.py — Full CRUD for college announcements.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from database import get_db
from models import User, UserRole, Announcement
from schemas import AnnouncementCreate, AnnouncementUpdate, AnnouncementOut
from auth.jwt import get_current_user, require_role
from utils.safe_data import as_list

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("/", response_model=List[AnnouncementOut])
async def list_announcements(
    dept_id: Optional[int] = Query(None, description="Filter by department (None = global)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return announcements visible to the current user (global + their dept)."""
    query = select(Announcement).order_by(Announcement.created_at.desc())

    if current_user.role == UserRole.STUDENT:
        # Students see global announcements + announcements for their dept (if assigned)
        dept_filter = Announcement.target_dept_id == None  # noqa: E711
        if current_user.dept_id is not None:
            dept_filter = dept_filter | (Announcement.target_dept_id == current_user.dept_id)
        query = query.where(dept_filter)
    elif dept_id is not None:
        query = query.where(
            (Announcement.target_dept_id == None)  # noqa: E711
            | (Announcement.target_dept_id == dept_id)
        )

    result = await db.execute(query.offset(skip).limit(limit))
    return as_list(result.scalars().all())


@router.post("/", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    payload: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    announcement = Announcement(
        title=payload.title,
        body=payload.body,
        posted_by=current_user.id,
        target_dept_id=payload.target_dept_id,
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)
    return announcement


@router.get("/{ann_id}", response_model=AnnouncementOut)
async def get_announcement(
    ann_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Announcement).where(Announcement.id == ann_id))
    ann = result.scalar_one_or_none()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")
    return ann


@router.put("/{ann_id}", response_model=AnnouncementOut)
async def update_announcement(
    ann_id: int,
    payload: AnnouncementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(Announcement).where(Announcement.id == ann_id))
    ann = result.scalar_one_or_none()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in (update_data or {}).items():
        setattr(ann, field, value)
    ann.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(ann)
    return ann


@router.delete("/{ann_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    ann_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(Announcement).where(Announcement.id == ann_id))
    ann = result.scalar_one_or_none()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    await db.delete(ann)
    await db.commit()
