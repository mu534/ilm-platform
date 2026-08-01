"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FiStar, FiLoader } from "react-icons/fi";

interface RatingData {
  avgRating:    number;
  totalRatings: number;
  ratings: Array<{
    id:      string;
    rating:  number;
    review:  string | null;
    user:    { id: string; name: string; image: string | null };
    createdAt: string;
  }>;
}

async function fetchRatings(courseId: string): Promise<RatingData> {
  const res  = await fetch(`/api/ratings?courseId=${courseId}`);
  const data = await res.json();
  return data.success ? data.data : { avgRating: 0, totalRatings: 0, ratings: [] };
}

function StarRow({ value, interactive, onRate }: {
  value:       number;
  interactive: boolean;
  onRate?:     (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const display = interactive ? (hover || value) : value;

  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => interactive && onRate?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`transition-colors ${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} ${
            i <= display ? "text-[var(--accent-light)]" : "text-[var(--bg-secondary)]"
          }`}
          aria-label={interactive ? `Rate ${i} star${i !== 1 ? "s" : ""}` : undefined}
        >
          <FiStar size={18} className={i <= display ? "fill-current" : ""} />
        </button>
      ))}
    </div>
  );
}

export function CourseRatingWidget({
  courseId,
  isEnrolled,
}: {
  courseId:   string;
  isEnrolled: boolean;
}) {
  const { data: session }  = useSession();
  const queryClient        = useQueryClient();
  const [userRating, setUserRating] = useState(0);
  const [review,     setReview]     = useState("");
  const [submitted,  setSubmitted]  = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ratings", courseId],
    queryFn:  () => fetchRatings(courseId),
    staleTime: 60_000,
  });

  const submitRating = useMutation({
    mutationFn: async () => {
      const res  = await fetch("/api/ratings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId, rating: userRating, review: review.trim() || undefined }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error ?? "Failed to submit rating");
    },
    onSuccess: () => {
      setSubmitted(true);
      void queryClient.invalidateQueries({ queryKey: ["ratings", courseId] });
    },
  });

  if (isLoading) {
    return <div className="h-24 shimmer rounded-xl" />;
  }

  const avg = data?.avgRating ?? 0;
  const total = data?.totalRatings ?? 0;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-5">
        Student Ratings
      </h2>

      {/* Aggregate */}
      <div className="glass-card rounded-2xl p-5 mb-5 flex items-center gap-5">
        <div className="text-center">
          <div className="font-display text-5xl font-bold text-[var(--accent)] leading-none">
            {avg > 0 ? avg.toFixed(1) : "—"}
          </div>
          <StarRow value={Math.round(avg)} interactive={false} />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {total} review{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Rating bars */}
        {total > 0 && (
          <div className="flex-1 space-y-1.5">
            {[5,4,3,2,1].map((star) => {
              const count = data?.ratings.filter((r) => r.rating === star).length ?? 0;
              const pct   = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="w-3">{star}</span>
                  <FiStar size={11} className="text-[var(--accent-light)] flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit rating (enrolled only) */}
      {session && isEnrolled && !submitted && (
        <div className="glass-card rounded-xl p-5 mb-5">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Rate this course</p>
          <StarRow
            value={userRating}
            interactive
            onRate={(v) => setUserRating(v)}
          />
          {userRating > 0 && (
            <div className="mt-3 space-y-2">
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience (optional)…"
                rows={3}
                className="w-full px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              />
              <button
                onClick={() => submitRating.mutate()}
                disabled={submitRating.isPending}
                className="btn-primary text-sm"
              >
                {submitRating.isPending ? <><FiLoader className="animate-spin" size={14} /> Submitting…</> : "Submit Rating"}
              </button>
              {submitRating.isError && (
                <p className="text-xs text-red-400">{(submitRating.error as Error).message}</p>
              )}
            </div>
          )}
        </div>
      )}
      {submitted && (
        <p className="text-sm text-emerald-400 mb-4 flex items-center gap-2">
          <FiStar className="fill-current" size={14} /> Thank you for your rating!
        </p>
      )}
      {!session && (
        <p className="text-sm text-[var(--text-muted)] mb-4">
          <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-light)]">Sign in</Link> and enroll to rate this course.
        </p>
      )}

      {/* Reviews list */}
      {data && data.ratings.length > 0 && (
        <div className="space-y-3">
          {data.ratings.slice(0, 5).map((r) => (
            <div key={r.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--accent-dim)] flex-shrink-0 flex items-center justify-center text-[var(--accent)] text-sm font-bold border border-[var(--border)]">
                  {r.user.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{r.user.name}</span>
                    <StarRow value={r.rating} interactive={false} />
                  </div>
                  {r.review && <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{r.review}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
