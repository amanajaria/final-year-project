import asyncio
import sys
import os
from sqlalchemy import text, select

# Add CWD to system path to ensure database and model imports work correctly
sys.path.append(os.getcwd())

from database import AsyncSessionLocal, engine
from models import User, UserRole
from auth.crypto import _encrypt_password

async def main():
    print("Starting database migration to add 'encrypted_password' column...")
    
    # 1. Run raw SQL to add column safely
    async with engine.begin() as conn:
        print("Checking/adding column 'encrypted_password' in 'users' table...")
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_password VARCHAR(500);"))
        print("Column verified/added successfully.")

    # 2. Backfill existing migrated users
    async with AsyncSessionLocal() as session:
        async with session.begin():
            print("\nBackfilling encrypted passwords for existing students and teachers...")
            
            # Query students who don't have encrypted password
            stmt_students = select(User).where(
                User.role == UserRole.STUDENT,
                User.encrypted_password == None
            )
            res_students = await session.execute(stmt_students)
            students = res_students.scalars().all()
            
            print(f"Found {len(students)} student records to backfill.")
            student_enc = _encrypt_password("Student@123")
            for s in students:
                s.encrypted_password = student_enc
            
            # Query teachers who don't have encrypted password
            stmt_teachers = select(User).where(
                User.role == UserRole.TEACHER,
                User.encrypted_password == None
            )
            res_teachers = await session.execute(stmt_teachers)
            teachers = res_teachers.scalars().all()
            
            print(f"Found {len(teachers)} teacher records to backfill.")
            teacher_enc = _encrypt_password("Teacher@123")
            for t in teachers:
                t.encrypted_password = teacher_enc

            # Query admin who doesn't have encrypted password
            stmt_admin = select(User).where(
                User.role == UserRole.ADMIN,
                User.encrypted_password == None
            )
            res_admin = await session.execute(stmt_admin)
            admins = res_admin.scalars().all()
            
            print(f"Found {len(admins)} admin records to backfill.")
            admin_enc = _encrypt_password("Admin@123")
            for a in admins:
                a.encrypted_password = admin_enc

            print("\nSaving changes to database...")
            
    print("Database migration and backfill completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
