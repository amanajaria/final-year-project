"""
routers/users.py — Student listing + filtering, user management endpoints.
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, update
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, UserRole, Department, StudentResult, StudentSubjectResult, GroupRequest
from schemas import (
    UserOut,
    UserUpdate,
    PaginatedStudents,
    DepartmentCreate,
    DepartmentOut,
    RevealPasswordRequest,
    BulkOperationRequest,
    StudentResultsResponse,
    StudentResultSummaryOut,
    StudentSubjectResultOut,
)
from utils.safe_data import as_list, serialize_numeric, serialize_group_request, safe_attr
from auth.jwt import get_current_user, require_role
from auth.crypto import _decrypt_password
from auth.routes import _verify_password

router = APIRouter(prefix="/users", tags=["Users"])


# ── Students ──────────────────────────────────────────────────────────────────

@router.get("/students", response_model=PaginatedStudents)
async def list_students(
    dept_id: Optional[int] = Query(None, description="Filter by department ID"),
    semester: Optional[int] = Query(None, ge=1, le=10, description="Filter by semester"),
    section: Optional[str] = Query(None, max_length=10, description="Filter by section"),
    search: Optional[str] = Query(None, description="Search by name, email, or roll number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(2000, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.TEACHER)),
):
    """Fetch students with optional dept / semester / section / search filters."""
    query = (
        select(User)
        .options(selectinload(User.department))
        .where(User.role == UserRole.STUDENT)
    )
    if search:
        search_term = f"%{search}%"
        query = query.where(
            User.name.ilike(search_term) |
            User.email.ilike(search_term) |
            User.roll_no.ilike(search_term)
        )
    if dept_id is not None:
        query = query.where(User.dept_id == dept_id)
    if semester is not None:
        query = query.where(User.semester == semester)
    if section is not None:
        query = query.where(User.section == section)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one() or 0

    result = await db.execute(query.offset(skip).limit(limit))
    students = as_list(result.scalars().all())
    return PaginatedStudents(total=int(total), students=students)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


@router.get("/me/results", response_model=StudentResultsResponse)
async def get_my_results(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch the cumulative semester results and detailed subject grades for the logged-in student.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=403,
            detail="Only students can access their academic results."
        )
    
    if not current_user.roll_no:
        raise HTTPException(
            status_code=404,
            detail="Student does not have a roll number configured."
        )

    # Fetch summary GPAs
    summary_stmt = select(StudentResult).where(StudentResult.enrollment_no == current_user.roll_no)
    summary_res = await db.execute(summary_stmt)
    summary = summary_res.scalar_one_or_none()

    if not summary:
        return StudentResultsResponse(summary=None, subject_results=[])

    # Fetch all subject-wise results
    subjects_stmt = select(StudentSubjectResult).where(
        StudentSubjectResult.enrollment_no == current_user.roll_no
    ).order_by(StudentSubjectResult.semester, StudentSubjectResult.id)
    subjects_res = await db.execute(subjects_stmt)
    subjects = as_list(subjects_res.scalars().all())

    summary_data = StudentResultSummaryOut(
        enrollment_no=safe_attr(summary, "enrollment_no"),
        sem1_gpa=serialize_numeric(safe_attr(summary, "sem1_gpa")),
        sem2_gpa=serialize_numeric(safe_attr(summary, "sem2_gpa")),
        sem3_gpa=serialize_numeric(safe_attr(summary, "sem3_gpa")),
        sem4_gpa=serialize_numeric(safe_attr(summary, "sem4_gpa")),
        sem5_gpa=serialize_numeric(safe_attr(summary, "sem5_gpa")),
        sem6_gpa=serialize_numeric(safe_attr(summary, "sem6_gpa")),
        sem7_gpa=serialize_numeric(safe_attr(summary, "sem7_gpa")),
        sem8_gpa=serialize_numeric(safe_attr(summary, "sem8_gpa")),
        cgpa=serialize_numeric(safe_attr(summary, "cgpa")),
    )

    subjects_data = [
        StudentSubjectResultOut(
            id=sub.id,
            semester=sub.semester or 0,
            subject_name=sub.subject_name or "",
            gpa=serialize_numeric(sub.gpa),
        )
        for sub in subjects
        if sub is not None and sub.id is not None
    ]

    return StudentResultsResponse(summary=summary_data, subject_results=subjects_data)
from pydantic import BaseModel

class GroupRequestCreate(BaseModel):
    name: str
    description: Optional[str] = None
    num_students: int


@router.post("/groups/request")
async def create_group_request(
    payload: GroupRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER))
):
    """
    Allows a teacher to submit a new B.Tech group request for admin approval.
    """
    req = GroupRequest(
        name=payload.name,
        description=payload.description,
        created_by_name=current_user.name,
        num_students=payload.num_students,
        status="PENDING"
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


@router.get("/groups/requests")
async def list_group_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches group requests with role-based visibility:
    - Teacher: sees only their own groups.
    - Admin: sees all groups, but is_member=True only for the permanent system group.
    - Student: forbidden.
    Each item includes `is_member` (bool) and `is_permanent` (bool) for the frontend.
    """
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(
            status_code=403,
            detail="Students are not authorized to view group requests."
        )

    stmt = select(GroupRequest).where(GroupRequest.status != "DELETED")
    if current_user.role == UserRole.TEACHER:
        # Teachers only see their own groups
        stmt = stmt.where(GroupRequest.created_by_name == current_user.name)

    stmt = stmt.order_by(GroupRequest.created_at.desc())
    res = await db.execute(stmt)
    groups = as_list(res.scalars().all())
    is_member = current_user.role == UserRole.TEACHER
    return [
        serialize_group_request(g, is_member=is_member)
        for g in groups
        if g is not None
    ]


@router.delete("/groups/{request_id}")
async def delete_group_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.TEACHER))
):
    """
    Soft-deletes a study group.
    Rules:
    - `is_permanent` groups (the Admin+Teachers system group) can NEVER be deleted by anyone.
    - Teachers may only delete groups they created.
    - Admins may delete any non-permanent group.
    """
    stmt = select(GroupRequest).where(GroupRequest.id == request_id)
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Study group not found.")

    # Hard block: permanent groups cannot be deleted by anyone
    if req.is_permanent:
        raise HTTPException(
            status_code=403,
            detail="This is a permanent system group and cannot be deleted."
        )

    # Teachers can only delete their own groups
    if current_user.role == UserRole.TEACHER and req.created_by_name != current_user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only delete study groups you created."
        )

    req.status = "DELETED"
    req.deleted_by_name = current_user.name
    req.deleted_at = datetime.utcnow()

    await db.commit()
    await db.refresh(req)
    return {"message": "Study group successfully deleted.", "id": req.id}


@router.get("/groups/deleted-logs")
async def get_deleted_group_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Admin-only endpoint to fetch logs of all deleted groups with timestamps.
    """
    stmt = select(GroupRequest).where(GroupRequest.status == "DELETED").order_by(GroupRequest.deleted_at.desc())
    res = await db.execute(stmt)
    logs = as_list(res.scalars().all())
    return [serialize_group_request(g) for g in logs if g is not None]


@router.post("/groups/requests/{request_id}/approve")
async def approve_group_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Allows an admin to approve a pending B.Tech group request.
    """
    stmt = select(GroupRequest).where(GroupRequest.id == request_id)
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    
    req.status = "APPROVED"
    await db.commit()
    await db.refresh(req)
    return req


@router.post("/groups/requests/{request_id}/reject")
async def reject_group_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Allows an admin to reject a pending B.Tech group request.
    """
    stmt = select(GroupRequest).where(GroupRequest.id == request_id)
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    
    req.status = "REJECTED"
    await db.commit()
    await db.refresh(req)
    return req



@router.get("/teachers", response_model=List[UserOut])
async def list_teachers(
    dept_id: Optional[int] = Query(None, description="Filter by department ID"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.TEACHER)),
):
    """Fetch all teachers with optional dept filter."""
    query = (
        select(User)
        .options(selectinload(User.department))
        .where(User.role == UserRole.TEACHER)
    )
    if dept_id is not None:
        query = query.where(User.dept_id == dept_id)
    result = await db.execute(query)
    teachers = as_list(result.scalars().all())
    return teachers


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(
        select(User).options(selectinload(User.department)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in (update_data or {}).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user, attribute_names=["department"])
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await db.delete(user)
    await db.commit()


@router.post("/{user_id}/reveal-password")
async def reveal_password(
    user_id: int,
    payload: RevealPasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Authenticate the Admin, then decrypt and return the target student's password."""
    # 1. Verify admin password
    if not _verify_password(payload.admin_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Incorrect admin password.",
        )

    # 2. Fetch target user
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Student not found.")

    if target_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only student passwords can be retrieved.",
        )

    # 3. Decrypt student password
    if not target_user.encrypted_password:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No reversible password stored for this student. Reset their password first.",
        )

    try:
        decrypted_pwd = _decrypt_password(target_user.encrypted_password)
        return {"password": decrypted_pwd}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt the password safely.",
        )


@router.post("/bulk", status_code=status.HTTP_200_OK)
async def bulk_operation(
    payload: BulkOperationRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """Execute high-speed bulk database operations inside a single transaction."""
    # 1. Determine target student IDs
    if payload.all_matching:
        query = select(User.id).where(User.role == UserRole.STUDENT)
        if payload.dept_id is not None:
            query = query.where(User.dept_id == payload.dept_id)
        if payload.semester is not None:
            query = query.where(User.semester == payload.semester)
        if payload.section is not None:
            query = query.where(User.section == payload.section)
        if payload.search:
            search_term = f"%{payload.search}%"
            query = query.where(
                User.name.ilike(search_term) |
                User.email.ilike(search_term) |
                User.roll_no.ilike(search_term)
            )
        result = await db.execute(query)
        target_ids = as_list(result.scalars().all())
    else:
        target_ids = as_list(payload.student_ids)

    if not target_ids:
        return {"message": "No students selected.", "count": 0}

    # 2. Perform bulk operation
    if payload.operation == "delete":
        stmt = delete(User).where(User.id.in_(target_ids))
        await db.execute(stmt)
    elif payload.operation == "change_dept":
        val = int(payload.value) if payload.value else None
        stmt = update(User).where(User.id.in_(target_ids)).values(dept_id=val)
        await db.execute(stmt)
    elif payload.operation == "change_sem":
        val = int(payload.value) if payload.value else None
        stmt = update(User).where(User.id.in_(target_ids)).values(semester=val)
        await db.execute(stmt)
    elif payload.operation == "change_sec":
        val = payload.value if payload.value else None
        stmt = update(User).where(User.id.in_(target_ids)).values(section=val)
        await db.execute(stmt)
    else:
        raise HTTPException(status_code=400, detail="Invalid bulk operation.")

    await db.commit()
    return {"message": "Bulk operation executed successfully.", "count": len(target_ids)}


# ── Departments ───────────────────────────────────────────────────────────────

@router.get("/departments/all", response_model=List[DepartmentOut], tags=["Departments"])
async def list_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department))
    return as_list(result.scalars().all())


@router.post(
    "/departments",
    response_model=DepartmentOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Departments"],
)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    dept = Department(name=payload.name, code=payload.code.upper())
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept
