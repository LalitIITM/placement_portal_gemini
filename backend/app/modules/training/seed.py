from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.training.models import Course, CourseModule

SEED_COURSES = [
    {
        "code": "CS-301",
        "title": "Production FastAPI & Distributed Systems",
        "category": "Backend Engineering",
        "skill_tag": "FastAPI & Async Architecture",
        "description": "Design high-throughput async APIs, connection pools, idempotency keys, and RBAC middleware.",
        "pass_threshold_pct": 75,
        "modules": [
            (1, "Async SQLAlchemy & Connection Pooling", 25, "Avoid event-loop starvation and pool exhaustion at 50k users."),
            (2, "Idempotency, Rate Limiting & Redis Caching", 30, "Protect critical mutations and cache read-heavy endpoints."),
            (3, "Zero-Trust RBAC & Immutable Audit Trails", 20, "Enforce role boundaries and append-only compliance ledgers."),
        ],
        "questions": [
            {
                "id": "q1",
                "prompt": "Why should blocking I/O calls be avoided inside an async FastAPI route?",
                "options": [
                    "They stall the single-threaded asyncio event loop",
                    "FastAPI rejects synchronous functions at import time",
                    "PostgreSQL automatically drops sync connections",
                    "CORS headers are stripped on blocking calls",
                ],
                "correct_index": 0,
            },
            {
                "id": "q2",
                "prompt": "Which HTTP status code best represents a business-rule conflict like exceeding max attempts?",
                "options": ["200 OK", "302 Found", "409 Conflict", "502 Bad Gateway"],
                "correct_index": 2,
            },
            {
                "id": "q3",
                "prompt": "How is immutability guaranteed on an audit log table?",
                "options": [
                    "Allowing soft-deletes via is_deleted flag",
                    "Blocking UPDATE/DELETE at both ORM event hooks and DB triggers",
                    "Truncating logs nightly after backup",
                    "Using browser localStorage",
                ],
                "correct_index": 1,
            },
            {
                "id": "q4",
                "prompt": "What is the primary benefit of cursor/keyset pagination over large OFFSET queries?",
                "options": [
                    "It eliminates the need for indexes",
                    "It maintains O(log N) index seeks without scanning skipped rows",
                    "It compresses JSON payloads automatically",
                    "It disables transaction isolation",
                ],
                "correct_index": 1,
            },
        ],
    },
    {
        "code": "DS-302",
        "title": "Applied ML & Statistical Modeling",
        "category": "Data Science",
        "skill_tag": "Applied Machine Learning",
        "description": "Feature engineering, cross-validation hygiene, calibration, and production drift monitoring.",
        "pass_threshold_pct": 75,
        "modules": [
            (1, "Leakage-Free Cross-Validation Pipelines", 25, "Prevent target and temporal leakage in tabular datasets."),
            (2, "Precision-Recall Tradeoffs & Threshold Tuning", 25, "Align model operating points with business costs."),
            (3, "Probability Calibration & Data Drift Detection", 20, "Monitor PSI/KS statistics and Brier scores in production."),
        ],
        "questions": [
            {
                "id": "q1",
                "prompt": "When should feature scaling (e.g., StandardScaler) be fit in a cross-validation pipeline?",
                "options": [
                    "On the entire dataset before splitting",
                    "Inside each training fold only, then applied to validation",
                    "Only on the test set",
                    "After hyperparameter tuning finishes",
                ],
                "correct_index": 1,
            },
            {
                "id": "q2",
                "prompt": "Which metric is most informative on a heavily imbalanced 1% positive class dataset?",
                "options": ["Raw Accuracy", "PR-AUC (Precision-Recall AUC)", "R-squared", "Mean Bias Error"],
                "correct_index": 1,
            },
            {
                "id": "q3",
                "prompt": "What does a high Population Stability Index (PSI > 0.25) indicate in production?",
                "options": [
                    "Significant covariate/feature distribution shift",
                    "Zero model latency",
                    "Perfect model calibration",
                    "Overfitting on training labels only",
                ],
                "correct_index": 0,
            },
            {
                "id": "q4",
                "prompt": "Which technique improves predicted probability reliability without changing rank ordering?",
                "options": ["Dropout", "Isotonic / Platt Calibration", "L1 Pruning", "PCA"],
                "correct_index": 1,
            },
        ],
    },
]


async def ensure_training_seed(session: AsyncSession) -> None:
    existing = (await session.execute(select(Course.id).limit(1))).scalar_one_or_none()
    if existing is not None:
        return

    for item in SEED_COURSES:
        course = Course(
            code=item["code"],
            title=item["title"],
            category=item["category"],
            skill_tag=item["skill_tag"],
            description=item["description"],
            pass_threshold_pct=item["pass_threshold_pct"],
            questions_json=item["questions"],
        )
        session.add(course)
        await session.flush()

        for seq, mod_title, duration, summary in item["modules"]:
            session.add(
                CourseModule(
                    course_id=course.id,
                    sequence_order=seq,
                    title=mod_title,
                    duration_minutes=duration,
                    summary=summary,
                )
            )
    await session.flush()
