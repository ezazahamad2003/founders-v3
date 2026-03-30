import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import chat, conversations, debate, docgen, files, health, user, profile_documents, lawyer_dashboard, password_reset


DEFAULT_LOCAL_ORIGINS = [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
]


def create_app() -> FastAPI:
    """Minimal app factory with router wiring; CORS/middleware will be added later."""
    settings = get_settings()
    is_production = settings.app_env == "production"
    application = FastAPI(
        title="Scopic Legal API",
        version="0.1.0",
        docs_url=None if is_production else "/docs",
        redoc_url=None if is_production else "/redoc",
    )

    # Configure CORS BEFORE adding routers
    origins = settings.allowed_origins_list()
    if not origins:
        origins = DEFAULT_LOCAL_ORIGINS
    elif not is_production:
        origins = list(set(origins + DEFAULT_LOCAL_ORIGINS))

    origin_regex = r"https://foundersllm-v3.*\.vercel\.app"
    
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add routers AFTER middleware
    application.include_router(health.router)
    application.include_router(user.router)
    application.include_router(conversations.router)
    application.include_router(files.router)
    application.include_router(profile_documents.router)
    application.include_router(chat.router)
    application.include_router(lawyer_dashboard.router)
    application.include_router(password_reset.router)
    application.include_router(debate.router)
    application.include_router(docgen.router)

    # Placeholder attribute to show settings were loaded (use later for logging)
    application.state.app_env = settings.app_env
    return application


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


app = create_app()

