import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.modules.audit.service import list_audit_logs, record_audit_event
from app.modules.iam.models import Role, RoleName, User, UserRole
from app.modules.iam.security import (
    CurrentPrincipal,
    create_session_token,
    get_current_principal,
    register_sliding_session,
    require_roles,
    validate_email_for_role,
)
from app.shared.database import get_db

router = APIRouter(prefix="/api/v1", tags=["IAM & Audit"])


class LoginRequest(BaseModel):
    email: EmailStr
    full_name: str = "IITM Candidate"
    role: RoleName = RoleName.STUDENT


class SwitchRoleRequest(BaseModel):
    target_role: RoleName


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    active_role: RoleName
    available_roles: list[RoleName]


class AuditLogOut(BaseModel):
    id: str
    actor_id: Optional[str]
    actor_role: Optional[str]
    action: str
    entity_type: str
    entity_id: str
    before_state: Optional[dict]
    after_state: Optional[dict]
    created_at: datetime


@router.post("/auth/sso-login", response_model=AuthResponse)
async def sso_login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Authenticates user via domain-validated SSO (or dev sandbox) and establishes a 30m sliding session."""
    validate_email_for_role(payload.email, payload.role)

    stmt = (
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.email == payload.email.lower())
    )
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user is None:
        role_obj = (await db.execute(select(Role).where(Role.name == payload.role))).scalar_one_or_none()
        if role_obj is None:
            raise HTTPException(status_code=500, detail="System roles not initialized")

        user = User(email=payload.email.lower(), full_name=payload.full_name, is_active=True)
        db.add(user)
        await db.flush()
        db.add(UserRole(user_id=user.id, role_id=role_obj.id, is_primary=True))
        await db.flush()

        user = (await db.execute(stmt)).scalar_one()

    available_roles = [ur.role.name for ur in user.user_roles]
    if payload.role not in available_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User does not hold role {payload.role.value}",
        )

    user.last_login_at = datetime.now(timezone.utc)
    session_id = str(uuid.uuid4())
    await register_sliding_session(session_id, user.id)
    token = create_session_token(user.id, payload.role, session_id)

    await record_audit_event(
        db,
        actor_id=user.id,
        actor_role=payload.role.value,
        action="USER_LOGIN",
        entity_type="User",
        entity_id=str(user.id),
        after_state={"email": user.email, "active_role": payload.role.value},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return AuthResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        active_role=payload.role,
        available_roles=available_roles,
    )


@router.post("/auth/switch-role", response_model=AuthResponse)
async def switch_role(
    payload: SwitchRoleRequest,
    request: Request,
    principal: CurrentPrincipal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    if payload.target_role not in principal.all_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role {payload.target_role.value} is not assigned to your account.",
        )

    previous_role = principal.active_role
    token = create_session_token(principal.user.id, payload.target_role, principal.session_id)

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=payload.target_role.value,
        action="ROLE_SWITCH",
        entity_type="User",
        entity_id=str(principal.user.id),
        before_state={"active_role": previous_role.value},
        after_state={"active_role": payload.target_role.value},
        ip_address=request.client.host if request.client else None,
    )

    return AuthResponse(
        access_token=token,
        user_id=str(principal.user.id),
        email=principal.user.email,
        full_name=principal.user.full_name,
        active_role=payload.target_role,
        available_roles=principal.all_roles,
    )


@router.get("/auth/me", response_model=AuthResponse)
async def get_me(principal: CurrentPrincipal = Depends(get_current_principal)) -> AuthResponse:
    token = create_session_token(principal.user.id, principal.active_role, principal.session_id)
    return AuthResponse(
        access_token=token,
        user_id=str(principal.user.id),
        email=principal.user.email,
        full_name=principal.user.full_name,
        active_role=principal.active_role,
        available_roles=principal.all_roles,
    )


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def get_audit_trail(
    limit: int = 50,
    entity_type: Optional[str] = None,
    _: CurrentPrincipal = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[AuditLogOut]:
    rows = await list_audit_logs(db, limit=min(limit, 200), entity_type=entity_type)
    return [
        AuditLogOut(
            id=str(r.id),
            actor_id=str(r.actor_id) if r.actor_id else None,
            actor_role=r.actor_role,
            action=r.action,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            before_state=r.before_state,
            after_state=r.after_state,
            created_at=r.created_at,
        )
        for r in rows
    ]
