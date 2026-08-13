import { FiBookOpen, FiShield, FiTrendingUp, FiClock } from 'react-icons/fi';
import { getTranslations } from 'next-intl/server';

export default async function WhyIlmPlatform() {
  const t = await getTranslations('whyIlm');
  const features = [
    { icon: <FiBookOpen className="w-5 h-5 text-[var(--accent)]" />, key: 'structured' },
    { icon: <FiShield className="w-5 h-5 text-[var(--accent)]" />, key: 'scholars' },
    { icon: <FiTrendingUp className="w-5 h-5 text-[var(--accent)]" />, key: 'progress' },
    { icon: <FiClock className="w-5 h-5 text-[var(--accent)]" />, key: 'pace' },
  ] as const;

  return (
    <section className="w-full" aria-labelledby="why-ilm-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* ── Editorial statement ── */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — heading column */}
          <div className="lg:sticky lg:top-24">
            <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-4">
              {t('eyebrow')}
            </p>
            <h2
              id="why-ilm-title"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--text-primary)] leading-tight"
            >
              {t('title')}
            </h2>
            <div className="mt-6 h-px bg-gradient-to-r from-[var(--border-strong)] to-transparent w-32" aria-hidden="true" />
            <p className="mt-6 text-[var(--text-secondary)] text-base leading-relaxed max-w-md">
              {t('description')}
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
                    {t(`features.${feature.key}.title`)}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                    {t(`features.${feature.key}.description`)}
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
