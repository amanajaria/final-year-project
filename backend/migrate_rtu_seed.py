import asyncio
import sys
import bcrypt
from sqlalchemy import select, text
from models import User, UserRole, Department
from database import AsyncSessionLocal

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def make_short_code(branch_name: str) -> str:
    mapping = {
        "Computer Science Engineering": "CSE",
        "Electronics & Communication Engineering": "ECE",
        "Mechanical Engineering": "MECH",
        "Electrical Engineering": "EE",
        "Civil Engineering": "CIVIL",
        "Agriculture Engineering": "AGRI-ENG",
        "Printing Engineering": "PRINT-ENG",
        "CSE-Core": "CSE-CORE",
        "CSE-AI": "CSE-AI",
        "CSE-Cybersecurity": "CSE-CYBER",
        "CE": "CIVIL",
        "ECE": "ECE",
        "ME": "MECH",
        "EE": "EE",
    }
    if branch_name in mapping:
        return mapping[branch_name]
    return branch_name[:20].upper()

async def main():
    print("Starting migration of synthetic RTU-style B.Tech dataset...")
    
    # Pre-calculating hashes keeps the script execution fast
    print("Pre-calculating bcrypt password hashes...")
    teacher_hash = _hash_password("Teacher@123")
    student_hash = _hash_password("Student@123")
    print("Hashes pre-calculated successfully.")

    async with AsyncSessionLocal() as session:
        async with session.begin():
            # 1. Migrate Branches to Departments
            print("\nMigrating branches to departments...")
            res = await session.execute(text("SELECT id, name FROM branches"))
            raw_branches = res.fetchall()
            
            dept_map = {}
            for b_id, name in raw_branches:
                short_code = make_short_code(name)
                # Check if department already exists by code
                stmt = select(Department).where(Department.code == short_code)
                d_res = await session.execute(stmt)
                dept = d_res.scalar_one_or_none()
                if not dept:
                    dept = Department(name=name, code=short_code)
                    session.add(dept)
                    await session.flush()
                    print(f"Created Department: {name} (Code: {short_code})")
                else:
                    print(f"Department exists: {name} (Code: {short_code})")
                dept_map[name] = dept.id

            # 2. Migrate Teachers to Users
            print("\nMigrating teachers to users...")
            res = await session.execute(text("SELECT id, name, branch, email FROM teachers"))
            raw_teachers = res.fetchall()
            
            for t_id, name, branch, email in raw_teachers:
                stmt = select(User).where(User.email == email)
                u_res = await session.execute(stmt)
                user = u_res.scalar_one_or_none()
                if not user:
                    user = User(
                        name=name,
                        email=email,
                        hashed_password=teacher_hash,
                        role=UserRole.TEACHER,
                        dept_id=dept_map.get(branch),
                        is_active=True
                    )
                    session.add(user)
                    print(f"Migrated Teacher: {name} ({email})")
                else:
                    print(f"Teacher already exists: {name}")

            # 3. Migrate Students to Users
            print("\nMigrating students to users...")
            res = await session.execute(text("SELECT id, enrollment_no, name, branch, semester FROM students"))
            raw_students = res.fetchall()
            
            print(f"Found {len(raw_students)} student records to migrate.")
            
            for i, (s_id, roll_no, name, branch, sem) in enumerate(raw_students, 1):
                email = f"{roll_no.lower()}@college.edu"
                
                stmt = select(User).where(User.email == email)
                u_res = await session.execute(stmt)
                user = u_res.scalar_one_or_none()
                if not user:
                    user = User(
                        name=name,
                        email=email,
                        hashed_password=student_hash,
                        role=UserRole.STUDENT,
                        dept_id=dept_map.get(branch),
                        semester=sem,
                        section="A",
                        roll_no=roll_no,
                        is_active=True
                    )
                    session.add(user)
                if i % 100 == 0 or i == len(raw_students):
                    print(f"Processed {i}/{len(raw_students)} students...")
                    
    print("\nMigration completed successfully! All seeded branches, teachers, and students are now live in the ERP system.")

if __name__ == "__main__":
    asyncio.run(main())
