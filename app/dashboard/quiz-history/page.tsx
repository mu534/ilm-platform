import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import { formatDate } from "../../utils/api";
import { FiCheckCircle, FiXCircle, FiClock, FiActivity, FiCompass } from "react-icons/fi";
import type { SessionUser } from "../../types/auth.types";

export const metadata = { title: "Learning Progress | Ilm Platform" };

export default async function QuizHistoryPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) redirect("/login?callbackUrl=/dashboard/quiz-history");

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id },
    orderBy: { completedAt: "desc" },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          passingScore: true,
          module: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      },
    },
  });

  const passed = attempts.filter((a) => a.passed).length;
  const failed = attempts.filter((a) => !a.passed).length;
  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <FiActivity className="text-[var(--accent)]" />
            Learning Progress & Quizzes
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Track your assessment attempts, test scores, and module milestones.
          </p>
        </div>

        <div className="px-4 py-2 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--accent)] self-start md:self-auto">
          {attempts.length} Quiz Attempt{attempts.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Passed Quizzes", value: passed, color: "text-emerald-400", icon: <FiCheckCircle size={20} /> },
          { label: "Failed Attempts", value: failed, color: "text-red-400", icon: <FiXCircle size={20} /> },
          { label: "Average Score", value: `${avgScore}%`, color: "text-[var(--accent)]", icon: <FiClock size={20} /> },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5 border border-[var(--border)] flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] font-medium">{s.label}</span>
              <div className={s.color}>{s.icon}</div>
            </div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Attempts List */}
      {attempts.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] text-2xl mx-auto">
            <FiActivity />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
              No quiz attempts yet
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
              Enroll in a course with module quizzes to test your knowledge and record your progress.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/courses"
              className="btn-primary px-6 py-3 text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-md"
            >
              <FiCompass size={16} /> Explore Courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Attempt History
          </h2>

          <div className="space-y-3">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="glass-card rounded-2xl p-5 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex items-start gap-4"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    attempt.passed
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}
                >
                  {attempt.passed ? <FiCheckCircle size={18} /> : <FiXCircle size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {attempt.quiz.title}
                  </h3>
                  {attempt.quiz.module?.course && (
                    <Link
                      href={`/courses/${attempt.quiz.module.course.slug}`}
                      className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors inline-block mt-0.5"
                    >
                      Course: {attempt.quiz.module.course.title}
                    </Link>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Completed {formatDate(attempt.completedAt)}
                    {attempt.timeTaken && (
                      <span> · Time taken: {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s</span>
                    )}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div
                    className={`font-display text-2xl font-bold ${
                      attempt.passed ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {Math.round(attempt.score)}%
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Passing: {attempt.quiz.passingScore}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
