import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  FileText,
  Trash2,
  Plus,
  Lock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Activity,
  Award,
  Upload,
  BookOpen,
  PlayCircle,
  CheckSquare,
  Square,
  Sparkles,
  Clock,
  EyeOff,
  GraduationCap,
  ClipboardCheck,
  Briefcase,
  Star,
  Database,
  Shuffle,
  Building2,
  Send,
  XCircle,
  Calendar,
  BadgeCheck,
  BarChart3,
  Video,
} from "lucide-react";

type Role = "STUDENT" | "RECRUITER" | "EXAMINER" | "ADMIN";
type AuthMode = "SIGN_IN" | "SIGN_UP";
type RegistrationApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
type StudentOnboardingStep = "AUTH" | "STUDENT_FORM" | "PAYMENT";

interface StudentOnboardingDraft {
  fullName: string;
  email: string;
  password: string;
  personalEmail: string;
  mobileNumber: string;
  cgpa: string;
  activeBacklogs: number;
  programLevel: ProgramLevelOption;
  hasDiplomaDataScience: boolean;
  hasDiplomaProgramming: boolean;
  applyingTrack: JobRoleTypeOption;
  targetDomain: QuizDomainOption;
  gender: string;
  stateName: string;
  category: CategoryOption;
  degreeType: DegreeTypeOption;
  isWorkingProf: boolean;
  yearsExp: string;
  workDomain: WorkDomainOption;
  presentCompany: string;
  workLocation: string;
  currentCtc: string;
}

interface RegistrationRequestRecord {
  id: string;
  fullName: string;
  email: string;
  role: Exclude<Role, "ADMIN">;
  orgOrDept: string;
  password: string;
  status: RegistrationApprovalStatus;
  submittedAt: string;
  reviewedBy?: string;
  paymentStatus?: "PAID" | "NOT_REQUIRED";
}
type ActiveTab = "IDENTITY" | "TRAINING" | "RECRUITMENT" | "PLACEMENT" | "GOVERNANCE";
type CategoryOption = "GENERAL" | "GENERAL_EWS" | "OBC" | "OBC_NCL" | "SC_ST";
type DegreeTypeOption = "STANDALONE" | "DUAL_DEGREE";
type WorkDomainOption = "DATA_SCIENCE" | "SOFTWARE_DEVELOPMENT" | "OTHERS";
type QuizDomainOption = "DATA_SCIENCE" | "SOFTWARE_DEVELOPMENT";
type QuizTrackOption = "INTERNSHIP" | "SOFTWARE_DEVELOPMENT";
type JobRoleTypeOption = "INTERNSHIP" | "FULL_TIME";
type ProgramLevelOption = "FOUNDATION" | "DIPLOMA" | "BSC" | "BS";
type AppStatusOption =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "OFFERED"
  | "OFFER_ACCEPTED"
  | "REJECTED";

interface ResumeItem {
  id: string;
  title: string;
  targetRole: string;
  fileSize: string;
  updatedAt: string;
  isPrimary: boolean;
}

interface MarksheetRecord {
  fileName: string;
  fileSize: string;
  cgpa: string;
  uploadedAt: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: Role;
  action: string;
  resource: string;
  status: "SUCCESS" | "BLOCKED";
}

interface BankQuestionItem {
  id: string;
  domain: QuizDomainOption;
  track: QuizTrackOption;
  prompt: string;
  options: string[];
  correctIndex: number;
}

interface CourseModuleItem {
  id: string;
  title: string;
  durationMinutes: number;
  summary: string;
  completed: boolean;
}

interface SkillBadgeItem {
  code: string;
  courseCode: string;
  skillName: string;
  scorePct: number;
  issuedAt: string;
}

interface TrainingTrack {
  id: string;
  code: string;
  title: string;
  domain: QuizDomainOption;
  track: QuizTrackOption;
  skillTag: string;
  passThresholdPct: number;
  attemptsUsed: number;
  maxAttempts: number;
  bestScorePct: number | null;
  modules: CourseModuleItem[];
}

interface ExaminerEvaluationRecord {
  id: string;
  studentRoll: string;
  examinerEmail: string;
  skillsets: string[];
  programmingRating: number;
  dataScienceRating: number;
  communicationRating: number;
  isPlacementReady: boolean;
  performingExceptionallyGood: boolean;
  remedialTasks: string[];
  notes: string;
  evaluatedAt: string;
}

interface JobDriveItem {
  id: string;
  jobCode: string;
  companyName: string;
  title: string;
  roleType: JobRoleTypeOption;
  domain: QuizDomainOption;
  location: string;
  compensation: string;
  description: string;
  minCgpa: number;
  maxBacklogs: number;
  allowedLevels: ProgramLevelOption[];
  requireExaminerReady: boolean;
  requiredSkillTags: string[];
}

interface JobApplicationRecord {
  id: string;
  jobId: string;
  jobCode: string;
  companyName: string;
  jobTitle: string;
  roleType: JobRoleTypeOption;
  studentRoll: string;
  studentName: string;
  studentCgpa: string;
  resumeTitle: string;
  status: AppStatusOption;
  appliedAt: string;
}

type InterviewRoundOption = "TECHNICAL_1" | "TECHNICAL_2" | "MANAGERIAL" | "HR_FINAL";
type InterviewStatusOption = "SCHEDULED" | "CONFIRMED" | "PASSED" | "FAILED";
type OfferStatusOption = "ISSUED" | "ACCEPTED" | "DECLINED";

interface InterviewScheduleRecord {
  id: string;
  applicationId: string;
  studentRoll: string;
  studentName: string;
  companyName: string;
  jobTitle: string;
  roundNumber: number;
  roundType: InterviewRoundOption;
  mode: "ONLINE_MEET" | "IN_PERSON";
  scheduledAt: string;
  meetingLink: string;
  panelistName: string;
  status: InterviewStatusOption;
  notes?: string;
}

interface OfferLetterRecord {
  id: string;
  offerCode: string;
  applicationId: string;
  studentRoll: string;
  studentName: string;
  companyName: string;
  roleTitle: string;
  roleType: JobRoleTypeOption;
  ctcLpa: number;
  joiningDate: string;
  expiresAt: string;
  status: OfferStatusOption;
  remarks?: string;
}

const INITIAL_INTERVIEWS: InterviewScheduleRecord[] = [
  {
    id: "IV-901",
    applicationId: "SEED-APP-1",
    studentRoll: "22F3001234",
    studentName: "Aarav Sharma",
    companyName: "Fractal Analytics",
    jobTitle: "Associate Data Scientist",
    roundNumber: 1,
    roundType: "TECHNICAL_1",
    mode: "ONLINE_MEET",
    scheduledAt: "2026-11-22T10:30",
    meetingLink: "https://meet.google.com/iitm-fractal-ds1",
    panelistName: "Dr. Meera Subramanian (Principal DS)",
    status: "SCHEDULED",
  },
];

const INITIAL_OFFERS: OfferLetterRecord[] = [
  {
    id: "OFR-501",
    offerCode: "OFR-2026-8841A",
    applicationId: "SEED-APP-2",
    studentRoll: "22F3001234",
    studentName: "Aarav Sharma",
    companyName: "Flipkart",
    roleTitle: "Data Science Intern — Supply Chain",
    roleType: "INTERNSHIP",
    ctcLpa: 7.2,
    joiningDate: "2027-01-11",
    expiresAt: "2026-12-05",
    status: "ISSUED",
  },
];

const ALLOWED_DOMAINS = ["@ds.study.iitm.ac.in", "@es.study.iitm.ac.in"];
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const QUIZ_DURATION_SECONDS = 30 * 60;
const QUESTIONS_PER_QUIZ = 15;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
  "Other",
];

const SEED_DS_BANK: Array<[string, string[], number]> = [
  ["When should StandardScaler be fit inside a cross-validation pipeline?", ["On the entire dataset before splitting", "Inside each training fold only, then applied to validation", "Only on the test set", "After hyperparameter tuning"], 1],
  ["Which metric is most informative on a heavily imbalanced 1% positive class dataset?", ["Raw Accuracy", "PR-AUC (Precision-Recall AUC)", "R-squared", "Mean Bias Error"], 1],
  ["What does a high Population Stability Index (PSI > 0.25) indicate in production?", ["Significant covariate distribution shift", "Zero model latency", "Perfect calibration", "Training-only overfitting"], 0],
  ["Which technique calibrates predicted probabilities without altering rank ordering?", ["Dropout", "Isotonic / Platt Calibration", "L1 Pruning", "PCA"], 1],
  ["What is the variance inflation factor (VIF) used to diagnose?", ["Heteroscedasticity", "Multicollinearity among predictors", "Autocorrelation", "Non-normality of target"], 1],
  ["In gradient boosted trees, what does lowering learning rate with more estimators generally improve?", ["Generalization performance", "Training speed", "Memory footprint", "Label noise"], 0],
  ["Which SQL window function assigns consecutive ranks without gaps for ties?", ["RANK()", "DENSE_RANK()", "ROW_NUMBER()", "NTILE(4)"], 1],
  ["What does L1 (Lasso) regularization uniquely encourage compared to L2 (Ridge)?", ["Exact zero feature weights (sparsity)", "Uniformly small weights", "Faster matrix inversion", "Higher variance"], 0],
  ["Which hypothesis test compares medians across two independent non-normal samples?", ["Paired t-test", "Mann-Whitney U test", "Chi-square test", "ANOVA F-test"], 1],
  ["Why is stratified splitting recommended for classification datasets?", ["Preserves class proportions across train and test folds", "Removes outliers", "Normalizes skewed features", "Reduces dimensionality"], 0],
  ["In A/B testing, what does statistical power (1 - β) measure?", ["Probability of rejecting a false null hypothesis", "Type I error probability", "Sample mean variance", "Confidence interval width"], 0],
  ["Which distance metric is invariant to vector magnitude and ideal for TF-IDF text embeddings?", ["Euclidean distance", "Cosine similarity/distance", "Manhattan distance", "Hamming distance"], 1],
  ["What causes target leakage in time-series forecasting?", ["Using future lags or post-event aggregates as features", "Using rolling historical means", "Encoding day-of-week", "Dropping missing timestamps"], 0],
  ["Which loss function is minimized by binary logistic regression?", ["Hinge loss", "Binary cross-entropy (log loss)", "Huber loss", "Triplet loss"], 1],
  ["What does PCA maximize along its first principal component?", ["Class separability", "Projected variance of centered data", "Mutual information", "L1 sparsity"], 1],
  ["In k-means clustering, what does the silhouette score measure?", ["Cluster cohesion vs separation", "Iteration count", "Feature correlation", "Outlier count"], 0],
  ["Which technique addresses class imbalance by interpolating synthetic minority points?", ["SMOTE", "Random column shuffling", "Standard scaling", "PCA whitening"], 0],
  ["What is the primary purpose of an out-of-time (OOT) validation split?", ["Verify temporal stability against concept drift", "Speed up grid search", "Tune batch size", "Replace unit tests"], 0],
  ["Which SQL clause filters groups after aggregation?", ["WHERE", "HAVING", "ORDER BY", "DISTINCT"], 1],
  ["What does SHAP provide for gradient boosted tree models?", ["Consistent local feature attribution values", "Hyperparameter bounds", "Database indexing", "GPU profiling"], 0],
];

const SEED_SD_BANK: Array<[string, string[], number]> = [
  ["Why should blocking I/O calls be avoided inside an async FastAPI route?", ["They stall the single-threaded asyncio event loop", "FastAPI rejects sync functions", "PostgreSQL drops sync connections", "CORS headers fail"], 0],
  ["Which HTTP status code best represents a business-rule conflict like exceeding max attempts?", ["200 OK", "302 Found", "409 Conflict", "502 Bad Gateway"], 2],
  ["How is immutability guaranteed on an enterprise audit log table?", ["Soft-delete flags", "Blocking UPDATE/DELETE at ORM hooks and DB triggers", "Nightly truncation", "Client-side caching"], 1],
  ["What is the primary advantage of keyset pagination over large OFFSET queries?", ["Eliminates indexes", "O(log N) index seek without scanning skipped rows", "Automatic compression", "Disables isolation"], 1],
  ["What does an idempotency key prevent on POST application or payment endpoints?", ["Duplicate side effects on network retries", "SQL injection", "Slow DNS lookups", "JWT expiration"], 0],
  ["Which PostgreSQL index type is best suited for JSONB containment (@>) queries?", ["B-Tree", "GIN (Generalized Inverted Index)", "Hash", "BRIN"], 1],
  ["In JWT authentication, why use short-lived access tokens paired with refresh tokens?", ["Limits exposure window if an access token is compromised", "Eliminates HTTPS", "Avoids signature verification", "Stores passwords in plaintext"], 0],
  ["What is the average lookup time complexity in a balanced binary search tree?", ["O(1)", "O(log n)", "O(n)", "O(n log n)"], 1],
  ["Which PostgreSQL isolation level prevents dirty reads and non-repeatable reads?", ["READ UNCOMMITTED", "REPEATABLE READ", "READ COMMITTED", "NONE"], 1],
  ["What problem does a circuit breaker pattern solve in distributed services?", ["Cascading failures when a downstream dependency degrades", "Schema migrations", "Static asset bundling", "CSS layout shifts"], 0],
  ["Which Git command replays commits from a feature branch onto the tip of main cleanly?", ["git rebase main", "git stash pop", "git bisect", "git tag"], 0],
  ["What does CORS preflight (OPTIONS) verify before a browser sends a cross-origin POST?", ["Allowed origins, HTTP methods, and custom headers", "TLS certificate chain", "DB connection pool", "DNSSEC records"], 0],
  ["Which data structure underlies Dijkstra's shortest-path algorithm for O((V+E) log V) runtime?", ["Min-Priority Queue (Binary Heap)", "LIFO Stack", "Circular Buffer", "Disjoint Set"], 0],
  ["Why parameterize SQL queries instead of string concatenation?", ["Prevents SQL injection and enables query plan reuse", "Bypasses transactions", "Disables foreign keys", "Compresses text columns"], 0],
  ["What is the purpose of a database connection pooler like PgBouncer?", ["Multiplexes client connections onto a bounded pool of DB backends", "Replaces backups", "Encrypts disk volumes", "Formats JSON"], 0],
  ["Which HTTP response header enforces HTTPS-only connections in browsers?", ["Strict-Transport-Security (HSTS)", "X-Powered-By", "Accept-Encoding", "ETag"], 0],
  ["In React, what causes an infinite re-render loop inside useEffect?", ["Updating state unconditionally without a proper dependency array", "Using TypeScript interfaces", "Memoizing callbacks", "Rendering lists with keys"], 0],
  ["Which CAP theorem trade-off does a strongly consistent PostgreSQL primary choose during a partition?", ["Consistency over Availability (CP)", "Availability over Consistency (AP)", "Neither", "Eventual disk sync"], 0],
  ["What does EXPLAIN ANALYZE in PostgreSQL show that EXPLAIN alone does not?", ["Actual execution times and row counts from running the query", "Table column types", "User permissions", "Index definitions"], 0],
  ["Which rate-limiting algorithm allows short bursts while enforcing a steady average rate?", ["Token Bucket", "Bubble Sort", "Round-Robin DNS", "Two-Phase Commit"], 0],
];

function buildInitialQuestionBank(): BankQuestionItem[] {
  const bank: BankQuestionItem[] = [];
  (["INTERNSHIP", "SOFTWARE_DEVELOPMENT"] as QuizTrackOption[]).forEach((track) => {
    SEED_DS_BANK.forEach(([prompt, options, correctIndex], idx) => {
      bank.push({
        id: `ds-${track}-${idx + 1}`,
        domain: "DATA_SCIENCE",
        track,
        prompt,
        options,
        correctIndex,
      });
    });
    SEED_SD_BANK.forEach(([prompt, options, correctIndex], idx) => {
      bank.push({
        id: `sd-${track}-${idx + 1}`,
        domain: "SOFTWARE_DEVELOPMENT",
        track,
        prompt,
        options,
        correctIndex,
      });
    });
  });
  return bank;
}

const INITIAL_TRACKS: TrainingTrack[] = [
  {
    id: "track-ds-intern",
    code: "DS-INT-101",
    title: "Data Science — Internship Track",
    domain: "DATA_SCIENCE",
    track: "INTERNSHIP",
    skillTag: "Data Science Internship Ready",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      { id: "m-1", title: "SQL Analytics & Window Functions", durationMinutes: 25, summary: "Cohort queries, DENSE_RANK, and aggregation hygiene.", completed: true },
      { id: "m-2", title: "Leakage-Free Cross-Validation", durationMinutes: 30, summary: "Fold-safe scalers and stratified splits.", completed: false },
    ],
  },
  {
    id: "track-ds-sde",
    code: "DS-SDE-201",
    title: "Data Science — Software Development Track",
    domain: "DATA_SCIENCE",
    track: "SOFTWARE_DEVELOPMENT",
    skillTag: "Production ML & Data Engineering",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      { id: "m-3", title: "Model Calibration & Threshold Tuning", durationMinutes: 25, summary: "Platt/Isotonic calibration and cost-sensitive operating points.", completed: false },
      { id: "m-4", title: "Covariate Drift & Telemetry (PSI/KS)", durationMinutes: 30, summary: "Detect production data drift before accuracy degrades.", completed: false },
    ],
  },
  {
    id: "track-sd-intern",
    code: "SD-INT-102",
    title: "Software Development — Internship Track",
    domain: "SOFTWARE_DEVELOPMENT",
    track: "INTERNSHIP",
    skillTag: "Software Dev Internship Ready",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      { id: "m-5", title: "Core Data Structures & Graph Algorithms", durationMinutes: 25, summary: "Heaps, hash tables, BFS/DFS, and shortest paths.", completed: false },
      { id: "m-6", title: "REST Semantics & Relational Indexing", durationMinutes: 25, summary: "HTTP status codes, keyset pagination, and B-Trees.", completed: false },
    ],
  },
  {
    id: "track-sd-sde",
    code: "SD-SDE-202",
    title: "Software Development — Software Development Track",
    domain: "SOFTWARE_DEVELOPMENT",
    track: "SOFTWARE_DEVELOPMENT",
    skillTag: "Full-Stack & Distributed SDE",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      { id: "m-7", title: "Async FastAPI & Connection Pooling", durationMinutes: 25, summary: "Prevent event-loop starvation at 50k concurrent users.", completed: false },
      { id: "m-8", title: "Idempotency, Circuit Breakers & RBAC", durationMinutes: 30, summary: "Build resilient, tamper-audited backend systems.", completed: false },
    ],
  },
];

const INITIAL_JOBS: JobDriveItem[] = [
  {
    id: "job-flipkart-intern",
    jobCode: "DRV-2026-FLIPKART-INT",
    companyName: "Flipkart",
    title: "Data Science & Analytics Intern (6 Months)",
    roleType: "INTERNSHIP",
    domain: "DATA_SCIENCE",
    location: "Bengaluru",
    compensation: "₹75,000 / month",
    description: "Supply-chain demand forecasting, anomaly detection, and A/B experimentation.",
    minCgpa: 7.5,
    maxBacklogs: 0,
    allowedLevels: ["DIPLOMA", "BSC", "BS"],
    requireExaminerReady: false,
    requiredSkillTags: [],
  },
  {
    id: "job-zoho-intern",
    jobCode: "DRV-2026-ZOHO-INT",
    companyName: "Zoho Corporation",
    title: "Software Developer Intern",
    roleType: "INTERNSHIP",
    domain: "SOFTWARE_DEVELOPMENT",
    location: "Chennai",
    compensation: "₹45,000 / month",
    description: "Full-stack cloud productivity applications, REST APIs, and relational query tuning.",
    minCgpa: 7.0,
    maxBacklogs: 1,
    allowedLevels: ["DIPLOMA", "BSC", "BS"],
    requireExaminerReady: false,
    requiredSkillTags: [],
  },
  {
    id: "job-fractal-ft",
    jobCode: "DRV-2026-FRACTAL",
    companyName: "Fractal Analytics",
    title: "Applied Data Scientist — Decision Sciences",
    roleType: "FULL_TIME",
    domain: "DATA_SCIENCE",
    location: "Bengaluru / Mumbai (Hybrid)",
    compensation: "₹16.5 LPA",
    description: "Production forecasting, propensity modeling, and causal inference pipelines.",
    minCgpa: 8.0,
    maxBacklogs: 0,
    allowedLevels: ["BSC", "BS"],
    requireExaminerReady: true,
    requiredSkillTags: ["Production ML & Data Engineering"],
  },
  {
    id: "job-razorpay-ft",
    jobCode: "DRV-2026-RAZORPAY",
    companyName: "Razorpay",
    title: "Software Development Engineer I (Backend)",
    roleType: "FULL_TIME",
    domain: "SOFTWARE_DEVELOPMENT",
    location: "Bengaluru",
    compensation: "₹22.0 LPA",
    description: "High-throughput payment orchestration APIs, idempotent ledgers, and microservices.",
    minCgpa: 8.2,
    maxBacklogs: 0,
    allowedLevels: ["BSC", "BS"],
    requireExaminerReady: true,
    requiredSkillTags: ["Full-Stack & Distributed SDE"],
  },
];

function drawRandomQuestions(pool: BankQuestionItem[], count: number): BankQuestionItem[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export default function App() {
  const [email, setEmail] = useState("22f3001234@ds.study.iitm.ac.in");
  const [selectedRole, setSelectedRole] = useState<Role>("STUDENT");
  const [user, setUser] = useState<{ email: string; role: Role; name: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("SIGN_IN");
  const [onboardingStep, setOnboardingStep] = useState<StudentOnboardingStep>("AUTH");
  const [studentDraft, setStudentDraft] = useState<StudentOnboardingDraft>({
    fullName: "",
    email: "",
    password: "",
    personalEmail: "",
    mobileNumber: "",
    cgpa: "",
    activeBacklogs: 0,
    programLevel: "DIPLOMA",
    hasDiplomaDataScience: false,
    hasDiplomaProgramming: false,
    applyingTrack: "INTERNSHIP",
    targetDomain: "DATA_SCIENCE",
    gender: "",
    stateName: "",
    category: "GENERAL",
    degreeType: "STANDALONE",
    isWorkingProf: false,
    yearsExp: "",
    workDomain: "DATA_SCIENCE",
    presentCompany: "",
    workLocation: "",
    currentCtc: "",
  });
  const [eligibilityVerdict, setEligibilityVerdict] = useState<{
    eligible: boolean;
    message: string;
  } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [password, setPassword] = useState("123456");
  const [regFullName, setRegFullName] = useState("");
  const [regOrgOrDept, setRegOrgOrDept] = useState("");
  const [registrations, setRegistrations] = useState<RegistrationRequestRecord[]>([
    {
      id: "REG-101",
      fullName: "Test Student (22F3001013)",
      email: "22f3001013@ds.study.iitm.ac.in",
      role: "STUDENT",
      orgOrDept: "BS Data Science • Roll 22F3001013",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-10 09:15 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-102",
      fullName: "Shyam (Viva Examiner)",
      email: "shyam@ds.iitm.ac.in",
      role: "EXAMINER",
      orgOrDept: "Technical Viva & Assessment Panel",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-11 11:00 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-103",
      fullName: "Ricoh India HR",
      email: "hr@ricoh.in",
      role: "RECRUITER",
      orgOrDept: "Ricoh India • Talent Acquisition",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-11 14:20 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-104",
      fullName: "Aarav Sharma",
      email: "22f3001234@ds.study.iitm.ac.in",
      role: "STUDENT",
      orgOrDept: "BS Data Science • Roll 22F3001234",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-12 09:30 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-105",
      fullName: "Rohan Deshmukh",
      email: "23f1004512@ds.study.iitm.ac.in",
      role: "STUDENT",
      orgOrDept: "BS Data Science • Roll 23F1004512",
      password: "123456",
      status: "PENDING",
      submittedAt: "2026-11-18 10:05 IST",
    },
  ]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("RECRUITMENT");

  // Increment 1: Complete Student Registration Dossier
  const [fullName, setFullName] = useState("Aarav Sharma");
  const [cgpaInput, setCgpaInput] = useState("8.92");
  const [programLevel, setProgramLevel] = useState<ProgramLevelOption>("BSC");
  const [activeBacklogs, setActiveBacklogs] = useState<number>(0);
  const [isPlaced, setIsPlaced] = useState<boolean>(false);
  const [gender, setGender] = useState("Male");
  const [mobileNumber, setMobileNumber] = useState("+91 9876543210");
  const [personalEmail, setPersonalEmail] = useState("aarav.sharma@gmail.com");
  const [stateName, setStateName] = useState("Maharashtra");
  const [category, setCategory] = useState<CategoryOption>("GENERAL");
  const [degreeType, setDegreeType] = useState<DegreeTypeOption>("STANDALONE");
  const [studentTargetDomain, setStudentTargetDomain] = useState<QuizDomainOption>("DATA_SCIENCE");
  const [studentApplyingTrack, setStudentApplyingTrack] = useState<JobRoleTypeOption>("INTERNSHIP");
  const [isWorkingProf, setIsWorkingProf] = useState<boolean>(false);
  const [yearsExp, setYearsExp] = useState("2.0");
  const [workDomain, setWorkDomain] = useState<WorkDomainOption>("DATA_SCIENCE");
  const [presentCompany, setPresentCompany] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [currentCtc, setCurrentCtc] = useState("");
  const [regAlert, setRegAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  // Increment 1: Developer Handles & BS Marksheet
  const [linkedinId, setLinkedinId] = useState("aarav-sharma-iitm");
  const [githubUsername, setGithubUsername] = useState("aarav-ds-iitm");
  const [kaggleUsername, setKaggleUsername] = useState("aaravml");
  const [handlesSavedBanner, setHandlesSavedBanner] = useState<string | null>(null);

  const [marksheet, setMarksheet] = useState<MarksheetRecord | null>(null);
  const [marksheetFile, setMarksheetFile] = useState<File | null>(null);
  const [marksheetAlert, setMarksheetAlert] = useState<string | null>(null);
  const marksheetInputRef = useRef<HTMLInputElement | null>(null);

  // Increment 1: Resume Vault
  const [resumes, setResumes] = useState<ResumeItem[]>([
    {
      id: "res-1",
      title: "SDE_Backend_FastAPI_2026.pdf",
      targetRole: "Backend Engineer",
      fileSize: "412 KB",
      updatedAt: "08:00 IST",
      isPrimary: true,
    },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newTarget, setNewTarget] = useState("");
  const [vaultAlert, setVaultAlert] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Increment 2: Question Bank Database + Random 15-Question Quiz Engine
  const [questionBank, setQuestionBank] = useState<BankQuestionItem[]>(buildInitialQuestionBank);
  const [tracks, setTracks] = useState<TrainingTrack[]>(INITIAL_TRACKS);
  const [activeTrackId, setActiveTrackId] = useState<string>(INITIAL_TRACKS[0].id);
  const [drawnQuestions, setDrawnQuestions] = useState<BankQuestionItem[]>([]);
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(QUIZ_DURATION_SECONDS);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizBanner, setQuizBanner] = useState<{
    type: "PASS" | "FAIL" | "BLOCKED";
    text: string;
  } | null>(null);
  const [badges, setBadges] = useState<SkillBadgeItem[]>([]);

  // Question Bank Builder State
  const [qbDomain, setQbDomain] = useState<QuizDomainOption>("DATA_SCIENCE");
  const [qbTrack, setQbTrack] = useState<QuizTrackOption>("INTERNSHIP");
  const [qbPrompt, setQbPrompt] = useState("");
  const [qbOpt0, setQbOpt0] = useState("");
  const [qbOpt1, setQbOpt1] = useState("");
  const [qbOpt2, setQbOpt2] = useState("");
  const [qbOpt3, setQbOpt3] = useState("");
  const [qbCorrectIdx, setQbCorrectIdx] = useState<number>(0);
  const [qbBanner, setQbBanner] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  // Increment 2: Final Stage Examiner Interview Evaluation State
  const [evalSkillsets, setEvalSkillsets] = useState("Python, SQL, FastAPI, Machine Learning");
  const [progRating, setProgRating] = useState<number>(4);
  const [dsRating, setDsRating] = useState<number>(4);
  const [commRating, setCommRating] = useState<number>(4);
  const [isPlacementReady, setIsPlacementReady] = useState<boolean>(true);
  const [performingExceptionallyGood, setPerformingExceptionallyGood] = useState<boolean>(false);
  const [remedialTasksText, setRemedialTasksText] = useState(
    "1. Solve 25 medium DSA graph & DP problems\n2. Complete 2 mock system design interviews"
  );
  const [examinerNotes, setExaminerNotes] = useState("");
  const [evalBanner, setEvalBanner] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);
  const [evaluations, setEvaluations] = useState<ExaminerEvaluationRecord[]>([]);

  // Increment 3: Recruitment, Job Postings & Application Eligibility Engine
  const [jobs, setJobs] = useState<JobDriveItem[]>(INITIAL_JOBS);
  const [applications, setApplications] = useState<JobApplicationRecord[]>([]);
  const [selectedResumeIdForApply, setSelectedResumeIdForApply] = useState<string>("res-1");
  const [jobAlert, setJobAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  // Recruiter New Job Form
  const [newJobCode, setNewJobCode] = useState("DRV-2026-SWIGGY");
  const [newCompany, setNewCompany] = useState("Swiggy");
  const [newJobTitle, setNewJobTitle] = useState("Data Science Intern — Logistics");
  const [newRoleType, setNewRoleType] = useState<JobRoleTypeOption>("INTERNSHIP");
  const [newJobDomain, setNewJobDomain] = useState<QuizDomainOption>("DATA_SCIENCE");
  const [newLocation, setNewLocation] = useState("Bengaluru");
  const [newCompensation, setNewCompensation] = useState("₹60,000 / month");
  const [newMinCgpa, setNewMinCgpa] = useState("7.50");
  const [newRequireReady, setNewRequireReady] = useState(false);

  // Immutable Audit Trail
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([
    {
      id: "AUD-1001",
      timestamp: "08:00:00 IST",
      actor: "system@iitm.ac.in",
      role: "ADMIN",
      action: "PLATFORM_INITIALIZED",
      resource: "Increment 1 (Registration/Vault), Increment 2 (80-Q Bank/Examiner), Increment 3 (4 Drives/Eligibility Engine)",
      status: "SUCCESS",
    },
  ]);

  const appendAudit = useCallback(
    (
      actor: string,
      role: Role,
      action: string,
      resource: string,
      status: "SUCCESS" | "BLOCKED" = "SUCCESS"
    ) => {
      const entry: AuditEntry = {
        id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
        actor,
        role,
        action,
        resource,
        status,
      };
      setAuditLogs((prev) => [entry, ...prev]);
    },
    []
  );

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];

  const finalizeQuizAttempt = useCallback(
    (reason: "NORMAL" | "TIMEOUT" | "TAB_SWITCH_VIOLATION") => {
      if (!user) return;

      if (activeTrack.attemptsUsed >= activeTrack.maxAttempts) {
        setIsQuizActive(false);
        setQuizBanner({
          type: "BLOCKED",
          text: `BRULE-12 Enforcement: Maximum ${activeTrack.maxAttempts} assessment attempts exhausted for ${activeTrack.code}.`,
        });
        appendAudit(
          user.email,
          user.role,
          "BRULE_12_BLOCKED",
          `${activeTrack.code} (Attempt #${activeTrack.attemptsUsed + 1})`,
          "BLOCKED"
        );
        return;
      }

      const nextAttemptNum = activeTrack.attemptsUsed + 1;
      const totalQ = drawnQuestions.length || QUESTIONS_PER_QUIZ;
      let correctCount = 0;
      let scorePct = 0;
      let passed = false;

      if (reason === "NORMAL") {
        correctCount = drawnQuestions.reduce(
          (acc, q) => (quizAnswers[q.id] === q.correctIndex ? acc + 1 : acc),
          0
        );
        scorePct = Math.round((correctCount / totalQ) * 100);
        passed = scorePct >= activeTrack.passThresholdPct;
      }

      setIsQuizActive(false);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === activeTrack.id
            ? {
                ...t,
                attemptsUsed: nextAttemptNum,
                bestScorePct: Math.max(t.bestScorePct ?? 0, scorePct),
              }
            : t
        )
      );

      if (reason === "TAB_SWITCH_VIOLATION") {
        appendAudit(
          user.email,
          user.role,
          "ASSESSMENT_TAB_VIOLATION",
          `${activeTrack.code} • Attempt ${nextAttemptNum}/${activeTrack.maxAttempts} auto-failed (0%)`,
          "BLOCKED"
        );
        setQuizBanner({
          type: "BLOCKED",
          text: `Proctoring Violation: Tab/window switch detected! Attempt #${nextAttemptNum} automatically failed (0%). ${
            activeTrack.maxAttempts - nextAttemptNum
          } attempt(s) remaining.`,
        });
        return;
      }

      if (reason === "TIMEOUT") {
        appendAudit(
          user.email,
          user.role,
          "ASSESSMENT_TIMEOUT",
          `${activeTrack.code} • 30:00 timer expired on Attempt ${nextAttemptNum}/${activeTrack.maxAttempts}`,
          "BLOCKED"
        );
        setQuizBanner({
          type: "FAIL",
          text: `Time Expired (30:00)! Attempt #${nextAttemptNum} recorded as failed (0%). ${
            activeTrack.maxAttempts - nextAttemptNum
          } attempt(s) remaining.`,
        });
        return;
      }

      appendAudit(
        user.email,
        user.role,
        passed ? "ASSESSMENT_PASSED" : "ASSESSMENT_FAILED",
        `${activeTrack.code} • ${correctCount}/${totalQ} correct (${scorePct}%) on Attempt ${nextAttemptNum}/${activeTrack.maxAttempts}`,
        "SUCCESS"
      );

      if (passed) {
        const alreadyHasBadge = badges.some((b) => b.courseCode === activeTrack.code);
        if (!alreadyHasBadge) {
          const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
          const code = `BADGE-IITM-${activeTrack.code.replace(/-/g, "")}-${hash}`;
          const newBadge: SkillBadgeItem = {
            code,
            courseCode: activeTrack.code,
            skillName: activeTrack.skillTag,
            scorePct,
            issuedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
          };
          setBadges((prev) => [newBadge, ...prev]);
          appendAudit(
            user.email,
            user.role,
            "BADGE_ISSUED",
            `${code} (${activeTrack.skillTag})`,
            "SUCCESS"
          );
        }
        setQuizBanner({
          type: "PASS",
          text: `Auto-Evaluated: ${correctCount}/${totalQ} correct (${scorePct}%) — PASSED! Verified credential "${activeTrack.skillTag}" issued.`,
        });
      } else {
        const remaining = activeTrack.maxAttempts - nextAttemptNum;
        setQuizBanner({
          type: "FAIL",
          text: `Auto-Evaluated: ${correctCount}/${totalQ} correct (${scorePct}% • Required: ${activeTrack.passThresholdPct}%). ${remaining} attempt(s) remaining under BRULE-12.`,
        });
      }
    },
    [activeTrack, appendAudit, badges, drawnQuestions, quizAnswers, user]
  );

  useEffect(() => {
    if (!isQuizActive) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          finalizeQuizAttempt("TIMEOUT");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isQuizActive, finalizeQuizAttempt]);

  useEffect(() => {
    if (!isQuizActive) return;
    const handleVisibilityChange = () => {
      if (document.hidden) finalizeQuizAttempt("TAB_SWITCH_VIOLATION");
    };
    const handleWindowBlur = () => {
      finalizeQuizAttempt("TAB_SWITCH_VIOLATION");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isQuizActive, finalizeQuizAttempt]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const BLOCKED_PUBLIC_DOMAINS = [
    "@gmail.com",
    "@yahoo.com",
    "@hotmail.com",
    "@outlook.com",
    "@icloud.com",
    "@protonmail.com",
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthNotice(null);
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setAuthError("Please enter your institutional or corporate email address.");
      return;
    }

    if (selectedRole === "STUDENT") {
      const validDomain = ALLOWED_DOMAINS.some((d) => normalized.endsWith(d));
      if (!validDomain) {
        setAuthError(
          "Domain Guard Rejected: Students must authenticate with @ds.study.iitm.ac.in or @es.study.iitm.ac.in."
        );
        appendAudit(normalized, "STUDENT", "SSO_DOMAIN_REJECTED", "IAM Domain Filter", "BLOCKED");
        return;
      }
    } else if (selectedRole === "RECRUITER") {
      if (
        BLOCKED_PUBLIC_DOMAINS.some((d) => normalized.endsWith(d)) ||
        ALLOWED_DOMAINS.some((d) => normalized.endsWith(d))
      ) {
        setAuthError("Recruiters must sign in with an official corporate email domain.");
        appendAudit(normalized, "RECRUITER", "CORPORATE_DOMAIN_REJECTED", "IAM Domain Filter", "BLOCKED");
        return;
      }
    }

    if (selectedRole !== "ADMIN") {
      const matchedReg = registrations.find(
        (r) => r.email.toLowerCase() === normalized && r.role === selectedRole
      );
      if (!matchedReg) {
        setAuthError(
          `No approved ${selectedRole} registration found for ${normalized}. Please switch to the Register (Sign Up) tab first.`
        );
        appendAudit(normalized, selectedRole, "LOGIN_UNREGISTERED", "IAM Approval Gate", "BLOCKED");
        return;
      }
      if (matchedReg.status === "PENDING") {
        setAuthError(
          "Account Pending Approval: Your registration is awaiting Placement Admin verification before sign-in is enabled."
        );
        appendAudit(normalized, selectedRole, "LOGIN_PENDING_APPROVAL", "IAM Approval Gate", "BLOCKED");
        return;
      }
      if (matchedReg.status === "REJECTED") {
        setAuthError(
          "Registration Declined: This account request was rejected by Placement Admin. Contact placement support."
        );
        appendAudit(normalized, selectedRole, "LOGIN_REJECTED_ACCOUNT", "IAM Approval Gate", "BLOCKED");
        return;
      }
      if (password !== matchedReg.password) {
        setAuthError("Invalid password. Please verify your credentials.");
        appendAudit(normalized, selectedRole, "LOGIN_BAD_PASSWORD", "IAM Credential Check", "BLOCKED");
        return;
      }
      setAuthError(null);
      setUser({ email: normalized, role: selectedRole, name: matchedReg.fullName });
      appendAudit(normalized, selectedRole, "USER_LOGIN", "Sliding 30m Session (BRULE-03)", "SUCCESS");
      return;
    }

    if (normalized !== "placement.admin@iitm.ac.in") {
      setAuthError(
        "Admin Access Denied: Only authorized Placement Admin accounts (placement.admin@iitm.ac.in) may sign in as ADMIN."
      );
      appendAudit(normalized, "ADMIN", "ADMIN_UNAUTHORIZED_EMAIL", "IAM Admin Guard", "BLOCKED");
      return;
    }

    if (password !== "123456") {
      setAuthError("Invalid Admin password. Please verify your credentials.");
      appendAudit(normalized, "ADMIN", "ADMIN_BAD_PASSWORD", "IAM Credential Check", "BLOCKED");
      return;
    }

    setAuthError(null);
    setUser({ email: normalized, role: "ADMIN", name: "Placement Admin" });
    appendAudit(normalized, "ADMIN", "ADMIN_LOGIN", "Sliding 30m Session (BRULE-03)", "SUCCESS");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthNotice(null);
    if (selectedRole === "ADMIN") {
      setAuthError("Admin accounts cannot self-register.");
      return;
    }

    const normalized = email.trim().toLowerCase();
    const cleanName = regFullName.trim();
    const cleanOrg = regOrgOrDept.trim();

    if (!cleanName || !normalized || !cleanOrg) {
      setAuthError("Please complete Full Name, Email, and Department / Organization details.");
      return;
    }

    if (selectedRole === "STUDENT") {
      const validDomain = ALLOWED_DOMAINS.some((d) => normalized.endsWith(d));
      if (!validDomain) {
        setAuthError(
          "Domain Guard Rejected: Student registration requires @ds.study.iitm.ac.in or @es.study.iitm.ac.in."
        );
        appendAudit(normalized, "STUDENT", "SIGNUP_DOMAIN_REJECTED", "IAM Domain Filter", "BLOCKED");
        return;
      }
    } else if (selectedRole === "RECRUITER") {
      if (
        BLOCKED_PUBLIC_DOMAINS.some((d) => normalized.endsWith(d)) ||
        ALLOWED_DOMAINS.some((d) => normalized.endsWith(d))
      ) {
        setAuthError("Recruiter registration requires an official corporate email domain.");
        appendAudit(normalized, "RECRUITER", "SIGNUP_DOMAIN_REJECTED", "IAM Domain Filter", "BLOCKED");
        return;
      }
    }

    const existing = registrations.find(
      (r) => r.email.toLowerCase() === normalized && r.role === selectedRole
    );
    if (existing) {
      setAuthError(
        `A ${selectedRole} registration for ${normalized} already exists (Current Status: ${existing.status}).`
      );
      return;
    }

    const newRecord: RegistrationRequestRecord = {
      id: `REG-${101 + registrations.length}`,
      fullName: cleanName,
      email: normalized,
      role: selectedRole,
      orgOrDept: cleanOrg,
      password: password || "123456",
      status: "PENDING",
      submittedAt: new Date().toLocaleString("en-IN", { hour12: false }) + " IST",
    };

    setRegistrations((prev) => [newRecord, ...prev]);
    appendAudit(
      normalized,
      selectedRole,
      "REGISTRATION_SUBMITTED",
      `${newRecord.id} (${selectedRole}) -> Awaiting Admin Approval`,
      "SUCCESS"
    );
    setAuthError(null);
    setAuthNotice(
      `Registration ${newRecord.id} submitted for ${cleanName} (${selectedRole}). Sign-in will unlock once approved by Placement Admin.`
    );
    setRegFullName("");
    setRegOrgOrDept("");
    setAuthMode("SIGN_IN");
  };

  const handleRegistrationDecision = (regId: string, decision: "APPROVED" | "REJECTED") => {
    if (!user || user.role !== "ADMIN") return;
    let target: RegistrationRequestRecord | undefined;
    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.id !== regId) return r;
        target = { ...r, status: decision, reviewedBy: user.email };
        return target;
      })
    );
    if (target) {
      appendAudit(
        user.email,
        "ADMIN",
        `REGISTRATION_${decision}`,
        `${target.id} (${target.email} • ${target.role})`,
        "SUCCESS"
      );
    }
  };

  const evaluateStudentEligibility = (draft: StudentOnboardingDraft): { eligible: boolean; message: string } => {
    if (draft.applyingTrack === "INTERNSHIP") {
      if (draft.targetDomain === "DATA_SCIENCE") {
        if (!draft.hasDiplomaDataScience) {
          return {
            eligible: false,
            message:
              "Eligibility Check Failed: For Data Science Internship, completing the Diploma in Data Science is mandatory.",
          };
        }
        return {
          eligible: true,
          message:
            "Eligible for Data Science Internship (Diploma in Data Science verified).",
        };
      }
      if (draft.targetDomain === "SOFTWARE_DEVELOPMENT") {
        if (!draft.hasDiplomaProgramming) {
          return {
            eligible: false,
            message:
              "Eligibility Check Failed: For Software Development Internship, completing the Diploma in Programming is mandatory.",
          };
        }
        return {
          eligible: true,
          message:
            "Eligible for Software Development Internship (Diploma in Programming verified).",
        };
      }
    }

    // FULL_TIME track requires minimum BSc Pass (BSC or BS)
    if (draft.programLevel !== "BSC" && draft.programLevel !== "BS") {
      return {
        eligible: false,
        message:
          "Eligibility Check Failed: For Full-Time Placement, minimum BSc Pass (BSc / BS level) is mandatory.",
      };
    }

    return {
      eligible: true,
      message: `Eligible for Full-Time Placement (${draft.programLevel} Pass verified • ${
        draft.targetDomain === "DATA_SCIENCE" ? "Data Science" : "Software Development"
      } Track).`,
    };
  };

  const handleStudentRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setEligibilityVerdict(null);

    const normalizedEmail = studentDraft.email.trim().toLowerCase();
    const cleanFullName = studentDraft.fullName.trim();
    const cleanPersonalEmail = studentDraft.personalEmail.trim().toLowerCase();
    const cleanMobile = studentDraft.mobileNumber.trim();
    const cgpaNum = Number(studentDraft.cgpa);

    if (
      !cleanFullName ||
      !normalizedEmail ||
      !studentDraft.password.trim() ||
      !cleanPersonalEmail ||
      !cleanMobile ||
      !studentDraft.cgpa.trim() ||
      Number.isNaN(cgpaNum) ||
      cgpaNum < 0 ||
      cgpaNum > 10 ||
      !studentDraft.gender ||
      !studentDraft.stateName
    ) {
      setAuthError("All fields marked with * are mandatory. Please fill in every required field.");
      return;
    }

    if (studentDraft.isWorkingProf) {
      if (
        !studentDraft.yearsExp.trim() ||
        Number(studentDraft.yearsExp) <= 0 ||
        !studentDraft.presentCompany.trim() ||
        !studentDraft.workLocation.trim() ||
        !studentDraft.currentCtc.trim() ||
        Number(studentDraft.currentCtc) < 0
      ) {
        setAuthError(
          "Working Professional details (Years of Experience, Work Domain, Present Company, Location, and Current CTC) are mandatory when 'Yes' is selected."
        );
        return;
      }
    }

    const validDomain = ALLOWED_DOMAINS.some((d) => normalizedEmail.endsWith(d));
    if (!validDomain) {
      setAuthError(
        "Institutional Email must end with @ds.study.iitm.ac.in or @es.study.iitm.ac.in."
      );
      appendAudit(normalizedEmail, "STUDENT", "STUDENT_REG_DOMAIN_REJECTED", "IAM Domain Guard", "BLOCKED");
      return;
    }

    const existing = registrations.find(
      (r) => r.email.toLowerCase() === normalizedEmail && r.role === "STUDENT"
    );
    if (existing) {
      setAuthError(
        `An account for ${normalizedEmail} is already registered. Please use Sign In instead.`
      );
      return;
    }

    const verdict = evaluateStudentEligibility(studentDraft);
    setEligibilityVerdict(verdict);

    if (!verdict.eligible) {
      appendAudit(
        normalizedEmail,
        "STUDENT",
        "ELIGIBILITY_CHECK_FAILED",
        verdict.message,
        "BLOCKED"
      );
      return;
    }

    appendAudit(
      normalizedEmail,
      "STUDENT",
      "ELIGIBILITY_CHECK_PASSED",
      verdict.message,
      "SUCCESS"
    );
    setOnboardingStep("PAYMENT");
  };

  const handleConfirmPaymentAndEnterDashboard = () => {
    setPaymentProcessing(true);
    const normalizedEmail = studentDraft.email.trim().toLowerCase();
    const cleanFullName = studentDraft.fullName.trim();
    const rollCode = normalizedEmail.split("@")[0].toUpperCase();

    const diplomasLabel = [
      studentDraft.hasDiplomaDataScience ? "Diploma in Data Science" : null,
      studentDraft.hasDiplomaProgramming ? "Diploma in Programming" : null,
    ]
      .filter(Boolean)
      .join(" + ");

    const newRecord: RegistrationRequestRecord = {
      id: `REG-${101 + registrations.length}`,
      fullName: cleanFullName,
      email: normalizedEmail,
      role: "STUDENT",
      orgOrDept: `${studentDraft.programLevel} (${diplomasLabel || "Degree"}) • ${
        studentDraft.applyingTrack
      } • ${studentDraft.targetDomain} • Payment: PAID`,
      password: studentDraft.password,
      status: "PENDING",
      paymentStatus: "PAID",
      submittedAt: new Date().toLocaleString("en-IN", { hour12: false }) + " IST",
    };

    setRegistrations((prev) => [newRecord, ...prev]);

    // Pre-populate student dossier fields for when Admin approves login
    setFullName(cleanFullName);
    setPersonalEmail(studentDraft.personalEmail.trim().toLowerCase());
    setMobileNumber(studentDraft.mobileNumber.trim());
    setCgpaInput(studentDraft.cgpa);
    setActiveBacklogs(studentDraft.activeBacklogs);
    setProgramLevel(studentDraft.programLevel);
    setGender(studentDraft.gender);
    setStateName(studentDraft.stateName);
    setCategory(studentDraft.category);
    setDegreeType(studentDraft.degreeType);
    setStudentTargetDomain(studentDraft.targetDomain);
    setStudentApplyingTrack(studentDraft.applyingTrack);
    setIsWorkingProf(studentDraft.isWorkingProf);
    setYearsExp(studentDraft.yearsExp);
    setWorkDomain(studentDraft.workDomain);
    setPresentCompany(studentDraft.presentCompany);
    setWorkLocation(studentDraft.workLocation);
    setCurrentCtc(studentDraft.currentCtc);

    appendAudit(
      normalizedEmail,
      "STUDENT",
      "REGISTRATION_PAYMENT_CONFIRMED",
      `${newRecord.id} (${rollCode}) -> Payment Confirmed; Queued for Admin Approval`,
      "SUCCESS"
    );

    setPaymentProcessing(false);
    setEmail(normalizedEmail);
    setPassword("");
    setOnboardingStep("AUTH");
    setAuthMode("SIGN_IN");
    setAuthError(null);
    setAuthNotice(
      `Registration ${newRecord.id} and payment confirmed for ${cleanFullName}. Your account is now PENDING Placement Admin approval before you can sign in.`
    );
  };

  const handleRoleSwitch = (nextRole: Role) => {
    if (!user || nextRole === user.role) return;
    setUser({ ...user, role: nextRole });
    appendAudit(user.email, nextRole, "ROLE_SWITCH", `RBAC Context -> ${nextRole}`, "SUCCESS");
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSaveRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsedCgpa = parseFloat(cgpaInput);
    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      setRegAlert({ type: "ERR", text: "Enter a valid CGPA between 0.00 and 10.00." });
      return;
    }
    if (!fullName.trim() || !mobileNumber.trim() || !personalEmail.trim()) {
      setRegAlert({
        type: "ERR",
        text: "Full name, mobile number, and personal email ID are required.",
      });
      return;
    }
    if (isWorkingProf) {
      const exp = parseFloat(yearsExp);
      if (isNaN(exp) || exp < 0 || !presentCompany.trim()) {
        setRegAlert({
          type: "ERR",
          text: "Working professionals must provide years of experience, domain, and present company.",
        });
        return;
      }
    }

    setRegAlert({
      type: "OK",
      text: `Registration Dossier Saved (${category} • ${degreeType.replace("_", " ")} • Level ${programLevel} • CGPA ${parsedCgpa.toFixed(
        2
      )}).`,
    });
    appendAudit(
      user.email,
      user.role,
      "STUDENT_REGISTRATION_SAVED",
      `${fullName} | ${category} | ${degreeType} | ${programLevel} | CGPA ${parsedCgpa.toFixed(2)}`,
      "SUCCESS"
    );
  };

  const handleSaveHandles = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setHandlesSavedBanner("Developer & LinkedIn handles verified and saved to Student Profile.");
    appendAudit(
      user.email,
      user.role,
      "STUDENT_HANDLES_UPDATED",
      `LinkedIn: ${linkedinId || "N/A"} | GitHub: ${githubUsername || "N/A"} | Kaggle: ${kaggleUsername || "N/A"}`,
      "SUCCESS"
    );
  };

  const handleMarksheetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setMarksheetFile(null);
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setMarksheetAlert("Invalid File Type: Upload your official IITM BS Marksheet as a PDF (.pdf).");
      setMarksheetFile(null);
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setMarksheetAlert("File Too Large: BS Marksheet PDF must be 5 MB or smaller.");
      setMarksheetFile(null);
      e.target.value = "";
      return;
    }
    setMarksheetAlert(null);
    setMarksheetFile(file);
  };

  const handleUploadMarksheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!marksheetFile) {
      setMarksheetAlert("Please choose your IITM BS Grade Card / Marksheet PDF first.");
      return;
    }
    const parsedCgpa = parseFloat(cgpaInput);
    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      setMarksheetAlert("Enter a valid CGPA between 0.00 and 10.00.");
      return;
    }
    const sizeLabel = formatBytes(marksheetFile.size);
    const record: MarksheetRecord = {
      fileName: marksheetFile.name,
      fileSize: sizeLabel,
      cgpa: parsedCgpa.toFixed(2),
      uploadedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
    };
    setMarksheet(record);
    setMarksheetFile(null);
    setMarksheetAlert(null);
    if (marksheetInputRef.current) marksheetInputRef.current.value = "";
    appendAudit(
      user.email,
      user.role,
      "MARKSHEET_UPLOADED",
      `${record.fileName} (CGPA ${record.cgpa})`,
      "SUCCESS"
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setVaultAlert("Invalid File Type: Only PDF resumes (.pdf) are accepted.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setVaultAlert("File Too Large: Resume PDF must be 5 MB or smaller.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    setVaultAlert(null);
    setSelectedFile(file);
  };

  const handleAddResume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (resumes.length >= 3) {
      setVaultAlert("BRULE-55 Enforcement: Maximum 3 active resumes allowed per student.");
      appendAudit(user.email, user.role, "BRULE_55_BLOCKED", "Attempted 4th active resume", "BLOCKED");
      return;
    }
    if (!selectedFile) {
      setVaultAlert("Please select a PDF file from your device first.");
      return;
    }
    if (!newTarget.trim()) {
      setVaultAlert("Please specify the target role (e.g., Data Scientist, SDE).");
      return;
    }

    const sizeLabel = formatBytes(selectedFile.size);
    const created: ResumeItem = {
      id: `res-${Date.now()}`,
      title: selectedFile.name,
      targetRole: newTarget.trim(),
      fileSize: sizeLabel,
      updatedAt: "Just now",
      isPrimary: resumes.length === 0,
    };

    setResumes((prev) => [...prev, created]);
    setSelectedResumeIdForApply(created.id);
    setSelectedFile(null);
    setNewTarget("");
    setVaultAlert(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    appendAudit(user.email, user.role, "RESUME_UPLOADED", `${created.title} (${sizeLabel})`, "SUCCESS");
  };

  const handleDeleteResume = (id: string, title: string) => {
    if (!user) return;
    setResumes((prev) => prev.filter((r) => r.id !== id));
    setVaultAlert(null);
    appendAudit(user.email, user.role, "RESUME_ARCHIVED", title, "SUCCESS");
  };

  const toggleModuleComplete = (trackId: string, moduleId: string) => {
    if (!user) return;
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          modules: t.modules.map((m) => {
            if (m.id !== moduleId) return m;
            const nextState = !m.completed;
            if (nextState) {
              appendAudit(user.email, user.role, "MODULE_COMPLETED", `${t.code}: ${m.title}`, "SUCCESS");
            }
            return { ...m, completed: nextState };
          }),
        };
      })
    );
  };


  // Increment 4: Interviews, Offers & Placement Analytics State
  const [interviews, setInterviews] = useState<InterviewScheduleRecord[]>(INITIAL_INTERVIEWS);
  const [offers, setOffers] = useState<OfferLetterRecord[]>(INITIAL_OFFERS);
  const [placementAlert, setPlacementAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  const [ivAppId, setIvAppId] = useState<string>("");
  const [ivRoundType, setIvRoundType] = useState<InterviewRoundOption>("TECHNICAL_1");
  const [ivMode, setIvMode] = useState<"ONLINE_MEET" | "IN_PERSON">("ONLINE_MEET");
  const [ivDateTime, setIvDateTime] = useState<string>("2026-11-24T14:00");
  const [ivMeetingLink, setIvMeetingLink] = useState<string>("https://meet.google.com/iitm-placement-panel");
  const [ivPanelist, setIvPanelist] = useState<string>("Rohan Kulkarni (Staff Engineer)");

  const [ofrAppId, setOfrAppId] = useState<string>("");
  const [ofrCtcLpa, setOfrCtcLpa] = useState<string>("16.50");
  const [ofrJoiningDate, setOfrJoiningDate] = useState<string>("2027-06-15");
  const [ofrExpiresAt, setOfrExpiresAt] = useState<string>("2026-12-10");

  const handleScheduleInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetApp = applications.find((a) => a.id === ivAppId) || applications[0];
    const studentRoll = targetApp ? targetApp.studentRoll : "22F3001234";
    const studentName = targetApp ? targetApp.studentName : fullName;
    const companyName = targetApp ? targetApp.companyName : "Google Research India";
    const jobTitle = targetApp ? targetApp.jobTitle : "AI/ML Research Fellow";
    const appId = targetApp ? targetApp.id : `APP-${Date.now()}`;

    const proposedMs = new Date(ivDateTime).getTime();
    if (Number.isNaN(proposedMs)) {
      setPlacementAlert({ type: "ERR", text: "Select a valid interview date and time." });
      return;
    }

    // BRULE-31: 45-minute student conflict check
    const conflict = interviews.find(
      (iv) =>
        iv.studentRoll === studentRoll &&
        (iv.status === "SCHEDULED" || iv.status === "CONFIRMED") &&
        Math.abs(new Date(iv.scheduledAt).getTime() - proposedMs) < 45 * 60 * 1000
    );
    if (conflict) {
      const msg = `BRULE-31 Conflict: ${studentName} already has an active interview (${conflict.companyName} at ${conflict.scheduledAt.replace("T", " ")}) within 45 minutes.`;
      setPlacementAlert({ type: "ERR", text: msg });
      appendAudit(user.email, user.role, "INTERVIEW_CONFLICT_BLOCKED", msg, "BLOCKED");
      return;
    }

    const existingForApp = interviews.filter((iv) => iv.applicationId === appId).length;
    const created: InterviewScheduleRecord = {
      id: `IV-${Math.floor(100 + Math.random() * 900)}`,
      applicationId: appId,
      studentRoll,
      studentName,
      companyName,
      jobTitle,
      roundNumber: existingForApp + 1,
      roundType: ivRoundType,
      mode: ivMode,
      scheduledAt: ivDateTime,
      meetingLink: ivMeetingLink.trim() || "https://meet.google.com/iitm-panel",
      panelistName: ivPanelist.trim() || "Industry Panelist",
      status: "SCHEDULED",
    };
    setInterviews((prev) => [created, ...prev]);
    if (targetApp && targetApp.status === "APPLIED") {
      setApplications((prev) =>
        prev.map((a) => (a.id === targetApp.id ? { ...a, status: "SHORTLISTED" } : a))
      );
    }
    setPlacementAlert({
      type: "OK",
      text: `Scheduled Round ${created.roundNumber} (${created.roundType}) for ${studentName} with ${companyName}.`,
    });
    appendAudit(
      user.email,
      user.role,
      "INTERVIEW_SCHEDULED",
      `${created.id} — ${companyName} (${created.roundType}) for ${studentRoll}`,
      "SUCCESS"
    );
  };

  const handleUpdateInterviewStatus = (ivId: string, nextStatus: InterviewStatusOption) => {
    if (!user) return;
    setInterviews((prev) =>
      prev.map((iv) => (iv.id === ivId ? { ...iv, status: nextStatus } : iv))
    );
    setPlacementAlert({ type: "OK", text: `Interview ${ivId} updated to ${nextStatus}.` });
    appendAudit(user.email, user.role, "INTERVIEW_STATUS_UPDATED", `${ivId} -> ${nextStatus}`, "SUCCESS");
  };

  const handleIssueOfferLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetApp = applications.find((a) => a.id === ofrAppId) || applications[0];
    const studentRoll = targetApp ? targetApp.studentRoll : "22F3001234";
    const studentName = targetApp ? targetApp.studentName : fullName;
    const companyName = targetApp ? targetApp.companyName : "Fractal Analytics";
    const roleTitle = targetApp ? targetApp.jobTitle : "Associate Data Scientist";
    const roleType: JobRoleTypeOption = targetApp ? targetApp.roleType : "FULL_TIME";
    const appId = targetApp ? targetApp.id : `APP-OFR-${Date.now()}`;
    const parsedCtc = parseFloat(ofrCtcLpa);

    if (Number.isNaN(parsedCtc) || parsedCtc <= 0) {
      setPlacementAlert({ type: "ERR", text: "Enter a valid positive CTC / Stipend annualized value in LPA." });
      return;
    }

    const newOffer: OfferLetterRecord = {
      id: `OFR-${Math.floor(100 + Math.random() * 900)}`,
      offerCode: `OFR-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      applicationId: appId,
      studentRoll,
      studentName,
      companyName,
      roleTitle,
      roleType,
      ctcLpa: parsedCtc,
      joiningDate: ofrJoiningDate,
      expiresAt: ofrExpiresAt,
      status: "ISSUED",
    };
    setOffers((prev) => [newOffer, ...prev]);
    if (targetApp) {
      setApplications((prev) =>
        prev.map((a) => (a.id === targetApp.id ? { ...a, status: "OFFERED" } : a))
      );
    }
    setPlacementAlert({
      type: "OK",
      text: `Issued offer ${newOffer.offerCode} (${companyName} — ₹${parsedCtc.toFixed(2)} LPA) to ${studentName}.`,
    });
    appendAudit(
      user.email,
      user.role,
      "OFFER_LETTER_ISSUED",
      `${newOffer.offerCode} (${companyName}, ₹${parsedCtc.toFixed(2)} LPA) -> ${studentRoll}`,
      "SUCCESS"
    );
  };

  const handleRespondToOffer = (offerId: string, decision: "ACCEPTED" | "DECLINED") => {
    if (!user) return;
    const target = offers.find((o) => o.id === offerId);
    if (!target || target.status !== "ISSUED") return;

    // BRULE-35: Single Accepted Full-Time Offer Lock
    if (decision === "ACCEPTED" && target.roleType === "FULL_TIME") {
      const alreadyAcceptedFt = offers.find(
        (o) =>
          o.studentRoll === target.studentRoll &&
          o.roleType === "FULL_TIME" &&
          o.status === "ACCEPTED"
      );
      if (alreadyAcceptedFt) {
        const msg = `BRULE-35 Lock: Already accepted full-time offer from ${alreadyAcceptedFt.companyName} (${alreadyAcceptedFt.offerCode}).`;
        setPlacementAlert({ type: "ERR", text: msg });
        appendAudit(user.email, user.role, "OFFER_ACCEPT_BLOCKED", msg, "BLOCKED");
        return;
      }
      setIsPlaced(true);
    }

    setOffers((prev) =>
      prev.map((o) => {
        if (o.id === offerId) {
          return {
            ...o,
            status: decision,
            remarks: decision === "ACCEPTED" ? "Accepted via IITM BS Placement Portal" : "Declined by candidate",
          };
        }
        if (
          decision === "ACCEPTED" &&
          target.roleType === "FULL_TIME" &&
          o.studentRoll === target.studentRoll &&
          o.roleType === "FULL_TIME" &&
          o.status === "ISSUED"
        ) {
          return {
            ...o,
            status: "DECLINED",
            remarks: "Auto-closed under BRULE-35 Single Full-Time Offer Policy",
          };
        }
        return o;
      })
    );

    setPlacementAlert({
      type: "OK",
      text:
        decision === "ACCEPTED"
          ? `Offer ${target.offerCode} from ${target.companyName} ACCEPTED! Placement status updated.`
          : `Offer ${target.offerCode} from ${target.companyName} declined.`,
    });
    appendAudit(
      user.email,
      user.role,
      `OFFER_${decision}`,
      `${target.offerCode} (${target.companyName})`,
      "SUCCESS"
    );
  };

  const handleAddQuestionToBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const opts = [qbOpt0.trim(), qbOpt1.trim(), qbOpt2.trim(), qbOpt3.trim()];
    if (!qbPrompt.trim() || opts.some((o) => !o)) {
      setQbBanner({ type: "ERR", text: "Provide the question prompt and all 4 options." });
      return;
    }
    const newItem: BankQuestionItem = {
      id: `custom-${Date.now()}`,
      domain: qbDomain,
      track: qbTrack,
      prompt: qbPrompt.trim(),
      options: opts,
      correctIndex: qbCorrectIdx,
    };
    setQuestionBank((prev) => [newItem, ...prev]);
    setQbPrompt("");
    setQbOpt0("");
    setQbOpt1("");
    setQbOpt2("");
    setQbOpt3("");
    setQbCorrectIdx(0);
    setQbBanner({
      type: "OK",
      text: `Added to ${qbDomain.replace("_", " ")} • ${qbTrack.replace(
        "_",
        " "
      )} Question Bank!`,
    });
    appendAudit(
      user.email,
      user.role,
      "QUESTION_BANK_ADDED",
      `${qbDomain} / ${qbTrack}: "${newItem.prompt.slice(0, 48)}..."`,
      "SUCCESS"
    );
  };

  const handleStartRandomQuiz = () => {
    if (!user) return;
    if (activeTrack.attemptsUsed >= activeTrack.maxAttempts) {
      setQuizBanner({
        type: "BLOCKED",
        text: `BRULE-12 Enforcement: Maximum ${activeTrack.maxAttempts} assessment attempts exhausted for ${activeTrack.code}.`,
      });
      return;
    }
    const pool = questionBank.filter(
      (q) => q.domain === activeTrack.domain && q.track === activeTrack.track
    );
    const randomFifteen = drawRandomQuestions(pool, QUESTIONS_PER_QUIZ);
    setDrawnQuestions(randomFifteen);
    setQuizAnswers({});
    setQuizBanner(null);
    setSecondsLeft(QUIZ_DURATION_SECONDS);
    setIsQuizActive(true);
    appendAudit(
      user.email,
      user.role,
      "ASSESSMENT_SESSION_STARTED",
      `${activeTrack.code} • Randomly drew ${randomFifteen.length}/${pool.length} questions (30:00 timer)`,
      "SUCCESS"
    );
  };

  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const unanswered = drawnQuestions.some((q) => quizAnswers[q.id] === undefined);
    if (unanswered) {
      setQuizBanner({
        type: "FAIL",
        text: `Please answer all ${drawnQuestions.length} randomly selected questions before submitting.`,
      });
      return;
    }
    finalizeQuizAttempt("NORMAL");
  };

  const handleSaveExaminerEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const skills = evalSkillsets
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (skills.length === 0) {
      setEvalBanner({ type: "ERR", text: "Specify at least one observed skillset." });
      return;
    }

    const tasks = isPlacementReady
      ? []
      : remedialTasksText
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean);

    if (!isPlacementReady && tasks.length === 0) {
      setEvalBanner({
        type: "ERR",
        text: "BRULE-18: When student is marked Not Ready, please mention the list of tasks the student should do.",
      });
      return;
    }

    const record: ExaminerEvaluationRecord = {
      id: `EVAL-${Date.now()}`,
      studentRoll: user.name,
      examinerEmail: user.email,
      skillsets: skills,
      programmingRating: progRating,
      dataScienceRating: dsRating,
      communicationRating: commRating,
      isPlacementReady,
      performingExceptionallyGood,
      remedialTasks: tasks,
      notes: examinerNotes.trim(),
      evaluatedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
    };

    setEvaluations((prev) => [record, ...prev]);
    setEvalBanner({
      type: "OK",
      text: `Final Stage Examiner Evaluation recorded for ${user.name} (${
        isPlacementReady ? "Placement Ready" : "Not Ready — Remedial Tasks Assigned"
      }).`,
    });
    appendAudit(
      user.email,
      user.role,
      "EXAMINER_INTERVIEW_EVALUATED",
      `Prog ${progRating}/5 | DS ${dsRating}/5 | Comm ${commRating}/5 | Ready: ${
        isPlacementReady ? "Yes" : "No"
      } | Exceptional: ${performingExceptionallyGood ? "Yes" : "No"}`,
      "SUCCESS"
    );
  };

  // Increment 3: Live Eligibility Engine Evaluation (BRULE-21 to BRULE-25)
  const evaluateEligibilityForDrive = (job: JobDriveItem): { eligible: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    const parsedCgpa = parseFloat(cgpaInput) || 0;
    const latestEval = evaluations[0];
    const examinerReady = Boolean(latestEval && latestEval.isPlacementReady);
    const earnedSkillNames = new Set(badges.map((b) => b.skillName));

    if (isPlaced && job.roleType === "FULL_TIME") {
      reasons.push("BRULE-21: Student already holds an accepted full-time placement offer.");
    }
    if (parsedCgpa < job.minCgpa) {
      reasons.push(`BRULE-23: Minimum CGPA ${job.minCgpa.toFixed(2)} required (yours: ${parsedCgpa.toFixed(2)}).`);
    }
    if (activeBacklogs > job.maxBacklogs) {
      reasons.push(`BRULE-23: Max ${job.maxBacklogs} active backlogs allowed (yours: ${activeBacklogs}).`);
    }
    if (!job.allowedLevels.includes(programLevel)) {
      reasons.push(`BRULE-24: Requires level ${job.allowedLevels.join("/")} (yours: ${programLevel}).`);
    }
    if (job.requireExaminerReady && !examinerReady) {
      reasons.push("BRULE-25: Requires 'Placement Ready' sign-off in Final Stage Examiner Interview.");
    }
    const missingBadges = job.requiredSkillTags.filter((tag) => !earnedSkillNames.has(tag));
    if (missingBadges.length > 0) {
      reasons.push(`BRULE-25: Missing verified quiz badge: ${missingBadges.join(", ")}.`);
    }

    return { eligible: reasons.length === 0, reasons };
  };

  const handleApplyToDrive = (job: JobDriveItem) => {
    if (!user) return;
    if (applications.some((a) => a.jobId === job.id)) {
      setJobAlert({ type: "ERR", text: `You have already applied to ${job.companyName} (${job.jobCode}).` });
      return;
    }

    const elig = evaluateEligibilityForDrive(job);
    if (!elig.eligible) {
      setJobAlert({
        type: "ERR",
        text: `Application Blocked by Eligibility Engine: ${elig.reasons.join(" ")}`,
      });
      appendAudit(
        user.email,
        user.role,
        "APPLICATION_ELIGIBILITY_BLOCKED",
        `${job.jobCode} • ${elig.reasons.join(" | ")}`,
        "BLOCKED"
      );
      return;
    }

    const chosenResume =
      resumes.find((r) => r.id === selectedResumeIdForApply) || resumes[0];
    if (!chosenResume) {
      setJobAlert({ type: "ERR", text: "Upload at least one PDF resume in your vault before applying." });
      return;
    }

    const newApp: JobApplicationRecord = {
      id: `APP-${Math.floor(1000 + Math.random() * 9000)}`,
      jobId: job.id,
      jobCode: job.jobCode,
      companyName: job.companyName,
      jobTitle: job.title,
      roleType: job.roleType,
      studentRoll: user.name,
      studentName: fullName,
      studentCgpa: (parseFloat(cgpaInput) || 0).toFixed(2),
      resumeTitle: chosenResume.title,
      status: "APPLIED",
      appliedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
    };

    setApplications((prev) => [newApp, ...prev]);
    setJobAlert({
      type: "OK",
      text: `Application ${newApp.id} submitted to ${job.companyName} with ${chosenResume.title}.`,
    });
    appendAudit(
      user.email,
      user.role,
      "JOB_APPLICATION_SUBMITTED",
      `${job.jobCode} (${job.companyName}) • Resume: ${chosenResume.title}`,
      "SUCCESS"
    );
  };

  const handleCreateNewDrive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const code = newJobCode.trim().toUpperCase();
    if (!code || !newCompany.trim() || !newJobTitle.trim()) {
      setJobAlert({ type: "ERR", text: "Job Code, Company Name, and Title are required." });
      return;
    }
    const minCg = parseFloat(newMinCgpa);
    if (isNaN(minCg) || minCg < 0 || minCg > 10) {
      setJobAlert({ type: "ERR", text: "Minimum CGPA must be between 0.00 and 10.00." });
      return;
    }

    const created: JobDriveItem = {
      id: `job-${Date.now()}`,
      jobCode: code,
      companyName: newCompany.trim(),
      title: newJobTitle.trim(),
      roleType: newRoleType,
      domain: newJobDomain,
      location: newLocation.trim() || "Remote / India",
      compensation: newCompensation.trim() || "Competitive",
      description: "Published via Recruiter Drive Portal with automated eligibility filtering.",
      minCgpa: minCg,
      maxBacklogs: 0,
      allowedLevels: newRoleType === "INTERNSHIP" ? ["DIPLOMA", "BSC", "BS"] : ["BSC", "BS"],
      requireExaminerReady: newRequireReady,
      requiredSkillTags: [],
    };

    setJobs((prev) => [created, ...prev]);
    setNewJobCode(`DRV-2026-${Math.floor(100 + Math.random() * 899)}`);
    setJobAlert({
      type: "OK",
      text: `Published Drive ${created.jobCode}: ${created.companyName} — ${created.title}.`,
    });
    appendAudit(
      user.email,
      user.role,
      "JOB_POSTING_CREATED",
      `${created.jobCode} (${created.companyName} • Min CGPA ${created.minCgpa.toFixed(2)})`,
      "SUCCESS"
    );
  };

  const handleUpdateApplicationStatus = (appId: string, nextStatus: AppStatusOption) => {
    if (!user) return;
    let targetApp: JobApplicationRecord | undefined;
    setApplications((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a;
        targetApp = { ...a, status: nextStatus };
        return targetApp;
      })
    );

    if (targetApp && nextStatus === "OFFER_ACCEPTED" && targetApp.roleType === "FULL_TIME") {
      setIsPlaced(true);
    }

    if (targetApp) {
      appendAudit(
        user.email,
        user.role,
        "APPLICATION_STATUS_UPDATED",
        `${targetApp.id} (${targetApp.companyName}) -> ${nextStatus}${
          nextStatus === "OFFER_ACCEPTED" && targetApp.roleType === "FULL_TIME"
            ? " [BRULE-21 Placement Lock Activated]"
            : ""
        }`,
        "SUCCESS"
      );
    }
  };

  if (!user) {
    if (onboardingStep === "STUDENT_FORM") {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
                  <GraduationCap className="w-4 h-4" />
                  Step 1 of 2 • Student Registration & Eligibility Verification
                </div>
                <h1 className="text-xl font-bold text-white">New Student Registration</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  All fields marked with <span className="text-rose-400 font-bold">*</span> are
                  mandatory. Your domain & degree eligibility will be verified upon submission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOnboardingStep("AUTH");
                  setAuthMode("SIGN_IN");
                  setAuthError(null);
                  setEligibilityVerdict(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-slate-700"
              >
                ← Back to Sign In
              </button>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {eligibilityVerdict && !eligibilityVerdict.eligible && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs space-y-1.5">
                <div className="font-semibold flex items-center gap-2 text-amber-300">
                  <XCircle className="w-4 h-4 shrink-0" />
                  Eligibility Requirement Not Met
                </div>
                <p>{eligibilityVerdict.message}</p>
                <p className="text-[11px] text-amber-300/80">
                  Rule: Internship requires minimum 1 Diploma in the exact chosen domain (Diploma in
                  Data Science for Data Science; Diploma in Programming for Software Development).
                  Full-Time placement requires minimum BSc Pass.
                </p>
              </div>
            )}

            <form onSubmit={handleStudentRegistrationSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentDraft.fullName}
                    onChange={(e) => setStudentDraft({ ...studentDraft, fullName: e.target.value })}
                    placeholder="e.g., Ananya Krishnan"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    IITM Student Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={studentDraft.email}
                    onChange={(e) => setStudentDraft({ ...studentDraft, email: e.target.value })}
                    placeholder="23f1002345@ds.study.iitm.ac.in"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Create Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={studentDraft.password}
                    onChange={(e) => setStudentDraft({ ...studentDraft, password: e.target.value })}
                    placeholder="Minimum 4 characters"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Personal Email ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={studentDraft.personalEmail}
                    onChange={(e) =>
                      setStudentDraft({ ...studentDraft, personalEmail: e.target.value })
                    }
                    placeholder="ananya.personal@gmail.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Mobile Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={studentDraft.mobileNumber}
                    onChange={(e) =>
                      setStudentDraft({ ...studentDraft, mobileNumber: e.target.value })
                    }
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Current CGPA <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max="10"
                    value={studentDraft.cgpa}
                    onChange={(e) => setStudentDraft({ ...studentDraft, cgpa: e.target.value })}
                    placeholder="e.g., 8.45"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Active Backlogs <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="10"
                    value={studentDraft.activeBacklogs}
                    onChange={(e) =>
                      setStudentDraft({ ...studentDraft, activeBacklogs: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Gender <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={studentDraft.gender}
                    onChange={(e) => setStudentDraft({ ...studentDraft, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    State <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={studentDraft.stateName}
                    onChange={(e) => setStudentDraft({ ...studentDraft, stateName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={studentDraft.category}
                    onChange={(e) =>
                      setStudentDraft({ ...studentDraft, category: e.target.value as CategoryOption })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="GENERAL">General</option>
                    <option value="GENERAL_EWS">General-EWS</option>
                    <option value="OBC">OBC</option>
                    <option value="OBC_NCL">OBC-NCL</option>
                    <option value="SC_ST">SC/ST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Degree Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={studentDraft.degreeType}
                    onChange={(e) =>
                      setStudentDraft({
                        ...studentDraft,
                        degreeType: e.target.value as DegreeTypeOption,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="STANDALONE">Standalone</option>
                    <option value="DUAL_DEGREE">Dual Degree</option>
                  </select>
                </div>
              </div>

              {/* Academic Standing, Diplomas & Placement Track (Used for Mandatory Eligibility Gate) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3">
                <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Academic Qualification & Track Eligibility <span className="text-rose-400">*</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Current Program Level <span className="text-rose-400">*</span>
                    </label>
                    <select
                      required
                      value={studentDraft.programLevel}
                      onChange={(e) =>
                        setStudentDraft({
                          ...studentDraft,
                          programLevel: e.target.value as ProgramLevelOption,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="FOUNDATION">Foundation</option>
                      <option value="DIPLOMA">Diploma</option>
                      <option value="BSC">BSc Pass</option>
                      <option value="BS">BS Level</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Applying For <span className="text-rose-400">*</span>
                    </label>
                    <select
                      required
                      value={studentDraft.applyingTrack}
                      onChange={(e) =>
                        setStudentDraft({
                          ...studentDraft,
                          applyingTrack: e.target.value as JobRoleTypeOption,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="INTERNSHIP">Internship (Min 1 Domain Diploma)</option>
                      <option value="FULL_TIME">Full-Time Placement (Min BSc Pass)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Target Domain <span className="text-rose-400">*</span>
                    </label>
                    <select
                      required
                      value={studentDraft.targetDomain}
                      onChange={(e) =>
                        setStudentDraft({
                          ...studentDraft,
                          targetDomain: e.target.value as QuizDomainOption,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="DATA_SCIENCE">Data Science</option>
                      <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Completed IITM Diplomas <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40">
                      <input
                        type="checkbox"
                        checked={studentDraft.hasDiplomaDataScience}
                        onChange={(e) =>
                          setStudentDraft({
                            ...studentDraft,
                            hasDiplomaDataScience: e.target.checked,
                          })
                        }
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-200">Diploma in Data Science Completed</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40">
                      <input
                        type="checkbox"
                        checked={studentDraft.hasDiplomaProgramming}
                        onChange={(e) =>
                          setStudentDraft({
                            ...studentDraft,
                            hasDiplomaProgramming: e.target.checked,
                          })
                        }
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-200">Diploma in Programming Completed</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Working Professional Mandatory Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    Working Professional? <span className="text-rose-400">*</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentDraft({ ...studentDraft, isWorkingProf: true })}
                      className={`px-3 py-1 rounded-lg font-semibold border transition ${
                        studentDraft.isWorkingProf
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentDraft({ ...studentDraft, isWorkingProf: false })}
                      className={`px-3 py-1 rounded-lg font-semibold border transition ${
                        !studentDraft.isWorkingProf
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {studentDraft.isWorkingProf && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Years of Experience <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          step="0.5"
                          min="0.5"
                          max="40"
                          value={studentDraft.yearsExp}
                          onChange={(e) =>
                            setStudentDraft({ ...studentDraft, yearsExp: e.target.value })
                          }
                          placeholder="e.g., 2.5"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Work Domain <span className="text-rose-400">*</span>
                        </label>
                        <select
                          required
                          value={studentDraft.workDomain}
                          onChange={(e) =>
                            setStudentDraft({
                              ...studentDraft,
                              workDomain: e.target.value as WorkDomainOption,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        >
                          <option value="DATA_SCIENCE">Data Science</option>
                          <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                          <option value="OTHERS">Others</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Present Company <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={studentDraft.presentCompany}
                          onChange={(e) =>
                            setStudentDraft({ ...studentDraft, presentCompany: e.target.value })
                          }
                          placeholder="e.g., TCS / Fractal / Zoho"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Work Location <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={studentDraft.workLocation}
                          onChange={(e) =>
                            setStudentDraft({ ...studentDraft, workLocation: e.target.value })
                          }
                          placeholder="e.g., Bengaluru / Chennai / Remote"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Current CTC (LPA) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          step="0.1"
                          min="0"
                          max="500"
                          value={studentDraft.currentCtc}
                          onChange={(e) =>
                            setStudentDraft({ ...studentDraft, currentCtc: e.target.value })
                          }
                          placeholder="e.g., 12.5"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verify Eligibility & Proceed to Payment
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (onboardingStep === "PAYMENT") {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
                  <BadgeCheck className="w-4 h-4" />
                  Step 2 of 2 • Eligibility Verified
                </div>
                <h1 className="text-xl font-bold text-white">Placement Portal Registration Fee</h1>
              </div>
              <button
                type="button"
                onClick={() => setOnboardingStep("STUDENT_FORM")}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-slate-700"
              >
                ← Edit Form
              </button>
            </div>

            {eligibilityVerdict && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">Eligibility Check Passed</p>
                  <p className="mt-0.5">{eligibilityVerdict.message}</p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Candidate Name</span>
                <span className="text-white font-semibold">{studentDraft.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">IITM Email</span>
                <span className="text-slate-200">{studentDraft.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Track & Domain</span>
                <span className="text-indigo-300 font-semibold">
                  {studentDraft.applyingTrack} •{" "}
                  {studentDraft.targetDomain === "DATA_SCIENCE"
                    ? "Data Science"
                    : "Software Development"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Program Level / CGPA</span>
                <span className="text-slate-200">
                  {studentDraft.programLevel} • {studentDraft.cgpa} CGPA
                </span>
              </div>
            </div>

            {/* Payment Gateway Placeholder */}
            <div className="p-5 rounded-xl bg-indigo-950/30 border border-dashed border-indigo-500/40 text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Payment Gateway Integration Placeholder
              </p>
              <p className="text-xs text-slate-400">
                Official IITM Payment Gateway link will be embedded here. Click below to confirm
                payment and submit your verified registration for Placement Admin approval.
              </p>
            </div>

            <button
              type="button"
              disabled={paymentProcessing}
              onClick={handleConfirmPaymentAndEnterDashboard}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {paymentProcessing
                ? "Confirming Payment..."
                : "Confirm Payment & Submit for Admin Approval"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" />
            IITM Career OS • Placement & Governance Portal
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            IITM Placement & Career Portal
          </h1>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Select Role Context
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["STUDENT", "RECRUITER", "EXAMINER", "ADMIN"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r);
                      setAuthError(null);
                      setAuthNotice(null);
                      if (r === "ADMIN") {
                        setAuthMode("SIGN_IN");
                      }
                    }}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition ${
                      selectedRole === r
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {selectedRole !== "ADMIN" ? (
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("SIGN_IN");
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${
                    authMode === "SIGN_IN"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthNotice(null);
                    setEligibilityVerdict(null);
                    if (selectedRole === "STUDENT") {
                      setOnboardingStep("STUDENT_FORM");
                    } else {
                      setAuthMode("SIGN_UP");
                    }
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${
                    authMode === "SIGN_UP"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Register (Sign Up)
                </button>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Administrator Access</span>
                <span className="text-indigo-300 font-semibold">Sign In Only (Pre-Provisioned)</span>
              </div>
            )}

            <form
              onSubmit={authMode === "SIGN_UP" && selectedRole !== "ADMIN" ? handleRegister : handleLogin}
              className="space-y-3.5"
            >
              {authMode === "SIGN_UP" && selectedRole !== "ADMIN" && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder={
                      selectedRole === "STUDENT"
                        ? "e.g., Rohan Deshmukh"
                        : selectedRole === "RECRUITER"
                        ? "e.g., Priya Nair"
                        : "e.g., Dr. Karthik Narayanan"
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                  {selectedRole === "RECRUITER" ? "Corporate Work Email" : "Institutional Email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    selectedRole === "STUDENT"
                      ? "22f3001013@ds.study.iitm.ac.in"
                      : selectedRole === "RECRUITER"
                      ? "hr@ricoh.in"
                      : selectedRole === "EXAMINER"
                      ? "shyam@ds.iitm.ac.in"
                      : "placement.admin@iitm.ac.in"
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {selectedRole === "STUDENT" && (
                    <>
                      Allowed student domains: <span className="text-slate-300">@ds.study.iitm.ac.in</span>,{" "}
                      <span className="text-slate-300">@es.study.iitm.ac.in</span>
                    </>
                  )}
                  {selectedRole === "RECRUITER" && (
                    <>Corporate domains only (public Gmail/Yahoo/Outlook addresses blocked).</>
                  )}
                  {selectedRole === "EXAMINER" && (
                    <>Faculty / industry viva panelists require Placement Admin approval before login.</>
                  )}
                  {selectedRole === "ADMIN" && (
                    <>Sign in as Admin to review and approve pending Student, Recruiter & Examiner registrations.</>
                  )}
                </p>
              </div>

              {authMode === "SIGN_UP" && selectedRole !== "ADMIN" && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    {selectedRole === "STUDENT"
                      ? "Program & Roll Number"
                      : selectedRole === "RECRUITER"
                      ? "Company & Designation"
                      : "Department / Viva Panel Specialization"}
                  </label>
                  <input
                    type="text"
                    value={regOrgOrDept}
                    onChange={(e) => setRegOrgOrDept(e.target.value)}
                    placeholder={
                      selectedRole === "STUDENT"
                        ? "BS Data Science • Roll 23F1004512"
                        : selectedRole === "RECRUITER"
                        ? "Google India • University Talent Partner"
                        : "Machine Learning & Systems Viva Panel"
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  {authMode === "SIGN_IN" && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(
                          selectedRole === "STUDENT"
                            ? "22f3001013@ds.study.iitm.ac.in"
                            : selectedRole === "EXAMINER"
                            ? "shyam@ds.iitm.ac.in"
                            : selectedRole === "RECRUITER"
                            ? "hr@ricoh.in"
                            : "placement.admin@iitm.ac.in"
                        );
                        setPassword("123456");
                        setAuthError(null);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Fill Test {selectedRole}
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (default: 123456)"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {authNotice && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authNotice}</span>
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {authMode === "SIGN_UP" && selectedRole !== "ADMIN"
                  ? `Submit ${selectedRole} Registration for Admin Approval`
                  : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const activePoolSize = questionBank.filter(
    (q) => q.domain === activeTrack.domain && q.track === activeTrack.track
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">IITM Career & Placement OS</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Inc 1 • Inc 2 • Inc 3 Live
                </span>
                {isPlaced && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                    PLACED (BRULE-21)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.role === "ADMIN" ? (
              <>
                <span className="text-xs text-slate-400 mr-1">Admin View:</span>
                {(["ADMIN", "STUDENT", "RECRUITER", "EXAMINER"] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleSwitch(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      user.role === r
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 border border-indigo-500/40 text-indigo-300">
                {user.role} PORTAL
              </span>
            )}
            <button
              onClick={() => {
                setIsQuizActive(false);
                setUser(null);
              }}
              className="ml-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Module Navigation */}
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap gap-2 border-t border-slate-800/70 pt-2 pb-2">
          {user.role === "STUDENT" ? (
            <>
              <button
                disabled={isQuizActive}
                onClick={() => setActiveTab("IDENTITY")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "IDENTITY"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                My Profile, Scorecard & Resumes ({resumes.length}/3)
              </button>

              <button
                onClick={() => setActiveTab("TRAINING")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "TRAINING"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Training & Readiness Progress
                {badges.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                    {badges.length} Badges
                  </span>
                )}
              </button>

              <button
                disabled={isQuizActive}
                onClick={() => setActiveTab("RECRUITMENT")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "RECRUITMENT"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Opportunities & Application Status ({applications.length} Applied)
              </button>
            </>
          ) : (
            <>
              <button
                disabled={isQuizActive}
                onClick={() => setActiveTab("IDENTITY")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "IDENTITY"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Student Profiles & Vault ({resumes.length}/3)
              </button>

              <button
                onClick={() => setActiveTab("TRAINING")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "TRAINING"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Assessments & Viva Evaluations
              </button>

              <button
                disabled={isQuizActive}
                onClick={() => setActiveTab("RECRUITMENT")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "RECRUITMENT"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Drives & ATS Pipeline ({jobs.length} Drives • {applications.length} Applied)
              </button>

              <button
                disabled={isQuizActive}
                onClick={() => setActiveTab("PLACEMENT")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "PLACEMENT"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Interviews, Offers & Analytics ({interviews.length + offers.length})
              </button>

              {user.role === "ADMIN" && (
                <button
                  disabled={isQuizActive}
                  onClick={() => setActiveTab("GOVERNANCE")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                    activeTab === "GOVERNANCE"
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                      : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Governance & Audit Ledger ({auditLogs.length})
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === "RECRUITMENT" && (
          <div className="space-y-8">
            {/* Live Student Eligibility Context Strip */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Candidate</span>
                  <span className="font-semibold text-white">
                    {fullName} ({user.name})
                  </span>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">CGPA / Backlogs</span>
                  <span className="font-semibold text-white">
                    {parseFloat(cgpaInput || "0").toFixed(2)} / {activeBacklogs} Backlogs
                  </span>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">Program Level</span>
                  <span className="font-semibold text-indigo-300">{programLevel}</span>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">Examiner Readiness</span>
                  <span
                    className={`font-semibold ${
                      evaluations[0]?.isPlacementReady ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {evaluations[0]?.isPlacementReady ? "READY (Verified)" : "Pending Viva Sign-off"}
                  </span>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">Verified Quiz Badges</span>
                  <span className="font-semibold text-emerald-300">{badges.length} Earned</span>
                </div>
              </div>

              {user.role === "STUDENT" && resumes.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Apply with Resume:</span>
                  <select
                    value={selectedResumeIdForApply}
                    onChange={(e) => setSelectedResumeIdForApply(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.targetRole})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {jobAlert && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                  jobAlert.type === "OK"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {jobAlert.type === "OK" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{jobAlert.text}</span>
              </div>
            )}

            {/* Recruiter / Admin Job Drive Publisher */}
            {user.role !== "STUDENT" && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-semibold text-white">
                    Recruiter Portal — Publish New Placement / Internship Drive
                  </h2>
                </div>
                <form onSubmit={handleCreateNewDrive} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Drive Code</label>
                    <input
                      type="text"
                      value={newJobCode}
                      onChange={(e) => setNewJobCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">Role Title</label>
                    <input
                      type="text"
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Role Type</label>
                    <select
                      value={newRoleType}
                      onChange={(e) => setNewRoleType(e.target.value as JobRoleTypeOption)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    >
                      <option value="INTERNSHIP">Internship</option>
                      <option value="FULL_TIME">Full-Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Domain</label>
                    <select
                      value={newJobDomain}
                      onChange={(e) => setNewJobDomain(e.target.value as QuizDomainOption)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    >
                      <option value="DATA_SCIENCE">Data Science</option>
                      <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Compensation / Stipend</label>
                    <input
                      type="text"
                      value={newCompensation}
                      onChange={(e) => setNewCompensation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Min CGPA Cutoff</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={newMinCgpa}
                      onChange={(e) => setNewMinCgpa(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">Location</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="req-examiner-ready"
                      checked={newRequireReady}
                      onChange={(e) => setNewRequireReady(e.target.checked)}
                      className="accent-indigo-500 w-4 h-4"
                    />
                    <label htmlFor="req-examiner-ready" className="text-slate-300">
                      Require Examiner Ready Sign-off
                    </label>
                  </div>
                  <div className="pt-3">
                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                    >
                      Publish Drive
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Student Training Readiness Gate & Field-Specific Filter */}
            {user.role === "STUDENT" && !(badges.length > 0 && Boolean(evaluations[0]?.isPlacementReady)) ? (
              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-300">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Complete Training to Unlock{" "}
                  {studentTargetDomain === "DATA_SCIENCE"
                    ? "Data Science"
                    : "Software Development"}{" "}
                  Opportunities
                </h3>
                <p className="text-xs text-slate-400 max-w-xl mx-auto">
                  Opportunities in your field ({studentTargetDomain === "DATA_SCIENCE" ? "Data Science" : "Software Development"} •{" "}
                  {studentApplyingTrack}) become accessible once you pass the 15-Question Domain
                  Assessment and receive Examiner Viva placement readiness sign-off.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("TRAINING")}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Go to Training & Readiness Progress →
                  </button>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs
                .filter((job) =>
                  user.role === "STUDENT"
                    ? job.domain === studentTargetDomain && job.roleType === studentApplyingTrack
                    : true
                )
                .map((job) => {
                const elig = evaluateEligibilityForDrive(job);
                const existingApp = applications.find((a) => a.jobId === job.id);

                return (
                  <div
                    key={job.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-indigo-400">{job.jobCode}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                              {job.roleType === "INTERNSHIP" ? "INTERNSHIP" : "FULL-TIME"}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white mt-1">
                            {job.companyName} — {job.title}
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0">
                          {job.compensation}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">{job.description}</p>

                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          Min CGPA: {job.minCgpa.toFixed(2)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          Levels: {job.allowedLevels.join(", ")}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {job.location}
                        </span>
                        {job.requireExaminerReady && (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                            Examiner Viva Ready Required
                          </span>
                        )}
                      </div>

                      {/* Real-Time Rule Evaluation Box */}
                      <div
                        className={`p-3 rounded-xl border text-xs ${
                          elig.eligible
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        }`}
                      >
                        {elig.eligible ? (
                          <div className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Eligible (All BRULE-21 to BRULE-25 Checks Passed)</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold">
                              <XCircle className="w-4 h-4 shrink-0" />
                              <span>Not Eligible — Rule Guard Triggered:</span>
                            </div>
                            <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-200/90">
                              {elig.reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      {existingApp ? (
                        <div className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center justify-between">
                          <span>Applied ({existingApp.id})</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200">
                            {existingApp.status}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApplyToDrive(job)}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                            elig.eligible
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {elig.eligible ? "1-Click Apply with Selected Resume" : "Attempt Apply (Test Rule Guard)"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {/* Applications & Recruiter ATS Pipeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">
                    {user.role === "STUDENT"
                      ? `My Application Status Tracker (${applications.length})`
                      : `Applications & Recruiter ATS Pipeline (${applications.length})`}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {user.role === "STUDENT"
                      ? "Track live recruiter decisions, interview shortlists, and offer statuses for your submitted applications."
                      : "Shortlist candidates, schedule interviews, extend offers, or trigger BRULE-21 placement lock."}
                  </p>
                </div>
              </div>

              {applications.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl p-4">
                  No applications submitted yet. Apply to an eligible drive above to populate the ATS
                  pipeline.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 pr-3">App ID</th>
                        <th className="py-2.5 px-3">Drive & Company</th>
                        <th className="py-2.5 px-3">Candidate & Resume</th>
                        <th className="py-2.5 px-3">Stage</th>
                        {user.role !== "STUDENT" && <th className="py-2.5 pl-3">Recruiter Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {applications.map((app) => (
                        <tr key={app.id}>
                          <td className="py-3 pr-3 font-mono text-slate-300">{app.id}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-white block">{app.companyName}</span>
                            <span className="text-slate-400">{app.jobTitle}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-slate-200 block">
                              {app.studentName} ({app.studentRoll}) • CGPA {app.studentCgpa}
                            </span>
                            <span className="text-indigo-300 text-[11px]">{app.resumeTitle}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                              {app.status}
                            </span>
                          </td>
                          {user.role !== "STUDENT" && (
                            <td className="py-3 pl-3">
                              <select
                                value={app.status}
                                onChange={(e) =>
                                  handleUpdateApplicationStatus(
                                    app.id,
                                    e.target.value as AppStatusOption
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                              >
                                <option value="APPLIED">APPLIED</option>
                                <option value="SHORTLISTED">SHORTLISTED</option>
                                <option value="INTERVIEW_SCHEDULED">INTERVIEW_SCHEDULED</option>
                                <option value="OFFERED">OFFERED</option>
                                <option value="OFFER_ACCEPTED">OFFER_ACCEPTED</option>
                                <option value="REJECTED">REJECTED</option>
                              </select>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "IDENTITY" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Complete Student Registration Dossier */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-semibold text-white">Student Registration Dossier</h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
                    Roll: {user.email.split("@")[0].toUpperCase()}
                  </span>
                </div>

                {regAlert && (
                  <div
                    className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      regAlert.type === "OK"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {regAlert.type === "OK" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{regAlert.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveRegistration} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Student Email ID (IITM)</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Personal Email ID</label>
                      <input
                        type="email"
                        value={personalEmail}
                        onChange={(e) => setPersonalEmail(e.target.value)}
                        placeholder="personal@gmail.com"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Current CGPA</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={cgpaInput}
                        onChange={(e) => setCgpaInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Program Level</label>
                      <select
                        value={programLevel}
                        onChange={(e) => setProgramLevel(e.target.value as ProgramLevelOption)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        <option value="FOUNDATION">Foundation</option>
                        <option value="DIPLOMA">Diploma</option>
                        <option value="BSC">BSc</option>
                        <option value="BS">BS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Active Backlogs</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={activeBacklogs}
                        onChange={(e) => setActiveBacklogs(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">State</label>
                      <select
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as CategoryOption)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        <option value="GENERAL">General</option>
                    <option value="GENERAL_EWS">General-EWS</option>
                        <option value="OBC">OBC</option>
                        <option value="OBC_NCL">OBC-NCL</option>
                        <option value="SC_ST">SC/ST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Degree Type</label>
                      <select
                        value={degreeType}
                        onChange={(e) => setDegreeType(e.target.value as DegreeTypeOption)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        <option value="STANDALONE">Standalone</option>
                        <option value="DUAL_DEGREE">Dual Degree</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-indigo-400" />
                        Working Professional?
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsWorkingProf(true)}
                          className={`px-3 py-1 rounded-lg font-semibold border transition ${
                            isWorkingProf
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsWorkingProf(false)}
                          className={`px-3 py-1 rounded-lg font-semibold border transition ${
                            !isWorkingProf
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {isWorkingProf && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                        <div>
                          <label className="block text-slate-400 mb-1">Years of Experience</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="40"
                            value={yearsExp}
                            onChange={(e) => setYearsExp(e.target.value)}
                            placeholder="e.g., 2.5"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Domain</label>
                          <select
                            value={workDomain}
                            onChange={(e) => setWorkDomain(e.target.value as WorkDomainOption)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          >
                            <option value="DATA_SCIENCE">Data Science</option>
                            <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                            <option value="OTHERS">Others</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Present Company</label>
                          <input
                            type="text"
                            value={presentCompany}
                            onChange={(e) => setPresentCompany(e.target.value)}
                            placeholder="e.g., TCS / Fractal / Zoho"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Work Location</label>
                          <input
                            type="text"
                            value={workLocation}
                            onChange={(e) => setWorkLocation(e.target.value)}
                            placeholder="e.g., Bengaluru / Chennai"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Current CTC (LPA)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="500"
                            value={currentCtc}
                            onChange={(e) => setCurrentCtc(e.target.value)}
                            placeholder="e.g., 12.5"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                  >
                    Save Student Registration Dossier
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="font-semibold text-white mb-3">
                  LinkedIn, GitHub & Kaggle Handles
                </h2>
                {handlesSavedBanner && (
                  <div className="mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{handlesSavedBanner}</span>
                  </div>
                )}
                <form onSubmit={handleSaveHandles} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">LinkedIn User ID</label>
                      <input
                        type="text"
                        value={linkedinId}
                        onChange={(e) => {
                          setLinkedinId(e.target.value);
                          setHandlesSavedBanner(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">GitHub Username</label>
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(e) => {
                          setGithubUsername(e.target.value);
                          setHandlesSavedBanner(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Kaggle Username</label>
                      <input
                        type="text"
                        value={kaggleUsername}
                        onChange={(e) => {
                          setKaggleUsername(e.target.value);
                          setHandlesSavedBanner(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold transition"
                  >
                    Save Developer & LinkedIn Handles
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: BS Marksheet & Resume Vault */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-semibold text-white">IITM BS Course Marksheet</h2>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      marksheet
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    }`}
                  >
                    {marksheet ? "Uploaded" : "Pending PDF"}
                  </span>
                </div>

                {marksheet && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-emerald-200">{marksheet.fileName}</p>
                      <p className="text-slate-400 mt-0.5">
                        CGPA: <span className="text-white font-semibold">{marksheet.cgpa}</span> •{" "}
                        {marksheet.fileSize} • {marksheet.uploadedAt}
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                )}

                {marksheetAlert && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{marksheetAlert}</span>
                  </div>
                )}

                <form onSubmit={handleUploadMarksheet} className="space-y-3">
                  <div>
                    <input
                      ref={marksheetInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleMarksheetFileChange}
                      className="hidden"
                      id="bs-marksheet-upload"
                    />
                    <label
                      htmlFor="bs-marksheet-upload"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-dashed border-slate-700 hover:border-emerald-500 text-xs text-slate-300 flex items-center justify-between cursor-pointer transition"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {marksheetFile
                            ? `${marksheetFile.name} (${formatBytes(marksheetFile.size)})`
                            : "Select BS Marksheet PDF (max 5 MB)..."}
                        </span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-400 ml-2 shrink-0">
                        Browse
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload BS Marksheet
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-semibold text-white">Resume Vault (BRULE-55)</h2>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      resumes.length >= 3
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-slate-950 text-slate-300 border-slate-800"
                    }`}
                  >
                    {resumes.length} / 3 Active
                  </span>
                </div>

                <div className="space-y-2.5 mb-5">
                  {resumes.map((res) => (
                    <div
                      key={res.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-100 truncate">{res.title}</p>
                          {res.isPrimary && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 shrink-0">
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {res.targetRole} • {res.fileSize} • {res.updatedAt}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteResume(res.id, res.title)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                        title="Archive Resume"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {vaultAlert && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{vaultAlert}</span>
                  </div>
                )}

                <form onSubmit={handleAddResume} className="space-y-2.5">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="resume-pdf-upload"
                    />
                    <label
                      htmlFor="resume-pdf-upload"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-dashed border-slate-700 hover:border-indigo-500 text-xs text-slate-300 flex items-center justify-between cursor-pointer transition"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Upload className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="truncate">
                          {selectedFile
                            ? `${selectedFile.name} (${formatBytes(selectedFile.size)})`
                            : "Choose Resume PDF from device (max 5 MB)..."}
                        </span>
                      </span>
                      <span className="text-[11px] font-semibold text-indigo-400 ml-2 shrink-0">
                        Browse
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      placeholder="Target Role (e.g., ML Engineer)"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Upload
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === "TRAINING" && (
          <div className="space-y-8">
            {user.role === "STUDENT" && (() => {
              const hasPassedQuiz = badges.length > 0;
              const isVivaCleared = Boolean(evaluations[0]?.isPlacementReady);
              const isReadyForJobs = hasPassedQuiz && isVivaCleared;
              return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-400" />
                        My Training & Placement Readiness Tracker
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Target Field:{" "}
                        <span className="text-indigo-300 font-semibold">
                          {studentTargetDomain === "DATA_SCIENCE"
                            ? "Data Science"
                            : "Software Development"}
                        </span>{" "}
                        • Track:{" "}
                        <span className="text-indigo-300 font-semibold">{studentApplyingTrack}</span>
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        isReadyForJobs
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {isReadyForJobs
                        ? "ELIGIBLE TO APPLY FOR OPPORTUNITIES"
                        : "TRAINING IN PROGRESS — COMPLETE STEPS BELOW"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Step 1 • 15-Q Domain Assessment</span>
                      <span
                        className={`font-semibold mt-1 block ${
                          hasPassedQuiz ? "text-emerald-400" : "text-amber-300"
                        }`}
                      >
                        {hasPassedQuiz
                          ? `Completed (${badges.length} Verified Badge${badges.length > 1 ? "s" : ""})`
                          : "Pending — Attempt 15-Question Quiz"}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Step 2 • Examiner Viva Evaluation</span>
                      <span
                        className={`font-semibold mt-1 block ${
                          isVivaCleared ? "text-emerald-400" : "text-amber-300"
                        }`}
                      >
                        {isVivaCleared
                          ? "Cleared — Placement Ready Signed Off"
                          : "Awaiting Examiner Viva Sign-Off"}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block">Step 3 • Field Opportunities</span>
                        <span
                          className={`font-semibold mt-1 block ${
                            isReadyForJobs ? "text-emerald-400" : "text-slate-400"
                          }`}
                        >
                          {isReadyForJobs ? "Unlocked" : "Locked Until Training Cleared"}
                        </span>
                      </div>
                      {isReadyForJobs && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("RECRUITMENT")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        >
                          View Jobs →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Domain & Track Selector + Question Bank Builder + Verified Badges */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-400" />
                      <h2 className="font-semibold text-white">Domain & Track Assessments</h2>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      15 Random Qs • 30m
                    </span>
                  </div>

                  <div className="space-y-3">
                    {tracks.map((t) => {
                      const poolCount = questionBank.filter(
                        (q) => q.domain === t.domain && q.track === t.track
                      ).length;
                      const earned = badges.some((b) => b.courseCode === t.code);
                      return (
                        <button
                          key={t.id}
                          disabled={isQuizActive}
                          onClick={() => {
                            setActiveTrackId(t.id);
                            setDrawnQuestions([]);
                            setQuizAnswers({});
                            setQuizBanner(null);
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition disabled:opacity-50 ${
                            t.id === activeTrack.id
                              ? "bg-indigo-600/15 border-indigo-500/50"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-indigo-400">{t.code}</span>
                            {earned ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                                VERIFIED BADGE
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Attempts: {t.attemptsUsed}/{t.maxAttempts}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-white mt-1">{t.title}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Bank Pool: <span className="text-slate-200">{poolCount} questions</span>{" "}
                            • Draws 15 randomly
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question Bank Builder */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-indigo-400" />
                      <h2 className="font-semibold text-white">Quiz Question Bank Database</h2>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      {questionBank.length} Total Qs
                    </span>
                  </div>

                  {qbBanner && (
                    <div
                      className={`mb-3 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                        qbBanner.type === "OK"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{qbBanner.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddQuestionToBank} className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-1">Domain</label>
                        <select
                          value={qbDomain}
                          onChange={(e) => setQbDomain(e.target.value as QuizDomainOption)}
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        >
                          <option value="DATA_SCIENCE">Data Science</option>
                          <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Track</label>
                        <select
                          value={qbTrack}
                          onChange={(e) => setQbTrack(e.target.value as QuizTrackOption)}
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        >
                          <option value="INTERNSHIP">Internship</option>
                          <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                        </select>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={qbPrompt}
                      onChange={(e) => setQbPrompt(e.target.value)}
                      placeholder="Question prompt..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={qbOpt0}
                        onChange={(e) => setQbOpt0(e.target.value)}
                        placeholder="Option A"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                      <input
                        type="text"
                        value={qbOpt1}
                        onChange={(e) => setQbOpt1(e.target.value)}
                        placeholder="Option B"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                      <input
                        type="text"
                        value={qbOpt2}
                        onChange={(e) => setQbOpt2(e.target.value)}
                        placeholder="Option C"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                      <input
                        type="text"
                        value={qbOpt3}
                        onChange={(e) => setQbOpt3(e.target.value)}
                        placeholder="Option D"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Correct Answer:</span>
                      <select
                        value={qbCorrectIdx}
                        onChange={(e) => setQbCorrectIdx(Number(e.target.value))}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        <option value={0}>Option A</option>
                        <option value={1}>Option B</option>
                        <option value={2}>Option C</option>
                        <option value={3}>Option D</option>
                      </select>
                      <button
                        type="submit"
                        className="ml-auto px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Question
                      </button>
                    </div>
                  </form>
                </div>

                {/* Earned Skill Verification Badges */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-semibold text-white">Verified Skill Credentials</h2>
                  </div>

                  {badges.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl p-4">
                      Score ≥ 75% on any 15-question randomized assessment to mint a verified IITM
                      Skill Badge.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {badges.map((b) => (
                        <div
                          key={b.code}
                          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              {b.skillName}
                            </span>
                            <span className="text-xs font-semibold text-white">{b.scorePct}%</span>
                          </div>
                          <p className="font-mono text-[11px] text-emerald-200/90 mt-1.5">{b.code}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Track Modules & Random 15-Question Assessment Runner */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-mono text-indigo-400">{activeTrack.code}</span>
                      <h2 className="text-lg font-bold text-white">{activeTrack.title}</h2>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                      Pool: {activePoolSize} Qs
                    </span>
                  </div>

                  {!isQuizActive && (
                    <>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-4 mb-2.5">
                        1. Learning Modules (Click to mark complete)
                      </h3>
                      <div className="space-y-2">
                        {activeTrack.modules.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => toggleModuleComplete(activeTrack.id, m.id)}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-start gap-3 cursor-pointer transition"
                          >
                            {m.completed ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-xs font-semibold ${
                                    m.completed ? "text-emerald-300" : "text-slate-200"
                                  }`}
                                >
                                  {m.title}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {m.durationMinutes} min
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{m.summary}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-800 my-6" />
                    </>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <PlayCircle className="w-4 h-4 text-indigo-400" />
                      2. Proctored 15-Question Random Quiz (Pass ≥ {activeTrack.passThresholdPct}%)
                    </h3>
                    <div className="flex items-center gap-2">
                      {isQuizActive && (
                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                            secondsLeft <= 120
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                              : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {formatTimer(secondsLeft)}
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          activeTrack.attemptsUsed >= activeTrack.maxAttempts
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            : "bg-slate-950 text-slate-300 border-slate-800"
                        }`}
                      >
                        Attempts: {activeTrack.attemptsUsed} / {activeTrack.maxAttempts}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                    <EyeOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300">
                        Randomized 15-Question Draw • 30:00 Timer • Zero Tab-Switch Tolerance:
                      </span>{" "}
                      15 questions are randomly drawn from the{" "}
                      <span className="text-white font-semibold">{activePoolSize}-question</span>{" "}
                      bank and auto-evaluated on submission. Switching tabs immediately fails the
                      attempt.
                    </div>
                  </div>

                  {quizBanner && (
                    <div
                      className={`mb-4 p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                        quizBanner.type === "PASS"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : quizBanner.type === "BLOCKED"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      }`}
                    >
                      {quizBanner.type === "PASS" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span>{quizBanner.text}</span>
                    </div>
                  )}

                  {!isQuizActive ? (
                    <button
                      type="button"
                      onClick={handleStartRandomQuiz}
                      disabled={activeTrack.attemptsUsed >= activeTrack.maxAttempts}
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
                    >
                      <Shuffle className="w-4 h-4" />
                      {activeTrack.attemptsUsed >= activeTrack.maxAttempts
                        ? `Maximum Attempts Exhausted (${activeTrack.attemptsUsed}/${activeTrack.maxAttempts})`
                        : `Draw 15 Random Questions & Start 30:00 Quiz (Attempt ${
                            activeTrack.attemptsUsed + 1
                          } of ${activeTrack.maxAttempts})`}
                    </button>
                  ) : (
                    <form onSubmit={handleSubmitQuiz} className="space-y-4">
                      {drawnQuestions.map((q, qIdx) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                        >
                          <p className="text-xs font-semibold text-slate-200">
                            Q{qIdx + 1} of {drawnQuestions.length}. {q.prompt}
                          </p>
                          <div className="space-y-1.5 pt-1">
                            {q.options.map((opt, optIdx) => (
                              <label
                                key={optIdx}
                                className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition ${
                                  quizAnswers[q.id] === optIdx
                                    ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                                    : "border-transparent text-slate-400 hover:bg-slate-900"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`session-${q.id}`}
                                  checked={quizAnswers[q.id] === optIdx}
                                  onChange={() =>
                                    setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                  }
                                  className="accent-indigo-500"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                      >
                        Submit & Auto-Evaluate All {drawnQuestions.length} Questions (
                        {formatTimer(secondsLeft)} remaining)
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Final Stage: Examiner Interview Evaluation */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h2 className="font-semibold text-white">
                      3. Final Stage: Examiner Interview & Placement Readiness Evaluation
                    </h2>
                    <p className="text-xs text-slate-400">
                      Examiner panel evaluates observed skillsets, 1–5 competency ratings, readiness,
                      and remedial action tasks
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                  Active Role: {user.role}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  {user.role === "STUDENT" ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                      <p className="font-semibold text-indigo-300">
                        Student View — Examiner Interview Rubric Locked
                      </p>
                      <p className="text-slate-400">
                        Switch your RBAC View in the top bar to{" "}
                        <span className="text-white font-semibold">ADMIN</span> or{" "}
                        <span className="text-white font-semibold">RECRUITER</span> (Examiner) to
                        submit a final-stage interview evaluation for{" "}
                        <span className="text-white font-mono">{user.name}</span>.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveExaminerEvaluation} className="space-y-3.5 text-xs">
                      {evalBanner && (
                        <div
                          className={`p-3 rounded-lg border flex items-start gap-2 ${
                            evalBanner.type === "OK"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                          }`}
                        >
                          {evalBanner.type === "OK" ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <span>{evalBanner.text}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-400 mb-1">
                          Skillsets of Student (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={evalSkillsets}
                          onChange={(e) => setEvalSkillsets(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1">
                            Technical Skills in Programming (1–5)
                          </label>
                          <select
                            value={progRating}
                            onChange={(e) => setProgRating(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n} / 5
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">
                            Technical Skills in Data Science (1–5)
                          </label>
                          <select
                            value={dsRating}
                            onChange={(e) => setDsRating(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n} / 5
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">
                            Communication Skills (1–5)
                          </label>
                          <select
                            value={commRating}
                            onChange={(e) => setCommRating(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n} / 5
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-300 font-medium">
                            Readiness for Placement
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setIsPlacementReady(true)}
                              className={`px-2.5 py-1 rounded font-semibold ${
                                isPlacementReady
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-900 text-slate-400"
                              }`}
                            >
                              Ready
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsPlacementReady(false)}
                              className={`px-2.5 py-1 rounded font-semibold ${
                                !isPlacementReady
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-900 text-slate-400"
                              }`}
                            >
                              Not Ready
                            </button>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-300 font-medium flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                            Performing Exceptionally Good
                          </span>
                          <input
                            type="checkbox"
                            checked={performingExceptionallyGood}
                            onChange={(e) => setPerformingExceptionallyGood(e.target.checked)}
                            className="accent-indigo-500 w-4 h-4"
                          />
                        </div>
                      </div>

                      {!isPlacementReady && (
                        <div>
                          <label className="block text-amber-300 font-semibold mb-1">
                            Mandatory Remedial Tasks for Student (one task per line)
                          </label>
                          <textarea
                            rows={3}
                            value={remedialTasksText}
                            onChange={(e) => setRemedialTasksText(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-500/40 text-slate-100"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-400 mb-1">Examiner Remarks</label>
                        <input
                          type="text"
                          value={examinerNotes}
                          onChange={(e) => setExaminerNotes(e.target.value)}
                          placeholder="Optional interview summary..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                      >
                        Record Final Examiner Interview Evaluation
                      </button>
                    </form>
                  )}
                </div>

                <div className="lg:col-span-6 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recorded Examiner Viva Evaluations ({evaluations.length})
                  </h3>

                  {evaluations.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                      No final-stage examiner interview evaluations recorded yet.
                    </div>
                  ) : (
                    evaluations.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold ${
                                ev.isPlacementReady
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {ev.isPlacementReady ? "PLACEMENT READY" : "NOT READY"}
                            </span>
                            {ev.performingExceptionallyGood && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                EXCEPTIONALLY GOOD
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500">{ev.evaluatedAt}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[11px]">Programming</span>
                            <span className="font-bold text-white">{ev.programmingRating} / 5</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[11px]">Data Science</span>
                            <span className="font-bold text-white">{ev.dataScienceRating} / 5</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[11px]">Communication</span>
                            <span className="font-bold text-white">
                              {ev.communicationRating} / 5
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-500">Observed Skillsets: </span>
                          <span className="text-slate-200">{ev.skillsets.join(", ")}</span>
                        </div>

                        {!ev.isPlacementReady && ev.remedialTasks.length > 0 && (
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <p className="font-semibold text-amber-300 mb-1">
                              Assigned Tasks Before Placement Readiness:
                            </p>
                            <ul className="list-disc list-inside text-amber-100/90 space-y-0.5">
                              {ev.remedialTasks.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "PLACEMENT" && (() => {
          const acceptedOffers = offers.filter((o) => o.status === "ACCEPTED");
          const ftOffers = offers.filter((o) => o.roleType === "FULL_TIME");
          const avgCtc = ftOffers.length
            ? (ftOffers.reduce((acc, o) => acc + o.ctcLpa, 0) / ftOffers.length).toFixed(2)
            : "16.50";
          const maxCtc = ftOffers.length
            ? Math.max(...ftOffers.map((o) => o.ctcLpa)).toFixed(2)
            : "22.00";

          return (
            <div className="space-y-8">
              {placementAlert && (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    placementAlert.type === "OK"
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                      : "bg-rose-950/60 border-rose-500/40 text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {placementAlert.type === "OK" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{placementAlert.text}</span>
                  </div>
                  <button
                    onClick={() => setPlacementAlert(null)}
                    className="text-slate-400 hover:text-white text-[11px] underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Placement Cell Executive KPIs */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-400" />
                      IITM BS Placement Analytics & Cohort Telemetry
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live conversion funnel across drives, interviews, issued offers, and BRULE-35 locked acceptances.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                    2026-27 Placement Season
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Active Drives</div>
                    <div className="text-xl font-bold text-white mt-1">{jobs.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Applications</div>
                    <div className="text-xl font-bold text-sky-300 mt-1">{applications.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Interviews</div>
                    <div className="text-xl font-bold text-amber-300 mt-1">{interviews.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Offers Issued</div>
                    <div className="text-xl font-bold text-purple-300 mt-1">{offers.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Offers Accepted</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{acceptedOffers.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Avg / Max FT CTC</div>
                    <div className="text-base font-bold text-emerald-300 mt-1">
                      ₹{avgCtc} / ₹{maxCtc} LPA
                    </div>
                  </div>
                </div>
              </div>

              {/* Offer Letters Desk (BRULE-35 Single Full-Time Offer Lock) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-emerald-400" />
                      Official Offer Letters ({offers.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">BRULE-35 Single FT Lock Active</span>
                  </div>

                  <div className="space-y-3">
                    {offers.map((ofr) => (
                      <div
                        key={ofr.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-indigo-300">{ofr.offerCode}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300">
                              {ofr.roleType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ofr.status === "ACCEPTED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : ofr.status === "DECLINED"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {ofr.status}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white">
                            {ofr.companyName} — {ofr.roleTitle}
                          </div>
                          <div className="text-xs text-slate-400">
                            Candidate: <span className="text-slate-200">{ofr.studentName}</span> ({ofr.studentRoll}) ·{" "}
                            <span className="text-emerald-300 font-semibold">₹{ofr.ctcLpa.toFixed(2)} LPA</span> · Joins{" "}
                            {ofr.joiningDate} (Expires {ofr.expiresAt})
                          </div>
                          {ofr.remarks && (
                            <div className="text-[11px] text-slate-500 italic">{ofr.remarks}</div>
                          )}
                        </div>

                        {user?.role === "STUDENT" && ofr.status === "ISSUED" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleRespondToOffer(ofr.id, "ACCEPTED")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                            >
                              Accept Offer
                            </button>
                            <button
                              onClick={() => handleRespondToOffer(ofr.id, "DECLINED")}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs font-semibold transition"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recruiter / Admin Offer Issuance Form */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Issue Formal Offer Letter
                  </h3>
                  <form onSubmit={handleIssueOfferLetter} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Target Application</label>
                      <select
                        value={ofrAppId}
                        onChange={(e) => setOfrAppId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      >
                        {applications.length === 0 ? (
                          <option value="">Aarav Sharma — Fractal Analytics (Associate Data Scientist)</option>
                        ) : (
                          applications.map((app) => (
                            <option key={app.id} value={app.id}>
                              {app.studentName} — {app.companyName} ({app.jobTitle})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Annualized CTC (LPA)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={ofrCtcLpa}
                          onChange={(e) => setOfrCtcLpa(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Joining Date</label>
                        <input
                          type="date"
                          value={ofrJoiningDate}
                          onChange={(e) => setOfrJoiningDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Offer Response Deadline</label>
                      <input
                        type="date"
                        value={ofrExpiresAt}
                        onChange={(e) => setOfrExpiresAt(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={user?.role === "STUDENT"}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition"
                    >
                      {user?.role === "STUDENT" ? "Switch to Recruiter / Admin to Issue Offers" : "Generate & Issue Offer Letter"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Interview Schedule & BRULE-31 Conflict-Free Slot Engine */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      Scheduled Interview Panels ({interviews.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">BRULE-31 45-Min Conflict Guard</span>
                  </div>

                  <div className="space-y-3">
                    {interviews.map((iv) => (
                      <div
                        key={iv.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-sky-300">{iv.id}</span>
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                              Round {iv.roundNumber} · {iv.roundType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                iv.status === "PASSED" || iv.status === "CONFIRMED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : iv.status === "FAILED"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {iv.status}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white">
                            {iv.companyName} — {iv.jobTitle}
                          </div>
                          <div className="text-xs text-slate-400">
                            Candidate: <span className="text-slate-200">{iv.studentName}</span> · Slot:{" "}
                            <span className="text-sky-300 font-medium">{iv.scheduledAt.replace("T", " ")} IST</span> · Panelist:{" "}
                            {iv.panelistName}
                          </div>
                          <div className="text-[11px] text-indigo-400 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5" />
                            <span>{iv.meetingLink}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {user?.role === "STUDENT" && iv.status === "SCHEDULED" && (
                            <button
                              onClick={() => handleUpdateInterviewStatus(iv.id, "CONFIRMED")}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
                            >
                              Confirm Slot
                            </button>
                          )}
                          {user?.role !== "STUDENT" && (iv.status === "SCHEDULED" || iv.status === "CONFIRMED") && (
                            <>
                              <button
                                onClick={() => handleUpdateInterviewStatus(iv.id, "PASSED")}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                              >
                                Pass Round
                              </button>
                              <button
                                onClick={() => handleUpdateInterviewStatus(iv.id, "FAILED")}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold transition"
                              >
                                Fail
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recruiter / Admin Interview Slot Scheduler */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Schedule Interview Slot
                  </h3>
                  <form onSubmit={handleScheduleInterview} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Candidate Application</label>
                      <select
                        value={ivAppId}
                        onChange={(e) => setIvAppId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      >
                        {applications.length === 0 ? (
                          <option value="">Aarav Sharma — Google Research India (AI/ML Research Fellow)</option>
                        ) : (
                          applications.map((app) => (
                            <option key={app.id} value={app.id}>
                              {app.studentName} — {app.companyName} ({app.jobTitle})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Interview Round</label>
                        <select
                          value={ivRoundType}
                          onChange={(e) => setIvRoundType(e.target.value as InterviewRoundOption)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                        >
                          <option value="TECHNICAL_1">TECHNICAL_1</option>
                          <option value="TECHNICAL_2">TECHNICAL_2</option>
                          <option value="MANAGERIAL">MANAGERIAL</option>
                          <option value="HR_FINAL">HR_FINAL</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Mode</label>
                        <select
                          value={ivMode}
                          onChange={(e) => setIvMode(e.target.value as "ONLINE_MEET" | "IN_PERSON")}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                        >
                          <option value="ONLINE_MEET">ONLINE_MEET</option>
                          <option value="IN_PERSON">IN_PERSON</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Date & Time (IST)</label>
                      <input
                        type="datetime-local"
                        value={ivDateTime}
                        onChange={(e) => setIvDateTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Panelist Name & Title</label>
                      <input
                        type="text"
                        value={ivPanelist}
                        onChange={(e) => setIvPanelist(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Meeting Link / Campus Room</label>
                      <input
                        type="text"
                        value={ivMeetingLink}
                        onChange={(e) => setIvMeetingLink(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={user?.role === "STUDENT"}
                      className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-semibold transition"
                    >
                      {user?.role === "STUDENT" ? "Switch to Recruiter / Admin to Schedule" : "Schedule Interview Slot"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === "GOVERNANCE" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h2 className="font-semibold text-white">
                      Registration Approval Queue (Admin Gate)
                    </h2>
                    <p className="text-xs text-slate-400">
                      All Student, Recruiter, and Examiner sign-ups remain locked until explicitly
                      approved by Placement Admin.
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                  {registrations.filter((r) => r.status === "PENDING").length} Pending Approval
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 pr-3">Reg ID</th>
                      <th className="py-2.5 pr-3">Applicant</th>
                      <th className="py-2.5 pr-3">Role</th>
                      <th className="py-2.5 pr-3">Department / Organization</th>
                      <th className="py-2.5 pr-3">Status</th>
                      <th className="py-2.5 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-950/60">
                        <td className="py-3 pr-3 font-mono text-slate-400">{reg.id}</td>
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-slate-100">{reg.fullName}</div>
                          <div className="text-[11px] text-slate-400">{reg.email}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold text-[11px]">
                            {reg.role}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-slate-300">{reg.orgOrDept}</td>
                        <td className="py-3 pr-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              reg.status === "APPROVED"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : reg.status === "PENDING"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {reg.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {user.role === "ADMIN" ? (
                            <div className="inline-flex items-center gap-1.5">
                              {reg.status !== "APPROVED" && (
                                <button
                                  type="button"
                                  onClick={() => handleRegistrationDecision(reg.id, "APPROVED")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition"
                                >
                                  Approve
                                </button>
                              )}
                              {reg.status !== "REJECTED" && (
                                <button
                                  type="button"
                                  onClick={() => handleRegistrationDecision(reg.id, "REJECTED")}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-semibold text-[11px] transition"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Admin Role Required</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="font-semibold text-white">Immutable Governance & Audit Trail</h2>
                  <p className="text-xs text-slate-400">
                    Append-only ledger capturing Registration, Assessments, Examiner Evaluations &
                    Recruitment Eligibility Decisions
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                {auditLogs.length} Events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 pr-3">ID / Time</th>
                    <th className="py-2.5 px-3">Actor & Role</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 pl-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-950/60">
                      <td className="py-3 pr-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        <span className="text-slate-200 block">{log.id}</span>
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-200 font-medium block">{log.actor}</span>
                        <span className="text-[11px] text-indigo-400">{log.role}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-200 block">{log.action}</span>
                        <span className="text-slate-400 text-[11px]">{log.resource}</span>
                      </td>
                      <td className="py-3 pl-3 whitespace-nowrap">
                        {log.status === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            RECORDED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            BLOCKED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}
      </main>
    </div>
  );
}
