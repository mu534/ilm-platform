"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft, FiPlus, FiTrash2, FiSave,
  FiCheckCircle, FiLoader, FiEdit2,
} from "react-icons/fi";

interface Question {
  id:            string;
  question:      string;
  type:          "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options:       string[];
  correctAnswer: string;
  explanation:   string | null;
  order:         number;
  points:        number;
}

interface Quiz {
  id:           string;
  title:        string;
  description:  string | null;
  passingScore: number;
  timeLimit:    number | null;
  questions:    Question[];
  _count:       { questions: number; attempts: number };
  module: {
    id: string; title: string;
    course: { id: string; title: string; slug: string };
  };
}

const ic = "w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";

// ── Question form ─────────────────────────────────────────────────────────────
function QuestionForm({
  quizId,
  initial,
  onSave,
  onCancel,
}: {
  quizId:   string;
  initial?: Question;
  onSave:   () => void;
  onCancel: () => void;
}) {
  const [type,     setType]     = useState<"MULTIPLE_CHOICE" | "TRUE_FALSE">(initial?.type ?? "MULTIPLE_CHOICE");
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [options,  setOptions]  = useState<string[]>(initial?.options ?? ["", "", "", ""]);
  const [correct,  setCorrect]  = useState(initial?.correctAnswer ?? "0");
  const [explain,  setExplain]  = useState(initial?.explanation ?? "");
  const [points,   setPoints]   = useState(initial?.points ?? 1);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) { setErr("Question text is required"); return; }
    setSaving(true); setErr("");

    const payload = {
      question: question.trim(),
      type,
      options: type === "TRUE_FALSE" ? ["true", "false"] : options.filter(Boolean),
      correctAnswer: correct,
      explanation: explain.trim() || undefined,
      points,
      order: initial?.order ?? 0,
    };

    try {
      const res = initial
        ? await fetch(`/api/quiz-questions/${initial.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          })
        : await fetch(`/api/quizzes/${quizId}/questions`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!data.success) { setErr(data.error ?? "Failed to save question"); return; }
      onSave();
    } catch { setErr("Something went wrong"); }
    finally   { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="glass-card rounded-xl p-5 border border-[var(--border-strong)] space-y-4">
      {/* Question text */}
      <div>
        <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Question *</label>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className={ic} rows={2} placeholder="Enter the question…" autoFocus />
      </div>

      {/* Type toggle */}
      <div className="flex gap-2">
        {(["MULTIPLE_CHOICE", "TRUE_FALSE"] as const).map((t) => (
          <button key={t} type="button" onClick={() => { setType(t); setCorrect(t === "TRUE_FALSE" ? "true" : "0"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${type === t ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
            {t === "MULTIPLE_CHOICE" ? "Multiple Choice" : "True / False"}
          </button>
        ))}
      </div>

      {/* Options */}
      {type === "MULTIPLE_CHOICE" ? (
        <div className="space-y-2">
          <label className="block text-xs text-[var(--text-muted)] font-medium">Answer Options</label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                value={String(i)}
                checked={correct === String(i)}
                onChange={() => setCorrect(String(i))}
                className="accent-[var(--accent)] flex-shrink-0"
                title="Mark as correct answer"
              />
              <input
                value={opt}
                onChange={(e) => { const a = [...options]; a[i] = e.target.value; setOptions(a); }}
                className={ic}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
              />
            </div>
          ))}
          <p className="text-xs text-[var(--text-muted)]">Select the radio button next to the correct answer.</p>
        </div>
      ) : (
        <div className="flex gap-3">
          {(["true", "false"] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="tf" value={v} checked={correct === v} onChange={() => setCorrect(v)} className="accent-[var(--accent)]" />
              <span className="text-sm text-[var(--text-secondary)] capitalize">{v}</span>
            </label>
          ))}
        </div>
      )}

      {/* Points + explanation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Points</label>
          <input type="number" min="1" max="10" value={points} onChange={(e) => setPoints(Number(e.target.value))} className={ic} />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Explanation (optional)</label>
          <input value={explain} onChange={(e) => setExplain(e.target.value)} className={ic} placeholder="Show after answering…" />
        </div>
      </div>

      {err && <p className="text-xs text-red-400">{err}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-xs px-4 py-2">
          {saving ? <FiLoader className="animate-spin" size={13} /> : <FiSave size={13} />}
          {saving ? "Saving…" : initial ? "Update Question" : "Add Question"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs px-4 py-2">Cancel</button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ModuleQuizPage() {
  const { id: moduleId } = useParams<{ id: string }>();
  const router = useRouter();

  const [quiz,    setQuiz]    = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingQ, setAddingQ] = useState(false);
  const [editingQ, setEditingQ] = useState<string | null>(null);

  // Quiz settings form
  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [passing,  setPassing]  = useState(70);
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaMsg,    setMetaMsg]    = useState("");

  const load = useCallback(async () => {
    if (!moduleId) return;
    const res  = await fetch(`/api/quizzes?moduleId=${moduleId}`);
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      const quizId = data.data[0].id;
      const qRes   = await fetch(`/api/quizzes/${quizId}`);
      const qData  = await qRes.json();
      if (qData.success) {
        setQuiz(qData.data);
        setTitle(qData.data.title);
        setDesc(qData.data.description ?? "");
        setPassing(qData.data.passingScore);
        setTimeLimit(qData.data.timeLimit ? String(qData.data.timeLimit) : "");
      }
    } else {
      setQuiz(null);
    }
    setLoading(false);
  }, [moduleId]);

  useEffect(() => { void load(); }, [load]);

  const createQuiz = async () => {
    if (!title.trim()) return;
    setSavingMeta(true);
    try {
      const res  = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || undefined,
          moduleId,
          passingScore: passing,
          timeLimit: timeLimit ? Number(timeLimit) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) { setMetaMsg("Quiz created!"); void load(); }
    } finally { setSavingMeta(false); }
  };

  const updateQuizMeta = async () => {
    if (!quiz) return;
    setSavingMeta(true);
    try {
      await fetch(`/api/quizzes/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description: desc || undefined, passingScore: passing,
          timeLimit: timeLimit ? Number(timeLimit) : null, moduleId,
        }),
      });
      setMetaMsg("Saved!"); setTimeout(() => setMetaMsg(""), 2000);
      void load();
    } finally { setSavingMeta(false); }
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/quiz-questions/${qId}`, { method: "DELETE" });
    void load();
  };

  if (loading) {
    return <div className="p-8 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-12 shimmer rounded-xl" />)}</div>;
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl">

      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-3">
          <FiArrowLeft size={12} /> Back to Course Builder
        </button>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          {quiz ? "Module Quiz" : "Create Quiz"}
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          {quiz ? `${quiz._count.questions} questions · ${quiz._count.attempts} attempts` : "No quiz yet for this module"}
        </p>
      </div>

      {/* Quiz settings */}
      <section className="glass-card rounded-2xl p-5 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Quiz Settings</h2>
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={ic} placeholder="Quiz title" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className={ic} placeholder="Optional description" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Passing Score (%)</label>
            <input type="number" min="1" max="100" value={passing} onChange={(e) => setPassing(Number(e.target.value))} className={ic} />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Time Limit (min, blank = none)</label>
            <input type="number" min="1" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className={ic} placeholder="No limit" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={quiz ? updateQuizMeta : createQuiz}
            disabled={savingMeta || !title.trim()}
            className="btn-primary text-sm"
          >
            {savingMeta ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
            {savingMeta ? "Saving…" : quiz ? "Save Settings" : "Create Quiz"}
          </button>
          {metaMsg && <span className="text-xs text-emerald-400 flex items-center gap-1"><FiCheckCircle size={12} /> {metaMsg}</span>}
        </div>
      </section>

      {/* Questions list */}
      {quiz && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Questions ({quiz._count.questions})</h2>
            <button onClick={() => setAddingQ(true)} disabled={addingQ} className="btn-primary text-xs px-3 py-1.5">
              <FiPlus size={12} /> Add Question
            </button>
          </div>

          {addingQ && (
            <div className="mb-4">
              <QuestionForm
                quizId={quiz.id}
                onSave={() => { setAddingQ(false); void load(); }}
                onCancel={() => setAddingQ(false)}
              />
            </div>
          )}

          {quiz.questions.length === 0 && !addingQ ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-[var(--text-muted)] text-sm">No questions yet. Add your first question above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quiz.questions.map((q, i) => (
                <div key={q.id} className="glass-card rounded-xl p-4 border border-[var(--border)]">
                  {editingQ === q.id ? (
                    <QuestionForm
                      quizId={quiz.id}
                      initial={q}
                      onSave={() => { setEditingQ(null); void load(); }}
                      onCancel={() => setEditingQ(null)}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{q.question}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs tag">{q.type === "TRUE_FALSE" ? "True/False" : "MC"}</span>
                          <span className="text-xs text-[var(--text-muted)]">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                          {q.explanation && (
                            <span className="text-xs text-[var(--text-muted)] italic truncate max-w-[200px]">
                              Hint: {q.explanation}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setEditingQ(q.id)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors">
                          <FiEdit2 size={12} />
                        </button>
                        <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {quiz._count.questions > 0 && (
            <div className="mt-4 p-3 glass-card rounded-xl text-sm text-[var(--text-muted)] flex items-center justify-between">
              <span>Students take this quiz at: <span className="text-[var(--accent)]">/quiz/{quiz.id}</span></span>
              <Link href={`/quiz/${quiz.id}`} target="_blank" className="text-[var(--accent)] hover:text-[var(--accent-light)] text-xs transition-colors">
                Preview →
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
