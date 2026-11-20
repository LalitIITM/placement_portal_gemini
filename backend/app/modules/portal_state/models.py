import uuid
from typing import Any, Optional

from sqlalchemy import Boolean, Float, Integer, String, Text, UniqueConstraint
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


class StudentProfileRecord(Base, TimestampMixin):
    """Normalized per-roll student career & academic profile (FR-03, ENT-05..09)."""
    __tablename__ = "student_profile_records"

    student_roll: Mapped[str] = mapped_column(String(32), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    iitm_email: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    personal_email: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    mobile_number: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    cgpa: Mapped[str] = mapped_column(String(16), default="8.20", nullable=False)
    active_backlogs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    program_level: Mapped[str] = mapped_column(String(24), default="BSC", nullable=False)
    degree_type: Mapped[str] = mapped_column(String(24), default="STANDALONE", nullable=False)
    applying_track: Mapped[str] = mapped_column(String(32), default="FULL_TIME", nullable=False)
    target_domain: Mapped[str] = mapped_column(String(40), default="DATA_SCIENCE", nullable=False)
    headline: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    github_url: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    linkedin_url: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    kaggle_url: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    portfolio_url: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    skills: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    projects: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    experiences: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    no_show_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class StudentResumeRecord(Base, TimestampMixin):
    """Normalized per-roll resume versions with max-3 rule (FR-03.3, BRULE-55, ENT-10)."""
    __tablename__ = "student_resume_records"

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    student_roll: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    target_role: Mapped[str] = mapped_column(String(120), nullable=False)
    drive_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[str] = mapped_column(String(32), nullable=False)
    updated_at_label: Mapped[str] = mapped_column(String(32), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class OneOnOneSlotRecordModel(Base, TimestampMixin):
    """Normalized 1-on-1 evaluation slots (FR-09, BRULE-19..23, ENT-23..24)."""
    __tablename__ = "one_on_one_slot_records"

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    student_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    student_name: Mapped[str] = mapped_column(String(160), nullable=False)
    date: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    slot_time: Mapped[str] = mapped_column(String(48), nullable=False)
    instructor: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="SCHEDULED", nullable=False)
    instructor_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_placement_ready: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    programming_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    data_science_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    communication_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    remedial_tasks: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    completed_at: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)


class PortalExaminerEvaluationRecord(Base, TimestampMixin):
    """Normalized examiner evaluation records (FR-11, BRULE-24..27, ENT-26)."""
    __tablename__ = "portal_examiner_evaluation_records"

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    student_roll: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    examiner_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    skillsets: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    programming_rating: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    data_science_rating: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    communication_rating: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_placement_ready: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    performing_exceptionally_good: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    remedial_tasks: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    evaluated_at: Mapped[str] = mapped_column(String(40), nullable=False)


class PortalJobApplicationRecord(Base, TimestampMixin):
    """Normalized ATS job application records (FR-18, BRULE-39..42, ENT-36..37)."""
    __tablename__ = "portal_job_application_records"
    __table_args__ = (
        UniqueConstraint("job_id", "student_roll", name="uq_portal_job_student_roll"),
    )

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(48), index=True, nullable=False)
    job_code: Mapped[str] = mapped_column(String(48), nullable=False)
    company_name: Mapped[str] = mapped_column(String(160), nullable=False)
    job_title: Mapped[str] = mapped_column(String(160), nullable=False)
    role_type: Mapped[str] = mapped_column(String(32), nullable=False)
    student_roll: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    student_name: Mapped[str] = mapped_column(String(160), nullable=False)
    student_cgpa: Mapped[str] = mapped_column(String(16), nullable=False)
    resume_title: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="APPLIED", nullable=False)
    applied_at: Mapped[str] = mapped_column(String(40), nullable=False)
    status_history: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)


class PortalInterviewRecord(Base, TimestampMixin):
    """Normalized interview schedule records (WF-10, INT-09)."""
    __tablename__ = "portal_interview_records"

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    application_id: Mapped[str] = mapped_column(String(48), index=True, nullable=False)
    student_roll: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    student_name: Mapped[str] = mapped_column(String(160), nullable=False)
    company_name: Mapped[str] = mapped_column(String(160), nullable=False)
    job_title: Mapped[str] = mapped_column(String(160), nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    round_type: Mapped[str] = mapped_column(String(32), nullable=False)
    mode: Mapped[str] = mapped_column(String(24), default="ONLINE_MEET", nullable=False)
    scheduled_at: Mapped[str] = mapped_column(String(48), nullable=False)
    meeting_link: Mapped[str] = mapped_column(Text, default="", nullable=False)
    panelist_name: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="SCHEDULED", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PortalOfferLetterRecord(Base, TimestampMixin):
    """Normalized offer letter & joining verification records (FR-19, BRULE-43..50, ENT-39..41)."""
    __tablename__ = "portal_offer_letter_records"

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    offer_code: Mapped[str] = mapped_column(String(48), unique=True, nullable=False)
    application_id: Mapped[str] = mapped_column(String(48), index=True, nullable=False)
    student_roll: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    student_name: Mapped[str] = mapped_column(String(160), nullable=False)
    company_name: Mapped[str] = mapped_column(String(160), nullable=False)
    role_title: Mapped[str] = mapped_column(String(160), nullable=False)
    role_type: Mapped[str] = mapped_column(String(32), nullable=False)
    ctc_lpa: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    joining_date: Mapped[str] = mapped_column(String(32), nullable=False)
    expires_at: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="ISSUED", nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    joining_proof_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_verified_by_cell: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class HelpdeskTicketRecord(Base, TimestampMixin):
    """Normalized support ticket workflow (FR-23, WF-13, ENT-47..48)."""
    __tablename__ = "helpdesk_ticket_records"

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    ticket_number: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    raised_by_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    raised_by_name: Mapped[str] = mapped_column(String(160), nullable=False)
    raised_by_role: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str] = mapped_column(String(32), default="PLACEMENT", nullable=False)
    priority: Mapped[str] = mapped_column(String(16), default="MEDIUM", nullable=False)
    subject: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="OPEN", nullable=False)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    escalation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)


class PortalStateSnapshot(Base, TimestampMixin):
    """Stores supplementary configuration & marksheet metadata."""
    __tablename__ = "portal_state_snapshots"

    scope_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
