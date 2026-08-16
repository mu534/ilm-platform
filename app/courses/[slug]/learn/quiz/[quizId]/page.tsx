"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  FiClock, FiCheck, FiX, FiAward, FiArrowLeft,
  FiArrowRight, FiRotateCcw, FiHelpCircle, FiCheckCircle,
  FiBookOpen, FiAlertCircle
} from "react-icons/fi";

interface QuizQuestion {
  id:          string;
  question:    string;
  type:        "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options:     string[];
  order:       number;
  points:      number;
}

interface Quiz {
  id:           string;
  title:        string;
  description:  string | null;
  passingScore: number;
  timeLimit:    number | null;
  questions:    QuizQuestion[];
  module: {
    id:     string;
    title:  string;
    order:  number;
    course: { id: string; title: string; slug: string };
  };
}

interface AttemptResult {
  score:        number;
  passed:       boolean;
  earnedPoints: number;
  totalPoints:  number;
}

export default function ClassroomQuizPage() {
  const router = useRouter();
  const params = useParams();
  const slug   = params?.slug as string;
  const quizId = (params?.quizId ?? params?.id) as string;

  const [quiz,        setQuiz]        = useState<Quiz | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [answers,     setAnswers]     = useState<Record<string, string>>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [result,      setResult]      = useState<AttemptResult | null>(null);
  const [timeLeft,    setTimeLeft]    = useState<number | null>(null);
  const [started,     setStarted]     = useState(false);
  const [nextHref,    setNextHref]    = useState<string | null>(null);
  const [nextLabel,   setNextLabel]   = useState<string>("Continue Learning");
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load quiz data
  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/quizzes/${quizId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setQuiz(d.data);
          if (d.data.timeLimit) setTimeLeft(d.data.timeLimit * 60);
        } else {
          setError(d.error || "Failed to load quiz");
        }
      })
      .catch(() => setError("Network error loading quiz"))
      .finally(() => setLoading(false));
  }, [quizId]);

  // After quiz is loaded, resolve what comes after it
  useEffect(() => {
    if (!quiz) return;
    const courseSlug = slug || quiz.module.course.slug;
    const courseId   = quiz.module.course.id;

    // Ask the curriculum API what the next step is after this quiz's module
    fetch(`/api/courses/${courseId}/curriculum`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.data) return;
        const modules: {
          id: string; order: number;
          lectures: { slug: string; title: string }[];
          quizzes:  { id: string }[];
        }[] = d.data.modules;

        // Find the module that owns this quiz
        const modIndex = modules.findIndex((m) =>
          m.quizzes?.some((q) => q.id === quizId)
        );

        if (modIndex === -1) return;

        // Look for the NEXT module that has lectures
        const nextModule = modules.slice(modIndex + 1).find((m) => m.lectures.length > 0);

        if (nextModule && nextModule.lectures[0]) {
          setNextHref(`/courses/${courseSlug}/learn/${nextModule.lectures[0].slug}`);
          setNextLabel(`Continue to Next Module`);
        } else if (!nextModule) {
          // This was the last module's quiz — go to completion page
          setNextHref(`/courses/${courseSlug}/complete`);
          setNextLabel("Finish Course & Claim Certificate");
        }
      })
      .catch(() => {/* silent — fallback to course hub */});
  }, [quiz, quizId, slug]);

  const handleSubmit = useCallback(async () => {
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
      const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ answers: answersArray, timeTaken }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "Failed to submit quiz attempt");
      }
    } catch {
      setError("An error occurred while submitting your attempt.");
    } finally {
      setSubmitting(false);
    }
  }, [quiz, quizId, submitting, answers, timeLeft]);

  // Timer countdown
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
  }, [started, result, handleSubmit, timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
    setStarted(false);
    if (quiz?.timeLimit) setTimeLeft(quiz.timeLimit * 60);
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto p-6 sm:p-10 max-w-3xl mx-auto w-full space-y-6">
        <div className="h-8 w-1/3 rounded-xl shimmer" />
        <div className="h-4 w-2/3 rounded shimmer" />
        <div className="h-48 rounded-2xl shimmer" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle size={22} />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Quiz Unavailable</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {error || "The requested quiz could not be loaded."}
          </p>
          <Link
            href={`/courses/${slug || quiz?.module?.course?.slug || ""}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <FiArrowLeft size={14} /> Back to Course
          </Link>
        </div>
      </div>
    );
  }

  const courseSlug = slug || quiz.module.course.slug;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary)]">
      
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 sm:px-6">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/courses/${courseSlug}`}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex-shrink-0"
            >
              <FiBookOpen size={12} />
              <span className="hidden sm:inline truncate max-w-[140px]">{quiz.module.course.title}</span>
            </Link>
            <span className="text-[var(--border-strong)] text-xs">/</span>
            <span className="text-xs text-[var(--text-secondary)] font-medium truncate">
              {quiz.module.title}
            </span>
          </div>

          <Link
            href={`/courses/${courseSlug}`}
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] font-medium flex items-center gap-1 transition-colors flex-shrink-0"
          >
            <FiArrowLeft size={13} /> Back to Course
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-8">
        
        {/* ── RESULT SCREEN ─────────────────────────────────────────────────── */}
        {result ? (
          <div className="max-w-xl mx-auto py-8">
            <div className={`rounded-3xl p-8 sm:p-10 border text-center shadow-lg bg-[var(--bg-card)] ${
              result.passed
                ? "border-emerald-500/30 shadow-emerald-500/5"
                : "border-amber-500/30 shadow-amber-500/5"
            }`}>
              
              <div className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl shadow-inner ${
                result.passed
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              }`}>
                {result.passed ? "🎉" : "📖"}
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
                {result.passed ? "Quiz Passed! Excellent Work" : "Keep Learning & Try Again"}
              </h2>

              <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-8">
                {result.passed
                  ? `You scored ${Math.round(result.score)}% and exceeded the ${quiz.passingScore}% passing mark. ${nextHref?.includes("/complete") ? "You've completed all modules!" : "You can now continue to the next module."}`
                  : `You scored ${Math.round(result.score)}%. You need ${quiz.passingScore}% to pass. Review the lesson material and try again.`}
              </p>

              {/* Score breakdown metrics */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] mb-8">
                <div className="p-3">
                  <div className={`font-display text-3xl font-bold ${result.passed ? "text-emerald-400" : "text-amber-400"}`}>
                    {Math.round(result.score)}%
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium mt-1 uppercase tracking-wider">Your Score</div>
                </div>
                <div className="p-3 border-x border-[var(--border)]">
                  <div className="font-display text-3xl font-bold text-[var(--text-primary)]">
                    {quiz.passingScore}%
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium mt-1 uppercase tracking-wider">Passing Mark</div>
                </div>
                <div className="p-3">
                  <div className="font-display text-3xl font-bold text-[var(--accent)]">
                    {result.earnedPoints}/{result.totalPoints}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium mt-1 uppercase tracking-wider">Points</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {result.passed && nextHref ? (
                  /* PRIMARY: go to next module or completion page */
                  <Link
                    href={nextHref}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  >
                    {nextHref.includes("/complete") ? <FiAward size={16} /> : <FiArrowRight size={16} />}
                    <span>{nextLabel}</span>
                  </Link>
                ) : result.passed ? (
                  /* Fallback if curriculum not resolved yet */
                  <Link
                    href={`/courses/${courseSlug}`}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  >
                    <FiBookOpen size={16} /> Back to Course Hub
                  </Link>
                ) : (
                  /* FAILED — back to course to review */
                  <Link
                    href={`/courses/${courseSlug}`}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md bg-[var(--accent)] hover:bg-[var(--accent-light)]"
                  >
                    <FiBookOpen size={16} />
                    <span>Back to Course</span>
                  </Link>
                )}

                {!result.passed && (
                  <button
                    onClick={handleRetry}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[var(--border-strong)] hover:border-[var(--accent)] text-[var(--text-primary)] hover:bg-[var(--accent-dim)] text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <FiRotateCcw size={15} /> Retake Quiz
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : !started ? (
          
          /* ── START SCREEN ──────────────────────────────────────────────────── */
          <div className="max-w-xl mx-auto py-8">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 sm:p-10 text-center shadow-lg">
              
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <FiHelpCircle size={28} />
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full inline-block mb-3">
                Module Quiz
              </span>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">
                {quiz.title}
              </h1>

              {quiz.description && (
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8 max-w-md mx-auto">
                  {quiz.description}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl">
                  <div className="font-display text-2xl font-bold text-[var(--text-primary)]">{quiz.questions.length}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">Questions</div>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl">
                  <div className="font-display text-2xl font-bold text-[var(--text-primary)]">{quiz.passingScore}%</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">Pass Mark</div>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl">
                  <div className="font-display text-2xl font-bold text-[var(--text-primary)]">
                    {quiz.timeLimit ? `${quiz.timeLimit}m` : "∞"}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">Time Limit</div>
                </div>
              </div>

              <button
                onClick={() => setStarted(true)}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <span>Start Quiz</span>
                <FiArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (

          /* ── ACTIVE QUIZ SCREEN ────────────────────────────────────────────── */
          <div className="max-w-3xl mx-auto py-4">
            
            {/* Quiz progress header */}
            <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-[var(--border)]">
              <div>
                <h1 className="font-display text-lg sm:text-xl font-bold text-[var(--text-primary)]">{quiz.title}</h1>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {Object.keys(answers).length} of {quiz.questions.length} answered
                </p>
              </div>

              {timeLeft !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold ${
                  timeLeft < 60
                    ? "bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse"
                    : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]"
                }`}>
                  <FiClock size={14} /> {formatTime(timeLeft)}
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full mb-8 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${quiz.questions.length > 0 ? (Object.keys(answers).length / quiz.questions.length) * 100 : 0}%` }}
              />
            </div>

            {/* Questions List */}
            <div className="space-y-6 mb-8">
              {quiz.questions.map((q, idx) => (
                <div key={q.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm">
                  
                  {/* Question header */}
                  <div className="flex items-start gap-3 mb-5">
                    <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-relaxed">
                      {q.question}
                    </p>
                  </div>

                  {/* Options */}
                  {q.type === "TRUE_FALSE" ? (
                    <div className="grid grid-cols-2 gap-3 pl-10">
                      {[
                        { val: "true", label: "True", icon: <FiCheck size={14} /> },
                        { val: "false", label: "False", icon: <FiX size={14} /> },
                      ].map((opt) => {
                        const isSelected = answers[q.id] === opt.val;
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.val }))}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border ${
                              isSelected
                                ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                                : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-purple-500/50 hover:bg-[var(--bg-card-hover)]"
                            }`}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2.5 pl-10">
                      {q.options.map((opt, oi) => {
                        const optionKey = String(oi);
                        const isSelected = answers[q.id] === optionKey;
                        const letter = String.fromCharCode(65 + oi);

                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optionKey }))}
                            className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all border flex items-center gap-3 ${
                              isSelected
                                ? "bg-purple-600/10 border-purple-500 text-purple-400 shadow-sm"
                                : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-purple-500/40 hover:bg-[var(--bg-card-hover)]"
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                              isSelected
                                ? "bg-purple-600 text-white"
                                : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]"
                            }`}>
                              {letter}
                            </span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Bar */}
            <div className="sticky bottom-4 z-20 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {Object.keys(answers).length < quiz.questions.length ? (
                  <span className="text-amber-400">⚠️ {quiz.questions.length - Object.keys(answers).length} questions left</span>
                ) : (
                  <span className="text-emerald-400">✓ All questions answered</span>
                )}
              </span>

              <button
                onClick={() => void handleSubmit()}
                disabled={submitting || Object.keys(answers).length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? "Submitting…" : `Submit Quiz (${Object.keys(answers).length}/${quiz.questions.length})`}
                <FiCheckCircle size={15} />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
