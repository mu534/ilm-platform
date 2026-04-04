import Link from "next/link";
import { FiPlay, FiUsers, FiBookOpen, FiStar, FiSearch } from "react-icons/fi";

const quickAccessItems = [
  {
    title: "Browse Lectures",
    description: "Explore our complete collection of Islamic lectures",
    icon: <FiSearch className="text-blue-400" size={20} />,
    href: "/lectures",
    color: "hover:bg-blue-500/10 hover:border-blue-500/30",
  },
  {
    title: "Featured Content",
    description: "Handpicked lectures from our scholars",
    icon: <FiStar className="text-gold-400" size={20} />,
    href: "/lectures?featured=true",
    color: "hover:bg-gold-500/10 hover:border-gold-500/30",
  },
  {
    title: "Meet Scholars",
    description: "Connect with qualified Islamic scholars",
    icon: <FiUsers className="text-purple-400" size={20} />,
    href: "/scholars",
    color: "hover:bg-purple-500/10 hover:border-purple-500/30",
  },
  {
    title: "Beginner Guides",
    description: "Start your Islamic learning journey",
    icon: <FiBookOpen className="text-green-400" size={20} />,
    href: "/lectures?level=beginner",
    color: "hover:bg-green-500/10 hover:border-green-500/30",
  },
];

export function QuickAccess() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-white/5">
      <div className="text-center mb-8">
        <p className="text-xs text-gold-400 uppercase tracking-widest font-semibold mb-1.5">
          Quick Access
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
          Jump Right In
        </h2>
        <p className="text-ink-300 mt-2 text-sm">
          Popular starting points for your Islamic learning journey
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickAccessItems.map((item, index) => (
          <Link
            key={item.title}
            href={item.href}
            className={`group glass-card gold-border rounded-xl p-6 text-center hover:bg-white/[0.03] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gold-500/10 animate-fadeInUp ${item.color}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                {item.icon}
              </div>
            </div>

            <h3 className="font-medium text-white text-sm mb-2 group-hover:text-gold-300 transition-colors">
              {item.title}
            </h3>

            <p className="text-ink-400 text-xs leading-relaxed">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}