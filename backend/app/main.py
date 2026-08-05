from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.routers import rooms

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router)


@app.get("/", include_in_schema=False)
async def root():
    # Chưa serve frontend tĩnh ở đây — tạm redirect sang Swagger UI cho dễ test.
    return RedirectResponse(url="/docs")


@app.get("/api/health")
async def health():
    return {"status": "ok", "wordbank_backend": settings.wordbank_backend}