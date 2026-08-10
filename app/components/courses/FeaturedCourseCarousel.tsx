"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiUsers,
  FiBookOpen,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";

export interface FeaturedCourse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  subtitle: string | null;
  thumbnailUrl: string | null;
  difficulty: string;
  estimatedDuration: number;
  enrollmentType: string | null;
  price: number | null;
  currency: string | null;
  featured: boolean;
  avgRating: number | null;
  enrollCount: number;
  moduleCount: number;
  categoryName: string | null;
  categoryIcon: string | null;
  authorName: string | null;
  authorDesignation: string | null;
}

interface FeaturedCourseCarouselProps {
  courses: FeaturedCourse[];
}

const difficultyConfig: Record<string, { label: string; className: string }> = {
  BEGINNER:     { label: "Beginner",     className: "text-emerald-400" },
  INTERMEDIATE: { label: "Intermediate", className: "text-[var(--accent)]" },
  ADVANCED:     { label: "Advanced",     className: "text-red-400" },
};

function formatDuration(min: number): string {
  if (!min || min <= 0) return "";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toString();
}

function CourseCard({ course }: { course: FeaturedCourse }) {
  const diff = difficultyConfig[course.difficulty];

  // Price / Free / Featured badge
  const topBadge = course.featured
    ? { label: "Featured", className: "bg-[var(--accent)] text-white" }
    : course.enrollmentType === "PAID" && (course.price ?? 0) > 0
    ? {
        label: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: (course.currency ?? "usd").toUpperCase(),
        }).format((course.price ?? 0) / 100),
        className: "bg-[var(--accent)] text-white",
      }
    : { label: "Free", className: "bg-emerald-500/90 text-white" };

  const durationStr = formatDuration(course.estimatedDuration);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex-shrink-0 w-[300px] sm:w-[320px] lg:w-[340px] snap-start rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      aria-label={`View course: ${course.title}`}
    >
      {/* ── Thumbnail ── */}
      <div className="relative aspect-[16/9] bg-[var(--bg-secondary)] overflow-hidden flex-shrink-0">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 300px, (max-width: 1024px) 320px, 340px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)]">
            <FiBookOpen className="text-[var(--text-muted)] opacity-25" size={32} />
          </div>
        )}

        {/* Difficulty — bottom left */}
        {diff && (
          <span
            className={`absolute bottom-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-primary)]/85 backdrop-blur-sm border border-[var(--border-subtle)] flex items-center gap-1 ${diff.className}`}
          >
            {diff.label}
          </span>
        )}

        {/* Price / Free / Featured — top right */}
        <span
          className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-wide shadow-[var(--shadow-sm)] ${topBadge.className}`}
        >
          {topBadge.label}
        </span>

        {/* Category — top left */}
        {course.categoryName && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-primary)]/80 backdrop-blur-sm border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            {course.categoryIcon && <span className="mr-1">{course.categoryIcon}</span>}
            {course.categoryName}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="p-4 flex flex-col gap-2.5">

        {/* Title */}
        <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors duration-200 min-h-[2.5rem]">
          {course.title}
        </h3>

        {/* Instructor */}
        {course.authorName && (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12px] text-[var(--text-secondary)] font-medium truncate">
              {course.authorName}
            </span>
            {course.authorDesignation && (
              <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                · {course.authorDesignation}
              </span>
            )}
          </div>
        )}

        {/* Primary stats: rating + students */}
        <div className="flex items-center gap-3 text-[11px]">
          {course.avgRating != null && course.avgRating > 0 && (
            <span className="flex items-center gap-1 text-[var(--accent)] font-semibold">
              <FiStar size={11} className="fill-current" />
              {course.avgRating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1 text-[var(--text-muted)]">
            <FiUsers size={11} />
            {formatCount(course.enrollCount)}
            <span className="sr-only">students enrolled</span>
          </span>
        </div>

        {/* Secondary stats: lessons · duration */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] pt-2 mt-auto border-t border-[var(--border)]">
          {course.moduleCount > 0 && (
            <>
              <span className="flex items-center gap-1">
                <FiBookOpen size={10} />
                {course.moduleCount} {course.moduleCount === 1 ? "module" : "modules"}
              </span>
              {durationStr && <span className="text-[var(--border-strong)]">·</span>}
            </>
          )}
          {durationStr && (
            <span className="flex items-center gap-1">
              <FiClock size={10} />
              {durationStr}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-[var(--accent)] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            View <FiArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedCourseCarousel({ courses }: FeaturedCourseCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  if (courses.length === 0) return null;

  const scrollBy = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  const navBtnBase =
    "hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-md)] items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <div className="relative" role="region" aria-label="Featured courses">
      {/* Edge fade mask */}
      <div className="[mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]">
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-3"
          style={{
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
          role="list"
        >
          {courses.map((course) => (
            <div key={course.id} role="listitem">
              <CourseCard course={course} />
            </div>
          ))}
          {/* Trailing spacer so last card doesn't get clipped by mask */}
          <div className="flex-shrink-0 w-4 sm:w-6 lg:w-8" aria-hidden="true" />
        </div>
      </div>

      {/* Prev button */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className={`${navBtnBase} -left-2`}
          aria-label="Scroll to previous courses"
        >
          <FiChevronLeft size={18} />
        </button>
      )}

      {/* Next button */}
      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className={`${navBtnBase} -right-2`}
          aria-label="Scroll to next courses"
        >
          <FiChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
