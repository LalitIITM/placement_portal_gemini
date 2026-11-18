import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base, TimestampMixin, generate_uuid


class ProgramType(str, enum.Enum):
    BS_DATA_SCIENCE = "BS_DATA_SCIENCE"
    BS_ELECTRONIC_SYSTEMS = "BS_ELECTRONIC_SYSTEMS"


class ProgramLevel(str, enum.Enum):
    FOUNDATION = "FOUNDATION"
    DIPLOMA = "DIPLOMA"
    BSC = "BSC"
    BS = "BS"


class AcademicStanding(str, enum.Enum):
    GOOD_STANDING = "GOOD_STANDING"
    PROBATION = "PROBATION"
    DEBARRED = "DEBARRED"


class StudentCategory(str, enum.Enum):
    GENERAL = "GENERAL"
    OBC = "OBC"
    OBC_NCL = "OBC_NCL"
    SC_ST = "SC_ST"


class DegreeType(str, enum.Enum):
    STANDALONE = "STANDALONE"
    DUAL_DEGREE = "DUAL_DEGREE"


class WorkDomain(str, enum.Enum):
    DATA_SCIENCE = "DATA_SCIENCE"
    SOFTWARE_DEVELOPMENT = "SOFTWARE_DEVELOPMENT"
    OTHERS = "OTHERS"


class Student(Base, TimestampMixin):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint("cgpa >= 0.00 AND cgpa <= 10.00", name="ck_student_cgpa_range"),
        CheckConstraint("active_backlogs >= 0", name="ck_student_non_negative_backlogs"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    roll_number: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    program: Mapped[ProgramType] = mapped_column(
        Enum(ProgramType, name="program_type_enum"), nullable=False
    )
    degree_type: Mapped[DegreeType] = mapped_column(
        Enum(DegreeType, name="degree_type_enum"), default=DegreeType.STANDALONE, nullable=False
    )
    current_level: Mapped[ProgramLevel] = mapped_column(
        Enum(ProgramLevel, name="program_level_enum"), default=ProgramLevel.FOUNDATION, nullable=False
    )
    cgpa: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0.00"), nullable=False)
    active_backlogs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    academic_standing: Mapped[AcademicStanding] = mapped_column(
        Enum(AcademicStanding, name="academic_standing_enum"),
        default=AcademicStanding.GOOD_STANDING,
        nullable=False,
    )
    is_placed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    graduation_year: Mapped[int] = mapped_column(Integer, nullable=False)

    profile: Mapped[Optional["StudentProfile"]] = relationship(
        "StudentProfile", back_populates="student", uselist=False, cascade="all, delete-orphan"
    )
    skills: Mapped[list["StudentSkill"]] = relationship(
        "StudentSkill", back_populates="student", cascade="all, delete-orphan"
    )
    projects: Mapped[list["StudentProject"]] = relationship(
        "StudentProject", back_populates="student", cascade="all, delete-orphan"
    )
    experiences: Mapped[list["StudentExperience"]] = relationship(
        "StudentExperience", back_populates="student", cascade="all, delete-orphan"
    )
    resumes: Mapped[list["Resume"]] = relationship(
        "Resume", back_populates="student", cascade="all, delete-orphan"
    )


class StudentProfile(Base, TimestampMixin):
    __tablename__ = "student_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    headline: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    category: Mapped[StudentCategory] = mapped_column(
        Enum(StudentCategory, name="student_category_enum"),
        default=StudentCategory.GENERAL,
        nullable=False,
    )
    personal_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(24), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_working_professional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    years_of_experience: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1), nullable=True)
    work_domain: Mapped[Optional[WorkDomain]] = mapped_column(
        Enum(WorkDomain, name="work_domain_enum"), nullable=True
    )
    present_company: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    github_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    kaggle_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    marksheet_file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    marksheet_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    marksheet_uploaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    preferred_roles: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    preferred_locations: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_open_to_relocate: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    student: Mapped["Student"] = relationship("Student", back_populates="profile")


class StudentSkill(Base):
    __tablename__ = "student_skills"
    __table_args__ = (UniqueConstraint("student_id", "skill_name", name="uq_student_skill"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    skill_name: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    proficiency: Mapped[str] = mapped_column(String(32), default="INTERMEDIATE", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    student: Mapped["Student"] = relationship("Student", back_populates="skills")


class StudentProject(Base, TimestampMixin):
    __tablename__ = "student_projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tech_stack: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    repo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    live_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    student: Mapped["Student"] = relationship("Student", back_populates="projects")


class StudentExperience(Base, TimestampMixin):
    __tablename__ = "student_experiences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    organization: Mapped[str] = mapped_column(String(160), nullable=False)
    role_title: Mapped[str] = mapped_column(String(160), nullable=False)
    experience_type: Mapped[str] = mapped_column(String(40), default="INTERNSHIP", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    student: Mapped["Student"] = relationship("Student", back_populates="experiences")


class Resume(Base, TimestampMixin):
    """BRULE-55: Max 3 active resumes per student (enforced in service + DB trigger)."""
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/pdf", nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student: Mapped["Student"] = relationship("Student", back_populates="resumes")
