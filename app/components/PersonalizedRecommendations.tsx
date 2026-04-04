"use client";

import { useSession, signIn } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FiArrowRight, FiStar } from "react-icons/fi";

interface Recommendation {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  scholarName?: string;
}

async function fetchRecommendations() {
  const res = await fetch("/api/recommendations", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load recommendations");
  }
  return res.json() as Promise<Recommendation[]>;
}

export function PersonalizedRecommendations() {
  const { data: session, status } = useSession();
  const { data, isLoading, error } = useQuery<Recommendation[]>({
    queryKey: ["recommendations"],
    queryFn: fetchRecommendations,
    enabled: status === "authenticated",
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  if (status === "loading") {
    return (
      <div className="w-full max-w-3xl mx-auto mb-8 p-6 rounded-3xl border border-white/10 bg-ink-900/80 text-center">
        <div className="text-sm text-ink-400">Loading your recommended lectures…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-full max-w-3xl mx-auto mb-8 p-6 rounded-3xl border border-white/10 bg-ink-900/80 text-center">
        <p className="text-sm text-ink-300 mb-3">
          Sign in to get lecture recommendations tailored to your learning journey.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => signIn()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gold-600 hover:bg-gold-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Sign in
          </button>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-3 border border-white/10 hover:border-gold-500/30 hover:bg-white/5 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto mb-8 p-6 rounded-3xl border border-white/10 bg-ink-900/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-400 font-semibold">
            Personalized for you
          </p>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
            Welcome back, {session.user.name ?? "student"}
          </h3>
          <p className="text-ink-400 text-sm max-w-2xl mt-2">
            Recommended lectures based on the latest engagement on the platform.
          </p>
        </div>

        <Link
          href="/profile"
          className="inline-flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Your profile <FiArrowRight size={16} />
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="text-sm text-ink-400">Loading recommendations…</div>
        ) : error ? (
          <div className="text-sm text-red-400">Unable to load recommendations.</div>
        ) : data && data.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.map((lecture) => (
              <Link
                key={lecture.id}
                href={`/lectures/${lecture.slug}`}
                className="glass-card gold-border rounded-3xl p-4 hover:bg-white/[0.03] transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold text-sm">{lecture.title}</h4>
                  <span className="text-ink-500 text-xs uppercase tracking-widest">
                    {lecture.type}
                  </span>
                </div>
                <p className="text-ink-400 text-sm mb-3 line-clamp-2">{lecture.description}</p>
                <div className="flex items-center justify-between text-ink-500 text-xs">
                  <span>{lecture.scholarName ? `By ${lecture.scholarName}` : "Scholarly lecture"}</span>
                  <FiStar className="text-gold-400" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-ink-400">No recommendations available yet. Explore more lectures to get tailored content.</div>
        )}
      </div>
    </div>
  );
}
