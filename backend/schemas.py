"""
schemas.py — Pydantic v2 request / response models for every endpoint.
"""
from __future__ import annotations
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from models import UserRole, AttendanceStatus


# ── Shared Config ────────────────────────────────────────────────────────────

class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Department ────────────────────────────────────────────────────────────────

class DepartmentOut(ORMBase):
    id: int
    name: str
    code: str


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    code: str = Field(..., min_length=2, max_length=20)


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.STUDENT
    dept_id: Optional[int] = None
    semester: Optional[int] = Field(None, ge=1, le=10)
    section: Optional[str] = Field(None, max_length=10)
    roll_no: Optional[str] = Field(None, max_length=50)


class RevealPasswordRequest(BaseModel):
    admin_password: str


class BulkOperationRequest(BaseModel):
    student_ids: List[int] = Field(default_factory=list)
    all_matching: bool = False
    dept_id: Optional[int] = None
    semester: Optional[int] = None
    section: Optional[str] = None
    search: Optional[str] = None
    operation: str
    value: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    name: str


# ── User / Student ────────────────────────────────────────────────────────────

class UserOut(ORMBase):
    id: int
    name: str
    email: str
    role: UserRole
    dept_id: Optional[int]
    semester: Optional[int]
    section: Optional[str]
    roll_no: Optional[str]
    is_active: bool
    created_at: datetime
    department: Optional[DepartmentOut] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    dept_id: Optional[int] = None
    semester: Optional[int] = Field(None, ge=1, le=10)
    section: Optional[str] = Field(None, max_length=10)
    roll_no: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


# ── Course Schedule ───────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    teacher_id: int
    dept_id: int
    subject_name: str = Field(..., min_length=2, max_length=200)
    subject_code: str = Field(..., min_length=2, max_length=30)
    semester: int = Field(..., ge=1, le=10)
    section: str = Field(..., max_length=10)
    time_slot: str = Field(..., max_length=60)


class ScheduleOut(ORMBase):
    id: int
    teacher_id: int
    dept_id: int
    subject_name: str
    subject_code: str
    semester: int
    section: str
    time_slot: str
    department: Optional[DepartmentOut] = None


# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceEntry(BaseModel):
    student_id: int
    status: AttendanceStatus


class AttendanceBulkSubmit(BaseModel):
    schedule_id: int
    date: date
    entries: List[AttendanceEntry] = Field(..., min_length=1)


class AttendanceLogOut(ORMBase):
    id: int
    student_id: int
    schedule_id: int
    date: date
    status: AttendanceStatus
    marked_by_teacher_id: int
    created_at: datetime


class AttendanceSummary(BaseModel):
    student_id: int
    name: str
    roll_no: Optional[str]
    total_classes: int
    present: int
    absent: int
    percentage: float


# ── Announcements ─────────────────────────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    body: str = Field(..., min_length=5)
    target_dept_id: Optional[int] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=300)
    body: Optional[str] = Field(None, min_length=5)
    target_dept_id: Optional[int] = None


class AnnouncementOut(ORMBase):
    id: int
    title: str
    body: str
    posted_by: int
    target_dept_id: Optional[int]
    created_at: datetime
    updated_at: datetime


# ── Generic Responses ─────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str

class PaginatedStudents(BaseModel):
    total: int = 0
    students: List[UserOut] = Field(default_factory=list)


class StudentSubjectResultOut(BaseModel):
    id: int
    semester: int
    subject_name: str
    gpa: Optional[float] = None


class StudentResultSummaryOut(BaseModel):
    enrollment_no: Optional[str] = None
    sem1_gpa: Optional[float] = None
    sem2_gpa: Optional[float] = None
    sem3_gpa: Optional[float] = None
    sem4_gpa: Optional[float] = None
    sem5_gpa: Optional[float] = None
    sem6_gpa: Optional[float] = None
    sem7_gpa: Optional[float] = None
    sem8_gpa: Optional[float] = None
    cgpa: Optional[float] = None


class StudentResultsResponse(BaseModel):
    summary: Optional[StudentResultSummaryOut] = None
    subject_results: List[StudentSubjectResultOut] = Field(default_factory=list)


# ── Notes ─────────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    category: str = Field("General", min_length=1, max_length=100)
    content: str
    is_public: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    content: Optional[str] = None
    is_public: Optional[bool] = None


class NoteOut(ORMBase):
    id: int
    title: str
    category: str
    content: str
    is_public: bool
    created_by_id: int
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

