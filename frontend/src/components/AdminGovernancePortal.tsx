import * as XLSX from "xlsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminGovernancePortal({ ctx }: { ctx: any }) {
  const {
    user,
    registrations,
    regFilter,
    setRegFilter,
    handleRegistrationDecision,
    auditLogs,
    jobs,
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
    adminUserSearch,
    setAdminUserSearch,
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
    handleExportUsersCsv,
    handleExportJobsCsv,
    handleExportAuditCsv,
    setActiveTab,
  } = ctx;

  return (
    <>
          const studentRegs = registrations.filter((r) => r.role === "STUDENT");
          const recruiterRegs = registrations.filter((r) => r.role === "RECRUITER");
          const examinerRegs = registrations.filter((r) => r.role === "EXAMINER");
          const coordinatorRegs = registrations.filter((r) => r.role === "TRAINING_COORDINATOR");
          const vivaReadyCount = evaluations.filter((e) => e.isPlacementReady).length;

          const qDir = adminDirectorySearch.trim().toLowerCase();
          const filteredDirectory = registrations.filter((r) => {
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
                      {filteredDirectory.map((reg) => {
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
                                  <div className="font-semibold text-slate-100">{reg.fullName}</div>
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
                      {jobs.map((job) => {
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
                      {auditLogs.map((log) => (
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
            </div>
          );
    </>
  );
}
