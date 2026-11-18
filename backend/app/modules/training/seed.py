from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.training.models import (
    Course,
    CourseModule,
    QuizDomain,
    QuizQuestionBank,
    QuizTrack,
)

DS_BASE_QUESTIONS = [
    ("When should StandardScaler be fit inside a cross-validation pipeline?", ["On the entire dataset before splitting", "Inside each training fold only, then applied to validation", "Only on the test set", "After hyperparameter tuning"], 1),
    ("Which metric is most informative on a heavily imbalanced 1% positive class dataset?", ["Raw Accuracy", "PR-AUC (Precision-Recall AUC)", "R-squared", "Mean Bias Error"], 1),
    ("What does a high Population Stability Index (PSI > 0.25) indicate in production?", ["Significant covariate distribution shift", "Zero model latency", "Perfect calibration", "Training-only overfitting"], 0),
    ("Which technique calibrates predicted probabilities without altering rank ordering?", ["Dropout", "Isotonic / Platt Calibration", "L1 Pruning", "PCA"], 1),
    ("What is the variance inflation factor (VIF) used to diagnose?", ["Heteroscedasticity", "Multicollinearity among predictors", "Autocorrelation", "Non-normality of target"], 1),
    ("In gradient boosted trees, what does lowering the learning rate while increasing trees generally improve?", ["Generalization performance", "Training speed", "Memory footprint", "Label noise"], 0),
    ("Which SQL window function assigns consecutive ranks without gaps for ties?", ["RANK()", "DENSE_RANK()", "ROW_NUMBER()", "NTILE(4)"], 1),
    ("What does L1 (Lasso) regularization uniquely encourage compared to L2 (Ridge)?", ["Exact zero feature weights (sparsity)", "Uniformly small weights", "Faster matrix inversion", "Higher variance"], 0),
    ("Which hypothesis test compares medians across two independent non-normal samples?", ["Paired t-test", "Mann-Whitney U test", "Chi-square goodness of fit", "ANOVA F-test"], 1),
    ("Why is stratified splitting recommended for classification datasets?", ["It preserves class proportions across train and test folds", "It removes outliers", "It normalizes skewed features", "It reduces dimensionality"], 0),
    ("In A/B testing, what does statistical power (1 - beta) measure?", ["Probability of rejecting a false null hypothesis", "Probability of Type I error", "Sample mean variance", "Confidence interval width"], 0),
    ("Which distance metric is invariant to vector magnitude and ideal for TF-IDF text embeddings?", ["Euclidean distance", "Cosine similarity/distance", "Manhattan distance", "Hamming distance"], 1),
    ("What causes target leakage in time-series forecasting?", ["Using future lags or post-event aggregates as features", "Using rolling historical means", "Encoding day-of-week", "Dropping missing timestamps"], 0),
    ("Which loss function is minimized by logistic regression?", ["Hinge loss", "Binary cross-entropy (log loss)", "Huber loss", "Triplet loss"], 1),
    ("What does PCA maximize along its first principal component?", ["Class separability", "Projected variance of the centered data", "Mutual information with target", "L1 sparsity"], 1),
    ("In k-means clustering, what does the silhouette score measure?", ["Cluster cohesion vs separation", "Number of iterations", "Feature correlation", "Outlier count"], 0),
    ("Which technique addresses severe class imbalance without duplicating exact rows?", ["SMOTE synthetic interpolation", "Random column shuffling", "Standard scaling", "PCA whitening"], 0),
    ("What is the primary purpose of an out-of-time (OOT) validation set?", ["Verify temporal stability against concept drift", "Speed up grid search", "Tune batch size", "Replace unit tests"], 0),
    ("Which SQL clause filters groups after aggregation?", ["WHERE", "HAVING", "QUALIFY", "DISTINCT"], 1),
    ("What does SHAP (SHapley Additive exPlanations) provide for tree models?", ["Consistent local feature attribution values", "Hyperparameter bounds", "Database indexing", "GPU memory profiling"], 0),
]

SD_BASE_QUESTIONS = [
    ("Why should blocking I/O calls be avoided inside an async FastAPI route?", ["They stall the single-threaded asyncio event loop", "FastAPI rejects sync functions", "PostgreSQL drops sync connections", "CORS headers fail"], 0),
    ("Which HTTP status code best represents a business-rule conflict like exceeding max attempts?", ["200 OK", "302 Found", "409 Conflict", "502 Bad Gateway"], 2),
    ("How is immutability guaranteed on an enterprise audit log table?", ["Soft-delete flags", "Blocking UPDATE/DELETE at ORM hooks and DB triggers", "Nightly truncation", "Client-side caching"], 1),
    ("What is the primary advantage of keyset pagination over large OFFSET queries?", ["Eliminates indexes", "O(log N) index seek without scanning skipped rows", "Automatic compression", "Disables isolation"], 1),
    ("What does an idempotency key prevent on POST payment or application endpoints?", ["Duplicate side effects on network retries", "SQL injection", "Slow DNS lookups", "JWT expiration"], 0),
    ("Which PostgreSQL index type is best suited for JSONB containment (@>) queries?", ["B-Tree", "GIN (Generalized Inverted Index)", "Hash", "BRIN"], 1),
    ("In OAuth2 / JWT authentication, why use short-lived access tokens with refresh tokens?", ["Limits exposure window if an access token is leaked", "Eliminates HTTPS", "Avoids signature verification", "Stores passwords in plaintext"], 0),
    ("What is the time complexity of looking up a key in a balanced binary search tree?", ["O(1)", "O(log n)", "O(n)", "O(n log n)"], 1),
    ("Which isolation level prevents dirty reads and non-repeatable reads in PostgreSQL?", ["READ UNCOMMITTED", "REPEATABLE READ", "READ COMMITTED", "NONE"], 1),
    ("What problem does a circuit breaker pattern solve in microservice communication?", ["Cascading failures when a downstream service is degraded", "Schema migrations", "Static asset bundling", "CSS layout shifts"], 0),
    ("Which Git command replays commits from a feature branch onto the tip of main cleanly?", ["git rebase main", "git stash pop", "git bisect", "git tag"], 0),
    ("What does CORS preflight (OPTIONS) verify before a browser sends a cross-origin POST?", ["Allowed origins, HTTP methods, and custom headers", "TLS certificate chain", "Database connection pool", "DNSSEC records"], 0),
    ("Which data structure underlies Dijkstra's shortest-path algorithm for O((V+E) log V) runtime?", ["Min-Priority Queue (Binary Heap)", "LIFO Stack", "Circular Buffer", "Disjoint Set"], 0),
    ("Why parameterize SQL queries instead of string formatting?", ["Prevents SQL injection and enables query plan reuse", "Bypasses transactions", "Disables foreign keys", "Compresses text columns"], 0),
    ("What is the purpose of a database connection pooler like PgBouncer?", ["Multiplexes thousands of client connections onto a bounded set of DB backends", "Replaces backups", "Encrypts disk volumes", "Formats JSON responses"], 0),
    ("Which HTTP header instructs browsers to only connect over HTTPS?", ["Strict-Transport-Security (HSTS)", "X-Powered-By", "Accept-Encoding", "ETag"], 0),
    ("In React, what causes an infinite re-render loop inside useEffect?", ["Updating state unconditionally without a proper dependency array", "Using TypeScript interfaces", "Memoizing callbacks", "Rendering lists with keys"], 0),
    ("Which CAP theorem trade-off does a strongly consistent primary PostgreSQL node choose during a partition?", ["Consistency over Availability (CP)", "Availability over Consistency (AP)", "Neither", "Eventual disk sync"], 0),
    ("What does EXPLAIN ANALYZE in PostgreSQL show that EXPLAIN alone does not?", ["Actual execution times and row counts from running the query", "Table column types", "User permissions", "Index definitions"], 0),
    ("Which rate-limiting algorithm allows short bursts while enforcing a steady average rate?", ["Token Bucket", "Bubble Sort", "Round-Robin DNS", "Two-Phase Commit"], 0),
]

SEED_COURSES = [
    {
        "code": "DS-INT-101",
        "title": "Data Science — Internship Readiness Track",
        "category": "Data Science • Internship",
        "domain": QuizDomain.DATA_SCIENCE,
        "track": QuizTrack.INTERNSHIP,
        "skill_tag": "Data Science Internship Ready",
        "description": "Core statistics, SQL analytics, leakage-free ML pipelines, and randomized 15-question assessment.",
        "modules": [
            (1, "SQL Analytics & Window Functions", 25, "Master cohort analysis, ranking, and query optimization."),
            (2, "Leakage-Free Feature Engineering & CV", 30, "Build reproducible scikit-learn pipelines."),
            (3, "Experimental Design & Metrics Selection", 20, "Precision-recall tradeoffs and A/B hypothesis testing."),
        ],
    },
    {
        "code": "DS-SDE-201",
        "title": "Data Science — Software Development & ML Engineering",
        "category": "Data Science • Software Development",
        "domain": QuizDomain.DATA_SCIENCE,
        "track": QuizTrack.SOFTWARE_DEVELOPMENT,
        "skill_tag": "Production ML & Data Engineering",
        "description": "Production model serving, drift monitoring, calibration, and randomized 15-question assessment.",
        "modules": [
            (1, "Model Calibration & Threshold Optimization", 25, "Align classifier probabilities with business SLAs."),
            (2, "Covariate Drift & Production Telemetry", 30, "Monitor PSI, KS tests, and latency budgets."),
            (3, "Feature Stores & Batch/Online Parity", 20, "Eliminate training-serving skew."),
        ],
    },
    {
        "code": "SD-INT-102",
        "title": "Software Development — Internship Readiness Track",
        "category": "Software Development • Internship",
        "domain": QuizDomain.SOFTWARE_DEVELOPMENT,
        "track": QuizTrack.INTERNSHIP,
        "skill_tag": "Software Dev Internship Ready",
        "description": "Data structures, REST APIs, relational indexing, and randomized 15-question assessment.",
        "modules": [
            (1, "Core Data Structures & Complexity Analysis", 25, "Hash maps, heaps, trees, and graph traversals."),
            (2, "RESTful API Design & HTTP Semantics", 25, "Status codes, validation, and pagination."),
            (3, "Relational Schema Design & Indexing", 25, "B-Tree vs GIN indexes and query plans."),
        ],
    },
    {
        "code": "SD-SDE-202",
        "title": "Software Development — Full-Time SDE Track",
        "category": "Software Development • Software Development",
        "domain": QuizDomain.SOFTWARE_DEVELOPMENT,
        "track": QuizTrack.SOFTWARE_DEVELOPMENT,
        "skill_tag": "Full-Stack & Distributed SDE",
        "description": "High-concurrency FastAPI, distributed resilience, RBAC governance, and 15-question assessment.",
        "modules": [
            (1, "Async FastAPI & Connection Pooling", 25, "Prevent event-loop blocking at 50k concurrent users."),
            (2, "Idempotency, Circuit Breakers & Rate Limiting", 30, "Build fault-tolerant backend services."),
            (3, "Zero-Trust RBAC & Tamper-Proof Audit Logs", 20, "Enforce enterprise governance rules."),
        ],
    },
]


async def ensure_training_seed(session: AsyncSession) -> None:
    existing_q = (await session.execute(select(QuizQuestionBank.id).limit(1))).scalar_one_or_none()
    if existing_q is None:
        for track in (QuizTrack.INTERNSHIP, QuizTrack.SOFTWARE_DEVELOPMENT):
            for prompt, opts, idx in DS_BASE_QUESTIONS:
                session.add(
                    QuizQuestionBank(
                        domain=QuizDomain.DATA_SCIENCE,
                        track=track,
                        prompt=f"[{track.value}] {prompt}",
                        options_json=opts,
                        correct_index=idx,
                    )
                )
            for prompt, opts, idx in SD_BASE_QUESTIONS:
                session.add(
                    QuizQuestionBank(
                        domain=QuizDomain.SOFTWARE_DEVELOPMENT,
                        track=track,
                        prompt=f"[{track.value}] {prompt}",
                        options_json=opts,
                        correct_index=idx,
                    )
                )
        await session.flush()

    existing_c = (await session.execute(select(Course.id).limit(1))).scalar_one_or_none()
    if existing_c is None:
        for item in SEED_COURSES:
            course = Course(
                code=item["code"],
                title=item["title"],
                category=item["category"],
                domain=item["domain"],
                track=item["track"],
                skill_tag=item["skill_tag"],
                description=item["description"],
                pass_threshold_pct=75,
                time_limit_seconds=1800,
                questions_per_quiz=15,
                questions_json=[],
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
