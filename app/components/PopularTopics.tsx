import Link from "next/link";
import { FiTrendingUp, FiHash } from "react-icons/fi";

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
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="text-center mb-8">
        <p className="text-xs text-gold-400 uppercase tracking-widest font-semibold mb-1.5">
          Explore Topics
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
          Popular Subjects
        </h2>
        <p className="text-ink-300 mt-2 text-sm">
          Discover lectures by topic and deepen your knowledge
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {topics.map((topic, index) => (
          <Link
            key={topic.name}
            href={`/lectures?topic=${encodeURIComponent(topic.name)}`}
            className={`group glass-card gold-border rounded-xl p-4 hover:bg-white/[0.03] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gold-500/10 animate-fadeInUp ${topicColors[index % topicColors.length]}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <FiHash className="text-current opacity-60" size={16} />
              <FiTrendingUp className="text-current opacity-40 group-hover:opacity-60 transition-opacity" size={14} />
            </div>

            <h3 className="font-medium text-white text-sm mb-1 group-hover:text-gold-300 transition-colors">
              {topic.name}
            </h3>

            <p className="text-xs opacity-70">
              {topic.count} lecture{topic.count !== 1 ? 's' : ''}
            </p>
          </Link>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/lectures"
          className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 hover:border-gold-500/30 hover:bg-white/5 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm"
        >
          Browse All Lectures
        </Link>
      </div>
    </section>
  );
}