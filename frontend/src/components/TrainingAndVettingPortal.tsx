import { useMemo, useState } from "react";
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Database,
  EyeOff,
  PlayCircle,
  Plus,
  Shuffle,
  Sparkles,
  Square,
  Star,
  Upload,
  UserCheck,
} from "lucide-react";
import type {
  QuizDomainOption,
  QuizTrackOption,
} from "../types/portal";
import {
  ACTIVITY_CATALOG,
} from "../App";

export default function TrainingAndVettingPortal({
 ctx }: { ctx: any }) {

  const [inlineDocPreview, setInlineDocPreview] = useState<{ title: string; url: string } | null>(null);
  const toDriveEmbedUrl = (rawUrl: string) => {
    const m = rawUrl.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (m && m[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
    const mOpen = rawUrl.match(/drive\.google\.com\/open\?id=([^&#]+)/i);
    if (mOpen && mOpen[1]) return `https://drive.google.com/file/d/${mOpen[1]}/preview`;
    return rawUrl;
  };
  const {
    activePoolSize,
    activeTrack,
    examinerSlots = [],
    setExaminerSlots,
    registrations = [],
    ingestParsedSlotRows,
    activityAlert,
    activityCompletedDate,
    activityProofUrl,
    activitySubmissions,
    badges,
    bulkImporting,
    bulkQDomain,
    bulkQMode,
    bulkQStatus,
    bulkQTrack,
    bulkSheetUrl,
    commRating,
    computeTrainingAndActivityProgress,
    coordCsvInputRef,
    coordFeedback,
    coordTargetRoll,
    drawnQuestions,
    dsRating,
    evalBanner,
    evalSkillsets,
    evaluations,
    examinerNotes,
    examinerSlotScope,
    formatTimer,
    handleAddQuestionToBank,
    handleAddSingleSlot,
    handleAttemptTrainingStage,
    handleBatchTrainingCsvUpload,
    handleCoordinatorReviewActivity,
    handleCoordinatorUpdateStageScore,
    handleDownloadSampleQuestionCsv,
    handleDownloadSampleSlotsCsv,
    handleDownloadSampleTrainingCsv,
    handleDownloadFullTrainingReportCsv,
    handleLogActivityPoint,
    handlePasteSlotRowsSubmit,
    handleQuestionBankFileUpload,
    handleQuestionBankSheetUrlImport,
    handleSaveExaminerEvaluation,
    handleSimulateOneOnOneSignoff,
    handleSpreadsheetSlotFileUpload,
    handleStartRandomQuiz,
    handleSubmitQuiz,
    isPlacementReady,
    isQuizActive,
    manualSlotDate,
    manualSlotEmail,
    manualSlotInstructor,
    manualSlotName,
    manualSlotTime,
    marksheet,
    oneOnOneSlots,
    performingExceptionallyGood,
    progRating,
    qbBanner,
    qbCorrectIdx,
    qbDomain,
    qbOpt0,
    qbOpt1,
    qbOpt2,
    qbOpt3,
    qbPrompt,
    qbTrack,
    questionBank,
    quizAnswers,
    quizBanner,
    remedialTasksText,
    resolveActiveStudentRoll,
    resumes,
    secondsLeft,
    selectedActivityToLog,
    selectedSlotIdForEval,
    setActiveTrackId,
    setActivityCompletedDate,
    setActivityProofUrl,
    setBulkQDomain,
    setBulkQMode,
    setBulkQStatus,
    setBulkQTrack,
    setBulkSheetUrl,
    setCommRating,
    setCoordTargetRoll,
    setDrawnQuestions,
    setDsRating,
    setEvalSkillsets,
    setExaminerNotes,
    setExaminerSlotScope,
    setIsPlacementReady,
    setManualSlotDate,
    setManualSlotEmail,
    setManualSlotInstructor,
    setManualSlotName,
    setManualSlotTime,
    setPerformingExceptionallyGood,
    setPreviewSubmission,
    setProgRating,
    setQbCorrectIdx,
    setQbDomain,
    setQbOpt0,
    setQbOpt1,
    setQbOpt2,
    setQbOpt3,
    setQbPrompt,
    setQbTrack,
    setQuizAnswers,
    setQuizBanner,
    setRemedialTasksText,
    setSelectedActivityToLog,
    setSelectedSlotIdForEval,
    setSlotPasteText,
    setSlotProgressFilter,
    setSlotUploadAlert,
    slotPasteText,
    slotProgressFilter,
    slotUploadAlert,
    studentApplyingTrack,
    studentTargetDomain,
    toggleModuleComplete,
    tracks,
    trainingStages,
    user,
  } = ctx;

  const effectiveOneOnOneSlots = useMemo(() => {
    return oneOnOneSlots.map((slot: any) => {
      const sRoll = String(slot.studentEmail || "").split("@")[0].trim().toUpperCase();
      const matchedEval = evaluations.find(
        (ev: any) => String(ev.studentRoll || "").trim().toUpperCase() === sRoll
      );
      if (!matchedEval) return slot;
      return {
        ...slot,
        status: "COMPLETED",
        isPlacementReady: matchedEval.isPlacementReady,
        instructorFeedback:
          matchedEval.notes ||
          slot.instructorFeedback ||
          (matchedEval.isPlacementReady
            ? "Cleared 1-on-1 Viva — Placement Ready."
            : "Completed 1-on-1 Viva — Remedial tasks assigned."),
      };
    });
  }, [oneOnOneSlots, evaluations]);


  const [exPoolInstructor, setExPoolInstructor] = useState("");
  const [exPoolDate, setExPoolDate] = useState("");
  const [exPoolTime, setExPoolTime] = useState("");
  const [exPoolDomain] = useState("Data Science");
  const [exPoolAlert, setExPoolAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);
  const [studentSlotAlert, setStudentSlotAlert] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  const approvedExaminers = registrations.filter(
    (r: any) => r.role === "EXAMINER" && r.status === "APPROVED"
  );
  const approvedStudents = registrations.filter(
    (r: any) => r.role === "STUDENT" && r.status === "APPROVED"
  );

  const handleStudentPickSingleSlot = async (slotId: string) => {
    if (bookingSlotId) return;
    const myEmail = user.email.trim().toLowerCase();
    const alreadyPicked = examinerSlots.find(
      (s: any) =>
        (s.requestedByEmail || "").toLowerCase() === myEmail &&
        (s.status === "REQUESTED" || s.status === "ALLOTTED")
    );
    if (alreadyPicked) return;
    const myReg = approvedStudents.find((r: any) => r.email.toLowerCase() === myEmail);
    const myName = myReg?.fullName || user.name || myEmail.split("@")[0].toUpperCase();
    const apiBase =
      typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://127.0.0.1:8000"
        : "";

    setBookingSlotId(slotId);
    setStudentSlotAlert(null);
    try {
      const res = await fetch(
        `${apiBase}/api/v1/portal-state/examiner-slots/${encodeURIComponent(slotId)}/book`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentEmail: user.email.trim(),
            studentName: myName,
          }),
        }
      );
      if (res.status === 409) {
        const errData = await res.json().catch(() => ({}));
        setStudentSlotAlert(
          errData?.detail || "This slot was just booked by another student. Please choose another available slot."
        );
        // Immediately refresh latest examinerSlots so booked slot disappears
        const syncRes = await fetch(
          `${apiBase}/api/v1/portal-state/bootstrap?student_roll=${encodeURIComponent(myEmail.split("@")[0].toUpperCase())}`
        );
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          if (Array.isArray(syncJson?.snapshot?.examinerSlots)) {
            setExaminerSlots(syncJson.snapshot.examinerSlots);
          }
        }
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.examinerSlots)) {
          setExaminerSlots(data.examinerSlots);
          return;
        }
      }
      // Local fallback only when backend is unreachable
      setExaminerSlots((prev: any[]) =>
        prev.map((s: any) =>
          s.id === slotId && s.status === "OPEN" && !s.requestedByEmail
            ? { ...s, status: "REQUESTED", requestedByEmail: user.email, requestedByName: myName }
            : s
        )
      );
    } catch {
      setExaminerSlots((prev: any[]) =>
        prev.map((s: any) =>
          s.id === slotId && s.status === "OPEN" && !s.requestedByEmail
            ? { ...s, status: "REQUESTED", requestedByEmail: user.email, requestedByName: myName }
            : s
        )
      );
    } finally {
      setBookingSlotId(null);
    }
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
  };

  return (
    <>
          <div className="space-y-8">
            {user.role === "STUDENT" && (() => {
              const mySlots = effectiveOneOnOneSlots.filter(
                (s: any) =>
                  s.studentEmail.toLowerCase() === user.email.toLowerCase() ||
                  s.studentName.toLowerCase() === user.name.toLowerCase()
              );
              const latestSlot = mySlots[0] || null;
              return (
                <div className="bg-slate-900 border border-indigo-500/35 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          1-on-1 Viva &amp; Mentoring Slot — Schedule &amp; Instructor Feedback
                        </h3>
                        <p className="text-xs text-slate-400">
                          Assigned by the Training Coordinator and evaluated live by your IITM Examiner
                        </p>
                      </div>
                    </div>
                    {latestSlot && (() => {
                      const sRoll = String(latestSlot.studentEmail || "").split("@")[0].trim().toUpperCase();
                      const matchedEval = evaluations.find(
                        (ev: any) => String(ev.studentRoll || "").trim().toUpperCase() === sRoll
                      );
                      const isDone = latestSlot.status === "COMPLETED" || Boolean(matchedEval);
                      return (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            isDone
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {isDone ? "1-on-1 Completed" : "Scheduled"}
                        </span>
                      );
                    })()}
                  </div>

                  {!latestSlot ? (() => {
                    const progCheck = computeTrainingAndActivityProgress();
                    const myEmailLower = user.email.trim().toLowerCase();
                    const myRequestedPoolSlot = examinerSlots.find(
                      (s: any) => (s.requestedByEmail || "").toLowerCase() === myEmailLower
                    );
                    const takenSlotKeys = new Set(
                      effectiveOneOnOneSlots
                        .filter((os: any) => os.status === "SCHEDULED" || os.status === "COMPLETED")
                        .map(
                          (os: any) =>
                            `${String(os.instructor || "").trim().toLowerCase()}::${String(os.date || "").trim()}::${String(os.slotTime || "").trim().toLowerCase()}`
                        )
                    );
                    const openPoolSlots = examinerSlots.filter((s: any) => {
                      if (s.status !== "OPEN" || Boolean(s.requestedByEmail)) return false;
                      const k = `${String(s.instructor || "").trim().toLowerCase()}::${String(s.date || "").trim()}::${String(s.slotTime || "").trim().toLowerCase()}`;
                      return !takenSlotKeys.has(k);
                    });

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
                            {studentSlotAlert && (
                              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-medium">
                                {studentSlotAlert}
                              </div>
                            )}
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
                                    disabled={bookingSlotId !== null}
                                    onClick={() => handleStudentPickSingleSlot(slot.id)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold shrink-0"
                                  >
                                    {bookingSlotId === slot.id ? "Booking..." : "Pick Slot"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block">Scheduled Date</span>
                          <span className="font-semibold text-white mt-0.5 block">{latestSlot.date}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block">Slot Time</span>
                          <span className="font-semibold text-cyan-300 mt-0.5 block">{latestSlot.slotTime}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block">Assigned Instructor</span>
                          <span className="font-semibold text-indigo-300 mt-0.5 block">{latestSlot.instructor}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block">Readiness Sign-Off</span>
                          <span
                            className={`font-semibold mt-0.5 block ${
                              latestSlot.status === "COMPLETED"
                                ? latestSlot.isPlacementReady
                                  ? "text-emerald-300"
                                  : "text-amber-300"
                                : "text-slate-400"
                            }`}
                          >
                            {latestSlot.status === "COMPLETED"
                              ? latestSlot.isPlacementReady
                                ? "Placement Ready ✓"
                                : "Action Required (Remedial Tasks)"
                              : (() => { const sRoll = String(latestSlot.studentEmail || "").split("@")[0].trim().toUpperCase(); const ev = evaluations.find((x: any) => String(x.studentRoll || "").trim().toUpperCase() === sRoll); return (latestSlot.status === "COMPLETED" || ev) ? ((ev ? ev.isPlacementReady : latestSlot.isPlacementReady) ? "Placement Ready (Cleared)" : "Remedial Tasks Assigned") : "Awaiting 1-on-1 Completion"; })()}
                          </span>
                        </div>
                      </div>

                      {latestSlot.status === "COMPLETED" && (
                        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-emerald-300">
                              Instructor Feedback ({latestSlot.instructor})
                            </span>
                            {latestSlot.completedAt && (
                              <span className="text-[11px] text-slate-400">
                                Completed: {latestSlot.completedAt}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-200 leading-relaxed">
                            {latestSlot.instructorFeedback}
                          </p>
                          {(latestSlot.programmingRating || latestSlot.dataScienceRating || latestSlot.communicationRating) && (
                            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                              {latestSlot.programmingRating && (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                                  Programming: <strong>{latestSlot.programmingRating}/5</strong>
                                </span>
                              )}
                              {latestSlot.dataScienceRating && (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                                  Data Science: <strong>{latestSlot.dataScienceRating}/5</strong>
                                </span>
                              )}
                              {latestSlot.communicationRating && (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                                  Communication: <strong>{latestSlot.communicationRating}/5</strong>
                                </span>
                              )}
                            </div>
                          )}
                          {latestSlot.remedialTasks && latestSlot.remedialTasks.length > 0 && !latestSlot.isPlacementReady && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                              <span className="font-semibold block mb-1">Recommended Next Steps from Instructor:</span>
                              <ul className="list-disc list-inside space-y-0.5">
                                {latestSlot.remedialTasks.map((task: any, idx: any) => (
                                  <li key={idx}>{task}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {user.role === "STUDENT" && (() => {
              const prog = computeTrainingAndActivityProgress();
              const relevantActivities = ACTIVITY_CATALOG.filter((a) => {
                if (a.table === "TABLE_1") return true;
                if (a.table === "TABLE_2") return a.domain === studentTargetDomain;
                if (a.table === "TABLE_3")
                  return (studentApplyingTrack === "FULL_TIME" || studentApplyingTrack === "BOTH") && a.domain === studentTargetDomain;
                return false;
              });

              return (
                <div className="space-y-6">
                  {/* Master Readiness & Eligibility Header */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <Award className="w-5 h-5 text-indigo-400" />
                          3-Level Placement Training & IIC Activity Points Tracker
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Domain:{" "}
                          <span className="text-indigo-300 font-semibold">
                            {studentTargetDomain === "DATA_SCIENCE"
                              ? "Data Science"
                              : "Software Development"}
                          </span>{" "}
                          • Opted Plan:{" "}
                          <span className="text-indigo-300 font-semibold">
                            {studentApplyingTrack === "BOTH"
                              ? "Combined Internship (25 Pts) + Full-Time (50 Pts) Plan"
                              : studentApplyingTrack === "INTERNSHIP"
                              ? "Internship Plan (Min 25 Activity Pts)"
                              : "Full-Time Placement Plan (Min 50 Activity Pts)"}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                          prog.overallPlacementReady
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : prog.eligibleForOneOnOne
                            ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {prog.overallPlacementReady
                          ? "PLACEMENT READY — OPPORTUNITIES UNLOCKED"
                          : prog.eligibleForOneOnOne
                          ? "ELIGIBLE FOR 1-ON-1 EXAMINER SESSION"
                          : `TRAINING & ACTIVITY POINTS IN PROGRESS (${prog.earnedPointsForTrack}/${prog.requiredTotalPoints} PTS)`}
                      </span>
                    </div>

                    {/* 4-Pillar Gate Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 block">Level 1 • Soft Skills (80% Cutoff)</span>
                        <span className={`font-bold mt-1 block ${prog.l1Passed ? "text-emerald-400" : "text-amber-300"}`}>
                          {prog.l1Obt}/{prog.l1Max} ({prog.l1Pct.toFixed(1)}%) — {prog.l1Passed ? "PASSED" : "BELOW CUTOFF"}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 block">Level 2 • Focus Finder (60% Cutoff)</span>
                        <span className={`font-bold mt-1 block ${prog.l2Passed ? "text-emerald-400" : "text-amber-300"}`}>
                          {prog.l2Obt}/{prog.l2Max} ({prog.l2Pct.toFixed(1)}%) — {prog.l2Passed ? "PASSED" : "BELOW CUTOFF"}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 block">Parallel IIC Activity Points</span>
                        <span className={`font-bold mt-1 block ${prog.meetsTableMinimums ? "text-emerald-400" : "text-amber-300"}`}>
                          {prog.earnedPointsForTrack} / {prog.requiredTotalPoints} Pts ({prog.meetsTableMinimums ? "QUALIFIED" : "ACTION REQUIRED"})
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 block">Level 3 • 1-on-1 Examiner Session</span>
                        <span className={`font-bold mt-1 block ${prog.oneOnOneCleared ? "text-emerald-400" : prog.eligibleForOneOnOne ? "text-indigo-300" : "text-slate-400"}`}>
                          {prog.oneOnOneCleared
                            ? "Readiness: Yes (Cleared)"
                            : prog.eligibleForOneOnOne
                            ? "Unlocked — Ready for 1-on-1"
                            : `Locked (Need ${prog.requiredTotalPoints} Pts)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3-Level Training Stage-by-Stage Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {([1, 2, 3] as const).map((lvl) => {
                      const stages = trainingStages.filter((s: any) => s.level === lvl);
                      const levelMeta =
                        lvl === 1
                          ? { name: "Level 1: Soft Skills Training", cutoff: "Overall 80% • Stage 70%", passed: prog.l1Passed }
                          : lvl === 2
                          ? { name: "Level 2: Focus Finder", cutoff: "Overall 60% • Stage 70%", passed: prog.l2Passed }
                          : { name: "Level 3: Hire Tracking", cutoff: "Overall 60% • Stage 60% + Activity Pts", passed: prog.overallPlacementReady };

                      return (
                        <div key={lvl} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-bold text-white">{levelMeta.name}</h3>
                                <p className="text-[11px] text-slate-400">{levelMeta.cutoff}</p>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                  levelMeta.passed
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                }`}
                              >
                                {levelMeta.passed ? "CLEARED" : "IN PROGRESS"}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {stages.map((st: any) => {
                                const stageOk =
                                  st.evaluationType === "MARKS"
                                    ? st.obtainedMarks >= st.minRequired
                                    : st.evaluationType === "AI_MOCK"
                                    ? st.statusText === "Hire"
                                    : prog.oneOnOneCleared;

                                return (
                                  <div key={st.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-slate-100">
                                        {st.stageNum}. {st.title}
                                      </span>
                                      {st.evaluationType === "MARKS" ? (
                                        <span className={`font-mono font-bold ${stageOk ? "text-emerald-400" : "text-rose-400"}`}>
                                          {st.obtainedMarks}/{st.maxMarks} (Min {st.minRequired})
                                        </span>
                                      ) : st.evaluationType === "AI_MOCK" ? (
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
                                          {st.statusText}
                                        </span>
                                      ) : (
                                        <span
                                          className={`px-2 py-0.5 rounded font-semibold ${
                                            prog.oneOnOneCleared
                                              ? "bg-emerald-500/15 text-emerald-300"
                                              : prog.eligibleForOneOnOne
                                              ? "bg-indigo-500/20 text-indigo-300"
                                              : "bg-slate-800 text-slate-400"
                                          }`}
                                        >
                                          {prog.oneOnOneCleared
                                            ? "Readiness: Yes"
                                            : prog.eligibleForOneOnOne
                                            ? "Eligible for 1-on-1"
                                            : `Locked (${prog.earnedPointsForTrack}/${prog.requiredTotalPoints} Pts)`}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">{st.description}</p>
                                    {st.evaluationType !== "ONE_ON_ONE" && (
                                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400">
                                          Attempts:{" "}
                                          <strong className={st.attemptsUsed >= st.maxAttempts ? "text-amber-300" : "text-slate-200"}>
                                            {st.attemptsUsed} / {st.maxAttempts}
                                          </strong>
                                        </span>
                                        {st.attemptsUsed < st.maxAttempts ? (
                                          <button
                                            type="button"
                                            onClick={() => handleAttemptTrainingStage(st.id)}
                                            className="px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-semibold"
                                          >
                                            Attempt ({st.maxAttempts - st.attemptsUsed} left)
                                          </button>
                                        ) : (
                                          <span className="text-slate-500 font-semibold">Max 2 Attempts Used</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {lvl === 3 && !prog.oneOnOneCleared && (
                            <button
                              type="button"
                              onClick={handleSimulateOneOnOneSignoff}
                              disabled={!prog.eligibleForOneOnOne}
                              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition ${
                                prog.eligibleForOneOnOne
                                  ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
                              }`}
                            >
                              {prog.eligibleForOneOnOne
                                ? "Complete 1-on-1 Examiner Session (Sign Off Readiness)"
                                : `Earn ${prog.requiredTotalPoints - prog.earnedPointsForTrack} More Activity Pts to Unlock 1-on-1`}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Parallel IIC Activity Points Portal (1-Year Validity) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-white">
                          IIC Placement Activity Points Portal (1-Year Validity)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Table 1 (Common): <strong className="text-slate-200">{prog.table1Points}/15 pts</strong> (Min 10) •{" "}
                          Table 2 (Internship {studentTargetDomain === "DATA_SCIENCE" ? "DS" : "Dev"}):{" "}
                          <strong className="text-slate-200">{prog.table2Points}/25 pts</strong> (Min 15)
                          {studentApplyingTrack === "FULL_TIME" && (
                            <>
                              {" "}
                              • Table 3 (Placement {studentTargetDomain === "DATA_SCIENCE" ? "DS" : "Dev"}):{" "}
                              <strong className="text-slate-200">{prog.table3Points}/40 pts</strong> (Min 25)
                            </>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                          Total Earned: {prog.earnedPointsForTrack} / {prog.requiredTotalPoints} Required Pts
                        </span>
                      </div>
                    </div>

                    {activityAlert && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                        {activityAlert}
                      </div>
                    )}

                    {/* Submit Google Drive Evidence Link (PDF / JPG) for Training Coordinator Approval */}
                    <form onSubmit={handleLogActivityPoint} className="space-y-3 bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-3 py-2 rounded-lg">
                        <span>
                          <strong>Google Drive Submission Rule:</strong> Upload your PDF certificate or JPG screenshot to your <code className="text-white">@ds.study.iitm.ac.in</code> Google Drive, set sharing to <strong>&ldquo;Anyone with the link can view&rdquo;</strong>, and paste the Drive link below.
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-4">
                          <label className="block text-slate-400 mb-1">Select IIC Activity (Table 1 / 2 / 3)</label>
                          <select
                            value={selectedActivityToLog}
                            onChange={(e: any) => setSelectedActivityToLog(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          >
                            {relevantActivities.map((act) => (
                              <option key={act.id} value={act.id}>
                                [{act.table.replace("_", " ")} • +{act.points} pts] {act.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-4">
                          <label className="block text-slate-400 mb-1">Google Drive Share Link (PDF / JPG)</label>
                          <input
                            type="url"
                            required
                            value={activityProofUrl}
                            onChange={(e: any) => setActivityProofUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-slate-400 mb-1">Completion Date</label>
                          <input
                            type="date"
                            required
                            value={activityCompletedDate}
                            onChange={(e: any) => setActivityCompletedDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div className="md:col-span-2 flex items-end">
                          <button
                            type="submit"
                            className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                          >
                            Submit Drive Link
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Activity Checklist & Coordinator Verification Status Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                            <th className="py-2 pr-3">Table</th>
                            <th className="py-2 px-3">Topic & Activity</th>
                            <th className="py-2 px-3">Points</th>
                            <th className="py-2 px-3">Submitted PDF / JPG Evidence</th>
                            <th className="py-2 pl-3">Coordinator Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {relevantActivities.map((act) => {
                            const activeStudentRoll = resolveActiveStudentRoll();
                            const sub = activitySubmissions.find(
                              (s: any) =>
                                s.activityId === act.id &&
                                String(s.studentEmail || "").split("@")[0].trim().toUpperCase() === activeStudentRoll
                            );
                            return (
                              <tr key={act.id}>
                                <td className="py-2.5 pr-3 font-mono text-[11px] text-indigo-300">
                                  {act.table.replace("_", " ")}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-slate-100 block">{act.title}</span>
                                  <span className="text-[11px] text-slate-400">{act.description}</span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-emerald-300">+{act.points} pts</td>
                                <td className="py-2.5 px-3 text-[11px]">
                                  {sub ? (
                                    <div className="space-y-1">
                                      <span className="text-indigo-300 font-medium block">
                                        {sub.evidenceFileName}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {sub.proofUrl && (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewSubmission(sub)}
                                            className="text-indigo-400 hover:underline font-semibold"
                                          >
                                            Preview Drive File
                                          </button>
                                        )}
                                        <span className="text-slate-500">• {sub.completedDate}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500">{act.platformHint}</span>
                                  )}
                                </td>
                                <td className="py-2.5 pl-3">
                                  {sub ? (
                                    sub.reviewStatus === "APPROVED" ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
                                        Approved (+{act.points} pts)
                                      </span>
                                    ) : sub.reviewStatus === "PENDING_COORDINATOR" ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold">
                                        Awaiting Coordinator
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-semibold">
                                        Rejected — Re-upload
                                      </span>
                                    )
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                      Not Submitted
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
            {(user.role === "TRAINING_COORDINATOR" || user.role === "ADMIN") && (() => {
              const totalSlots = effectiveOneOnOneSlots.length;
              const completedSlots = effectiveOneOnOneSlots.filter((s: any) => s.status === "COMPLETED").length;
              const pendingSlots = totalSlots - completedSlots;
              const readySlots = effectiveOneOnOneSlots.filter((s: any) => s.status === "COMPLETED" && s.isPlacementReady).length;
              const filteredSlots = effectiveOneOnOneSlots.filter((s: any) =>
                slotProgressFilter === "ALL" ? true : s.status === slotProgressFilter
              );

              return (
                <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                        Training Coordinator • 1-on-1 Viva &amp; Mentoring Operations
                      </span>
                      <h2 className="text-lg font-bold text-white mt-0.5">
                        1-on-1 Slot Bulk Scheduler (CSV / Excel) &amp; Master Progress Tracker
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Upload your collected Examiner availability sheet (<code className="text-indigo-300">Instructor, Date, Slot Time, Domain</code>) so unlocked students can pick 1 slot for your final allotment.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadSampleSlotsCsv}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
                      >
                        Download Examiner Slots CSV Template
                      </button>
                      <label className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer">
                        Upload Examiner Slots (.xlsx, .xls, .csv)
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls,.tsv"
                          onChange={handleSpreadsheetSlotFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {slotUploadAlert && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        slotUploadAlert.type === "OK"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      <span>{slotUploadAlert.text}</span>
                      <button
                        type="button"
                        onClick={() => setSlotUploadAlert(null)}
                        className="text-[11px] underline opacity-80 hover:opacity-100"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Live 1-on-1 Progress Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Total 1-on-1 Slots</span>
                      <span className="text-xl font-bold text-white mt-0.5 block">{totalSlots}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Scheduled / Upcoming</span>
                      <span className="text-xl font-bold text-amber-300 mt-0.5 block">{pendingSlots}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Completed 1-on-1s</span>
                      <span className="text-xl font-bold text-emerald-300 mt-0.5 block">{completedSlots}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Placement Ready Sign-offs</span>
                      <span className="text-xl font-bold text-cyan-300 mt-0.5 block">{readySlots}</span>
                    </div>
                  </div>

                  {/* Quick Paste or Single Slot Add */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                    <form onSubmit={handlePasteSlotRowsSubmit} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="font-semibold text-slate-200">
                        Paste Rows Directly from Excel / Google Sheets
                      </div>
                      <textarea
                        rows={3}
                        value={slotPasteText}
                        onChange={(e: any) => setSlotPasteText(e.target.value)}
                        placeholder={"Instructor,Date,Slot Time,Domain\nLalit,2026-11-28,10:00 AM - 10:30 AM IST,Data Science\nLalit,2026-11-28,11:00 AM - 11:30 AM IST,Data Science"}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-mono text-[11px]"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      >
                        Import Pasted Rows
                      </button>
                    </form>

                    <form onSubmit={handleAddSingleSlot} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="font-semibold text-slate-200">Quick Single-Slot Assignment</div>
                      {approvedStudents.length > 0 && (
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
                      {examinerSlots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExaminerSlots([])}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold"
                        >
                          Clear Pool ({examinerSlots.length})
                        </button>
                      )}
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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
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
                  </div>

                  {/* Entire 1-on-1 Progress Table */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Entire 1-on-1 Progress &amp; Instructor Feedback Ledger ({filteredSlots.length})
                      </h3>
                      <div className="flex gap-1.5 text-[11px]">
                        {(["ALL", "SCHEDULED", "COMPLETED"] as const).map((st: any) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setSlotProgressFilter(st)}
                            className={`px-2.5 py-1 rounded-lg font-semibold ${
                              slotProgressFilter === st
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-950 border border-slate-800 text-slate-400"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-800 text-[11px] uppercase text-slate-400">
                            <th className="py-2.5 px-3">Student</th>
                            <th className="py-2.5 px-3">Date &amp; Slot Time</th>
                            <th className="py-2.5 px-3">Instructor</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Instructor Feedback &amp; Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 bg-slate-950/50">
                          {filteredSlots.map((slot: any) => (
                            <tr key={slot.id}>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-white block">{slot.studentName}</span>
                                <span className="text-[11px] font-mono text-slate-400">{slot.studentEmail}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-slate-200 block">{slot.date}</span>
                                <span className="text-[11px] text-cyan-300">{slot.slotTime}</span>
                              </td>
                              <td className="py-2.5 px-3 text-indigo-300 font-medium">{slot.instructor}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    slot.status === "COMPLETED"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  {slot.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 max-w-xs">
                                {slot.status === "COMPLETED" ? (
                                  <div className="space-y-0.5">
                                    <span
                                      className={`text-[11px] font-semibold block ${
                                        slot.isPlacementReady ? "text-emerald-300" : "text-amber-300"
                                      }`}
                                    >
                                      {slot.isPlacementReady ? "Placement Ready ✓" : "Not Ready (Remedial)"}
                                    </span>
                                    <p className="text-[11px] text-slate-300">{slot.instructorFeedback}</p>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-500">Awaiting 1-on-1 session</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {(user.role === "TRAINING_COORDINATOR" || user.role === "ADMIN") && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-indigo-400" />
                      Training Coordinator — Activity Evidence (PDF/JPG) Verification Queue
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verify student-uploaded PDF/JPG certificates & screenshots (1-year validity). Approved points automatically unlock the 1-on-1 Examiner Session (25 pts Internship / 50 pts Placement).
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {activitySubmissions.filter((s: any) => s.reviewStatus === "PENDING_COORDINATOR").length} Pending Verification
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 pr-3">ID</th>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Activity & Points</th>
                        <th className="py-2.5 px-3">Uploaded PDF / JPG Evidence</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 pl-3">Coordinator Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {activitySubmissions.map((sub: any) => {
                        const act = ACTIVITY_CATALOG.find((a) => a.id === sub.activityId);
                        return (
                          <tr key={sub.id}>
                            <td className="py-3 pr-3 font-mono text-slate-300">{sub.id}</td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-white block">{sub.studentName}</span>
                              <span className="text-[11px] text-slate-400">{sub.studentEmail}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-100 block">
                                {act?.title || sub.activityId}
                              </span>
                              <span className="text-emerald-300 font-bold">
                                +{act?.points || 0} Points ({act?.table.replace("_", " ")})
                              </span>
                            </td>
                            <td className="py-3 px-3 space-y-1">
                              <span className="text-slate-200 font-medium block">
                                {sub.evidenceFileName}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                {sub.proofUrl && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewSubmission(sub)}
                                      className="px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-semibold"
                                    >
                                      Inline Preview
                                    </button>
                                    <a
                                      href={sub.proofUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-slate-400 hover:text-white underline"
                                    >
                                      Open in Drive ↗
                                    </a>
                                  </>
                                )}
                                <span className="text-slate-500">• {sub.completedDate}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full font-semibold ${
                                  sub.reviewStatus === "APPROVED"
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : sub.reviewStatus === "PENDING_COORDINATOR"
                                    ? "bg-amber-500/15 text-amber-300"
                                    : "bg-rose-500/15 text-rose-300"
                                }`}
                              >
                                {sub.reviewStatus}
                              </span>
                            </td>
                            <td className="py-3 pl-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCoordinatorReviewActivity(sub.id, "APPROVED")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                                >
                                  Approve (+{act?.points || 0})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCoordinatorReviewActivity(sub.id, "REJECTED")}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-semibold"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(user.role === "TRAINING_COORDINATOR" || user.role === "ADMIN") && (() => {
              const prog = computeTrainingAndActivityProgress();
              return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-emerald-400" />
                        Training Coordinator — 3-Level Marks & Batch CSV Updater (Single Source of Truth)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Update Level 1 (80% cutoff), Level 2 (60% cutoff), and Level 3 Stage 1–2 scores individually or via LMS CSV upload. Enforces max 2 attempts per stage and syncs directly to the Student Dashboard.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadFullTrainingReportCsv}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        Download Full Training Report (.csv)
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadSampleTrainingCsv}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200"
                      >
                        Download Sample CSV
                      </button>
                      <input
                        ref={coordCsvInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleBatchTrainingCsvUpload}
                        className="hidden"
                        id="coord-batch-csv-upload"
                      />
                      <label
                        htmlFor="coord-batch-csv-upload"
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload LMS Batch CSV
                      </label>
                    </div>
                  </div>

                  {/* Student Roll Selector & Live Level Cutoff Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Active Student Roll No.</label>
                      <input
                        type="text"
                        value={coordTargetRoll}
                        onChange={(e: any) => setCoordTargetRoll(e.target.value.toUpperCase())}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-semibold"
                      />
                      {(() => {
                        const matchedReg = (registrations || []).find(
                          (r: any) =>
                            r.role === "STUDENT" &&
                            String(r.email || "").toUpperCase().startsWith(`${coordTargetRoll.trim().toUpperCase()}@`)
                        );
                        if (!matchedReg) return null;
                        const d = matchedReg.studentProfileDetails;
                        return (
                          <div className="mt-1.5 text-[10px] text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 rounded px-2 py-1">
                            {d
                              ? `${matchedReg.fullName} • ${d.programLevel} • Track: ${d.applyingTrack} • ${d.targetDomain} • CGPA ${d.cgpa || "N/A"}`
                              : `${matchedReg.fullName} • ${matchedReg.orgOrDept}`}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-slate-400">Level 1 Soft Skills (80% Cutoff)</span>
                      <span className={`font-bold mt-0.5 ${prog.l1Passed ? "text-emerald-400" : "text-amber-300"}`}>
                        {prog.l1Obt}/{prog.l1Max} ({prog.l1Pct.toFixed(1)}%) • {prog.l1Passed ? "PASSED" : "BELOW CUTOFF"}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-slate-400">Level 2 Focus Finder (60% Cutoff)</span>
                      <span className={`font-bold mt-0.5 ${prog.l2Passed ? "text-emerald-400" : "text-amber-300"}`}>
                        {prog.l2Obt}/{prog.l2Max} ({prog.l2Pct.toFixed(1)}%) • {prog.l2Passed ? "PASSED" : "BELOW CUTOFF"}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-slate-400">1-on-1 Examiner Gate Status</span>
                      <span className={`font-bold mt-0.5 ${prog.eligibleForOneOnOne ? "text-emerald-400" : "text-amber-300"}`}>
                        {prog.eligibleForOneOnOne
                          ? "UNLOCKED FOR EXAMINER"
                          : `LOCKED (${prog.earnedPointsForTrack}/${prog.requiredTotalPoints} Activity Pts)`}
                      </span>
                    </div>
                  </div>

                  {coordFeedback && (
                    <div
                      className={`p-3 rounded-xl border text-xs ${
                        coordFeedback.type === "OK"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {coordFeedback.text}
                    </div>
                  )}

                  {/* Stage-by-Stage Inline Score & Attempt Editor */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                          <th className="py-2.5 pr-3">Stage ID</th>
                          <th className="py-2.5 px-3">Level & Activity</th>
                          <th className="py-2.5 px-3">Cutoff / Max</th>
                          <th className="py-2.5 px-3">Attempts (Max 2)</th>
                          <th className="py-2.5 px-3">Current Score</th>
                          <th className="py-2.5 pl-3">Coordinator Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {trainingStages.map((st: any) => {
                          const stageCleared =
                            st.evaluationType === "MARKS"
                              ? st.obtainedMarks >= st.minRequired
                              : st.evaluationType === "AI_MOCK"
                              ? st.statusText === "Hire"
                              : prog.oneOnOneCleared;

                          return (
                            <tr key={st.id}>
                              <td className="py-2.5 pr-3 font-mono text-indigo-300 font-semibold">{st.id}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-100 block">
                                  Level {st.level} • {st.title}
                                </span>
                                <span className="text-[11px] text-slate-400">{st.description}</span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 font-mono">
                                {st.evaluationType === "MARKS"
                                  ? `Min ${st.minRequired} / ${st.maxMarks}`
                                  : st.evaluationType === "AI_MOCK"
                                  ? "Hire Required"
                                  : "Examiner Sign-Off"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded font-mono font-semibold ${
                                    st.attemptsUsed >= st.maxAttempts
                                      ? "bg-amber-500/15 text-amber-300"
                                      : "bg-slate-800 text-slate-200"
                                  }`}
                                >
                                  {st.attemptsUsed} / {st.maxAttempts}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`font-bold ${
                                    stageCleared ? "text-emerald-400" : "text-rose-400"
                                  }`}
                                >
                                  {st.evaluationType === "MARKS"
                                    ? `${st.obtainedMarks}/${st.maxMarks} (${stageCleared ? "PASS" : "FAIL"})`
                                    : st.statusText}
                                </span>
                              </td>
                              <td className="py-2.5 pl-3">
                                {st.evaluationType === "ONE_ON_ONE" ? (
                                  <span className="text-[11px] text-slate-500 italic">
                                    Examiner Portal Only
                                  </span>
                                ) : st.evaluationType === "MARKS" ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={st.maxMarks}
                                      defaultValue={st.obtainedMarks}
                                      id={`coord-input-${st.id}`}
                                      className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const el = document.getElementById(
                                          `coord-input-${st.id}`
                                        ) as HTMLInputElement | null;
                                        if (el) handleCoordinatorUpdateStageScore(st.id, el.value, false);
                                      }}
                                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                                      title="Save marks on current attempt"
                                    >
                                      Save
                                    </button>
                                    {st.attemptsUsed < st.maxAttempts && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const el = document.getElementById(
                                            `coord-input-${st.id}`
                                          ) as HTMLInputElement | null;
                                          if (el) handleCoordinatorUpdateStageScore(st.id, el.value, true);
                                        }}
                                        className="px-2 py-1 rounded bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-semibold"
                                        title="Record 2nd attempt marks"
                                      >
                                        +2nd Attempt
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleCoordinatorUpdateStageScore(st.id, "Hire", false)}
                                      className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 font-semibold"
                                    >
                                      Hire
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCoordinatorUpdateStageScore(st.id, "No-Hire", false)}
                                      className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-semibold"
                                    >
                                      No-Hire
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {user.role === "EXAMINER" && (
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                      Level 3 • Stage 3 — 1-on-1 Viva Examiner Console
                    </span>
                    <h2 className="text-lg font-bold text-slate-100 mt-0.5">
                      Candidate Verification &amp; Viva Readiness Dossier
                    </h2>
                    <p className="text-xs text-slate-400">
                      Select a student roll number to inspect their 3-level readiness, BS scorecard, and resumes before recording the final viva verdict.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-medium">Candidate Roll:</label>
                    <input
                      type="text"
                      value={coordTargetRoll}
                      onChange={(e: any) => setCoordTargetRoll(e.target.value.toUpperCase())}
                      placeholder="22F3001234"
                      className="w-36 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Documents on File • Roll <span className="font-mono text-indigo-300">{resolveActiveStudentRoll()}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Open Google Drive links inline without leaving the viva evaluation screen.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {marksheet ? (
                      <>
                        {marksheet.driveUrl && (
                          <a
                            href={marksheet.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold"
                          >
                            Scorecard Drive Link ↗
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setInlineDocPreview(
                              inlineDocPreview?.url === marksheet.driveUrl
                                ? null
                                : {
                                    title: `${resolveActiveStudentRoll()} — IITM BS Official Scorecard (CGPA ${marksheet.cgpa})`,
                                    url: marksheet.driveUrl,
                                  }
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                        >
                          {inlineDocPreview?.url === marksheet.driveUrl
                            ? "Hide Scorecard Preview"
                            : `Inline Preview Scorecard (CGPA ${marksheet.cgpa})`}
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-500 border border-slate-800 text-xs">
                        No BS Scorecard Linked
                      </span>
                    )}
                    {resumes.length > 0 ? (
                      resumes.map((resItem: any, rIdx: any) => (
                        <div key={resItem.id} className="inline-flex items-center gap-1.5">
                          {resItem.driveUrl && (
                            <a
                              href={resItem.driveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold"
                            >
                              Resume #{rIdx + 1} Drive ↗
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setInlineDocPreview(
                                inlineDocPreview?.url === resItem.driveUrl
                                  ? null
                                  : {
                                      title: `${resolveActiveStudentRoll()} — Resume #${rIdx + 1}: ${resItem.title} (${resItem.targetRole})`,
                                      url: resItem.driveUrl,
                                    }
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"
                          >
                            {inlineDocPreview?.url === resItem.driveUrl
                              ? `Hide Resume #${rIdx + 1}`
                              : `Inline Preview Resume #${rIdx + 1}`}
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-500 border border-slate-800 text-xs">
                        No Resumes Linked
                      </span>
                    )}
                  </div>
                </div>

                {(marksheet?.driveUrl || resumes.length > 0) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-[11px]">
                    {marksheet?.driveUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 shrink-0">BS Scorecard Drive URL:</span>
                        <a
                          href={marksheet.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:text-sky-200 underline truncate font-mono"
                        >
                          {marksheet.driveUrl}
                        </a>
                      </div>
                    )}
                    {resumes.map((resItem: any, rIdx: any) =>
                      resItem.driveUrl ? (
                        <div key={`url-${resItem.id}`} className="flex items-center gap-2">
                          <span className="text-slate-400 shrink-0">Resume #{rIdx + 1} ({resItem.title}) URL:</span>
                          <a
                            href={resItem.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-300 hover:text-sky-200 underline truncate font-mono"
                          >
                            {resItem.driveUrl}
                          </a>
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {inlineDocPreview && (
                  <div className="mt-3 rounded-xl border border-indigo-500/40 bg-slate-900 overflow-hidden">
                    <div className="px-3.5 py-2 bg-indigo-950/60 border-b border-indigo-500/30 flex items-center justify-between gap-2">
                      <span className="font-semibold text-indigo-200 text-xs truncate">
                        Inline Document Viewer: {inlineDocPreview.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={inlineDocPreview.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 text-[11px] font-semibold"
                        >
                          Open in New Tab ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => setInlineDocPreview(null)}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-semibold"
                        >
                          Close Viewer ✕
                        </button>
                      </div>
                    </div>
                    <iframe
                      src={toDriveEmbedUrl(inlineDocPreview.url)}
                      title={inlineDocPreview.title}
                      className="w-full h-[460px] bg-white"
                      allow="autoplay"
                    />
                  </div>
                )}
              </div>
            )}

            {(user.role === "TRAINING_COORDINATOR" || user.role === "ADMIN") && (() => {
              const bankBuckets: {
                code: string;
                title: string;
                domain: QuizDomainOption;
                track: QuizTrackOption;
              }[] = [
                { code: "DS-INT-101", title: "Data Science — Internship", domain: "DATA_SCIENCE", track: "INTERNSHIP" },
                { code: "DS-SDE-201", title: "Data Science — Full-Time Placement", domain: "DATA_SCIENCE", track: "SOFTWARE_DEVELOPMENT" },
                { code: "SD-INT-102", title: "Software Development — Internship", domain: "SOFTWARE_DEVELOPMENT", track: "INTERNSHIP" },
                { code: "SD-SDE-202", title: "Software Development — Full-Time Placement", domain: "SOFTWARE_DEVELOPMENT", track: "SOFTWARE_DEVELOPMENT" },
              ];

              return (
                <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-400" />
                        Quiz Question Bank Database (4 Domain & Track Pools)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Training Coordinator repository — upload CSV/Excel spreadsheets, sync a Google Sheet link, or add questions manually across all 4 assessment pools.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadSampleQuestionCsv}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-300 transition"
                      >
                        Download Sample CSV Template
                      </button>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 font-semibold">
                        {questionBank.length} Total Qs
                      </span>
                    </div>
                  </div>

                  {/* 4 Data Bank Pool Counters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {bankBuckets.map((b: any) => {
                      const count = questionBank.filter((q: any) => q.domain === b.domain && q.track === b.track).length;
                      const isSelected = bulkQDomain === b.domain && bulkQTrack === b.track;
                      return (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => {
                            setBulkQDomain(b.domain);
                            setBulkQTrack(b.track);
                            setQbDomain(b.domain);
                            setQbTrack(b.track);
                          }}
                          className={`text-left p-3.5 rounded-xl border transition ${
                            isSelected
                              ? "bg-indigo-950/50 border-indigo-500 text-white"
                              : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-indigo-300">{b.code}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-300 font-bold">
                              {count} Qs
                            </span>
                          </div>
                          <div className="text-xs font-semibold mt-1.5">{b.title}</div>
                        </button>
                      );
                    })}
                  </div>

                  {bulkQStatus && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                        bulkQStatus.type === "OK"
                          ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                          : "bg-rose-950/60 border-rose-500/40 text-rose-200"
                      }`}
                    >
                      <span>{bulkQStatus.text}</span>
                      <button
                        type="button"
                        onClick={() => setBulkQStatus(null)}
                        className="text-[11px] underline text-slate-400 hover:text-white shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {qbBanner && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        qbBanner.type === "OK"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{qbBanner.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left 7 Cols: Bulk Spreadsheet / CSV / Google Sheet Link Importer */}
                    <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white">Bulk Import via CSV / Excel / Spreadsheet Link</h3>
                        <span className="text-[11px] text-slate-400">Cols: Question, Option A–D, Correct Answer</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-slate-400 mb-1">Target Domain</label>
                          <select
                            value={bulkQDomain}
                            onChange={(e: any) => setBulkQDomain(e.target.value as QuizDomainOption)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
                          >
                            <option value="DATA_SCIENCE">Data Science</option>
                            <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Target Track</label>
                          <select
                            value={bulkQTrack}
                            onChange={(e: any) => setBulkQTrack(e.target.value as QuizTrackOption)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
                          >
                            <option value="INTERNSHIP">Internship</option>
                            <option value="SOFTWARE_DEVELOPMENT">Full-Time Placement</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Import Mode</label>
                          <select
                            value={bulkQMode}
                            onChange={(e: any) => setBulkQMode(e.target.value as "APPEND" | "REPLACE")}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
                          >
                            <option value="APPEND">Append to Selected Bank</option>
                            <option value="REPLACE">Replace Selected Bank</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-slate-300 font-medium">
                          1. Upload CSV or Excel Spreadsheet (.csv, .xlsx, .xls)
                        </label>
                        <input
                          type="file"
                          accept=".csv,.tsv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                          disabled={bulkImporting}
                          onChange={handleQuestionBankFileUpload}
                          className="w-full bg-slate-900 border border-dashed border-indigo-500/40 rounded-lg px-3 py-2 text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                        />
                      </div>

                      <form onSubmit={handleQuestionBankSheetUrlImport} className="space-y-1.5">
                        <label className="block text-slate-300 font-medium">
                          2. Or Paste Google Sheets / Spreadsheet Share Link
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={bulkSheetUrl}
                            onChange={(e: any) => setBulkSheetUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                          />
                          <button
                            type="submit"
                            disabled={bulkImporting}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold transition shrink-0"
                          >
                            {bulkImporting ? "Importing..." : "Sync Sheet Link"}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Supports Google Sheets share links (&ldquo;Anyone with the link can view&rdquo;) and direct .csv / .xlsx URLs. Optional Domain &amp; Track columns override target dropdowns per row.
                        </p>
                      </form>
                    </div>

                    {/* Right 5 Cols: Single Question Manual Entry */}
                    <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                      <h3 className="font-bold text-white">Add Single Question Manually</h3>
                      <form onSubmit={handleAddQuestionToBank} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 mb-1">Domain</label>
                            <select
                              value={qbDomain}
                              onChange={(e: any) => setQbDomain(e.target.value as QuizDomainOption)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
                            >
                              <option value="DATA_SCIENCE">Data Science</option>
                              <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Track</label>
                            <select
                              value={qbTrack}
                              onChange={(e: any) => setQbTrack(e.target.value as QuizTrackOption)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
                            >
                              <option value="INTERNSHIP">Internship</option>
                              <option value="SOFTWARE_DEVELOPMENT">Full-Time Placement</option>
                            </select>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={qbPrompt}
                          onChange={(e: any) => setQbPrompt(e.target.value)}
                          placeholder="Question prompt..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={qbOpt0}
                            onChange={(e: any) => setQbOpt0(e.target.value)}
                            placeholder="Option A"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                          />
                          <input
                            type="text"
                            value={qbOpt1}
                            onChange={(e: any) => setQbOpt1(e.target.value)}
                            placeholder="Option B"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                          />
                          <input
                            type="text"
                            value={qbOpt2}
                            onChange={(e: any) => setQbOpt2(e.target.value)}
                            placeholder="Option C"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                          />
                          <input
                            type="text"
                            value={qbOpt3}
                            onChange={(e: any) => setQbOpt3(e.target.value)}
                            placeholder="Option D"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Correct Answer:</span>
                            <select
                              value={qbCorrectIdx}
                              onChange={(e: any) => setQbCorrectIdx(Number(e.target.value))}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                            >
                              <option value={0}>Option A</option>
                              <option value={1}>Option B</option>
                              <option value={2}>Option C</option>
                              <option value={3}>Option D</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Question
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })()}

            {user.role === "STUDENT" && (
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
                    {(user.role === "STUDENT"
                      ? tracks.filter(
                          (t: any) =>
                            t.domain === studentTargetDomain &&
                            (studentApplyingTrack === "BOTH" || t.track === studentApplyingTrack)
                        )
                      : tracks
                    ).map((t: any) => {
                      const poolCount = questionBank.filter(
                        (q: any) => q.domain === t.domain && q.track === t.track
                      ).length;
                      const earned = badges.some((b: any) => b.courseCode === t.code);
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
                      {badges.map((b: any) => (
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
                        {activeTrack.modules.map((m: any) => (
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
                      {drawnQuestions.map((q: any, qIdx: number) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                        >
                          <p className="text-xs font-semibold text-slate-200">
                            Q{qIdx + 1} of {drawnQuestions.length}. {q.prompt}
                          </p>
                          <div className="space-y-1.5 pt-1">
                            {q.options.map((opt: any, optIdx: number) => (
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
                                    setQuizAnswers((prev: any) => ({ ...prev, [q.id]: optIdx }))
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
            )}

            {/* Final Stage: Examiner Interview Evaluation */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h2 className="font-semibold text-white">
                      {user.role === "EXAMINER" ? "1-on-1 Viva & Placement Readiness Evaluation" : "3. Final Stage: Examiner Interview & Placement Readiness Evaluation"}
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
                  {user.role !== "EXAMINER" ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                      <p className="font-semibold text-indigo-300">
                        {user.role === "STUDENT"
                          ? "Student View — Examiner Interview Rubric Locked"
                          : "Coordinator Governance View — Examiner Rubric Restricted to Approved Examiners"}
                      </p>
                      <p className="text-slate-400">
                        {user.role === "STUDENT"
                          ? "This evaluation rubric is restricted to the IITM Examiner panel. Once your 1-on-1 readiness interview is completed and marked 'Placement Ready', your scorecard and job applications will unlock automatically."
                          : "Live 1-on-1 competency scoring and Placement Ready sign-offs can only be submitted by an approved IITM Examiner. Completed verdicts sync automatically to the ledger on the right."}
                      </p>
                    </div>
                  ) : (
                    <>
                    <div className="mb-4 p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-indigo-300 block">
                            Scheduled 1-on-1 Viva Slots (Synced from Training Coordinator)
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Select a scheduled student slot below to conduct &amp; publish feedback directly to their dashboard
                          </span>
                        </div>
                        {user.role !== "EXAMINER" && (
                          <div className="flex gap-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setExaminerSlotScope("MINE")}
                              className={`px-2.5 py-1 rounded-lg font-semibold ${
                                examinerSlotScope === "MINE"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-900 text-slate-400"
                              }`}
                            >
                              My Slots
                            </button>
                            <button
                              type="button"
                              onClick={() => setExaminerSlotScope("ALL")}
                              className={`px-2.5 py-1 rounded-lg font-semibold ${
                                examinerSlotScope === "ALL"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-900 text-slate-400"
                              }`}
                            >
                              All Slots ({effectiveOneOnOneSlots.length})
                            </button>
                          </div>
                        )}
                      </div>

                      {(() => {
                        const visibleSlots = effectiveOneOnOneSlots.filter((s: any) => {
                          if (user.role !== "EXAMINER" && examinerSlotScope === "ALL") return true;
                          const inst = String(s.instructor || "").toLowerCase();
                          const uName = String(user.name || "").toLowerCase();
                          const uPrefix = String(user.email || "").split("@")[0].toLowerCase();
                          return (
                            (uName && (inst.includes(uName) || uName.includes(inst))) ||
                            (uPrefix && inst.includes(uPrefix))
                          );
                        });
                        const listToRender = visibleSlots;
                        return listToRender.length === 0 ? (
                          <p className="text-slate-400 text-[11px]">No 1-on-1 slots scheduled yet.</p>
                        ) : (
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {listToRender.map((slot: any) => {
                              const isSelected = selectedSlotIdForEval === slot.id;
                              return (
                                <div
                                  key={slot.id}
                                  className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 ${
                                    isSelected
                                      ? "bg-indigo-600/15 border-indigo-500/60"
                                      : "bg-slate-900/90 border-slate-800"
                                  }`}
                                >
                                  <div>
                                    <span className="font-semibold text-white">
                                      {slot.studentName}
                                    </span>{" "}
                                    <span className="text-[11px] font-mono text-slate-400">
                                      ({slot.studentEmail})
                                    </span>
                                    <div className="text-[11px] text-slate-300 mt-0.5">
                                      {slot.date} • <span className="text-cyan-300">{slot.slotTime}</span> • Instructor: <span className="text-indigo-300">{slot.instructor}</span>
                                    </div>
                                    {(() => {
                                      const candReg = (registrations || []).find(
                                        (r: any) =>
                                          r.role === "STUDENT" &&
                                          String(r.email || "").toLowerCase() === String(slot.studentEmail || "").toLowerCase()
                                      );
                                      if (!candReg) return null;
                                      const det = candReg.studentProfileDetails;
                                      return (
                                        <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                                            {det
                                              ? `${det.programLevel} • Track: ${det.applyingTrack} • ${det.targetDomain} • CGPA ${det.cgpa || "N/A"}`
                                              : candReg.orgOrDept}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        slot.status === "COMPLETED"
                                          ? "bg-emerald-500/20 text-emerald-300"
                                          : "bg-amber-500/20 text-amber-300"
                                      }`}
                                    >
                                      {slot.status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSlotIdForEval(slot.id);
                                        if (slot.studentEmail) {
                                          setCoordTargetRoll(slot.studentEmail.split("@")[0].trim().toUpperCase());
                                        }
                                        setExaminerNotes("");
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold"
                                    >
                                      {isSelected ? "Evaluating ✓" : slot.status === "COMPLETED" ? "Re-Evaluate" : "Conduct 1-on-1"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

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
                          onChange={(e: any) => setEvalSkillsets(e.target.value)}
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
                            onChange={(e: any) => setProgRating(Number(e.target.value))}
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
                            onChange={(e: any) => setDsRating(Number(e.target.value))}
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
                            onChange={(e: any) => setCommRating(Number(e.target.value))}
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
                            onChange={(e: any) => setPerformingExceptionallyGood(e.target.checked)}
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
                            onChange={(e: any) => setRemedialTasksText(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-500/40 text-slate-100"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-400 mb-1">Examiner Remarks</label>
                        <input
                          type="text"
                          value={examinerNotes}
                          onChange={(e: any) => setExaminerNotes(e.target.value)}
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
                    </>
                  )}
                </div>

                <div className="lg:col-span-6 space-y-3">
                  {(() => {
                    const activeRoll = String(resolveActiveStudentRoll() || user.email.split("@")[0]).trim().toUpperCase();
                    const myEmailLower = user.email.trim().toLowerCase();
                    const seenRolls = new Set<string>();
                    const uniqueEvaluations = evaluations.filter((ev: any) => {
                      const r = String(ev.studentRoll || "").trim().toUpperCase();
                      if (!r) return true;
                      if (seenRolls.has(r)) return false;
                      seenRolls.add(r);
                      return true;
                    });
                    const visibleEvaluations =
                      user.role === "STUDENT"
                        ? uniqueEvaluations.filter(
                            (ev: any) =>
                              String(ev.studentRoll || "").trim().toUpperCase() === activeRoll ||
                              String(ev.studentEmail || "").trim().toLowerCase() === myEmailLower
                          )
                        : user.role === "EXAMINER"
                        ? uniqueEvaluations.filter(
                            (ev: any) =>
                              String(ev.examinerEmail || "").trim().toLowerCase() === myEmailLower
                          )
                        : uniqueEvaluations;

                    return (
                      <>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {user.role === "STUDENT"
                            ? `Your Recorded Examiner Viva Evaluations (${visibleEvaluations.length})`
                            : user.role === "EXAMINER"
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
                          visibleEvaluations.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80">
                          <div>
                            <div className="font-bold text-white text-xs">
                              {(() => {
                                const cleanRoll = String(ev.studentRoll || "").trim().toUpperCase();
                                const matchedSlot = oneOnOneSlots.find(
                                  (s: any) =>
                                    String(s.studentEmail || "").split("@")[0].trim().toUpperCase() === cleanRoll
                                );
                                return matchedSlot
                                  ? `${matchedSlot.studentName} • ${cleanRoll} (${matchedSlot.studentEmail})`
                                  : cleanRoll || "Candidate";
                              })()}
                            </div>
                            {ev.examinerEmail && (
                              <div className="text-[11px] text-slate-400">
                                Evaluated by: <span className="text-indigo-300 font-mono">{ev.examinerEmail}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">{ev.evaluatedAt}</span>
                        </div>

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
                        {ev.notes && (
                          <div className="text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 font-semibold">Examiner Remarks: </span>
                            {ev.notes}
                          </div>
                        )}

                        {!ev.isPlacementReady && ev.remedialTasks.length > 0 && (
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <p className="font-semibold text-amber-300 mb-1">
                              Assigned Tasks Before Placement Readiness:
                            </p>
                            <ul className="list-disc list-inside text-amber-100/90 space-y-0.5">
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
                </div>
              </div>
            </div>
          </div>
    </>
  );
}
