import Link from "next/link";
import { FiSearch, FiUsers, FiBookOpen, FiStar } from "react-icons/fi";

const quickAccessItems = [
  {
    title: "Browse Lectures",
    description: "Explore our complete collection of Islamic lectures",
    icon: <FiSearch className="text-accent" size={20} />,
    href: "/lectures",
    color: "hover:bg-accent/10 hover:border-accent/30",
  },
  {
    title: "Browse Courses",
    description: "Structured learning paths from qualified scholars",
    icon: <FiBookOpen className="text-accent" size={20} />,
    href: "/courses",
    color: "hover:bg-accent/10 hover:border-accent/30",
  },
  {
    title: "Featured Content",
    description: "Handpicked lectures and courses from our scholars",
    icon: <FiStar className="text-accent" size={20} />,
    href: "/courses?featured=true",
    color: "hover:bg-accent/10 hover:border-accent/30",
  },
  {
    title: "Meet Scholars",
    description: "Connect with qualified Islamic scholars",
    icon: <FiUsers className="text-accent" size={20} />,
    href: "/scholars",
    color: "hover:bg-accent/10 hover:border-accent/30",
  },
];

export function QuickAccess() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-theme">
      <div className="text-center mb-8">
        <p className="text-xs text-accent uppercase tracking-widest font-semibold mb-1.5">
          Quick Access
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary leading-tight">
          Jump Right In
        </h2>
        <p className="text-secondary mt-2 text-sm">
          Popular starting points for your Islamic learning journey
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickAccessItems.map((item, index) => (
          <Link
            key={item.title}
            href={item.href}
            className={`group glass-card border-accent rounded-xl p-6 text-center hover:bg-card/[0.03] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/10 animate-fadeInUp ${item.color}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-card/5 group-hover:bg-card/10 transition-colors">
                {item.icon}
              </div>
            </div>

            <h3 className="font-medium text-primary text-sm mb-2 group-hover:text-accent-light transition-colors">
              {item.title}
            </h3>

            <p className="text-muted text-xs leading-relaxed">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}