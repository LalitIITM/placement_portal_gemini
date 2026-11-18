import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.modules.iam.seed import ensure_base_seed
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
        await session.commit()
    yield


@pytest.mark.asyncio
async def test_full_student_registration_marksheet_and_social_handles():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "22f3001234@ds.study.iitm.ac.in",
                "full_name": "Aarav Sharma",
                "role": "STUDENT",
            },
        )
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # 1. Working professional = True without company/experience must fail validation (422)
        invalid_reg = await client.put(
            "/api/v1/students/me/registration",
            json={
                "full_name": "Aarav Sharma",
                "cgpa": "9.10",
                "gender": "MALE",
                "mobile_number": "+919876543210",
                "personal_email": "aarav.personal@gmail.com",
                "state": "Maharashtra",
                "category": "OBC_NCL",
                "degree_type": "DUAL_DEGREE",
                "is_working_professional": True,
            },
            headers=headers,
        )
        assert invalid_reg.status_code == 422

        # 2. Complete valid registration with working professional details
        valid_reg = await client.put(
            "/api/v1/students/me/registration",
            json={
                "full_name": "Aarav Sharma",
                "cgpa": "9.14",
                "gender": "MALE",
                "mobile_number": "+919876543210",
                "personal_email": "aarav.personal@gmail.com",
                "state": "Maharashtra",
                "category": "OBC_NCL",
                "degree_type": "DUAL_DEGREE",
                "is_working_professional": True,
                "years_of_experience": "2.5",
                "work_domain": "DATA_SCIENCE",
                "present_company": "Fractal Analytics",
            },
            headers=headers,
        )
        assert valid_reg.status_code == 200
        data = valid_reg.json()
        assert data["cgpa"] == "9.14"
        assert data["degree_type"] == "DUAL_DEGREE"
        assert data["profile"]["category"] == "OBC_NCL"
        assert data["profile"]["state"] == "Maharashtra"
        assert data["profile"]["is_working_professional"] is True
        assert data["profile"]["work_domain"] == "DATA_SCIENCE"
        assert data["profile"]["present_company"] == "Fractal Analytics"

        # 3. Update LinkedIn ID, GitHub username, and Kaggle username
        prof_res = await client.patch(
            "/api/v1/students/me/profile",
            json={
                "linkedin_url": "aarav-sharma-iitm",
                "github_url": "aarav-dev",
                "kaggle_url": "aaravml",
            },
            headers=headers,
        )
        assert prof_res.status_code == 200
        assert prof_res.json()["profile"]["kaggle_url"] == "aaravml"


@pytest.mark.asyncio
async def test_examiner_final_interview_evaluation_and_remedial_tasks():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Student registers so roll number 22F3001234 exists
        stu_login = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "22f3001234@ds.study.iitm.ac.in",
                "full_name": "Aarav Sharma",
                "role": "STUDENT",
            },
        )
        stu_token = stu_login.json()["access_token"]
        stu_headers = {"Authorization": f"Bearer {stu_token}"}
        await client.get("/api/v1/students/me", headers=stu_headers)

        # 2. Switch role to ADMIN (Examiner)
        admin_switch = await client.post(
            "/api/v1/auth/switch-role",
            json={"target_role": "ADMIN"},
            headers=stu_headers,
        )
        examiner_headers = {"Authorization": f"Bearer {admin_switch.json()['access_token']}"}

        # 3. Marking Not Ready without remedial tasks fails (422)
        missing_tasks = await client.post(
            "/api/v1/training/examiner/evaluations",
            json={
                "student_roll_number": "22F3001234",
                "skillsets_observed": ["Python", "SQL"],
                "programming_rating": 2,
                "data_science_rating": 3,
                "communication_rating": 2,
                "is_placement_ready": False,
                "performing_exceptionally_good": False,
                "remedial_tasks": [],
            },
            headers=examiner_headers,
        )
        assert missing_tasks.status_code == 422

        # 4. Valid Not-Ready evaluation with remedial task list succeeds (201)
        not_ready_eval = await client.post(
            "/api/v1/training/examiner/evaluations",
            json={
                "student_roll_number": "22F3001234",
                "skillsets_observed": ["Python", "Pandas", "FastAPI"],
                "programming_rating": 3,
                "data_science_rating": 3,
                "communication_rating": 2,
                "is_placement_ready": False,
                "performing_exceptionally_good": False,
                "remedial_tasks": [
                    "Complete 25 medium graph & DP problems",
                    "Conduct 2 mock system design interviews",
                ],
                "examiner_notes": "Solid fundamentals; needs structured communication under time pressure.",
            },
            headers=examiner_headers,
        )
        assert not_ready_eval.status_code == 201
        assert len(not_ready_eval.json()["remedial_tasks"]) == 2

        # 5. Student views their examiner feedback & remedial tasks
        my_evals = await client.get("/api/v1/training/examiner/evaluations/me", headers=stu_headers)
        assert my_evals.status_code == 200
        assert len(my_evals.json()) == 1
        assert my_evals.json()[0]["programming_rating"] == 3


@pytest.mark.asyncio
async def test_training_assessment_tab_switch_autofail_and_brule_12():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "22f3001234@ds.study.iitm.ac.in",
                "full_name": "Aarav Sharma",
                "role": "STUDENT",
            },
        )
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
        courses = (await client.get("/api/v1/training/courses", headers=headers)).json()
        course_id = courses[0]["id"]

        # Tab-switch violation auto-fails with 0%
        tab_fail = await client.post(
            f"/api/v1/training/courses/{course_id}/attempt",
            json={
                "answers": [0, 2, 1, 1],
                "termination_reason": "TAB_SWITCH_VIOLATION",
                "elapsed_seconds": 45,
            },
            headers=headers,
        )
        assert tab_fail.status_code == 200
        assert tab_fail.json()["passed"] is False
        assert tab_fail.json()["score_pct"] == 0
