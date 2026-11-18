import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.modules.iam.seed import ensure_base_seed
from app.modules.recruitment.seed import ensure_recruitment_seed
from app.modules.training.seed import ensure_training_seed
from app.shared.database import AsyncSessionLocal, Base, engine


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await ensure_base_seed(session)
        await ensure_training_seed(session)
        await ensure_recruitment_seed(session)
        await session.commit()
    yield


@pytest.mark.asyncio
async def test_eligibility_engine_and_application_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Student (default seeded level = DIPLOMA, CGPA = 8.25, no examiner eval yet)
        stu_login = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "22f3001234@ds.study.iitm.ac.in",
                "full_name": "Aarav Sharma",
                "role": "STUDENT",
            },
        )
        stu_headers = {"Authorization": f"Bearer {stu_login.json()['access_token']}"}

        # Upload a resume so it attaches to the application
        await client.post(
            "/api/v1/students/me/resumes",
            json={
                "label": "DS_Resume",
                "file_name": "Aarav_DS_2026.pdf",
                "file_size_bytes": 240000,
                "is_default": True,
            },
            headers=stu_headers,
        )

        # 2. List jobs with live eligibility evaluation
        jobs_res = await client.get("/api/v1/recruitment/jobs", headers=stu_headers)
        assert jobs_res.status_code == 200
        jobs = jobs_res.json()
        assert len(jobs) == 4

        flipkart_intern = next(j for j in jobs if j["job_code"] == "DRV-2026-FLIPKART-INT")
        fractal_ft = next(j for j in jobs if j["job_code"] == "DRV-2026-FRACTAL")

        # Student IS eligible for Flipkart Internship (CGPA 8.25 >= 7.50, DIPLOMA allowed)
        assert flipkart_intern["eligibility"]["eligible"] is True

        # Student is NOT eligible for Fractal Full-Time (requires BSC/BS, examiner readiness & badge)
        assert fractal_ft["eligibility"]["eligible"] is False
        assert len(fractal_ft["eligibility"]["reasons"]) >= 2

        # 3. Attempting to apply to ineligible job returns 403 with rule reasons
        blocked_apply = await client.post(
            f"/api/v1/recruitment/jobs/{fractal_ft['id']}/apply",
            json={"cover_note": "Interested in Data Science"},
            headers=stu_headers,
        )
        assert blocked_apply.status_code == 403

        # 4. Applying to eligible Flipkart Internship succeeds (201)
        ok_apply = await client.post(
            f"/api/v1/recruitment/jobs/{flipkart_intern['id']}/apply",
            json={"cover_note": "Strong SQL and ML pipeline experience"},
            headers=stu_headers,
        )
        assert ok_apply.status_code == 201
        app_data = ok_apply.json()
        assert app_data["resume_file_name"] == "Aarav_DS_2026.pdf"
        assert app_data["status"] == "APPLIED"

        # 5. Duplicate application returns 409 Conflict
        dup_apply = await client.post(
            f"/api/v1/recruitment/jobs/{flipkart_intern['id']}/apply",
            json={},
            headers=stu_headers,
        )
        assert dup_apply.status_code == 409

        # 6. Switch to RECRUITER role, post a new drive, and shortlist the applicant
        rec_switch = await client.post(
            "/api/v1/auth/switch-role",
            json={"target_role": "RECRUITER"},
            headers=stu_headers,
        )
        rec_headers = {"Authorization": f"Bearer {rec_switch.json()['access_token']}"}

        new_job = await client.post(
            "/api/v1/recruitment/jobs",
            json={
                "job_code": "DRV-2026-SWIGGY-INT",
                "company_name": "Swiggy",
                "title": "Data Science Intern — Logistics",
                "role_type": "INTERNSHIP",
                "domain": "DATA_SCIENCE",
                "location": "Bengaluru",
                "compensation_label": "₹60,000 / month",
                "description": "ETA prediction and hyperlocal dispatch optimization.",
                "min_cgpa": "7.50",
                "max_active_backlogs": 0,
                "allowed_levels": ["DIPLOMA", "BSC", "BS"],
                "require_placement_readiness": False,
                "required_skill_tags": [],
            },
            headers=rec_headers,
        )
        assert new_job.status_code == 201

        shortlist_res = await client.patch(
            f"/api/v1/recruitment/applications/{app_data['id']}/status",
            json={"status": "SHORTLISTED", "recruiter_remarks": "Strong IITM BS profile"},
            headers=rec_headers,
        )
        assert shortlist_res.status_code == 200
        assert shortlist_res.json()["status"] == "SHORTLISTED"
