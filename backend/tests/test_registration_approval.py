import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_examiner_signup_and_admin_approval_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Admin self-registration is blocked
        bad_admin = await client.post(
            "/api/v1/auth/register",
            json={"email": "rogue.admin@iitm.ac.in", "full_name": "Rogue", "role": "ADMIN"},
        )
        assert bad_admin.status_code == 403

        # 2. Examiner registers -> starts in PENDING state
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "examiner.panel@study.iitm.ac.in",
                "full_name": "Dr. Karthik Narayanan",
                "role": "EXAMINER",
                "organization_or_dept": "AI & Data Science Viva Panel",
            },
        )
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert reg_data["approval_status"] == "PENDING"
        assert reg_data["is_active"] is False

        # 3. Examiner login is blocked before Admin approval
        blocked_login = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "examiner.panel@study.iitm.ac.in",
                "full_name": "Dr. Karthik Narayanan",
                "role": "EXAMINER",
            },
        )
        assert blocked_login.status_code == 403

        # 4. Admin approves Examiner registration
        admin_login = await client.post(
            "/api/v1/auth/sso-login",
            json={"email": "placement.admin@iitm.ac.in", "full_name": "Placement Admin", "role": "ADMIN"},
        )
        assert admin_login.status_code == 200
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        decision = await client.post(
            f"/api/v1/admin/registrations/{reg_data['user_id']}/decision",
            json={"decision": "APPROVED"},
            headers=admin_headers,
        )
        assert decision.status_code == 200
        assert decision.json()["approval_status"] == "APPROVED"

        # 5. Examiner login now succeeds
        ok_login = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "examiner.panel@study.iitm.ac.in",
                "full_name": "Dr. Karthik Narayanan",
                "role": "EXAMINER",
            },
        )
        assert ok_login.status_code == 200
        assert ok_login.json()["active_role"] == "EXAMINER"
