import { useState } from "react";
import {
  Activity,
  Briefcase,
  Plus,
  ShieldCheck,
  Upload,
  UserCheck,
} from "lucide-react";
import type {
  AuditEntry,
  JobDriveItem,
  QuizDomainOption,
  RegistrationApprovalStatus,
  RegistrationRequestRecord,
  Role,
} from "../types/portal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminGovernancePortal({ ctx }: { ctx: any }) {
  const {
    registrations,
    evaluations,
    applications,
    offers,
    handleRegistrationDecision,
    handleAdminDownloadRosterCsv,
    setDriveDocPreview,
    auditLogs,
    jobs,
    adminDirectoryRoleFilter,
    setAdminDirectoryRoleFilter,
    adminDirectorySearch,
    setAdminDirectorySearch,
    adminNewFullName,
    setAdminNewFullName,
    adminNewEmail,
    setAdminNewEmail,
    adminNewRole,
    setAdminNewRole,
    adminNewOrgOrDept,
    setAdminNewOrgOrDept,
    adminNewStatus,
    setAdminNewStatus,
    adminCommandAlert,
    setAdminCommandAlert,
    editingRegId,
    setEditingRegId,
    editRegDraft,
    setEditRegDraft,
    editingJobId,
    setEditingJobId,
    editJobDraft,
    setEditJobDraft,
    handleAdminCreateUser,
    handleAdminStartEditUser,
    handleAdminSaveEditUser,
    handleAdminDeleteUser,
    handleAdminStartEditJob,
    handleAdminSaveEditJob,
    handleAdminDeleteJob,
    setActiveTab,
  } = ctx;

          const [inlinePreviewDoc, setInlinePreviewDoc] = useState<{ title: string; url: string } | null>(null);
  const toEmbedUrl = (rawUrl: string) => {
    const m = rawUrl.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (m && m[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
    const mOpen = rawUrl.match(/drive\.google\.com\/open\?id=([^&#]+)/i);
    if (mOpen && mOpen[1]) return `https://drive.google.com/file/d/${mOpen[1]}/preview`;
    return rawUrl;
  };

  const [studentDossierModal, setStudentDossierModal] = useState<{
    loading: boolean;
    error: string | null;
    reg: RegistrationRequestRecord;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any | null;
  } | null>(null);

  const handleOpenUserDossier = async (reg: RegistrationRequestRecord) => {
    setInlinePreviewDoc(null);
    if (reg.role !== "STUDENT") {
      setStudentDossierModal({ loading: false, error: null, reg, data: { nonStudentRole: reg.role } });
      return;
    }
    setStudentDossierModal({ loading: true, error: null, reg, data: null });
    try {
      const apiBase = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
      let token = "";
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const v = localStorage.getItem(k) || "";
        if (v.startsWith("eyJ")) {
          token = v;
          break;
        }
        if (v.includes("access_token")) {
          try {
            const parsed = JSON.parse(v);
            if (parsed?.access_token) {
              token = parsed.access_token;
              break;
            }
          } catch {
            // ignore non-JSON
          }
        }
      }
      const res = await fetch(`${apiBase}/api/v1/students/admin/${encodeURIComponent(reg.id)}/dossier?email=${encodeURIComponent(reg.email)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Failed to load student dossier (HTTP ${res.status})`);
      }
      const data = await res.json();
      setStudentDossierModal({ loading: false, error: null, reg, data });
    } catch (err) {
      setStudentDossierModal({
        loading: false,
        error: err instanceof Error ? err.message : "Could not fetch student profile from backend",
        reg,
        data: null,
      });
    }
  };

  const studentRegs = registrations.filter((r: RegistrationRequestRecord) => r.role === "STUDENT");
          const recruiterRegs = registrations.filter((r: RegistrationRequestRecord) => r.role === "RECRUITER");
          const examinerRegs = registrations.filter((r: RegistrationRequestRecord) => r.role === "EXAMINER");
          const coordinatorRegs = registrations.filter((r: RegistrationRequestRecord) => r.role === "TRAINING_COORDINATOR");
          const vivaReadyCount = evaluations.filter((e: { isPlacementReady?: boolean }) => e.isPlacementReady).length;

          const qDir = adminDirectorySearch.trim().toLowerCase();
          const filteredDirectory = registrations.filter((r: RegistrationRequestRecord) => {
            if (adminDirectoryRoleFilter !== "ALL" && r.role !== adminDirectoryRoleFilter) return false;
            if (!qDir) return true;
  
  return (

              r.fullName.toLowerCase().includes(qDir) ||
              r.email.toLowerCase().includes(qDir) ||
              r.id.toLowerCase().includes(qDir) ||
              r.orgOrDept.toLowerCase().includes(qDir)
            );
          });

          return (
            <div className="space-y-6">
              {adminCommandAlert && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    adminCommandAlert.type === "OK"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  }`}
                >
                  <span>{adminCommandAlert.text}</span>
                  <button
                    type="button"
                    onClick={() => setAdminCommandAlert(null)}
                    className="text-slate-400 hover:text-white ml-4 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 1. Executive Telemetry Overview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-400" />
                      Placement Admin Executive Command Center
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Platform-wide governance, stakeholder CRUD, direct Examiner &amp; Coordinator execution, and master CSV exports.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("TRAINING")}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition"
                    >
                      Open Examiner &amp; Coordinator Desk →
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("RECRUITMENT")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs font-semibold transition"
                    >
                      Manage Drives &amp; Shortlists →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-[11px] text-slate-400">Students</div>
                    <div className="text-xl font-bold text-white mt-0.5">{studentRegs.length}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-[11px] text-slate-400">Recruiters</div>
                    <div className="text-xl font-bold text-emerald-300 mt-0.5">{recruiterRegs.length}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-[11px] text-slate-400">Examiners</div>
                    <div className="text-xl font-bold text-indigo-300 mt-0.5">{examinerRegs.length}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-[11px] text-slate-400">Coordinators</div>
                    <div className="text-xl font-bold text-cyan-300 mt-0.5">{coordinatorRegs.length}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-[11px] text-slate-400">Open Drives</div>
                    <div className="text-xl font-bold text-amber-300 mt-0.5">{jobs.length}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-[11px] text-slate-400">Applications</div>
                    <div className="text-xl font-bold text-white mt-0.5">{applications.length}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-[11px] text-slate-400">Viva Cleared</div>
                    <div className="text-xl font-bold text-emerald-400 mt-0.5">{vivaReadyCount}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-[11px] text-slate-400">Offers Rolled</div>
                    <div className="text-xl font-bold text-purple-300 mt-0.5">{offers.length}</div>
                  </div>
                </div>

                {/* Role-Segmented Master CSV Data Export Bar */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    Export Stakeholder Directories (Excel-Ready CSV):
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleAdminDownloadRosterCsv("STUDENT")}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition"
                    >
                      Students ({studentRegs.length}) .csv
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDownloadRosterCsv("RECRUITER")}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-emerald-300 font-semibold transition"
                    >
                      Recruiters ({recruiterRegs.length}) .csv
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDownloadRosterCsv("EXAMINER")}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-indigo-300 font-semibold transition"
                    >
                      Examiners ({examinerRegs.length}) .csv
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDownloadRosterCsv("TRAINING_COORDINATOR")}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-semibold transition"
                    >
                      Coordinators ({coordinatorRegs.length}) .csv
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDownloadRosterCsv("ALL")}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                    >
                      Download Complete Master Roster ({registrations.length}) .csv
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Create New Stakeholder Account (Admin CRUD - Create) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  Provision New Stakeholder Account (Create User)
                </h3>
                <form onSubmit={handleAdminCreateUser} className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
                  <input
                    type="text"
                    placeholder="Full Name (e.g., Dr. Kavita Rao)"
                    value={adminNewFullName}
                    onChange={(e) => setAdminNewFullName(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                  <input
                    type="email"
                    placeholder="Email (e.g., kavita@iitm.ac.in)"
                    value={adminNewEmail}
                    onChange={(e) => setAdminNewEmail(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                  <select
                    value={adminNewRole}
                    onChange={(e) => setAdminNewRole(e.target.value as Exclude<Role, "ADMIN">)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="RECRUITER">RECRUITER</option>
                    <option value="EXAMINER">EXAMINER</option>
                    <option value="TRAINING_COORDINATOR">TRAINING_COORDINATOR</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Department / Organization / Track"
                    value={adminNewOrgOrDept}
                    onChange={(e) => setAdminNewOrgOrDept(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                  <select
                    value={adminNewStatus}
                    onChange={(e) => setAdminNewStatus(e.target.value as "APPROVED" | "PENDING" | "REJECTED")}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="APPROVED">APPROVED (Active)</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                  >
                    + Create Account
                  </button>
                </form>
              </div>

              {/* 3. Master Stakeholder Directory & Approval Gate (Read, Update, Approve/Reject, Delete) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h2 className="font-semibold text-white">
                        Master Stakeholder Directory &amp; Approval Gate (Full CRUD)
                      </h2>
                      <p className="text-xs text-slate-400">
                        Inspect profiles, approve/reject registrations, edit roles/departments inline, or remove accounts.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {(["ALL", "STUDENT", "RECRUITER", "EXAMINER", "TRAINING_COORDINATOR"] as const).map((rf) => (
                      <button
                        key={rf}
                        type="button"
                        onClick={() => setAdminDirectoryRoleFilter(rf)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          adminDirectoryRoleFilter === rf
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {rf === "ALL" ? `ALL (${registrations.length})` : rf}
                      </button>
                    ))}
                    <input
                      type="text"
                      value={adminDirectorySearch}
                      onChange={(e) => setAdminDirectorySearch(e.target.value)}
                      placeholder="Filter name, email, org..."
                      className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 w-48"
                    />
                  </div>
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
                        <th className="py-2.5 text-right">Admin CRUD Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {filteredDirectory.map((reg: RegistrationRequestRecord) => {
                        const isEditing = editingRegId === reg.id;
                        return (
                          <tr key={reg.id} className="hover:bg-slate-950/60 align-top">
                            <td className="py-3 pr-3 font-mono text-slate-400">{reg.id}</td>
                            <td className="py-3 pr-3">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    value={editRegDraft.fullName}
                                    onChange={(e) => setEditRegDraft({ ...editRegDraft, fullName: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                                  />
                                  <input
                                    type="email"
                                    value={editRegDraft.email}
                                    onChange={(e) => setEditRegDraft({ ...editRegDraft, email: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-300"
                                  />
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenUserDossier(reg)}
                                    title="Click to view complete profile dossier"
                                    className="text-left font-semibold text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/50 hover:decoration-indigo-300 underline-offset-2 transition cursor-pointer"
                                  >
                                    {reg.fullName}
                                  </button>
                                  <div className="text-[11px] text-slate-400">{reg.email}</div>
                                </>
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              {isEditing ? (
                                <select
                                  value={editRegDraft.role}
                                  onChange={(e) => setEditRegDraft({ ...editRegDraft, role: e.target.value as Exclude<Role, "ADMIN"> })}
                                  className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                                >
                                  <option value="STUDENT">STUDENT</option>
                                  <option value="RECRUITER">RECRUITER</option>
                                  <option value="EXAMINER">EXAMINER</option>
                                  <option value="TRAINING_COORDINATOR">TRAINING_COORDINATOR</option>
                                </select>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold text-[11px]">
                                  {reg.role}
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-3 text-slate-300">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editRegDraft.orgOrDept}
                                  onChange={(e) => setEditRegDraft({ ...editRegDraft, orgOrDept: e.target.value })}
                                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                                />
                              ) : (
                                <div>{reg.orgOrDept}</div>
                              )}
                              {!isEditing && reg.role === "EXAMINER" && reg.examinerProfileDetails && (
                                <div className="mt-2 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-semibold">
                                      {reg.examinerProfileDetails.organization} • {reg.examinerProfileDetails.designation}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                                      {reg.examinerProfileDetails.yearsExperience} yrs exp
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                      {reg.examinerProfileDetails.evaluationDomain}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <a
                                      href={reg.examinerProfileDetails.linkedinUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-semibold"
                                    >
                                      Verify LinkedIn ↗
                                    </a>
                                    {reg.examinerProfileDetails.cvDriveUrl && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDriveDocPreview({
                                            title: `${reg.fullName} — Examiner CV / ID`,
                                            subtitle: `${reg.examinerProfileDetails?.organization} • ${reg.examinerProfileDetails?.designation}`,
                                            url: reg.examinerProfileDetails!.cvDriveUrl!,
                                          })
                                        }
                                        className="px-2.5 py-1 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-[11px] font-semibold"
                                      >
                                        Inline Preview CV / ID
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                              {!isEditing && reg.role === "RECRUITER" && reg.recruiterProfileDetails && (
                                <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-semibold">
                                      {reg.recruiterProfileDetails.companyName} • {reg.recruiterProfileDetails.designation}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-500/30">
                                      HQ: {reg.recruiterProfileDetails.headquartersLocation} • {reg.recruiterProfileDetails.compensationRange}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <a
                                      href={reg.recruiterProfileDetails.linkedinUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-semibold"
                                    >
                                      Verify LinkedIn ↗
                                    </a>
                                    <a
                                      href={reg.recruiterProfileDetails.companyWebsite}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold"
                                    >
                                      Company Website ↗
                                    </a>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              {isEditing ? (
                                <select
                                  value={editRegDraft.status}
                                  onChange={(e) =>
                                    setEditRegDraft({
                                      ...editRegDraft,
                                      status: e.target.value as RegistrationApprovalStatus,
                                    })
                                  }
                                  className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                                >
                                  <option value="APPROVED">APPROVED</option>
                                  <option value="PENDING">PENDING</option>
                                  <option value="REJECTED">REJECTED</option>
                                </select>
                              ) : (
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
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminSaveEditUser(reg.id)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingRegId(null)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px]"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {reg.role === "STUDENT" && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenUserDossier(reg)}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 font-semibold text-[11px] transition"
                                      >
                                        Full Profile
                                      </button>
                                    )}
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
                                        className="px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-semibold text-[11px] transition"
                                      >
                                        Reject
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleAdminStartEditUser(reg)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] transition"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminDeleteUser(reg)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-semibold text-[11px] transition"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Master Job Drives Oversight & CRUD */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-emerald-400" />
                      Master Recruitment Drives Registry (Edit / Remove Any Drive)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Modify compensation, minimum CGPA, target domain, or remove drives across all recruiters.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("RECRUITMENT")}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                  >
                    + Publish New Drive
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-3">Code</th>
                        <th className="py-2 pr-3">Company &amp; Role</th>
                        <th className="py-2 pr-3">Domain &amp; Track</th>
                        <th className="py-2 pr-3">Compensation</th>
                        <th className="py-2 pr-3">Min CGPA</th>
                        <th className="py-2 text-right">Drive CRUD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {jobs.map((job: JobDriveItem) => {
                        const isJobEditing = editingJobId === job.id;
                        return (
                          <tr key={job.id} className="hover:bg-slate-950/60">
                            <td className="py-2.5 pr-3 font-mono text-indigo-400">{job.jobCode}</td>
                            <td className="py-2.5 pr-3">
                              {isJobEditing ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={editJobDraft.companyName}
                                    onChange={(e) => setEditJobDraft({ ...editJobDraft, companyName: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                                  />
                                  <input
                                    type="text"
                                    value={editJobDraft.title}
                                    onChange={(e) => setEditJobDraft({ ...editJobDraft, title: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-300"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="font-semibold text-white">{job.companyName}</div>
                                  <div className="text-[11px] text-slate-400">{job.title}</div>
                                </>
                              )}
                            </td>
                            <td className="py-2.5 pr-3">
                              {isJobEditing ? (
                                <div className="space-y-1">
                                  <select
                                    value={editJobDraft.domain}
                                    onChange={(e) =>
                                      setEditJobDraft({ ...editJobDraft, domain: e.target.value as QuizDomainOption })
                                    }
                                    className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                                  >
                                    <option value="DATA_SCIENCE">DATA_SCIENCE</option>
                                    <option value="SOFTWARE_DEVELOPMENT">SOFTWARE_DEVELOPMENT</option>
                                  </select>
                                  <select
                                    value={editJobDraft.roleType}
                                    onChange={(e) =>
                                      setEditJobDraft({
                                        ...editJobDraft,
                                        roleType: e.target.value as "INTERNSHIP" | "FULL_TIME",
                                      })
                                    }
                                    className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                                  >
                                    <option value="INTERNSHIP">INTERNSHIP</option>
                                    <option value="FULL_TIME">FULL_TIME</option>
                                  </select>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px]">
                                    {job.domain}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[11px]">
                                    {job.roleType}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 pr-3 text-emerald-300 font-semibold">
                              {isJobEditing ? (
                                <input
                                  type="text"
                                  value={editJobDraft.compensation}
                                  onChange={(e) => setEditJobDraft({ ...editJobDraft, compensation: e.target.value })}
                                  className="w-32 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                                />
                              ) : (
                                job.compensation
                              )}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-200">
                              {isJobEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editJobDraft.minCgpa}
                                  onChange={(e) => setEditJobDraft({ ...editJobDraft, minCgpa: e.target.value })}
                                  className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                                />
                              ) : (
                                job.minCgpa.toFixed(2)
                              )}
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {isJobEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminSaveEditJob(job.id)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingJobId(null)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-semibold text-[11px]"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminStartEditJob(job)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px]"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminDeleteJob(job)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-semibold text-[11px]"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Immutable Governance & Audit Ledger */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-400" />
                      Immutable Governance &amp; Audit Trail
                    </h2>
                    <p className="text-xs text-slate-400">
                      Append-only ledger capturing Registration, Assessments, Examiner Evaluations &amp; Recruitment Eligibility Decisions
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
                    {auditLogs.length} Events
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-3">ID / Time</th>
                        <th className="py-2 pr-3">Actor &amp; Role</th>
                        <th className="py-2 pr-3">Action &amp; Details</th>
                        <th className="py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {auditLogs.map((log: AuditEntry) => (
                        <tr key={log.id} className="hover:bg-slate-950/60">
                          <td className="py-2.5 pr-3 font-mono text-slate-400">
                            <div>{log.id}</div>
                            <div className="text-[11px] text-slate-500">{log.timestamp}</div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="font-semibold text-slate-200">{log.actor}</div>
                            <div className="text-[11px] text-indigo-400">{log.role}</div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="font-semibold text-slate-100">{log.action}</div>
                            <div className="text-[11px] text-slate-400">{log.resource}</div>
                          </td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                log.status === "BLOCKED"
                                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Student Complete Dossier Modal (Scorecard, Profile, Skills & Resumes) */}
              {studentDossierModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-white">
                            {studentDossierModal.reg.fullName}
                          </h3>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-[11px] font-semibold">
                            {studentDossierModal.reg.role} DOSSIER
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              studentDossierModal.reg.status === "APPROVED"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {studentDossierModal.reg.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {studentDossierModal.reg.email} • ID: {studentDossierModal.reg.id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStudentDossierModal(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                      >
                        Close ✕
                      </button>
                    </div>

                    {studentDossierModal.loading && (
                      <div className="py-10 text-center text-xs text-slate-300">
                        Loading student academic scorecard, profile, and resumes...
                      </div>
                    )}

                    {studentDossierModal.error && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                        {studentDossierModal.error}
                      </div>
                    )}

                    {studentDossierModal.data && studentDossierModal.reg.role !== "STUDENT" && (() => {
                      const r = studentDossierModal.reg;
                      const rec = r.recruiterProfileDetails;
                      const exa = r.examinerProfileDetails;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const postedDrives = jobs.filter((j: any) => j.recruiterEmail?.toLowerCase() === r.email.toLowerCase());
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const conductedEvals = evaluations.filter((ev: any) => ev.examinerEmail?.toLowerCase() === r.email.toLowerCase() || ev.examinerName === r.fullName);

                      return (
                        <div className="space-y-4 text-xs">
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                              1. Account &amp; Institutional Overview
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                <div className="text-[10px] text-slate-400">Role</div>
                                <div className="text-sm font-bold text-indigo-300 mt-0.5">{r.role}</div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                <div className="text-[10px] text-slate-400">Department / Organization</div>
                                <div className="text-xs font-semibold text-white mt-0.5">{r.orgOrDept || "—"}</div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                <div className="text-[10px] text-slate-400">Submitted / Registered</div>
                                <div className="text-xs font-semibold text-slate-200 mt-0.5">{r.submittedAt || "Active"}</div>
                              </div>
                            </div>
                          </div>

                          {r.role === "RECRUITER" && (
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                                2. Corporate Recruiter Profile &amp; Drives ({postedDrives.length})
                              </h4>
                              {rec ? (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                                    <div><span className="text-slate-400">Company:</span> <span className="text-slate-100 font-semibold">{rec.companyName}</span></div>
                                    <div><span className="text-slate-400">Designation:</span> <span className="text-slate-200">{rec.designation}</span></div>
                                    <div><span className="text-slate-400">Headquarters:</span> <span className="text-slate-200">{rec.headquartersLocation}</span></div>
                                    <div><span className="text-slate-400">Compensation Range:</span> <span className="text-emerald-300 font-semibold">{rec.compensationRange}</span></div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {rec.linkedinUrl && (
                                      <a href={rec.linkedinUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-semibold">
                                        Verify LinkedIn ↗
                                      </a>
                                    )}
                                    {rec.companyWebsite && (
                                      <a href={rec.companyWebsite} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                                        Company Website ↗
                                      </a>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="text-slate-400">No extended corporate metadata attached yet.</div>
                              )}
                            </div>
                          )}

                          {r.role === "EXAMINER" && (
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                                2. Examiner Credentials &amp; Evaluations ({conductedEvals.length})
                              </h4>
                              {exa ? (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                                    <div><span className="text-slate-400">Organization:</span> <span className="text-slate-100 font-semibold">{exa.organization}</span></div>
                                    <div><span className="text-slate-400">Designation:</span> <span className="text-slate-200">{exa.designation}</span></div>
                                    <div><span className="text-slate-400">Experience:</span> <span className="text-slate-200">{exa.yearsExperience} years</span></div>
                                    <div><span className="text-slate-400">Evaluation Domain:</span> <span className="text-emerald-300 font-semibold">{exa.evaluationDomain}</span></div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {exa.linkedinUrl && (
                                      <a href={exa.linkedinUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-semibold">
                                        Verify LinkedIn ↗
                                      </a>
                                    )}
                                    {exa.cvDriveUrl && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDriveDocPreview({
                                            title: `${r.fullName} — Examiner CV / Credentials`,
                                            subtitle: `${exa.organization} • ${exa.designation}`,
                                            url: exa.cvDriveUrl!,
                                          })
                                        }
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold"
                                      >
                                        Preview Examiner CV / ID
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="text-slate-400">No extended examiner credentials attached yet.</div>
                              )}
                            </div>
                          )}

                          {r.role === "TRAINING_COORDINATOR" && (
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                                2. Training Coordinator Governance Scope
                              </h4>
                              <p className="text-slate-300">
                                Authorized to publish readiness courses, track student cohort attendance, and certify placement readiness across IITM BS tracks.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {studentDossierModal.data && studentDossierModal.reg.role === "STUDENT" && (() => {
                      const d = studentDossierModal.data;
                      const p = d.profile || {};
                      const matchedEvals = evaluations.filter(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (ev: any) =>
                          ev.studentEmail?.toLowerCase() === d.email?.toLowerCase() ||
                          ev.studentId === d.student_id
                      );
                      return (
                        <div className="space-y-5 text-xs">
                          {/* Academic Scorecard Summary */}
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                                1. Academic Scorecard &amp; Standing
                              </h4>
                              {p.marksheet_drive_url || p.marksheet_file_name ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  {p.marksheet_drive_url && (
                                    <a
                                      href={p.marksheet_drive_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold text-[11px]"
                                    >
                                      Open Scorecard Drive Link ↗
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const targetUrl =
                                        p.marksheet_drive_url ||
                                        `https://drive.iitm.ac.in/scorecards/${encodeURIComponent(p.marksheet_file_name)}`;
                                      setInlinePreviewDoc(
                                        inlinePreviewDoc?.url === targetUrl
                                          ? null
                                          : { title: `${d.full_name} — Official BS Scorecard`, url: targetUrl }
                                      );
                                    }}
                                    className="px-3 py-1 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 font-semibold text-[11px]"
                                  >
                                    {inlinePreviewDoc?.title === `${d.full_name} — Official BS Scorecard`
                                      ? "Hide Inline Preview"
                                      : "Inline Preview Scorecard"}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-amber-300">
                                  No BS Scorecard Drive link saved yet
                                </span>
                              )}
                            </div>
                            {p.marksheet_drive_url && (
                              <div className="px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-slate-400 shrink-0">Scorecard Drive URL:</span>
                                <a
                                  href={p.marksheet_drive_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-300 hover:text-sky-200 underline truncate font-mono"
                                >
                                  {p.marksheet_drive_url}
                                </a>
                              </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                <div className="text-[10px] text-slate-400">CGPA</div>
                                <div className="text-base font-bold text-emerald-300 mt-0.5">{d.cgpa} / 10.0</div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                <div className="text-[10px] text-slate-400">Roll Number</div>
                                <div className="text-sm font-semibold text-white mt-0.5 font-mono">{d.roll_number}</div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                <div className="text-[10px] text-slate-400">Program &amp; Level</div>
                                <div className="text-xs font-semibold text-indigo-200 mt-0.5">
                                  {d.program} • {d.current_level}
                                </div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                <div className="text-[10px] text-slate-400">Standing / Backlogs</div>
                                <div className="text-xs font-semibold text-slate-200 mt-0.5">
                                  {d.academic_standing} ({d.active_backlogs} backlogs)
                                </div>
                              </div>
                            </div>

                            {matchedEvals.length > 0 && (
                              <div className="pt-2 border-t border-slate-800/80">
                                <div className="text-[11px] font-semibold text-indigo-300 mb-1.5">
                                  Examiner Assessment &amp; Viva Scorecards ({matchedEvals.length})
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {matchedEvals.map((ev: any, idx: number) => (
                                    <div key={ev.id || idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                                      <div>
                                        <div className="font-semibold text-slate-100">{ev.domain || "Technical Assessment"}</div>
                                        <div className="text-[10px] text-slate-400">Examiner: {ev.examinerName || "Panel"}</div>
                                      </div>
                                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                        {ev.score ?? ev.vivaScore ?? "Cleared"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Uploaded Resumes */}
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                              2. Uploaded Resumes ({(d.resumes || []).length} Active)
                            </h4>
                            {(d.resumes || []).length === 0 ? (
                              <div className="text-slate-400 text-xs">
                                Student has not uploaded any resumes yet.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {d.resumes.map((r: any) => (
                                  <div
                                    key={r.id}
                                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2"
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                                        <span>{r.label}</span>
                                        {r.is_default && (
                                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                                            DEFAULT RESUME
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        File: {r.file_name} • {r.file_size_label || `${Math.max(1, Math.round((r.file_size_bytes || 0) / 1024))} KB`}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {r.drive_url && (
                                        <a
                                          href={r.drive_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold text-[11px]"
                                        >
                                          Open Drive Link ↗
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const targetUrl =
                                            r.drive_url ||
                                            `https://drive.iitm.ac.in/resumes/${encodeURIComponent(r.file_name)}`;
                                          setInlinePreviewDoc(
                                            inlinePreviewDoc?.url === targetUrl
                                              ? null
                                              : { title: `${d.full_name} — ${r.label}`, url: targetUrl }
                                          );
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px]"
                                      >
                                        {inlinePreviewDoc?.title === `${d.full_name} — ${r.label}`
                                          ? "Hide Inline Preview"
                                          : "Inline Preview"}
                                      </button>
                                    </div>
                                    {r.drive_url && (
                                      <div className="w-full pt-1.5 mt-1 border-t border-slate-800/80 flex items-center gap-2 text-[11px]">
                                        <span className="text-slate-400 shrink-0">Drive URL:</span>
                                        <a
                                          href={r.drive_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-sky-300 hover:text-sky-200 underline truncate font-mono"
                                        >
                                          {r.drive_url}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {inlinePreviewDoc && (
                              <div className="mt-3 rounded-xl border border-indigo-500/40 bg-slate-900 overflow-hidden">
                                <div className="px-3.5 py-2 bg-indigo-950/60 border-b border-indigo-500/30 flex items-center justify-between gap-2">
                                  <span className="font-semibold text-indigo-200 text-[11px] truncate">
                                    Inline Document Viewer: {inlinePreviewDoc.title}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={inlinePreviewDoc.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 text-[10px] font-semibold"
                                    >
                                      Pop Out ↗
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => setInlinePreviewDoc(null)}
                                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold"
                                    >
                                      Close Viewer ✕
                                    </button>
                                  </div>
                                </div>
                                <iframe
                                  src={toEmbedUrl(inlinePreviewDoc.url)}
                                  title={inlinePreviewDoc.title}
                                  className="w-full h-[460px] bg-white"
                                  allow="autoplay"
                                />
                              </div>
                            )}
                          </div>

                          {/* Personal, Professional & Links */}
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                              3. Personal Details, Skills &amp; Portfolio Links
                            </h4>
                            {p.headline && <div className="text-slate-200 font-semibold">{p.headline}</div>}
                            {p.bio && <p className="text-slate-400 leading-relaxed">{p.bio}</p>}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                              <div><span className="text-slate-400">Personal Email:</span> <span className="text-slate-200">{p.personal_email || "—"}</span></div>
                              <div><span className="text-slate-400">Mobile:</span> <span className="text-slate-200">{p.phone || "—"}</span></div>
                              <div><span className="text-slate-400">Location:</span> <span className="text-slate-200">{[p.city, p.state].filter(Boolean).join(", ") || "—"}</span></div>
                              <div><span className="text-slate-400">Category:</span> <span className="text-slate-200">{p.category || "GENERAL"}</span></div>
                              <div><span className="text-slate-400">Degree Type:</span> <span className="text-slate-200">{d.degree_type}</span></div>
                              <div><span className="text-slate-400">Preferred Roles:</span> <span className="text-slate-200">{p.preferred_roles || "—"}</span></div>
                            </div>

                            {p.is_working_professional && (
                              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                                Working Professional: {p.present_company} ({p.work_domain}) • {p.years_of_experience} yrs • {p.work_location} • Current CTC: ₹{p.current_ctc_lpa} LPA
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-1">
                              {p.github_url && (
                                <a href={p.github_url} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold">
                                  GitHub ↗
                                </a>
                              )}
                              {p.linkedin_url && (
                                <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-semibold">
                                  LinkedIn ↗
                                </a>
                              )}
                              {p.kaggle_url && (
                                <a href={p.kaggle_url} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold">
                                  Kaggle ↗
                                </a>
                              )}
                              {p.portfolio_url && (
                                <a href={p.portfolio_url} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                                  Portfolio ↗
                                </a>
                              )}
                            </div>

                            {(d.skills || []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {d.skills.map((s: any) => (
                                  <span
                                    key={s.id}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] border ${
                                      s.is_verified
                                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                                        : "bg-slate-900 border-slate-700 text-slate-300"
                                    }`}
                                  >
                                    {s.skill_name} ({s.proficiency}){s.is_verified ? " ✓" : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 4. 1-on-1 Viva & Examiner Evaluation Outcomes */}
                          {(() => {
                            const rollPrefix = (d.email || "").split("@")[0].toLowerCase();
                            const nameLower = (d.full_name || "").toLowerCase();
                            const studentEvals = (evaluations || []).filter((ev: any) => {
                              const target = String(ev.studentRoll || "").toLowerCase();
                              return (
                                (rollPrefix && target.includes(rollPrefix)) ||
                                (nameLower && target.includes(nameLower)) ||
                                (d.email && target.includes(d.email.toLowerCase()))
                              );
                            });
                            return (
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                                    4. 1-on-1 Viva &amp; Examiner Evaluation Outcomes ({studentEvals.length})
                                  </h4>
                                  <span className="text-[11px] text-indigo-300">Stage 3 Vetting Record</span>
                                </div>
                                {studentEvals.length === 0 ? (
                                  <div className="text-xs text-slate-400">
                                    No 1-on-1 Examiner Viva evaluations recorded for this candidate yet.
                                  </div>
                                ) : (
                                  <div className="space-y-2.5">
                                    {studentEvals.map((ev: any) => (
                                      <div
                                        key={ev.id}
                                        className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                ev.isPlacementReady
                                                  ? "bg-emerald-500/20 text-emerald-300"
                                                  : "bg-amber-500/20 text-amber-300"
                                              }`}
                                            >
                                              {ev.isPlacementReady ? "PLACEMENT READY" : "NOT READY"}
                                            </span>
                                            {ev.performingExceptionallyGood && (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold">
                                                EXCEPTIONALLY GOOD
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[11px] text-slate-400">{ev.evaluatedAt}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                            <span className="text-slate-400 block">Programming</span>
                                            <span className="font-bold text-white">{ev.programmingRating} / 5</span>
                                          </div>
                                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                            <span className="text-slate-400 block">Data Science</span>
                                            <span className="font-bold text-white">{ev.dataScienceRating} / 5</span>
                                          </div>
                                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                            <span className="text-slate-400 block">Communication</span>
                                            <span className="font-bold text-white">{ev.communicationRating} / 5</span>
                                          </div>
                                        </div>
                                        <div className="text-[11px]">
                                          <span className="text-slate-400">Observed Skillsets: </span>
                                          <span className="text-slate-200">{(ev.skillsets || []).join(", ")}</span>
                                        </div>
                                        {ev.notes && (
                                          <div className="text-[11px] text-slate-300">
                                            <span className="text-slate-400">Examiner Remarks: </span>
                                            {ev.notes}
                                          </div>
                                        )}
                                        {ev.examinerEmail && (
                                          <div className="text-[10px] text-slate-500 font-mono">
                                            Examiner: {ev.examinerEmail}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Examiner 1-on-1 Viva Evaluations Audit Summary */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Recorded Examiner 1-on-1 Viva Evaluations ({(evaluations || []).length})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Stage 3 1-on-1 Viva readiness verdicts, competency ratings, and examiner notes synced from Examiner Console.
                    </p>
                  </div>
                </div>
                {(evaluations || []).length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                    No 1-on-1 Examiner Viva evaluations recorded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(evaluations || []).map((ev: any) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80">
                          <span className="font-bold text-white">{ev.studentRoll}</span>
                          <span className="text-[11px] text-slate-400">{ev.evaluatedAt}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              ev.isPlacementReady
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {ev.isPlacementReady ? "PLACEMENT READY" : "NOT READY"}
                          </span>
                          {ev.performingExceptionallyGood && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold">
                              EXCEPTIONALLY GOOD
                            </span>
                          )}
                          {ev.examinerEmail && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              by {ev.examinerEmail}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block">Programming</span>
                            <span className="font-bold text-white">{ev.programmingRating} / 5</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block">Data Science</span>
                            <span className="font-bold text-white">{ev.dataScienceRating} / 5</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block">Communication</span>
                            <span className="font-bold text-white">{ev.communicationRating} / 5</span>
                          </div>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-slate-400">Skillsets: </span>
                          <span className="text-slate-200">{(ev.skillsets || []).join(", ")}</span>
                        </div>
                        {ev.notes && (
                          <div className="text-[11px] text-slate-300">
                            <span className="text-slate-400">Remarks: </span>
                            {ev.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

  );
}
