import hashlib
import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.audit.service import record_audit_event
from app.modules.iam.models import RoleName
from app.modules.iam.security import CurrentPrincipal, require_roles
from app.modules.student.models import StudentSkill
from app.modules.student.router import _get_or_create_student
from app.modules.training.models import (
    Course,
    CourseModule,
    ModuleProgress,
    QuizAttempt,
    SkillBadge,
)
from app.shared.database import get_db

router = APIRouter(prefix="/api/v1/training", tags=["Training & Assessment"])

MAX_QUIZ_ATTEMPTS = 3  # BRULE-12
MAX_QUIZ_DURATION_SECONDS = 1800  # 30 minutes


class QuizSubmissionIn(BaseModel):
    answers: list[int] = Field(default_factory=list)
    termination_reason: Literal["NORMAL", "TIMEOUT", "TAB_SWITCH_VIOLATION"] = "NORMAL"
    elapsed_seconds: int = Field(default=0, ge=0)


class ModuleOut(BaseModel):
    id: str
    sequence_order: int
    title: str
    duration_minutes: int
    summary: str
    completed: bool


class QuestionPublicOut(BaseModel):
    id: str
    prompt: str
    options: list[str]


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
    skill_tag: str
    description: str
    pass_threshold_pct: int
    time_limit_seconds: int
    attempts_used: int
    max_attempts: int
    best_score_pct: Optional[int]
    badge: Optional[BadgeOut]
    modules: list[ModuleOut]
    questions: list[QuestionPublicOut]


class AttemptResultOut(BaseModel):
    attempt_number: int
    attempts_remaining: int
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
                skill_tag=c.skill_tag,
                description=c.description,
                pass_threshold_pct=c.pass_threshold_pct,
                time_limit_seconds=c.time_limit_seconds,
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
                questions=[
                    QuestionPublicOut(id=q["id"], prompt=q["prompt"], options=q["options"])
                    for q in c.questions_json
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


@router.post("/courses/{course_id}/attempt", response_model=AttemptResultOut)
async def submit_quiz_attempt(
    course_id: uuid.UUID,
    payload: QuizSubmissionIn,
    request: Request,
    principal: CurrentPrincipal = Depends(require_roles(RoleName.STUDENT)),
    db: AsyncSession = Depends(get_db),
) -> AttemptResultOut:
    """Enforces BRULE-12 (3-attempt cap), 30m timer, and tab-switch auto-fail proctoring."""
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

    questions = course.questions_json
    effective_reason = payload.termination_reason
    if effective_reason == "NORMAL" and payload.elapsed_seconds > MAX_QUIZ_DURATION_SECONDS:
        effective_reason = "TIMEOUT"

    if effective_reason == "TAB_SWITCH_VIOLATION":
        score_pct = 0
        passed = False
    else:
        if effective_reason == "NORMAL" and len(payload.answers) != len(questions):
            raise HTTPException(
                status_code=400,
                detail=f"Expected {len(questions)} answers, received {len(payload.answers)}.",
            )
        correct_count = sum(
            1
            for idx, q in enumerate(questions)
            if idx < len(payload.answers) and payload.answers[idx] == q["correct_index"]
        )
        score_pct = round((correct_count / len(questions)) * 100)
        passed = effective_reason == "NORMAL" and score_pct >= course.pass_threshold_pct

    attempt_number = len(prior_attempts) + 1
    attempt = QuizAttempt(
        student_id=student.id,
        course_id=course.id,
        attempt_number=attempt_number,
        score_pct=score_pct,
        passed=passed,
        termination_reason=effective_reason,
        elapsed_seconds=payload.elapsed_seconds,
    )
    db.add(attempt)
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
        else ("ASSESSMENT_TIMEOUT" if effective_reason == "TIMEOUT" else ("ASSESSMENT_PASSED" if passed else "ASSESSMENT_FAILED"))
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
            "attempt_number": attempt_number,
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
        attempt_number=attempt_number,
        attempts_remaining=MAX_QUIZ_ATTEMPTS - attempt_number,
        score_pct=score_pct,
        passed=passed,
        termination_reason=effective_reason,
        pass_threshold_pct=course.pass_threshold_pct,
        badge=badge_out,
    )


@router.get("/badges/verify/{verification_code}", response_model=BadgeVerificationOut)
async def verify_skill_badge(
    verification_code: str,
    db: AsyncSession = Depends(get_db),
) -> BadgeVerificationOut:
    """Public credential verification endpoint for recruiters and placement admins."""
    from app.modules.student.models import Student

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
