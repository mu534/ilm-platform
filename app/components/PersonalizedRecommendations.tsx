"use client";

import { useSession, signIn } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FiArrowRight, FiStar } from "react-icons/fi";
import { GiStarFormation } from "react-icons/gi";

interface Recommendation {
  id:          string;
  title:       string;
  slug:        string;
  description: string;
  type:        string;
  scholarName?: string;
}

async function fetchRecommendations(): Promise<Recommendation[]> {
  const res = await fetch("/api/recommendations", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load recommendations");
  return res.json() as Promise<Recommendation[]>;
}

// ── Shared card wrapper ──────────────────────────────────────────────────────
function RecommendationShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full max-w-3xl mx-auto mb-8">
      <div className="relative rounded-3xl overflow-hidden border border-[var(--border-strong)]">
        {/* Background matching hero/newsletter */}
        <div className="absolute inset-0 hero-bg opacity-70" />
        <div className="absolute inset-0 pattern-overlay opacity-20" />
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 110%, var(--accent-dim), transparent)",
          }}
        />
        {/* Top gold strip */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-60" />

        <div className="relative p-6">{children}</div>
      </div>
    </section>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <RecommendationShell>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-32 h-3 bg-[var(--accent-dim)] rounded-full shimmer" />
      </div>
      <div className="w-48 h-5 bg-[var(--accent-dim)] rounded-full shimmer mb-6" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-[var(--accent-dim)] shimmer" />
        ))}
      </div>
    </RecommendationShell>
  );
}

// ── Unauthenticated CTA ──────────────────────────────────────────────────────
function SignInPrompt() {
  return (
    <RecommendationShell>
      <div className="text-center py-4">
        {/* Icon */}
        <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] mb-4 animate-pulse-accent">
          <FiStar className="text-[var(--accent)] text-xl" />
          <GiStarFormation className="absolute -top-1 -right-1 text-gold-400 text-xs animate-spin-slow" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--accent-dim)] mb-3">
          <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
            Personalized for you
          </span>
        </div>

        <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">
          Get Tailored Recommendations
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs mx-auto leading-relaxed">
          Sign in to get lecture recommendations tailored to your learning journey.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => signIn()}
            className="
              inline-flex items-center gap-2 px-5 py-2.5
              bg-gradient-to-r from-gold-500 to-gold-600
              hover:from-gold-400 hover:to-gold-500
              text-white rounded-xl text-sm font-semibold
              shadow-md shadow-gold-600/30 hover:shadow-gold-500/40
              transition-all duration-300 hover:scale-105 active:scale-95
            "
          >
            Sign in
          </button>
          <Link
            href="/register"
            className="
              inline-flex items-center gap-2 px-5 py-2.5
              border border-[var(--border-strong)]
              hover:bg-[var(--accent-dim)]
              text-[var(--text-primary)] rounded-xl text-sm font-medium
              transition-all duration-300 hover:scale-105 active:scale-95
            "
          >
            Create account
          </Link>
        </div>
      </div>
    </RecommendationShell>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function PersonalizedRecommendations() {
  const { data: session, status } = useSession();

  const { data, isLoading, error } = useQuery<Recommendation[]>({
    queryKey: ["recommendations"],
    queryFn:  fetchRecommendations,
    enabled:  status === "authenticated",
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  if (status === "loading") return <LoadingSkeleton />;
  if (!session)             return <SignInPrompt />;

  return (
    <RecommendationShell>
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--accent-dim)] mb-2">
            <GiStarFormation className="text-gold-400 text-xs" />
            <span className="text-xs tracking-widest text-[var(--accent)] uppercase font-semibold">
              Personalized for you
            </span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, {session.user.name ?? "student"} 👋
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Recommended based on latest engagement on the platform.
          </p>
        </div>

        <Link
          href="/profile"
          className="
            flex-shrink-0 inline-flex items-center gap-2
            px-4 py-2.5 rounded-xl text-sm font-medium
            border border-[var(--border-strong)]
            text-[var(--text-primary)]
            hover:bg-[var(--accent-dim)] hover:border-[var(--accent)]
            transition-all duration-200 hover:scale-105
          "
        >
          Your profile <FiArrowRight size={14} />
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-[var(--accent-dim)] shimmer" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-4 text-sm text-red-400">
          Unable to load recommendations right now.
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((lecture) => (
            <Link
              key={lecture.id}
              href={`/lectures/${lecture.slug}`}
              className="
                group relative rounded-2xl p-4
                border border-[var(--border)]
                bg-[var(--bg-card)]/60 backdrop-blur-sm
                hover:border-[var(--border-strong)]
                hover:bg-[var(--bg-card-hover)]
                hover:shadow-[var(--shadow-md)]
                transition-all duration-300
              "
            >
              {/* Top strip on hover */}
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-gold-400 to-gold-600 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start justify-between mb-2 gap-2">
                <h4 className="text-[var(--text-primary)] font-semibold text-sm leading-snug line-clamp-2">
                  {lecture.title}
                </h4>
                <span className="flex-shrink-0 text-[var(--accent)] text-xs uppercase tracking-widest font-medium px-2 py-0.5 rounded-full bg-[var(--accent-dim)] border border-[var(--border)]">
                  {lecture.type}
                </span>
              </div>

              <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-2 leading-relaxed">
                {lecture.description}
              </p>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">
                  {lecture.scholarName ? `By ${lecture.scholarName}` : "Scholarly lecture"}
                </span>
                <FiStar className="text-gold-400 group-hover:scale-125 transition-transform duration-200" size={13} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--text-muted)]">
            No recommendations yet — explore more lectures to get tailored content.
          </p>
          <Link
            href="/lectures"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors font-medium"
          >
            Browse lectures <FiArrowRight size={13} />
          </Link>
        </div>
      )}
    </RecommendationShell>
  );
}