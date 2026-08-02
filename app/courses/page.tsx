import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/app/lib/prism";
import { CourseCard } from "@/app/components/courses/CourseCard";
import type { DifficultyLevel } from "@/app/types/auth.types";
import { FiSearch, FiFilter, FiBookOpen } from "react-icons/fi";

type SortOption = "newest" | "oldest" | "popular" | "top-rated";

type SearchParams = {
  search?:     string;
  categoryId?: string;
  difficulty?: string;
  sort?:       string;
  featured?:   string;
  page?:       string;
};

interface Props {
  searchParams: Promise<SearchParams>;
}

const PAGE_SIZE = 12;

function getOrderBy(sort: string) {
  switch (sort) {
    case "popular":   return { enrollments: { _count: "desc" as const } };
    case "top-rated": return { ratings:     { _count: "desc" as const } };
    case "oldest":    return { createdAt:   "asc" as const };
    default:          return { createdAt:   "desc" as const };
  }
}

async function getCoursesData(params: SearchParams) {
  const page       = Math.max(1, Number(params.page ?? 1));
  const search     = params.search ?? "";
  const categoryId = params.categoryId ?? "";
  const featured   = params.featured === "true";
  const difficulty = params.difficulty ?? "";
  const sort       = params.sort ?? "newest";

  const validDifficulty =
    difficulty === "BEGINNER" || difficulty === "INTERMEDIATE" || difficulty === "ADVANCED"
      ? (difficulty as DifficultyLevel)
      : undefined;

  const where = {
    published:      true,
    status:         "PUBLISHED" as const,
    approvalStatus: "APPROVED" as const,
    ...(featured         ? { featured: true }              : {}),
    ...(validDifficulty  ? { difficulty: validDifficulty } : {}),
    ...(categoryId       ? { categoryId }                  : {}),
    ...(search ? {
      OR: [
        { title:       { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { tags:        { hasSome: [search] } },
      ],
    } : {}),
  };

  const [total, courses, categories] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      orderBy: getOrderBy(sort),
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        author:   { select: { id: true, name: true, image: true } },
        scholar:  {
          select: { id: true, photo: true, verified: true, user: { select: { name: true } } },
        },
        _count: { select: { modules: true, enrollments: true, ratings: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, slug: true, icon: true, color: true } }),
  ]);

  // Batch-fetch ratings — single query
  const courseIds = courses.map((c) => c.id);
  const ratings   = await prisma.courseRating.groupBy({
    by:    ["courseId"],
    where: { courseId: { in: courseIds } },
    _avg:  { rating: true },
  });
  const ratingMap = new Map(ratings.map((r) => [r.courseId, r._avg.rating ?? 0]));

  return {
    courses: courses.map((c) => ({ ...c, avgRating: ratingMap.get(c.id) ?? 0 })),
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
    categories,
  };
}

const sortLabels: Record<SortOption, string> = {
  newest:    "Most Recent",
  oldest:    "Oldest First",
  popular:   "Most Popular",
  "top-rated": "Top Rated",
};

export async function generateMetadata({ searchParams }: Props) {
  const sp     = await searchParams;
  const search = sp.search ?? "";
  return {
    title:       search ? `Courses: "${search}"` : "Courses",
    description: "Browse Islamic courses from qualified scholars",
  };
}

export default async function CoursesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { courses, total, page, totalPages, categories } = await getCoursesData(sp);

  const buildUrl = (overrides: Record<string, string>) => {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) { if (v !== undefined) merged[k] = v; }
    return `/courses?${new URLSearchParams({ ...merged, ...overrides }).toString()}`;
  };

  const activeSort = (sp.sort ?? "newest") as SortOption;
  const hasFilters = !!(sp.search || sp.categoryId || sp.difficulty || sp.featured);

  const pagerClass =
    "px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-2">Learning Paths</p>
        <h1 className="font-display text-4xl font-bold text-[var(--text-primary)]">Courses</h1>
        <p className="text-[var(--text-muted)] mt-2">
          {total.toLocaleString()} course{total !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">

        {/* Search + Sort */}
        <div className="flex flex-wrap gap-3 items-start">
          <form className="flex gap-2 flex-1 min-w-64">
            <div className="relative flex-1 max-w-sm">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
              <input
                name="search"
                defaultValue={sp.search}
                placeholder="Search courses…"
                className="input-themed pl-10"
              />
            </div>
            <button type="submit" className="btn-primary px-5">Search</button>
          </form>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <FiFilter size={13} className="text-[var(--text-muted)]" />
            {(Object.keys(sortLabels) as SortOption[]).map((s) => (
              <Link
                key={s}
                href={buildUrl({ sort: s, page: "1" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeSort === s
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]"
                }`}
              >
                {sortLabels[s]}
              </Link>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildUrl({ categoryId: "", page: "1" })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !sp.categoryId ? "bg-[var(--accent)] text-white" : "tag hover:tag-accent"
            }`}
          >
            All Categories
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={buildUrl({ categoryId: sp.categoryId === cat.id ? "" : cat.id, page: "1" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                sp.categoryId === cat.id ? "tag-accent" : "tag hover:tag-accent"
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Difficulty */}
        <div className="flex flex-wrap gap-2">
          {(["", "BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((d) => {
            const label = { "": "All Levels", BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" }[d];
            return (
              <Link
                key={d}
                href={buildUrl({ difficulty: d, page: "1" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  (sp.difficulty ?? "") === d
                    ? "tag-accent"
                    : "tag hover:tag-accent"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Active filters summary */}
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--text-muted)]">Active:</span>
            {sp.search     && <span className="tag-accent text-xs">"{sp.search}"</span>}
            {sp.difficulty && <span className="tag-accent text-xs">{sp.difficulty.toLowerCase()}</span>}
            {sp.categoryId && <span className="tag-accent text-xs">Category</span>}
            {sp.featured   && <span className="tag-accent text-xs">Featured</span>}
            <Link href="/courses" className="text-xs text-red-400 hover:text-red-300 transition-colors">
              Clear all ✕
            </Link>
          </div>
        )}
      </div>

      {/* Results */}
      {courses.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} className={pagerClass}>Previous</Link>}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={buildUrl({ page: String(p) })}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    p === page ? "bg-[var(--accent)] text-white" : pagerClass
                  }`}
                >
                  {p}
                </Link>
              ))}
              {page < totalPages && <Link href={buildUrl({ page: String(page + 1) })} className={pagerClass}>Next</Link>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-16 text-center animate-fadeInUp">
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-6">
        <FiBookOpen className="text-[var(--accent)] text-2xl" />
      </div>
      <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
        {hasFilters ? "No courses match your filters" : "No courses yet"}
      </h2>
      <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">
        {hasFilters
          ? "Try adjusting your search or removing some filters."
          : "Courses will appear here once scholars publish them."}
      </p>
      {hasFilters && (
        <Link href="/courses" className="btn-primary inline-flex text-sm">
          Clear all filters
        </Link>
      )}
    </div>
  );
}
