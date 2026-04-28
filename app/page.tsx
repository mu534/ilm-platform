import Link from "next/link";
import { prisma } from "@/app/lib/prism";
import { LectureCard } from "@/app/components/lectures/LectureCard";
import { ScholarCard } from "@/app/components/scholars/ScholarCard";
import { TestimonialsSection } from "@/app/components/TestimonialsSection";
import { NewsletterSignup } from "@/app/components/NewsletterSignup";
import { EnhancedSearch } from "@/app/components/EnhancedSearch";
import { PersonalizedRecommendations } from "@/app/components/PersonalizedRecommendations";
import { RecentActivityFeed } from "@/app/components/RecentActivityFeed";
import { PopularTopics } from "@/app/components/PopularTopics";
import { QuickAccess } from "@/app/components/QuickAccess";
import type { Lecture, Scholar } from "@/app/types/auth.types";
import {

  FiArrowRight,
  FiBookOpen,
  FiUsers,
  FiVideo,
  FiMessageCircle,
  FiClock,
} from "react-icons/fi";
import { GiMoon, GiStarFormation } from "react-icons/gi";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getHomeData() {
  const [featuredLectures, latestLectures, featuredScholars, counts, recentStats, popularTopics, recentActivity, testimonials] =
    await Promise.all([
      prisma.lecture.findMany({
        where: { published: true, featured: true },
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, image: true } },
          scholar: { include: { user: { select: { name: true } } } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.lecture.findMany({
        where: { published: true },
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, image: true } },
          scholar: { include: { user: { select: { name: true } } } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.scholar.findMany({
        where: { featured: true },
        take: 4,
        include: {
          user: { select: { name: true, email: true, image: true } },
          _count: { select: { lectures: true } },
        },
      }),
      Promise.all([
        prisma.lecture.count({ where: { published: true } }),
        prisma.scholar.count(),
        prisma.user.count(),
      ]),
      // Recent activity stats
      Promise.all([
        prisma.comment.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
        prisma.lecture.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
            published: true,
          },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]),
      // Popular topics based on actual lecture tags
      prisma.lecture.findMany({
        where: { published: true },
        select: { tags: true },
        take: 100, // Sample recent lectures to analyze tags
      }),
      // Recent activity for feed
      Promise.all([
        // Recent comments
        prisma.comment.findMany({
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { name: true, image: true } },
            lecture: { select: { title: true, slug: true } },
          },
        }),
        // Recent lectures
        prisma.lecture.findMany({
          where: { published: true },
          take: 2,
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { name: true } },
            scholar: { include: { user: { select: { name: true } } } },
          },
        }),
        // Recent scholars
        prisma.scholar.findMany({
          take: 2,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true } },
          },
        }),
      ]),
      // Testimonials from database (assuming we add a testimonials table)
      prisma.user.findMany({
        where: {
          bio: { not: null },
          role: "USER", // Regular users who might have testimonials
        },
        take: 3,
        select: {
          name: true,
          image: true,
          bio: true,
        },
      }),
    ]);

  return { featuredLectures, latestLectures, featuredScholars, counts, recentStats, popularTopics, recentActivity, testimonials };
}

type PrismaLecture = {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  type: "TEXT" | "VIDEO";
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  published: boolean;
  featured: boolean;
  views: number;
  createdAt: Date;
  author: { id: string; name: string; image: string | null };
  scholar: {
    id: string;
    bio: string;
    photo: string | null;
    topics: string[];
    user: { name: string };
  } | null;
  _count: { comments: number };
};

type PrismaScholar = {
  id: string;
  userId: string;
  bio: string;
  photo: string | null;
  topics: string[];
  qualifications: string[];
  featured: boolean;
  user: { name: string; email: string; image: string | null };
  _count: { lectures: number };
};

function mapLecture(l: PrismaLecture): Lecture {
  return {
    ...l,
    createdAt: l.createdAt.toISOString(),
    scholar: l.scholar
      ? {
          id: l.scholar.id,
          bio: l.scholar.bio,
          photo: l.scholar.photo,
          topics: l.scholar.topics,
          user: { name: l.scholar.user.name },
        }
      : null,
  };
}

function mapScholar(s: PrismaScholar): Scholar {
  return { ...s };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-8 gap-4">
      <div>
        <p className="text-xs text-accent uppercase tracking-widest font-semibold mb-1.5">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-primary leading-tight">
          {title}
        </h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="flex-shrink-0 flex items-center gap-1.5 text-sm text-accent hover:text-accent-light transition-colors group"
        >
          {linkLabel}
          <FiArrowRight
            size={14}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      )}
    </div>
  );
}

function StatCard({
  icon,
  count,
  label,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 sm:p-6 rounded-2xl border border-theme bg-card/[0.02] hover:bg-card/[0.04] hover:border-accent transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/10">
      <div className="text-accent text-xl transition-transform duration-300 hover:scale-110">{icon}</div>
      <div className="font-display text-2xl sm:text-4xl font-bold text-primary tabular-nums transition-colors duration-300">
        {count.toLocaleString()}
      </div>
      <div className="text-xs sm:text-sm text-muted">{label}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const { featuredLectures, latestLectures, featuredScholars, counts, recentStats, popularTopics, recentActivity, testimonials } =
    await getHomeData();

  const [lectureCount, scholarCount, userCount] = counts;
  const [recentComments, recentLectures, recentUsers] = recentStats;
  const [recentCommentsData, recentLecturesData, recentScholarsData] = recentActivity;

  const mappedFeatured = featuredLectures.map(mapLecture);
  const mappedLatest = latestLectures.map(mapLecture);
  const mappedScholars = featuredScholars.map(mapScholar);

  // Process popular topics from lecture tags
  const tagCounts: Record<string, number> = {};
  popularTopics.forEach(lecture => {
    lecture.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const processedPopularTopics = Object.entries(tagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Process testimonials
  const processedTestimonials = testimonials.map(user => ({
    id: user.name, // Using name as ID for now
    name: user.name,
    role: "Student", // Default role
    content: user.bio || "Great platform for Islamic learning!",
    rating: 5,
  }));

  // Process recent activity
  const processedActivity = [
    ...recentCommentsData.map(comment => ({
      id: `comment-${comment.id}`,
      type: "comment" as const,
      title: `New comment on "${comment.lecture.title}"`,
      description: comment.body.length > 100 ? comment.body.substring(0, 100) + "..." : comment.body,
      user: { name: comment.author.name, image: comment.author.image },
      timestamp: comment.createdAt,
      link: `/lectures/${comment.lecture.slug}`,
    })),
    ...recentLecturesData.map(lecture => ({
      id: `lecture-${lecture.id}`,
      type: "lecture" as const,
      title: "New lecture published",
      description: `"${lecture.title}" by ${lecture.scholar?.user.name || lecture.author.name}`,
      user: { name: lecture.author.name },
      timestamp: lecture.createdAt,
      link: `/lectures/${lecture.slug}`,
    })),
    ...recentScholarsData.map(scholar => ({
      id: `scholar-${scholar.id}`,
      type: "scholar" as const,
      title: "New scholar joined",
      description: `${scholar.user.name} joined the platform`,
      user: { name: scholar.user.name },
      timestamp: scholar.createdAt,
      link: `/scholars/${scholar.id}`,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);

  return (
    <div className="min-h-screen w-full">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 sm:py-28 md:py-36 w-full animate-fadeInUp">
        <div className="absolute inset-0 pattern-overlay opacity-40" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-ink-950 to-transparent pointer-events-none" />

        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-8">
            <GiStarFormation className="text-accent text-xs" />
            <span className="text-xs tracking-widest text-accent uppercase font-semibold">
              Knowledge is Light
            </span>
            <GiStarFormation className="text-accent text-xs" />
          </div>

          <p className="arabic-bismillah text-2xl sm:text-3xl mb-6 text-accent/80">
            بِسْمِ اللّٰهِ الرَّحْمَنِ الرَّحِيْمِ
          </p>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold gradient-text leading-[1.1] tracking-tight mb-6">
            Seek Knowledge
            <br />
            with <span className="gradient-text">Clarity</span>
          </h1>

          <p className="text-base sm:text-lg text-secondary max-w-xl mb-10 leading-relaxed">
            Access authentic Islamic lectures, connect with qualified scholars,
            and deepen your understanding of the Deen.
          </p>

          <EnhancedSearch />

          <PersonalizedRecommendations />

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/lectures"
              className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-light active:bg-accent text-primary rounded-xl font-medium transition-colors text-sm"
            >
              Explore Lectures <FiArrowRight size={15} />
            </Link>
            <Link
              href="/scholars"
              className="flex items-center gap-2 px-6 py-3 border border-theme hover:border-accent hover:bg-card-hover text-primary rounded-xl font-medium transition-colors text-sm"
            >
              Meet Scholars
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 animate-fadeInUp delay-100">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <StatCard icon={<FiVideo />} count={lectureCount} label="Lectures" />
          <StatCard icon={<FiUsers />} count={scholarCount} label="Scholars" />
          <StatCard icon={<FiBookOpen />} count={userCount} label="Students" />
          <StatCard icon={<FiMessageCircle />} count={recentComments} label="Comments (24h)" />
          <StatCard icon={<FiClock />} count={recentLectures} label="New This Week" />
        </div>

        {/* Social Proof */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">
              {recentUsers} new students joined this month
            </span>
          </div>
        </div>
      </section>

      {/* ── Featured Lectures ── */}
      {mappedFeatured.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 animate-fadeInUp delay-200">
          <SectionHeader
            eyebrow="Handpicked for you"
            title="Featured Lectures"
            href="/lectures?featured=true"
            linkLabel="View all"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mappedFeatured.map((lecture) => (
              <LectureCard
                key={lecture.id}
                lecture={lecture}
                variant="featured"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Latest Lectures ── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-theme animate-fadeInUp delay-300">
        <SectionHeader
          eyebrow="Most recent"
          title="Latest Lectures"
          href="/lectures"
          linkLabel="View all"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mappedLatest.map((lecture) => (
            <LectureCard key={lecture.id} lecture={lecture} />
          ))}
        </div>
      </section>

      {/* ── Popular Topics ── */}
      <PopularTopics topics={processedPopularTopics} />

      {/* ── Quick Access ── */}
      <QuickAccess />

      {/* ── Featured Scholars ── */}
      {mappedScholars.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-theme animate-fadeInUp delay-100">
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

    
      <TestimonialsSection testimonials={processedTestimonials} />

     
      <RecentActivityFeed activities={processedActivity} />

     
      <NewsletterSignup />

    
       <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
         <div className="relative rounded-3xl overflow-hidden border border-[var(--border-strong)]">
  <div className="absolute inset-0 hero-bg opacity-80" />
        <div className="absolute inset-0 pattern-overlay opacity-20" />
          <div className="relative px-6 py-14 sm:py-20 flex flex-col items-center text-center">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] animate-pulse-accent">
              <GiMoon className="text-[var(--accent)] text-2xl" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-4 leading-tight">
              Start Your Journey Today
            </h2>
            <p className="text-secondary mb-8 max-w-sm text-sm sm:text-base leading-relaxed">
              Join thousands of students seeking authentic Islamic knowledge
              from qualified scholars.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent hover:bg-accent-light active:bg-accent text-primary rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/25 text-sm"
              >
                Create Free Account <FiArrowRight size={15} />
              </Link>
              <Link
                href="/lectures"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-theme hover:border-accent hover:bg-card-hover text-primary rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm"
              >
                Browse Lectures
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
