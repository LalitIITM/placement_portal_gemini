from sqlalchemy.dialects.postgresql import insert as pg_insert
import re
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.portal_state.models import (
    ActivityPointSubmissionRecord,
    HelpdeskTicketRecord,
    OneOnOneSlotRecordModel,
    PortalExaminerEvaluationRecord,
    PortalInterviewRecord,
    PortalJobApplicationRecord,
    PortalOfferLetterRecord,
    PortalStateSnapshot,
    StudentProfileRecord,
    StudentResumeRecord,
    StudentTrainingStageRecord,
)
from app.shared.database import get_db

router = APIRouter(prefix="/api/v1/portal-state", tags=["Portal Persistence"])

DEFAULT_STAGE_ROWS = [
    {"stage_id": "L1-S1", "level": 1, "stage_num": 1, "title": "Placement Prep", "description": "Video-based communication training", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L1-S2", "level": 1, "stage_num": 2, "title": "Listening Comprehension I", "description": "Listen to audio and write a paragraph response via LMS", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L1-S3", "level": 1, "stage_num": 3, "title": "Listening Comprehension II", "description": "Listen and speak to answer given questions", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L1-S4", "level": 1, "stage_num": 4, "title": "Self-Introduction Video", "description": "Formally dressed video recording", "evaluation_type": "MARKS", "max_marks": 40, "min_required": 28, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L1-S5", "level": 1, "stage_num": 5, "title": "Email Writing", "description": "Write formal/professional corporate emails", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L2-S1", "level": 2, "stage_num": 1, "title": "Behavioral Assessment", "description": "Scenario-based response & live training assessment", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L2-S2", "level": 2, "stage_num": 2, "title": "Self-Paced Aptitude Test", "description": "Analytical, quantitative, and logical tests", "evaluation_type": "MARKS", "max_marks": 30, "min_required": 21, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L2-S3", "level": 2, "stage_num": 3, "title": "Project Presentation", "description": "Present a short-term project added in resume", "evaluation_type": "MARKS", "max_marks": 30, "min_required": 21, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L3-S1", "level": 3, "stage_num": 1, "title": "Technical Comprehensive Test", "description": "Test on syllabus and industry-based concepts", "evaluation_type": "MARKS", "max_marks": 25, "min_required": 15, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L3-S2", "level": 3, "stage_num": 2, "title": "Technical AI Mock Interview", "description": "Realistic, AI-evaluated interview simulation", "evaluation_type": "AI_MOCK", "max_marks": 0, "min_required": 0, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "PENDING"},
    {"stage_id": "L3-S3", "level": 3, "stage_num": 3, "title": "1-on-1 Session with Examiner", "description": "Domain fundamentals, resume deep-dive & placement readiness", "evaluation_type": "ONE_ON_ONE", "max_marks": 0, "min_required": 0, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "No"},
]

DEMO_STAGE_OVERRIDES = {
    "L1-S1": (17, 1, "PASSED"),
    "L1-S2": (16, 1, "PASSED"),
    "L1-S3": (16, 2, "PASSED"),
    "L1-S4": (34, 1, "PASSED"),
    "L1-S5": (17, 1, "PASSED"),
    "L2-S1": (15, 1, "PASSED"),
    "L2-S2": (23, 1, "PASSED"),
    "L2-S3": (22, 1, "PASSED"),
    "L3-S1": (18, 1, "PASSED"),
    "L3-S2": (0, 1, "Hire"),
    "L3-S3": (0, 0, "No"),
}

DEFAULT_ACTIVITIES = [
    {"id": "ACT-201", "student_name": "Aarav Sharma", "student_email": "22f3001234@ds.study.iitm.ac.in", "activity_id": "T1-DBMS-1", "evidence_file_name": "HackerRank_SQL_Basic_Cert.pdf", "evidence_file_type": "PDF", "evidence_file_size": "340 KB", "proof_url": "https://www.hackerrank.com/certificates/sql-basic", "completed_date": "2026-08-12", "review_status": "APPROVED", "reviewer_note": None},
    {"id": "ACT-202", "student_name": "Aarav Sharma", "student_email": "22f3001234@ds.study.iitm.ac.in", "activity_id": "T1-PDSA-2", "evidence_file_name": "LeetCode_25_Medium_Profile.jpg", "evidence_file_type": "JPG", "evidence_file_size": "512 KB", "proof_url": "https://leetcode.com/u/iitm_bs_student", "completed_date": "2026-09-04", "review_status": "APPROVED", "reviewer_note": None},
    {"id": "ACT-203", "student_name": "Aarav Sharma", "student_email": "22f3001234@ds.study.iitm.ac.in", "activity_id": "T1-SYS-1", "evidence_file_name": "VMT1_Linux_Shell_Completion.pdf", "evidence_file_type": "PDF", "evidence_file_size": "620 KB", "proof_url": "https://www.hackerrank.com/domains/shell", "completed_date": "2026-09-19", "review_status": "APPROVED", "reviewer_note": None},
    {"id": "ACT-204", "student_name": "Aarav Sharma", "student_email": "22f3001234@ds.study.iitm.ac.in", "activity_id": "T1-CLD-1", "evidence_file_name": "AWS_Cloud_Foundations_Cert.pdf", "evidence_file_type": "PDF", "evidence_file_size": "480 KB", "proof_url": "https://www.simplilearn.com/cloud-cert", "completed_date": "2026-10-02", "review_status": "APPROVED", "reviewer_note": None},
]


class TrainingStageDTO(BaseModel):
    id: str
    level: int
    stageNum: int
    title: str
    description: str
    evaluationType: str
    maxMarks: int
    minRequired: int
    obtainedMarks: int
    attemptsUsed: int
    maxAttempts: int = 2
    statusText: str


class ActivitySubmissionDTO(BaseModel):
    id: str
    studentName: str
    studentEmail: str
    activityId: str
    evidenceFileName: str
    evidenceFileType: str
    evidenceFileSize: str
    proofUrl: Optional[str] = None
    completedDate: str
    reviewStatus: str
    reviewerNote: Optional[str] = None


class StudentProfileDTO(BaseModel):
    studentRoll: str
    fullName: str = ""
    iitmEmail: str = ""
    personalEmail: str = ""
    mobileNumber: str = ""
    cgpa: str = "8.20"
    activeBacklogs: int = 0
    programLevel: str = "BSC"
    degreeType: str = "STANDALONE"
    applyingTrack: str = "FULL_TIME"
    targetDomain: str = "DATA_SCIENCE"
    headline: str = ""
    githubUrl: str = ""
    linkedinUrl: str = ""
    kaggleUrl: str = ""
    portfolioUrl: str = ""
    skills: list[str] = Field(default_factory=list)
    projects: list[dict[str, Any]] = Field(default_factory=list)
    experiences: list[dict[str, Any]] = Field(default_factory=list)
    isSuspended: bool = False
    noShowCount: int = 0


class HelpdeskTicketDTO(BaseModel):
    id: str
    ticketNumber: str
    raisedByEmail: str
    raisedByName: str
    raisedByRole: str
    category: str = "PLACEMENT"
    priority: str = "MEDIUM"
    subject: str
    description: str
    status: str = "OPEN"
    assignedTo: Optional[str] = None
    escalationCount: int = 0
    comments: list[dict[str, Any]] = Field(default_factory=list)
    createdAt: Optional[str] = None


class PortalSyncPayload(BaseModel):
    studentRoll: str = Field(default="21F3001013")
    trainingStages: list[TrainingStageDTO] = Field(default_factory=list)
    activitySubmissions: list[ActivitySubmissionDTO] = Field(default_factory=list)
    studentProfile: Optional[StudentProfileDTO] = None
    helpdeskTickets: list[HelpdeskTicketDTO] = Field(default_factory=list)
    snapshot: dict[str, Any] = Field(default_factory=dict)


async def _ensure_roll_stages(db: AsyncSession, roll: str) -> list[StudentTrainingStageRecord]:
    normalized_roll = roll.strip().upper() or "21F3001013"
    rows = (
        await db.execute(
            select(StudentTrainingStageRecord)
            .where(StudentTrainingStageRecord.student_roll == normalized_roll)
            .order_by(StudentTrainingStageRecord.level, StudentTrainingStageRecord.stage_num)
        )
    ).scalars().all()
    if not rows:
        is_demo_roll = normalized_roll in {"21F3001013", "22F3001234"}
        rows_to_insert = []
        for item in DEFAULT_STAGE_ROWS:
            row_data = dict(item)
            if is_demo_roll and item["stage_id"] in DEMO_STAGE_OVERRIDES:
                marks, attempts, st = DEMO_STAGE_OVERRIDES[item["stage_id"]]
                row_data["obtained_marks"] = marks
                row_data["attempts_used"] = attempts
                row_data["status_text"] = st
            rows_to_insert.append({"student_roll": normalized_roll, **row_data})
        stmt = (
            pg_insert(StudentTrainingStageRecord.__table__)
            .values(rows_to_insert)
            .on_conflict_do_nothing(constraint="uq_student_roll_stage_id")
        )
        await db.execute(stmt)
        await db.flush()
        rows = (
            await db.execute(
                select(StudentTrainingStageRecord)
                .where(StudentTrainingStageRecord.student_roll == normalized_roll)
                .order_by(StudentTrainingStageRecord.level, StudentTrainingStageRecord.stage_num)
            )
        ).scalars().all()
    return list(rows)


async def _ensure_activities(db: AsyncSession, roll: Optional[str] = None) -> list[ActivityPointSubmissionRecord]:
    any_row = (await db.execute(select(ActivityPointSubmissionRecord).limit(1))).scalar_one_or_none()
    if any_row is None:
        for item in DEFAULT_ACTIVITIES:
            db.add(ActivityPointSubmissionRecord(**item))
        await db.flush()

    stmt = select(ActivityPointSubmissionRecord).order_by(ActivityPointSubmissionRecord.created_at.desc())
    if roll:
        prefix = f"{roll.strip().lower()}@"
        stmt = stmt.where(ActivityPointSubmissionRecord.student_email.ilike(f"{prefix}%"))

    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


async def _ensure_student_profile(db: AsyncSession, roll: str) -> StudentProfileRecord:
    normalized_roll = roll.strip().upper() or "21F3001013"
    prof = (
        await db.execute(
            select(StudentProfileRecord).where(StudentProfileRecord.student_roll == normalized_roll)
        )
    ).scalar_one_or_none()
    if prof is None:
        prof = StudentProfileRecord(
            student_roll=normalized_roll,
            full_name="Aarav Sharma" if normalized_roll in {"21F3001013", "22F3001234"} else normalized_roll,
            iitm_email=f"{normalized_roll.lower()}@ds.study.iitm.ac.in",
            cgpa="8.45" if normalized_roll in {"21F3001013", "22F3001234"} else "8.00",
            skills=["Python", "SQL", "FastAPI", "React", "Machine Learning"],
        )
        db.add(prof)
        await db.flush()
    return prof


@router.get("/sync", response_model=PortalSyncPayload)
async def get_portal_sync_alias(
    student_roll: str = "21F3001013",
    scope_student_only: bool = False,
    db: AsyncSession = Depends(get_db),
) -> PortalSyncPayload:
    return await get_portal_bootstrap_state(
        student_roll=student_roll,
        scope_student_only=scope_student_only,
        db=db,
    )


@router.get("/bootstrap", response_model=PortalSyncPayload)
async def get_portal_bootstrap_state(
    student_roll: str = "21F3001013",
    scope_student_only: bool = False,
    db: AsyncSession = Depends(get_db),
) -> PortalSyncPayload:
    """Hydrates roll-isolated stages, activities, profile, resumes, slots, evaluations, applications, offers, and helpdesk tickets from normalized PostgreSQL tables."""
    normalized_roll = student_roll.strip().upper() or "21F3001013"
    stage_rows = await _ensure_roll_stages(db, normalized_roll)
    act_rows = await _ensure_activities(db, roll=normalized_roll if scope_student_only else None)
    profile_row = await _ensure_student_profile(db, normalized_roll)

    # Normalized resumes per student roll
    resume_rows = (
        await db.execute(
            select(StudentResumeRecord)
            .where(StudentResumeRecord.student_roll == normalized_roll)
            .order_by(StudentResumeRecord.is_primary.desc(), StudentResumeRecord.created_at.desc())
        )
    ).scalars().all()

    # Normalized 1-on-1 evaluation slots
    slot_rows = (
        await db.execute(
            select(OneOnOneSlotRecordModel).order_by(OneOnOneSlotRecordModel.date.asc())
        )
    ).scalars().all()

    # Normalized examiner evaluations
    eval_stmt = select(PortalExaminerEvaluationRecord).order_by(PortalExaminerEvaluationRecord.created_at.desc())
    if scope_student_only:
        eval_stmt = eval_stmt.where(PortalExaminerEvaluationRecord.student_roll == normalized_roll)
    eval_rows = (await db.execute(eval_stmt)).scalars().all()

    # Normalized ATS applications
    app_stmt = select(PortalJobApplicationRecord).order_by(PortalJobApplicationRecord.created_at.desc())
    if scope_student_only:
        app_stmt = app_stmt.where(PortalJobApplicationRecord.student_roll == normalized_roll)
    app_rows = (await db.execute(app_stmt)).scalars().all()

    # Normalized interviews & offers
    int_stmt = select(PortalInterviewRecord).order_by(PortalInterviewRecord.created_at.desc())
    offer_stmt = select(PortalOfferLetterRecord).order_by(PortalOfferLetterRecord.created_at.desc())
    if scope_student_only:
        int_stmt = int_stmt.where(PortalInterviewRecord.student_roll == normalized_roll)
        offer_stmt = offer_stmt.where(PortalOfferLetterRecord.student_roll == normalized_roll)
    interview_rows = (await db.execute(int_stmt)).scalars().all()
    offer_rows = (await db.execute(offer_stmt)).scalars().all()

    # Normalized helpdesk tickets
    ticket_stmt = select(HelpdeskTicketRecord).order_by(HelpdeskTicketRecord.created_at.desc())
    if scope_student_only:
        ticket_stmt = ticket_stmt.where(
            HelpdeskTicketRecord.raised_by_email.ilike(f"{normalized_roll.lower()}@%")
        )
    ticket_rows = (await db.execute(ticket_stmt)).scalars().all()

    # Supplementary snapshot fallback for legacy keys / marksheet
    global_snap_row = (
        await db.execute(
            select(PortalStateSnapshot).where(PortalStateSnapshot.scope_key == "GLOBAL_PORTAL_STATE")
        )
    ).scalar_one_or_none()
    global_payload = dict(global_snap_row.payload) if global_snap_row else {}
    global_payload.pop("resumes", None)
    global_payload.pop("marksheet", None)

    roll_docs_key = f"STUDENT_DOCS::{normalized_roll}"
    roll_docs_row = (
        await db.execute(
            select(PortalStateSnapshot).where(PortalStateSnapshot.scope_key == roll_docs_key)
        )
    ).scalar_one_or_none()

    resumes_payload = [
        {
            "id": r.id,
            "title": r.title,
            "targetRole": r.target_role,
            "driveUrl": r.drive_url,
            "fileSize": r.file_size,
            "updatedAt": r.updated_at_label,
            "isPrimary": r.is_primary,
        }
        for r in resume_rows
    ]
    if not resumes_payload and roll_docs_row and isinstance(roll_docs_row.payload, dict):
        resumes_payload = roll_docs_row.payload.get("resumes", [])

    global_payload["resumes"] = resumes_payload
    global_payload["marksheet"] = (
        roll_docs_row.payload.get("marksheet")
        if roll_docs_row and isinstance(roll_docs_row.payload, dict)
        else None
    )

    if slot_rows:
        global_payload["oneOnOneSlots"] = [
            {
                "id": s.id,
                "studentEmail": s.student_email,
                "studentName": s.student_name,
                "date": s.date,
                "slotTime": s.slot_time,
                "instructor": s.instructor,
                "status": s.status,
                "instructorFeedback": s.instructor_feedback,
                "isPlacementReady": s.is_placement_ready,
                "programmingRating": s.programming_rating,
                "dataScienceRating": s.data_science_rating,
                "communicationRating": s.communication_rating,
                "remedialTasks": s.remedial_tasks or [],
                "completedAt": s.completed_at,
            }
            for s in slot_rows
        ]

    if eval_rows:
        global_payload["evaluations"] = [
            {
                "id": e.id,
                "studentRoll": e.student_roll,
                "examinerEmail": e.examiner_email,
                "skillsets": e.skillsets or [],
                "programmingRating": e.programming_rating,
                "dataScienceRating": e.data_science_rating,
                "communicationRating": e.communication_rating,
                "isPlacementReady": e.is_placement_ready,
                "performingExceptionallyGood": e.performing_exceptionally_good,
                "remedialTasks": e.remedial_tasks or [],
                "notes": e.notes,
                "evaluatedAt": e.evaluated_at,
            }
            for e in eval_rows
        ]

    if app_rows:
        global_payload["applications"] = [
            {
                "id": a.id,
                "jobId": a.job_id,
                "jobCode": a.job_code,
                "companyName": a.company_name,
                "jobTitle": a.job_title,
                "roleType": a.role_type,
                "studentRoll": a.student_roll,
                "studentName": a.student_name,
                "studentCgpa": a.student_cgpa,
                "resumeTitle": a.resume_title,
                "status": a.status,
                "appliedAt": a.applied_at,
            }
            for a in app_rows
        ]

    if interview_rows:
        global_payload["interviews"] = [
            {
                "id": i.id,
                "applicationId": i.application_id,
                "studentRoll": i.student_roll,
                "studentName": i.student_name,
                "companyName": i.company_name,
                "jobTitle": i.job_title,
                "roundNumber": i.round_number,
                "roundType": i.round_type,
                "mode": i.mode,
                "scheduledAt": i.scheduled_at,
                "meetingLink": i.meeting_link,
                "panelistName": i.panelist_name,
                "status": i.status,
                "notes": i.notes,
            }
            for i in interview_rows
        ]

    if offer_rows:
        global_payload["offers"] = [
            {
                "id": o.id,
                "offerCode": o.offer_code,
                "applicationId": o.application_id,
                "studentRoll": o.student_roll,
                "studentName": o.student_name,
                "companyName": o.company_name,
                "roleTitle": o.role_title,
                "roleType": o.role_type,
                "ctcLpa": o.ctc_lpa,
                "joiningDate": o.joining_date,
                "expiresAt": o.expires_at,
                "status": o.status,
                "remarks": o.remarks,
            }
            for o in offer_rows
        ]

    return PortalSyncPayload(
        studentRoll=normalized_roll,
        trainingStages=[
            TrainingStageDTO(
                id=r.stage_id,
                level=r.level,
                stageNum=r.stage_num,
                title=r.title,
                description=r.description,
                evaluationType=r.evaluation_type,
                maxMarks=r.max_marks,
                minRequired=r.min_required,
                obtainedMarks=r.obtained_marks,
                attemptsUsed=r.attempts_used,
                maxAttempts=r.max_attempts,
                statusText=r.status_text,
            )
            for r in stage_rows
        ],
        activitySubmissions=[
            ActivitySubmissionDTO(
                id=a.id,
                studentName=a.student_name,
                studentEmail=a.student_email,
                activityId=a.activity_id,
                evidenceFileName=a.evidence_file_name,
                evidenceFileType=a.evidence_file_type,
                evidenceFileSize=a.evidence_file_size,
                proofUrl=a.proof_url,
                completedDate=a.completed_date,
                reviewStatus=a.review_status,
                reviewerNote=a.reviewer_note,
            )
            for a in act_rows
        ],
        studentProfile=StudentProfileDTO(
            studentRoll=profile_row.student_roll,
            fullName=profile_row.full_name,
            iitmEmail=profile_row.iitm_email,
            personalEmail=profile_row.personal_email,
            mobileNumber=profile_row.mobile_number,
            cgpa=profile_row.cgpa,
            activeBacklogs=profile_row.active_backlogs,
            programLevel=profile_row.program_level,
            degreeType=profile_row.degree_type,
            applyingTrack=profile_row.applying_track,
            targetDomain=profile_row.target_domain,
            headline=profile_row.headline,
            githubUrl=profile_row.github_url,
            linkedinUrl=profile_row.linkedin_url,
            kaggleUrl=profile_row.kaggle_url,
            portfolioUrl=profile_row.portfolio_url,
            skills=profile_row.skills or [],
            projects=profile_row.projects or [],
            experiences=profile_row.experiences or [],
            isSuspended=profile_row.is_suspended,
            noShowCount=profile_row.no_show_count,
        ),
        helpdeskTickets=[
            HelpdeskTicketDTO(
                id=t.id,
                ticketNumber=t.ticket_number,
                raisedByEmail=t.raised_by_email,
                raisedByName=t.raised_by_name,
                raisedByRole=t.raised_by_role,
                category=t.category,
                priority=t.priority,
                subject=t.subject,
                description=t.description,
                status=t.status,
                assignedTo=t.assigned_to,
                escalationCount=t.escalation_count,
                comments=t.comments or [],
                createdAt=t.created_at.isoformat() if t.created_at else None,
            )
            for t in ticket_rows
        ],
        snapshot=global_payload,
    )


@router.put("/sync", response_model=dict[str, str])
async def sync_portal_state(
    payload: PortalSyncPayload,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Atomically persists stages, activities, profile, resumes, slots, evaluations, applications, interviews, offers, and helpdesk tickets into normalized PostgreSQL tables."""
    normalized_roll = payload.studentRoll.strip().upper() or "21F3001013"

    # 1. Training stages (BRULE-09: max 2 attempts)
    if payload.trainingStages:
        existing_stages = await _ensure_roll_stages(db, normalized_roll)
        stage_map = {s.stage_id: s for s in existing_stages}
        for st in payload.trainingStages:
            if st.attemptsUsed > 2:
                raise HTTPException(
                    status_code=409,
                    detail=f"Stage {st.id} exceeds maximum 2 attempts limit (BRULE-09).",
                )
            rec = stage_map.get(st.id)
            if rec:
                rec.obtained_marks = st.obtainedMarks
                rec.attempts_used = st.attemptsUsed
                rec.status_text = st.statusText

    # 2. Activity ledger submissions
    if payload.activitySubmissions:
        for sub in payload.activitySubmissions:
            await db.merge(
                ActivityPointSubmissionRecord(
                    id=sub.id,
                    student_name=sub.studentName,
                    student_email=sub.studentEmail,
                    activity_id=sub.activityId,
                    evidence_file_name=sub.evidenceFileName,
                    evidence_file_type=sub.evidenceFileType,
                    evidence_file_size=sub.evidenceFileSize,
                    proof_url=sub.proofUrl,
                    completed_date=sub.completedDate,
                    review_status=sub.reviewStatus,
                    reviewer_note=sub.reviewerNote,
                )
            )

    # 3. Student Career & Academic Profile
    if payload.studentProfile:
        p = payload.studentProfile
        await db.merge(
            StudentProfileRecord(
                student_roll=normalized_roll,
                full_name=p.fullName,
                iitm_email=p.iitmEmail,
                personal_email=p.personalEmail,
                mobile_number=p.mobileNumber,
                cgpa=p.cgpa,
                active_backlogs=p.activeBacklogs,
                program_level=p.programLevel,
                degree_type=p.degreeType,
                applying_track=p.applyingTrack,
                target_domain=p.targetDomain,
                headline=p.headline,
                github_url=p.githubUrl,
                linkedin_url=p.linkedinUrl,
                kaggle_url=p.kaggleUrl,
                portfolio_url=p.portfolioUrl,
                skills=p.skills,
                projects=p.projects,
                experiences=p.experiences,
                is_suspended=p.isSuspended,
                no_show_count=p.noShowCount,
            )
        )

    # 4. Helpdesk Tickets
    if payload.helpdeskTickets:
        for t in payload.helpdeskTickets:
            await db.merge(
                HelpdeskTicketRecord(
                    id=t.id,
                    ticket_number=t.ticketNumber,
                    raised_by_email=t.raisedByEmail,
                    raised_by_name=t.raisedByName,
                    raised_by_role=t.raisedByRole,
                    category=t.category,
                    priority=t.priority,
                    subject=t.subject,
                    description=t.description,
                    status=t.status,
                    assigned_to=t.assignedTo,
                    escalation_count=t.escalationCount,
                    comments=t.comments,
                )
            )

    if payload.snapshot:
        snap_copy = dict(payload.snapshot)
        roll_resumes = snap_copy.pop("resumes", None)
        roll_marksheet = snap_copy.pop("marksheet", None)
        slots_list = snap_copy.pop("oneOnOneSlots", None)
        evals_list = snap_copy.pop("evaluations", None)
        apps_list = snap_copy.pop("applications", None)
        interviews_list = snap_copy.pop("interviews", None)
        offers_list = snap_copy.pop("offers", None)

        # 5. Normalized Resumes per roll (BRULE-55: max 3 active resume versions)
        if isinstance(roll_resumes, list):
            if len(roll_resumes) > 3:
                raise HTTPException(
                    status_code=409,
                    detail="Students may maintain up to three active resume versions (BRULE-55).",
                )
            await db.execute(
                delete(StudentResumeRecord).where(StudentResumeRecord.student_roll == normalized_roll)
            )
            for r in roll_resumes:
                db.add(
                    StudentResumeRecord(
                        id=str(r.get("id")),
                        student_roll=normalized_roll,
                        title=str(r.get("title", "Resume")),
                        target_role=str(r.get("targetRole", "General")),
                        drive_url=str(r.get("driveUrl", "")),
                        file_size=str(r.get("fileSize", "0 KB")),
                        updated_at_label=str(r.get("updatedAt", "")),
                        is_primary=bool(r.get("isPrimary", False)),
                    )
                )

        # 6. Normalized 1-on-1 Evaluation Slots (BRULE-21: prevent evaluator slot double-booking)
        if isinstance(slots_list, list):
            seen_active_slots: dict[tuple[str, str, str], str] = {}
            for s in slots_list:
                status_val = str(s.get("status", "SCHEDULED")).upper()
                if status_val == "SCHEDULED":
                    key = (
                        str(s.get("instructor", "")).strip().lower(),
                        str(s.get("date", "")).strip(),
                        str(s.get("slotTime", "")).strip(),
                    )
                    student_email = str(s.get("studentEmail", "")).strip().lower()
                    if key[0] and key[1] and key[2]:
                        prev_student = seen_active_slots.get(key)
                        if prev_student and prev_student != student_email:
                            raise HTTPException(
                                status_code=409,
                                detail=f"Evaluator slot collision for {s.get('instructor')} on {s.get('date')} ({s.get('slotTime')}) (BRULE-21).",
                            )
                        seen_active_slots[key] = student_email
            for s in slots_list:
                await db.merge(
                    OneOnOneSlotRecordModel(
                        id=str(s.get("id")),
                        student_email=str(s.get("studentEmail", "")),
                        student_name=str(s.get("studentName", "")),
                        date=str(s.get("date", "")),
                        slot_time=str(s.get("slotTime", "")),
                        instructor=str(s.get("instructor", "")),
                        status=str(s.get("status", "SCHEDULED")),
                        instructor_feedback=s.get("instructorFeedback"),
                        is_placement_ready=s.get("isPlacementReady"),
                        programming_rating=s.get("programmingRating"),
                        data_science_rating=s.get("dataScienceRating"),
                        communication_rating=s.get("communicationRating"),
                        remedial_tasks=s.get("remedialTasks") or [],
                        completed_at=s.get("completedAt"),
                    )
                )

        # 7. Normalized Examiner Evaluations
        if isinstance(evals_list, list):
            for e in evals_list:
                raw_eval_roll = str(e.get("studentRoll", "")).strip().upper()
                roll_match = re.search(r"\b\d{2}[A-Z]\d{7}\b", raw_eval_roll)
                clean_eval_roll = roll_match.group(0) if roll_match else raw_eval_roll[:32]
                await db.merge(
                    PortalExaminerEvaluationRecord(
                        id=str(e.get("id")),
                        student_roll=clean_eval_roll,
                        examiner_email=str(e.get("examinerEmail", "")),
                        skillsets=e.get("skillsets") or [],
                        programming_rating=int(e.get("programmingRating", 0)),
                        data_science_rating=int(e.get("dataScienceRating", 0)),
                        communication_rating=int(e.get("communicationRating", 0)),
                        is_placement_ready=bool(e.get("isPlacementReady", False)),
                        performing_exceptionally_good=bool(e.get("performingExceptionallyGood", False)),
                        remedial_tasks=e.get("remedialTasks") or [],
                        notes=str(e.get("notes", "")),
                        evaluated_at=str(e.get("evaluatedAt", "")),
                    )
                )

        # 8. Normalized ATS Job Applications (BRULE-49: placed full-time students locked from new applications)
        if isinstance(apps_list, list):
            accepted_ft_rolls: set[str] = set()
            accepted_offer_app_ids: set[str] = set()
            if isinstance(offers_list, list):
                for o in offers_list:
                    if (
                        str(o.get("status", "")).upper() in {"ACCEPTED", "OFFER_ACCEPTED"}
                        and str(o.get("roleType", "FULL_TIME")).upper() == "FULL_TIME"
                    ):
                        accepted_ft_rolls.add(str(o.get("studentRoll", "")).strip().upper())
                        accepted_offer_app_ids.add(str(o.get("applicationId", "")).strip())
            existing_accepted_offers = (
                await db.execute(
                    select(PortalOfferLetterRecord).where(
                        PortalOfferLetterRecord.status.in_(["ACCEPTED", "OFFER_ACCEPTED"]),
                        PortalOfferLetterRecord.role_type == "FULL_TIME",
                    )
                )
            ).scalars().all()
            for eo in existing_accepted_offers:
                accepted_ft_rolls.add(eo.student_roll.strip().upper())
                accepted_offer_app_ids.add(eo.application_id.strip())

            for a in apps_list:
                s_roll = str(a.get("studentRoll", "")).strip().upper()
                a_id = str(a.get("id", "")).strip()
                a_status = str(a.get("status", "APPLIED")).upper()
                if (
                    s_roll in accepted_ft_rolls
                    and a_status == "APPLIED"
                    and a_id not in accepted_offer_app_ids
                ):
                    raise HTTPException(
                        status_code=409,
                        detail=f"Student {s_roll} already holds an accepted full-time offer and cannot submit new applications (BRULE-49).",
                    )
            for a in apps_list:
                await db.merge(
                    PortalJobApplicationRecord(
                        id=str(a.get("id")),
                        job_id=str(a.get("jobId", "")),
                        job_code=str(a.get("jobCode", "")),
                        company_name=str(a.get("companyName", "")),
                        job_title=str(a.get("jobTitle", "")),
                        role_type=str(a.get("roleType", "FULL_TIME")),
                        student_roll=str(a.get("studentRoll", "")).upper(),
                        student_name=str(a.get("studentName", "")),
                        student_cgpa=str(a.get("studentCgpa", "0.0")),
                        resume_title=str(a.get("resumeTitle", "")),
                        status=str(a.get("status", "APPLIED")),
                        applied_at=str(a.get("appliedAt", "")),
                    )
                )

        # 9. Normalized Interviews & Offers
        if isinstance(interviews_list, list):
            for i in interviews_list:
                await db.merge(
                    PortalInterviewRecord(
                        id=str(i.get("id")),
                        application_id=str(i.get("applicationId", "")),
                        student_roll=str(i.get("studentRoll", "")).upper(),
                        student_name=str(i.get("studentName", "")),
                        company_name=str(i.get("companyName", "")),
                        job_title=str(i.get("jobTitle", "")),
                        round_number=int(i.get("roundNumber", 1)),
                        round_type=str(i.get("roundType", "TECHNICAL_1")),
                        mode=str(i.get("mode", "ONLINE_MEET")),
                        scheduled_at=str(i.get("scheduledAt", "")),
                        meeting_link=str(i.get("meetingLink", "")),
                        panelist_name=str(i.get("panelistName", "")),
                        status=str(i.get("status", "SCHEDULED")),
                        notes=i.get("notes"),
                    )
                )

        if isinstance(offers_list, list):
            for o in offers_list:
                await db.merge(
                    PortalOfferLetterRecord(
                        id=str(o.get("id")),
                        offer_code=str(o.get("offerCode", o.get("id"))),
                        application_id=str(o.get("applicationId", "")),
                        student_roll=str(o.get("studentRoll", "")).upper(),
                        student_name=str(o.get("studentName", "")),
                        company_name=str(o.get("companyName", "")),
                        role_title=str(o.get("roleTitle", "")),
                        role_type=str(o.get("roleType", "FULL_TIME")),
                        ctc_lpa=float(o.get("ctcLpa", 0.0)),
                        joining_date=str(o.get("joiningDate", "")),
                        expires_at=str(o.get("expiresAt", "")),
                        status=str(o.get("status", "ISSUED")),
                        remarks=o.get("remarks"),
                    )
                )

        # 10. Per-roll scorecard metadata & global supplementary config
        roll_docs_key = f"STUDENT_DOCS::{normalized_roll}"
        roll_docs_row = (
            await db.execute(
                select(PortalStateSnapshot).where(PortalStateSnapshot.scope_key == roll_docs_key)
            )
        ).scalar_one_or_none()
        roll_docs_payload = {
            "resumes": roll_resumes if roll_resumes is not None else [],
            "marksheet": roll_marksheet,
        }
        if roll_docs_row is None:
            db.add(PortalStateSnapshot(scope_key=roll_docs_key, payload=roll_docs_payload))
        else:
            roll_docs_row.payload = roll_docs_payload

        snap_row = (
            await db.execute(
                select(PortalStateSnapshot)
                .where(PortalStateSnapshot.scope_key == "GLOBAL_PORTAL_STATE")
                .with_for_update()
            )
        ).scalar_one_or_none()

        # Preserve already-booked examinerSlots so stale student tabs cannot overwrite or double-book a slot
        existing_ex_slots = (
            snap_row.payload.get("examinerSlots", [])
            if snap_row and isinstance(snap_row.payload, dict)
            else []
        )
        incoming_ex_slots = snap_copy.get("examinerSlots")
        if isinstance(incoming_ex_slots, list) and isinstance(existing_ex_slots, list):
            existing_by_id = {str(s.get("id")): s for s in existing_ex_slots if isinstance(s, dict) and s.get("id")}
            merged_ex_slots = []
            seen_ids = set()
            for inc in incoming_ex_slots:
                if not isinstance(inc, dict):
                    continue
                sid = str(inc.get("id", ""))
                seen_ids.add(sid)
                prev = existing_by_id.get(sid)
                if prev and str(prev.get("status", "OPEN")).upper() in {"REQUESTED", "ALLOTTED"} and prev.get("requestedByEmail"):
                    prev_email = str(prev.get("requestedByEmail", "")).strip().lower()
                    inc_email = str(inc.get("requestedByEmail", "")).strip().lower()
                    inc_status = str(inc.get("status", "OPEN")).upper()
                    if inc_status in {"REQUESTED", "ALLOTTED"} and inc_email and inc_email != prev_email:
                        raise HTTPException(
                            status_code=409,
                            detail="This 1-on-1 slot has already been booked by another student.",
                        )
                    # Keep the authoritative booked state from DB
                    merged_ex_slots.append(prev)
                else:
                    merged_ex_slots.append(inc)
            for prev in existing_ex_slots:
                if isinstance(prev, dict) and str(prev.get("id", "")) not in seen_ids:
                    merged_ex_slots.append(prev)
            snap_copy["examinerSlots"] = merged_ex_slots

        if snap_row is None:
            db.add(PortalStateSnapshot(scope_key="GLOBAL_PORTAL_STATE", payload=snap_copy))
        else:
            snap_row.payload = snap_copy

    await db.flush()
    return {"status": "persisted", "student_roll": normalized_roll}


class BookExaminerSlotRequest(BaseModel):
    studentEmail: str
    studentName: str


@router.post("/examiner-slots/{slot_id}/book")
async def book_examiner_slot(
    slot_id: str,
    body: BookExaminerSlotRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Atomically books an OPEN examiner slot for a single student; rejects if already booked by another student."""
    student_email = body.studentEmail.strip()
    student_email_lower = student_email.lower()
    student_name = body.studentName.strip() or student_email.split("@")[0].upper()

    snap_row = (
        await db.execute(
            select(PortalStateSnapshot)
            .where(PortalStateSnapshot.scope_key == "GLOBAL_PORTAL_STATE")
            .with_for_update()
        )
    ).scalar_one_or_none()

    if snap_row is None or not isinstance(snap_row.payload, dict):
        raise HTTPException(status_code=404, detail="No examiner slot pool found.")

    payload = dict(snap_row.payload)
    slots = list(payload.get("examinerSlots") or [])

    # Enforce 1 active slot per student
    for s in slots:
        if (
            isinstance(s, dict)
            and str(s.get("requestedByEmail", "")).strip().lower() == student_email_lower
            and str(s.get("status", "")).upper() in {"REQUESTED", "ALLOTTED"}
        ):
            raise HTTPException(
                status_code=409,
                detail="You have already booked a 1-on-1 slot. Each student may select only 1 slot.",
            )

    target_idx = next(
        (i for i, s in enumerate(slots) if isinstance(s, dict) and str(s.get("id")) == slot_id),
        None,
    )
    if target_idx is None:
        raise HTTPException(status_code=404, detail="Selected slot no longer exists.")

    target = dict(slots[target_idx])
    if str(target.get("status", "OPEN")).upper() != "OPEN" or target.get("requestedByEmail"):
        raise HTTPException(
            status_code=409,
            detail="This slot was just booked by another student. Please choose another open slot.",
        )

    # Also check normalized OneOnOneSlotRecordModel table so an already-scheduled slot cannot be double-booked
    existing_scheduled = (
        await db.execute(
            select(OneOnOneSlotRecordModel).where(
                OneOnOneSlotRecordModel.date == str(target.get("date", "")).strip(),
                OneOnOneSlotRecordModel.slot_time == str(target.get("slotTime", "")).strip(),
                OneOnOneSlotRecordModel.instructor == str(target.get("instructor", "")).strip(),
            )
        )
    ).scalars().first()
    if existing_scheduled is not None:
        target["status"] = "ALLOTTED"
        target["requestedByEmail"] = existing_scheduled.student_email
        target["requestedByName"] = existing_scheduled.student_name
        slots[target_idx] = target
        payload["examinerSlots"] = slots
        snap_row.payload = payload
        await db.flush()
        raise HTTPException(
            status_code=409,
            detail="This slot is already allotted to another student. Please pick another open slot.",
        )

    target["status"] = "REQUESTED"
    target["requestedByEmail"] = student_email
    target["requestedByName"] = student_name
    slots[target_idx] = target
    payload["examinerSlots"] = slots
    snap_row.payload = payload
    await db.flush()
    return {"status": "booked", "slot": target, "examinerSlots": slots}


@router.get("/helpdesk", response_model=list[HelpdeskTicketDTO])
async def list_helpdesk_tickets(
    student_email: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> list[HelpdeskTicketDTO]:
    stmt = select(HelpdeskTicketRecord).order_by(HelpdeskTicketRecord.created_at.desc())
    if student_email:
        stmt = stmt.where(HelpdeskTicketRecord.raised_by_email.ilike(student_email.strip()))
    rows = (await db.execute(stmt)).scalars().all()
    return [
        HelpdeskTicketDTO(
            id=t.id,
            ticketNumber=t.ticket_number,
            raisedByEmail=t.raised_by_email,
            raisedByName=t.raised_by_name,
            raisedByRole=t.raised_by_role,
            category=t.category,
            priority=t.priority,
            subject=t.subject,
            description=t.description,
            status=t.status,
            assignedTo=t.assigned_to,
            escalationCount=t.escalation_count,
            comments=t.comments or [],
            createdAt=t.created_at.isoformat() if t.created_at else None,
        )
        for t in rows
    ]


@router.post("/helpdesk", response_model=HelpdeskTicketDTO, status_code=status.HTTP_201_CREATED)
async def create_helpdesk_ticket(
    ticket: HelpdeskTicketDTO,
    db: AsyncSession = Depends(get_db),
) -> HelpdeskTicketDTO:
    rec = HelpdeskTicketRecord(
        id=ticket.id,
        ticket_number=ticket.ticketNumber,
        raised_by_email=ticket.raisedByEmail,
        raised_by_name=ticket.raisedByName,
        raised_by_role=ticket.raisedByRole,
        category=ticket.category,
        priority=ticket.priority,
        subject=ticket.subject,
        description=ticket.description,
        status=ticket.status or "OPEN",
        assigned_to=ticket.assignedTo,
        escalation_count=ticket.escalationCount,
        comments=ticket.comments,
    )
    db.add(rec)
    await db.flush()
    ticket.createdAt = datetime.now(timezone.utc).isoformat()
    return ticket
