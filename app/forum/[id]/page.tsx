import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { formatDate } from "../../utils/api";
import Link from "next/link";
import { FiArrowLeft, FiCheckCircle, FiEye, FiMessageSquare } from "react-icons/fi";
import { ForumReplySection } from "../../components/forum/ForumReplySection";
import type { SessionUser } from "../../types/auth.types";

interface Props {
  params: Promise<{ id: string }>;
}

async function getQuestion(id: string) {
  await prisma.forumQuestion.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
  return prisma.forumQuestion.findUnique({
    where: { id },
    include: {
      author:  { select: { id: true, name: true, image: true } },
      replies: {
        orderBy: [{ isAccepted: "desc" }, { createdAt: "asc" }],
        include: {
          author: { select: { id: true, name: true, image: true } },
          _count: { select: { votes: true } },
        },
      },
      _count: { select: { replies: true, votes: true } },
    },
  });
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const q = await prisma.forumQuestion.findUnique({ where: { id }, select: { title: true } });
  return { title: q?.title ?? "Forum Question" };
}

export default async function ForumQuestionPage({ params }: Props) {
  const { id } = await params;
  const [question, session] = await Promise.all([
    getQuestion(id),
    getServerSession(authOptions),
  ]);

  if (!question) notFound();

  const user = session?.user as SessionUser | undefined;
  const isAuthor = user?.id === question.authorId;
  const isAdmin  = user?.role === "ADMIN";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/forum" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-8">
        <FiArrowLeft size={14} /> Back to Forum
      </Link>

      {/* Question */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-2 mb-3">
          {question.resolved && (
            <FiCheckCircle className="text-emerald-400 flex-shrink-0 mt-1" size={16} />
          )}
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] leading-tight">
            {question.title}
          </h1>
        </div>

        <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap mb-5">
          {question.body}
        </p>

        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--border)]">
          <span className="font-medium text-[var(--text-secondary)]">{question.author.name}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><FiEye size={10} /> {question.views} views</span>
          <span>·</span>
          <span className="flex items-center gap-1"><FiMessageSquare size={10} /> {question._count.replies} replies</span>
          <span>·</span>
          <span>{formatDate(question.createdAt)}</span>
        </div>
      </div>

      {/* Replies */}
      <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">
        {question._count.replies} {question._count.replies === 1 ? "Answer" : "Answers"}
      </h2>

      <div className="space-y-4 mb-8">
        {question.replies.map((reply) => (
          <div
            key={reply.id}
            className={`glass-card rounded-2xl p-5 ${reply.isAccepted ? "border-emerald-500/30" : ""}`}
          >
            {reply.isAccepted && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-3">
                <FiCheckCircle size={13} /> Accepted Answer
              </div>
            )}
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap mb-4">
              {reply.body}
            </p>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-3">
                <span className="font-medium text-[var(--text-secondary)]">{reply.author.name}</span>
                <span>{formatDate(reply.createdAt)}</span>
                <span>{reply._count.votes} votes</span>
              </div>
              {(isAuthor || isAdmin) && !reply.isAccepted && !question.resolved && (
                <form action={`/api/forum/${id}/accept`} method="POST">
                  <input type="hidden" name="replyId" value={reply.id} />
                  <AcceptButton questionId={id} replyId={reply.id} />
                </form>
              )}
            </div>
          </div>
        ))}

        {question.replies.length === 0 && (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            No answers yet. Be the first to help!
          </div>
        )}
      </div>

      {/* Reply form */}
      <ForumReplySection
        questionId={question.id}
        isLoggedIn={!!user}
        isResolved={question.resolved}
      />
    </div>
  );
}

// Client-side accept button (inline import not possible in RSC — use server action pattern)
function AcceptButton({ questionId, replyId }: { questionId: string; replyId: string }) {
  return null; // Handled by ForumReplySection client component
}
