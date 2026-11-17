import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.modules.iam.models import RoleName, User, UserRole
from app.shared.database import get_db

ALGORITHM = "HS256"
STUDENT_ALLOWED_DOMAINS = ("@ds.study.iitm.ac.in", "@es.study.iitm.ac.in")
BLOCKED_RECRUITER_DOMAINS = (
    "@gmail.com",
    "@yahoo.com",
    "@hotmail.com",
    "@outlook.com",
    "@icloud.com",
    "@protonmail.com",
)

bearer_scheme = HTTPBearer(auto_error=False)
_redis_client: Optional[Redis] = None


def get_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def validate_email_for_role(email: str, target_role: RoleName) -> None:
    normalized = email.strip().lower()
    if target_role == RoleName.STUDENT:
        if not normalized.endswith(STUDENT_ALLOWED_DOMAINS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student accounts require an official @ds.study.iitm.ac.in or @es.study.iitm.ac.in email.",
            )
    elif target_role == RoleName.RECRUITER:
        if normalized.endswith(BLOCKED_RECRUITER_DOMAINS) or normalized.endswith(STUDENT_ALLOWED_DOMAINS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Recruiter accounts must use an official corporate email domain.",
            )


def create_session_token(user_id: uuid.UUID, active_role: RoleName, session_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=12)
    payload = {
        "sub": str(user_id),
        "role": active_role.value,
        "sid": session_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


async def register_sliding_session(session_id: str, user_id: uuid.UUID) -> None:
    try:
        redis = get_redis()
        ttl_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        await redis.set(f"session:{session_id}", str(user_id), ex=ttl_seconds)
    except Exception:
        # Allow graceful fallback if Redis is unreachable in local dev
        pass


async def touch_sliding_session(session_id: str) -> bool:
    try:
        redis = get_redis()
        key = f"session:{session_id}"
        exists = await redis.exists(key)
        if not exists:
            return False
        await redis.expire(key, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        return True
    except Exception:
        return True


class CurrentPrincipal:
    def __init__(self, user: User, active_role: RoleName, all_roles: list[RoleName], session_id: str):
        self.user = user
        self.active_role = active_role
        self.all_roles = all_roles
        self.session_id = session_id


async def get_current_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentPrincipal:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication token")

    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = uuid.UUID(payload["sub"])
        active_role = RoleName(payload["role"])
        session_id = payload["sid"]
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    if not await touch_sliding_session(session_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired due to 30 minutes of inactivity. Please sign in again.",
        )

    stmt = (
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account inactive or not found")

    all_roles = [ur.role.name for ur in user.user_roles]
    if active_role not in all_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Active role not assigned to user")

    return CurrentPrincipal(user=user, active_role=active_role, all_roles=all_roles, session_id=session_id)


def require_roles(*allowed_roles: RoleName):
    async def _guard(principal: CurrentPrincipal = Depends(get_current_principal)) -> CurrentPrincipal:
        if principal.active_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {principal.active_role.value} is not authorized for this resource.",
            )
        return principal

    return _guard
