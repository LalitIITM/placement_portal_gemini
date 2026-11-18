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
} from "lucide-react";

type Role = "STUDENT" | "RECRUITER" | "ADMIN";
type ActiveTab = "IDENTITY" | "TRAINING" | "GOVERNANCE";

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

interface QuizQuestion {
  id: string;
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

interface TrainingCourse {
  id: string;
  code: string;
  title: string;
  category: string;
  skillTag: string;
  passThresholdPct: number;
  attemptsUsed: number;
  maxAttempts: number;
  bestScorePct: number | null;
  modules: CourseModuleItem[];
  questions: QuizQuestion[];
}

const ALLOWED_DOMAINS = ["@ds.study.iitm.ac.in", "@es.study.iitm.ac.in"];
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const QUIZ_DURATION_SECONDS = 30 * 60; // 30 minutes (1800 seconds)

const INITIAL_COURSES: TrainingCourse[] = [
  {
    id: "course-cs301",
    code: "CS-301",
    title: "Production FastAPI & Distributed Systems",
    category: "Backend Engineering",
    skillTag: "FastAPI & Async Architecture",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      {
        id: "m-1",
        title: "Async SQLAlchemy & Connection Pooling",
        durationMinutes: 25,
        summary: "Avoid event-loop starvation and pool exhaustion under 50k concurrent users.",
        completed: true,
      },
      {
        id: "m-2",
        title: "Idempotency, Rate Limiting & Redis Caching",
        durationMinutes: 30,
        summary: "Protect critical mutations and cache read-heavy endpoints.",
        completed: false,
      },
      {
        id: "m-3",
        title: "Zero-Trust RBAC & Immutable Audit Trails",
        durationMinutes: 20,
        summary: "Enforce role boundaries and append-only compliance ledgers.",
        completed: false,
      },
    ],
    questions: [
      {
        id: "q1",
        prompt: "Why should blocking I/O calls be avoided inside an async FastAPI route?",
        options: [
          "They stall the single-threaded asyncio event loop",
          "FastAPI rejects synchronous functions at import time",
          "PostgreSQL automatically drops sync connections",
          "CORS headers are stripped on blocking calls",
        ],
        correctIndex: 0,
      },
      {
        id: "q2",
        prompt: "Which HTTP status code best represents a business-rule conflict like exceeding max attempts?",
        options: ["200 OK", "302 Found", "409 Conflict", "502 Bad Gateway"],
        correctIndex: 2,
      },
      {
        id: "q3",
        prompt: "How is immutability guaranteed on an audit log table?",
        options: [
          "Allowing soft-deletes via is_deleted flag",
          "Blocking UPDATE/DELETE at both ORM event hooks and DB triggers",
          "Truncating logs nightly after backup",
          "Using browser localStorage",
        ],
        correctIndex: 1,
      },
      {
        id: "q4",
        prompt: "What is the primary benefit of keyset pagination over large OFFSET queries?",
        options: [
          "It eliminates the need for indexes",
          "It maintains O(log N) index seeks without scanning skipped rows",
          "It compresses JSON payloads automatically",
          "It disables transaction isolation",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "course-ds302",
    code: "DS-302",
    title: "Applied ML & Statistical Modeling",
    category: "Data Science",
    skillTag: "Applied Machine Learning",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      {
        id: "m-4",
        title: "Leakage-Free Cross-Validation Pipelines",
        durationMinutes: 25,
        summary: "Prevent target and temporal leakage in tabular datasets.",
        completed: false,
      },
      {
        id: "m-5",
        title: "Precision-Recall Tradeoffs & Threshold Tuning",
        durationMinutes: 25,
        summary: "Align model operating points with asymmetric business costs.",
        completed: false,
      },
      {
        id: "m-6",
        title: "Probability Calibration & Data Drift Detection",
        durationMinutes: 20,
        summary: "Monitor PSI/KS statistics and Brier scores in production.",
        completed: false,
      },
    ],
    questions: [
      {
        id: "q1",
        prompt: "When should feature scaling (e.g., StandardScaler) be fit in a cross-validation pipeline?",
        options: [
          "On the entire dataset before splitting",
          "Inside each training fold only, then applied to validation",
          "Only on the test set",
          "After hyperparameter tuning finishes",
        ],
        correctIndex: 1,
      },
      {
        id: "q2",
        prompt: "Which metric is most informative on a heavily imbalanced 1% positive class dataset?",
        options: ["Raw Accuracy", "PR-AUC (Precision-Recall AUC)", "R-squared", "Mean Bias Error"],
        correctIndex: 1,
      },
      {
        id: "q3",
        prompt: "What does a high Population Stability Index (PSI > 0.25) indicate in production?",
        options: [
          "Significant covariate distribution shift",
          "Zero model latency",
          "Perfect model calibration",
          "Overfitting on training labels only",
        ],
        correctIndex: 0,
      },
      {
        id: "q4",
        prompt: "Which technique improves predicted probability reliability without changing rank ordering?",
        options: ["Dropout", "Isotonic / Platt Calibration", "L1 Pruning", "PCA"],
        correctIndex: 1,
      },
    ],
  },
];

export default function App() {
  const [email, setEmail] = useState("22f3001234@ds.study.iitm.ac.in");
  const [selectedRole, setSelectedRole] = useState<Role>("STUDENT");
  const [user, setUser] = useState<{ email: string; role: Role; name: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("IDENTITY");

  // Increment 1: Student Handles & BS Marksheet
  const [linkedinId, setLinkedinId] = useState("aarav-sharma-iitm");
  const [githubUsername, setGithubUsername] = useState("aarav-ds-iitm");
  const [kaggleUsername, setKaggleUsername] = useState("aaravml");
  const [handlesSavedBanner, setHandlesSavedBanner] = useState<string | null>(null);

  const [marksheet, setMarksheet] = useState<MarksheetRecord | null>(null);
  const [marksheetFile, setMarksheetFile] = useState<File | null>(null);
  const [cgpaInput, setCgpaInput] = useState("8.92");
  const [marksheetAlert, setMarksheetAlert] = useState<string | null>(null);
  const marksheetInputRef = useRef<HTMLInputElement | null>(null);

  // Increment 1: Resume Vault state
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

  // Increment 2: Training & Proctored Assessment state
  const [courses, setCourses] = useState<TrainingCourse[]>(INITIAL_COURSES);
  const [activeCourseId, setActiveCourseId] = useState<string>(INITIAL_COURSES[0].id);
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(QUIZ_DURATION_SECONDS);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizBanner, setQuizBanner] = useState<{
    type: "PASS" | "FAIL" | "BLOCKED";
    text: string;
  } | null>(null);
  const [badges, setBadges] = useState<SkillBadgeItem[]>([]);

  // Immutable Audit Trail
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([
    {
      id: "AUD-1001",
      timestamp: "08:00:00 IST",
      actor: "system@iitm.ac.in",
      role: "ADMIN",
      action: "POLICY_ENFORCED",
      resource: "BRULE-55 (Max 3 Resumes) & BRULE-12 (30m Proctored Quiz)",
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

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  const finalizeQuizAttempt = useCallback(
    (reason: "NORMAL" | "TIMEOUT" | "TAB_SWITCH_VIOLATION") => {
      if (!user) return;

      if (activeCourse.attemptsUsed >= activeCourse.maxAttempts) {
        setIsQuizActive(false);
        setQuizBanner({
          type: "BLOCKED",
          text: `BRULE-12 Enforcement: Maximum ${activeCourse.maxAttempts} assessment attempts exhausted for ${activeCourse.code}.`,
        });
        appendAudit(
          user.email,
          user.role,
          "BRULE_12_BLOCKED",
          `${activeCourse.code} (Attempt #${activeCourse.attemptsUsed + 1})`,
          "BLOCKED"
        );
        return;
      }

      const nextAttemptNum = activeCourse.attemptsUsed + 1;
      let scorePct = 0;
      let passed = false;

      if (reason === "NORMAL") {
        const correctCount = activeCourse.questions.reduce(
          (acc, q) => (quizAnswers[q.id] === q.correctIndex ? acc + 1 : acc),
          0
        );
        scorePct = Math.round((correctCount / activeCourse.questions.length) * 100);
        passed = scorePct >= activeCourse.passThresholdPct;
      }

      setIsQuizActive(false);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === activeCourse.id
            ? {
                ...c,
                attemptsUsed: nextAttemptNum,
                bestScorePct: Math.max(c.bestScorePct ?? 0, scorePct),
              }
            : c
        )
      );

      if (reason === "TAB_SWITCH_VIOLATION") {
        appendAudit(
          user.email,
          user.role,
          "ASSESSMENT_TAB_VIOLATION",
          `${activeCourse.code} • Attempt ${nextAttemptNum}/${activeCourse.maxAttempts} auto-failed (0%)`,
          "BLOCKED"
        );
        setQuizBanner({
          type: "BLOCKED",
          text: `Proctoring Violation: Tab/window switch detected! Attempt #${nextAttemptNum} automatically failed (0%). ${
            activeCourse.maxAttempts - nextAttemptNum
          } attempt(s) remaining.`,
        });
        return;
      }

      if (reason === "TIMEOUT") {
        appendAudit(
          user.email,
          user.role,
          "ASSESSMENT_TIMEOUT",
          `${activeCourse.code} • 30:00 timer expired on Attempt ${nextAttemptNum}/${activeCourse.maxAttempts}`,
          "BLOCKED"
        );
        setQuizBanner({
          type: "FAIL",
          text: `Time Expired (30:00)! Attempt #${nextAttemptNum} recorded as failed (0%). ${
            activeCourse.maxAttempts - nextAttemptNum
          } attempt(s) remaining.`,
        });
        return;
      }

      appendAudit(
        user.email,
        user.role,
        passed ? "ASSESSMENT_PASSED" : "ASSESSMENT_FAILED",
        `${activeCourse.code} • Attempt ${nextAttemptNum}/${activeCourse.maxAttempts} (${scorePct}%)`,
        "SUCCESS"
      );

      if (passed) {
        const alreadyHasBadge = badges.some((b) => b.courseCode === activeCourse.code);
        if (!alreadyHasBadge) {
          const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
          const code = `BADGE-IITM-${activeCourse.code.replace("-", "")}-${hash}`;
          const newBadge: SkillBadgeItem = {
            code,
            courseCode: activeCourse.code,
            skillName: activeCourse.skillTag,
            scorePct,
            issuedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
          };
          setBadges((prev) => [newBadge, ...prev]);
          appendAudit(
            user.email,
            user.role,
            "BADGE_ISSUED",
            `${code} (${activeCourse.skillTag})`,
            "SUCCESS"
          );
        }
        setQuizBanner({
          type: "PASS",
          text: `Passed with ${scorePct}%! Verified credential "${activeCourse.skillTag}" added to your profile.`,
        });
      } else {
        const remaining = activeCourse.maxAttempts - nextAttemptNum;
        setQuizBanner({
          type: "FAIL",
          text: `Scored ${scorePct}% (Threshold: ${activeCourse.passThresholdPct}%). ${remaining} attempt(s) remaining under BRULE-12.`,
        });
      }
    },
    [activeCourse, appendAudit, badges, quizAnswers, user]
  );

  // 30-Minute Countdown Timer Effect
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

  // Tab-Switch / Window-Blur Auto-Fail Proctoring Effect
  useEffect(() => {
    if (!isQuizActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        finalizeQuizAttempt("TAB_SWITCH_VIOLATION");
      }
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setAuthError("Please enter your institutional email address.");
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
    }

    setAuthError(null);
    const displayName = normalized.split("@")[0].toUpperCase();
    setUser({ email: normalized, role: selectedRole, name: displayName });
    appendAudit(normalized, selectedRole, "USER_LOGIN", "Sliding 30m Session (BRULE-03)", "SUCCESS");
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

  const toggleModuleComplete = (courseId: string, moduleId: string) => {
    if (!user) return;
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          modules: c.modules.map((m) => {
            if (m.id !== moduleId) return m;
            const nextState = !m.completed;
            if (nextState) {
              appendAudit(user.email, user.role, "MODULE_COMPLETED", `${c.code}: ${m.title}`, "SUCCESS");
            }
            return { ...m, completed: nextState };
          }),
        };
      })
    );
  };

  const handleStartQuiz = () => {
    if (!user) return;
    if (activeCourse.attemptsUsed >= activeCourse.maxAttempts) {
      setQuizBanner({
        type: "BLOCKED",
        text: `BRULE-12 Enforcement: Maximum ${activeCourse.maxAttempts} assessment attempts exhausted for ${activeCourse.code}.`,
      });
      return;
    }
    setQuizAnswers({});
    setQuizBanner(null);
    setSecondsLeft(QUIZ_DURATION_SECONDS);
    setIsQuizActive(true);
    appendAudit(
      user.email,
      user.role,
      "ASSESSMENT_STARTED",
      `${activeCourse.code} • 30:00 Proctored Timer Armed`,
      "SUCCESS"
    );
  };

  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const unanswered = activeCourse.questions.some((q) => quizAnswers[q.id] === undefined);
    if (unanswered) {
      setQuizBanner({
        type: "FAIL",
        text: "Please answer all 4 assessment questions before submitting.",
      });
      return;
    }
    finalizeQuizAttempt("NORMAL");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" />
            Increment 1 & 2 • Proctored Career OS
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            IITM Placement & Career Portal
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Domain-validated SSO, BS Marksheet verification, and proctored skill assessments.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Select Role Context
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["STUDENT", "RECRUITER", "ADMIN"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r);
                      setAuthError(null);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
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

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Institutional Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="22f3001234@ds.study.iitm.ac.in"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Allowed student domains: <span className="text-slate-300">@ds.study.iitm.ac.in</span>,{" "}
                <span className="text-slate-300">@es.study.iitm.ac.in</span>
              </p>
            </div>

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
              Sign In with Domain SSO
            </button>
          </form>
        </div>
      </div>
    );
  }

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
                  Increment 2 • Proctored
                </span>
              </div>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-1">RBAC View:</span>
            {(["STUDENT", "RECRUITER", "ADMIN"] as Role[]).map((r) => (
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
            Student Profile, Marksheet & Vault ({resumes.length}/3)
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
            Training & Proctored Quizzes
            {badges.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                {badges.length} Badges
              </span>
            )}
          </button>

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
            Immutable Audit Ledger ({auditLogs.length})
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === "IDENTITY" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Identity, Social/Dev Handles & BS Marksheet */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-semibold text-white">Student Identity & Developer Handles</h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {user.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block">Roll / Handle</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{user.name}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block">Verified CGPA</span>
                    <span className="text-emerald-400 font-semibold mt-0.5 block">
                      {marksheet ? `${marksheet.cgpa} / 10.0` : `${cgpaInput} / 10.0`}
                    </span>
                  </div>
                </div>

                {handlesSavedBanner && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{handlesSavedBanner}</span>
                  </div>
                )}

                <form onSubmit={handleSaveHandles} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">LinkedIn User ID</label>
                    <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                      <span className="text-slate-500 select-none">linkedin.com/in/</span>
                      <input
                        type="text"
                        value={linkedinId}
                        onChange={(e) => {
                          setLinkedinId(e.target.value);
                          setHandlesSavedBanner(null);
                        }}
                        placeholder="your-linkedin-id"
                        className="flex-1 bg-transparent text-slate-100 focus:outline-none ml-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">GitHub Username</label>
                      <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                        <span className="text-slate-500 select-none">@</span>
                        <input
                          type="text"
                          value={githubUsername}
                          onChange={(e) => {
                            setGithubUsername(e.target.value);
                            setHandlesSavedBanner(null);
                          }}
                          placeholder="github-user"
                          className="flex-1 bg-transparent text-slate-100 focus:outline-none ml-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Kaggle Username</label>
                      <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                        <span className="text-slate-500 select-none">kaggle.com/</span>
                        <input
                          type="text"
                          value={kaggleUsername}
                          onChange={(e) => {
                            setKaggleUsername(e.target.value);
                            setHandlesSavedBanner(null);
                          }}
                          placeholder="kaggle-user"
                          className="flex-1 bg-transparent text-slate-100 focus:outline-none ml-1"
                        />
                      </div>
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

              {/* BS Course Marksheet Uploader */}
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
                            : "Select BS Grade Card / Marksheet PDF (max 5 MB)..."}
                        </span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-400 ml-2 shrink-0">
                        Browse
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={cgpaInput}
                      onChange={(e) => setCgpaInput(e.target.value)}
                      placeholder="CGPA (e.g. 8.92)"
                      className="w-36 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Marksheet
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Resume Vault (BRULE-55) */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
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
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
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
        )}

        {activeTab === "TRAINING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Course Catalog & Verified Badges */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-semibold text-white">Placement Readiness Tracks</h2>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                    BRULE-12 • 30m Timer
                  </span>
                </div>

                <div className="space-y-3">
                  {courses.map((c) => {
                    const completedCount = c.modules.filter((m) => m.completed).length;
                    const earned = badges.some((b) => b.courseCode === c.code);
                    return (
                      <button
                        key={c.id}
                        disabled={isQuizActive}
                        onClick={() => {
                          setActiveCourseId(c.id);
                          setQuizAnswers({});
                          setQuizBanner(null);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition disabled:opacity-50 ${
                          c.id === activeCourse.id
                            ? "bg-indigo-600/15 border-indigo-500/50"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono text-indigo-400">{c.code}</span>
                          {earned ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                              VERIFIED BADGE
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Attempts: {c.attemptsUsed}/{c.maxAttempts}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white mt-1">{c.title}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Modules: {completedCount}/{c.modules.length} completed • Pass:{" "}
                          {c.passThresholdPct}%
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Earned Skill Verification Badges */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-semibold text-white">Verified Skill Credentials</h2>
                </div>

                {badges.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl p-4">
                    Score ≥ 75% on any proctored course assessment to mint a recruiter-verifiable
                    IITM Skill Badge.
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
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Issued {b.issuedAt} • Recruiter Verifiable
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active Course Modules & Proctored Assessment Engine */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-mono text-indigo-400">{activeCourse.code}</span>
                    <h2 className="text-lg font-bold text-white">{activeCourse.title}</h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                    {activeCourse.category}
                  </span>
                </div>

                {!isQuizActive && (
                  <>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-4 mb-2.5">
                      1. Learning Modules (Click to mark complete)
                    </h3>
                    <div className="space-y-2">
                      {activeCourse.modules.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => toggleModuleComplete(activeCourse.id, m.id)}
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
                    Proctored Skill Assessment (Pass ≥ {activeCourse.passThresholdPct}%)
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
                        activeCourse.attemptsUsed >= activeCourse.maxAttempts
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          : "bg-slate-950 text-slate-300 border-slate-800"
                      }`}
                    >
                      Attempts: {activeCourse.attemptsUsed} / {activeCourse.maxAttempts}
                    </span>
                  </div>
                </div>

                {/* Proctoring Guard Notice */}
                <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                  <EyeOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">
                      Strict Proctoring Active (30:00 Max • Zero Tab-Switch Tolerance):
                    </span>{" "}
                    Once started, switching browser tabs or leaving this window immediately
                    terminates and fails your current attempt.
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
                    onClick={handleStartQuiz}
                    disabled={activeCourse.attemptsUsed >= activeCourse.maxAttempts}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    {activeCourse.attemptsUsed >= activeCourse.maxAttempts
                      ? `Maximum Attempts Exhausted (${activeCourse.attemptsUsed}/${activeCourse.maxAttempts})`
                      : `Start 30-Minute Proctored Assessment (Attempt ${
                          activeCourse.attemptsUsed + 1
                        } of ${activeCourse.maxAttempts})`}
                  </button>
                ) : (
                  <form onSubmit={handleSubmitQuiz} className="space-y-4">
                    {activeCourse.questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                      >
                        <p className="text-xs font-semibold text-slate-200">
                          Q{qIdx + 1}. {q.prompt}
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
                                name={`${activeCourse.id}-${q.id}`}
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
                      Submit Assessment & Grade ({formatTimer(secondsLeft)} remaining)
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "GOVERNANCE" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="font-semibold text-white">Immutable Governance & Audit Trail</h2>
                  <p className="text-xs text-slate-400">
                    Append-only ledger capturing IAM, Marksheets, Vault, and Proctoring Violations
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
        )}
      </main>
    </div>
  );
}
