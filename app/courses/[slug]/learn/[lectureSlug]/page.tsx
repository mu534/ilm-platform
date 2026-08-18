import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { isLectureLocked } from "../../../../lib/sequentialLearning";
import { LikeButton } from "../../../../components/lectures/LikeButton";
import { LectureResources } from "../../../../components/lectures/LectureResources";
import { LectureVideoPlayer } from "../../../../components/lectures/LectureVideoPlayer";
import { LecturePdfViewer } from "../../../../components/lectures/LecturePdfViewer";
import { LectureTopBar, LectureBottomBar, LectureInPageNav } from "../../../../components/lectures/LectureNavigation";
import { sanitizeHtml } from "../../../../utils/sanitize";
import type { SessionUser } from "../../../../types/auth.types";

interface Props {
  params: Promise<{ slug: string; lectureSlug: string }>;
}

// ── Data fetching ─────────────────────────────────────────────────────────────
// Scoped to the course in the URL, not just by lecture slug — this both
// prevents a lecture from one course leaking into another course's classroom
// and lets us skip a separate course lookup entirely.

async function getLecture(courseSlug: string, lectureSlug: string) {
  return prisma.lecture.findFirst({
    where: {
      slug: lectureSlug,
      published: true,
      module: { course: { slug: courseSlug } },
    },
    include: {
      author:   { select: { id: true, name: true, image: true, bio: true } },
      scholar:  { include: { user: { select: { name: true, image: true } } } },
      category: { select: { name: true, icon: true } },
      media:    { select: { id: true, url: true, type: true, category: true, filename: true, size: true } },
      module: {
        select: {
          id:    true,
          title: true,
          order: true,
          courseId: true,
          quizzes: {
            select: { id: true, title: true },
          },
          course: {
            select: {
              id: true, title: true, slug: true, categoryId: true, sequentialLearning: true,
              modules: {
                orderBy: { order: "asc" },
                select: {
                  id: true, title: true, order: true,
                  quizzes: {
                    select: { id: true, title: true },
                  },
                  lectures: {
                    orderBy: { order: "asc" },
                    where:   { published: true },
                    select:  { id: true, title: true, slug: true, order: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface NavInfo {
  prevSlug:         string | null;
  prevTitle:        string | null;
  nextSlug:         string | null;
  nextTitle:        string | null;
  nextQuizId:       string | null;
  nextQuizTitle:    string | null;
  isLastLecture:    boolean;
  isNextSection:    boolean;
  nextSectionTitle: string | null;
  lectureNumber:    number;
  totalLectures:    number;
}

function buildNavInfo(
  lectureId: string,
  modules: {
    id: string;
    title: string;
    quizzes?: { id: string; title: string }[];
    lectures: { id: string; title: string; slug: string }[];
  }[],
): NavInfo {
  const all: { id: string; title: string; slug: string; moduleId: string; moduleTitle: string; moduleIndex: number }[] = [];
  
  modules.forEach((mod, mIdx) => {
    for (const lec of mod.lectures) {
      all.push({ ...lec, moduleId: mod.id, moduleTitle: mod.title, moduleIndex: mIdx });
    }
  });

  const idx = all.findIndex((l) => l.id === lectureId);
  if (idx === -1) {
    return {
      prevSlug: null, prevTitle: null,
      nextSlug: null, nextTitle: null,
      nextQuizId: null, nextQuizTitle: null,
      isLastLecture: false, isNextSection: false,
      nextSectionTitle: null,
      lectureNumber: 1, totalLectures: all.length,
    };
  }

  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;
  const curr = all[idx];

  // Check if current module has a quiz and this is the last lecture of this module
  const currentMod = modules[curr.moduleIndex];
  const isLastInCurrentModule = currentMod && currentMod.lectures[currentMod.lectures.length - 1]?.id === lectureId;
  const moduleQuiz = isLastInCurrentModule && currentMod.quizzes && currentMod.quizzes.length > 0
    ? currentMod.quizzes[0]
    : null;

  const isNextSection = !!(next && next.moduleId !== curr.moduleId);

  return {
    prevSlug:         prev?.slug  ?? null,
    prevTitle:        prev?.title ?? null,
    nextSlug:         next?.slug  ?? null,
    nextTitle:        next?.title ?? null,
    nextQuizId:       moduleQuiz?.id ?? null,
    nextQuizTitle:    moduleQuiz?.title ?? null,
    isLastLecture:    idx === all.length - 1,
    isNextSection,
    nextSectionTitle: isNextSection ? next!.moduleTitle : null,
    lectureNumber:    idx + 1,
    totalLectures:    all.length,
  };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props) {
  const { slug, lectureSlug } = await params;
  const lecture = await getLecture(slug, lectureSlug);
  if (!lecture) return { title: "Lesson Not Found" };
  return {
    title:       `${lecture.title}${lecture.module?.course ? ` — ${lecture.module.course.title}` : ""}`,
    description: lecture.description,
    openGraph:   { images: lecture.thumbnailUrl ? [lecture.thumbnailUrl] : [] },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClassroomLecturePage({ params }: Props) {
  const { slug, lectureSlug } = await params;
  const [lecture, session] = await Promise.all([
    getLecture(slug, lectureSlug),
    getServerSession(authOptions),
  ]);

  if (!lecture || !lecture.module) notFound();

  const user      = session?.user as SessionUser | undefined;
  const course    = lecture.module.course;
  const section   = lecture.module;
  const courseId  = course.id;

  // ── Sequential learning enforcement ──────────────────────────────────────
  // The sidebar only *displays* locked lessons — this is what actually stops
  // a student from skipping ahead by pasting in a later lesson's URL.
  // Staff (admin/instructor) previewing their own course bypass this.
  const isStaff = user?.role === "ADMIN" || user?.role === "INSTRUCTOR";
  if (course.sequentialLearning && !isStaff) {
    const orderedLectures  = course.modules.flatMap((m) => m.lectures);
    const orderedLectureIds = orderedLectures.map((l) => l.id);
    const allQuizIds = course.modules.flatMap((m) => (m.quizzes ?? []).map((q) => q.id));

    let completedIds = new Set<string>();
    let passedQuizIds = new Set<string>();

    if (user) {
      const [progress, passedAttempts] = await Promise.all([
        prisma.lectureProgress.findMany({
          where:  { userId: user.id, lectureId: { in: orderedLectureIds }, completed: true },
          select: { lectureId: true },
        }),
        allQuizIds.length > 0
          ? prisma.quizAttempt.findMany({
              where:  { userId: user.id, quizId: { in: allQuizIds }, passed: true },
              select: { quizId: true },
              distinct: ["quizId"],
            })
          : Promise.resolve([]),
      ]);
      completedIds = new Set(progress.map((p) => p.lectureId));
      passedQuizIds = new Set(passedAttempts.map((a) => a.quizId));
    }

    if (isLectureLocked(lecture.id, orderedLectureIds, completedIds, true, course.modules, passedQuizIds)) {
      // Find the first blocking item (incomplete lecture or unpassed module quiz)
      let redirectUrl: string | null = null;
      for (const mod of course.modules) {
        const incompleteLecture = mod.lectures.find((l) => !completedIds.has(l.id));
        if (incompleteLecture) {
          redirectUrl = `/courses/${course.slug}/learn/${incompleteLecture.slug}`;
          break;
        }
        const unpassedQuiz = (mod.quizzes ?? []).find((q) => !passedQuizIds.has(q.id));
        if (unpassedQuiz) {
          redirectUrl = `/courses/${course.slug}/learn/quiz/${unpassedQuiz.id}`;
          break;
        }
      }
      redirect(redirectUrl || `/courses/${course.slug}`);
    }
  }

  // Record last-viewed (non-blocking). Access itself was already verified
  // by the classroom layout above this page.
  if (user) {
    void prisma.lectureProgress.upsert({
      where:  { userId_lectureId: { userId: user.id, lectureId: lecture.id } },
      create: { userId: user.id, lectureId: lecture.id, lastViewedAt: new Date() },
      update: { lastViewedAt: new Date() },
    }).catch(() => {});
  }

  const navInfo = buildNavInfo(lecture.id, course.modules);

  return (
    <>
      {/* Top nav bar */}
      <LectureTopBar
        courseTitle={course.title}
        courseSlug={course.slug}
        sectionTitle={section.title}
        lectureNumber={navInfo.lectureNumber}
        totalLectures={navInfo.totalLectures}
        prevSlug={navInfo.prevSlug}
        nextSlug={navInfo.nextSlug}
        nextQuizId={navInfo.nextQuizId}
        isLastLecture={navInfo.isLastLecture}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-8 classroom-content">

          {/* Section label */}
          <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
            {section.title}
          </p>

          {/* Lecture title */}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight mb-3">
            {lecture.title}
          </h1>

          {/* Description */}
          {lecture.description && (
            <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-6">
              {lecture.description}
            </p>
          )}

          {/* ── VIDEO (with resume + autosave) ── */}
          {lecture.type === "VIDEO" && lecture.mediaUrl && (
            <div className="mb-8 rounded-xl overflow-hidden border border-[var(--border)] bg-black">
              <LectureVideoPlayer
                lectureId={lecture.id}
                src={lecture.mediaUrl}
                poster={lecture.thumbnailUrl ?? undefined}
              />
            </div>
          )}

          {/* ── AUDIO ── */}
          {lecture.type === "AUDIO" && lecture.mediaUrl && (
            <div className="mb-8 p-5 border border-[var(--border)] rounded-xl bg-[var(--bg-card)]">
              <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wide font-semibold">
                Audio Lesson
              </p>
              <audio src={lecture.mediaUrl} controls className="w-full" />
            </div>
          )}

          {/* ── PDF ── */}
          {lecture.type === "PDF" && lecture.mediaUrl && (
            <LecturePdfViewer url={lecture.mediaUrl} title={lecture.title} />
          )}

          {/* ── Thumbnail (non-video) ── */}
          {lecture.thumbnailUrl && lecture.type === "TEXT" && (
            <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden mb-8 border border-[var(--border)]">
              <Image
                src={lecture.thumbnailUrl}
                alt={lecture.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* ── Text content ── */}
          {lecture.content && (
            <div
              className="lecture-prose mb-10"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(lecture.content) }}
            />
          )}

          {/* ── Resources / Attachments ── */}
          {lecture.media && lecture.media.length > 0 && (
            <div className="mb-10">
              <LectureResources media={lecture.media} />
            </div>
          )}

          {/* ── Meta row (likes, views) ── */}
          <div className="flex items-center gap-5 text-sm text-[var(--text-muted)] pb-6 mb-8 border-b border-[var(--border)]">
            <LikeButton lectureId={lecture.id} />
            <span className="text-xs">{lecture.views.toLocaleString()} views</span>
            {lecture.category && (
              <span className="tag text-xs">{lecture.category.icon} {lecture.category.name}</span>
            )}
          </div>

          {/* ── Scholar bio (if applicable) ── */}
          {lecture.scholar && (
            <div className="border border-[var(--border)] rounded-xl p-5 mb-10 bg-[var(--bg-card)]">
              <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-3">
                About the Scholar
              </p>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--border)] flex-shrink-0 bg-[var(--bg-secondary)]">
                  {lecture.scholar.user.image ? (
                    <Image
                      src={lecture.scholar.user.image}
                      alt={lecture.scholar.user.name}
                      width={48} height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--accent)] font-bold">
                      {lecture.scholar.user.name[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                    {lecture.scholar.user.name}
                  </p>
                  {lecture.scholar.bio && (
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
                      {lecture.scholar.bio}
                    </p>
                  )}
                  <Link
                    href={`/scholars/${lecture.scholar.id}`}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] mt-2 inline-block transition-colors"
                  >
                    View full profile →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── Prominent In-Page Completion & Navigation Card ── */}
          <LectureInPageNav
            lectureId={lecture.id}
            courseId={courseId}
            courseSlug={course.slug}
            courseTitle={course.title}
            sectionTitle={section.title}
            lectureNumber={navInfo.lectureNumber}
            totalLectures={navInfo.totalLectures}
            prevSlug={navInfo.prevSlug}
            prevTitle={navInfo.prevTitle}
            nextSlug={navInfo.nextSlug}
            nextTitle={navInfo.nextTitle}
            nextQuizId={navInfo.nextQuizId}
            nextQuizTitle={navInfo.nextQuizTitle}
            isLastLecture={navInfo.isLastLecture}
            isNextSection={navInfo.isNextSection}
            nextSectionTitle={navInfo.nextSectionTitle}
          />

        </article>
      </div>

      {/* Bottom sticky navigation bar */}
      <LectureBottomBar
        lectureId={lecture.id}
        courseId={courseId}
        courseSlug={course.slug}
        courseTitle={course.title}
        sectionTitle={section.title}
        lectureNumber={navInfo.lectureNumber}
        totalLectures={navInfo.totalLectures}
        prevSlug={navInfo.prevSlug}
        prevTitle={navInfo.prevTitle}
        nextSlug={navInfo.nextSlug}
        nextTitle={navInfo.nextTitle}
        nextQuizId={navInfo.nextQuizId}
        nextQuizTitle={navInfo.nextQuizTitle}
        isLastLecture={navInfo.isLastLecture}
        isNextSection={navInfo.isNextSection}
        nextSectionTitle={navInfo.nextSectionTitle}
      />
    </>
  );
}
