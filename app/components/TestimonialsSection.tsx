import { FiStar } from "react-icons/fi";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  content: string;
  rating: number;
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  if (testimonials.length === 0) {
    return null; // Don't render if no testimonials
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-white/5">
      <div className="text-center mb-12">
        <p className="text-xs text-gold-400 uppercase tracking-widest font-semibold mb-1.5">
          What our students say
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary leading-tight">
          Trusted by Thousands
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="glass-card gold-border rounded-2xl p-6 hover:bg-white/[0.03] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gold-500/10"
          >
            <div className="flex items-center gap-1 mb-4">
              {[...Array(testimonial.rating)].map((_, i) => (
                <FiStar key={i} className="w-4 h-4 fill-gold-400 text-gold-400" />
              ))}
            </div>

            <blockquote className="text-secondary text-sm leading-relaxed mb-6">
              "{testimonial.content}"
            </blockquote>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-semibold text-sm">
                {testimonial.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-primary text-sm">{testimonial.name}</div>
                <div className="text-muted text-xs">{testimonial.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}