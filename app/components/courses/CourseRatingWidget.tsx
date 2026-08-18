"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { FiStar, FiLoader, FiLock, FiCheckCircle, FiAward } from "react-icons/fi";

interface RatingItem {
  id:        string;
  rating:    number;
  review:    string | null;
  user:      { id: string; name: string; image: string | null };
  createdAt: string;
}

interface RatingData {
  avgRating:    number;
  totalRatings: number;
  ratings:      RatingItem[];
}

async function fetchRatings(courseId: string): Promise<RatingData> {
  const res  = await fetch(`/api/ratings?courseId=${courseId}`);
  const data = await res.json() as { success?: boolean; data?: RatingData };
  return data.success && data.data
    ? data.data
    : { avgRating: 0, totalRatings: 0, ratings: [] };
}

// ── Star row ──────────────────────────────────────────────────────────────────

function StarRow({
  value,
  interactive,
  size = 18,
  onRate,
}: {
  value:       number;
  interactive: boolean;
  size?:       number;
  onRate?:     (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const display = interactive ? (hover || value) : value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => interactive && onRate?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          disabled={!interactive}
          className={`transition-all ${
            interactive
              ? "cursor-pointer hover:scale-110"
              : "cursor-default"
          } ${i <= display ? "text-[var(--accent-light)]" : "text-[var(--border-strong)]"}`}
          aria-label={interactive ? `Rate ${i} star${i !== 1 ? "s" : ""}` : undefined}
        >
          <FiStar size={size} className={i <= display ? "fill-current" : ""} />
        </button>
      ))}
    </div>
  );
}

const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function CourseRatingWidget({
  courseId,
  isEnrolled,
  isCompleted = false,
}: {
  courseId:    string;
  isEnrolled:  boolean;
  isCompleted?: boolean;
}) {
  const { data: session }  = useSession();
  const queryClient        = useQueryClient();

  const [userRating, setUserRating] = useState(0);
  const [review,     setReview]     = useState("");
  const [submitted,  setSubmitted]  = useState(false);

  const { data, isLoading } = useQuery({
    queryKey:  ["ratings", courseId],
    queryFn:   () => fetchRatings(courseId),
    staleTime: 60_000,
  });

  const submitRating = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ratings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          courseId,
          rating: userRating,
          review: review.trim() || undefined,
        }),
      });
      const d = await res.json() as { success?: boolean; error?: string };
      if (!d.success) throw new Error(d.error ?? "Failed to submit review");
    },
    onSuccess: () => {
      setSubmitted(true);
      void queryClient.invalidateQueries({ queryKey: ["ratings", courseId] });
    },
  });

  if (isLoading) {
    return <div className="h-32 shimmer rounded-2xl" />;
  }

  const avg   = data?.avgRating    ?? 0;
  const total = data?.totalRatings ?? 0;

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-5">
        Student Reviews
      </h2>

      {/* ── Aggregate score ── */}
      <div className="glass-card rounded-2xl p-5 mb-6 flex items-center gap-6">
        <div className="text-center flex-shrink-0">
          <div className="font-display text-5xl font-bold text-[var(--accent)] leading-none mb-1">
            {avg > 0 ? avg.toFixed(1) : "—"}
          </div>
          <StarRow value={Math.round(avg)} interactive={false} />
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            {total} review{total !== 1 ? "s" : ""}
          </p>
        </div>

        {total > 0 && (
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = data?.ratings.filter((r) => r.rating === star).length ?? 0;
              const pct   = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 tabular-nums text-[var(--text-secondary)] font-medium">{star}</span>
                  <FiStar size={11} className="text-[var(--accent-light)] flex-shrink-0 fill-current" />
                  <div className="flex-1 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border)]">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 text-right tabular-nums text-[var(--text-secondary)] font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Review form — only for completed students ── */}
      {!session ? (
        /* Not logged in */
        <div className="glass-card rounded-xl p-5 mb-6 flex items-center gap-3 border border-[var(--border)]">
          <FiLock size={16} className="text-[var(--text-muted)] flex-shrink-0" />
          <p className="text-sm text-[var(--text-muted)]">
            <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-light)] font-medium">
              Sign in
            </Link>{" "}
            and complete the course to leave a review.
          </p>
        </div>
      ) : !isEnrolled ? (
        /* Logged in but not enrolled */
        <div className="glass-card rounded-xl p-5 mb-6 flex items-center gap-3 border border-[var(--border)]">
          <FiLock size={16} className="text-[var(--text-muted)] flex-shrink-0" />
          <p className="text-sm text-[var(--text-muted)]">
            Enroll in this course to leave a review.
          </p>
        </div>
      ) : !isCompleted ? (
        /* Enrolled but not finished */
        <div className="glass-card rounded-xl p-5 mb-6 border border-[var(--border-strong)]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
              <FiAward size={16} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                Finish the course to leave a review
              </p>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Reviews are only available to students who have completed all lessons and passed
                any required quizzes. Keep learning — you&apos;re almost there!
              </p>
            </div>
          </div>
        </div>
      ) : submitted ? (
        /* Successfully submitted */
        <div className="glass-card rounded-xl p-5 mb-6 bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
          <FiCheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">Thank you for your review!</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Your feedback helps other students discover this course.
            </p>
          </div>
        </div>
      ) : (
        /* Completed — show the review form */
        <div className="glass-card rounded-xl p-5 mb-6 border border-[var(--border-strong)] space-y-4">
          <div className="flex items-center gap-2">
            <FiAward size={15} className="text-[var(--accent)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Rate this course
            </p>
            <span className="text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto">
              Course Completed ✓
            </span>
          </div>

          {/* Star picker */}
          <div className="space-y-1.5">
            <StarRow
              value={userRating}
              interactive
              size={24}
              onRate={(v) => setUserRating(v)}
            />
            {userRating > 0 && (
              <p className="text-xs text-[var(--accent)] font-medium">
                {ratingLabels[userRating]}
              </p>
            )}
          </div>

          {/* Review text — required */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
              Your review <span className="text-red-400">*</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What did you learn? Would you recommend this course? What could be improved?"
              rows={4}
              className="w-full px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              {review.length}/1000
            </p>
          </div>

          {submitRating.isError && (
            <p className="text-xs text-red-400">
              {(submitRating.error as Error).message}
            </p>
          )}

          <button
            onClick={() => submitRating.mutate()}
            disabled={submitRating.isPending || userRating === 0 || review.trim().length < 10}
            className="btn-primary text-sm w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitRating.isPending ? (
              <><FiLoader className="animate-spin" size={14} /> Submitting…</>
            ) : (
              <><FiStar size={14} /> Submit Review</>
            )}
          </button>

          {userRating === 0 && (
            <p className="text-[11px] text-[var(--text-muted)] text-center">
              Select a star rating above to continue
            </p>
          )}
          {userRating > 0 && review.trim().length < 10 && (
            <p className="text-[11px] text-[var(--text-muted)] text-center">
              Please write at least 10 characters in your review
            </p>
          )}
        </div>
      )}

      {/* ── Reviews list ── */}
      {data && data.ratings.length > 0 && (
        <div className="space-y-3">
          {data.ratings.slice(0, 10).map((r) => (
            <div
              key={r.id}
              className="rounded-xl p-5 border border-[var(--border-strong)] bg-[var(--bg-card)]"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-[var(--accent-dim)] border border-[var(--border-strong)]">
                  {r.user.image ? (
                    <Image
                      src={r.user.image}
                      alt={r.user.name}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--accent)] text-sm font-bold">
                      {r.user.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + stars + date row */}
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {r.user.name}
                      </span>
                      <StarRow value={r.rating} interactive={false} size={12} />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(r.createdAt)}
                    </span>
                  </div>

                  {/* Review body — use text-primary for max readability */}
                  {r.review && (
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed opacity-90">
                      {r.review}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.ratings.length === 0 && (
        <div className="rounded-xl p-8 text-center border border-[var(--border)] bg-[var(--bg-card)]">
          <FiStar size={24} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">No reviews yet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Be the first to review this course after completing it.
          </p>
        </div>
      )}
    </section>
  );
}
