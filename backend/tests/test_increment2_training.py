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
async def test_training_assessment_badge_and_brule_12_attempt_cap():
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

        # 1. Fetch seeded courses
        courses_res = await client.get("/api/v1/training/courses", headers=headers)
        assert courses_res.status_code == 200
        courses = courses_res.json()
        assert len(courses) >= 2
        course = courses[0]
        course_id = course["id"]

        # 2. Complete first module
        mod_id = course["modules"][0]["id"]
        mod_res = await client.post(f"/api/v1/training/modules/{mod_id}/complete", headers=headers)
        assert mod_res.status_code == 200

        # 3. Attempt #1 -> intentionally fail (all index 3, score 25% < 75%)
        fail_attempt = await client.post(
            f"/api/v1/training/courses/{course_id}/attempt",
            json={"answers": [3, 3, 3, 3]},
            headers=headers,
        )
        assert fail_attempt.status_code == 200
        assert fail_attempt.json()["passed"] is False
        assert fail_attempt.json()["attempts_remaining"] == 2
        assert fail_attempt.json()["badge"] is None

        # 4. Attempt #2 -> pass (correct answers for CS-301: [0, 2, 1, 1] -> 100%)
        pass_attempt = await client.post(
            f"/api/v1/training/courses/{course_id}/attempt",
            json={"answers": [0, 2, 1, 1]},
            headers=headers,
        )
        assert pass_attempt.status_code == 200
        body = pass_attempt.json()
        assert body["passed"] is True
        assert body["score_pct"] == 100
        assert body["badge"] is not None
        code = body["badge"]["verification_code"]
        assert code.startswith("BADGE-IITM-")

        # 5. Public recruiter badge verification succeeds
        verify_res = await client.get(f"/api/v1/training/badges/verify/{code}")
        assert verify_res.status_code == 200
        assert verify_res.json()["valid"] is True
        assert verify_res.json()["student_roll_number"] == "22F3001234"

        # 6. Attempt #3 -> succeeds (uses last attempt)
        third_attempt = await client.post(
            f"/api/v1/training/courses/{course_id}/attempt",
            json={"answers": [0, 2, 1, 1]},
            headers=headers,
        )
        assert third_attempt.status_code == 200
        assert third_attempt.json()["attempts_remaining"] == 0

        # 7. Attempt #4 -> blocked by BRULE-12 (409 Conflict)
        fourth_attempt = await client.post(
            f"/api/v1/training/courses/{course_id}/attempt",
            json={"answers": [0, 2, 1, 1]},
            headers=headers,
        )
        assert fourth_attempt.status_code == 409
