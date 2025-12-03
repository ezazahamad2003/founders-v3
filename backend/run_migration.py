"""Run database migration to add openai_file_id column."""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings


async def run_migration():
    """Run the migration to add openai_file_id column."""
    settings = get_settings()
    
    # Convert postgresql:// to postgresql+asyncpg://
    db_url = settings.supabase_db_url_clean
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    engine = create_async_engine(db_url, echo=True)
    
    # Read migration file
    migration_file = Path(__file__).parent / "db" / "migrations" / "002_add_openai_file_id.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)
    
    migration_sql = migration_file.read_text()
    
    print("🔄 Running migration: 002_add_openai_file_id.sql")
    print(f"📄 SQL:\n{migration_sql}\n")
    
    try:
        async with engine.begin() as conn:
            # Split by semicolon and execute each statement
            statements = [s.strip() for s in migration_sql.split(";") if s.strip()]
            
            for stmt in statements:
                print(f"Executing: {stmt[:100]}...")
                await conn.execute(text(stmt))
            
            print("✅ Migration completed successfully!")
            
            # Verify the column was added
            result = await conn.execute(
                text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'files' 
                    ORDER BY ordinal_position
                """)
            )
            
            print("\n📋 Current 'files' table schema:")
            for row in result:
                print(f"  - {row[0]}: {row[1]}")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())
