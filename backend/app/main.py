import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.logging_config import setup_logging
from app.routers import rooms

settings = get_settings()
setup_logging(settings.log_level)

logger = logging.getLogger("game.main")

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug("--> %s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.debug("<-- %s %s status=%d", request.method, request.url.path, response.status_code)
    return response


@app.get("/", include_in_schema=False)
async def root():
    # Chưa serve frontend tĩnh ở đây — tạm redirect sang Swagger UI cho dễ test.
    return RedirectResponse(url="/docs")


@app.get("/api/health")
async def health():
    return {"status": "ok", "wordbank_backend": settings.wordbank_backend}


@app.on_event("startup")
async def on_startup():
    logger.info("%s khởi động — wordbank_backend=%s log_level=%s",
                settings.app_name, settings.wordbank_backend, settings.log_level)