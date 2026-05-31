"""
main.py — FastAPI application factory with CORS, router registration,
and automatic table creation on startup.
"""
from contextlib import asynccontextmanager
import os
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError

from database import engine, Base
import models  # noqa: F401 — ensures all models are registered before create_all

from auth.routes import router as auth_router
from routers.users import router as users_router
from routers.attendance import router as attendance_router
from routers.announcements import router as announcements_router
from routers.notes import router as notes_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("college_erp")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all tables on startup (Alembic handles migrations in production)."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        logger.error("Startup table sync skipped (database may be unavailable): %s", exc)
    yield
    await engine.dispose()


app = FastAPI(
    title="College ERP API",
    description=(
        "Backend engine for the College ERP system. "
        "Supports JWT-RBAC for Admin, Teacher, and Student roles. "
        "Visit /docs for interactive Swagger UI."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── Exception Handlers ────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Gracefully handles invalid payload structures without causing unhandled backend crashes."""
    logger.warning(f"Validation failure on {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "message": "The request body failed data validation.",
            "error_type": "ValidationError"
        }
    )

@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Gracefully catches SQLAlchemy exceptions to prevent raw database details leaks or worker failure."""
    logger.error("Database error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "A database access or connection failure occurred.",
            "message": "Internal Database Error",
            "error_type": "DatabaseError",
        },
    )


@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Preserve intentional HTTP status codes (404, 403, etc.)."""
    detail = exc.detail if isinstance(exc.detail, str) else exc.detail
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": detail,
            "message": detail if isinstance(detail, str) else "Request failed.",
            "error_type": "HTTPException",
        },
    )


@app.exception_handler(HTTPException)
async def fastapi_http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    response = JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": detail,
            "message": detail if isinstance(detail, str) else "Request failed.",
            "error_type": "HTTPException",
        },
    )
    if exc.headers:
        for key, value in exc.headers.items():
            response.headers[key] = value
    return response


@app.exception_handler(Exception)
async def global_generic_exception_handler(request: Request, exc: Exception):
    """Catch-all: log server-side, return structured JSON — worker stays alive for demo."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected server error occurred. Please try again.",
            "message": "Internal Server Error",
            "error_type": "UnhandledException",
        },
    )


def _build_cors_origins() -> list[str]:
    """Local dev origins + deployed frontend (Vercel / custom domain)."""
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "exp://localhost:8081",
    ]
    for key in ("FRONTEND_URL", "VERCEL_URL"):
        raw = os.getenv(key)
        if not raw:
            continue
        raw = raw.strip().rstrip("/")
        if raw.startswith("http"):
            origins.append(raw)
        else:
            origins.append(f"https://{raw}")
    # De-duplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for origin in origins:
        if origin not in seen:
            seen.add(origin)
            unique.append(origin)
    return unique


allowed_origins = _build_cors_origins()
logger.info("CORS allowed origins: %s", allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(attendance_router)
app.include_router(announcements_router)
app.include_router(notes_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "College ERP API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    # Bind to PORT environment variable dynamically (fallback to 8000 for local development)
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server in dynamic port binding mode on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
