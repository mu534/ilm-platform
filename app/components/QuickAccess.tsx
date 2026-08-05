import Link from "next/link";
import { FiBookOpen, FiCompass, FiUsers, FiMessageSquare } from "react-icons/fi";

const quickAccessItems = [
  {
    title:       "Browse Courses",
    description: "Structured learning paths from qualified scholars",
    icon:        <FiBookOpen size={20} />,
    href:        "/courses",
  },
  {
    title:       "Explore by Subject",
    description: "Fiqh, Aqeedah, Qur'an, Hadith, and more",
    icon:        <FiCompass size={20} />,
    href:        "/courses",
  },
  {
    title:       "Meet Scholars",
    description: "Connect with qualified Islamic scholars",
    icon:        <FiUsers size={20} />,
    href:        "/scholars",
  },
  {
    title:       "Community Forum",
    description: "Ask questions and learn alongside other students",
    icon:        <FiMessageSquare size={20} />,
    href:        "/forum",
  },
];

export function QuickAccess() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-[var(--border)]">
      <div className="text-center mb-8">
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1.5">
          Quick Access
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight">
          Jump Right In
        </h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Popular starting points for your Islamic learning journey
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickAccessItems.map((item, index) => (
          <Link
            key={item.title}
            href={item.href}
            className="group relative rounded-2xl p-6 text-center border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-1 transition-all duration-300 animate-fadeInUp"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-[var(--accent-dim)] border border-[var(--border-subtle)] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </div>
            </div>

            <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-1.5 group-hover:text-[var(--accent)] transition-colors">
              {item.title}
            </h3>

            <p className="text-[var(--text-muted)] text-xs leading-relaxed">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
