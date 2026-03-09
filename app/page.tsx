import Link from "next/link";
import { prisma } from "../app/lib/prism";
import { LectureCard } from "../app/components/LectureCard";
import { ScholarCard } from "../app/components/ScholarCard";
import type { Lecture, Scholar } from "../app/types/auth.types";
import {
  FiSearch,
  FiArrowRight,
  FiBookOpen,
  FiUsers,
  FiVideo,
  FiStar,
} from "react-icons/fi";
import { GiMoon, GiStarFormation } from "react-icons/gi";

async function getHomeData() {
  const [featuredLectures, latestLectures, featuredScholars, counts] =
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
    ]);

  return { featuredLectures, latestLectures, featuredScholars, counts };
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

type PrismaLecture = {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  type: "TEXT" | "VIDEO" | "AUDIO";
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
        <p className="text-xs text-gold-400 uppercase tracking-widest font-semibold mb-1.5">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white leading-tight">
          {title}
        </h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="flex-shrink-0 flex items-center gap-1.5 text-sm text-gold-400 hover:text-gold-300 transition-colors group"
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
    <div className="flex flex-col items-center gap-2 p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="text-gold-400 text-xl">{icon}</div>
      <div className="font-display text-3xl sm:text-4xl font-bold text-white tabular-nums">
        {count.toLocaleString()}
      </div>
      <div className="text-sm text-ink-400">{label}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const { featuredLectures, latestLectures, featuredScholars, counts } =
    await getHomeData();

  const [lectureCount, scholarCount, userCount] = counts;

  const mappedFeatured = featuredLectures.map(mapLecture);
  const mappedLatest = latestLectures.map(mapLecture);
  const mappedScholars = featuredScholars.map(mapScholar);

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 sm:py-28 md:py-36">
        {/* Background layers */}
        <div className="absolute inset-0 pattern-overlay opacity-40" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-ink-950 to-transparent pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-500/20 bg-gold-500/5 mb-8">
            <GiStarFormation className="text-gold-400 text-xs" />
            <span className="text-xs tracking-widest text-gold-400 uppercase font-semibold">
              Knowledge is Light
            </span>
            <GiStarFormation className="text-gold-400 text-xs" />
          </div>

          {/* Arabic */}
          <p className="arabic-bismillah text-2xl sm:text-3xl mb-6 text-gold-300/80">
            بِسْمِ اللّٰهِ الرَّحْمَنِ الرَّحِيْمِ
          </p>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Seek Knowledge
            <br />
            with <span className="gradient-text">Clarity</span>
          </h1>

          <p className="text-base sm:text-lg text-ink-300 max-w-xl mx-auto mb-10 leading-relaxed">
            Access authentic Islamic lectures, connect with qualified scholars,
            and deepen your understanding of the Deen.
          </p>

          {/* Search */}
          <form
            action="/lectures"
            method="GET"
            className="max-w-lg mx-auto mb-8"
          >
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <FiSearch
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
                  size={17}
                />
                <input
                  name="search"
                  type="text"
                  placeholder="Search lectures, scholars, topics…"
                  className="w-full pl-11 pr-4 py-3.5 bg-ink-800/80 border border-white/10 rounded-xl text-white placeholder-ink-500 focus:outline-none focus:border-gold-500/40 text-sm backdrop-blur-sm transition-colors"
                />
              </div>
              <button
                type="submit"
                className="flex-shrink-0 px-5 py-3.5 bg-gold-600 hover:bg-gold-500 active:bg-gold-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/lectures"
              className="flex items-center gap-2 px-6 py-3 bg-gold-600 hover:bg-gold-500 active:bg-gold-700 text-white rounded-xl font-medium transition-colors text-sm"
            >
              Explore Lectures <FiArrowRight size={15} />
            </Link>
            <Link
              href="/scholars"
              className="flex items-center gap-2 px-6 py-3 border border-white/10 hover:border-gold-500/30 hover:bg-white/5 text-white rounded-xl font-medium transition-colors text-sm"
            >
              Meet Scholars
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={<FiVideo />} count={lectureCount} label="Lectures" />
          <StatCard icon={<FiUsers />} count={scholarCount} label="Scholars" />
          <StatCard icon={<FiBookOpen />} count={userCount} label="Students" />
        </div>
      </section>

      {/* ── Featured Lectures ── */}
      {mappedFeatured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-white/5">
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

      {/* ── Featured Scholars ── */}
      {mappedScholars.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-white/5">
          <SectionHeader
            eyebrow="Learn from the best"
            title="Featured Scholars"
            href="/scholars"
            linkLabel="All Scholars"
          />
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {mappedScholars.map((scholar) => (
              <ScholarCard key={scholar.id} scholar={scholar} />
            ))}
          </div>
        </section>
      )}

      {/* ── CTA Banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="relative rounded-3xl overflow-hidden border border-gold-500/20 bg-gradient-to-br from-gold-900/20 via-ink-900 to-ink-900">
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gold-500/10 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 pattern-overlay opacity-20" />

          <div className="relative px-6 py-14 sm:py-20 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/20 mb-6">
              <GiMoon className="text-gold-400 text-2xl" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Start Your Journey Today
            </h2>
            <p className="text-ink-300 mb-8 max-w-sm mx-auto text-sm sm:text-base leading-relaxed">
              Join thousands of students seeking authentic Islamic knowledge
              from qualified scholars.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold-600 hover:bg-gold-500 active:bg-gold-700 text-white rounded-xl font-medium transition-colors text-sm"
              >
                Create Free Account <FiArrowRight size={15} />
              </Link>
              <Link
                href="/lectures"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/10 hover:border-white/20 hover:bg-white/5 text-white rounded-xl font-medium transition-colors text-sm"
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
