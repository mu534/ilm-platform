"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { FiCheckCircle, FiLoader, FiBookOpen, FiRefreshCw } from "react-icons/fi";

interface Props {
  courseId:    string;
  courseSlug:  string;
  courseTitle: string;
}

type PollState = "waiting" | "confirmed" | "timed-out";

const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 1500;

export function CheckoutSuccessPoller({ courseId, courseSlug, courseTitle }: Props) {
  const [state, setState] = useState<PollState>("waiting");
  const attempts = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res  = await fetch(`/api/courses/${courseId}/enroll`);
        const data = await res.json();
        if (cancelled) return;

        if (data.success && data.data?.enrolled) {
          setState("confirmed");
          return;
        }

        attempts.current += 1;
        if (attempts.current >= MAX_ATTEMPTS) {
          setState("timed-out");
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        attempts.current += 1;
        if (!cancelled && attempts.current < MAX_ATTEMPTS) setTimeout(poll, POLL_INTERVAL_MS);
        else if (!cancelled) setState("timed-out");
      }
    };

    void poll();
    return () => { cancelled = true; };
  }, [courseId]);

  const retry = () => {
    attempts.current = 0;
    setState("waiting");
  };

  if (state === "confirmed") {
    return (
      <div className="text-center max-w-md animate-fadeInUp">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <FiCheckCircle className="text-emerald-400 text-2xl" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
          Payment Successful
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          You&apos;re enrolled in <span className="text-[var(--text-secondary)] font-medium">{courseTitle}</span>.
          Welcome aboard!
        </p>
        <Link href={`/courses/${courseSlug}`} className="btn-primary inline-flex">
          <FiBookOpen size={14} /> Start Learning
        </Link>
      </div>
    );
  }

  if (state === "timed-out") {
    return (
      <div className="text-center max-w-md animate-fadeInUp">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-6">
          <FiLoader className="text-[var(--accent)] text-2xl" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
          Payment Received
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          We&apos;re still finishing setting up your enrollment in{" "}
          <span className="text-[var(--text-secondary)] font-medium">{courseTitle}</span>.
          This is usually instant — if it's been a minute, try refreshing.
        </p>
        <button onClick={retry} className="btn-secondary inline-flex">
          <FiRefreshCw size={13} /> Check Again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center max-w-md animate-fadeInUp">
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-6">
        <FiLoader className="text-[var(--accent)] text-2xl animate-spin" />
      </div>
      <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
        Confirming Your Payment
      </h1>
      <p className="text-sm text-[var(--text-muted)]">
        Just a moment while we set up your access to{" "}
        <span className="text-[var(--text-secondary)] font-medium">{courseTitle}</span>.
      </p>
    </div>
  );
}
