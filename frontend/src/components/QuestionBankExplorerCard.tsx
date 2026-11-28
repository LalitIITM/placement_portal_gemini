import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  BankQuestionItem,
  QuizDomainOption,
  QuizTrackOption,
} from "../types/portal";

interface QuestionBankExplorerCardProps {
  questionBank: BankQuestionItem[];
  onAddQuestion?: (item: Omit<BankQuestionItem, "id">) => void;
  onUpdateQuestion: (item: BankQuestionItem) => void;
  onDeleteQuestion: (id: string) => void;
  onDownloadCsv: (domainFilter: string, trackFilter: string) => void;
  title?: string;
  subtitle?: string;
  showCreateButton?: boolean;
}

const POOL_TABS: Array<{
  key: string;
  label: string;
  domain: string;
  track: string;
}> = [
  { key: "ALL", label: "All 4 Banks", domain: "ALL", track: "ALL" },
  { key: "DS_INT", label: "DS • Internship", domain: "DATA_SCIENCE", track: "INTERNSHIP" },
  { key: "DS_FT", label: "DS • Full-Time", domain: "DATA_SCIENCE", track: "SOFTWARE_DEVELOPMENT" },
  { key: "SD_INT", label: "SD • Internship", domain: "SOFTWARE_DEVELOPMENT", track: "INTERNSHIP" },
  { key: "SD_FT", label: "SD • Full-Time", domain: "SOFTWARE_DEVELOPMENT", track: "SOFTWARE_DEVELOPMENT" },
];

export default function QuestionBankExplorerCard({
  questionBank,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onDownloadCsv,
  title = "Complete Question Bank Explorer & CRUD Manager",
  subtitle = "Inspect, search, edit, add, delete, and export questions across all 4 assessment banks.",
  showCreateButton = true,
}: QuestionBankExplorerCardProps) {
  const [selectedPoolKey, setSelectedPoolKey] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<BankQuestionItem | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newDomain, setNewDomain] = useState<QuizDomainOption>("DATA_SCIENCE");
  const [newTrack, setNewTrack] = useState<QuizTrackOption>("INTERNSHIP");
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [newOpts, setNewOpts] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [newCorrectIdx, setNewCorrectIdx] = useState<number>(0);

  const activePool = POOL_TABS.find((t) => t.key === selectedPoolKey) || POOL_TABS[0];

  const filteredQuestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return questionBank.filter((item) => {
      if (activePool.domain !== "ALL" && item.domain !== activePool.domain) return false;
      if (activePool.track !== "ALL" && item.track !== activePool.track) return false;
      if (!q) return true;
      return (
        item.prompt.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.options.some((opt) => opt.toLowerCase().includes(q))
      );
    });
  }, [questionBank, activePool, searchQuery]);

  const startEdit = (item: BankQuestionItem) => {
    setEditingId(item.id);
    setEditDraft({
      ...item,
      options: [...item.options],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = () => {
    if (!editDraft) return;
    const trimmedPrompt = editDraft.prompt.trim();
    const trimmedOpts = editDraft.options.map((o) => o.trim());
    if (!trimmedPrompt || trimmedOpts.some((o) => !o)) return;
    onUpdateQuestion({
      ...editDraft,
      prompt: trimmedPrompt,
      options: trimmedOpts,
    });
    setEditingId(null);
    setEditDraft(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddQuestion) return;
    const trimmedPrompt = newPrompt.trim();
    const trimmedOpts = newOpts.map((o) => o.trim());
    if (!trimmedPrompt || trimmedOpts.some((o) => !o)) return;
    onAddQuestion({
      domain: newDomain,
      track: newTrack,
      prompt: trimmedPrompt,
      options: trimmedOpts,
      correctIndex: newCorrectIdx,
    });
    setNewPrompt("");
    setNewOpts(["", "", "", ""]);
    setNewCorrectIdx(0);
    setIsCreating(false);
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showCreateButton && onAddQuestion && (
            <button
              type="button"
              onClick={() => setIsCreating((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              {isCreating ? "Close Form" : "New Question"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDownloadCsv(activePool.domain, activePool.track)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download {activePool.key === "ALL" ? `All (${questionBank.length})` : `Filtered (${filteredQuestions.length})`} CSV
          </button>
        </div>
      </div>

      {isCreating && onAddQuestion && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-4 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-3 text-xs"
        >
          <div className="font-semibold text-indigo-300">Add New Question to Bank</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value as QuizDomainOption)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
            >
              <option value="DATA_SCIENCE">Data Science</option>
              <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
            </select>
            <select
              value={newTrack}
              onChange={(e) => setNewTrack(e.target.value as QuizTrackOption)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
            >
              <option value="INTERNSHIP">Internship</option>
              <option value="SOFTWARE_DEVELOPMENT">Full-Time Placement</option>
            </select>
            <select
              value={newCorrectIdx}
              onChange={(e) => setNewCorrectIdx(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
            >
              <option value={0}>Correct: Option A</option>
              <option value={1}>Correct: Option B</option>
              <option value={2}>Correct: Option C</option>
              <option value={3}>Correct: Option D</option>
            </select>
          </div>
          <input
            type="text"
            required
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Enter question prompt..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(["Option A", "Option B", "Option C", "Option D"] as const).map((ph, idx) => (
              <input
                key={ph}
                type="text"
                required
                value={newOpts[idx]}
                onChange={(e) => {
                  const next: [string, string, string, string] = [...newOpts] as [string, string, string, string];
                  next[idx] = e.target.value;
                  setNewOpts(next);
                }}
                placeholder={ph}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              Save Question
            </button>
          </div>
        </form>
      )}

      {/* Pool Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          {POOL_TABS.map((tab) => {
            const cnt = questionBank.filter((item) => {
              if (tab.domain !== "ALL" && item.domain !== tab.domain) return false;
              if (tab.track !== "ALL" && item.track !== tab.track) return false;
              return true;
            }).length;
            const active = selectedPoolKey === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedPoolKey(tab.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                  active
                    ? "bg-indigo-600/25 border-indigo-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label} ({cnt})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or options..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Scrollable Question List with Inline Edit & Delete */}
      <div className="max-h-[460px] overflow-y-auto space-y-2.5 pr-1">
        {filteredQuestions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No questions match the current bank filter or search query.
          </div>
        ) : (
          filteredQuestions.map((q, index) => {
            const isEditing = editingId === q.id && editDraft !== null;
            return (
              <div
                key={q.id}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-2.5 text-xs"
              >
                {isEditing && editDraft ? (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-indigo-300">Editing {q.id}</span>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={editDraft.domain}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, domain: e.target.value as QuizDomainOption })
                          }
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                        >
                          <option value="DATA_SCIENCE">Data Science</option>
                          <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                        </select>
                        <select
                          value={editDraft.track}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, track: e.target.value as QuizTrackOption })
                          }
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                        >
                          <option value="INTERNSHIP">Internship</option>
                          <option value="SOFTWARE_DEVELOPMENT">Full-Time Placement</option>
                        </select>
                        <select
                          value={editDraft.correctIndex}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, correctIndex: Number(e.target.value) })
                          }
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-300"
                        >
                          <option value={0}>Correct: A</option>
                          <option value={1}>Correct: B</option>
                          <option value={2}>Correct: C</option>
                          <option value={3}>Correct: D</option>
                        </select>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={editDraft.prompt}
                      onChange={(e) => setEditDraft({ ...editDraft, prompt: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {editDraft.options.map((opt, optIdx) => (
                        <input
                          key={optIdx}
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updatedOpts = [...editDraft.options];
                            updatedOpts[optIdx] = e.target.value;
                            setEditDraft({ ...editDraft, options: updatedOpts });
                          }}
                          className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                        />
                      ))}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-500">#{index + 1}</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-semibold text-[11px]">
                          {q.domain === "DATA_SCIENCE" ? "Data Science" : "Software Dev"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-semibold text-[11px]">
                          {q.track === "INTERNSHIP" ? "Internship" : "Full-Time Placement"}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">{q.id}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(q)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition"
                          title="Edit question"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteQuestion(q.id)}
                          className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center gap-1 transition"
                          title="Delete question"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>

                    <div className="font-medium text-slate-100 leading-relaxed">{q.prompt}</div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = optIdx === q.correctIndex;
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <div
                            key={optIdx}
                            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${
                              isCorrect
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold"
                                : "bg-slate-950/70 border-slate-800/80 text-slate-400"
                            }`}
                          >
                            <span className="font-mono text-[11px]">{letter}.</span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
