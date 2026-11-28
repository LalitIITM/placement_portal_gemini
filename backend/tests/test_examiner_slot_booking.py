import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_single_student_slot_locking():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Seed an OPEN slot via sync
        sync_res = await client.get("/api/v1/portal-state/bootstrap?student_roll=21F3001013")
        assert sync_res.status_code == 200
        payload = sync_res.json()
        snap = payload.get("snapshot") or {}
        existing_slots = list(snap.get("examinerSlots") or [])

        test_slot_id = "test-lock-slot-001"
        filtered_slots = [s for s in existing_slots if s.get("id") != test_slot_id]
        filtered_slots.append(
            {
                "id": test_slot_id,
                "instructor": "Dr. Test Examiner",
                "instructorEmail": "examiner@iitm.ac.in",
                "date": "2026-12-01",
                "slotTime": "10:00 AM - 10:30 AM",
                "domain": "Data Science",
                "status": "OPEN",
            }
        )
        snap["examinerSlots"] = filtered_slots
        payload["snapshot"] = snap

        put_res = await client.put("/api/v1/portal-state/sync", json=payload)
        assert put_res.status_code == 200

        # 2. Student A books the slot -> 200 OK
        book_a = await client.post(
            f"/api/v1/portal-state/examiner-slots/{test_slot_id}/book",
            json={"studentEmail": "21f3001013@ds.study.iitm.ac.in", "studentName": "Student A"},
        )
        assert book_a.status_code == 200
        assert book_a.json()["slot"]["status"] == "REQUESTED"
        assert book_a.json()["slot"]["requestedByEmail"] == "21f3001013@ds.study.iitm.ac.in"

        # 3. Student B attempts to book the same slot -> 409 Conflict
        book_b = await client.post(
            f"/api/v1/portal-state/examiner-slots/{test_slot_id}/book",
            json={"studentEmail": "21f3002024@ds.study.iitm.ac.in", "studentName": "Student B"},
        )
        assert book_b.status_code == 409

        # 4. Cleanup test slot
        verify_res = await client.get("/api/v1/portal-state/bootstrap?student_roll=21F3001013")
        clean_payload = verify_res.json()
        clean_snap = clean_payload.get("snapshot") or {}
        clean_snap["examinerSlots"] = [
            s for s in (clean_snap.get("examinerSlots") or []) if s.get("id") != test_slot_id
        ]
        clean_payload["snapshot"] = clean_snap
        await client.put("/api/v1/portal-state/sync", json=clean_payload)
