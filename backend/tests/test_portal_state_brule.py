import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
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
async def test_portal_state_roundtrip_persistence() -> None:
    """Verifies atomic persistence and bootstrap hydration across all normalized portal tables."""
    roll = "23F1009999"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        boot = await client.get(
            "/api/v1/portal-state/bootstrap",
            params={"student_roll": roll, "scope_student_only": True},
        )
        assert boot.status_code == 200
        initial = boot.json()
        assert initial["studentRoll"] == roll
        assert len(initial["trainingStages"]) >= 1

        first_stage = dict(initial["trainingStages"][0])
        first_stage["obtainedMarks"] = 88
        first_stage["attemptsUsed"] = 1
        first_stage["statusText"] = "PASSED"

        sync_payload = {
            "studentRoll": roll,
            "trainingStages": [first_stage],
            "studentProfile": {
                "studentRoll": roll,
                "fullName": "Priya Nair",
                "iitmEmail": f"{roll.lower()}@ds.study.iitm.ac.in",
                "cgpa": "9.12",
                "skills": ["Python", "PostgreSQL", "FastAPI"],
            },
            "helpdeskTickets": [
                {
                    "id": "tkt-test-1",
                    "ticketNumber": "HD-9001",
                    "raisedByEmail": f"{roll.lower()}@ds.study.iitm.ac.in",
                    "raisedByName": "Priya Nair",
                    "raisedByRole": "STUDENT",
                    "category": "PLACEMENT",
                    "priority": "HIGH",
                    "subject": "Offer letter verification query",
                    "description": "Need confirmation on joining date clause.",
                    "status": "ESCALATED",
                    "assignedTo": "coordinator@iitm.ac.in",
                    "escalationCount": 1,
                    "comments": [
                        {
                            "id": "cmt-1",
                            "authorName": "Priya Nair",
                            "authorRole": "STUDENT",
                            "body": "Uploaded signed annexure.",
                            "createdAt": "2026-11-20T10:00:00Z",
                        }
                    ],
                }
            ],
            "snapshot": {
                "resumes": [
                    {
                        "id": "res-1",
                        "title": "ML Engineer Resume",
                        "targetRole": "ML Engineer",
                        "driveUrl": "https://example.com/res1.pdf",
                        "fileSize": "320 KB",
                        "updatedAt": "2026-11-20",
                        "isPrimary": True,
                    }
                ],
                "oneOnOneSlots": [
                    {
                        "id": "slot-1",
                        "studentEmail": f"{roll.lower()}@ds.study.iitm.ac.in",
                        "studentName": "Priya Nair",
                        "date": "2026-11-25",
                        "slotTime": "10:00 AM - 10:30 AM",
                        "instructor": "Dr. Kavita Menon",
                        "status": "SCHEDULED",
                    }
                ],
                "evaluations": [
                    {
                        "id": "eval-1",
                        "studentRoll": roll,
                        "examinerEmail": "examiner@iitm.ac.in",
                        "skillsets": ["Python", "SQL"],
                        "programmingRating": 5,
                        "dataScienceRating": 4,
                        "communicationRating": 5,
                        "isPlacementReady": True,
                        "performingExceptionallyGood": True,
                        "remedialTasks": [],
                        "notes": "Strong system design fundamentals.",
                        "evaluatedAt": "2026-11-20",
                    }
                ],
                "applications": [
                    {
                        "id": "app-1",
                        "jobId": "job-101",
                        "jobCode": "JOB-101",
                        "companyName": "Acme Analytics",
                        "jobTitle": "Data Scientist",
                        "roleType": "FULL_TIME",
                        "studentRoll": roll,
                        "studentName": "Priya Nair",
                        "studentCgpa": "9.12",
                        "resumeTitle": "ML Engineer Resume",
                        "status": "INTERVIEW_SCHEDULED",
                        "appliedAt": "2026-11-18",
                    }
                ],
                "interviews": [
                    {
                        "id": "int-1",
                        "applicationId": "app-1",
                        "studentRoll": roll,
                        "studentName": "Priya Nair",
                        "companyName": "Acme Analytics",
                        "jobTitle": "Data Scientist",
                        "roundNumber": 1,
                        "roundType": "TECHNICAL_1",
                        "mode": "ONLINE_MEET",
                        "scheduledAt": "2026-11-22T14:00:00Z",
                        "meetingLink": "https://meet.example.com/acme-r1",
                        "panelistName": "Rohan Kulkarni",
                        "status": "SCHEDULED",
                    }
                ],
                "offers": [
                    {
                        "id": "off-1",
                        "offerCode": "OFF-2026-01",
                        "applicationId": "app-1",
                        "studentRoll": roll,
                        "studentName": "Priya Nair",
                        "companyName": "Acme Analytics",
                        "roleTitle": "Data Scientist",
                        "roleType": "FULL_TIME",
                        "ctcLpa": 18.5,
                        "joiningDate": "2027-01-15",
                        "expiresAt": "2026-12-01",
                        "status": "ISSUED",
                    }
                ],
            },
        }

        sync_resp = await client.put("/api/v1/portal-state/sync", json=sync_payload)
        assert sync_resp.status_code == 200

        rehydrated_resp = await client.get(
            "/api/v1/portal-state/bootstrap",
            params={"student_roll": roll, "scope_student_only": True},
        )
        assert rehydrated_resp.status_code == 200
        data = rehydrated_resp.json()

        assert data["studentProfile"]["fullName"] == "Priya Nair"
        assert data["studentProfile"]["cgpa"] == "9.12"
        assert data["trainingStages"][0]["obtainedMarks"] == 88
        assert len(data["helpdeskTickets"]) == 1
        assert data["helpdeskTickets"][0]["ticketNumber"] == "HD-9001"
        assert data["helpdeskTickets"][0]["escalationCount"] == 1
        assert len(data["helpdeskTickets"][0]["comments"]) == 1

        snap = data["snapshot"]
        assert len(snap["resumes"]) == 1
        assert snap["resumes"][0]["title"] == "ML Engineer Resume"
        assert len(snap["oneOnOneSlots"]) == 1
        assert len(snap["evaluations"]) == 1
        assert len(snap["applications"]) == 1
        assert len(snap["interviews"]) == 1
        assert len(snap["offers"]) == 1
        assert snap["offers"][0]["ctcLpa"] == 18.5


@pytest.mark.asyncio
async def test_brule_09_max_two_training_stage_attempts() -> None:
    """BRULE-09: Rejects training stage updates exceeding 2 attempts with 409 Conflict."""
    roll = "23F1001009"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        boot = await client.get("/api/v1/portal-state/bootstrap", params={"student_roll": roll})
        stage = dict(boot.json()["trainingStages"][0])

        # 2 attempts is allowed
        stage["attemptsUsed"] = 2
        ok_resp = await client.put(
            "/api/v1/portal-state/sync",
            json={"studentRoll": roll, "trainingStages": [stage]},
        )
        assert ok_resp.status_code == 200

        # 3 attempts violates BRULE-09
        stage["attemptsUsed"] = 3
        bad_resp = await client.put(
            "/api/v1/portal-state/sync",
            json={"studentRoll": roll, "trainingStages": [stage]},
        )
        assert bad_resp.status_code == 409
        assert "BRULE-09" in bad_resp.json()["detail"]


@pytest.mark.asyncio
async def test_brule_55_max_three_resume_versions() -> None:
    """BRULE-55: Enforces maximum of 3 active resume versions per student."""
    roll = "23F1001055"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resumes = [
            {
                "id": f"res-{idx}",
                "title": f"Resume Version {idx}",
                "targetRole": "Data Analyst",
                "driveUrl": f"https://example.com/res-{idx}.pdf",
                "fileSize": "250 KB",
                "updatedAt": "2026-11-20",
                "isPrimary": idx == 1,
            }
            for idx in range(1, 4)
        ]
        ok_resp = await client.put(
            "/api/v1/portal-state/sync",
            json={"studentRoll": roll, "snapshot": {"resumes": resumes}},
        )
        assert ok_resp.status_code == 200

        resumes.append(
            {
                "id": "res-4",
                "title": "Resume Version 4",
                "targetRole": "SDE",
                "driveUrl": "https://example.com/res-4.pdf",
                "fileSize": "260 KB",
                "updatedAt": "2026-11-20",
                "isPrimary": False,
            }
        )
        bad_resp = await client.put(
            "/api/v1/portal-state/sync",
            json={"studentRoll": roll, "snapshot": {"resumes": resumes}},
        )
        assert bad_resp.status_code == 409
        assert "BRULE-55" in bad_resp.json()["detail"]


@pytest.mark.asyncio
async def test_brule_21_prevent_evaluator_slot_double_booking() -> None:
    """BRULE-21: Prevents double-booking an instructor for the same date and slotTime."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        colliding_slots = [
            {
                "id": "slot-a",
                "studentEmail": "23f1000001@ds.study.iitm.ac.in",
                "studentName": "Student One",
                "date": "2026-11-26",
                "slotTime": "11:00 AM - 11:30 AM",
                "instructor": "Prof. Arvind Rao",
                "status": "SCHEDULED",
            },
            {
                "id": "slot-b",
                "studentEmail": "23f1000002@ds.study.iitm.ac.in",
                "studentName": "Student Two",
                "date": "2026-11-26",
                "slotTime": "11:00 AM - 11:30 AM",
                "instructor": "Prof. Arvind Rao",
                "status": "SCHEDULED",
            },
        ]
        bad_resp = await client.put(
            "/api/v1/portal-state/sync",
            json={"studentRoll": "23F1000001", "snapshot": {"oneOnOneSlots": colliding_slots}},
        )
        assert bad_resp.status_code == 409
        assert "BRULE-21" in bad_resp.json()["detail"]

        # Cancelled slot on same timestamp should not collide
        colliding_slots[0]["status"] = "CANCELLED"
        ok_resp = await client.put(
            "/api/v1/portal-state/sync",
            json={"studentRoll": "23F1000002", "snapshot": {"oneOnOneSlots": colliding_slots}},
        )
        assert ok_resp.status_code == 200


@pytest.mark.asyncio
async def test_brule_49_placed_student_application_lockout() -> None:
    """BRULE-49: Blocks new APPLIED job applications once a student accepts a FULL_TIME offer."""
    roll = "23F1001049"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First persist an accepted full-time offer
        accepted_offer_payload = {
            "studentRoll": roll,
            "snapshot": {
                "applications": [
                    {
                        "id": "app-accepted",
                        "jobId": "job-ft-1",
                        "jobCode": "FT-01",
                        "companyName": "Zeta Corp",
                        "jobTitle": "Backend Engineer",
                        "roleType": "FULL_TIME",
                        "studentRoll": roll,
                        "studentName": "Kabir Verma",
                        "studentCgpa": "8.90",
                        "resumeTitle": "SDE Resume",
                        "status": "OFFER_ACCEPTED",
                        "appliedAt": "2026-11-10",
                    }
                ],
                "offers": [
                    {
                        "id": "off-accepted",
                        "offerCode": "OFF-FT-01",
                        "applicationId": "app-accepted",
                        "studentRoll": roll,
                        "studentName": "Kabir Verma",
                        "companyName": "Zeta Corp",
                        "roleTitle": "Backend Engineer",
                        "roleType": "FULL_TIME",
                        "ctcLpa": 20.0,
                        "joiningDate": "2027-02-01",
                        "expiresAt": "2026-12-05",
                        "status": "ACCEPTED",
                    }
                ],
            },
        }
        ok_resp = await client.put("/api/v1/portal-state/sync", json=accepted_offer_payload)
        assert ok_resp.status_code == 200

        # Now attempt to submit a brand-new application for the placed student
        new_app_payload = {
            "studentRoll": roll,
            "snapshot": {
                "applications": [
                    {
                        "id": "app-new-blocked",
                        "jobId": "job-ft-2",
                        "jobCode": "FT-02",
                        "companyName": "Beta Systems",
                        "jobTitle": "Platform Engineer",
                        "roleType": "FULL_TIME",
                        "studentRoll": roll,
                        "studentName": "Kabir Verma",
                        "studentCgpa": "8.90",
                        "resumeTitle": "SDE Resume",
                        "status": "APPLIED",
                        "appliedAt": "2026-11-20",
                    }
                ]
            },
        }
        bad_resp = await client.put("/api/v1/portal-state/sync", json=new_app_payload)
        assert bad_resp.status_code == 409
        assert "BRULE-49" in bad_resp.json()["detail"]
