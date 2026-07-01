import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import Image from "next/image";
import { FiBookmark, FiArrowLeft, FiBookOpen, FiTrash2 } from "react-icons/fi";
import { BookmarkRemoveButton } from "../../components/BookmarkRemoveButton";
import type { SessionUser } from "../../types/auth.types";

export const metadata = { title: "My Bookmarks" };

async function getBookmarks(userId: string) {
  return prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      lecture: {
        select: {
          id: true, title: true, slug: true, type: true,
          thumbnailUrl: true, views: true,
          author: { select: { name: true } },
        },
      },
      course: {
        select: {
          id: true, title: true, slug: true, thumbnailUrl: true,
          difficulty: true,
          _count: { select: { modules: true, enrollments: true } },
        },
      },
    },
  });
}

export default async function BookmarksPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) redirect("/login?callbackUrl=/dashboard/bookmarks");

  const bookmarks = await getBookmarks(user.id);
  const lectureBookmarks = bookmarks.filter((b) => b.lecture);
  const courseBookmarks  = bookmarks.filter((b) => b.course);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-8">
        <FiArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <FiBookmark className="text-[var(--accent)]" />
          My Bookmarks
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">{bookmarks.length} saved items</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FiBookmark className="text-[var(--text-muted)] text-4xl mx-auto mb-4 opacity-30" />
          <p className="text-[var(--text-primary)] font-semibold mb-2">No bookmarks yet</p>
          <p className="text-[var(--text-muted)] text-sm mb-6">Bookmark lectures and courses to find them quickly later.</p>
          <div className="flex justify-center gap-3">
            <Link href="/lectures" className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-light)] transition-colors">
              Browse Lectures
            </Link>
            <Link href="/courses" className="px-4 py-2 text-sm border border-[var(--border)] text-[var(--text-primary)] rounded-xl hover:border-[var(--accent)] transition-colors">
              Browse Courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Lecture bookmarks */}
          {lectureBookmarks.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">
                Lectures ({lectureBookmarks.length})
              </h2>
              <div className="space-y-3">
                {lectureBookmarks.map((bm) => bm.lecture && (
                  <div key={bm.id} className="flex items-center gap-4 p-4 glass-card rounded-xl group">
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
                      {bm.lecture.thumbnailUrl ? (
                        <Image src={bm.lecture.thumbnailUrl} alt={bm.lecture.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiBookOpen className="text-[var(--text-muted)]" size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/lectures/${bm.lecture.slug}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-1 block"
                      >
                        {bm.lecture.title}
                      </Link>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {bm.lecture.type} · by {bm.lecture.author.name}
                      </p>
                    </div>
                    <BookmarkRemoveButton bookmarkId={bm.id} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Course bookmarks */}
          {courseBookmarks.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-4">
                Courses ({courseBookmarks.length})
              </h2>
              <div className="space-y-3">
                {courseBookmarks.map((bm) => bm.course && (
                  <div key={bm.id} className="flex items-center gap-4 p-4 glass-card rounded-xl group">
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
                      {bm.course.thumbnailUrl ? (
                        <Image src={bm.course.thumbnailUrl} alt={bm.course.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiBookOpen className="text-[var(--text-muted)]" size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/courses/${bm.course.slug}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-1 block"
                      >
                        {bm.course.title}
                      </Link>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {bm.course.difficulty} · {bm.course._count.modules} modules · {bm.course._count.enrollments} students
                      </p>
                    </div>
                    <BookmarkRemoveButton bookmarkId={bm.id} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
