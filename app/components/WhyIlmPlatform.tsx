import { FiBookOpen, FiShield, FiTrendingUp, FiClock } from 'react-icons/fi';

export default function WhyIlmPlatform() {
  const features = [
    {
      icon: <FiBookOpen className="w-6 h-6 text-[var(--accent)]" />,
      title: 'Structured Learning',
      description: 'Courses organized into clear modules with sequential lectures and progress tracking.',
    },
    {
      icon: <FiShield className="w-6 h-6 text-[var(--accent)]" />,
      title: 'Qualified Scholars',
      description: 'Learn from featured, verified scholars with deep expertise in Islamic sciences.',
    },
    {
      icon: <FiTrendingUp className="w-6 h-6 text-[var(--accent)]" />,
      title: 'Track Your Progress',
      description: 'Monitor your learning journey with enrollment tracking and completion certificates.',
    },
    {
      icon: <FiClock className="w-6 h-6 text-[var(--accent)]" />,
      title: 'Learn at Your Pace',
      description: 'Access all content anytime, from any device, and learn on your own schedule.',
    },
  ];

  return (
    <section className="w-full bg-[var(--bg-secondary)]" aria-labelledby="why-ilm-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-[var(--accent)] text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">
            Why Ilm Platform
          </p>
          <h2 id="why-ilm-title" className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
            A Premium Learning Experience
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-6">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col group">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-dim)] border border-[var(--border)] flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="font-body text-lg font-semibold text-[var(--text-primary)] mb-2">
                {feature.title}
              </h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
