"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiLoader, FiCheckCircle, FiArrowRight, FiLock } from "react-icons/fi";

interface EnrollButtonProps {
  courseId:   string;
  courseSlug: string;
  isLoggedIn: boolean;
  isPaid?:    boolean;
  price?:     number;   // smallest currency unit (cents)
  currency?:  string;
}

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() })
      .format(price / 100);
  } catch {
    return `${(price / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function EnrollButton({ courseId, courseSlug, isLoggedIn, isPaid, price = 0, currency = "usd" }: EnrollButtonProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const priceLabel = isPaid ? formatPrice(price, currency) : null;

  if (!isLoggedIn) {
    return (
      <div className="space-y-3">
        <Link
          href={`/login?callbackUrl=/courses/${courseSlug}`}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors"
        >
          {isPaid ? `Sign in to Purchase — ${priceLabel}` : "Sign in to Enroll"}
          <FiArrowRight size={14} />
        </Link>
        <p className="text-xs text-center text-[var(--text-muted)]">
          {isPaid ? "Secure checkout via Stripe" : "Free · No credit card required"}
        </p>
      </div>
    );
  }

  const handleFreeEnroll = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        if (res.status === 409) { router.refresh(); return; }
        setError(data.error ?? "Enrollment failed. Please try again.");
        return;
      }

      setSuccess(true);

      // Navigate to first lecture
      try {
        const nextRes  = await fetch(`/api/courses/${courseId}/next-lecture`);
        const nextData = await nextRes.json();
        if (nextData.success && nextData.data?.slug) {
          setTimeout(() => router.push(`/courses/${courseSlug}/learn/${nextData.data.slug}`), 700);
          return;
        }
      } catch { /* fall through */ }

      setTimeout(() => router.refresh(), 600);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/checkout`, { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        if (res.status === 409) { router.refresh(); return; }
        setError(data.error ?? "Couldn't start checkout. Please try again.");
        setLoading(false);
        return;
      }

      // Stripe's hosted page is a different origin — full navigation, not router.push
      window.location.href = data.data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <FiCheckCircle size={15} />
          Enrolled! Loading your first lesson…
        </div>
        <div className="h-0.5 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <button
        onClick={() => void (isPaid ? handleCheckout() : handleFreeEnroll())}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <FiLoader className="animate-spin" size={14} />
            {isPaid ? "Redirecting to checkout…" : "Enrolling…"}
          </>
        ) : isPaid ? (
          <>
            <FiLock size={13} />
            Enroll Now — {priceLabel}
          </>
        ) : (
          <>
            Enroll Now — It&apos;s Free
            <FiArrowRight size={14} />
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <p className="text-xs text-center text-[var(--text-muted)]">
        {isPaid ? "Secure checkout via Stripe · One-time payment" : "Learn at your own pace · No deadlines"}
      </p>
    </div>
  );
}
