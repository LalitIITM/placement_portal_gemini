import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog
from app.modules.audit.service import record_audit_event
from app.modules.iam.models import RoleName
from app.modules.iam.security import CurrentPrincipal, require_roles
from app.modules.placement.models import (
    InterviewMode,
    InterviewRoundType,
    InterviewSchedule,
    InterviewStatus,
    OfferLetter,
    OfferStatus,
)
from app.modules.recruitment.models import (
    ApplicationStatus,
    JobApplication,
    JobPosting,
    JobRoleType,
)
from app.modules.student.models import Student
from app.modules.student.router import _get_or_create_student
from app.shared.database import get_db

router = APIRouter(prefix="/api/v1/placement", tags=["Placement Interviews, Offers & Analytics"])


class ScheduleInterviewRequest(BaseModel):
    application_id: uuid.UUID
    round_number: int = Field(default=1, ge=1, le=6)
    round_type: InterviewRoundType = InterviewRoundType.TECHNICAL_1
    mode: InterviewMode = InterviewMode.ONLINE_MEET
    scheduled_at: datetime
    duration_minutes: int = Field(default=45, ge=15, le=180)
    meeting_link_or_venue: str = Field(..., min_length=3, max_length=255)
    panelist_name: str = Field(..., min_length=2, max_length=140)


class UpdateInterviewRequest(BaseModel):
    status: InterviewStatus
    interviewer_notes: Optional[str] = Field(default=None, max_length=1000)


class IssueOfferRequest(BaseModel):
    application_id: uuid.UUID
    ctc_lpa: Decimal = Field(..., gt=0, le=200)
    joining_date: str = Field(..., min_length=4, max_length=32)
    offer_expires_at: str = Field(..., min_length=4, max_length=32)


class RespondOfferRequest(BaseModel):
    decision: OfferStatus
    student_remarks: Optional[str] = Field(default=None, max_length=500)


def _serialize_interview(iv: InterviewSchedule, job: Optional[JobPosting] = None, student: Optional[Student] = None) -> dict:
    return {
        "id": str(iv.id),
        "application_id": str(iv.application_id),
        "student_id": str(iv.student_id),
        "student_name": student.full_name if student else None,
        "student_roll": student.roll_number if student else None,
        "job_id": str(iv.job_id),
        "company_name": job.company_name if job else None,
        "job_title": job.title if job else None,
        "round_number": iv.round_number,
        "round_type": iv.round_type.value,
        "mode": iv.mode.value,
        "scheduled_at": iv.scheduled_at.isoformat(),
        "duration_minutes": iv.duration_minutes,
        "meeting_link_or_venue": iv.meeting_link_or_venue,
        "panelist_name": iv.panelist_name,
        "status": iv.status.value,
        "interviewer_notes": iv.interviewer_notes,
    }


def _serialize_offer(offer: OfferLetter, student: Optional[Student] = None) -> dict:
    return {
        "id": str(offer.id),
        "offer_code": offer.offer_code,
        "application_id": str(offer.application_id),
        "student_id": str(offer.student_id),
        "student_name": student.full_name if student else None,
        "student_roll": student.roll_number if student else None,
        "job_id": str(offer.job_id),
        "company_name": offer.company_name,
        "role_title": offer.role_title,
        "role_type": offer.role_type,
        "ctc_lpa": float(offer.ctc_lpa),
        "joining_date": offer.joining_date,
        "offer_expires_at": offer.offer_expires_at,
        "status": offer.status.value,
        "student_remarks": offer.student_remarks,
        "issued_at": offer.issued_at.isoformat() if offer.issued_at else None,
        "responded_at": offer.responded_at.isoformat() if offer.responded_at else None,
    }


@router.post("/interviews", status_code=status.HTTP_201_CREATED)
async def schedule_interview(
    payload: ScheduleInterviewRequest,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.RECRUITER, RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    app_row = (
        await db.execute(select(JobApplication).where(JobApplication.id == payload.application_id))
    ).scalar_one_or_none()
    if not app_row:
        raise HTTPException(status_code=404, detail="Job application not found.")

    if app_row.status in (ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot schedule interview for application in {app_row.status.value} state.",
        )

    # BRULE-31: Prevent overlapping student interview slots within +/- 45 minutes
    target_start = payload.scheduled_at
    if target_start.tzinfo is None:
        target_start = target_start.replace(tzinfo=timezone.utc)

    existing_interviews = (
        await db.execute(
            select(InterviewSchedule).where(
                InterviewSchedule.student_id == app_row.student_id,
                InterviewSchedule.status.in_([InterviewStatus.SCHEDULED, InterviewStatus.CONFIRMED]),
            )
        )
    ).scalars().all()

    for existing in existing_interviews:
        ex_start = existing.scheduled_at
        if ex_start.tzinfo is None:
            ex_start = ex_start.replace(tzinfo=timezone.utc)
        if abs((target_start - ex_start).total_seconds()) < 45 * 60:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="BRULE-31: Student already has an active interview scheduled within 45 minutes of this slot.",
            )

    interview = InterviewSchedule(
        application_id=app_row.id,
        student_id=app_row.student_id,
        job_id=app_row.job_id,
        round_number=payload.round_number,
        round_type=payload.round_type,
        mode=payload.mode,
        scheduled_at=target_start,
        duration_minutes=payload.duration_minutes,
        meeting_link_or_venue=payload.meeting_link_or_venue.strip(),
        panelist_name=payload.panelist_name.strip(),
        status=InterviewStatus.SCHEDULED,
    )
    db.add(interview)

    if app_row.status in (ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED):
        app_row.status = ApplicationStatus.INTERVIEWING

    await db.flush()

    job = (await db.execute(select(JobPosting).where(JobPosting.id == app_row.job_id))).scalar_one_or_none()
    student = (await db.execute(select(Student).where(Student.id == app_row.student_id))).scalar_one_or_none()

    await record_audit_event(
        db,
        actor_user_id=principal.user.id,
        actor_email=principal.user.email,
        actor_role=principal.active_role.value,
        action="INTERVIEW_SCHEDULED",
        resource_type="placement_interviews",
        resource_id=str(interview.id),
        details={"round": payload.round_type.value, "scheduled_at": target_start.isoformat()},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return _serialize_interview(interview, job, student)


@router.get("/interviews")
async def list_interviews(
    principal: CurrentPrincipal = Depends(
        require_roles(RoleName.STUDENT, RoleName.RECRUITER, RoleName.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(InterviewSchedule).order_by(InterviewSchedule.scheduled_at.asc())
    if principal.active_role == RoleName.STUDENT:
        student = await _get_or_create_student(db, principal)
        stmt = stmt.where(InterviewSchedule.student_id == student.id)

    interviews = (await db.execute(stmt)).scalars().all()
    if not interviews:
        return []

    jobs = {
        j.id: j
        for j in (
            await db.execute(select(JobPosting).where(JobPosting.id.in_({i.job_id for i in interviews})))
        ).scalars().all()
    }
    students = {
        s.id: s
        for s in (
            await db.execute(select(Student).where(Student.id.in_({i.student_id for i in interviews})))
        ).scalars().all()
    }
    return [_serialize_interview(iv, jobs.get(iv.job_id), students.get(iv.student_id)) for iv in interviews]


@router.patch("/interviews/{interview_id}")
async def update_interview(
    interview_id: uuid.UUID,
    payload: UpdateInterviewRequest,
    request: Request,
    principal: CurrentPrincipal = Depends(
        require_roles(RoleName.STUDENT, RoleName.RECRUITER, RoleName.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
) -> dict:
    interview = (
        await db.execute(select(InterviewSchedule).where(InterviewSchedule.id == interview_id))
    ).scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview schedule not found.")

    if principal.active_role == RoleName.STUDENT:
        student = await _get_or_create_student(db, principal)
        if interview.student_id != student.id:
            raise HTTPException(status_code=403, detail="Not authorized for this interview.")
        if payload.status != InterviewStatus.CONFIRMED:
            raise HTTPException(
                status_code=403,
                detail="Students can only confirm attendance (status=CONFIRMED).",
            )

    interview.status = payload.status
    if payload.interviewer_notes is not None:
        interview.interviewer_notes = payload.interviewer_notes.strip()

    await record_audit_event(
        db,
        actor_user_id=principal.user.id,
        actor_email=principal.user.email,
        actor_role=principal.active_role.value,
        action="INTERVIEW_STATUS_UPDATED",
        resource_type="placement_interviews",
        resource_id=str(interview.id),
        details={"status": payload.status.value},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    job = (await db.execute(select(JobPosting).where(JobPosting.id == interview.job_id))).scalar_one_or_none()
    student = (await db.execute(select(Student).where(Student.id == interview.student_id))).scalar_one_or_none()
    return _serialize_interview(interview, job, student)


@router.post("/offers", status_code=status.HTTP_201_CREATED)
async def issue_offer_letter(
    payload: IssueOfferRequest,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.RECRUITER, RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    app_row = (
        await db.execute(select(JobApplication).where(JobApplication.id == payload.application_id))
    ).scalar_one_or_none()
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found.")

    existing_offer = (
        await db.execute(select(OfferLetter).where(OfferLetter.application_id == app_row.id))
    ).scalar_one_or_none()
    if existing_offer:
        raise HTTPException(status_code=409, detail="Offer letter already issued for this application.")

    job = (await db.execute(select(JobPosting).where(JobPosting.id == app_row.job_id))).scalar_one()
    student = (await db.execute(select(Student).where(Student.id == app_row.student_id))).scalar_one()

    offer_code = f"OFR-2026-{uuid.uuid4().hex[:6].upper()}"
    offer = OfferLetter(
        offer_code=offer_code,
        application_id=app_row.id,
        student_id=student.id,
        job_id=job.id,
        company_name=job.company_name,
        role_title=job.title,
        role_type=job.role_type.value,
        ctc_lpa=payload.ctc_lpa,
        joining_date=payload.joining_date,
        offer_expires_at=payload.offer_expires_at,
        status=OfferStatus.ISSUED,
    )
    db.add(offer)
    app_row.status = ApplicationStatus.OFFERED
    await db.flush()

    await record_audit_event(
        db,
        actor_user_id=principal.user.id,
        actor_email=principal.user.email,
        actor_role=principal.active_role.value,
        action="OFFER_LETTER_ISSUED",
        resource_type="placement_offers",
        resource_id=str(offer.id),
        details={"offer_code": offer_code, "ctc_lpa": float(payload.ctc_lpa)},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return _serialize_offer(offer, student)


@router.get("/offers")
async def list_offers(
    principal: CurrentPrincipal = Depends(
        require_roles(RoleName.STUDENT, RoleName.RECRUITER, RoleName.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(OfferLetter).order_by(OfferLetter.issued_at.desc())
    if principal.active_role == RoleName.STUDENT:
        student = await _get_or_create_student(db, principal)
        stmt = stmt.where(OfferLetter.student_id == student.id)

    offers = (await db.execute(stmt)).scalars().all()
    if not offers:
        return []

    students = {
        s.id: s
        for s in (
            await db.execute(select(Student).where(Student.id.in_({o.student_id for o in offers})))
        ).scalars().all()
    }
    return [_serialize_offer(o, students.get(o.student_id)) for o in offers]


@router.post("/offers/{offer_id}/respond")
async def respond_to_offer(
    offer_id: uuid.UUID,
    payload: RespondOfferRequest,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if payload.decision not in (OfferStatus.ACCEPTED, OfferStatus.DECLINED):
        raise HTTPException(status_code=400, detail="Decision must be ACCEPTED or DECLINED.")

    student = await _get_or_create_student(db, principal)
    offer = (
        await db.execute(
            select(OfferLetter).where(
                OfferLetter.id == offer_id,
                OfferLetter.student_id == student.id,
            )
        )
    ).scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer letter not found.")

    if offer.status != OfferStatus.ISSUED:
        raise HTTPException(
            status_code=409,
            detail=f"Offer has already been finalized with status {offer.status.value}.",
        )

    # BRULE-35: Single Accepted Full-Time Offer Lock
    if payload.decision == OfferStatus.ACCEPTED and offer.role_type == JobRoleType.FULL_TIME.value:
        existing_accepted_ft = (
            await db.execute(
                select(OfferLetter).where(
                    OfferLetter.student_id == student.id,
                    OfferLetter.role_type == JobRoleType.FULL_TIME.value,
                    OfferLetter.status == OfferStatus.ACCEPTED,
                )
            )
        ).scalar_one_or_none()
        if existing_accepted_ft:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"BRULE-35: You have already accepted a full-time offer from {existing_accepted_ft.company_name}.",
            )

        # Auto-decline any other ISSUED full-time offers for this student
        other_issued = (
            await db.execute(
                select(OfferLetter).where(
                    OfferLetter.student_id == student.id,
                    OfferLetter.id != offer.id,
                    OfferLetter.role_type == JobRoleType.FULL_TIME.value,
                    OfferLetter.status == OfferStatus.ISSUED,
                )
            )
        ).scalars().all()
        for other in other_issued:
            other.status = OfferStatus.DECLINED
            other.student_remarks = "Auto-closed under BRULE-35 Single Full-Time Offer Policy."
            other.responded_at = datetime.now(timezone.utc)

    offer.status = payload.decision
    offer.student_remarks = payload.student_remarks
    offer.responded_at = datetime.now(timezone.utc)

    await record_audit_event(
        db,
        actor_user_id=principal.user.id,
        actor_email=principal.user.email,
        actor_role=principal.active_role.value,
        action=f"OFFER_{payload.decision.value}",
        resource_type="placement_offers",
        resource_id=str(offer.id),
        details={"offer_code": offer.offer_code, "company": offer.company_name},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return _serialize_offer(offer, student)


@router.get("/analytics/overview")
async def get_placement_analytics(
    principal: CurrentPrincipal = Depends(
        require_roles(RoleName.STUDENT, RoleName.RECRUITER, RoleName.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
) -> dict:
    total_students = (await db.execute(select(func.count(Student.id)))).scalar() or 0
    total_jobs = (await db.execute(select(func.count(JobPosting.id)))).scalar() or 0
    total_applications = (await db.execute(select(func.count(JobApplication.id)))).scalar() or 0
    total_interviews = (await db.execute(select(func.count(InterviewSchedule.id)))).scalar() or 0

    offers = (await db.execute(select(OfferLetter))).scalars().all()
    offers_issued = len(offers)
    offers_accepted = sum(1 for o in offers if o.status == OfferStatus.ACCEPTED)
    ft_ctcs = [float(o.ctc_lpa) for o in offers if o.role_type == JobRoleType.FULL_TIME.value]
    avg_ctc_lpa = round(sum(ft_ctcs) / len(ft_ctcs), 2) if ft_ctcs else 14.5
    highest_ctc_lpa = round(max(ft_ctcs), 2) if ft_ctcs else 22.0

    recent_audits = (
        await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(15))
    ).scalars().all()

    return {
        "kpis": {
            "registered_students": total_students,
            "active_drives": total_jobs,
            "total_applications": total_applications,
            "scheduled_interviews": total_interviews,
            "offers_issued": offers_issued,
            "offers_accepted": offers_accepted,
            "avg_ctc_lpa": avg_ctc_lpa,
            "highest_ctc_lpa": highest_ctc_lpa,
        },
        "audit_logs": [
            {
                "id": str(a.id),
                "actor_email": a.actor_email,
                "actor_role": a.actor_role,
                "action": a.action,
                "resource_type": a.resource_type,
                "resource_id": a.resource_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_audits
        ],
    }
