import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.main import app
from app.modules.audit.models import AuditLog
from app.modules.audit.service import ImmutableAuditError
from app.modules.iam.seed import ensure_base_seed
from app.shared.database import AsyncSessionLocal, Base, engine


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await ensure_base_seed(session)
        await session.commit()
    yield


@pytest.mark.asyncio
async def test_domain_validation_and_rbac():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Personal gmail blocked for student login
        bad_student = await client.post(
            "/api/v1/auth/sso-login",
            json={"email": "random@gmail.com", "full_name": "Test", "role": "STUDENT"},
        )
        assert bad_student.status_code == 403

        # 2. Personal gmail blocked for recruiter login
        bad_recruiter = await client.post(
            "/api/v1/auth/sso-login",
            json={"email": "hr@gmail.com", "full_name": "HR", "role": "RECRUITER"},
        )
        assert bad_recruiter.status_code == 403

        # 3. Official IITM BS email succeeds
        login_res = await client.post(
            "/api/v1/auth/sso-login",
            json={
                "email": "22f3001234@ds.study.iitm.ac.in",
                "full_name": "Aarav Sharma",
                "role": "STUDENT",
            },
        )
        assert login_res.status_code == 200
        student_token = login_res.json()["access_token"]

        # 4. Student cannot read audit logs (403)
        forbidden_audit = await client.get(
            "/api/v1/audit-logs",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert forbidden_audit.status_code == 403

        # 5. Switch role to ADMIN and read audit logs (200)
        switch_res = await client.post(
            "/api/v1/auth/switch-role",
            json={"target_role": "ADMIN"},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert switch_res.status_code == 200
        admin_token = switch_res.json()["access_token"]

        audit_res = await client.get(
            "/api/v1/audit-logs",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert audit_res.status_code == 200
        assert len(audit_res.json()) >= 2


@pytest.mark.asyncio
async def test_max_three_active_resumes_brule_55():
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

        # Upload 3 resumes -> all succeed
        for idx in range(1, 4):
            res = await client.post(
                "/api/v1/students/me/resumes",
                json={
                    "label": f"Resume V{idx}",
                    "file_name": f"aarav_v{idx}.pdf",
                    "file_size_bytes": 240000,
                    "is_default": idx == 1,
                },
                headers=headers,
            )
            assert res.status_code == 201

        # 4th resume must fail with 409 Conflict
        fourth = await client.post(
            "/api/v1/students/me/resumes",
            json={
                "label": "Resume V4",
                "file_name": "aarav_v4.pdf",
                "file_size_bytes": 240000,
                "is_default": False,
            },
            headers=headers,
        )
        assert fourth.status_code == 409

        # Archive 1 resume -> 4th upload now succeeds
        first_id = fourth.json()
        ws = (await client.get("/api/v1/students/me", headers=headers)).json()
        del_res = await client.delete(f"/api/v1/students/me/resumes/{ws['resumes'][0]['id']}", headers=headers)
        assert del_res.status_code == 200

        retry = await client.post(
            "/api/v1/students/me/resumes",
            json={
                "label": "Resume V4",
                "file_name": "aarav_v4.pdf",
                "file_size_bytes": 240000,
                "is_default": False,
            },
            headers=headers,
        )
        assert retry.status_code == 201


@pytest.mark.asyncio
async def test_audit_log_immutability():
    async with AsyncSessionLocal() as session:
        log = (await session.execute(select(AuditLog).limit(1))).scalar_one_or_none()
        if log is None:
            log = AuditLog(action="TEST", entity_type="System", entity_id="1")
            session.add(log)
            await session.commit()

        log.action = "TAMPERED"
        with pytest.raises(ImmutableAuditError):
            await session.commit()
        await session.rollback()
