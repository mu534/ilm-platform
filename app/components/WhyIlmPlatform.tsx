import { FiBookOpen, FiShield, FiTrendingUp, FiClock } from 'react-icons/fi';

const features = [
  {
    icon: <FiBookOpen className="w-5 h-5 text-[var(--accent)]" />,
    title: 'Structured Learning',
    description:
      'Each course is organized into clear modules with sequential lectures, quizzes, and progress tracking — so you always know where you are.',
  },
  {
    icon: <FiShield className="w-5 h-5 text-[var(--accent)]" />,
    title: 'Qualified Scholars',
    description:
      'Learn from verified scholars and experienced instructors with deep expertise in their fields of Islamic science.',
  },
  {
    icon: <FiTrendingUp className="w-5 h-5 text-[var(--accent)]" />,
    title: 'Track Your Progress',
    description:
      'Your enrollment, lecture completion, and course progress are tracked automatically — so your learning journey is always visible.',
  },
  {
    icon: <FiClock className="w-5 h-5 text-[var(--accent)]" />,
    title: 'Learn at Your Pace',
    description:
      'Access all course content anytime, from any device, and revisit lectures as many times as you need.',
  },
];

export default function WhyIlmPlatform() {
  return (
    <section className="w-full" aria-labelledby="why-ilm-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* ── Editorial statement ── */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — heading column */}
          <div className="lg:sticky lg:top-24">
            <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-4">
              Why Ilm Platform
            </p>
            <h2
              id="why-ilm-title"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--text-primary)] leading-tight"
            >
              Learning should be
              structured,
              authentic,
              and purposeful.
            </h2>
            <div className="mt-6 h-px bg-gradient-to-r from-[var(--border-strong)] to-transparent w-32" aria-hidden="true" />
            <p className="mt-6 text-[var(--text-secondary)] text-base leading-relaxed max-w-md">
              Ilm Platform brings together qualified scholars, structured course content,
              and real progress tracking — so every minute you invest in learning counts.
            </p>
          </div>

          {/* Right — features column */}
          <div className="flex flex-col gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex gap-5 group"
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border)] flex items-center justify-center mt-0.5 transition-colors duration-300 group-hover:border-[var(--border-strong)] group-hover:bg-[var(--bg-card)]">
                  {feature.icon}
                </div>

                {/* Text */}
                <div className="min-w-0">
                  <h3 className="font-body text-base font-semibold text-[var(--text-primary)] mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
