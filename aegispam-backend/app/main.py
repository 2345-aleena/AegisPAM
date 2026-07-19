import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.database import Base, engine
from app.models import User, Resource, AccessRequest, Session, Secret, AuditLog, RotationHistory  # noqa: F401
from app.routes import auth, resources, access_requests, sessions, secrets, rotation, dashboard, audit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aegispam")

app = FastAPI(
    title="AegisPAM",
    description="A Privileged Access Management (PAM) simulator: just-in-time access, "
                 "an encrypted secret vault, credential rotation, rule-based risk scoring, "
                 "and an immutable audit trail.",
    version="1.0.0",
)

# Tables are created automatically on startup for local/demo use.
# In a real production deployment this would be replaced by Alembic
# migrations so schema changes are versioned and reversible.
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- Reliability: consistent, predictable error responses ----------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": errors})


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


# ---------------- Routers ----------------

app.include_router(auth.router)
app.include_router(resources.router)
app.include_router(access_requests.router)
app.include_router(sessions.router)
app.include_router(secrets.router)
app.include_router(rotation.router)
app.include_router(dashboard.router)
app.include_router(audit.router)


@app.get("/", tags=["Health"])
def root():
    return {"message": "AegisPAM API is running.", "docs": "/docs"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
