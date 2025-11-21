from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", include_in_schema=False)
async def healthcheck() -> dict[str, str]:
    """Basic health endpoint."""
    return {"status": "ok"}

