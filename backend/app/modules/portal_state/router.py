from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.portal_state.models import (
    ActivityPointSubmissionRecord,
    PortalStateSnapshot,
    StudentTrainingStageRecord,
)
from app.shared.database import get_db

router = APIRouter(prefix="/api/v1/portal-state", tags=["Portal Persistence"])

DEFAULT_STAGE_ROWS = [
    {"stage_id": "L1-S1", "level": 1, "stage_num": 1, "title": "Placement Prep", "description": "Video-based communication training", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 17, "attempts_used": 1, "max_attempts": 2, "status_text": "PASSED"},
    {"stage_id": "L1-S2", "level": 1, "stage_num": 2, "title": "Listening Comprehension I", "description": "Listen to audio and write a paragraph response via LMS", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 16, "attempts_used": 1, "max_attempts": 2, "status_text": "PASSED"},
    {"stage_id": "L1-S3", "level": 1, "stage_num": 3, "title": "Listening Comprehension II", "description": "Listen and speak to answer given questions", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 16, "attempts_used": 2, "max_attempts": 2, "status_text": "PASSED"},
    {"stage_id": "L1-S4", "level": 1, "stage_num": 4, "title": "Self-Introduction Video", "description": "Formally dressed video recording", "evaluation_type": "MARKS", "max_marks": 40, "min_required": 28, "obtained_marks": 34, "attempts_used": 1, "max_attempts": 2, "status_text": "PASSED"},
    {"stage_id": "L1-S5", "level": 1, "stage_num": 5, "title": "Email Writing", "description": "Write formal/professional corporate emails", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 17, "attempts_used": 1, "max_attempts": 2, "status_text": "PASSED"},
    {"stage_id": "L2-S1", "level": 2, "stage_num": 1, "title": "Behavioral Assessment", "description": "Scenario-based response & live training assessment", "evaluation_type": "MARKS", "max_marks": 20, "min_required": 14, "obtained_marks": 15, "attempts_used": 1, "max_attempts": 2, "status_text": "PASSED"},
    {"stage_id": "L2-S2", "level": 2, "stage_num": 2, "title": "Self-Paced Aptitude Test", "description": "Analytical, quantitative, and logical tests", "evaluation_type": "MARKS", "max_marks": 30, "min_required": 21, "obtained_marks": 23, "attempts_used": 1, "max_attempts": 2, "status_text": "PASSED"},
    {"stage_id": "L2-S3", "level": 2, "stage_num": 3, "title": "Project Presentation", "description": "Present a short-term project added in resume", "evaluation_type": "MARKS", "max_marks": 30, "min_required": 21, "obtained_marks": 22, "attempts_used": 1, "max_attempts": 2, "status_text": "PASSED"},
    {"stage_id": "L3-S1", "level": 3, "stage_num": 1, "title": "Technical Comprehensive Test", "description": "Test on syllabus and industry-based concepts", "evaluation_type": "MARKS", "max_marks": 25, "min_required": 15, "obtained_marks": 18, "attempts_used": 1, "max_attempts": 2, "status_text": "PASSED"},
    {"stage_id": "L3-S2", "level": 3, "stage_num": 2, "title": "Technical AI Mock Interview", "description": "Realistic, AI-evaluated interview simulation", "evaluation_type": "AI_MOCK", "max_marks": 0, "min_required": 0, "obtained_marks": 0, "attempts_used": 1, "max_attempts": 2, "status_text": "Hire"},
    {"stage_id": "L3-S3", "level": 3, "stage_num": 3, "title": "1-on-1 Session with Examiner", "description": "Domain fundamentals, resume deep-dive & placement readiness", "evaluation_type": "ONE_ON_ONE", "max_marks": 0, "min_required": 0, "obtained_marks": 0, "attempts_used": 0, "max_attempts": 2, "status_text": "No"},
]

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


class PortalSyncPayload(BaseModel):
    studentRoll: str = Field(default="21F3001013")
    trainingStages: list[TrainingStageDTO] = Field(default_factory=list)
    activitySubmissions: list[ActivitySubmissionDTO] = Field(default_factory=list)
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
        for item in DEFAULT_STAGE_ROWS:
            db.add(StudentTrainingStageRecord(student_roll=normalized_roll, **item))
        await db.flush()
        rows = (
            await db.execute(
                select(StudentTrainingStageRecord)
                .where(StudentTrainingStageRecord.student_roll == normalized_roll)
                .order_by(StudentTrainingStageRecord.level, StudentTrainingStageRecord.stage_num)
            )
        ).scalars().all()
    return list(rows)


async def _ensure_activities(db: AsyncSession) -> list[ActivityPointSubmissionRecord]:
    rows = (
        await db.execute(
            select(ActivityPointSubmissionRecord).order_by(ActivityPointSubmissionRecord.created_at.desc())
        )
    ).scalars().all()
    if not rows:
        for item in DEFAULT_ACTIVITIES:
            db.add(ActivityPointSubmissionRecord(**item))
        await db.flush()
        rows = (
            await db.execute(
                select(ActivityPointSubmissionRecord).order_by(ActivityPointSubmissionRecord.created_at.desc())
            )
        ).scalars().all()
    return list(rows)


@router.get("/bootstrap", response_model=PortalSyncPayload)
async def get_portal_bootstrap_state(
    student_roll: str = "21F3001013",
    db: AsyncSession = Depends(get_db),
) -> PortalSyncPayload:
    """Fetches persisted 3-level stages, activity evidence submissions, and portal collections from PostgreSQL."""
    normalized_roll = student_roll.strip().upper() or "21F3001013"
    stage_rows = await _ensure_roll_stages(db, normalized_roll)
    act_rows = await _ensure_activities(db)
    snap_row = (
        await db.execute(
            select(PortalStateSnapshot).where(PortalStateSnapshot.scope_key == "GLOBAL_PORTAL_STATE")
        )
    ).scalar_one_or_none()

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
        snapshot=snap_row.payload if snap_row else {},
    )


@router.put("/sync", response_model=dict[str, str])
async def sync_portal_state(
    payload: PortalSyncPayload,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Persists 3-level training attempts (max 2 attempts enforced), activity submissions, and portal state."""
    normalized_roll = payload.studentRoll.strip().upper() or "21F3001013"

    if payload.trainingStages:
        existing_stages = await _ensure_roll_stages(db, normalized_roll)
        stage_map = {s.stage_id: s for s in existing_stages}
        for st in payload.trainingStages:
            if st.attemptsUsed > 2:
                raise HTTPException(
                    status_code=409,
                    detail=f"Stage {st.id} exceeds maximum 2 attempts limit.",
                )
            rec = stage_map.get(st.id)
            if rec:
                rec.obtained_marks = st.obtainedMarks
                rec.attempts_used = st.attemptsUsed
                rec.status_text = st.statusText

    if payload.activitySubmissions is not None:
        await db.execute(delete(ActivityPointSubmissionRecord))
        for sub in payload.activitySubmissions:
            db.add(
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

    if payload.snapshot:
        snap_row = (
            await db.execute(
                select(PortalStateSnapshot).where(PortalStateSnapshot.scope_key == "GLOBAL_PORTAL_STATE")
            )
        ).scalar_one_or_none()
        if snap_row is None:
            db.add(PortalStateSnapshot(scope_key="GLOBAL_PORTAL_STATE", payload=payload.snapshot))
        else:
            snap_row.payload = payload.snapshot

    await db.flush()
    return {"status": "persisted", "student_roll": normalized_roll}
