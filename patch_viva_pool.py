from pathlib import Path

# 1. Patch App.tsx
app_p = Path("frontend/src/App.tsx")
atxt = app_p.read_text(encoding="utf-8")

target_state = "const [oneOnOneSlots, setOneOnOneSlots] = useState<OneOnOneSlotRecord[]>(INITIAL_ONE_ON_ONE_SLOTS);"
assert target_state in atxt, "oneOnOneSlots state not found in App.tsx"
new_state = target_state + """
  const [examinerSlots, setExaminerSlots] = useState<
    Array<{
      id: string;
      instructor: string;
      instructorEmail: string;
      date: string;
      slotTime: string;
      domain: string;
      status: "OPEN" | "REQUESTED" | "ALLOTTED";
      requestedByEmail?: string;
      requestedByName?: string;
    }>
  >([]);"""
atxt = atxt.replace(target_state, new_state, 1)

target_boot = """        if (Array.isArray(snap.oneOnOneSlots) && snap.oneOnOneSlots.length > 0) {
          setOneOnOneSlots(snap.oneOnOneSlots);
        }"""
assert target_boot in atxt, "snap.oneOnOneSlots hydrate not found"
new_boot = target_boot + """
        if (Array.isArray(snap.examinerSlots)) {
          setExaminerSlots(snap.examinerSlots);
        }"""
atxt = atxt.replace(target_boot, new_boot, 1)

target_sync = """              evaluations,
              oneOnOneSlots,
              auditLogs,"""
assert target_sync in atxt, "snapshot sync block not found"
new_sync = """              evaluations,
              oneOnOneSlots,
              examinerSlots,
              auditLogs,"""
atxt = atxt.replace(target_sync, new_sync, 1)

atxt = atxt.replace(
    "oneOnOneSlots, auditLogs, interviews, offers",
    "oneOnOneSlots, examinerSlots, auditLogs, interviews, offers",
)

target_ctx = "activePoolSize, activeTrack,"
assert target_ctx in atxt, "TrainingAndVettingPortal ctx not found"
new_ctx = "activePoolSize, activeTrack, examinerSlots, setExaminerSlots, registrations, ingestParsedSlotRows,"
atxt = atxt.replace(target_ctx, new_ctx, 1)

app_p.write_text(atxt, encoding="utf-8")
print("1/2 Patched App.tsx")

# 2. Patch TrainingAndVettingPortal.tsx
tv_p = Path("frontend/src/components/TrainingAndVettingPortal.tsx")
ttxt = tv_p.read_text(encoding="utf-8")

target_destr = "    activePoolSize,\n    activeTrack,"
assert target_destr in ttxt, "ctx destructuring not found"
new_destr = """    activePoolSize,
    activeTrack,
    examinerSlots = [],
    setExaminerSlots,
    registrations = [],
    ingestParsedSlotRows,"""
ttxt = ttxt.replace(target_destr, new_destr, 1)

anchor_local = "  const { user } = ctx;"
assert anchor_local in ttxt, "const { user } = ctx not found"
local_helpers = """  const { user } = ctx;
  const [exPoolText, setExPoolText] = useState("");
  const [exPoolInstructor, setExPoolInstructor] = useState("");
  const [exPoolDate, setExPoolDate] = useState("");
  const [exPoolTime, setExPoolTime] = useState("");
  const [exPoolDomain] = useState("Data Science");
  const [exPoolAlert, setExPoolAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  const approvedExaminers = registrations.filter(
    (r: any) => r.role === "EXAMINER" && r.status === "APPROVED"
  );
  const approvedStudents = registrations.filter(
    (r: any) => r.role === "STUDENT" && r.status === "APPROVED"
  );

  const handleImportExaminerPoolRows = (rawText: string) => {
    const lines = rawText
      .split(/\\r?\\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const startIdx =
      lines[0].toLowerCase().includes("date") || lines[0].toLowerCase().includes("instructor") ? 1 : 0;
    const added: any[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      if (cols.length < 3) continue;
      const looksLikeDate2 = /^\\d{4}-\\d{2}-\\d{2}$/.test(cols[1]);
      const instructor = cols[0];
      const instructorEmail = looksLikeDate2 ? "" : cols[1];
      const date = looksLikeDate2 ? cols[1] : cols[2];
      const slotTime = looksLikeDate2 ? cols[2] : cols[3] || "10:00 AM - 10:30 AM IST";
      const domain = (looksLikeDate2 ? cols[3] : cols[4]) || "Data Science";
      if (!instructor || !date || !slotTime) continue;
      added.push({
        id: `EXPOOL-${Date.now()}-${i}`,
        instructor,
        instructorEmail,
        date,
        slotTime,
        domain,
        status: "OPEN" as const,
      });
    }
    if (added.length === 0) {
      setExPoolAlert({
        type: "ERR",
        text: "No valid rows found. Format: Instructor, Date (YYYY-MM-DD), Slot Time, Domain",
      });
      return;
    }
    setExaminerSlots((prev: any[]) => [...prev, ...added]);
    setExPoolAlert({
      type: "OK",
      text: `Published ${added.length} Examiner availability slot(s) for students to pick.`,
    });
  };

  const handleStudentPickSingleSlot = (slotId: string) => {
    const myEmail = user.email.trim().toLowerCase();
    const alreadyPicked = examinerSlots.find(
      (s: any) =>
        (s.requestedByEmail || "").toLowerCase() === myEmail &&
        (s.status === "REQUESTED" || s.status === "ALLOTTED")
    );
    if (alreadyPicked) return;
    const myReg = approvedStudents.find((r: any) => r.email.toLowerCase() === myEmail);
    const myName = myReg?.fullName || myEmail.split("@")[0].toUpperCase();
    setExaminerSlots((prev: any[]) =>
      prev.map((s: any) =>
        s.id === slotId && s.status === "OPEN"
          ? { ...s, status: "REQUESTED", requestedByEmail: user.email, requestedByName: myName }
          : s
      )
    );
  };

  const handleCoordinatorAllotFromPool = (poolSlot: any) => {
    if (!poolSlot.requestedByEmail) return;
    if (typeof ingestParsedSlotRows === "function") {
      ingestParsedSlotRows(
        [
          {
            Email: poolSlot.requestedByEmail,
            "Student Name": poolSlot.requestedByName || poolSlot.requestedByEmail.split("@")[0].toUpperCase(),
            Date: poolSlot.date,
            "Slot Time": poolSlot.slotTime,
            Instructor: poolSlot.instructor,
          },
        ],
        "Examiner Pool Allotment"
      );
    }
    setExaminerSlots((prev: any[]) =>
      prev.map((s: any) => (s.id === poolSlot.id ? { ...s, status: "ALLOTTED" } : s))
    );
    setExPoolAlert({
      type: "OK",
      text: `Allotted ${poolSlot.date} (${poolSlot.slotTime}) with ${poolSlot.instructor} to ${poolSlot.requestedByName || poolSlot.requestedByEmail}.`,
    });
  };"""
ttxt = ttxt.replace(anchor_local, local_helpers, 1)

old_no_slot = """                  {!latestSlot ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                      No 1-on-1 Viva slot has been uploaded for <span className="text-slate-200 font-mono">{user.email}</span> yet. Once the Training Coordinator publishes the slot sheet, your Date, Slot Time, and Instructor will appear here.
                    </div>
                  ) : ("""

new_no_slot = """                  {!latestSlot ? (() => {
                    const progCheck = computeTrainingAndActivityProgress();
                    const myEmailLower = user.email.trim().toLowerCase();
                    const myRequestedPoolSlot = examinerSlots.find(
                      (s: any) => (s.requestedByEmail || "").toLowerCase() === myEmailLower
                    );
                    const openPoolSlots = examinerSlots.filter((s: any) => s.status === "OPEN");

                    return (
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                        {myRequestedPoolSlot ? (
                          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 space-y-1">
                            <div className="font-semibold text-white">
                              Preferred Slot Selected — Awaiting Coordinator Allotment
                            </div>
                            <div>
                              Date: <strong className="text-white">{myRequestedPoolSlot.date}</strong> • Time:{" "}
                              <strong className="text-cyan-300">{myRequestedPoolSlot.slotTime}</strong> • Examiner:{" "}
                              <strong className="text-indigo-300">{myRequestedPoolSlot.instructor}</strong>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              You may select only 1 slot. Once the Training Coordinator confirms your allotment, it will appear above as Scheduled.
                            </div>
                          </div>
                        ) : !progCheck.eligibleForOneOnOne ? (
                          <div className="text-slate-400">
                            Complete Level 1, Level 2, and your required IIC Activity Points to unlock 1-on-1 Viva slot selection.
                          </div>
                        ) : openPoolSlots.length === 0 ? (
                          <div className="text-slate-400">
                            No open Examiner slots have been published by the Training Coordinator yet. Check back once the Examiner availability sheet is uploaded.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-emerald-300">
                                Level 3 Unlocked — Pick Your Preferred 1-on-1 Viva Slot (1 Choice Only)
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {openPoolSlots.length} open slot(s) available
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {openPoolSlots.map((slot: any) => (
                                <div
                                  key={slot.id}
                                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                                >
                                  <div>
                                    <div className="font-semibold text-white">
                                      {slot.date} • <span className="text-cyan-300">{slot.slotTime}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      Examiner: <span className="text-indigo-300 font-medium">{slot.instructor}</span> ({slot.domain})
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleStudentPickSingleSlot(slot.id)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shrink-0"
                                  >
                                    Pick Slot
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })() : ("""

assert old_no_slot in ttxt, "old_no_slot block not found"
ttxt = ttxt.replace(old_no_slot, new_no_slot, 1)

old_coord_form = """                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          placeholder="Student Email"
                          value={manualSlotEmail}
                          onChange={(e: any) => setManualSlotEmail(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Student Name"
                          value={manualSlotName}
                          onChange={(e: any) => setManualSlotName(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                        <input
                          type="date"
                          value={manualSlotDate}
                          onChange={(e: any) => setManualSlotDate(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Slot Time (e.g. 11:00 AM - 11:30 AM)"
                          value={manualSlotTime}
                          onChange={(e: any) => setManualSlotTime(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Instructor / Examiner Name"
                          value={manualSlotInstructor}
                          onChange={(e: any) => setManualSlotInstructor(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        >
                          Add Slot
                        </button>
                      </div>
                    </form>
                  </div>"""

new_coord_form = """                      {approvedStudents.length > 0 && (
                        <select
                          value=""
                          onChange={(e: any) => {
                            const chosen = approvedStudents.find((s: any) => s.email === e.target.value);
                            if (chosen) {
                              setManualSlotEmail(chosen.email);
                              setManualSlotName(chosen.fullName);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                        >
                          <option value="">Quick-fill Approved Student (optional)...</option>
                          {approvedStudents.map((st: any) => (
                            <option key={st.email} value={st.email}>
                              {st.fullName} ({st.email})
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          placeholder="Student Email"
                          value={manualSlotEmail}
                          onChange={(e: any) => setManualSlotEmail(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Student Name"
                          value={manualSlotName}
                          onChange={(e: any) => setManualSlotName(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                        <input
                          type="date"
                          value={manualSlotDate}
                          onChange={(e: any) => setManualSlotDate(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Slot Time (e.g. 11:00 AM - 11:30 AM)"
                          value={manualSlotTime}
                          onChange={(e: any) => setManualSlotTime(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={
                            approvedExaminers.some((ex: any) => ex.fullName === manualSlotInstructor)
                              ? manualSlotInstructor
                              : manualSlotInstructor
                              ? "__CUSTOM__"
                              : ""
                          }
                          onChange={(e: any) => {
                            if (e.target.value === "__CUSTOM__") {
                              setManualSlotInstructor("");
                            } else {
                              setManualSlotInstructor(e.target.value);
                            }
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        >
                          <option value="">Select Approved Examiner...</option>
                          {approvedExaminers.map((ex: any) => (
                            <option key={ex.email} value={ex.fullName}>
                              {ex.fullName} ({ex.email})
                            </option>
                          ))}
                          <option value="__CUSTOM__">Other / External Examiner...</option>
                        </select>
                        {!approvedExaminers.some((ex: any) => ex.fullName === manualSlotInstructor) && (
                          <input
                            type="text"
                            placeholder="Examiner Name"
                            value={manualSlotInstructor}
                            onChange={(e: any) => setManualSlotInstructor(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        )}
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shrink-0"
                        >
                          Allot Slot
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Examiner Availability Pool & Student Single-Slot Allotment */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          Examiner Availability Pool &amp; Student Single-Slot Allotment ({examinerSlots.length})
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          1) Import collected Examiner slots from your Google Form sheet or add below → 2) Unlocked students pick 1 preferred slot → 3) Confirm &amp; Allot here.
                        </p>
                      </div>
                      <label className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">
                        Upload Examiner Slots CSV
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={(e: any) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const r = new FileReader();
                            r.onload = () => handleImportExaminerPoolRows(String(r.result || ""));
                            r.readAsText(f);
                            e.target.value = "";
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {exPoolAlert && (
                      <div
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          exPoolAlert.type === "OK"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        }`}
                      >
                        <span>{exPoolAlert.text}</span>
                        <button type="button" onClick={() => setExPoolAlert(null)} className="underline text-[11px]">
                          Dismiss
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={exPoolText}
                          onChange={(e: any) => setExPoolText(e.target.value)}
                          placeholder={"Instructor,Date,Slot Time,Domain\\nLalit,2026-11-28,10:00 AM - 10:30 AM IST,Data Science\\nLalit,2026-11-28,11:00 AM - 11:30 AM IST,Data Science"}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-mono text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleImportExaminerPoolRows(exPoolText);
                            setExPoolText("");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold border border-slate-700"
                        >
                          Publish Pasted Examiner Slots
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 content-start">
                        <select
                          value={exPoolInstructor}
                          onChange={(e: any) => setExPoolInstructor(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        >
                          <option value="">Choose Approved Examiner...</option>
                          {approvedExaminers.map((ex: any) => (
                            <option key={ex.email} value={ex.fullName}>
                              {ex.fullName} ({ex.email})
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={exPoolDate}
                          onChange={(e: any) => setExPoolDate(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Slot Time (e.g. 03:00 PM - 03:30 PM)"
                          value={exPoolTime}
                          onChange={(e: any) => setExPoolTime(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!exPoolInstructor || !exPoolDate || !exPoolTime.trim()) {
                              setExPoolAlert({ type: "ERR", text: "Select Examiner, Date, and Slot Time." });
                              return;
                            }
                            const exObj = approvedExaminers.find((ex: any) => ex.fullName === exPoolInstructor);
                            setExaminerSlots((prev: any[]) => [
                              ...prev,
                              {
                                id: `EXPOOL-${Date.now()}`,
                                instructor: exPoolInstructor,
                                instructorEmail: exObj?.email || "",
                                date: exPoolDate,
                                slotTime: exPoolTime.trim(),
                                domain: exPoolDomain,
                                status: "OPEN",
                              },
                            ]);
                            setExPoolTime("");
                            setExPoolAlert({ type: "OK", text: "Added Examiner slot to Student selection pool." });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        >
                          + Add Examiner Slot
                        </button>
                      </div>
                    </div>

                    {examinerSlots.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                        {examinerSlots.map((ps: any) => (
                          <div
                            key={ps.id}
                            className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-semibold text-white">
                                {ps.date} • <span className="text-cyan-300">{ps.slotTime}</span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Examiner: <span className="text-indigo-300">{ps.instructor}</span>
                                {ps.requestedByEmail && (
                                  <>
                                    {" "}
                                    • Selected by:{" "}
                                    <span className="text-amber-300 font-semibold">
                                      {ps.requestedByName} ({ps.requestedByEmail})
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {ps.status === "OPEN" ? (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold">
                                OPEN FOR STUDENTS
                              </span>
                            ) : ps.status === "REQUESTED" ? (
                              <button
                                type="button"
                                onClick={() => handleCoordinatorAllotFromPool(ps)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shrink-0"
                              >
                                Confirm &amp; Allot
                              </button>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                                ALLOTTED ✓
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>"""

assert old_coord_form in ttxt, "old_coord_form block not found"
ttxt = ttxt.replace(old_coord_form, new_coord_form, 1)

old_evals_block = """                <div className="lg:col-span-6 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recorded Examiner Viva Evaluations ({evaluations.length})
                  </h3>

                  {evaluations.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                      No final-stage examiner interview evaluations recorded yet.
                    </div>
                  ) : (
                    evaluations.map((ev: any) => ("""

new_evals_block = """                <div className="lg:col-span-6 space-y-3">
                  {(() => {
                    const activeRoll = resolveActiveStudentRoll().trim().toUpperCase();
                    const visibleEvaluations =
                      user.role === "STUDENT"
                        ? evaluations.filter(
                            (ev: any) => String(ev.studentRoll || "").trim().toUpperCase() === activeRoll
                          )
                        : evaluations;
                    return (
                      <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recorded Examiner Viva Evaluations ({visibleEvaluations.length})
                  </h3>

                  {visibleEvaluations.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                      No final-stage examiner interview evaluations recorded yet.
                    </div>
                  ) : (
                    visibleEvaluations.map((ev: any) => ("""

assert old_evals_block in ttxt, "old_evals_block not found"
ttxt = ttxt.replace(old_evals_block, new_evals_block, 1)

target_evals_end = """                        {ev.remedialTasks && ev.remedialTasks.length > 0 && (
                          <div className="pt-1 border-t border-slate-800/80">
                            <span className="text-[11px] font-semibold text-amber-300 block mb-1">
                              Assigned Tasks Before Placement Readiness:
                            </span>
                            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                              {ev.remedialTasks.map((t: any, i: any) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>"""

new_evals_end = """                        {ev.remedialTasks && ev.remedialTasks.length > 0 && (
                          <div className="pt-1 border-t border-slate-800/80">
                            <span className="text-[11px] font-semibold text-amber-300 block mb-1">
                              Assigned Tasks Before Placement Readiness:
                            </span>
                            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                              {ev.remedialTasks.map((t: any, i: any) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                      </>
                    );
                  })()}
                </div>"""

assert target_evals_end in ttxt, "target_evals_end not found"
ttxt = ttxt.replace(target_evals_end, new_evals_end, 1)

tv_p.write_text(ttxt, encoding="utf-8")
print("2/2 Patched TrainingAndVettingPortal.tsx successfully")
