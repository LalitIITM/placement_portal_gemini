import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.main import app
from app.modules.iam.seed import ensure_base_seed
from app.modules.training.models import QuizQuestionBank
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
        assert valid_reg.json()["profile"]["category"] == "OBC_NCL"


@pytest.mark.asyncio
async def test_question_bank_random_15_draw_and_auto_evaluation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        stu_login = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "22f3001234@ds.study.iitm.ac.in",
                "full_name": "Aarav Sharma",
                "role": "STUDENT",
            },
        )
        stu_headers = {"Authorization": f"Bearer {stu_login.json()['access_token']}"}

        # Admin adds a custom question to DATA_SCIENCE / INTERNSHIP bank
        admin_switch = await client.post(
            "/api/v1/auth/switch-role",
            json={"target_role": "ADMIN"},
            headers=stu_headers,
        )
        admin_headers = {"Authorization": f"Bearer {admin_switch.json()['access_token']}"}

        add_q = await client.post(
            "/api/v1/training/question-bank",
            json={
                "domain": "DATA_SCIENCE",
                "track": "INTERNSHIP",
                "prompt": "What does AUC-ROC measure for a binary classifier?",
                "options": [
                    "Probability a random positive ranks higher than a random negative",
                    "Mean squared residual",
                    "Training epoch count",
                    "Feature sparsity",
                ],
                "correct_index": 0,
                "difficulty": "MEDIUM",
            },
            headers=admin_headers,
        )
        assert add_q.status_code == 201

        # Fetch student courses (4 tracks: DS/SD x Internship/Software Development)
        courses = (await client.get("/api/v1/training/courses", headers=stu_headers)).json()
        assert len(courses) == 4
        ds_intern = next(c for c in courses if c["code"] == "DS-INT-101")
        assert ds_intern["questions_per_quiz"] == 15
        assert ds_intern["question_pool_size"] == 21

        # Start randomized 15-question session
        start_res = await client.post(
            f"/api/v1/training/courses/{ds_intern['id']}/sessions/start",
            headers=stu_headers,
        )
        assert start_res.status_code == 200
        session_data = start_res.json()
        assert len(session_data["questions"]) == 15
        attempt_id = session_data["attempt_id"]

        # Look up ground-truth answers in DB for the 15 randomly drawn questions
        drawn_ids = [uuid.UUID(q["id"]) for q in session_data["questions"]]
        async with AsyncSessionLocal() as db:
            q_rows = (
                await db.execute(select(QuizQuestionBank).where(QuizQuestionBank.id.in_(drawn_ids)))
            ).scalars().all()
            answer_key = {str(q.id): q.correct_index for q in q_rows}

        submit_res = await client.post(
            f"/api/v1/training/quiz-sessions/{attempt_id}/submit",
            json={
                "answers": answer_key,
                "termination_reason": "NORMAL",
                "elapsed_seconds": 420,
            },
            headers=stu_headers,
        )
        assert submit_res.status_code == 200
        res_body = submit_res.json()
        assert res_body["total_questions"] == 15
        assert res_body["correct_count"] == 15
        assert res_body["score_pct"] == 100
        assert res_body["passed"] is True
        assert res_body["badge"]["verification_code"].startswith("BADGE-IITM-DSINT101-")


@pytest.mark.asyncio
async def test_examiner_final_interview_evaluation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        stu_login = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "22f3001234@ds.study.iitm.ac.in",
                "full_name": "Aarav Sharma",
                "role": "STUDENT",
            },
        )
        stu_headers = {"Authorization": f"Bearer {stu_login.json()['access_token']}"}
        await client.get("/api/v1/students/me", headers=stu_headers)

        admin_switch = await client.post(
            "/api/v1/auth/switch-role",
            json={"target_role": "ADMIN"},
            headers=stu_headers,
        )
        examiner_headers = {"Authorization": f"Bearer {admin_switch.json()['access_token']}"}

        eval_res = await client.post(
            "/api/v1/training/examiner/evaluations",
            json={
                "student_roll_number": "22F3001234",
                "skillsets_observed": ["Python", "SQL", "FastAPI"],
                "programming_rating": 4,
                "data_science_rating": 5,
                "communication_rating": 4,
                "is_placement_ready": True,
                "performing_exceptionally_good": True,
            },
            headers=examiner_headers,
        )
        assert eval_res.status_code == 201
        assert eval_res.json()["performing_exceptionally_good"] is True
