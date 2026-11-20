import hashlib
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import ConfigurationSetting
from app.modules.iam.models import Role, RoleName, User, UserRole
from app.modules.student.models import ProgramLevel, ProgramType, Student, StudentProfile

ROLE_DESCRIPTIONS = {
    RoleName.STUDENT: "IITM BS Student candidate",
    RoleName.RECRUITER: "Corporate Hiring Manager / Talent Partner",
    RoleName.EXAMINER: "Technical Viva & Assessment Examiner",
    RoleName.PLACEMENT_COORDINATOR: "Student Placement Representative",
    RoleName.ADMIN: "Placement Cell Operations Admin",
    RoleName.SUPER_ADMIN: "System Super Administrator",
    RoleName.PROGRAM_COORDINATOR: "Academic Program & Training Coordinator",
}


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(f"iitm_career_os::{raw_password}".encode("utf-8")).hexdigest()


async def ensure_base_seed(db: AsyncSession) -> None:
    # 1. Ensure all RBAC roles exist
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

    default_pw_hash = hash_password("123456")

    # 3. Seed the 4 primary test users (Student, Examiner, Recruiter, Admin) with password "123456"
    seeded_accounts = [
        {
            "email": "22f3001013@ds.study.iitm.ac.in",
            "full_name": "Test Student (22F3001013)",
            "role": RoleName.STUDENT,
            "org_or_dept": "BS Data Science • Roll 22F3001013",
        },
        {
            "email": "shyam@ds.iitm.ac.in",
            "full_name": "Shyam (Viva Examiner)",
            "role": RoleName.EXAMINER,
            "org_or_dept": "Technical Viva & Assessment Panel",
        },
        {
            "email": "hr@ricoh.in",
            "full_name": "Ricoh India HR",
            "role": RoleName.RECRUITER,
            "org_or_dept": "Ricoh India • Talent Acquisition",
        },
        {
            "email": "lalit@iit.in",
            "full_name": "Lalit (Swiggy Talent Partner)",
            "role": RoleName.RECRUITER,
            "org_or_dept": "Swiggy • Campus & Lateral Hiring",
        },
        {
            "email": "coordinator@study.iitm.ac.in",
            "full_name": "Dr. Meera Nair (Training Coordinator)",
            "role": RoleName.PROGRAM_COORDINATOR,
            "org_or_dept": "IITM BS Career Readiness & Training Cell",
        },
        {
            "email": "placement.admin@iitm.ac.in",
            "full_name": "IITM Placement Admin",
            "role": RoleName.ADMIN,
            "org_or_dept": "IITM BS Placement Cell",
        },
    ]

    for acct in seeded_accounts:
        user = (await db.execute(select(User).where(User.email == acct["email"]))).scalar_one_or_none()
        if user is None:
            user = User(
                email=acct["email"],
                full_name=acct["full_name"],
                is_active=True,
                approval_status="APPROVED",
                organization_or_dept=acct["org_or_dept"],
                password_hash=default_pw_hash,
            )
            db.add(user)
            await db.flush()
            db.add(UserRole(user_id=user.id, role_id=existing_roles[acct["role"]].id, is_primary=True))
            await db.flush()
        else:
            user.is_active = True
            user.approval_status = "APPROVED"
            if not user.password_hash:
                user.password_hash = default_pw_hash

        if acct["role"] == RoleName.STUDENT:
            existing_stu = (await db.execute(select(Student).where(Student.user_id == user.id))).scalar_one_or_none()
            if existing_stu is None:
                student = Student(
                    user_id=user.id,
                    roll_number="22F3001013",
                    program=ProgramType.BS_DATA_SCIENCE,
                    current_level=ProgramLevel.BS,
                    cgpa=Decimal("8.85"),
                    active_backlogs=0,
                    graduation_year=2027,
                )
                db.add(student)
                await db.flush()
                db.add(
                    StudentProfile(
                        student_id=student.id,
                        headline="BS Data Science | ML & Software Systems Candidate",
                        city="Chennai",
                        state="Tamil Nadu",
                        preferred_roles="Data Scientist, Machine Learning Engineer, Software Developer",
                        preferred_locations="Bengaluru, Chennai, Hyderabad, Pune",
                    )
                )

    # 4. Keep legacy demo student account seeded for backward-compatible E2E tests
    demo_email = "22f3001234@ds.study.iitm.ac.in"
    demo_user = (await db.execute(select(User).where(User.email == demo_email))).scalar_one_or_none()
    if demo_user is None:
        demo_user = User(
            email=demo_email,
            full_name="Aarav Sharma",
            is_active=True,
            approval_status="APPROVED",
            organization_or_dept="BS Data Science • Roll 22F3001234",
            password_hash=default_pw_hash,
        )
        db.add(demo_user)
        await db.flush()

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
