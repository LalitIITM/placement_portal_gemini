from datetime import datetime, timedelta, timezone

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
async def test_interview_scheduling_conflict_and_offer_acceptance_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Student logs in and applies to Flipkart Internship (eligible by default)
        stu_login = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "22f3001234@ds.study.iitm.ac.in",
                "full_name": "Aarav Sharma",
                "role": "STUDENT",
            },
        )
        stu_headers = {"Authorization": f"Bearer {stu_login.json()['access_token']}"}

        jobs = (await client.get("/api/v1/recruitment/jobs", headers=stu_headers)).json()
        flipkart_intern = next(j for j in jobs if j["job_code"] == "DRV-2026-FLIPKART-INT")

        apply_res = await client.post(
            f"/api/v1/recruitment/jobs/{flipkart_intern['id']}/apply",
            json={"cover_note": "ML & SQL Analytics track"},
            headers=stu_headers,
        )
        assert apply_res.status_code == 201
        application_id = apply_res.json()["id"]

        # 2. Recruiter logs in and schedules Round 1 Technical Interview
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "talent@flipkart.com",
                "full_name": "Flipkart Campus Hiring",
                "role": "RECRUITER",
                "organization_or_dept": "Flipkart Campus Hiring",
            },
        )
        assert reg_res.status_code == 201
        admin_login = await client.post(
            "/api/v1/auth/sso-login",
            json={"email": "placement.admin@iitm.ac.in", "full_name": "Placement Admin", "role": "ADMIN"},
        )
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
        approve_res = await client.post(
            f"/api/v1/admin/registrations/{reg_res.json()['user_id']}/decision",
            json={"decision": "APPROVED"},
            headers=admin_headers,
        )
        assert approve_res.status_code == 200

        rec_login = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "talent@flipkart.com",
                "full_name": "Flipkart Campus Hiring",
                "role": "RECRUITER",
            },
        )
        rec_headers = {"Authorization": f"Bearer {rec_login.json()['access_token']}"}

        slot_time = (datetime.now(timezone.utc) + timedelta(days=2)).replace(microsecond=0)
        iv_res = await client.post(
            "/api/v1/placement/interviews",
            json={
                "application_id": application_id,
                "round_number": 1,
                "round_type": "TECHNICAL_1",
                "mode": "ONLINE_MEET",
                "scheduled_at": slot_time.isoformat(),
                "duration_minutes": 45,
                "meeting_link_or_venue": "https://meet.google.com/iitm-flipkart-r1",
                "panelist_name": "Rohan Kulkarni (Staff DS)",
            },
            headers=rec_headers,
        )
        assert iv_res.status_code == 201
        interview_id = iv_res.json()["id"]

        # 3. BRULE-31: Overlapping interview within 45 mins returns 409 Conflict
        conflict_res = await client.post(
            "/api/v1/placement/interviews",
            json={
                "application_id": application_id,
                "round_number": 2,
                "round_type": "MANAGERIAL",
                "mode": "ONLINE_MEET",
                "scheduled_at": (slot_time + timedelta(minutes=20)).isoformat(),
                "duration_minutes": 45,
                "meeting_link_or_venue": "https://meet.google.com/iitm-flipkart-r2",
                "panelist_name": "Priya Menon",
            },
            headers=rec_headers,
        )
        assert conflict_res.status_code == 409

        # 4. Student confirms interview attendance
        confirm_res = await client.patch(
            f"/api/v1/placement/interviews/{interview_id}",
            json={"status": "CONFIRMED"},
            headers=stu_headers,
        )
        assert confirm_res.status_code == 200
        assert confirm_res.json()["status"] == "CONFIRMED"

        # 5. Recruiter issues Offer Letter and Student accepts
        offer_res = await client.post(
            "/api/v1/placement/offers",
            json={
                "application_id": application_id,
                "ctc_lpa": "7.20",
                "joining_date": "2027-01-11",
                "offer_expires_at": "2026-12-05",
            },
            headers=rec_headers,
        )
        assert offer_res.status_code == 201
        offer_id = offer_res.json()["id"]

        accept_res = await client.post(
            f"/api/v1/placement/offers/{offer_id}/respond",
            json={"decision": "ACCEPTED", "student_remarks": "Excited to join Flipkart!"},
            headers=stu_headers,
        )
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == "ACCEPTED"

        # 6. Analytics overview reflects updated offers & audit trail
        analytics = (await client.get("/api/v1/placement/analytics/overview", headers=rec_headers)).json()
        assert analytics["kpis"]["offers_accepted"] == 1
        assert len(analytics["audit_logs"]) >= 3
