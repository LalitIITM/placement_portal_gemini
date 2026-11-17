from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import ConfigurationSetting
from app.modules.iam.models import Role, RoleName, User, UserRole
from app.modules.student.models import ProgramLevel, ProgramType, Student, StudentProfile

ROLE_DESCRIPTIONS = {
    RoleName.STUDENT: "IITM BS Student candidate",
    RoleName.RECRUITER: "Corporate Hiring Manager / Talent Partner",
    RoleName.PLACEMENT_COORDINATOR: "Student Placement Representative",
    RoleName.ADMIN: "Placement Cell Operations Admin",
    RoleName.SUPER_ADMIN: "System Super Administrator",
    RoleName.PROGRAM_COORDINATOR: "Academic Program & Training Coordinator",
}


async def ensure_base_seed(db: AsyncSession) -> None:
    # 1. Ensure all 6 RBAC roles exist
    existing_roles = {r.name: r for r in (await db.execute(select(Role))).scalars().all()}
    for role_name, desc in ROLE_DESCRIPTIONS.items():
        if role_name not in existing_roles:
            role = Role(name=role_name, description=desc)
            db.add(role)
            existing_roles[role_name] = role
    await db.flush()

    # 2. Ensure core ConfigurationSettings exist
    defaults = [
        ("max_active_resumes", {"value": 3}, "Maximum active resumes per student (BRULE-55)"),
        ("session_timeout_minutes", {"value": 30}, "Sliding inactivity timeout in minutes (BRULE-03)"),
    ]
    for key, val, desc in defaults:
        if await db.get(ConfigurationSetting, key) is None:
            db.add(ConfigurationSetting(key=key, value_json=val, description=desc))

    # 3. Seed demo multi-role user for immediate local/staging verification
    demo_email = "22f3001234@ds.study.iitm.ac.in"
    demo_user = (await db.execute(select(User).where(User.email == demo_email))).scalar_one_or_none()
    if demo_user is None:
        demo_user = User(
            email=demo_email,
            full_name="Aarav Sharma",
            is_active=True,
        )
        db.add(demo_user)
        await db.flush()

        # Assign STUDENT (primary) + PLACEMENT_COORDINATOR + ADMIN for role-switching demos
        db.add(UserRole(user_id=demo_user.id, role_id=existing_roles[RoleName.STUDENT].id, is_primary=True))
        db.add(UserRole(user_id=demo_user.id, role_id=existing_roles[RoleName.PLACEMENT_COORDINATOR].id, is_primary=False))
        db.add(UserRole(user_id=demo_user.id, role_id=existing_roles[RoleName.ADMIN].id, is_primary=False))

        student = Student(
            user_id=demo_user.id,
            roll_number="22F3001234",
            program=ProgramType.BS_DATA_SCIENCE,
            current_level=ProgramLevel.BS,
            cgpa=Decimal("8.92"),
            active_backlogs=0,
            graduation_year=2027,
        )
        db.add(student)
        await db.flush()

        db.add(
            StudentProfile(
                student_id=student.id,
                headline="BS Data Science Senior | ML Systems & Full-Stack Engineering",
                city="Chennai",
                state="Tamil Nadu",
                preferred_roles="Machine Learning Engineer, Data Scientist, Backend Engineer",
                preferred_locations="Bengaluru, Hyderabad, Chennai, Remote",
            )
        )
    await db.flush()
