// src/app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LectureCard } from "@/components/LectureCard";
import { ScholarCard } from "@/components/ScholarCard";
import {
  FiSearch,
  FiArrowRight,
  FiBookOpen,
  FiUsers,
  FiVideo,
} from "react-icons/fi";
import { GiMoon, GiStarFormation } from "react-icons/gi";

async function getHomeData() {
  const [featuredLectures, latestLectures, featuredScholars, stats] =
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

  return { featuredLectures, latestLectures, featuredScholars, stats };
}

export default async function HomePage() {
  const { featuredLectures, latestLectures, featuredScholars, stats } =
    await getHomeData();
  const [lectureCount, scholarCount, userCount] = stats;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="absolute inset-0 pattern-overlay" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold-400/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <GiStarFormation className="text-gold-400 text-sm" />
            <span className="text-xs tracking-widest text-gold-400 uppercase font-semibold">
              Knowledge is Light
            </span>
            <GiStarFormation className="text-gold-400 text-sm" />
          </div>

          <p className="arabic-bismillah text-3xl mb-8">
            بِسْمِ اللّٰهِ الرَّحْمَنِ الرَّحِيْمِ
          </p>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Seek Knowledge with <span className="gradient-text">Clarity</span>
          </h1>

          <p className="text-lg text-ink-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Access authentic Islamic lectures, connect with qualified scholars,
            and deepen your understanding of the Deen.
          </p>

          {/* Search */}
          <form
            action="/lectures"
            method="GET"
            className="max-w-xl mx-auto mb-10"
          >
            <div className="relative flex items-center">
              <FiSearch className="absolute left-4 text-ink-400" size={18} />
              <input
                name="search"
                type="text"
                placeholder="Search lectures, topics, scholars..."
                className="w-full pl-11 pr-32 py-4 bg-ink-800/80 border border-white/10 rounded-2xl text-white placeholder-ink-500 focus:outline-none focus:border-gold-500/50 text-sm backdrop-blur-sm"
              />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/lectures"
              className="flex items-center gap-2 px-6 py-3 bg-gold-600 hover:bg-gold-500 text-white rounded-xl font-medium transition-colors"
            >
              Explore Lectures <FiArrowRight size={16} />
            </Link>
            <Link
              href="/scholars"
              className="flex items-center gap-2 px-6 py-3 border border-white/10 hover:border-gold-500/30 text-white rounded-xl font-medium transition-colors"
            >
              Meet Scholars
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-ink-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { icon: <FiVideo />, count: lectureCount, label: "Lectures" },
              { icon: <FiUsers />, count: scholarCount, label: "Scholars" },
              { icon: <FiBookOpen />, count: userCount, label: "Students" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="flex items-center justify-center text-gold-400 mb-2">
                  {stat.icon}
                </div>
                <div className="font-display text-3xl md:text-4xl font-bold text-white">
                  {stat.count.toLocaleString()}
                </div>
                <div className="text-sm text-ink-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Lectures */}
      {featuredLectures.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-1">
                Handpicked for you
              </p>
              <h2 className="font-display text-3xl font-semibold text-white">
                Featured Lectures
              </h2>
            </div>
            <Link
              href="/lectures?featured=true"
              className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1 transition-colors"
            >
              View all <FiArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredLectures.map((lecture) => (
              <LectureCard
                key={lecture.id}
                lecture={lecture as any}
                variant="featured"
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Lectures */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-1">
              Most recent
            </p>
            <h2 className="font-display text-3xl font-semibold text-white">
              Latest Lectures
            </h2>
          </div>
          <Link
            href="/lectures"
            className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1"
          >
            View all <FiArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {latestLectures.map((lecture) => (
            <LectureCard key={lecture.id} lecture={lecture as any} />
          ))}
        </div>
      </section>

      {/* Featured Scholars */}
      {featuredScholars.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-1">
                Learn from the best
              </p>
              <h2 className="font-display text-3xl font-semibold text-white">
                Featured Scholars
              </h2>
            </div>
            <Link
              href="/scholars"
              className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1"
            >
              All Scholars <FiArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredScholars.map((scholar) => (
              <ScholarCard key={scholar.id} scholar={scholar as any} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-card gold-border rounded-3xl p-12 text-center pattern-overlay relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gold-900/20 to-transparent" />
          <div className="relative">
            <GiMoon className="text-gold-400 text-4xl mx-auto mb-4" />
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              Start Your Journey Today
            </h2>
            <p className="text-ink-300 mb-8 max-w-md mx-auto">
              Join thousands of students seeking authentic Islamic knowledge
              from qualified scholars.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gold-600 hover:bg-gold-500 text-white rounded-xl font-medium transition-colors"
            >
              Create Free Account <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
