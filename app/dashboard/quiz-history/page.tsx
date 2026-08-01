import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import { formatDate } from "../../utils/api";
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";
import type { SessionUser } from "../../types/auth.types";

export const metadata = { title: "Quiz History" };

export default async function QuizHistoryPage() {
  const session = await getServerSession(authOptions);
  const user    = session?.user as SessionUser | undefined;
  if (!user) redirect("/login?callbackUrl=/dashboard/quiz-history");

  const attempts = await prisma.quizAttempt.findMany({
    where:   { userId: user.id },
    orderBy: { completedAt: "desc" },
    include: {
      quiz: {
        select: {
          id: true, title: true, passingScore: true,
          module: {
            select: {
              id: true, title: true,
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      },
    },
  });

  const passed   = attempts.filter((a) => a.passed).length;
  const failed   = attempts.filter((a) => !a.passed).length;
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-3">
          <FiArrowLeft size={13} /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Quiz History</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">{attempts.length} attempts total</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Passed",    value: passed,   color: "text-emerald-400", icon: <FiCheckCircle size={18} /> },
          { label: "Failed",    value: failed,   color: "text-red-400",     icon: <FiXCircle size={18} /> },
          { label: "Avg Score", value: `${avgScore}%`, color: "text-[var(--accent)]", icon: <FiClock size={18} />, isString: true },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5">
            <div className={`text-xl mb-2 ${s.color}`}>{s.icon}</div>
            <div className="font-display text-2xl font-bold text-[var(--text-primary)]">
              {s.isString ? s.value : s.value}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Attempts list */}
      {attempts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-[var(--text-primary)] font-semibold mb-2">No quiz attempts yet</p>
          <p className="text-[var(--text-muted)] text-sm mb-6">Enroll in a course with quizzes to get started.</p>
          <Link href="/courses" className="btn-primary inline-flex text-sm">Browse Courses</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt) => (
            <div key={attempt.id} className="glass-card rounded-2xl p-5 flex items-start gap-4">
              {/* Pass/fail icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                attempt.passed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
              }`}>
                {attempt.passed
                  ? <FiCheckCircle className="text-emerald-400" size={18} />
                  : <FiXCircle     className="text-red-400"     size={18} />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {attempt.quiz.title}
                </p>
                {attempt.quiz.module?.course && (
                  <Link
                    href={`/courses/${attempt.quiz.module.course.slug}`}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
                  >
                    {attempt.quiz.module.course.title}
                  </Link>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {formatDate(attempt.completedAt)}
                  {attempt.timeTaken && ` · ${Math.floor(attempt.timeTaken / 60)}m ${attempt.timeTaken % 60}s`}
                </p>
              </div>

              {/* Score */}
              <div className="text-right flex-shrink-0">
                <div className={`font-display text-2xl font-bold ${
                  attempt.passed ? "text-emerald-400" : "text-red-400"
                }`}>
                  {Math.round(attempt.score)}%
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Pass: {attempt.quiz.passingScore}%
                </div>
                <div className={`text-xs mt-0.5 font-medium ${
                  attempt.passed ? "text-emerald-400" : "text-red-400"
                }`}>
                  {attempt.passed ? "PASSED" : "FAILED"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
