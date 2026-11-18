from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.recruitment.models import JobDomain, JobPosting, JobRoleType, JobStatus

SEED_JOBS = [
    {
        "job_code": "DRV-2026-FRACTAL",
        "company_name": "Fractal Analytics",
        "title": "Applied Data Scientist — Decision Sciences",
        "role_type": JobRoleType.FULL_TIME,
        "domain": JobDomain.DATA_SCIENCE,
        "location": "Bengaluru / Mumbai (Hybrid)",
        "compensation_label": "₹16.5 LPA",
        "description": "Build production forecasting, propensity modeling, and causal inference pipelines for Fortune 500 clients.",
        "min_cgpa": Decimal("8.00"),
        "max_active_backlogs": 0,
        "allowed_levels": ["BSC", "BS"],
        "require_placement_readiness": True,
        "required_skill_tags": ["Production ML & Data Engineering"],
    },
    {
        "job_code": "DRV-2026-RAZORPAY",
        "company_name": "Razorpay",
        "title": "Software Development Engineer I (Backend)",
        "role_type": JobRoleType.FULL_TIME,
        "domain": JobDomain.SOFTWARE_DEVELOPMENT,
        "location": "Bengaluru",
        "compensation_label": "₹22.0 LPA",
        "description": "Design high-throughput payment orchestration APIs, idempotent ledgers, and distributed microservices.",
        "min_cgpa": Decimal("8.20"),
        "max_active_backlogs": 0,
        "allowed_levels": ["BSC", "BS"],
        "require_placement_readiness": True,
        "required_skill_tags": ["Full-Stack & Distributed SDE"],
    },
    {
        "job_code": "DRV-2026-FLIPKART-INT",
        "company_name": "Flipkart",
        "title": "Data Science & Analytics Intern (6 Months)",
        "role_type": JobRoleType.INTERNSHIP,
        "domain": JobDomain.DATA_SCIENCE,
        "location": "Bengaluru",
        "compensation_label": "₹75,000 / month",
        "description": "Work with supply-chain ML teams on demand forecasting, anomaly detection, and experimentation.",
        "min_cgpa": Decimal("7.50"),
        "max_active_backlogs": 0,
        "allowed_levels": ["DIPLOMA", "BSC", "BS"],
        "require_placement_readiness": False,
        "required_skill_tags": [],
    },
    {
        "job_code": "DRV-2026-ZOHO-INT",
        "company_name": "Zoho Corporation",
        "title": "Software Developer Intern",
        "role_type": JobRoleType.INTERNSHIP,
        "domain": JobDomain.SOFTWARE_DEVELOPMENT,
        "location": "Chennai",
        "compensation_label": "₹45,000 / month",
        "description": "Build full-stack cloud productivity applications, REST APIs, and relational query optimizations.",
        "min_cgpa": Decimal("7.00"),
        "max_active_backlogs": 1,
        "allowed_levels": ["DIPLOMA", "BSC", "BS"],
        "require_placement_readiness": False,
        "required_skill_tags": [],
    },
]


async def ensure_recruitment_seed(session: AsyncSession) -> None:
    existing = (await session.execute(select(JobPosting.id).limit(1))).scalar_one_or_none()
    if existing is not None:
        return

    for item in SEED_JOBS:
        session.add(JobPosting(status=JobStatus.OPEN, **item))
    await session.flush()
