from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "environment": settings.ENVIRONMENT}