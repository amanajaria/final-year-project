from database import engine
import asyncio

async def check():
    async with engine.connect() as conn:
        r1 = await conn.exec_driver_sql(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='notes'"
        )
        notes_exists = r1.scalar()

        r2 = await conn.exec_driver_sql(
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users' AND column_name='encrypted_password'"
        )
        enc_exists = r2.scalar()

        r3 = await conn.exec_driver_sql(
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='group_requests' AND column_name='is_permanent'"
        )
        perm_exists = r3.scalar()

        print(f"notes table exists:          {bool(notes_exists)}")
        print(f"encrypted_password exists:   {bool(enc_exists)}")
        print(f"is_permanent column exists:  {bool(perm_exists)}")
    await engine.dispose()

asyncio.run(check())
