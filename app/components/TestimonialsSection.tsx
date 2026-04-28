import { FiStar } from "react-icons/fi";
import { GiStarFormation } from "react-icons/gi";

interface Testimonial {
  id:      string;
  name:    string;
  role:    string;
  avatar?: string;
  content: string;
  rating:  number;
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  if (testimonials.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-[var(--border-subtle)]">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--accent-dim)] mb-3">
          <GiStarFormation className="text-gold-400 text-xs" />
          <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
            What our students say
          </span>
          <GiStarFormation className="text-gold-400 text-xs" />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight">
          Trusted by Thousands
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, i) => (
          <div
            key={testimonial.id}
            className="
              group relative rounded-2xl p-6 border border-[var(--border)]
              bg-[var(--bg-card)] hover:border-[var(--border-strong)]
              hover:shadow-[var(--shadow-lg)] hover:-translate-y-1
              transition-all duration-300 animate-fadeInUp
            "
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Top gold strip on hover */}
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-gold-400 to-gold-600 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Stars */}
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <FiStar key={i} className="w-4 h-4 fill-gold-400 text-gold-400" />
              ))}
            </div>

            {/* Quote */}
            <blockquote className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 italic">
              &ldquo;{testimonial.content}&rdquo;
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] font-bold text-sm">
                {testimonial.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-[var(--text-primary)] text-sm">
                  {testimonial.name}
                </div>
                <div className="text-[var(--text-muted)] text-xs">{testimonial.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}