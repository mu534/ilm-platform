import Link from "next/link";
import { prisma } from "../lib/prism";
import { formatDate } from "../utils/api";
import { FiMessageSquare, FiCheckCircle, FiEye, FiPlus } from "react-icons/fi";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import type { SessionUser } from "../types/auth.types";

export const metadata = { title: "Discussion Forum" };

async function getQuestions(page: number) {
  const pageSize = 20;
  const [total, questions] = await Promise.all([
    prisma.forumQuestion.count(),
    prisma.forumQuestion.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        author:  { select: { id: true, name: true, image: true } },
        _count:  { select: { replies: true, votes: true } },
      },
    }),
  ]);
  return { questions, total, totalPages: Math.ceil(total / pageSize) };
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function ForumPage({ searchParams }: Props) {
  const sp      = await searchParams;
  const page    = Math.max(1, Number(sp.page ?? 1));
  const session = await getServerSession(authOptions);
  const user    = session?.user as SessionUser | undefined;
  const { questions, total, totalPages } = await getQuestions(page);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-2">Community</p>
          <h1 className="font-display text-4xl font-bold text-[var(--text-primary)]">Discussion Forum</h1>
          <p className="text-[var(--text-muted)] mt-2">{total} questions</p>
        </div>
        {user && (
          <Link
            href="/forum/ask"
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white rounded-xl text-sm font-semibold transition-all hover:scale-105"
          >
            <FiPlus size={14} /> Ask Question
          </Link>
        )}
      </div>

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FiMessageSquare className="text-[var(--text-muted)] text-4xl mx-auto mb-4 opacity-30" />
          <p className="text-[var(--text-primary)] font-semibold mb-2">No questions yet</p>
          <p className="text-[var(--text-muted)] text-sm mb-6">Be the first to start a discussion.</p>
          {user ? (
            <Link href="/forum/ask" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-light)] transition-colors">
              <FiPlus size={14} /> Ask a Question
            </Link>
          ) : (
            <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-light)] transition-colors">
              Sign in to ask
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Link
              key={q.id}
              href={`/forum/${q.id}`}
              className="group flex items-start gap-4 p-5 glass-card rounded-2xl hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)] transition-all duration-300"
            >
              {/* Stats column */}
              <div className="flex-shrink-0 text-center w-14 space-y-2">
                <div className="text-xs text-[var(--text-muted)]">
                  <div className="font-display text-lg font-bold text-[var(--text-primary)]">{q._count.votes}</div>
                  <div>votes</div>
                </div>
                <div className={`text-xs rounded-lg px-1.5 py-0.5 ${
                  q.resolved
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]"
                }`}>
                  <div className="font-bold">{q._count.replies}</div>
                  <div>ans</div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1.5">
                  {q.resolved && (
                    <FiCheckCircle className="text-emerald-400 flex-shrink-0 mt-0.5" size={15} />
                  )}
                  <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug line-clamp-2">
                    {q.title}
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-muted)] line-clamp-1 mb-2">
                  {q.body}
                </p>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text-secondary)]">{q.author.name}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><FiEye size={10} /> {q.views}</span>
                  <span>·</span>
                  <span>{formatDate(q.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {page > 1 && (
            <Link href={`/forum?page=${page - 1}`} className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link href={`/forum?page=${page + 1}`} className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
