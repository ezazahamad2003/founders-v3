import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import chat, conversations, files, health, user


DEFAULT_LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]


def create_app() -> FastAPI:
    """Minimal app factory with router wiring; CORS/middleware will be added later."""
    settings = get_settings()
    application = FastAPI(
        title="Scopic Legal API",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    application.include_router(health.router)
    application.include_router(user.router)
    application.include_router(conversations.router)
    application.include_router(files.router)
    application.include_router(chat.router)

    origins = settings.allowed_origins_list()
    if not origins:
        origins = DEFAULT_LOCAL_ORIGINS

    # Add regex pattern for all Vercel preview URLs
    # Matches: founders-v3.vercel.app, founders-v3-*.vercel.app, founders-v3-*-projects.vercel.app
    origin_regex = r"https://founders-v3[a-z0-9\-]*\.vercel\.app"
    
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Placeholder attribute to show settings were loaded (use later for logging)
    application.state.app_env = settings.app_env
    return application


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


app = create_app()

