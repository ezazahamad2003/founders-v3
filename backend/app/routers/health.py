import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.db import get_db_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health", include_in_schema=False)
async def healthcheck():
    """Health endpoint that verifies database connectivity."""
    try:
        async for session in get_db_session():
            await session.execute(text("SELECT 1"))
            return {"status": "ok", "db": "ok"}
    except Exception as e:
        logger.error("Health check DB probe failed: %s", e)
        return JSONResponse({"status": "degraded", "db": "error"}, status_code=503)

