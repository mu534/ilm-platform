import Link from "next/link";
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

// Cache the home page for 5 minutes — prevents DB queries on every visit
export const revalidate = 300;

// ─── Data fetching ────────────────────────────────────────────────────────────

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
    <div className="flex items-end justify-between mb-10 gap-4">
      <div>
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-2">
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
      flex flex-col items-center gap-2.5 p-6 sm:p-8 rounded-2xl text-center
      border border-[var(--border)] bg-[var(--bg-card)]
      hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)]
      hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5
      transition-all duration-300
    ">
      <div className="text-[var(--accent)] text-xl">{icon}</div>
      <div className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tabular-nums">
        {count.toLocaleString()}
      </div>
      <div className="text-xs sm:text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

// ─── Newsletter CTA (client island) ──────────────────────────────────────────

import { NewsletterForm } from "@/app/components/NewsletterForm";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
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

  // Enrich courses with batch-fetched average rating + author name
  const enrichedCourses = featuredCourses.map((c) => ({
    id:           c.id,
    slug:         c.slug,
    title:        c.title,
    thumbnailUrl: c.thumbnailUrl,
    difficulty:   c.difficulty,
    avgRating:    ratingMap.get(c.id) ?? 0,
    enrollCount:  c._count.enrollments,
    categoryName: c.category?.name ?? null,
    categoryIcon: c.category?.icon ?? null,
    authorName:   c.scholar?.user.name ?? c.author.name,
  }));

  return (
    <div className="min-h-screen w-full">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24 sm:pb-16 w-full">
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
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6 text-[var(--text-primary)]">
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

      {/* ── Stats — 3 core metrics ── */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          <StatCard icon={<FiBookOpen />} count={courseCount}  label="Courses"  />
          <StatCard icon={<FiUsers />}    count={scholarCount} label="Scholars" />
          <StatCard icon={<FiUser />}     count={userCount}    label="Students" />
        </div>
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
              href="/courses"
              linkLabel="View All Courses"
            />
          </div>
          <div className="max-w-7xl mx-auto">
            <FeaturedCourseCarousel courses={enrichedCourses} />
          </div>
        </section>
      )}

      {/* ── Browse by Category — alternating background ── */}
      <CategoryExplorer categories={categories} />

      {/* ── Why Ilm Platform — value propositions ── */}
      <WhyIlmPlatform />

      {/* ── Featured Scholars ── */}
      {mappedScholars.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
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

      {/* ── Social Proof — real course reviews ── */}
      <SocialProofSection reviews={reviews} />

      {/* ── Final CTA + Newsletter ── */}
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
                    <FiMail size={14} className="text-[var(--accent)]" />
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