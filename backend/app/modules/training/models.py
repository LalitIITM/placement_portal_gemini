import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base, generate_uuid


class Course(Base):
    __tablename__ = "training_courses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    skill_tag: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    pass_threshold_pct: Mapped[int] = mapped_column(Integer, default=75, nullable=False)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=1800, nullable=False)
    questions_json: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    modules: Mapped[list["CourseModule"]] = relationship(
        back_populates="course", cascade="all, delete-orphan", order_by="CourseModule.sequence_order"
    )


class CourseModule(Base):
    __tablename__ = "training_modules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_courses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)

    course: Mapped["Course"] = relationship(back_populates="modules")


class ModuleProgress(Base):
    __tablename__ = "training_module_progress"
    __table_args__ = (UniqueConstraint("student_id", "module_id", name="uq_student_module_progress"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    module_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_modules.id", ondelete="CASCADE"), index=True, nullable=False
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class QuizAttempt(Base):
    __tablename__ = "training_quiz_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_courses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    score_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    termination_reason: Mapped[str] = mapped_column(String(40), default="NORMAL", nullable=False)
    elapsed_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class SkillBadge(Base):
    __tablename__ = "training_skill_badges"
    __table_args__ = (UniqueConstraint("student_id", "course_id", name="uq_student_course_badge"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_courses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    verification_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False)
    score_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ExaminerEvaluation(Base):
    """Final stage viva/interview assessment by a placement examiner."""
    __tablename__ = "training_examiner_evaluations"
    __table_args__ = (
        CheckConstraint("programming_rating >= 1 AND programming_rating <= 5", name="ck_eval_prog_rating"),
        CheckConstraint("data_science_rating >= 1 AND data_science_rating <= 5", name="ck_eval_ds_rating"),
        CheckConstraint("communication_rating >= 1 AND communication_rating <= 5", name="ck_eval_comm_rating"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    examiner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    examiner_email: Mapped[str] = mapped_column(String(255), nullable=False)
    skillsets_observed: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    programming_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    data_science_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    communication_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    is_placement_ready: Mapped[bool] = mapped_column(Boolean, nullable=False)
    performing_exceptionally_good: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    remedial_tasks: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    examiner_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
