"""
routers/notes.py — Persistent academic notes CRUD endpoints with public-sharing support.

Endpoints
---------
GET  /notes/        — List the authenticated user's own notes (private + public).
POST /notes/        — Create a new note for the authenticated user.
GET  /notes/public  — List ALL notes marked is_public=True (any authenticated user).
PUT  /notes/{id}    — Update a note owned by the authenticated user (404 if not owner).
DELETE /notes/{id}  — Delete a note owned by the authenticated user (404 if not owner).

Security model
--------------
• Ownership is enforced at the DB query level (WHERE created_by_id = current_user.id),
  so a non-owner always receives a 404 — not a 403 — to prevent resource enumeration.
• The public feed exposes only notes explicitly flagged is_public=True.
• creator_name is resolved via a joined-load so the public feed can show the author.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, Note
from schemas import NoteCreate, NoteUpdate, NoteOut
from auth.jwt import get_current_user
from utils.safe_data import as_list, map_serialized, safe_attr

router = APIRouter(prefix="/notes", tags=["Notes"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _serialize_note(note: Note) -> Optional[NoteOut]:
    """Map ORM Note → NoteOut, resolving creator_name from the loaded relationship."""
    if note is None:
        return None
    creator = safe_attr(note, "creator")
    creator_name = safe_attr(creator, "name") if creator else None
    return NoteOut(
        id=note.id,
        title=note.title or "",
        category=note.category or "General",
        content=note.content or "",
        is_public=bool(note.is_public),
        created_by_id=note.created_by_id,
        creator_name=creator_name,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


# ── base query with eager-loaded creator ─────────────────────────────────────

def _notes_query():
    """Base SQLAlchemy select that always eager-loads the creator relationship."""
    return select(Note).options(selectinload(Note.creator))


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/public", response_model=List[NoteOut], summary="Browse all publicly shared notes")
async def list_public_notes(
    category: Optional[str] = Query(None, description="Filter by category (case-insensitive)"),
    search: Optional[str] = Query(None, description="Search in title or content"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),   # any authenticated user
):
    """
    Returns all notes marked `is_public=True`, across all users.
    Optional filters: `category` (exact, case-insensitive) and `search` (title/content ilike).
    Supports pagination via `skip` / `limit`.
    """
    stmt = _notes_query().where(Note.is_public.is_(True))

    if category:
        stmt = stmt.where(Note.category.ilike(category))
    if search:
        term = f"%{search}%"
        stmt = stmt.where(Note.title.ilike(term) | Note.content.ilike(term))

    stmt = stmt.order_by(Note.updated_at.desc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    notes = as_list(res.scalars().all())
    return map_serialized(notes, _serialize_note)


@router.get("/", response_model=List[NoteOut], summary="List the current user's notes")
async def list_my_notes(
    category: Optional[str] = Query(None, description="Filter by category (case-insensitive)"),
    search: Optional[str] = Query(None, description="Search in title or content"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve **all** notes (private and public) created by the authenticated user.
    Optional filters: `category` and `search`.
    """
    stmt = _notes_query().where(Note.created_by_id == current_user.id)

    if category:
        stmt = stmt.where(Note.category.ilike(category))
    if search:
        term = f"%{search}%"
        stmt = stmt.where(Note.title.ilike(term) | Note.content.ilike(term))

    stmt = stmt.order_by(Note.updated_at.desc())
    res = await db.execute(stmt)
    notes = as_list(res.scalars().all())
    return map_serialized(notes, _serialize_note)


@router.post("/", response_model=NoteOut, status_code=status.HTTP_201_CREATED, summary="Create a new note")
async def create_note(
    payload: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new academic note for the authenticated user.
    Set `is_public=true` to make the note visible in the shared public feed.
    """
    note = Note(
        title=payload.title,
        category=payload.category,
        content=payload.content,
        is_public=payload.is_public,
        created_by_id=current_user.id,
    )
    db.add(note)
    await db.commit()

    # Re-fetch with the creator relationship so _serialize_note can resolve name
    stmt = _notes_query().where(Note.id == note.id)
    res = await db.execute(stmt)
    note = res.scalar_one()
    return _serialize_note(note)


@router.put("/{note_id}", response_model=NoteOut, summary="Update an owned note")
async def update_note(
    note_id: int,
    payload: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Patch-update an existing note.  Only the note's creator may update it.
    Returns **404** (not 403) when the note does not exist *or* belongs to another
    user — this prevents resource enumeration by malicious clients.
    """
    stmt = _notes_query().where(
        Note.id == note_id,
        Note.created_by_id == current_user.id,
    )
    res = await db.execute(stmt)
    note = res.scalar_one_or_none()

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in (update_data or {}).items():
        setattr(note, field, value)

    await db.commit()

    # Re-fetch to get fresh updated_at timestamp + any relationship data
    res2 = await db.execute(
        _notes_query().where(Note.id == note_id)
    )
    note = res2.scalar_one()
    return _serialize_note(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an owned note")
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permanently delete a note.  Only the note's creator may delete it.
    Returns **404** when the note does not exist *or* is owned by another user.
    """
    stmt = select(Note).where(
        Note.id == note_id,
        Note.created_by_id == current_user.id,
    )
    res = await db.execute(stmt)
    note = res.scalar_one_or_none()

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found.",
        )

    await db.delete(note)
    await db.commit()
