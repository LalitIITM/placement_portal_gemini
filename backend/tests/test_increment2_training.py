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
async def test_marksheet_and_social_handles():
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

        # Update LinkedIn ID, GitHub username, and Kaggle username
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
        profile = prof_res.json()["profile"]
        assert profile["linkedin_url"] == "aarav-sharma-iitm"
        assert profile["github_url"] == "aarav-dev"
        assert profile["kaggle_url"] == "aaravml"

        # Upload BS Marksheet PDF
        ms_res = await client.post(
            "/api/v1/students/me/marksheet",
            json={
                "file_name": "IITM_BS_GradeCard_Term3.pdf",
                "file_size_bytes": 512000,
                "cgpa": "9.14",
            },
            headers=headers,
        )
        assert ms_res.status_code == 200
        assert ms_res.json()["profile"]["marksheet_file_name"] == "IITM_BS_GradeCard_Term3.pdf"
        assert ms_res.json()["cgpa"] == "9.14"


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
        assert login_res.status_code == 200
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        courses = (await client.get("/api/v1/training/courses", headers=headers)).json()
        course = courses[0]
        course_id = course["id"]
        assert course["time_limit_seconds"] == 1800

        # 1. Attempt #1 -> Tab-switch violation auto-fails with 0% even if answers were right
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
        assert tab_fail.json()["termination_reason"] == "TAB_SWITCH_VIOLATION"
        assert tab_fail.json()["attempts_remaining"] == 2

        # 2. Attempt #2 -> Normal valid submission passes & mints badge
        pass_attempt = await client.post(
            f"/api/v1/training/courses/{course_id}/attempt",
            json={
                "answers": [0, 2, 1, 1],
                "termination_reason": "NORMAL",
                "elapsed_seconds": 320,
            },
            headers=headers,
        )
        assert pass_attempt.status_code == 200
        assert pass_attempt.json()["passed"] is True
        assert pass_attempt.json()["score_pct"] == 100
        code = pass_attempt.json()["badge"]["verification_code"]

        verify_res = await client.get(f"/api/v1/training/badges/verify/{code}")
        assert verify_res.status_code == 200
        assert verify_res.json()["valid"] is True

        # 3. Attempt #3 -> Exceeding 30-min timer (1801s) auto-fails as TIMEOUT
        timeout_attempt = await client.post(
            f"/api/v1/training/courses/{course_id}/attempt",
            json={
                "answers": [0, 2, 1, 1],
                "termination_reason": "NORMAL",
                "elapsed_seconds": 1801,
            },
            headers=headers,
        )
        assert timeout_attempt.status_code == 200
        assert timeout_attempt.json()["passed"] is False
        assert timeout_attempt.json()["termination_reason"] == "TIMEOUT"
        assert timeout_attempt.json()["attempts_remaining"] == 0

        # 4. Attempt #4 -> Blocked by BRULE-12 (409 Conflict)
        fourth_attempt = await client.post(
            f"/api/v1/training/courses/{course_id}/attempt",
            json={"answers": [0, 2, 1, 1]},
            headers=headers,
        )
        assert fourth_attempt.status_code == 409
