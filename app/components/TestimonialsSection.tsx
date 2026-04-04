import { FiStar } from "react-icons/fi";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Ahmed",
    role: "Student",
    content: "This platform has transformed my understanding of Islamic teachings. The scholars are incredibly knowledgeable and the lectures are beautifully presented.",
    rating: 5,
  },
  {
    id: "2",
    name: "Mohammed Khan",
    role: "Professional",
    content: "Finding authentic Islamic knowledge was always challenging until I discovered this platform. The quality and depth of content is exceptional.",
    rating: 5,
  },
  {
    id: "3",
    name: "Aisha Rahman",
    role: "Parent",
    content: "As a parent, I wanted my children to learn from qualified scholars. This platform provides exactly that - authentic, reliable Islamic education.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-white/5">
      <div className="text-center mb-12">
        <p className="text-xs text-gold-400 uppercase tracking-widest font-semibold mb-1.5">
          What our students say
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
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

            <blockquote className="text-ink-200 text-sm leading-relaxed mb-6">
              "{testimonial.content}"
            </blockquote>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-semibold text-sm">
                {testimonial.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-white text-sm">{testimonial.name}</div>
                <div className="text-ink-400 text-xs">{testimonial.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}