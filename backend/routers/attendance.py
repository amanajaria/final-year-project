"""
routers/attendance.py — Bulk attendance submission + summary endpoints.
"""
from datetime import date as dt_date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, UserRole, AttendanceLog, CourseSchedule
from schemas import AttendanceBulkSubmit, AttendanceLogOut, AttendanceSummary
from auth.jwt import get_current_user, require_role
from utils.safe_data import as_list

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/submit", response_model=List[AttendanceLogOut], status_code=status.HTTP_201_CREATED)
async def submit_attendance(
    payload: AttendanceBulkSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    """
    Accept a bulk attendance payload for a class schedule on a given date.
    Upserts records — if a log already exists for (student, schedule, date),
    it updates the status instead of raising a duplicate error.
    """
    # Validate schedule exists
    schedule_result = await db.execute(
        select(CourseSchedule).where(CourseSchedule.id == payload.schedule_id)
    )
    schedule = schedule_result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CourseSchedule id={payload.schedule_id} not found.",
        )

    entries = as_list(payload.entries)
    if not entries:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one attendance entry is required.",
        )

    # Validate all student IDs belong to student role
    student_ids = [e.student_id for e in entries if e is not None and e.student_id is not None]
    if not student_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid student IDs in attendance entries.",
        )

    students_result = await db.execute(
        select(User).where(User.id.in_(student_ids), User.role == UserRole.STUDENT)
    )
    valid_ids = {u.id for u in as_list(students_result.scalars().all()) if u and u.id is not None}
    invalid = set(student_ids) - valid_ids
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid or non-student user IDs: {list(invalid)}",
        )

    # Fetch existing logs for this (schedule, date) combination
    existing_result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.schedule_id == payload.schedule_id,
            AttendanceLog.date == payload.date,
            AttendanceLog.student_id.in_(student_ids),
        )
    )
    existing_map = {
        log.student_id: log
        for log in as_list(existing_result.scalars().all())
        if log is not None and log.student_id is not None
    }

    saved_logs: List[AttendanceLog] = []
    for entry in entries:
        if entry.student_id in existing_map:
            log = existing_map[entry.student_id]
            log.status = entry.status
            log.marked_by_teacher_id = current_user.id
        else:
            log = AttendanceLog(
                student_id=entry.student_id,
                schedule_id=payload.schedule_id,
                date=payload.date,
                status=entry.status,
                marked_by_teacher_id=current_user.id,
            )
            db.add(log)
        saved_logs.append(log)

    await db.commit()
    for log in saved_logs:
        await db.refresh(log)

    return as_list(saved_logs)


@router.get("/summary", response_model=List[AttendanceSummary])
async def attendance_summary(
    schedule_id: Optional[int] = Query(None),
    dept_id: Optional[int] = Query(None),
    semester: Optional[int] = Query(None, ge=1, le=10),
    section: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.TEACHER)),
):
    """Return per-student attendance summary (total classes, present, %, etc.)."""
    student_query = (
        select(User)
        .where(User.role == UserRole.STUDENT)
    )
    if dept_id:
        student_query = student_query.where(User.dept_id == dept_id)
    if semester:
        student_query = student_query.where(User.semester == semester)
    if section:
        student_query = student_query.where(User.section == section)

    students = as_list((await db.execute(student_query)).scalars().all())
    summaries: List[AttendanceSummary] = []

    for student in students:
        if student is None or student.id is None:
            continue
        log_query = select(AttendanceLog).where(AttendanceLog.student_id == student.id)
        if schedule_id:
            log_query = log_query.where(AttendanceLog.schedule_id == schedule_id)
        logs = as_list((await db.execute(log_query)).scalars().all())

        total = len(logs)
        present = sum(
            1
            for log in logs
            if log is not None
            and getattr(getattr(log, "status", None), "value", log.status) == "PRESENT"
        )
        absent = total - present
        pct = round((present / total * 100), 2) if total > 0 else 0.0

        summaries.append(
            AttendanceSummary(
                student_id=student.id,
                name=student.name or "",
                roll_no=student.roll_no,
                total_classes=total,
                present=present,
                absent=absent,
                percentage=pct,
            )
        )

    return summaries


@router.get("/my", response_model=List[AttendanceLogOut])
async def my_attendance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Students can fetch their own attendance logs."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this endpoint.")
    result = await db.execute(
        select(AttendanceLog)
        .where(AttendanceLog.student_id == current_user.id)
        .order_by(AttendanceLog.date.desc())
    )
    return as_list(result.scalars().all())
