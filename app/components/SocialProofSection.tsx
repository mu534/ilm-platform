import { FiStar } from 'react-icons/fi';
import * as Avatar from '@radix-ui/react-avatar';

export interface CourseReview {
  id: string;
  rating: number;
  review: string;
  userName: string;
  userImage: string | null;
  courseTitle: string;
}

export interface SocialProofSectionProps {
  reviews: CourseReview[];
}

export default function SocialProofSection({ reviews }: SocialProofSectionProps) {
  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="flex flex-col items-center mb-12 text-center">
        <span className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-3">
          Student Reviews
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
          What Our Students Say
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl p-6 bg-[var(--bg-card)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 flex flex-col h-full"
          >
            <div className="flex items-center mb-4">
              {[...Array(5)].map((_, i) => (
                <FiStar
                  key={i}
                  size={14}
                  className={
                    i < review.rating
                      ? 'fill-gold-400 text-gold-400'
                      : 'text-[var(--text-muted)]'
                  }
                />
              ))}
            </div>

            <blockquote className="flex-grow mb-6">
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed italic line-clamp-4">
                &quot;{review.review}&quot;
              </p>
            </blockquote>

            <div className="h-px bg-[var(--border)] w-full mb-5"></div>

            <div className="flex items-center gap-3">
              <Avatar.Root className="inline-flex h-10 w-10 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-[var(--accent-dim)] text-[var(--accent)] align-middle">
                {review.userImage && (
                  <Avatar.Image
                    className="h-full w-full object-cover"
                    src={review.userImage}
                    alt={review.userName}
                  />
                )}
                <Avatar.Fallback className="flex h-full w-full items-center justify-center text-sm font-medium">
                  {review.userName.charAt(0).toUpperCase()}
                </Avatar.Fallback>
              </Avatar.Root>
              
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {review.userName}
                </span>
                <span className="text-xs text-[var(--text-muted)] mt-0.5">
                  {review.courseTitle}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
