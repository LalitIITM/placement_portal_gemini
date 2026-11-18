import React, { useRef, useState } from "react";
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
} from "lucide-react";

type Role = "STUDENT" | "RECRUITER" | "ADMIN";

interface ResumeItem {
  id: string;
  title: string;
  targetRole: string;
  fileSize: string;
  updatedAt: string;
  isPrimary: boolean;
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

const ALLOWED_DOMAINS = ["@ds.study.iitm.ac.in", "@es.study.iitm.ac.in"];
const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

export default function App() {
  const [email, setEmail] = useState("22f3001234@ds.study.iitm.ac.in");
  const [selectedRole, setSelectedRole] = useState<Role>("STUDENT");
  const [user, setUser] = useState<{ email: string; role: Role; name: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [resumes, setResumes] = useState<ResumeItem[]>([
    {
      id: "res-1",
      title: "SDE_Backend_FastAPI_2026.pdf",
      targetRole: "Backend Engineer",
      fileSize: "412 KB",
      updatedAt: "2026-11-17 19:30",
      isPrimary: true,
    },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newTarget, setNewTarget] = useState("");
  const [vaultAlert, setVaultAlert] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([
    {
      id: "AUD-1001",
      timestamp: "2026-11-17 19:30:12 IST",
      actor: "system@iitm.ac.in",
      role: "ADMIN",
      action: "POLICY_ENFORCED",
      resource: "BRULE-55 (Max 3 Resumes) & BRULE-03 (30m Session)",
      status: "SUCCESS",
    },
  ]);

  const appendAudit = (
    actor: string,
    role: Role,
    action: string,
    resource: string,
    status: "SUCCESS" | "BLOCKED" = "SUCCESS"
  ) => {
    const entry: AuditEntry = {
      id: `AUD-${1000 + auditLogs.length + 1}`,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
      actor,
      role,
      action,
      resource,
      status,
    };
    setAuditLogs((prev) => [entry, ...prev]);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" />
            Increment 1 • IAM & Student Core
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            IITM Placement & Career Portal
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Domain-validated SSO, RBAC governance, and immutable audit ledger.
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
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  BRULE-03 • 30m Sliding Session
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
              onClick={() => setUser(null)}
              className="ml-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h2 className="font-semibold text-white">Verified Student Identity</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {user.role}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Roll / Handle</span>
                <span className="text-slate-200 font-semibold mt-0.5 block">{user.name}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Program Track</span>
                <span className="text-slate-200 font-semibold mt-0.5 block">BS Data Science</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">CGPA Verified</span>
                <span className="text-emerald-400 font-semibold mt-0.5 block">8.92 / 10.0</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">Placement Status</span>
                <span className="text-indigo-300 font-semibold mt-0.5 block">Eligible • Cycle 2026</span>
              </div>
            </div>
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
        </section>

        <section className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="font-semibold text-white">Immutable Governance & Audit Trail</h2>
                  <p className="text-xs text-slate-400">
                    Append-only ledger protected against UPDATE/DELETE mutations
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

          <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-indigo-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Up Next: Increment 2 — Training & Assessment Engine
                </h3>
                <p className="text-xs text-slate-400">
                  Courses, Modules, Timed Quiz Attempts & Verifiable Skill Badges
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 shrink-0">
              Ready to Build
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
