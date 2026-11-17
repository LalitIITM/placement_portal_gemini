from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.audit import models as audit_models  # noqa: F401
from app.modules.iam import models as iam_models  # noqa: F401
from app.modules.iam.router import router as iam_router
from app.modules.iam.seed import ensure_base_seed
from app.modules.student import models as student_models  # noqa: F401
from app.modules.student.router import router as student_router
from app.shared.database import AsyncSessionLocal, Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await ensure_base_seed(session)
        await session.commit()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(iam_router)
app.include_router(student_router)


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
