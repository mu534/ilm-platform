import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import Link from "next/link";
import Image from "next/image";
import { FiBookmark, FiCompass } from "react-icons/fi";
import { BookmarkRemoveButton } from "../../components/BookmarkRemoveButton";
import type { SessionUser } from "../../types/auth.types";

export const metadata = { title: "Saved Items | Ilm Platform" };

async function getBookmarks(userId: string) {
  return prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      lecture: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          thumbnailUrl: true,
          views: true,
          author: { select: { name: true } },
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnailUrl: true,
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
  const courseBookmarks = bookmarks.filter((b) => b.course);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <FiBookmark className="text-[var(--accent)]" />
            Saved Items & Bookmarks
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Access your saved lectures and courses anytime.
          </p>
        </div>

        <div className="px-4 py-2 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--accent)] self-start md:self-auto">
          {bookmarks.length} Saved Item{bookmarks.length !== 1 ? "s" : ""}
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] text-2xl mx-auto">
            <FiBookmark />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
              No saved items yet
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
              Bookmark lectures and courses to quickly reference them later in your learning journey.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/courses"
              className="btn-primary px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2"
            >
              <FiCompass size={16} /> Explore Courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Lecture bookmarks */}
          {lectureBookmarks.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
                Bookmarked Lectures ({lectureBookmarks.length})
              </h2>
              <div className="space-y-3">
                {lectureBookmarks.map(
                  (bm) =>
                    bm.lecture && (
                      <div
                        key={bm.id}
                        className="glass-card rounded-2xl p-4 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex items-center gap-4 group"
                      >
                        <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0 border border-[var(--border-subtle)]">
                          {bm.lecture.thumbnailUrl ? (
                            <Image
                              src={bm.lecture.thumbnailUrl}
                              alt={bm.lecture.title}
                              fill
                              sizes="96px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl opacity-20">
                              📖
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/lectures/${bm.lecture.slug}`}
                            className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-1 block"
                          >
                            {bm.lecture.title}
                          </Link>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {bm.lecture.type} · by {bm.lecture.author.name}
                          </p>
                        </div>
                        <BookmarkRemoveButton bookmarkId={bm.id} />
                      </div>
                    )
                )}
              </div>
            </section>
          )}

          {/* Course bookmarks */}
          {courseBookmarks.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
                Bookmarked Courses ({courseBookmarks.length})
              </h2>
              <div className="space-y-3">
                {courseBookmarks.map(
                  (bm) =>
                    bm.course && (
                      <div
                        key={bm.id}
                        className="glass-card rounded-2xl p-4 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex items-center gap-4 group"
                      >
                        <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0 border border-[var(--border-subtle)]">
                          {bm.course.thumbnailUrl ? (
                            <Image
                              src={bm.course.thumbnailUrl}
                              alt={bm.course.title}
                              fill
                              sizes="96px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl opacity-20">
                              📖
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/courses/${bm.course.slug}`}
                            className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-1 block"
                          >
                            {bm.course.title}
                          </Link>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {bm.course.difficulty} · {bm.course._count.modules} modules · {bm.course._count.enrollments} enrolled
                          </p>
                        </div>
                        <BookmarkRemoveButton bookmarkId={bm.id} />
                      </div>
                    )
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
