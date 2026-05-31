"""
models.py — SQLAlchemy ORM models (fully normalised relational schema).
"""
import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Enum, ForeignKey, DateTime, Date,
    UniqueConstraint, Boolean, Text, Numeric,
)
from sqlalchemy.orm import relationship
from database import Base


# ── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"


# ── Department ──────────────────────────────────────────────────────────────

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    code = Column(String(20), nullable=False, unique=True)

    users = relationship("User", back_populates="department")
    schedules = relationship("CourseSchedule", back_populates="department")


# ── User ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    encrypted_password = Column(String(500), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    dept_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    semester = Column(Integer, nullable=True)   # for students
    section = Column(String(10), nullable=True)  # for students
    roll_no = Column(String(50), nullable=True, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="users")
    taught_schedules = relationship("CourseSchedule", back_populates="teacher")
    attendance_logs = relationship(
        "AttendanceLog",
        foreign_keys="AttendanceLog.student_id",
        back_populates="student",
    )
    marked_attendances = relationship(
        "AttendanceLog",
        foreign_keys="AttendanceLog.marked_by_teacher_id",
        back_populates="marked_by",
    )


# ── Course Schedule ──────────────────────────────────────────────────────────

class CourseSchedule(Base):
    __tablename__ = "course_schedules"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dept_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    subject_name = Column(String(200), nullable=False)
    subject_code = Column(String(30), nullable=False)
    semester = Column(Integer, nullable=False)
    section = Column(String(10), nullable=False)
    time_slot = Column(String(60), nullable=False)  # e.g. "MON 09:00-10:00"

    teacher = relationship("User", back_populates="taught_schedules")
    department = relationship("Department", back_populates="schedules")
    attendance_logs = relationship("AttendanceLog", back_populates="schedule")

    __table_args__ = (
        UniqueConstraint(
            "subject_code", "semester", "section", "dept_id",
            name="uq_schedule_class",
        ),
    )


# ── Attendance Log ───────────────────────────────────────────────────────────

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("course_schedules.id"), nullable=False)
    date = Column(Date, nullable=False, default=date.today)
    status = Column(Enum(AttendanceStatus), nullable=False)
    marked_by_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship(
        "User",
        foreign_keys=[student_id],
        back_populates="attendance_logs",
    )
    schedule = relationship("CourseSchedule", back_populates="attendance_logs")
    marked_by = relationship(
        "User",
        foreign_keys=[marked_by_teacher_id],
        back_populates="marked_attendances",
    )

    __table_args__ = (
        UniqueConstraint(
            "student_id", "schedule_id", "date",
            name="uq_attendance_per_day",
        ),
    )


# ── Announcement ────────────────────────────────────────────────────────────

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    body = Column(Text, nullable=False)
    posted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_dept_id = Column(Integer, ForeignKey("departments.id"), nullable=True)  # None = global
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Student Results ─────────────────────────────────────────────────────────

class StudentResult(Base):
    __tablename__ = "student_results"

    enrollment_no = Column(String(50), primary_key=True, index=True)
    sem1_gpa = Column(Numeric(4, 2), nullable=True)
    sem2_gpa = Column(Numeric(4, 2), nullable=True)
    sem3_gpa = Column(Numeric(4, 2), nullable=True)
    sem4_gpa = Column(Numeric(4, 2), nullable=True)
    sem5_gpa = Column(Numeric(4, 2), nullable=True)
    sem6_gpa = Column(Numeric(4, 2), nullable=True)
    sem7_gpa = Column(Numeric(4, 2), nullable=True)
    sem8_gpa = Column(Numeric(4, 2), nullable=True)
    cgpa = Column(Numeric(4, 2), nullable=True)

    subject_results = relationship("StudentSubjectResult", back_populates="student_result", cascade="all, delete-orphan")


class StudentSubjectResult(Base):
    __tablename__ = "student_subject_results"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_no = Column(String(50), ForeignKey("student_results.enrollment_no", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    subject_name = Column(String(150), nullable=False)
    gpa = Column(Numeric(4, 2), nullable=False)

    student_result = relationship("StudentResult", back_populates="subject_results")

    __table_args__ = (
        UniqueConstraint(
            "enrollment_no", "semester", "subject_name",
            name="uq_student_subject_sem",
        ),
    )


class GroupRequest(Base):
    __tablename__ = "group_requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    created_by_name = Column(String(150), nullable=False)
    num_students = Column(Integer, nullable=False)
    status = Column(String(30), default="PENDING")
    is_permanent = Column(Boolean, nullable=False, default=False)  # True = undeletable system group
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_by_name = Column(String(150), nullable=True)
    deleted_at = Column(DateTime, nullable=True)


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    category = Column(String(100), nullable=False, default="General")
    content = Column(Text, nullable=False)
    is_public = Column(Boolean, nullable=False, default=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by_id])


