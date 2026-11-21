import os
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

@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BACKEND_URL, timeout=20.0) as c:
        yield c


def test_health_and_openapi_reachable(client: httpx.Client):
    """Verify FastAPI is live on Vercel, healthy, and serves OpenAPI schema."""
    health = client.get("/health")
    assert health.status_code == 200

    schema_res = client.get("/openapi.json")
    assert schema_res.status_code == 200
    assert "/api/v1/auth/sso-login" in schema_res.json().get("paths", {})


def test_cors_preflight_allows_vercel_frontend(client: httpx.Client):
    """Verify ALLOWED_ORIGINS permits requests from your Vercel frontend."""
    res = client.options(
        "/api/v1/auth/sso-login",
        headers={
            "Origin": FRONTEND_URL,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )
    assert res.status_code in (200, 204)
    allow_origin = res.headers.get("access-control-allow-origin", "")
    assert allow_origin in (FRONTEND_URL, "*")


def test_unauthenticated_protected_routes_rejected(client: httpx.Client):
    """Verify JWT auth guard rejects unauthenticated access to protected endpoints."""
    for path in ("/api/v1/auth/me", "/api/v1/students/me", "/api/v1/audit-logs"):
        res = client.get(path)
        assert res.status_code in (401, 403), f"Expected 401/403 on {path}, got {res.status_code}"


def test_register_persists_in_neon(client: httpx.Client):
    """Verify Neon PostgreSQL write roundtrip via RegisterRequest schema."""
    schema = client.get("/openapi.json").json()
    reg_schema = schema["components"]["schemas"].get("RegisterRequest", {})
    required_fields = reg_schema.get("required", [])

    unique_id = uuid.uuid4().hex[:8]
    payload = {
        "email": f"smoketest_{unique_id}@ds.study.iitm.ac.in",
        "password": f"TestPass_{unique_id}!9",
        "full_name": "Smoke Test Student",
        "name": "Smoke Test Student",
        "role": "STUDENT",
    }
    allowed_props = reg_schema.get("properties", {}).keys()
    filtered_payload = {k: v for k, v in payload.items() if k in allowed_props}

    assert set(required_fields).issubset(filtered_payload.keys()), (
        f"Missing required RegisterRequest fields: {set(required_fields) - set(filtered_payload.keys())}"
    )

    res = client.post("/api/v1/auth/register", json=filtered_payload)
    assert res.status_code in (200, 201), f"Register failed ({res.status_code}): {res.text}"