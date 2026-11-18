import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class InterviewRoundType(str, enum.Enum):
    TECHNICAL_1 = "TECHNICAL_1"
    TECHNICAL_2 = "TECHNICAL_2"
    MANAGERIAL = "MANAGERIAL"
    HR_FINAL = "HR_FINAL"


class InterviewMode(str, enum.Enum):
    ONLINE_MEET = "ONLINE_MEET"
    IN_PERSON = "IN_PERSON"


class InterviewStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    CONFIRMED = "CONFIRMED"
    PASSED = "PASSED"
    FAILED = "FAILED"
    NO_SHOW = "NO_SHOW"
    CANCELLED = "CANCELLED"


class OfferStatus(str, enum.Enum):
    ISSUED = "ISSUED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    REVOKED = "REVOKED"


class InterviewSchedule(Base):
    __tablename__ = "placement_interviews"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recruitment_applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recruitment_jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    round_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    round_type: Mapped[InterviewRoundType] = mapped_column(
        Enum(InterviewRoundType), default=InterviewRoundType.TECHNICAL_1, nullable=False
    )
    mode: Mapped[InterviewMode] = mapped_column(
        Enum(InterviewMode), default=InterviewMode.ONLINE_MEET, nullable=False
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    meeting_link_or_venue: Mapped[str] = mapped_column(String(255), nullable=False)
    panelist_name: Mapped[str] = mapped_column(String(140), nullable=False)
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus), default=InterviewStatus.SCHEDULED, nullable=False
    )
    interviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class OfferLetter(Base):
    __tablename__ = "placement_offers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    offer_code: Mapped[str] = mapped_column(String(48), unique=True, nullable=False, index=True)
    application_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recruitment_applications.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recruitment_jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_name: Mapped[str] = mapped_column(String(160), nullable=False)
    role_title: Mapped[str] = mapped_column(String(160), nullable=False)
    role_type: Mapped[str] = mapped_column(String(32), nullable=False)
    ctc_lpa: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    joining_date: Mapped[str] = mapped_column(String(32), nullable=False)
    offer_expires_at: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[OfferStatus] = mapped_column(
        Enum(OfferStatus), default=OfferStatus.ISSUED, nullable=False
    )
    student_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
