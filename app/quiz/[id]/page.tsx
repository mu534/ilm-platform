"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FiArrowLeft, FiClock, FiCheck, FiX } from "react-icons/fi";

interface QuizQuestion {
  id:       string;
  question: string;
  type:     "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options:  string[];
  order:    number;
  points:   number;
}

interface Quiz {
  id:           string;
  title:        string;
  description:  string | null;
  passingScore: number;
  timeLimit:    number | null;
  questions:    QuizQuestion[];
  module: {
    id:    string;
    title: string;
    course: { id: string; title: string; slug: string };
  };
}

interface AttemptResult {
  score:        number;
  passed:       boolean;
  earnedPoints: number;
  totalPoints:  number;
}

export default function QuizPage() {
  const router  = useRouter();
  const { id }  = useParams<{ id: string }>();
  const { data: session, status } = useSession();

  const [quiz,      setQuiz]      = useState<Quiz | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [answers,   setAnswers]   = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result,    setResult]    = useState<AttemptResult | null>(null);
  const [timeLeft,  setTimeLeft]  = useState<number | null>(null);
  const [started,   setStarted]   = useState(false);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") router.push(`/login?callbackUrl=/quiz/${id}`);
  }, [status, router, id]);

  // Load quiz
  useEffect(() => {
    if (!id) return;
    fetch(`/api/quizzes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setQuiz(d.data);
          if (d.data.timeLimit) setTimeLeft(d.data.timeLimit * 60);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Timer
  useEffect(() => {
    if (!started || timeLeft === null || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current);
          void handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, result]);

  const handleSubmit = async () => {
    if (submitting || !quiz) return;
    clearInterval(timerRef.current);
    setSubmitting(true);

    const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    const timeTaken = quiz.timeLimit
      ? quiz.timeLimit * 60 - (timeLeft ?? 0)
      : undefined;

    try {
      const res  = await fetch(`/api/quizzes/${id}/attempt`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ answers: answersArray, timeTaken }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading || status === "loading") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        {[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-[var(--text-muted)]">Quiz not found.</p>
        <Link href="/courses" className="text-[var(--accent)] text-sm mt-2 inline-block">Back to Courses</Link>
      </div>
    );
  }

  // ── Result screen ────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className={`glass-card rounded-3xl p-10 border ${result.passed ? "border-emerald-500/30" : "border-red-500/20"}`}>
          <div className={`text-6xl mb-4 ${result.passed ? "text-emerald-400" : "text-red-400"}`}>
            {result.passed ? "🎉" : "📚"}
          </div>
          <h2 className="font-display text-3xl font-bold text-[var(--text-primary)] mb-2">
            {result.passed ? "Congratulations!" : "Keep Trying"}
          </h2>
          <p className="text-[var(--text-muted)] mb-8">
            {result.passed
              ? "You passed the quiz. Great work!"
              : `You need ${quiz.passingScore}% to pass. Review the material and try again.`}
          </p>

          <div className="flex justify-center gap-8 mb-8">
            <div>
              <div className={`font-display text-4xl font-bold ${result.passed ? "text-emerald-400" : "text-red-400"}`}>
                {Math.round(result.score)}%
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Your Score</div>
            </div>
            <div>
              <div className="font-display text-4xl font-bold text-[var(--text-primary)]">
                {quiz.passingScore}%
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Pass Mark</div>
            </div>
            <div>
              <div className="font-display text-4xl font-bold text-[var(--accent)]">
                {result.earnedPoints}/{result.totalPoints}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Points</div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Link
              href={`/courses/${quiz.module.course.slug}`}
              className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Back to Course
            </Link>
            {!result.passed && (
              <button
                onClick={() => { setResult(null); setAnswers({}); setStarted(false); if (quiz.timeLimit) setTimeLeft(quiz.timeLimit * 60); }}
                className="px-5 py-2.5 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl text-sm transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Start screen ─────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <Link href={`/courses/${quiz.module.course.slug}`} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-8">
          <FiArrowLeft size={14} /> Back to Course
        </Link>

        <div className="glass-card rounded-2xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">{quiz.title}</h1>
          <p className="text-[var(--text-muted)] text-sm mb-6">{quiz.description}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <div className="font-display text-2xl font-bold text-[var(--text-primary)]">{quiz.questions.length}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Questions</div>
            </div>
            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <div className="font-display text-2xl font-bold text-[var(--text-primary)]">{quiz.passingScore}%</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Pass Mark</div>
            </div>
            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <div className="font-display text-2xl font-bold text-[var(--text-primary)]">
                {quiz.timeLimit ? `${quiz.timeLimit}m` : "∞"}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Time Limit</div>
            </div>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold transition-all hover:scale-105"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────────
  const answered = Object.keys(answers).length;
  const total    = quiz.questions.length;
  const progress = total > 0 ? (answered / total) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">{quiz.title}</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{answered}/{total} answered</p>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-medium ${
            timeLeft < 60 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)]"
          }`}>
            <FiClock size={13} /> {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full mb-8">
        <div className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="glass-card rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] text-xs font-bold">
                {idx + 1}
              </span>
              <p className="text-[var(--text-primary)] text-sm font-medium leading-relaxed">{q.question}</p>
            </div>

            {q.type === "TRUE_FALSE" ? (
              <div className="flex gap-3 pl-10">
                {["true", "false"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      answers[q.id] === opt
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {opt === "true" ? "✓ True" : "✗ False"}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pl-10">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(oi) }))}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                      answers[q.id] === String(oi)
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
                    }`}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span> {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || answered === 0}
          className="flex-1 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting…" : `Submit Quiz (${answered}/${total} answered)`}
        </button>
      </div>
    </div>
  );
}
