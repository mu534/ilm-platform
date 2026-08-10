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
    <section
      className="w-full bg-[var(--bg-secondary)]"
      aria-labelledby="social-proof-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">

        {/* Section header */}
        <div className="mb-12 text-center">
          <span className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-3 inline-block">
            Student Reviews
          </span>
          <h2
            id="social-proof-heading"
            className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]"
          >
            What Our Students Say
          </h2>
          <p className="section-subtitle mx-auto text-center mt-2">
            Genuine feedback from students across our courses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <figure
              key={review.id}
              className="rounded-2xl p-6 bg-[var(--bg-card)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 flex flex-col h-full"
            >
              {/* Opening quote mark */}
              <div
                className="font-display text-5xl leading-none text-[var(--accent)] opacity-30 mb-3 select-none"
                aria-hidden="true"
              >
                &ldquo;
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4" aria-label={`${review.rating} out of 5 stars`}>
                {[...Array(5)].map((_, i) => (
                  <FiStar
                    key={i}
                    size={13}
                    className={
                      i < review.rating
                        ? 'fill-gold-400 text-gold-400'
                        : 'text-[var(--border)]'
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>

              {/* Review text */}
              <blockquote className="flex-grow mb-6">
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed line-clamp-4">
                  {review.review}
                </p>
              </blockquote>

              <figcaption>
                {/* Divider */}
                <div className="h-px bg-[var(--border)] w-full mb-4" aria-hidden="true" />

                {/* Reviewer */}
                <div className="flex items-center gap-3">
                  <Avatar.Root className="inline-flex h-9 w-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-[var(--accent-dim)] text-[var(--accent)] align-middle">
                    {review.userImage && (
                      <Avatar.Image
                        className="h-full w-full object-cover"
                        src={review.userImage}
                        alt={review.userName}
                      />
                    )}
                    <Avatar.Fallback className="flex h-full w-full items-center justify-center text-sm font-semibold">
                      {review.userName.charAt(0).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar.Root>

                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {review.userName}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                      {review.courseTitle}
                    </span>
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
