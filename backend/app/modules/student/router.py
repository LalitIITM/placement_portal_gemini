import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.audit.service import record_audit_event
from app.modules.iam.models import RoleName
from app.modules.iam.security import CurrentPrincipal, require_roles
from app.modules.student.models import (
    AcademicStanding,
    DegreeType,
    ProgramLevel,
    ProgramType,
    Resume,
    Student,
    StudentCategory,
    StudentProfile,
    StudentSkill,
    WorkDomain,
)
from app.shared.database import get_db

router = APIRouter(prefix="/api/v1/students", tags=["Student Core"])

MAX_ACTIVE_RESUMES = 3


class StudentRegistrationIn(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=160)
    cgpa: Decimal = Field(..., ge=Decimal("0.00"), le=Decimal("10.00"))
    gender: str = Field(..., min_length=1, max_length=32)
    mobile_number: str = Field(..., min_length=8, max_length=24)
    personal_email: str = Field(..., min_length=5, max_length=255)
    state: str = Field(..., min_length=2, max_length=100)
    category: StudentCategory
    degree_type: DegreeType
    is_working_professional: bool = False
    years_of_experience: Optional[Decimal] = Field(None, ge=Decimal("0.0"), le=Decimal("50.0"))
    work_domain: Optional[WorkDomain] = None
    present_company: Optional[str] = Field(None, max_length=160)
    work_location: Optional[str] = Field(None, max_length=120)
    current_ctc_lpa: Optional[Decimal] = Field(None, ge=Decimal("0.0"), le=Decimal("500.0"))

    @model_validator(mode="after")
    def validate_working_professional_fields(self) -> "StudentRegistrationIn":
        if self.is_working_professional:
            if self.years_of_experience is None:
                raise ValueError("years_of_experience is required when is_working_professional is True")
            if self.work_domain is None:
                raise ValueError("work_domain is required when is_working_professional is True")
            if not self.present_company or not self.present_company.strip():
                raise ValueError("present_company is required when is_working_professional is True")
            if not self.work_location or not self.work_location.strip():
                raise ValueError("work_location is required when is_working_professional is True")
            if self.current_ctc_lpa is None:
                raise ValueError("current_ctc_lpa is required when is_working_professional is True")
        return self


class ProfileUpdateIn(BaseModel):
    headline: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=24)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    github_url: Optional[str] = Field(None, max_length=255)
    linkedin_url: Optional[str] = Field(None, max_length=255)
    kaggle_url: Optional[str] = Field(None, max_length=255)
    portfolio_url: Optional[str] = Field(None, max_length=255)
    preferred_roles: Optional[str] = Field(None, max_length=255)
    preferred_locations: Optional[str] = Field(None, max_length=255)
    is_open_to_relocate: Optional[bool] = None


class MarksheetUploadIn(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    file_size_bytes: int = Field(..., gt=0, le=5 * 1024 * 1024)
    cgpa: Optional[Decimal] = Field(None, ge=Decimal("0.00"), le=Decimal("10.00"))


class SkillIn(BaseModel):
    skill_name: str = Field(..., min_length=1, max_length=80)
    proficiency: str = Field("INTERMEDIATE", max_length=32)


class ResumeCreateIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)
    file_name: str = Field(..., min_length=1, max_length=255)
    file_size_bytes: int = Field(..., gt=0, le=5 * 1024 * 1024)
    is_default: bool = False


class ResumeOut(BaseModel):
    id: str
    label: str
    file_name: str
    file_size_bytes: int
    is_default: bool
    uploaded_at: datetime


class StudentWorkspaceOut(BaseModel):
    id: str
    roll_number: str
    full_name: str
    email: str
    program: ProgramType
    degree_type: DegreeType
    current_level: ProgramLevel
    cgpa: Decimal
    active_backlogs: int
    academic_standing: AcademicStanding
    is_placed: bool
    graduation_year: int
    profile: dict
    skills: list[dict]
    resumes: list[ResumeOut]


async def _get_or_create_student(db: AsyncSession, principal: CurrentPrincipal) -> Student:
    stmt = (
        select(Student)
        .options(
            selectinload(Student.profile),
            selectinload(Student.skills),
            selectinload(Student.resumes),
        )
        .where(Student.user_id == principal.user.id)
    )
    student = (await db.execute(stmt)).scalar_one_or_none()
    if student is None:
        local_part = principal.user.email.split("@")[0].upper()
        if len(local_part) <= 12:
            prefix = local_part
        else:
            uid_suffix = str(principal.user.id).replace("-", "").upper()[:4]
            prefix = f"{local_part[:7]}_{uid_suffix}"
        
        prog = (
            ProgramType.BS_ELECTRONIC_SYSTEMS
            if principal.user.email.endswith("@es.study.iitm.ac.in")
            else ProgramType.BS_DATA_SCIENCE
        )
        student = Student(
            user_id=principal.user.id,
            roll_number=prefix,
            program=prog,
            degree_type=DegreeType.STANDALONE,
            current_level=ProgramLevel.DIPLOMA,
            cgpa=Decimal("8.25"),
            active_backlogs=0,
            graduation_year=2027,
        )
        db.add(student)
        await db.flush()
        db.add(StudentProfile(student_id=student.id))
        await db.flush()
        student = (await db.execute(stmt)).scalar_one()
    return student


def _serialize_workspace(student: Student, principal: CurrentPrincipal) -> StudentWorkspaceOut:
    p = student.profile
    active_resumes = [r for r in student.resumes if r.is_active]
    return StudentWorkspaceOut(
        id=str(student.id),
        roll_number=student.roll_number,
        full_name=principal.user.full_name,
        email=principal.user.email,
        program=student.program,
        degree_type=student.degree_type,
        current_level=student.current_level,
        cgpa=student.cgpa,
        active_backlogs=student.active_backlogs,
        academic_standing=student.academic_standing,
        is_placed=student.is_placed,
        graduation_year=student.graduation_year,
        profile={
            "headline": p.headline if p else None,
            "bio": p.bio if p else None,
            "gender": p.gender if p else None,
            "category": p.category.value if p else StudentCategory.GENERAL.value,
            "personal_email": p.personal_email if p else None,
            "phone": p.phone if p else None,
            "city": p.city if p else None,
            "state": p.state if p else None,
            "is_working_professional": p.is_working_professional if p else False,
            "years_of_experience": str(p.years_of_experience)
            if (p and p.years_of_experience is not None)
            else None,
            "work_domain": p.work_domain.value if (p and p.work_domain) else None,
            "present_company": p.present_company if p else None,
            "work_location": p.work_location if p else None,
            "current_ctc_lpa": str(p.current_ctc_lpa) if (p and p.current_ctc_lpa is not None) else None,
            "github_url": p.github_url if p else None,
            "linkedin_url": p.linkedin_url if p else None,
            "kaggle_url": p.kaggle_url if p else None,
            "portfolio_url": p.portfolio_url if p else None,
            "marksheet_file_name": p.marksheet_file_name if p else None,
            "marksheet_size_bytes": p.marksheet_size_bytes if p else None,
            "marksheet_uploaded_at": p.marksheet_uploaded_at.isoformat()
            if (p and p.marksheet_uploaded_at)
            else None,
            "preferred_roles": p.preferred_roles if p else None,
            "preferred_locations": p.preferred_locations if p else None,
            "is_open_to_relocate": p.is_open_to_relocate if p else True,
        },
        skills=[
            {
                "id": str(s.id),
                "skill_name": s.skill_name,
                "proficiency": s.proficiency,
                "is_verified": s.is_verified,
            }
            for s in student.skills
        ],
        resumes=[
            ResumeOut(
                id=str(r.id),
                label=r.label,
                file_name=r.file_name,
                file_size_bytes=r.file_size_bytes,
                is_default=r.is_default,
                uploaded_at=r.uploaded_at,
            )
            for r in active_resumes
        ],
    )


@router.get("/me", response_model=StudentWorkspaceOut)
async def get_my_student_workspace(
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> StudentWorkspaceOut:
    student = await _get_or_create_student(db, principal)
    return _serialize_workspace(student, principal)


@router.put("/me/registration", response_model=StudentWorkspaceOut)
async def submit_student_registration(
    payload: StudentRegistrationIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> StudentWorkspaceOut:
    """Captures complete student registration dossier including category, degree type & work experience."""
    student = await _get_or_create_student(db, principal)
    profile = student.profile
    if profile is None:
        profile = StudentProfile(student_id=student.id)
        db.add(profile)
        await db.flush()

    principal.user.full_name = payload.full_name.strip()
    student.cgpa = payload.cgpa
    student.degree_type = payload.degree_type

    profile.gender = payload.gender.strip()
    profile.phone = payload.mobile_number.strip()
    profile.personal_email = payload.personal_email.strip().lower()
    profile.state = payload.state.strip()
    profile.category = payload.category
    profile.is_working_professional = payload.is_working_professional
    if payload.is_working_professional:
        profile.years_of_experience = payload.years_of_experience
        profile.work_domain = payload.work_domain
        profile.present_company = payload.present_company.strip() if payload.present_company else None
        profile.work_location = payload.work_location.strip() if payload.work_location else None
        profile.current_ctc_lpa = payload.current_ctc_lpa
    else:
        profile.years_of_experience = None
        profile.work_domain = None
        profile.present_company = None
        profile.work_location = None
        profile.current_ctc_lpa = None

    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="STUDENT_REGISTRATION_SAVED",
        entity_type="Student",
        entity_id=str(student.id),
        after_state={
            "cgpa": str(student.cgpa),
            "category": profile.category.value,
            "degree_type": student.degree_type.value,
            "state": profile.state,
            "is_working_professional": profile.is_working_professional,
            "work_domain": profile.work_domain.value if profile.work_domain else None,
        },
        ip_address=request.client.host if request.client else None,
    )

    student = await _get_or_create_student(db, principal)
    return _serialize_workspace(student, principal)


@router.patch("/me/profile", response_model=StudentWorkspaceOut)
async def update_my_profile(
    payload: ProfileUpdateIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> StudentWorkspaceOut:
    student = await _get_or_create_student(db, principal)
    profile = student.profile
    if profile is None:
        profile = StudentProfile(student_id=student.id)
        db.add(profile)
        await db.flush()

    updates = payload.model_dump(exclude_unset=True)
    before = {k: getattr(profile, k) for k in updates}
    for k, v in updates.items():
        setattr(profile, k, v)
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="STUDENT_PROFILE_UPDATED",
        entity_type="StudentProfile",
        entity_id=str(profile.id),
        before_state=before,
        after_state=updates,
        ip_address=request.client.host if request.client else None,
    )

    student = await _get_or_create_student(db, principal)
    return _serialize_workspace(student, principal)


@router.post("/me/marksheet", response_model=StudentWorkspaceOut)
async def upload_bs_marksheet(
    payload: MarksheetUploadIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> StudentWorkspaceOut:
    if not payload.file_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF marksheets (.pdf) are supported.")

    student = await _get_or_create_student(db, principal)
    profile = student.profile
    if profile is None:
        profile = StudentProfile(student_id=student.id)
        db.add(profile)
        await db.flush()

    profile.marksheet_file_name = payload.file_name
    profile.marksheet_size_bytes = payload.file_size_bytes
    profile.marksheet_uploaded_at = datetime.now(timezone.utc)
    if payload.cgpa is not None:
        student.cgpa = payload.cgpa
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="MARKSHEET_UPLOADED",
        entity_type="StudentProfile",
        entity_id=str(profile.id),
        after_state={
            "file_name": payload.file_name,
            "cgpa": str(student.cgpa),
        },
        ip_address=request.client.host if request.client else None,
    )

    student = await _get_or_create_student(db, principal)
    return _serialize_workspace(student, principal)


@router.post("/me/skills", response_model=StudentWorkspaceOut)
async def add_student_skill(
    payload: SkillIn,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> StudentWorkspaceOut:
    student = await _get_or_create_student(db, principal)
    normalized = payload.skill_name.strip()
    if any(s.skill_name.lower() == normalized.lower() for s in student.skills):
        raise HTTPException(status_code=400, detail="Skill already exists on profile")

    db.add(StudentSkill(student_id=student.id, skill_name=normalized, proficiency=payload.proficiency))
    await db.flush()
    student = await _get_or_create_student(db, principal)
    return _serialize_workspace(student, principal)


@router.post("/me/resumes", response_model=StudentWorkspaceOut, status_code=status.HTTP_201_CREATED)
async def upload_resume_metadata(
    payload: ResumeCreateIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> StudentWorkspaceOut:
    """Enforces BRULE-55: A student may maintain at most 3 active resumes."""
    student = await _get_or_create_student(db, principal)
    active_resumes = [r for r in student.resumes if r.is_active]

    if len(active_resumes) >= MAX_ACTIVE_RESUMES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"BRULE-55: Maximum of {MAX_ACTIVE_RESUMES} active resumes reached. Archive an existing resume first.",
        )

    if payload.is_default or not active_resumes:
        for r in active_resumes:
            r.is_default = False
        make_default = True
    else:
        make_default = False

    storage_key = f"resumes/{student.id}/{uuid.uuid4()}-{payload.file_name}"
    resume = Resume(
        student_id=student.id,
        label=payload.label,
        file_name=payload.file_name,
        storage_key=storage_key,
        file_size_bytes=payload.file_size_bytes,
        is_default=make_default,
        is_active=True,
    )
    db.add(resume)
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="RESUME_UPLOADED",
        entity_type="Resume",
        entity_id=str(resume.id),
        after_state={"label": resume.label, "file_name": resume.file_name, "is_default": resume.is_default},
        ip_address=request.client.host if request.client else None,
    )

    student = await _get_or_create_student(db, principal)
    return _serialize_workspace(student, principal)


@router.delete("/me/resumes/{resume_id}", response_model=StudentWorkspaceOut)
async def archive_resume(
    resume_id: uuid.UUID,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> StudentWorkspaceOut:
    student = await _get_or_create_student(db, principal)
    target = next((r for r in student.resumes if r.id == resume_id and r.is_active), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Active resume not found")

    target.is_active = False
    was_default = target.is_default
    target.is_default = False

    remaining = [r for r in student.resumes if r.is_active and r.id != resume_id]
    if was_default and remaining:
        remaining[0].is_default = True

    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="RESUME_ARCHIVED",
        entity_type="Resume",
        entity_id=str(target.id),
        before_state={"is_active": True, "label": target.label},
        after_state={"is_active": False},
        ip_address=request.client.host if request.client else None,
    )

    student = await _get_or_create_student(db, principal)
    return _serialize_workspace(student, principal)
