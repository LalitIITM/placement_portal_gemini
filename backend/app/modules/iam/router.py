import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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

SELF_REGISTERABLE_ROLES = {RoleName.STUDENT, RoleName.RECRUITER, RoleName.EXAMINER}


class LoginRequest(BaseModel):
    email: EmailStr
    full_name: str = "IITM Candidate"
    role: RoleName = RoleName.STUDENT


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    role: RoleName
    organization_or_dept: Optional[str] = Field(default=None, max_length=255)


class RegistrationDecisionRequest(BaseModel):
    decision: Literal["APPROVED", "REJECTED"]
    remarks: Optional[str] = None


class PendingRegistrationOut(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: RoleName
    organization_or_dept: Optional[str]
    approval_status: str
    is_active: bool
    created_at: datetime


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


@router.post("/auth/register", response_model=PendingRegistrationOut, status_code=status.HTTP_201_CREATED)
async def register_account(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> PendingRegistrationOut:
    """Registers a new STUDENT, RECRUITER, or EXAMINER account in PENDING state awaiting Admin approval."""
    if payload.role not in SELF_REGISTERABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator accounts cannot self-register. Contact Super Admin.",
        )

    validate_email_for_role(payload.email, payload.role)
    normalized_email = payload.email.strip().lower()

    existing = (await db.execute(select(User).where(User.email == normalized_email))).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account for {normalized_email} already exists (status: {existing.approval_status}).",
        )

    role_obj = (await db.execute(select(Role).where(Role.name == payload.role))).scalar_one_or_none()
    if role_obj is None:
        raise HTTPException(status_code=500, detail="System roles not initialized")

    user = User(
        email=normalized_email,
        full_name=payload.full_name.strip(),
        is_active=False,
        approval_status="PENDING",
        organization_or_dept=payload.organization_or_dept.strip() if payload.organization_or_dept else None,
    )
    db.add(user)
    await db.flush()
    db.add(UserRole(user_id=user.id, role_id=role_obj.id, is_primary=True))
    await db.flush()

    await record_audit_event(
        db,
        actor_id=user.id,
        actor_role=payload.role.value,
        action="REGISTRATION_SUBMITTED",
        entity_type="User",
        entity_id=str(user.id),
        after_state={
            "email": user.email,
            "role": payload.role.value,
            "approval_status": "PENDING",
            "organization_or_dept": user.organization_or_dept,
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return PendingRegistrationOut(
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=payload.role,
        organization_or_dept=user.organization_or_dept,
        approval_status=user.approval_status,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.get("/admin/registrations", response_model=list[PendingRegistrationOut])
async def list_registrations(
    status_filter: Optional[str] = None,
    _: CurrentPrincipal = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[PendingRegistrationOut]:
    stmt = (
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .order_by(User.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(User.approval_status == status_filter.upper())

    users = (await db.execute(stmt)).scalars().all()
    results: list[PendingRegistrationOut] = []
    for u in users:
        primary_role = u.user_roles[0].role.name if u.user_roles else RoleName.STUDENT
        results.append(
            PendingRegistrationOut(
                user_id=str(u.id),
                email=u.email,
                full_name=u.full_name,
                role=primary_role,
                organization_or_dept=u.organization_or_dept,
                approval_status=u.approval_status,
                is_active=u.is_active,
                created_at=u.created_at,
            )
        )
    return results


@router.post("/admin/registrations/{user_id}/decision", response_model=PendingRegistrationOut)
async def decide_registration(
    user_id: uuid.UUID,
    payload: RegistrationDecisionRequest,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> PendingRegistrationOut:
    stmt = (
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.id == user_id)
    )
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User registration not found")

    before = {"approval_status": user.approval_status, "is_active": user.is_active}
    user.approval_status = payload.decision
    user.is_active = payload.decision == "APPROVED"
    await db.flush()

    primary_role = user.user_roles[0].role.name if user.user_roles else RoleName.STUDENT
    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action=f"REGISTRATION_{payload.decision}",
        entity_type="User",
        entity_id=str(user.id),
        before_state=before,
        after_state={
            "approval_status": user.approval_status,
            "is_active": user.is_active,
            "remarks": payload.remarks,
        },
        ip_address=request.client.host if request.client else None,
    )

    return PendingRegistrationOut(
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=primary_role,
        organization_or_dept=user.organization_or_dept,
        approval_status=user.approval_status,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/auth/sso-login", response_model=AuthResponse)
async def sso_login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Authenticates approved users via domain-validated SSO and establishes a 30m sliding session."""
    validate_email_for_role(payload.email, payload.role)

    stmt = (
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.email == payload.email.lower())
    )
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user is None:
        if payload.role != RoleName.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found. Please switch to the Register (Sign Up) tab first.",
            )
        role_obj = (await db.execute(select(Role).where(Role.name == payload.role))).scalar_one_or_none()
        if role_obj is None:
            raise HTTPException(status_code=500, detail="System roles not initialized")

        user = User(
            email=payload.email.lower(),
            full_name=payload.full_name,
            is_active=True,
            approval_status="APPROVED",
        )
        db.add(user)
        await db.flush()
        db.add(UserRole(user_id=user.id, role_id=role_obj.id, is_primary=True))
        await db.flush()
        user = (await db.execute(stmt)).scalar_one()

    if user.approval_status == "PENDING" or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Your registration was rejected by Placement Admin."
                if user.approval_status == "REJECTED"
                else "Your registration is pending Placement Admin approval."
            ),
        )

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
