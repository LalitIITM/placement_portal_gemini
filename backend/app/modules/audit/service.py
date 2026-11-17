import uuid
from typing import Any, Optional

from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog


class ImmutableAuditError(Exception):
    """Raised if code attempts to mutate or delete an existing AuditLog row."""


@event.listens_for(AuditLog, "before_update")
def _prevent_audit_update(mapper: Any, connection: Any, target: AuditLog) -> None:
    raise ImmutableAuditError("AuditLog entries are strictly immutable and cannot be updated.")


@event.listens_for(AuditLog, "before_delete")
def _prevent_audit_delete(mapper: Any, connection: Any, target: AuditLog) -> None:
    raise ImmutableAuditError("AuditLog entries are strictly immutable and cannot be deleted.")


async def record_audit_event(
    db: AsyncSession,
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    actor_id: Optional[uuid.UUID] = None,
    actor_role: Optional[str] = None,
    before_state: Optional[dict[str, Any]] = None,
    after_state: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        before_state=before_state,
        after_state=after_state,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    await db.flush()
    return entry


async def list_audit_logs(
    db: AsyncSession, limit: int = 50, entity_type: Optional[str] = None
) -> list[AuditLog]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    result = await db.execute(stmt)
    return list(result.scalars().all())
