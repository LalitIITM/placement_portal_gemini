import hashlib
import random
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.audit.service import record_audit_event
from app.modules.iam.models import RoleName
from app.modules.iam.security import CurrentPrincipal, require_roles
from app.modules.student.models import Student, StudentSkill
from app.modules.student.router import _get_or_create_student
from app.modules.training.models import (
    Course,
    CourseModule,
    ExaminerEvaluation,
    ModuleProgress,
    QuizAttempt,
    QuizDomain,
    QuizQuestionBank,
    QuizTrack,
    SkillBadge,
)
from app.shared.database import get_db

router = APIRouter(prefix="/api/v1/training", tags=["Training & Assessment"])

MAX_QUIZ_ATTEMPTS = 3  # BRULE-12
MAX_QUIZ_DURATION_SECONDS = 1800  # 30 minutes
QUESTIONS_PER_QUIZ = 15  # 15 randomly drawn questions per quiz


class QuestionBankCreateIn(BaseModel):
    domain: QuizDomain
    track: QuizTrack
    prompt: str = Field(..., min_length=5, max_length=2000)
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_index: int = Field(..., ge=0, le=3)
    difficulty: str = Field(default="MEDIUM", max_length=24)


class QuestionBankOut(BaseModel):
    id: str
    domain: QuizDomain
    track: QuizTrack
    prompt: str
    options: list[str]
    correct_index: int
    difficulty: str
    created_at: datetime


class QuestionPublicOut(BaseModel):
    id: str
    prompt: str
    options: list[str]


class QuizSessionStartOut(BaseModel):
    attempt_id: str
    attempt_number: int
    attempts_remaining_after: int
    time_limit_seconds: int
    questions: list[QuestionPublicOut]


class QuizSessionSubmitIn(BaseModel):
    answers: dict[str, int] = Field(default_factory=dict)
    termination_reason: Literal["NORMAL", "TIMEOUT", "TAB_SWITCH_VIOLATION"] = "NORMAL"
    elapsed_seconds: int = Field(default=0, ge=0)


class ExaminerEvaluationIn(BaseModel):
    student_roll_number: str = Field(..., min_length=2, max_length=32)
    skillsets_observed: list[str] = Field(..., min_length=1)
    programming_rating: int = Field(..., ge=1, le=5)
    data_science_rating: int = Field(..., ge=1, le=5)
    communication_rating: int = Field(..., ge=1, le=5)
    is_placement_ready: bool
    performing_exceptionally_good: bool = False
    remedial_tasks: list[str] = Field(default_factory=list)
    examiner_notes: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="after")
    def enforce_remedial_tasks_when_not_ready(self) -> "ExaminerEvaluationIn":
        cleaned = [t.strip() for t in self.remedial_tasks if t.strip()]
        self.remedial_tasks = cleaned
        if not self.is_placement_ready and len(cleaned) == 0:
            raise ValueError(
                "BRULE-18: At least one remedial task must be specified when is_placement_ready is False."
            )
        return self


class ExaminerEvaluationOut(BaseModel):
    id: str
    student_roll_number: str
    examiner_email: str
    skillsets_observed: list[str]
    programming_rating: int
    data_science_rating: int
    communication_rating: int
    is_placement_ready: bool
    performing_exceptionally_good: bool
    remedial_tasks: list[str]
    examiner_notes: Optional[str]
    evaluated_at: datetime


class ModuleOut(BaseModel):
    id: str
    sequence_order: int
    title: str
    duration_minutes: int
    summary: str
    completed: bool


class BadgeOut(BaseModel):
    id: str
    course_code: str
    course_title: str
    skill_name: str
    verification_code: str
    score_pct: int
    issued_at: datetime


class CourseOut(BaseModel):
    id: str
    code: str
    title: str
    category: str
    domain: QuizDomain
    track: QuizTrack
    skill_tag: str
    description: str
    pass_threshold_pct: int
    time_limit_seconds: int
    questions_per_quiz: int
    question_pool_size: int
    attempts_used: int
    max_attempts: int
    best_score_pct: Optional[int]
    badge: Optional[BadgeOut]
    modules: list[ModuleOut]


class AttemptResultOut(BaseModel):
    attempt_number: int
    attempts_remaining: int
    total_questions: int
    correct_count: int
    score_pct: int
    passed: bool
    termination_reason: str
    pass_threshold_pct: int
    badge: Optional[BadgeOut]


class BadgeVerificationOut(BaseModel):
    valid: bool
    verification_code: str
    skill_name: str
    course_code: str
    course_title: str
    student_roll_number: str
    score_pct: int
    issued_at: datetime


@router.get("/question-bank", response_model=list[QuestionBankOut])
async def list_question_bank(
    domain: Optional[QuizDomain] = Query(None),
    track: Optional[QuizTrack] = Query(None),
    principal: CurrentPrincipal = Depends(require_roles(RoleName.ADMIN, RoleName.RECRUITER)),
    db: AsyncSession = Depends(get_db),
) -> list[QuestionBankOut]:
    stmt = select(QuizQuestionBank).where(QuizQuestionBank.is_active.is_(True))
    if domain is not None:
        stmt = stmt.where(QuizQuestionBank.domain == domain)
    if track is not None:
        stmt = stmt.where(QuizQuestionBank.track == track)
    stmt = stmt.order_by(QuizQuestionBank.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [
        QuestionBankOut(
            id=str(q.id),
            domain=q.domain,
            track=q.track,
            prompt=q.prompt,
            options=q.options_json,
            correct_index=q.correct_index,
            difficulty=q.difficulty,
            created_at=q.created_at,
        )
        for q in rows
    ]


@router.post("/question-bank", response_model=QuestionBankOut, status_code=status.HTTP_201_CREATED)
async def add_question_to_bank(
    payload: QuestionBankCreateIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.ADMIN, RoleName.RECRUITER)),
    db: AsyncSession = Depends(get_db),
) -> QuestionBankOut:
    """Add a new MCQ question to the Data Science or Software Development question bank."""
    q = QuizQuestionBank(
        domain=payload.domain,
        track=payload.track,
        prompt=payload.prompt.strip(),
        options_json=[o.strip() for o in payload.options],
        correct_index=payload.correct_index,
        difficulty=payload.difficulty.strip().upper(),
        created_by=principal.user.id,
    )
    db.add(q)
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="QUESTION_BANK_ADDED",
        entity_type="QuizQuestionBank",
        entity_id=str(q.id),
        after_state={"domain": q.domain.value, "track": q.track.value, "difficulty": q.difficulty},
        ip_address=request.client.host if request.client else None,
    )

    return QuestionBankOut(
        id=str(q.id),
        domain=q.domain,
        track=q.track,
        prompt=q.prompt,
        options=q.options_json,
        correct_index=q.correct_index,
        difficulty=q.difficulty,
        created_at=q.created_at,
    )


@router.post(
    "/question-bank/bulk",
    response_model=dict[str, int],
    status_code=status.HTTP_201_CREATED,
)
async def bulk_add_questions_to_bank(
    items: list[QuestionBankCreateIn],
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.ADMIN, RoleName.RECRUITER)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """Bulk import MCQ questions into the Data Science / Software Development question bank."""
    if not items:
        raise HTTPException(status_code=400, detail="Provide at least one question.")
    for item in items:
        db.add(
            QuizQuestionBank(
                domain=item.domain,
                track=item.track,
                prompt=item.prompt.strip(),
                options_json=[o.strip() for o in item.options],
                correct_index=item.correct_index,
                difficulty=item.difficulty.strip().upper(),
                created_by=principal.user.id,
            )
        )
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="QUESTION_BANK_BULK_IMPORTED",
        entity_type="QuizQuestionBank",
        entity_id="BULK",
        after_state={"inserted_count": len(items)},
        ip_address=request.client.host if request.client else None,
    )
    return {"inserted": len(items)}


@router.get("/courses", response_model=list[CourseOut])
async def list_training_courses(
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> list[CourseOut]:
    student = await _get_or_create_student(db, principal)
    courses = (
        await db.execute(select(Course).options(selectinload(Course.modules)).order_by(Course.code))
    ).scalars().all()

    completed_ids = set(
        (
            await db.execute(
                select(ModuleProgress.module_id).where(ModuleProgress.student_id == student.id)
            )
        )
        .scalars()
        .all()
    )
    attempts = (
        await db.execute(select(QuizAttempt).where(QuizAttempt.student_id == student.id))
    ).scalars().all()
    badges = (
        await db.execute(select(SkillBadge).where(SkillBadge.student_id == student.id))
    ).scalars().all()

    badge_by_course = {b.course_id: b for b in badges}
    results: list[CourseOut] = []

    for c in courses:
        pool_count = (
            await db.execute(
                select(func.count(QuizQuestionBank.id)).where(
                    QuizQuestionBank.domain == c.domain,
                    QuizQuestionBank.track == c.track,
                    QuizQuestionBank.is_active.is_(True),
                )
            )
        ).scalar_one()

        c_attempts = [a for a in attempts if a.course_id == c.id]
        best = max((a.score_pct for a in c_attempts), default=None)
        b = badge_by_course.get(c.id)
        badge_out = (
            BadgeOut(
                id=str(b.id),
                course_code=c.code,
                course_title=c.title,
                skill_name=b.skill_name,
                verification_code=b.verification_code,
                score_pct=b.score_pct,
                issued_at=b.issued_at,
            )
            if b
            else None
        )
        results.append(
            CourseOut(
                id=str(c.id),
                code=c.code,
                title=c.title,
                category=c.category,
                domain=c.domain,
                track=c.track,
                skill_tag=c.skill_tag,
                description=c.description,
                pass_threshold_pct=c.pass_threshold_pct,
                time_limit_seconds=c.time_limit_seconds,
                questions_per_quiz=c.questions_per_quiz,
                question_pool_size=pool_count,
                attempts_used=len(c_attempts),
                max_attempts=MAX_QUIZ_ATTEMPTS,
                best_score_pct=best,
                badge=badge_out,
                modules=[
                    ModuleOut(
                        id=str(m.id),
                        sequence_order=m.sequence_order,
                        title=m.title,
                        duration_minutes=m.duration_minutes,
                        summary=m.summary,
                        completed=m.id in completed_ids,
                    )
                    for m in c.modules
                ],
            )
        )
    return results


@router.post("/modules/{module_id}/complete", status_code=status.HTTP_200_OK)
async def complete_course_module(
    module_id: uuid.UUID,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    student = await _get_or_create_student(db, principal)
    module = (
        await db.execute(select(CourseModule).where(CourseModule.id == module_id))
    ).scalar_one_or_none()
    if module is None:
        raise HTTPException(status_code=404, detail="Course module not found")

    existing = (
        await db.execute(
            select(ModuleProgress).where(
                ModuleProgress.student_id == student.id,
                ModuleProgress.module_id == module.id,
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        db.add(ModuleProgress(student_id=student.id, module_id=module.id))
        await db.flush()
        await record_audit_event(
            db,
            actor_id=principal.user.id,
            actor_role=principal.active_role.value,
            action="MODULE_COMPLETED",
            entity_type="CourseModule",
            entity_id=str(module.id),
            after_state={"title": module.title},
            ip_address=request.client.host if request.client else None,
        )

    return {"status": "completed", "module_id": str(module.id)}


@router.post("/courses/{course_id}/sessions/start", response_model=QuizSessionStartOut)
async def start_random_quiz_session(
    course_id: uuid.UUID,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> QuizSessionStartOut:
    """Draws 15 random questions from the course's (domain, track) question bank & arms 30m timer."""
    student = await _get_or_create_student(db, principal)
    course = (
        await db.execute(select(Course).where(Course.id == course_id))
    ).scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Training course not found")

    prior_attempts = (
        await db.execute(
            select(QuizAttempt).where(
                QuizAttempt.student_id == student.id,
                QuizAttempt.course_id == course.id,
            )
        )
    ).scalars().all()

    if len(prior_attempts) >= MAX_QUIZ_ATTEMPTS:
        await record_audit_event(
            db,
            actor_id=principal.user.id,
            actor_role=principal.active_role.value,
            action="BRULE_12_BLOCKED",
            entity_type="Course",
            entity_id=str(course.id),
            after_state={"course_code": course.code, "attempts_used": len(prior_attempts)},
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"BRULE-12: Maximum of {MAX_QUIZ_ATTEMPTS} assessment attempts reached for {course.code}.",
        )

    pool = (
        await db.execute(
            select(QuizQuestionBank).where(
                QuizQuestionBank.domain == course.domain,
                QuizQuestionBank.track == course.track,
                QuizQuestionBank.is_active.is_(True),
            )
        )
    ).scalars().all()

    draw_count = min(course.questions_per_quiz, len(pool))
    if draw_count == 0:
        raise HTTPException(status_code=400, detail="No questions available in this domain/track bank.")

    drawn = random.sample(list(pool), k=draw_count)
    attempt_number = len(prior_attempts) + 1

    attempt = QuizAttempt(
        student_id=student.id,
        course_id=course.id,
        attempt_number=attempt_number,
        drawn_question_ids=[str(q.id) for q in drawn],
        score_pct=0,
        passed=False,
        termination_reason="IN_PROGRESS",
        elapsed_seconds=0,
    )
    db.add(attempt)
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="ASSESSMENT_SESSION_STARTED",
        entity_type="QuizAttempt",
        entity_id=str(attempt.id),
        after_state={
            "course_code": course.code,
            "domain": course.domain.value,
            "track": course.track.value,
            "attempt_number": attempt_number,
            "questions_drawn": draw_count,
        },
        ip_address=request.client.host if request.client else None,
    )

    return QuizSessionStartOut(
        attempt_id=str(attempt.id),
        attempt_number=attempt_number,
        attempts_remaining_after=MAX_QUIZ_ATTEMPTS - attempt_number,
        time_limit_seconds=course.time_limit_seconds,
        questions=[
            QuestionPublicOut(id=str(q.id), prompt=q.prompt, options=q.options_json) for q in drawn
        ],
    )


@router.post("/quiz-sessions/{attempt_id}/submit", response_model=AttemptResultOut)
async def submit_random_quiz_session(
    attempt_id: uuid.UUID,
    payload: QuizSessionSubmitIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> AttemptResultOut:
    """Auto-evaluates the 15 randomly drawn questions with 30m timer & tab-switch auto-fail."""
    student = await _get_or_create_student(db, principal)
    attempt = (
        await db.execute(
            select(QuizAttempt).where(
                QuizAttempt.id == attempt_id,
                QuizAttempt.student_id == student.id,
            )
        )
    ).scalar_one_or_none()
    if attempt is None:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    if attempt.termination_reason != "IN_PROGRESS":
        raise HTTPException(status_code=409, detail="This quiz session has already been finalized.")

    course = (
        await db.execute(select(Course).where(Course.id == attempt.course_id))
    ).scalar_one()

    effective_reason = payload.termination_reason
    if effective_reason == "NORMAL" and payload.elapsed_seconds > MAX_QUIZ_DURATION_SECONDS:
        effective_reason = "TIMEOUT"

    drawn_uuids = [uuid.UUID(qid) for qid in attempt.drawn_question_ids]
    q_rows = (
        await db.execute(select(QuizQuestionBank).where(QuizQuestionBank.id.in_(drawn_uuids)))
    ).scalars().all()
    q_map = {str(q.id): q for q in q_rows}
    total_questions = len(attempt.drawn_question_ids)

    if effective_reason == "TAB_SWITCH_VIOLATION":
        correct_count = 0
        score_pct = 0
        passed = False
    else:
        correct_count = sum(
            1
            for qid in attempt.drawn_question_ids
            if qid in q_map and payload.answers.get(qid) == q_map[qid].correct_index
        )
        score_pct = round((correct_count / max(1, total_questions)) * 100)
        passed = effective_reason == "NORMAL" and score_pct >= course.pass_threshold_pct

    attempt.score_pct = score_pct
    attempt.passed = passed
    attempt.termination_reason = effective_reason
    attempt.elapsed_seconds = payload.elapsed_seconds
    attempt.submitted_at = datetime.now(timezone.utc)
    await db.flush()

    badge_out: Optional[BadgeOut] = None
    existing_badge = (
        await db.execute(
            select(SkillBadge).where(
                SkillBadge.student_id == student.id,
                SkillBadge.course_id == course.id,
            )
        )
    ).scalar_one_or_none()

    if passed and existing_badge is None:
        digest = hashlib.sha256(
            f"{student.id}:{course.id}:{attempt.id}".encode("utf-8")
        ).hexdigest()[:10].upper()
        verification_code = f"BADGE-IITM-{course.code.replace('-', '')}-{digest}"
        existing_badge = SkillBadge(
            student_id=student.id,
            course_id=course.id,
            verification_code=verification_code,
            skill_name=course.skill_tag,
            score_pct=score_pct,
        )
        db.add(existing_badge)

        matching_skill = next(
            (s for s in student.skills if s.skill_name.lower() == course.skill_tag.lower()),
            None,
        )
        if matching_skill:
            matching_skill.is_verified = True
        else:
            db.add(
                StudentSkill(
                    student_id=student.id,
                    skill_name=course.skill_tag,
                    proficiency="VERIFIED",
                    is_verified=True,
                )
            )
        await db.flush()

        await record_audit_event(
            db,
            actor_id=principal.user.id,
            actor_role=principal.active_role.value,
            action="BADGE_ISSUED",
            entity_type="SkillBadge",
            entity_id=str(existing_badge.id),
            after_state={
                "verification_code": verification_code,
                "skill_name": course.skill_tag,
                "score_pct": score_pct,
            },
            ip_address=request.client.host if request.client else None,
        )

    audit_action = (
        "ASSESSMENT_TAB_VIOLATION"
        if effective_reason == "TAB_SWITCH_VIOLATION"
        else (
            "ASSESSMENT_TIMEOUT"
            if effective_reason == "TIMEOUT"
            else ("ASSESSMENT_PASSED" if passed else "ASSESSMENT_FAILED")
        )
    )
    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action=audit_action,
        entity_type="QuizAttempt",
        entity_id=str(attempt.id),
        after_state={
            "course_code": course.code,
            "attempt_number": attempt.attempt_number,
            "correct_count": correct_count,
            "total_questions": total_questions,
            "score_pct": score_pct,
            "passed": passed,
            "termination_reason": effective_reason,
        },
        ip_address=request.client.host if request.client else None,
    )

    if existing_badge is not None:
        badge_out = BadgeOut(
            id=str(existing_badge.id),
            course_code=course.code,
            course_title=course.title,
            skill_name=existing_badge.skill_name,
            verification_code=existing_badge.verification_code,
            score_pct=existing_badge.score_pct,
            issued_at=existing_badge.issued_at,
        )

    return AttemptResultOut(
        attempt_number=attempt.attempt_number,
        attempts_remaining=MAX_QUIZ_ATTEMPTS - attempt.attempt_number,
        total_questions=total_questions,
        correct_count=correct_count,
        score_pct=score_pct,
        passed=passed,
        termination_reason=effective_reason,
        pass_threshold_pct=course.pass_threshold_pct,
        badge=badge_out,
    )


@router.post(
    "/examiner/evaluations",
    response_model=ExaminerEvaluationOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_examiner_evaluation(
    payload: ExaminerEvaluationIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.ADMIN, RoleName.RECRUITER)),
    db: AsyncSession = Depends(get_db),
) -> ExaminerEvaluationOut:
    """Final stage interview evaluation by examiner with 1-5 skill ratings & remedial tasks."""
    roll = payload.student_roll_number.strip().upper()
    student = (
        await db.execute(select(Student).where(Student.roll_number == roll))
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail=f"Student roll number '{roll}' not found")

    evaluation = ExaminerEvaluation(
        student_id=student.id,
        examiner_id=principal.user.id,
        examiner_email=principal.user.email,
        skillsets_observed=[s.strip() for s in payload.skillsets_observed if s.strip()],
        programming_rating=payload.programming_rating,
        data_science_rating=payload.data_science_rating,
        communication_rating=payload.communication_rating,
        is_placement_ready=payload.is_placement_ready,
        performing_exceptionally_good=payload.performing_exceptionally_good,
        remedial_tasks=payload.remedial_tasks,
        examiner_notes=payload.examiner_notes,
    )
    db.add(evaluation)
    await db.flush()

    await record_audit_event(
        db,
        actor_id=principal.user.id,
        actor_role=principal.active_role.value,
        action="EXAMINER_INTERVIEW_EVALUATED",
        entity_type="ExaminerEvaluation",
        entity_id=str(evaluation.id),
        after_state={
            "student_roll_number": roll,
            "programming_rating": evaluation.programming_rating,
            "data_science_rating": evaluation.data_science_rating,
            "communication_rating": evaluation.communication_rating,
            "is_placement_ready": evaluation.is_placement_ready,
            "performing_exceptionally_good": evaluation.performing_exceptionally_good,
            "remedial_tasks_count": len(evaluation.remedial_tasks),
        },
        ip_address=request.client.host if request.client else None,
    )

    return ExaminerEvaluationOut(
        id=str(evaluation.id),
        student_roll_number=roll,
        examiner_email=evaluation.examiner_email,
        skillsets_observed=evaluation.skillsets_observed,
        programming_rating=evaluation.programming_rating,
        data_science_rating=evaluation.data_science_rating,
        communication_rating=evaluation.communication_rating,
        is_placement_ready=evaluation.is_placement_ready,
        performing_exceptionally_good=evaluation.performing_exceptionally_good,
        remedial_tasks=evaluation.remedial_tasks,
        examiner_notes=evaluation.examiner_notes,
        evaluated_at=evaluation.evaluated_at,
    )


@router.get("/examiner/evaluations/me", response_model=list[ExaminerEvaluationOut])
async def get_my_examiner_evaluations(
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> list[ExaminerEvaluationOut]:
    student = await _get_or_create_student(db, principal)
    rows = (
        await db.execute(
            select(ExaminerEvaluation)
            .where(ExaminerEvaluation.student_id == student.id)
            .order_by(ExaminerEvaluation.evaluated_at.desc())
        )
    ).scalars().all()
    return [
        ExaminerEvaluationOut(
            id=str(e.id),
            student_roll_number=student.roll_number,
            examiner_email=e.examiner_email,
            skillsets_observed=e.skillsets_observed,
            programming_rating=e.programming_rating,
            data_science_rating=e.data_science_rating,
            communication_rating=e.communication_rating,
            is_placement_ready=e.is_placement_ready,
            performing_exceptionally_good=e.performing_exceptionally_good,
            remedial_tasks=e.remedial_tasks,
            examiner_notes=e.examiner_notes,
            evaluated_at=e.evaluated_at,
        )
        for e in rows
    ]


@router.get("/badges/verify/{verification_code}", response_model=BadgeVerificationOut)
async def verify_skill_badge(
    verification_code: str,
    db: AsyncSession = Depends(get_db),
) -> BadgeVerificationOut:
    """Public credential verification endpoint for recruiters and placement admins."""
    row = (
        await db.execute(
            select(SkillBadge, Course, Student)
            .join(Course, SkillBadge.course_id == Course.id)
            .join(Student, SkillBadge.student_id == Student.id)
            .where(SkillBadge.verification_code == verification_code.strip().upper())
        )
    ).first()

    if row is None:
        raise HTTPException(status_code=404, detail="Skill badge verification code not found")

    badge, course, student = row
    return BadgeVerificationOut(
        valid=True,
        verification_code=badge.verification_code,
        skill_name=badge.skill_name,
        course_code=course.code,
        course_title=course.title,
        student_roll_number=student.roll_number,
        score_pct=badge.score_pct,
        issued_at=badge.issued_at,
    )
