"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiChevronLeft, FiChevronRight, FiStar, FiUsers, FiAward } from "react-icons/fi";

interface FeaturedCourse {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  difficulty: string;
  avgRating: number | null;
  enrollCount: number;
  categoryName: string | null;
  categoryIcon: string | null;
  authorName: string | null;
}

interface FeaturedCourseCarouselProps {
  courses: FeaturedCourse[];
}

const difficultyColor: Record<string, string> = {
  BEGINNER: "text-emerald-400",
  INTERMEDIATE: "text-amber-400",
  ADVANCED: "text-red-400",
};

function CourseCard({ course }: { course: FeaturedCourse }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex-shrink-0 w-[280px] sm:w-[300px] snap-start rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-lg)] transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-[var(--bg-secondary)] overflow-hidden">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="300px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-15">📖</span>
          </div>
        )}
        {/* Difficulty badge */}
        <span
          className={`absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-primary)]/85 backdrop-blur-sm border border-[var(--border-subtle)] flex items-center gap-1 ${difficultyColor[course.difficulty] ?? "text-[var(--accent)]"}`}
        >
          <FiAward size={9} />
          {course.difficulty.charAt(0) + course.difficulty.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-[11px] text-[var(--text-muted)] mb-1.5 truncate">
          {course.categoryIcon && <span className="mr-1">{course.categoryIcon}</span>}
          {course.categoryName ?? "Islamic Studies"}
        </p>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 mb-2 group-hover:text-[var(--accent)] transition-colors min-h-[2.5rem]">
          {course.title}
        </h3>
        {course.authorName && (
          <p className="text-xs text-[var(--text-secondary)] mb-3 truncate">
            {course.authorName}
          </p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
          {course.avgRating != null && course.avgRating > 0 && (
            <span className="flex items-center gap-1 text-[var(--accent)] font-medium">
              <FiStar size={11} className="fill-current" /> {course.avgRating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <FiUsers size={11} /> {course.enrollCount.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedCourseCarousel({ courses }: FeaturedCourseCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
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
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="relative" role="region" aria-label="Featured courses">
      {/* Edge fade mask */}
      <div className="[mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]">
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scroll-snap-x-mandatory px-4 sm:px-6 lg:px-8 pb-2"
          style={{
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
          {/* Spacer for right peek on mobile */}
          <div className="flex-shrink-0 w-4 sm:w-6 lg:w-8" aria-hidden="true" />
        </div>
      </div>

      {/* Prev button */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-md)] items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-200"
          aria-label="Previous courses"
        >
          <FiChevronLeft size={18} />
        </button>
      )}

      {/* Next button */}
      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-md)] items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--accent-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-200"
          aria-label="Next courses"
        >
          <FiChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
