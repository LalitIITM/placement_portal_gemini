from pathlib import Path

# 1. Add examinerSlots to App.tsx PostgreSQL snapshot sync useEffect dependencies
app_p = Path("frontend/src/App.tsx")
atxt = app_p.read_text(encoding="utf-8")

old_deps = """    evaluations,
    oneOnOneSlots,
    auditLogs,"""
new_deps = """    evaluations,
    oneOnOneSlots,
    examinerSlots,
    auditLogs,"""
assert old_deps in atxt, "old_deps not found in App.tsx"
atxt = atxt.replace(old_deps, new_deps, 1)
app_p.write_text(atxt, encoding="utf-8")
print("1/2 Added examinerSlots to PostgreSQL snapshot sync dependencies in App.tsx")

# 2. Scope Recorded Examiner Viva Evaluations to the logged-in student when user.role === "STUDENT"
tv_p = Path("frontend/src/components/TrainingAndVettingPortal.tsx")
ttxt = tv_p.read_text(encoding="utf-8")

old_eval_block = """                <div className="lg:col-span-6 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recorded Examiner Viva Evaluations ({evaluations.length})
                  </h3>

                  {evaluations.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                      No final-stage examiner interview evaluations recorded yet.
                    </div>
                  ) : (
                    evaluations.map((ev: any) => ("""

new_eval_block = """                <div className="lg:col-span-6 space-y-3">
                  {(() => {
                    const activeRoll = resolveActiveStudentRoll();
                    const myEmailLower = user.email.trim().toLowerCase();
                    const visibleEvaluations =
                      user.role === "STUDENT"
                        ? evaluations.filter(
                            (ev: any) =>
                              (ev.studentEmail || "").trim().toLowerCase() === myEmailLower ||
                              (ev.rollNumber || "").trim().toUpperCase() === activeRoll.toUpperCase()
                          )
                        : evaluations;

                    return (
                      <>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {user.role === "STUDENT"
                            ? `Your Recorded Examiner Viva Evaluations (${visibleEvaluations.length})`
                            : `Recorded Examiner Viva Evaluations (${visibleEvaluations.length})`}
                        </h3>

                        {visibleEvaluations.length === 0 ? (
                          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                            {user.role === "STUDENT"
                              ? "No 1-on-1 Viva evaluations recorded for your account yet."
                              : "No final-stage examiner interview evaluations recorded yet."}
                          </div>
                        ) : (
                          visibleEvaluations.map((ev: any) => ("""

assert old_eval_block in ttxt, "old_eval_block not found in TrainingAndVettingPortal.tsx"
ttxt = ttxt.replace(old_eval_block, new_eval_block, 1)

# Close the IIFE right after the evaluations.map(...) closing )}
idx_start = ttxt.index("Your Recorded Examiner Viva Evaluations")
idx_map_end = ttxt.index("                  ))}\n                </div>", idx_start)
ttxt = (
    ttxt[:idx_map_end]
    + "                        ))}\n                      </>\n                    );\n                  })()}\n                </div>"
    + ttxt[idx_map_end + len("                  ))}\n                </div>"):]
)

tv_p.write_text(ttxt, encoding="utf-8")
print("2/2 Scoped Recorded Examiner Viva Evaluations per student in TrainingAndVettingPortal.tsx")
