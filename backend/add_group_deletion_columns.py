import asyncio
import sys
import os
from sqlalchemy import text

# Add CWD to system path to ensure database and model imports work correctly
sys.path.append(os.getcwd())

from database import engine

async def main():
    print("Starting database migration to add deletion columns to 'group_requests' table...")
    
    # Run raw SQL to add columns safely
    async with engine.begin() as conn:
        print("Checking/adding column 'deleted_by_name' in 'group_requests' table...")
        await conn.execute(text("ALTER TABLE group_requests ADD COLUMN IF NOT EXISTS deleted_by_name VARCHAR(150);"))
        
        print("Checking/adding column 'deleted_at' in 'group_requests' table...")
        await conn.execute(text("ALTER TABLE group_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;"))
        
        print("Columns verified/added successfully.")
        
    print("Database migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
