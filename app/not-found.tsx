import Link from "next/link";
import { GiMoon, GiStarFormation } from "react-icons/gi";
import { FiArrowLeft } from "react-icons/fi";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-bg opacity-50" />
      <div className="absolute inset-0 pattern-overlay opacity-30" />

      <div className="relative text-center animate-fadeInUp">
        {/* Icon */}
        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-[var(--accent-dim)] border border-[var(--border-strong)] mb-8 mx-auto">
          <GiMoon className="text-[var(--accent)] text-5xl opacity-70" />
          <GiStarFormation className="absolute -top-2 -right-2 text-[var(--accent-light)] text-base animate-spin-slow" />
          <GiStarFormation className="absolute -bottom-2 -left-2 text-[var(--accent-light)] text-sm animate-spin-slow" style={{ animationDirection: "reverse" }} />
        </div>

        <h1 className="font-display text-8xl font-bold gradient-text mb-2">404</h1>
        <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)] mb-3">
          Page Not Found
        </h2>
        <p className="text-[var(--text-muted)] text-base mb-10 max-w-sm mx-auto leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            <FiArrowLeft size={15} /> Return Home
          </Link>
          <Link href="/courses" className="btn-secondary">
            Browse Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
