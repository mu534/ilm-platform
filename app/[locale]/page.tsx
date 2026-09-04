import Link from "next/link";
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from "@/app/lib/prism";
import { publicCourseWhere } from "@/app/lib/courseAccess";
import { ScholarCard } from "@/app/components/scholars/ScholarCard";
import { FeaturedCourseCarousel } from "@/app/components/courses/FeaturedCourseCarousel";
import { ContinueLearningStrip } from "@/app/components/courses/ContinueLearningStrip";
import { CategoryExplorer } from "@/app/components/CategoryExplorer";
import SocialProofSection from "@/app/components/SocialProofSection";
import WhyIlmPlatform from "@/app/components/WhyIlmPlatform";
import { EnhancedSearch } from "@/app/components/EnhancedSearch";
import type { Scholar, SessionUser } from "@/app/types/auth.types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import {
  FiArrowRight, FiBookOpen, FiUsers, FiUser,
  FiMail,
} from "react-icons/fi";
import { GiMoon, GiStarFormation } from "react-icons/gi";
import { NewsletterForm } from "@/app/components/NewsletterForm";

// Cache the home page for 5 minutes — prevents DB queries on every visit
export const revalidate = 300;

// ── Data fetching ────────────────────────────────────────────────────────────
async function getHomeData() {
  // Batch 1 = critical above-the-fold data.
  const [featuredCourses, featuredScholars, categoriesRaw] = await Promise.all([
    prisma.course.findMany({
      where:   { ...publicCourseWhere },
      take:    10,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        author:   { select: { id: true, name: true, image: true } },
        scholar:  {
          select: {
            id: true,
            photo: true,
            verified: true,
            professionalDesignation: true,
            user: { select: { name: true } },
          },
        },
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

  // Batch 2 = stats + reviews (below the fold)
  const [counts, courseReviews] = await Promise.all([
    Promise.all([
      prisma.course.count({ where: { ...publicCourseWhere } }),
      prisma.scholar.count(),
      prisma.user.count(),
    ]),
    // Real course reviews for social proof
    prisma.courseRating.findMany({
      where:   { review: { not: null } },
      take:    3,
      orderBy: { createdAt: "desc" },
      include: {
        user:   { select: { name: true, image: true } },
        course: { select: { title: true } },
      },
    }),
  ]);

  // Batch-fetch average ratings — single query, no N+1
  const courseIds = featuredCourses.map((c) => c.id);
  const ratings   = await prisma.courseRating.groupBy({
    by:     ["courseId"],
    where:  { courseId: { in: courseIds } },
    _avg:   { rating: true },
  });
  const ratingMap = new Map(ratings.map((r) => [r.courseId, r._avg.rating ?? 0]));

  const categories = categoriesRaw
    .map((c) => ({ ...c, courseCount: c._count.courses }))
    .filter((c) => c.courseCount > 0);

  // Map reviews to component interface
  const reviews = courseReviews
    .filter((r) => r.review && r.review.length > 10)
    .map((r) => ({
      id:          r.id,
      rating:      r.rating,
      review:      r.review!,
      userName:    r.user.name,
      userImage:   r.user.image,
      courseTitle:  r.course.title,
    }));

  return {
    featuredCourses, ratingMap, featuredScholars,
    categories, counts, reviews,
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
      course: {
        select: {
          id: true, slug: true, title: true, thumbnailUrl: true,
          modules: {
            orderBy: { order: "asc" },
            select: {
              lectures: {
                orderBy: { order: "asc" },
                select: { id: true, slug: true },
              },
            },
          },
        },
      },
    },
  });

  return Promise.all(
    enrollments.map(async (e) => {
      const allLectures = e.course.modules.flatMap((m) =>
        m.lectures.map((l) => ({ id: l.id, slug: l.slug }))
      );
      let nextLectureSlug: string | null = null;
      if (allLectures.length > 0) {
        const done = await prisma.lectureProgress.findMany({
          where: { userId, lectureId: { in: allLectures.map((l) => l.id) }, completed: true },
          select: { lectureId: true },
        });
        const doneSet = new Set(done.map((p) => p.lectureId));
        const next    = allLectures.find((l) => !doneSet.has(l.id)) ?? allLectures[0];
        nextLectureSlug = next?.slug ?? null;
      }
      return {
        courseId:        e.course.id,
        slug:            e.course.slug,
        title:           e.course.title,
        thumbnailUrl:    e.course.thumbnailUrl,
        progress:        e.progress,
        nextLectureSlug,
      };
    })
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
type PrismaScholar = {
  id: string; userId: string; bio: string; photo: string | null;
  topics: string[]; qualifications: string[]; featured: boolean;
  user: { name: string; email: string; image: string | null };
  _count: { lectures: number };
};

// ── Mappers ──────────────────────────────────────────────────────────────────
function mapScholar(s: PrismaScholar): Scholar {
  return { ...s };
}

// ── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({
  eyebrow, title, subtitle, href, linkLabel,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-10 gap-4">
      <div>
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-2">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="section-subtitle mt-2">{subtitle}</p>
        )}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="flex-shrink-0 flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors group mt-1"
        >
          {linkLabel}
          <FiArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

/** Refined editorial statistics strip — replaces the three heavy StatCard boxes */
function StatStrip({
  courseCount,
  scholarCount,
  userCount,
}: {
  courseCount: number;
  scholarCount: number;
  userCount: number;
}) {
  const stats = [
    { icon: <FiBookOpen size={13} />, count: courseCount, label: "Courses" },
    { icon: <FiUsers    size={13} />, count: scholarCount, label: "Scholars" },
    { icon: <FiUser     size={13} />, count: userCount,    label: "Students" },
  ];
  function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
    return n.toLocaleString();
  }
  return (
    <div
      className="w-full max-w-2xl mx-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/70 backdrop-blur-sm overflow-hidden"
      role="list"
      aria-label="Platform statistics"
    >
      <div className="stat-strip divide-x divide-[var(--border)]">
        {stats.map((s, i) => (
          <div
            key={i}
            className="stat-strip__item flex-1"
            role="listitem"
          >
            <div className="flex items-center gap-1.5 mb-1 text-[var(--text-muted)]">
              {s.icon}
            </div>
            <div className="stat-strip__number">
              {fmt(s.count)}
            </div>
            <div className="stat-strip__label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getServerSession(authOptions);
  const user    = session?.user as SessionUser | null;

  const [
    {
      featuredCourses, ratingMap, featuredScholars,
      categories, counts, reviews,
    },
    continueLearning,
  ] = await Promise.all([
    getHomeData(),
    user ? getContinueLearning(user.id) : Promise.resolve([]),
  ]);

  const [courseCount, scholarCount, userCount] = counts;
  const mappedScholars = featuredScholars.map(mapScholar);

  // Enrich courses with batch-fetched average rating + all metadata for the carousel
  const enrichedCourses = featuredCourses.map((c) => ({
    id:                c.id,
    slug:              c.slug,
    title:             c.title,
    description:       c.description,
    shortDescription:  c.shortDescription ?? null,
    subtitle:          c.subtitle ?? null,
    thumbnailUrl:      c.thumbnailUrl,
    difficulty:        c.difficulty,
    estimatedDuration: c.estimatedDuration,
    enrollmentType:    c.enrollmentType,
    price:             c.price ?? null,
    currency:          c.currency ?? null,
    featured:          c.featured,
    avgRating:         ratingMap.get(c.id) ?? 0,
    enrollCount:       c._count.enrollments,
    moduleCount:       c._count.modules,
    categoryName:      c.category?.name ?? null,
    categoryIcon:      c.category?.icon ?? null,
    authorName:        c.scholar?.user.name ?? c.author.name,
    authorDesignation: c.scholar?.professionalDesignation ?? null,
  }));

  return (
    <div className="min-h-screen w-full">
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden pt-16 pb-14 sm:pt-24 sm:pb-20 w-full"
        aria-labelledby="hero-heading"
      >
        {/* Subtle geometric background pattern */}
        <div className="absolute inset-0 pattern-overlay opacity-30" aria-hidden="true" />
        {/* Warm radial bloom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% -5%, var(--accent-dim), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-card)]/70 backdrop-blur-sm mb-8">
            <GiStarFormation className="text-[var(--accent)] text-xs" aria-hidden="true" />
            <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
              Knowledge is Light
            </span>
            <GiStarFormation className="text-[var(--accent)] text-xs" aria-hidden="true" />
          </div>
          {/* Arabic */}
          <p
            className="arabic-bismillah text-2xl sm:text-3xl mb-7"
            lang="ar"
            aria-label="Bismillah ir-Rahman ir-Raheem"
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          {/* Headline */}
          <h1
            id="hero-heading"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight mb-6 text-[var(--text-primary)]"
          >
            {t('hero.title')}
            <br />
            with <span className="gradient-text">Clarity</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mb-10 leading-relaxed">
            {t('hero.subtitle')}
          </p>
          {/* Search */}
          <EnhancedSearch />
          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/courses"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white rounded-xl font-semibold shadow-md shadow-gold-600/30 hover:shadow-gold-500/40 transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
            >
              {t('hero.cta')} <FiArrowRight size={15} />
            </Link>
            <Link
              href="/scholars"
              className="flex items-center gap-2 px-6 py-3 border border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text-primary)] rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
            >
              {t('hero.secondaryCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats — editorial strip ── */}
      <section
        className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20"
        aria-label="Platform statistics"
      >
        <StatStrip
          courseCount={courseCount}
          scholarCount={scholarCount}
          userCount={userCount}
        />
      </section>

      {/* ── Continue Learning (signed-in users only) ── */}
      <ContinueLearningStrip courses={continueLearning} userName={user?.name} />

      {/* ── Featured Courses — premium carousel ── */}
      {enrichedCourses.length > 0 && (
        <section className="w-full py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <SectionHeader
              eyebrow="Structured Learning"
              title="Featured Courses"
              subtitle="A curated selection of courses to help you build meaningful Islamic knowledge."
              href="/courses"
              linkLabel="View All Courses"
            />
          </div>
          <div className="max-w-7xl mx-auto">
            <FeaturedCourseCarousel courses={enrichedCourses} />
          </div>
        </section>
      )}

      {/* ── Browse by Category ── */}
      <CategoryExplorer categories={categories} />

      {/* ── Why Ilm Platform ── */}
      <WhyIlmPlatform />

      {/* ── Featured Scholars ── */}
      {mappedScholars.length > 0 && (
        <section
          className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
          aria-labelledby="scholars-heading"
        >
          <SectionHeader
            eyebrow="Learn from the best"
            title="Featured Scholars"
            subtitle="Our featured scholars bring deep expertise and authentic scholarship to every course."
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

      {/* ── Social Proof — real course reviews ── */}
      <SocialProofSection reviews={reviews} />

      {/* ── Final CTA + Newsletter ── */}
      <section
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
        aria-labelledby="cta-heading"
      >
        <div className="relative rounded-3xl overflow-hidden border border-[var(--border-strong)]">
          <div className="absolute inset-0 hero-bg opacity-80" aria-hidden="true" />
          <div className="absolute inset-0 pattern-overlay opacity-20" aria-hidden="true" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 50% 100%, var(--accent-dim), transparent)",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-0 hero-line" aria-hidden="true" />
          <div className="relative px-6 py-14 sm:py-20 flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] animate-pulse-accent mb-6">
              <GiMoon className="text-[var(--accent)] text-2xl" aria-hidden="true" />
            </div>
            {user ? (
              <>
                <h2
                  id="cta-heading"
                  className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4 leading-tight"
                >
                  Welcome back, {user.name?.split(" ")[0]} 🌙
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
                <h2
                  id="cta-heading"
                  className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4 leading-tight"
                >
                  Start Your Journey Today
                </h2>
                <p className="text-[var(--text-secondary)] mb-8 max-w-sm text-sm sm:text-base leading-relaxed">
                  Join students seeking authentic Islamic knowledge from qualified scholars.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
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
                {/* Newsletter signup — merged into CTA for unauthenticated */}
                <div className="w-full max-w-md border-t border-[var(--border)] pt-8">
                  <p className="text-sm text-[var(--text-secondary)] mb-4 flex items-center justify-center gap-2">
                    <FiMail size={14} className="text-[var(--accent)]" aria-hidden="true" />
                    Get notified about new courses and scholars
                  </p>
                  <NewsletterForm />
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
