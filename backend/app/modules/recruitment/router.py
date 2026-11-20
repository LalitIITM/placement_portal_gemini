import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.service import record_audit_event
from app.modules.iam.models import RoleName, User
from app.modules.iam.security import CurrentPrincipal, require_roles
from app.modules.recruitment.models import (
    ApplicationStatus,
    JobApplication,
    JobDomain,
    JobPosting,
    JobRoleType,
    JobStatus,
)
from app.modules.student.models import AcademicStanding, Resume, Student
from app.modules.student.router import _get_or_create_student
from app.modules.training.models import ExaminerEvaluation, SkillBadge
from app.shared.database import get_db

router = APIRouter(prefix="/api/v1/recruitment", tags=["Recruitment & Eligibility Engine"])


class JobCreateIn(BaseModel):
    job_code: str = Field(..., min_length=3, max_length=32)
    company_name: str = Field(..., min_length=2, max_length=160)
    title: str = Field(..., min_length=3, max_length=200)
    role_type: JobRoleType
    domain: JobDomain
    location: str = Field(..., min_length=2, max_length=120)
    compensation_label: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=10)
    min_cgpa: Decimal = Field(default=Decimal("7.00"), ge=Decimal("0.00"), le=Decimal("10.00"))
    max_active_backlogs: int = Field(default=0, ge=0, le=10)
    allowed_levels: list[str] = Field(default_factory=lambda: ["DIPLOMA", "BSC", "BS"])
    require_placement_readiness: bool = False
    required_skill_tags: list[str] = Field(default_factory=list)


class JobUpdateIn(BaseModel):
    company_name: Optional[str] = Field(default=None, min_length=2, max_length=160)
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    role_type: Optional[JobRoleType] = None
    domain: Optional[JobDomain] = None
    location: Optional[str] = Field(default=None, min_length=2, max_length=120)
    compensation_label: Optional[str] = Field(default=None, min_length=2, max_length=100)
    description: Optional[str] = None
    min_cgpa: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"), le=Decimal("10.00"))
    max_active_backlogs: Optional[int] = Field(default=None, ge=0, le=10)
    status: Optional[JobStatus] = None


class EligibilityCheckOut(BaseModel):
    eligible: bool
    reasons: list[str]


class JobOut(BaseModel):
    id: str
    job_code: str
    company_name: str
    title: str
    role_type: JobRoleType
    domain: JobDomain
    location: str
    compensation_label: str
    description: str
    min_cgpa: Decimal
    max_active_backlogs: int
    allowed_levels: list[str]
    require_placement_readiness: bool
    required_skill_tags: list[str]
    status: JobStatus
    eligibility: Optional[EligibilityCheckOut] = None
    already_applied: bool = False
    application_status: Optional[ApplicationStatus] = None


class JobApplyIn(BaseModel):
    resume_id: Optional[uuid.UUID] = None
    cover_note: Optional[str] = Field(None, max_length=1000)


class ApplicationStatusUpdateIn(BaseModel):
    status: ApplicationStatus
    recruiter_remarks: Optional[str] = Field(None, max_length=500)


class ApplicationOut(BaseModel):
    id: str
    job_id: str
    job_code: str
    company_name: str
    job_title: str
    role_type: JobRoleType
    student_roll_number: str
    student_name: str
    student_cgpa: Decimal
    resume_file_name: Optional[str]
    status: ApplicationStatus
    recruiter_remarks: Optional[str]
    applied_at: datetime


def evaluate_student_eligibility(
    student: Student,
    job: JobPosting,
    *,
    is_examiner_ready: bool,
    verified_badges: set[str],
) -> EligibilityCheckOut:
    """Enforces BRULE-21 through BRULE-25 deterministically."""
    reasons: list[str] = []

    if job.status != JobStatus.OPEN:
        reasons.append("Drive is closed for new applications.")

    # BRULE-21: Already placed students cannot apply for additional full-time roles
    if student.is_placed and job.role_type == JobRoleType.FULL_TIME:
        reasons.append("BRULE-21: Student already holds an accepted full-time placement offer.")

    # BRULE-22: Academic standing must be GOOD_STANDING
    if student.academic_standing != AcademicStanding.GOOD_STANDING:
        reasons.append(
            f"BRULE-22: Academic standing is {student.academic_standing.value} (GOOD_STANDING required)."
        )

    # BRULE-23: CGPA & Active Backlogs check
    if student.cgpa < job.min_cgpa:
        reasons.append(
            f"BRULE-23: Minimum CGPA {job.min_cgpa} required (current CGPA: {student.cgpa})."
        )
    if student.active_backlogs > job.max_active_backlogs:
        reasons.append(
            f"BRULE-23: Maximum {job.max_active_backlogs} active backlogs allowed (current: {student.active_backlogs})."
        )

    # BRULE-24: Program level check
    if job.allowed_levels and student.current_level.value not in job.allowed_levels:
        reasons.append(
            f"BRULE-24: Eligible levels {job.allowed_levels} (current level: {student.current_level.value})."
        )

    # BRULE-25: Final Examiner Interview Readiness & Verified Skill Badges
    if job.require_placement_readiness and not is_examiner_ready:
        reasons.append(
            "BRULE-25: Requires 'Placement Ready' sign-off from Final Stage Examiner Interview."
        )

    missing_badges = [tag for tag in job.required_skill_tags if tag not in verified_badges]
    if missing_badges:
        reasons.append(
            f"BRULE-25: Missing verified training badge(s): {', '.join(missing_badges)}."
        )

    return EligibilityCheckOut(eligible=len(reasons) == 0, reasons=reasons)


async def _get_student_readiness_context(
    db: AsyncSession, student_id: uuid.UUID
) -> tuple[bool, set[str]]:
    latest_eval = (
        await db.execute(
            select(ExaminerEvaluation)
            .where(ExaminerEvaluation.student_id == student_id)
            .order_by(ExaminerEvaluation.evaluated_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    is_ready = bool(latest_eval and latest_eval.is_placement_ready)

    badges = (
        await db.execute(
            select(SkillBadge.skill_name).where(SkillBadge.student_id == student_id)
        )
    ).scalars().all()
    return is_ready, set(badges)


@router.get("/jobs", response_model=list[JobOut])
async def list_jobs_with_eligibility(
    principal: CurrentPrincipal = Depends(
        require_roles(RoleName.STUDENT, RoleName.RECRUITER, RoleName.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
) -> list[JobOut]:
    jobs = (
        await db.execute(select(JobPosting).order_by(JobPosting.created_at.desc()))
    ).scalars().all()

    student: Optional[Student] = None
    is_ready = False
    verified_badges: set[str] = set()
    app_by_job: dict[uuid.UUID, JobApplication] = {}

    if principal.active_role == RoleName.STUDENT:
        student = await _get_or_create_student(db, principal)
        is_ready, verified_badges = await _get_student_readiness_context(db, student.id)
        apps = (
            await db.execute(
                select(JobApplication).where(JobApplication.student_id == student.id)
            )
        ).scalars().all()
        app_by_job = {a.job_id: a for a in apps}

    result: list[JobOut] = []
    for j in jobs:
        elig = (
            evaluate_student_eligibility(
                student, j, is_examiner_ready=is_ready, verified_badges=verified_badges
            )
            if student is not None
            else None
        )
        existing_app = app_by_job.get(j.id)
        result.append(
            JobOut(
                id=str(j.id),
                job_code=j.job_code,
                company_name=j.company_name,
                title=j.title,
                role_type=j.role_type,
                domain=j.domain,
                location=j.location,
                compensation_label=j.compensation_label,
                description=j.description,
                min_cgpa=j.min_cgpa,
                max_active_backlogs=j.max_active_backlogs,
                allowed_levels=j.allowed_levels,
                require_placement_readiness=j.require_placement_readiness,
                required_skill_tags=j.required_skill_tags,
                status=j.status,
                eligibility=elig,
                already_applied=existing_app is not None,
                application_status=existing_app.status if existing_app else None,
            )
        )
    return result


@router.post("/jobs", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job_posting(
    payload: JobCreateIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.RECRUITER, RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> JobOut:
    code = payload.job_code.strip().upper()
    dup = (
        await db.execute(select(JobPosting).where(JobPosting.job_code == code))
    ).scalar_one_or_none()
    if dup is not None:
        raise HTTPException(status_code=409, detail=f"Job code '{code}' already exists.")

    job = JobPosting(
        job_code=code,
        company_name=payload.company_name.strip(),
        title=payload.title.strip(),
        role_type=payload.role_type,
        domain=payload.domain,
        location=payload.location.strip(),
        compensation_label=payload.compensation_label.strip(),
        description=payload.description.strip(),
        min_cgpa=payload.min_cgpa,
        max_active_backlogs=payload.max_active_backlogs,
        allowed_levels=[lvl.strip().upper() for lvl in payload.allowed_levels],
        require_placement_readiness=payload.require_placement_readiness,
        required_skill_tags=[t.strip() for t in payload.required_skill_tags if t.strip()],
        status=JobStatus.OPEN,
        created_by=principal.user.id,
    )
    db.add(job)
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="JOB_POSTING_CREATED",
        entity_type="JobPosting",
        entity_id=str(job.id),
        after_state={
            "job_code": job.job_code,
            "company_name": job.company_name,
            "min_cgpa": str(job.min_cgpa),
            "role_type": job.role_type.value,
        },
        ip_address=request.client.host if request.client else None,
    )

    return JobOut(
        id=str(job.id),
        job_code=job.job_code,
        company_name=job.company_name,
        title=job.title,
        role_type=job.role_type,
        domain=job.domain,
        location=job.location,
        compensation_label=job.compensation_label,
        description=job.description,
        min_cgpa=job.min_cgpa,
        max_active_backlogs=job.max_active_backlogs,
        allowed_levels=job.allowed_levels,
        require_placement_readiness=job.require_placement_readiness,
        required_skill_tags=job.required_skill_tags,
        status=job.status,
    )


@router.patch("/jobs/{job_id}", response_model=JobOut)
async def update_job_posting(
    job_id: uuid.UUID,
    payload: JobUpdateIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.RECRUITER, RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> JobOut:
    job = (await db.execute(select(JobPosting).where(JobPosting.id == job_id))).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job posting not found")

    before = {
        "company_name": job.company_name,
        "title": job.title,
        "role_type": job.role_type.value,
        "domain": job.domain.value,
        "compensation_label": job.compensation_label,
        "min_cgpa": str(job.min_cgpa),
        "status": job.status.value,
    }

    if payload.company_name is not None:
        job.company_name = payload.company_name.strip()
    if payload.title is not None:
        job.title = payload.title.strip()
    if payload.role_type is not None:
        job.role_type = payload.role_type
    if payload.domain is not None:
        job.domain = payload.domain
    if payload.location is not None:
        job.location = payload.location.strip()
    if payload.compensation_label is not None:
        job.compensation_label = payload.compensation_label.strip()
    if payload.description is not None:
        job.description = payload.description.strip()
    if payload.min_cgpa is not None:
        job.min_cgpa = payload.min_cgpa
    if payload.max_active_backlogs is not None:
        job.max_active_backlogs = payload.max_active_backlogs
    if payload.status is not None:
        job.status = payload.status

    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="ADMIN_DRIVE_UPDATED",
        entity_type="JobPosting",
        entity_id=str(job.id),
        before_state=before,
        after_state={
            "company_name": job.company_name,
            "title": job.title,
            "role_type": job.role_type.value,
            "domain": job.domain.value,
            "compensation_label": job.compensation_label,
            "min_cgpa": str(job.min_cgpa),
            "status": job.status.value,
        },
        ip_address=request.client.host if request.client else None,
    )

    return JobOut(
        id=str(job.id),
        job_code=job.job_code,
        company_name=job.company_name,
        title=job.title,
        role_type=job.role_type,
        domain=job.domain,
        location=job.location,
        compensation_label=job.compensation_label,
        description=job.description,
        min_cgpa=job.min_cgpa,
        max_active_backlogs=job.max_active_backlogs,
        allowed_levels=job.allowed_levels,
        require_placement_readiness=job.require_placement_readiness,
        required_skill_tags=job.required_skill_tags,
        status=job.status,
        eligibility=None,
        already_applied=False,
        application_status=None,
    )


@router.delete("/jobs/{job_id}", status_code=status.HTTP_200_OK)
async def delete_job_posting(
    job_id: uuid.UUID,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    job = (await db.execute(select(JobPosting).where(JobPosting.id == job_id))).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job posting not found")

    snapshot = {
        "job_code": job.job_code,
        "company_name": job.company_name,
        "title": job.title,
    }
    await db.delete(job)
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="ADMIN_DRIVE_DELETED",
        entity_type="JobPosting",
        entity_id=str(job_id),
        before_state=snapshot,
        ip_address=request.client.host if request.client else None,
    )
    return {"status": "deleted", "job_id": str(job_id)}


@router.post(
    "/jobs/{job_id}/apply",
    response_model=ApplicationOut,
    status_code=status.HTTP_201_CREATED,
)
async def apply_to_job(
    job_id: uuid.UUID,
    payload: JobApplyIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> ApplicationOut:
    student = await _get_or_create_student(db, principal)
    job = (
        await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job posting not found")

    existing = (
        await db.execute(
            select(JobApplication).where(
                JobApplication.student_id == student.id,
                JobApplication.job_id == job.id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate application: You have already applied to this drive.",
        )

    is_ready, verified_badges = await _get_student_readiness_context(db, student.id)
    elig = evaluate_student_eligibility(
        student, job, is_examiner_ready=is_ready, verified_badges=verified_badges
    )
    if not elig.eligible:
        await record_audit_event(
            db,
            actor_id=principal.user.id,
            actor_role=principal.active_role.value,
            action="APPLICATION_ELIGIBILITY_BLOCKED",
            entity_type="JobPosting",
            entity_id=str(job.id),
            after_state={"job_code": job.job_code, "reasons": elig.reasons},
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Student does not satisfy job eligibility rules.", "reasons": elig.reasons},
        )

    active_resumes = [r for r in student.resumes if r.is_active]
    chosen_resume: Optional[Resume] = None
    if payload.resume_id is not None:
        chosen_resume = next((r for r in active_resumes if r.id == payload.resume_id), None)
        if chosen_resume is None:
            raise HTTPException(status_code=400, detail="Selected resume not found in active vault.")
    elif active_resumes:
        chosen_resume = next((r for r in active_resumes if r.is_default), active_resumes[0])

    app_row = JobApplication(
        job_id=job.id,
        student_id=student.id,
        resume_id=chosen_resume.id if chosen_resume else None,
        cover_note=payload.cover_note.strip() if payload.cover_note else None,
        status=ApplicationStatus.APPLIED,
    )
    db.add(app_row)
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="JOB_APPLICATION_SUBMITTED",
        entity_type="JobApplication",
        entity_id=str(app_row.id),
        after_state={
            "job_code": job.job_code,
            "company_name": job.company_name,
            "resume": chosen_resume.file_name if chosen_resume else None,
        },
        ip_address=request.client.host if request.client else None,
    )

    return ApplicationOut(
        id=str(app_row.id),
        job_id=str(job.id),
        job_code=job.job_code,
        company_name=job.company_name,
        job_title=job.title,
        role_type=job.role_type,
        student_roll_number=student.roll_number,
        student_name=principal.user.full_name,
        student_cgpa=student.cgpa,
        resume_file_name=chosen_resume.file_name if chosen_resume else None,
        status=app_row.status,
        recruiter_remarks=app_row.recruiter_remarks,
        applied_at=app_row.applied_at,
    )


@router.get("/applications", response_model=list[ApplicationOut])
async def list_applications(
    principal: CurrentPrincipal = Depends(
        require_roles(RoleName.STUDENT, RoleName.RECRUITER, RoleName.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
) -> list[ApplicationOut]:
    stmt = (
        select(JobApplication, JobPosting, Student, User, Resume)
        .join(JobPosting, JobApplication.job_id == JobPosting.id)
        .join(Student, JobApplication.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .outerjoin(Resume, JobApplication.resume_id == Resume.id)
        .order_by(JobApplication.applied_at.desc())
    )
    if principal.active_role == RoleName.STUDENT:
        student = await _get_or_create_student(db, principal)
        stmt = stmt.where(JobApplication.student_id == student.id)

    rows = (await db.execute(stmt)).all()
    return [
        ApplicationOut(
            id=str(app_row.id),
            job_id=str(job.id),
            job_code=job.job_code,
            company_name=job.company_name,
            job_title=job.title,
            role_type=job.role_type,
            student_roll_number=stu.roll_number,
            student_name=usr.full_name,
            student_cgpa=stu.cgpa,
            resume_file_name=res.file_name if res else None,
            status=app_row.status,
            recruiter_remarks=app_row.recruiter_remarks,
            applied_at=app_row.applied_at,
        )
        for app_row, job, stu, usr, res in rows
    ]


@router.patch("/applications/{application_id}/status", response_model=ApplicationOut)
async def update_application_status(
    application_id: uuid.UUID,
    payload: ApplicationStatusUpdateIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.RECRUITER, RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> ApplicationOut:
    row = (
        await db.execute(
            select(JobApplication, JobPosting, Student, User, Resume)
            .join(JobPosting, JobApplication.job_id == JobPosting.id)
            .join(Student, JobApplication.student_id == Student.id)
            .join(User, Student.user_id == User.id)
            .outerjoin(Resume, JobApplication.resume_id == Resume.id)
            .where(JobApplication.id == application_id)
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Job application not found")

    app_row, job, stu, usr, res = row
    prev_status = app_row.status
    app_row.status = payload.status
    if payload.recruiter_remarks is not None:
        app_row.recruiter_remarks = payload.recruiter_remarks.strip()

    # BRULE-21: Accepting a FULL_TIME offer locks student placement status
    if payload.status == ApplicationStatus.OFFER_ACCEPTED and job.role_type == JobRoleType.FULL_TIME:
        stu.is_placed = True

    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="APPLICATION_STATUS_UPDATED",
        entity_type="JobApplication",
        entity_id=str(app_row.id),
        before_state={"status": prev_status.value},
        after_state={
            "status": app_row.status.value,
            "job_code": job.job_code,
            "student_roll_number": stu.roll_number,
            "student_is_placed": stu.is_placed,
        },
        ip_address=request.client.host if request.client else None,
    )

    return ApplicationOut(
        id=str(app_row.id),
        job_id=str(job.id),
        job_code=job.job_code,
        company_name=job.company_name,
        job_title=job.title,
        role_type=job.role_type,
        student_roll_number=stu.roll_number,
        student_name=usr.full_name,
        student_cgpa=stu.cgpa,
        resume_file_name=res.file_name if res else None,
        status=app_row.status,
        recruiter_remarks=app_row.recruiter_remarks,
        applied_at=app_row.applied_at,
    )
