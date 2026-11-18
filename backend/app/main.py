from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.audit import models as audit_models  # noqa: F401
from app.modules.iam import models as iam_models  # noqa: F401
from app.modules.iam.router import router as iam_router
from app.modules.iam.seed import ensure_base_seed
from app.modules.placement import models as placement_models  # noqa: F401
from app.modules.placement.router import router as placement_router
from app.modules.portal_state import models as portal_state_models  # noqa: F401
from app.modules.portal_state.router import router as portal_state_router
from app.modules.recruitment import models as recruitment_models  # noqa: F401
from app.modules.recruitment.router import router as recruitment_router
from app.modules.recruitment.seed import ensure_recruitment_seed
from app.modules.student import models as student_models  # noqa: F401
from app.modules.student.router import router as student_router
from app.modules.training import models as training_models  # noqa: F401
from app.modules.training.router import router as training_router
from app.modules.training.seed import ensure_training_seed
from app.shared.database import AsyncSessionLocal, Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await ensure_base_seed(session)
        await ensure_training_seed(session)
        await ensure_recruitment_seed(session)
        await session.commit()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.3.0",
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
app.include_router(training_router)
app.include_router(recruitment_router)
app.include_router(placement_router)
app.include_router(portal_state_router)


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "environment": settings.ENVIRONMENT}
