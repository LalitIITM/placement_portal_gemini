import os
import re
import uuid
import httpx
import pytest

BACKEND_URL = os.getenv(
    "LIVE_BACKEND_URL",
    "https://placement-portal-gemini-hz5y.vercel.app",
).rstrip("/")

FRONTEND_URL = os.getenv(
    "LIVE_FRONTEND_URL",
    "https://placement-portal-gemini-e62r.vercel.app",
).rstrip("/")

# Optional seeded Admin credentials (set in local .env or GitHub Secrets if Admin self-registration is restricted)
SEEDED_ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "")
SEEDED_ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "")

# Endpoints confirmed to be intentionally accessible without a Bearer token
PUBLIC_ENDPOINTS = {
    ("GET", "/health"),
    ("GET", "/openapi.json"),
    ("GET", "/docs"),
    ("GET", "/redoc"),
    ("GET", "/api/v1/portal-state/bootstrap"),
    ("GET", "/api/v1/portal-state/helpdesk"),
    ("PUT", "/api/v1/portal-state/sync"),
}


def _discover_openapi_operations() -> list[tuple[str, str]]:
    """Fetch /openapi.json once at collection time so pytest generates 1 test per Swagger route."""
    res = httpx.get(f"{BACKEND_URL}/openapi.json", timeout=20.0)
    res.raise_for_status()
    paths = res.json().get("paths", {})
    operations = []
    for path, methods in paths.items():
        for method in methods:
            if method.lower() in {"get", "post", "put", "patch", "delete"}:
                operations.append((method.upper(), path))
    return sorted(operations, key=lambda x: (x[1], x[0]))


ALL_OPERATIONS = _discover_openapi_operations()


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BACKEND_URL, timeout=25.0) as c:
        yield c


@pytest.fixture(scope="module")
def openapi_schema(client: httpx.Client) -> dict:
    res = client.get("/openapi.json")
    assert res.status_code == 200
    return res.json()


def _build_valid_payload(schema_name: str, openapi_schema: dict, overrides: dict | None = None) -> dict:
    """Auto-populate required fields from OpenAPI component schemas so POST/PUT/PATCH tests stay schema-valid."""
    schemas = openapi_schema.get("components", {}).get("schemas", {})
    target = schemas.get(schema_name, {})
    props = target.get("properties", {})
    required = set(target.get("required", []))
    overrides = overrides or {}

    payload = {}
    for field, meta in props.items():
        if field in overrides:
            payload[field] = overrides[field]
            continue
        if field not in required:
            continue

        if "$ref" in meta:
            ref_name = meta["$ref"].split("/")[-1]
            ref_obj = schemas.get(ref_name, {})
            if "enum" in ref_obj:
                payload[field] = ref_obj["enum"][0]
                continue
        if "enum" in meta:
            payload[field] = meta["enum"][0]
            continue

        ftype = meta.get("type")
        if ftype == "string":
            if "email" in field:
                payload[field] = f"user_{uuid.uuid4().hex[:6]}@ds.study.iitm.ac.in"
            elif "date" in field or "time" in field or meta.get("format") == "date-time":
                payload[field] = "2026-12-15T10:00:00Z"
            else:
                payload[field] = f"sample_{field}"
        elif ftype == "integer":
            payload[field] = 1
        elif ftype == "number":
            payload[field] = 8.5
        elif ftype == "boolean":
            payload[field] = True
        elif ftype == "array":
            payload[field] = []
        elif ftype == "object":
            payload[field] = {}

    if props:
        return {k: v for k, v in {**payload, **overrides}.items() if k in props}
    return {**payload, **overrides}


def _login_user(client: httpx.Client, openapi_schema: dict, email: str, password: str, role: str) -> str | None:
    """Attempt /sso-login and extract Bearer token."""
    login_payload = _build_valid_payload(
        "LoginRequest",
        openapi_schema,
        overrides={"email": email, "password": password, "role": role},
    )
    res = client.post("/api/v1/auth/sso-login", json=login_payload)
    if res.status_code == 200:
        body = res.json()
        return body.get("access_token") or body.get("token")
    return None


def _provision_role_account(
    client: httpx.Client,
    openapi_schema: dict,
    role: str,
    admin_headers: dict | None = None,
) -> dict:
    """
    Registers a fresh user for `role`, approves via Admin endpoint if pending and `admin_headers` is available,
    and returns auth context dict.
    """
    uid = uuid.uuid4().hex[:8]
    domain = "ds.study.iitm.ac.in" if role == "STUDENT" else f"{role.lower()}corp.example.com"
    email = f"e2e_{role.lower()}_{uid}@{domain}"
    password = f"SmokePass_{uid}!9"

    reg_payload = _build_valid_payload(
        "RegisterRequest",
        openapi_schema,
        overrides={
            "email": email,
            "password": password,
            "full_name": f"E2E {role.title()} {uid}",
            "name": f"E2E {role.title()} {uid}",
            "role": role,
        },
    )
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    reg_body = reg_res.json() if reg_res.status_code in (200, 201) else {}
    user_id = reg_body.get("id") or reg_body.get("user_id") or (reg_body.get("user") or {}).get("id")

    token = reg_body.get("access_token") or reg_body.get("token") or _login_user(
        client, openapi_schema, email, password, role
    )

    # Approve via Admin endpoint if non-student account starts in PENDING state
    if admin_headers:
        if not user_id:
            pending_res = client.get("/api/v1/admin/registrations", headers=admin_headers)
            if pending_res.status_code == 200:
                items = (
                    pending_res.json()
                    if isinstance(pending_res.json(), list)
                    else pending_res.json().get("items", [])
                )
                for item in items:
                    if item.get("email") == email:
                        user_id = item.get("id") or item.get("user_id")
                        break

        if user_id:
            decision_payload = _build_valid_payload(
                "RegistrationDecisionRequest",
                openapi_schema,
                overrides={"decision": "APPROVED", "status": "APPROVED", "approved": True},
            )
            client.post(
                f"/api/v1/admin/registrations/{user_id}/decision",
                json=decision_payload,
                headers=admin_headers,
            )
            refreshed_token = _login_user(client, openapi_schema, email, password, role)
            if refreshed_token:
                token = refreshed_token

    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return {
        "user_id": user_id,
        "email": email,
        "password": password,
        "role": role,
        "token": token,
        "headers": headers,
        "ready": token is not None,
    }


# ---------------------------------------------------------------------------
# ROLE FIXTURES (Admin, Student, Recruiter, Examiner)
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def admin_auth(client: httpx.Client, openapi_schema: dict) -> dict:
    if SEEDED_ADMIN_EMAIL and SEEDED_ADMIN_PASSWORD:
        token = _login_user(client, openapi_schema, SEEDED_ADMIN_EMAIL, SEEDED_ADMIN_PASSWORD, "ADMIN")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        return {
            "email": SEEDED_ADMIN_EMAIL,
            "role": "ADMIN",
            "token": token,
            "headers": headers,
            "ready": token is not None,
        }
    return _provision_role_account(client, openapi_schema, "ADMIN")


@pytest.fixture(scope="module")
def student_auth(client: httpx.Client, openapi_schema: dict, admin_auth: dict) -> dict:
    return _provision_role_account(
        client,
        openapi_schema,
        "STUDENT",
        admin_headers=admin_auth["headers"] if admin_auth["ready"] else None,
    )


@pytest.fixture(scope="module")
def recruiter_auth(client: httpx.Client, openapi_schema: dict, admin_auth: dict) -> dict:
    return _provision_role_account(
        client,
        openapi_schema,
        "RECRUITER",
        admin_headers=admin_auth["headers"] if admin_auth["ready"] else None,
    )


@pytest.fixture(scope="module")
def examiner_auth(client: httpx.Client, openapi_schema: dict, admin_auth: dict) -> dict:
    return _provision_role_account(
        client,
        openapi_schema,
        "EXAMINER",
        admin_headers=admin_auth["headers"] if admin_auth["ready"] else None,
    )


# ---------------------------------------------------------------------------
# 1. FULL SWAGGER CONTRACT SWEEP (Covers all 46 endpoints automatically)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("method,path_template", ALL_OPERATIONS)
def test_every_swagger_endpoint_contract(client: httpx.Client, method: str, path_template: str):
    """
    Hits every single endpoint listed in Swagger:
    - Guarantees zero 500 Internal Server Errors across all routes.
    - Guarantees protected routes enforce auth (401/403) or schema validation (422) when called anonymously.
    """
    concrete_path = re.sub(
        r"\{[^}]+\}",
        lambda m: "NONEXISTENT-CODE" if "code" in m.group(0) else str(uuid.uuid4()),
        path_template,
    )

    if method == "GET":
        res = client.get(concrete_path)
    elif method == "POST":
        res = client.post(concrete_path, json={})
    elif method == "PUT":
        res = client.put(concrete_path, json={})
    elif method == "PATCH":
        res = client.patch(concrete_path, json={})
    elif method == "DELETE":
        res = client.delete(concrete_path)
    else:
        pytest.fail(f"Unsupported method {method}")

    assert res.status_code < 500, f"500 Server Error on {method} {concrete_path}: {res.text}"

    if (method, path_template) in PUBLIC_ENDPOINTS:
        assert res.status_code == 200, f"Public endpoint {method} {concrete_path} returned {res.status_code}"
    elif path_template == "/api/v1/training/badges/verify/{verification_code}":
        assert res.status_code in (200, 404)
    else:
        assert res.status_code in (401, 403, 404, 405, 422), (
            f"Unexpected {res.status_code} on anonymous {method} {concrete_path}"
        )


# ---------------------------------------------------------------------------
# 2. ADMIN WRITE WORKFLOWS (IAM, User Provisioning, Audit Logs)
# ---------------------------------------------------------------------------
def test_admin_user_lifecycle_and_audit_trail(client: httpx.Client, admin_auth: dict, openapi_schema: dict):
    """Verify POST/PATCH/DELETE /api/v1/admin/users and GET /api/v1/audit-logs."""
    if not admin_auth["ready"]:
        pytest.skip("Set TEST_ADMIN_EMAIL & TEST_ADMIN_PASSWORD if Admin self-registration requires approval.")

    headers = admin_auth["headers"]

    regs = client.get("/api/v1/admin/registrations", headers=headers)
    assert regs.status_code == 200

    audits = client.get("/api/v1/audit-logs", headers=headers)
    assert audits.status_code == 200

    uid = uuid.uuid4().hex[:8]
    create_payload = _build_valid_payload(
        "AdminCreateUserRequest",
        openapi_schema,
        overrides={
            "email": f"managed_{uid}@ds.study.iitm.ac.in",
            "password": f"AdminCreated_{uid}!9",
            "full_name": "Managed Test User",
            "name": "Managed Test User",
            "role": "STUDENT",
        },
    )
    created = client.post("/api/v1/admin/users", json=create_payload, headers=headers)
    assert created.status_code in (200, 201), created.text
    created_data = created.json()
    managed_id = created_data.get("id") or created_data.get("user_id")

    if managed_id:
        update_payload = _build_valid_payload(
            "AdminUpdateUserRequest",
            openapi_schema,
            overrides={"full_name": "Managed Test User Updated", "is_active": True},
        )
        patched = client.patch(f"/api/v1/admin/users/{managed_id}", json=update_payload, headers=headers)
        assert patched.status_code in (200, 204), patched.text

        deleted = client.delete(f"/api/v1/admin/users/{managed_id}", headers=headers)
        assert deleted.status_code in (200, 204), deleted.text


# ---------------------------------------------------------------------------
# 3. RECRUITER + STUDENT + PLACEMENT WRITE PIPELINE (Jobs -> Apply -> Interview -> Offer)
# ---------------------------------------------------------------------------
def test_recruiter_and_placement_write_pipeline(
    client: httpx.Client,
    recruiter_auth: dict,
    student_auth: dict,
    admin_auth: dict,
    openapi_schema: dict,
):
    """End-to-end write test across Recruitment & Placement endpoints with cleanup."""
    if not recruiter_auth["ready"]:
        pytest.skip("Recruiter account not active (provide TEST_ADMIN_EMAIL/PASSWORD to auto-approve).")

    rec_headers = recruiter_auth["headers"]
    coord_headers = admin_auth["headers"] if admin_auth["ready"] else rec_headers

    job_payload = _build_valid_payload(
        "JobCreateIn",
        openapi_schema,
        overrides={
            "job_code": f"JOB-{uuid.uuid4().hex[:6].upper()}",
            "title": f"Backend Engineer Smoke Test {uuid.uuid4().hex[:5]}",
            "company_name": "Acme Cloud Labs",
            "min_cgpa": 6.0,
            "ctc_lpa": 14.5,
            "stipend_monthly": 45000,
            "location": "Bengaluru",
            "role_type": "FULL_TIME",
            "status": "OPEN",
        },
    )
    job_res = client.post("/api/v1/recruitment/jobs", json=job_payload, headers=rec_headers)
    assert job_res.status_code in (200, 201), f"Job creation failed: {job_res.text}"
    job_data = job_res.json()
    job_id = job_data.get("id") or job_data.get("job_id")
    assert job_id, f"Missing job_id in response: {job_data}"

    try:
        patch_job = _build_valid_payload(
            "JobUpdateIn",
            openapi_schema,
            overrides={"location": "Remote / Bengaluru"},
        )
        patch_res = client.patch(f"/api/v1/recruitment/jobs/{job_id}", json=patch_job, headers=rec_headers)
        assert patch_res.status_code in (200, 204), patch_res.text

        if student_auth["ready"]:
            stu_headers = student_auth["headers"]
            apply_payload = _build_valid_payload("JobApplyIn", openapi_schema)
            apply_res = client.post(
                f"/api/v1/recruitment/jobs/{job_id}/apply",
                json=apply_payload,
                headers=stu_headers,
            )
            assert apply_res.status_code in (200, 201, 400, 403, 422), apply_res.text

            if apply_res.status_code in (200, 201):
                app_data = apply_res.json()
                app_id = app_data.get("id") or app_data.get("application_id")

                if app_id:
                    status_payload = _build_valid_payload(
                        "ApplicationStatusUpdateIn",
                        openapi_schema,
                        overrides={"status": "SHORTLISTED"},
                    )
                    upd_app = client.patch(
                        f"/api/v1/recruitment/applications/{app_id}/status",
                        json=status_payload,
                        headers=rec_headers,
                    )
                    assert upd_app.status_code in (200, 204), upd_app.text

                    int_payload = _build_valid_payload(
                        "ScheduleInterviewRequest",
                        openapi_schema,
                        overrides={
                            "application_id": app_id,
                            "job_id": job_id,
                            "student_id": student_auth["user_id"],
                            "scheduled_at": "2026-12-20T14:00:00Z",
                            "start_time": "2026-12-20T14:00:00Z",
                            "end_time": "2026-12-20T15:00:00Z",
                        },
                    )
                    int_res = client.post("/api/v1/placement/interviews", json=int_payload, headers=coord_headers)
                    assert int_res.status_code in (200, 201, 400, 409, 422), int_res.text

                    if int_res.status_code in (200, 201):
                        int_id = int_res.json().get("id") or int_res.json().get("interview_id")
                        if int_id:
                            upd_int = _build_valid_payload(
                                "UpdateInterviewRequest",
                                openapi_schema,
                                overrides={"status": "COMPLETED"},
                            )
                            client.patch(
                                f"/api/v1/placement/interviews/{int_id}",
                                json=upd_int,
                                headers=coord_headers,
                            )

                    offer_payload = _build_valid_payload(
                        "IssueOfferRequest",
                        openapi_schema,
                        overrides={
                            "application_id": app_id,
                            "job_id": job_id,
                            "student_id": student_auth["user_id"],
                            "ctc_lpa": 14.5,
                        },
                    )
                    offer_res = client.post("/api/v1/placement/offers", json=offer_payload, headers=coord_headers)
                    assert offer_res.status_code in (200, 201, 400, 409, 422), offer_res.text

                    if offer_res.status_code in (200, 201):
                        offer_id = offer_res.json().get("id") or offer_res.json().get("offer_id")
                        if offer_id:
                            resp_payload = _build_valid_payload(
                                "RespondOfferRequest",
                                openapi_schema,
                                overrides={"decision": "ACCEPTED", "status": "ACCEPTED", "accept": True},
                            )
                            client.post(
                                f"/api/v1/placement/offers/{offer_id}/respond",
                                json=resp_payload,
                                headers=stu_headers,
                            )
    finally:
        client.delete(f"/api/v1/recruitment/jobs/{job_id}", headers=rec_headers)


# ---------------------------------------------------------------------------
# 4. EXAMINER & TRAINING WRITE WORKFLOWS (Question Bank & Evaluations)
# ---------------------------------------------------------------------------
def test_examiner_question_bank_and_evaluations(
    client: httpx.Client,
    examiner_auth: dict,
    student_auth: dict,
    openapi_schema: dict,
):
    """Verify POST /training/question-bank, GET /training/examiner/evaluations/me, and POST /examiner/evaluations."""
    if not examiner_auth["ready"]:
        pytest.skip("Examiner account not active (provide TEST_ADMIN_EMAIL/PASSWORD to auto-approve).")

    ex_headers = examiner_auth["headers"]

    my_evals = client.get("/api/v1/training/examiner/evaluations/me", headers=ex_headers)
    if my_evals.status_code == 403:
        pytest.skip("Examiner account is pending Admin approval (set TEST_ADMIN_EMAIL/PASSWORD to auto-approve).")
    assert my_evals.status_code == 200

    q_payload = _build_valid_payload(
        "QuestionBankCreateIn",
        openapi_schema,
        overrides={
            "question_text": f"What is the time complexity of binary search? ({uuid.uuid4().hex[:5]})",
            "prompt": f"What is the time complexity of binary search? ({uuid.uuid4().hex[:5]})",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            "correct_option": "O(log n)",
            "correct_answer": "O(log n)",
        },
    )
    q_res = client.post("/api/v1/training/question-bank", json=q_payload, headers=ex_headers)
    assert q_res.status_code in (200, 201, 422), q_res.text

    if student_auth.get("user_id"):
        eval_payload = _build_valid_payload(
            "ExaminerEvaluationIn",
            openapi_schema,
            overrides={
                "student_id": student_auth["user_id"],
                "score": 88.0,
                "remarks": "Strong system design fundamentals.",
            },
        )
        eval_res = client.post("/api/v1/training/examiner/evaluations", json=eval_payload, headers=ex_headers)
        assert eval_res.status_code in (200, 201, 400, 404, 422), eval_res.text


# ---------------------------------------------------------------------------
# 5. STUDENT CORE & PORTAL HELPDESK WRITE WORKFLOWS
# ---------------------------------------------------------------------------
def test_student_workspace_and_helpdesk_persistence(
    client: httpx.Client,
    student_auth: dict,
    openapi_schema: dict,
):
    """Verify Student registration, workspace profile/skills, and Helpdesk ticket persistence in Neon."""
    if not student_auth["ready"]:
        pytest.skip("Student account not active.")

    headers = student_auth["headers"]

    reg_profile = _build_valid_payload(
        "StudentRegistrationIn",
        openapi_schema,
        overrides={
            "roll_number": f"23F100{uuid.uuid4().hex[:4].upper()}",
            "cgpa": 8.6,
        },
    )
    reg_res = client.put("/api/v1/students/me/registration", json=reg_profile, headers=headers)
    assert reg_res.status_code in (200, 201), f"PUT /students/me/registration failed ({reg_res.status_code}): {reg_res.text}"

    ws = client.get("/api/v1/students/me", headers=headers)
    assert ws.status_code == 200, f"GET /students/me failed ({ws.status_code}): {ws.text}"

    skill_payload = _build_valid_payload(
        "SkillIn",
        openapi_schema,
        overrides={"name": "PostgreSQL", "skill_name": "PostgreSQL", "proficiency": "ADVANCED"},
    )
    add_skill = client.post("/api/v1/students/me/skills", json=skill_payload, headers=headers)
    assert add_skill.status_code in (200, 201), add_skill.text

    ticket_uid = uuid.uuid4().hex[:8].upper()
    ticket_subject = f"E2E Helpdesk Ticket {ticket_uid}"
    ticket_payload = _build_valid_payload(
        "HelpdeskTicketDTO",
        openapi_schema,
        overrides={
            "id": str(uuid.uuid4()),
            "ticketNumber": f"TKT-{ticket_uid}",
            "raisedByEmail": student_auth["email"],
            "raisedByName": "E2E Student",
            "raisedByRole": "STUDENT",
            "subject": ticket_subject,
            "description": "Automated end-to-end Neon persistence check.",
            "category": "TECHNICAL",
            "priority": "MEDIUM",
            "status": "OPEN",
        },
    )
    create_ticket = client.post("/api/v1/portal-state/helpdesk", json=ticket_payload, headers=headers)
    assert create_ticket.status_code in (200, 201), create_ticket.text

    list_tickets = client.get("/api/v1/portal-state/helpdesk", headers=headers)
    assert list_tickets.status_code == 200
    assert ticket_subject in list_tickets.text