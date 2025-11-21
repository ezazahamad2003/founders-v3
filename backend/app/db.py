"""Database helpers and async SQLAlchemy session management."""

from collections.abc import AsyncIterator
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

settings = get_settings()


def _build_async_url(database_url: str) -> str:
    """Ensure the database URL uses the asyncpg driver."""
    if "+asyncpg" in database_url:
        return database_url
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return database_url


engine = create_async_engine(
    _build_async_url(settings.supabase_db_url),
    echo=False,
    future=True,
)

AsyncSessionFactory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Provide a database session for FastAPI dependencies."""
    async with AsyncSessionFactory() as session:
        yield session


async def db_ping(session: AsyncSession) -> Optional[bool]:
    """Run a lightweight query to ensure the DB connection is alive."""
    result = await session.execute(text("select 1"))
    return result.scalar_one_or_none() == 1

