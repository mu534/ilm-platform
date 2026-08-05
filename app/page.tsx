import Link from "next/link";
import { prisma } from "@/app/lib/prism";
import { ScholarCard } from "@/app/components/scholars/ScholarCard";
import { CourseMarquee } from "@/app/components/courses/CourseMarquee";
import { ContinueLearningStrip } from "@/app/components/courses/ContinueLearningStrip";
import { CategoryExplorer } from "@/app/components/CategoryExplorer";
import { TestimonialsSection } from "@/app/components/TestimonialsSection";
import { NewsletterSignup } from "@/app/components/NewsletterSignup";
import { EnhancedSearch } from "@/app/components/EnhancedSearch";
import { RecentActivityFeed } from "@/app/components/RecentActivityFeed";
import { PopularTopics } from "@/app/components/PopularTopics";
import { QuickAccess } from "@/app/components/QuickAccess";
import type { Scholar, SessionUser } from "@/app/types/auth.types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import {
  FiArrowRight, FiBookOpen, FiUsers, FiUser,
  FiMessageCircle, FiClock,
} from "react-icons/fi";
import { GiMoon, GiStarFormation } from "react-icons/gi";

// Cache the home page for 5 minutes — prevents 14 DB queries on every visit
export const revalidate = 300;

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getHomeData() {
  // Run queries in two sequential batches to avoid overwhelming the
  // connection pool on cold start. Batch 1 = critical above-the-fold data.
  const [marqueeCourses, featuredScholars, categoriesRaw] = await Promise.all([
    prisma.course.findMany({
      where:   { published: true },
      take:    16,
      orderBy: { createdAt: "desc" },          // cheaper than _count sort
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        author:   { select: { id: true, name: true, image: true } },
        scholar:  { select: { id: true, photo: true, verified: true, user: { select: { name: true } } } },
        _count:   { select: { modules: true, enrollments: true, ratings: true } },
      },
    }),
    prisma.scholar.findMany({
      where:   { featured: true },
      take:    4,
      include: {
        user:   { select: { name: true, email: true, image: true } },
        _count: { select: { lectures: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { courses: true } } },
    }),
  ]);

  // Batch 2 = stats + activity (below the fold)
  const [counts, recentStats, popularTopics, recentActivity, testimonials] =
    await Promise.all([
      Promise.all([
        prisma.course.count({ where: { published: true } }),
        prisma.scholar.count(),
        prisma.user.count(),
      ]),
      Promise.all([
        prisma.comment.count({
          where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
        prisma.course.count({
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, published: true },
        }),
        prisma.user.count({
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        }),
      ]),
      prisma.lecture.findMany({
        where:  { published: true },
        select: { tags: true },
        take:   100,
      }),
      Promise.all([
        prisma.comment.findMany({
          take:    3,
          orderBy: { createdAt: "desc" },
          include: {
            author:  { select: { name: true, image: true } },
            lecture: { select: { title: true, slug: true } },
          },
        }),
        prisma.lecture.findMany({
          where:   { published: true },
          take:    2,
          orderBy: { createdAt: "desc" },
          include: {
            author:  { select: { name: true } },
            scholar: { include: { user: { select: { name: true } } } },
          },
        }),
        prisma.scholar.findMany({
          take:    2,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        }),
      ]),
      prisma.user.findMany({
        where:  { bio: { not: null }, role: "USER" },
        take:   3,
        select: { name: true, image: true, bio: true },
      }),
    ]);

  // Batch-fetch average ratings for marquee courses — single query, no N+1
  const courseIds = marqueeCourses.map((c) => c.id);
  const ratings   = await prisma.courseRating.groupBy({
    by:     ["courseId"],
    where:  { courseId: { in: courseIds } },
    _avg:   { rating: true },
  });
  const ratingMap = new Map(ratings.map((r) => [r.courseId, r._avg.rating ?? 0]));

  const categories = categoriesRaw
    .map((c) => ({ ...c, courseCount: c._count.courses }))
    .filter((c) => c.courseCount > 0);

  return {
    marqueeCourses, ratingMap, featuredScholars,
    categories,
    counts, recentStats, popularTopics, recentActivity, testimonials,
  };
}

async function getContinueLearning(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      status: "ACTIVE",
      progress: { gt: 0, lt: 100 },
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
    include: {
      course: { select: { id: true, slug: true, title: true, thumbnailUrl: true } },
    },
  });

  return enrollments.map((e) => ({
    courseId:     e.course.id,
    slug:         e.course.slug,
    title:        e.course.title,
    thumbnailUrl: e.course.thumbnailUrl,
    progress:     e.progress,
  }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PrismaScholar = {
  id: string; userId: string; bio: string; photo: string | null;
  topics: string[]; qualifications: string[]; featured: boolean;
  user: { name: string; email: string; image: string | null };
  _count: { lectures: number };
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapScholar(s: PrismaScholar): Scholar {
  return { ...s };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow, title, href, linkLabel,
}: {
  eyebrow: string; title: string; href?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-8 gap-4">
      <div>
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1.5">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] leading-tight">
          {title}
        </h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="flex-shrink-0 flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors group"
        >
          {linkLabel}
          <FiArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

function StatCard({ icon, count, label }: {
  icon: React.ReactNode; count: number; label: string;
}) {
  return (
    <div className="
      flex flex-col items-center gap-2 p-4 sm:p-6 rounded-2xl text-center
      border border-[var(--border)] bg-[var(--bg-card)]
      hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)]
      hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5
      transition-all duration-300
    ">
      <div className="text-[var(--accent)] text-xl">{icon}</div>
      <div className="font-display text-2xl sm:text-4xl font-bold text-[var(--text-primary)] tabular-nums">
        {count.toLocaleString()}
      </div>
      <div className="text-xs sm:text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // ✅ session must be inside the component, not at module level
  const session = await getServerSession(authOptions);
  const user    = session?.user as SessionUser | null;

  const [
    {
      marqueeCourses, ratingMap, featuredScholars,
      categories,
      counts, recentStats, popularTopics, recentActivity, testimonials,
    },
    continueLearning,
  ] = await Promise.all([
    getHomeData(),
    user ? getContinueLearning(user.id) : Promise.resolve([]),
  ]);

  const [courseCount, scholarCount, userCount]            = counts;
  const [recentComments, recentCourses, recentUsers]      = recentStats;
  const [recentCommentsData, recentLecturesData, recentScholarsData] = recentActivity;

  const mappedScholars = featuredScholars.map(mapScholar);

  // Enrich marquee courses with their batch-fetched average rating, then
  // split into two rows for the opposite-direction scrolling banner.
  const enrichedCourses = marqueeCourses.map((c) => ({
    id:           c.id,
    slug:         c.slug,
    title:        c.title,
    thumbnailUrl: c.thumbnailUrl,
    difficulty:   c.difficulty,
    avgRating:    ratingMap.get(c.id) ?? 0,
    enrollCount:  c._count.enrollments,
    categoryName: c.category?.name ?? null,
    categoryIcon: c.category?.icon ?? null,
  }));
  const marqueeTopRow    = enrichedCourses.filter((_, i) => i % 2 === 0);
  const marqueeBottomRow = enrichedCourses.filter((_, i) => i % 2 === 1);

  // Popular topics
  const tagCounts: Record<string, number> = {};
  popularTopics.forEach(lecture => {
    lecture.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    });
  });
  const processedPopularTopics = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Testimonials
  const processedTestimonials = testimonials.map(u => ({
    id:      u.name,
    name:    u.name,
    role:    "Student",
    content: u.bio ?? "Great platform for Islamic learning!",
    rating:  5,
  }));

  // Activity feed
  const processedActivity = [
    ...recentCommentsData.map(comment => ({
      id:          `comment-${comment.id}`,
      type:        "comment" as const,
      title:       `New comment on "${comment.lecture.title}"`,
      description: comment.body.length > 100
        ? comment.body.substring(0, 100) + "…"
        : comment.body,
      user:      { name: comment.author.name, image: comment.author.image },
      timestamp: comment.createdAt,
      link:      `/lectures/${comment.lecture.slug}`,
    })),
    ...recentLecturesData.map(lecture => ({
      id:          `lecture-${lecture.id}`,
      type:        "lecture" as const,
      title:       "New lecture published",
      description: `"${lecture.title}" by ${lecture.scholar?.user.name ?? lecture.author.name}`,
      user:      { name: lecture.author.name },
      timestamp: lecture.createdAt,
      link:      `/lectures/${lecture.slug}`,
    })),
    ...recentScholarsData.map(scholar => ({
      id:          `scholar-${scholar.id}`,
      type:        "scholar" as const,
      title:       "New scholar joined",
      description: `${scholar.user.name} joined the platform`,
      user:      { name: scholar.user.name },
      timestamp: scholar.createdAt,
      link:      `/scholars/${scholar.id}`,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen w-full">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20  md: w-full animate-fadeInUp">
        <div className="absolute inset-0 pattern-overlay opacity-40" />
        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--accent-dim)] mb-8">
            <GiStarFormation className="text-[var(--accent)] text-xs" />
            <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
              Knowledge is Light
            </span>
            <GiStarFormation className="text-[var(--accent)] text-xs" />
          </div>

          {/* Arabic */}
          <p className="arabic-bismillah text-2xl sm:text-3xl mb-6">
            بِسْمِ اللّٰهِ الرَّحْمَنِ الرَّحِيْمِ
          </p>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-6 text-[var(--text-primary)]">
            Seek Knowledge
            <br />
            with <span className="gradient-text">Clarity</span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mb-10 leading-relaxed">
            Access authentic Islamic courses, connect with qualified scholars,
            and deepen your understanding of the Deen.
          </p>

          <EnhancedSearch />

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link
              href="/courses"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold shadow-md shadow-gold-600/30 hover:shadow-gold-500/40 transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
            >
              Explore Courses <FiArrowRight size={15} />
            </Link>
            <Link
              href="/scholars"
              className="flex items-center gap-2 px-6 py-3 border border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text-primary)] rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
            >
              Meet Scholars
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 animate-fadeInUp delay-100">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <StatCard icon={<FiBookOpen />}      count={courseCount}    label="Courses"        />
          <StatCard icon={<FiUsers />}         count={scholarCount}   label="Scholars"       />
          <StatCard icon={<FiUser />}          count={userCount}      label="Students"       />
          <StatCard icon={<FiMessageCircle />} count={recentComments} label="Comments (24h)" />
          <StatCard icon={<FiClock />}         count={recentCourses}  label="New This Week"  />
        </div>
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-strong)] bg-[var(--accent-dim)]">
            <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
            <span className="text-[var(--accent)] text-sm font-medium">
              {recentUsers} new students joined this month
            </span>
          </div>
        </div>
      </section>

      {/* ── Continue Learning (real progress, signed-in users only) ── */}
      <ContinueLearningStrip courses={continueLearning} userName={user?.name} />

      {/* ── Course Showcase — animated marquee, opposite-direction rows ── */}
      {enrichedCourses.length > 0 && (
        <section className="w-full py-12 sm:py-16 border-t border-[var(--border)] animate-fadeInUp delay-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <SectionHeader
              eyebrow="Structured Learning"
              title="Explore Our Courses"
              href="/courses"
              linkLabel="All Courses"
            />
          </div>
          <CourseMarquee topRow={marqueeTopRow} bottomRow={marqueeBottomRow} />
        </section>
      )}

      {/* ── Browse by Category ── */}
      <CategoryExplorer categories={categories} />

      {/* ── Popular Topics ── */}
      <PopularTopics topics={processedPopularTopics} />
      {/* ── Quick Access ── */}
      <QuickAccess />

      {/* ── Featured Scholars ── */}
      {mappedScholars.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-[var(--border-subtle)] animate-fadeInUp delay-100">
          <SectionHeader
            eyebrow="Learn from the best"
            title="Featured Scholars"
            href="/scholars"
            linkLabel="All Scholars"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {mappedScholars.map((scholar) => (
              <ScholarCard key={scholar.id} scholar={scholar} />
            ))}
          </div>
        </section>
      )}

      {/* ── Testimonials ── */}
      <TestimonialsSection testimonials={processedTestimonials} />

      {/* ── Recent Activity ── */}
      <RecentActivityFeed activities={processedActivity} />

      {/* ── Newsletter ── */}
      <NewsletterSignup />

      {/* ── CTA Banner ── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="relative rounded-3xl overflow-hidden border border-[var(--border-strong)]">
          <div className="absolute inset-0 hero-bg opacity-80" />
          <div className="absolute inset-0 pattern-overlay opacity-20" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 50% 100%, var(--accent-dim), transparent)",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-60" />

          <div className="relative px-6 py-14 sm:py-20 flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] animate-pulse-accent mb-6">
              <GiMoon className="text-[var(--accent)] text-2xl" />
            </div>

            {user ? (
              <>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
                  Welcome back, {user.name?.split(" ")[0]} 👋
                </h2>
                <p className="text-[var(--text-secondary)] mb-8 max-w-sm text-sm sm:text-base leading-relaxed">
                  Continue your journey of seeking authentic Islamic knowledge.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold shadow-md shadow-gold-600/30 hover:shadow-gold-500/40 transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
                  >
                    My Profile <FiArrowRight size={15} />
                  </Link>
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 px-7 py-3.5 border border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text-primary)] rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
                  >
                    Browse Courses
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
                  Start Your Journey Today
                </h2>
                <p className="text-[var(--text-secondary)] mb-8 max-w-sm text-sm sm:text-base leading-relaxed">
                  Join thousands of students seeking authentic Islamic knowledge
                  from qualified scholars.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold shadow-md shadow-gold-600/30 hover:shadow-gold-500/40 transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
                  >
                    Create Free Account <FiArrowRight size={15} />
                  </Link>
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 px-7 py-3.5 border border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text-primary)] rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
                  >
                    Browse Courses
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}