import Link from "next/link";
import { FiTrendingUp, FiHash } from "react-icons/fi";
import { GiStarFormation } from "react-icons/gi";

interface Topic {
  name: string;
  count: number;
}

interface PopularTopicsProps {
  topics: Topic[];
}

const topicColors = [
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-green-500/20 text-green-400 border-green-500/30",
  "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "bg-gold-500/20 text-gold-400 border-gold-500/30",
  "bg-red-500/20 text-red-400 border-red-500/30",
  "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "bg-teal-500/20 text-teal-400 border-teal-500/30",
];

export function PopularTopics({ topics }: PopularTopicsProps) {
  if (topics.length === 0) {
    return null; // Don't render if no topics
  }

  return (
   <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-[var(--border)]">
  <div className="text-center mb-10">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--accent-dim)] mb-3">
      <GiStarFormation className="text-gold-400 text-xs" />
      <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
        Explore Topics
      </span>
      <GiStarFormation className="text-gold-400 text-xs" />
    </div>
    <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight">
      Popular Subjects
    </h2>
    <p className="text-[var(--text-secondary)] mt-2 text-sm">
      Discover lectures by topic and deepen your knowledge
    </p>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
    {topics.map((topic, index) => (
      <Link
        key={topic.name}
        href={`/lectures?topic=${encodeURIComponent(topic.name)}`}
        className="group relative rounded-xl p-4 border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-300 animate-fadeInUp"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Top gold strip on hover */}
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-gold-400 to-gold-600 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex items-center justify-between mb-3">
          <FiHash className="text-[var(--accent)] opacity-70" size={16} />
          <FiTrendingUp className="text-[var(--accent)] opacity-40 group-hover:opacity-70 transition-opacity" size={14} />
        </div>

        <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-1 group-hover:text-[var(--accent)] transition-colors">
          {topic.name}
        </h3>

        <p className="text-xs text-[var(--text-muted)]">
          {topic.count} lecture{topic.count !== 1 ? "s" : ""}
        </p>
      </Link>
    ))}
  </div>

  <div className="text-center mt-8">
    <Link
      href="/lectures"
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium border border-[var(--border-strong)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all duration-300 hover:scale-105 active:scale-95"
    >
      Browse All Lectures
    </Link>
  </div>
</section>
  );
}