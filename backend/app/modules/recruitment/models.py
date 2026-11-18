import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base, TimestampMixin, generate_uuid


class JobRoleType(str, enum.Enum):
    INTERNSHIP = "INTERNSHIP"
    FULL_TIME = "FULL_TIME"


class JobDomain(str, enum.Enum):
    DATA_SCIENCE = "DATA_SCIENCE"
    SOFTWARE_DEVELOPMENT = "SOFTWARE_DEVELOPMENT"


class JobStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    OFFERED = "OFFERED"
    OFFER_ACCEPTED = "OFFER_ACCEPTED"
    REJECTED = "REJECTED"


class JobPosting(Base, TimestampMixin):
    __tablename__ = "recruitment_jobs"
    __table_args__ = (
        CheckConstraint("min_cgpa >= 0.00 AND min_cgpa <= 10.00", name="ck_job_min_cgpa"),
        CheckConstraint("max_active_backlogs >= 0", name="ck_job_max_backlogs"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    job_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    company_name: Mapped[str] = mapped_column(String(160), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    role_type: Mapped[JobRoleType] = mapped_column(
        Enum(JobRoleType, name="job_role_type_enum"), nullable=False
    )
    domain: Mapped[JobDomain] = mapped_column(
        Enum(JobDomain, name="job_domain_enum"), nullable=False
    )
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    compensation_label: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    min_cgpa: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("7.00"), nullable=False)
    max_active_backlogs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    allowed_levels: Mapped[list[str]] = mapped_column(
        JSONB, default=lambda: ["DIPLOMA", "BSC", "BS"], nullable=False
    )
    require_placement_readiness: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    required_skill_tags: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status_enum"), default=JobStatus.OPEN, nullable=False
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    applications: Mapped[list["JobApplication"]] = relationship(
        "JobApplication", back_populates="job", cascade="all, delete-orphan"
    )


class JobApplication(Base, TimestampMixin):
    __tablename__ = "recruitment_applications"
    __table_args__ = (
        UniqueConstraint("student_id", "job_id", name="uq_student_job_application"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("recruitment_jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    resume_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True
    )
    cover_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="application_status_enum"),
        default=ApplicationStatus.APPLIED,
        nullable=False,
    )
    recruiter_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    job: Mapped["JobPosting"] = relationship("JobPosting", back_populates="applications")
