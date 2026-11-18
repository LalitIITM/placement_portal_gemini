import uuid
from typing import Any, Optional

from sqlalchemy import Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base, TimestampMixin, generate_uuid


class StudentTrainingStageRecord(Base, TimestampMixin):
    __tablename__ = "student_training_stage_records"
    __table_args__ = (
        UniqueConstraint("student_roll", "stage_id", name="uq_student_roll_stage_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_roll: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    stage_id: Mapped[str] = mapped_column(String(16), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    stage_num: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evaluation_type: Mapped[str] = mapped_column(String(24), nullable=False)
    max_marks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_required: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    obtained_marks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    attempts_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    status_text: Mapped[str] = mapped_column(String(40), default="PENDING", nullable=False)


class ActivityPointSubmissionRecord(Base, TimestampMixin):
    __tablename__ = "activity_point_submission_records"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    student_name: Mapped[str] = mapped_column(String(160), nullable=False)
    student_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    activity_id: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    evidence_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    evidence_file_type: Mapped[str] = mapped_column(String(16), nullable=False)
    evidence_file_size: Mapped[str] = mapped_column(String(32), nullable=False)
    proof_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_date: Mapped[str] = mapped_column(String(20), nullable=False)
    review_status: Mapped[str] = mapped_column(String(32), default="PENDING_COORDINATOR", nullable=False)
    reviewer_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PortalStateSnapshot(Base, TimestampMixin):
    """Stores consolidated portal collections (registrations, jobs, applications, evaluations, audit logs)."""
    __tablename__ = "portal_state_snapshots"

    scope_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
