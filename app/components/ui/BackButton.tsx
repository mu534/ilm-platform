"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

interface BackButtonProps {
  label?: string;
  fallbackHref?: string;
  className?: string;
}

/**
 * Universal BackButton component.
 * Uses browser history (router.back()) to return to the exact previous page,
 * or gracefully falls back to `fallbackHref` if direct navigation occurred.
 */
export function BackButton({
  label = "Back",
  fallbackHref = "/courses",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <Link
      href={fallbackHref}
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors ${className}`}
    >
      <FiArrowLeft size={14} />
      <span>{label}</span>
    </Link>
  );
}
