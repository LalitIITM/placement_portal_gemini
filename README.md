# IITM Placement & Career Portal

An end-to-end campus placement, technical readiness, and recruitment governance platform built with **FastAPI**, **PostgreSQL**, **React (TypeScript)**, and **Playwright**.

---

## Core Capabilities & Role-Based Workflows

| Role | Key Capabilities & Governance Rules |
| :--- | :--- |
| **Student** | Institutional SSO login, academic profile & skill management, 3-resume cap enforcement, CGPA-gated job discovery, duplicate-blocked applications, timed 15-question readiness assessments, and offer acceptance/decline. |
| **Recruiter** | Domain-validated self-registration with mandatory **Admin approval gate** (`PENDING` -> `ACTIVE`), job posting creation with CGPA/eligibility cutoffs, ATS pipeline progression (`APPLIED` -> `SHORTLISTED` -> `INTERVIEW_SCHEDULED` -> `OFFERED` -> `OFFER_ACCEPTED`), interview scheduling, and offer release. |
| **Examiner** | Domain-validated registration with Admin approval gate, read access to domain/track question banks, and 1-on-1 final-stage candidate evaluations with 1-5 skill ratings and remedial tasks (restricted from mutating question banks via RBAC). |
| **Placement Coordinator** | Cohort readiness management, course/workshop publishing, and question-bank curation (`ADMIN` and `PLACEMENT_COORDINATOR` only). |
| **Admin** | Approving/rejecting pending Recruiter and Examiner accounts, managing question banks, resolving Student Helpdesk tickets, inspecting immutable audit logs, and tracking placement & CTC analytics. |

---

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy (Async), Alembic, PostgreSQL
- **Frontend**: React, TypeScript, Vite
- **Testing & QA**: Playwright E2E Suite (13 end-to-end tests covering smoke, persistence, RBAC, and Steps A-F business rules)

---

## Project Structure

```text
placement_platform_gemini/
├── backend/
│   ├── alembic/                 # Database schema migrations
│   └── app/
│       ├── main.py              # FastAPI entrypoint & router registration
│       └── modules/
│           ├── audit/           # Immutable audit trail service
│           ├── iam/             # SSO/auth, JWT security, role guards & approval workflows
│           ├── placement/       # Interviews, offers, helpdesk & placement analytics
│           ├── portal_state/    # Cross-role state synchronization
│           ├── recruitment/     # Job postings, eligibility checks & ATS transitions
│           ├── student/         # Student profiles, skills & 3-resume cap enforcement
│           └── training/        # Courses, timed quizzes, question banks & evaluations
└── frontend/
    ├── e2e/
    │   └── workflows.spec.ts    # Full 13-test Playwright E2E & BRULE verification suite
    ├── playwright.config.ts     # Isolated E2E runner config (Backend :8010, Frontend :5174)
    └── package.json
```

---

## Local Development Setup

### 1. Start PostgreSQL & Run Migrations
Ensure Docker is running, start the `placement_postgres` container, and apply the latest Alembic schema migrations:

```bash
docker start placement_postgres
cd backend
.venv/Scripts/python.exe -m alembic upgrade head
```

### 2. Start the Backend API
Run FastAPI on port `8010` (avoiding collisions with any local services on `:8000`):

```bash
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload
```

Interactive API documentation is available at `[http://127.0.0.1:8010/docs](http://127.0.0.1:8010/docs)`.

### 3. Start the Frontend Dev Server

```bash
cd frontend
npm install
VITE_API_BASE_URL=[http://127.0.0.1:8010](http://127.0.0.1:8010) npm run dev -- --host 127.0.0.1 --port 5174
```

---

## Running End-to-End Tests (Playwright)

`frontend/playwright.config.ts` automatically spins up isolated backend (`127.0.0.1:8010`) and frontend (`127.0.0.1:5174`) instances with `reuseExistingServer: false`.

With `placement_postgres` running and migrated:

```bash
cd frontend
npm run test:e2e
```

To inspect the HTML test report after a run:

```bash
cd frontend
npm run test:e2e:report
```

### E2E Coverage Matrix (13/13 Passing)
- **Smoke & Navigation (Tests 1-7)**: Clean render with zero console/HTTP 500 errors, full tab traversal across all roles, and state persistence across full browser reloads (`F5`).
- **Step A (IAM & Governance)**: Institutional domain validation, `PENDING` approval gate enforcement, and Admin account approval.
- **Step B (Recruiter & Drives)**: Creation of standard-eligible and high-CGPA-cutoff (`9.95`) job postings.
- **Step C (Student Lifecycle & Eligibility)**: Profile persistence, 3-resume cap enforcement, ineligible CGPA rejection, eligible application submission, and duplicate application blocking.
- **Step D (Examiner & Training RBAC)**: Separation of duties (`EXAMINER` blocked from creating question banks with `403`, `ADMIN`/`PLACEMENT_COORDINATOR` permitted), 1-on-1 candidate evaluation submission, and Student receipt.
- **Step E (ATS, Interviews & Offers)**: Status progression (`SHORTLISTED` -> `INTERVIEW_SCHEDULED`), interview slot scheduling, offer release, and Student offer acceptance.
- **Step F (Governance, Helpdesk & Audit)**: Helpdesk ticket lifecycle sync, placement analytics verification, and immutable audit log entries.
