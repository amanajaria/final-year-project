import asyncio
import os
import sys
from sqlalchemy import text
from database import engine

async def main():
    if len(sys.argv) < 2:
        print("Usage: python import_sql.py <path_to_sql_file>")
        print("Example: python import_sql.py seed_data.sql")
        return
        
    sql_path = sys.argv[1]
    if not os.path.exists(sql_path):
        print(f"Error: SQL file '{sql_path}' does not exist.")
        return

    print(f"Reading SQL statements from: {sql_path}...")
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Split statements by semicolon, keeping only non-empty statements
    statements = [stmt.strip() for stmt in sql_content.split(";") if stmt.strip()]

    print(f"Found {len(statements)} SQL statements to execute.")
    print("Connecting to database and executing...")

    try:
        async with engine.begin() as conn:
            for i, stmt in enumerate(statements, 1):
                # Print a small preview of the query
                preview = stmt.replace("\n", " ")[:60]
                print(f"Executing statement {i}/{len(statements)}: {preview}...")
                await conn.execute(text(stmt))
        print("\n🎉 SQL file imported successfully!")
    except Exception as e:
        print(f"\n❌ Error executing SQL statement: {e}")

if __name__ == "__main__":
    asyncio.run(main())
