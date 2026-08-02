import Link from "next/link";
import { prisma } from "@/app/lib/prism";
import { CourseCard } from "@/app/components/courses/CourseCard";
import type { DifficultyLevel } from "@/app/types/auth.types";
import { FiSearch } from "react-icons/fi";

type SortOption = "newest" | "oldest" | "popular" | "top-rated";

type SearchParams = {
  search?:     string;
  categoryId?: string;
  difficulty?: string;
  sort?:       string;
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
    case "oldest":    return { createdAt:   "asc"  as const };
    default:          return { createdAt:   "desc" as const };
  }
}

async function getCoursesData(params: SearchParams) {
  const page       = Math.max(1, Number(params.page ?? 1));
  const search     = params.search ?? "";
  const categoryId = params.categoryId ?? "";
  const difficulty = params.difficulty ?? "";
  const sort       = params.sort ?? "newest";

  const validDifficulty =
    difficulty === "BEGINNER" || difficulty === "INTERMEDIATE" || difficulty === "ADVANCED"
      ? (difficulty as DifficultyLevel)
      : undefined;

  const where = {
    published:      true,
    status:         "PUBLISHED"  as const,
    approvalStatus: "APPROVED"   as const,
    ...(validDifficulty ? { difficulty: validDifficulty } : {}),
    ...(categoryId      ? { categoryId }                  : {}),
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
        scholar:  { select: { id: true, photo: true, verified: true, user: { select: { name: true } } } },
        _count:   { select: { modules: true, enrollments: true, ratings: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { order: "asc" },
      select:  { id: true, name: true, slug: true, icon: true },
    }),
  ]);

  const courseIds = courses.map((c) => c.id);
  const ratings   = await prisma.courseRating.groupBy({
    by:    ["courseId"],
    where: { courseId: { in: courseIds } },
    _avg:  { rating: true },
  });
  const ratingMap = new Map(ratings.map((r) => [r.courseId, r._avg.rating ?? 0]));

  return {
    courses:    courses.map((c) => ({ ...c, avgRating: ratingMap.get(c.id) ?? 0 })),
    total, page,
    totalPages: Math.ceil(total / PAGE_SIZE),
    categories,
  };
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest",    label: "Newest"       },
  { value: "popular",   label: "Most Popular"  },
  { value: "top-rated", label: "Top Rated"     },
  { value: "oldest",    label: "Oldest"        },
];

const DIFFICULTY_OPTIONS = [
  { value: "",             label: "All Levels"   },
  { value: "BEGINNER",     label: "Beginner"     },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED",     label: "Advanced"     },
] as const;

export async function generateMetadata({ searchParams }: Props) {
  const sp = await searchParams;
  return {
    title:       sp.search ? `"${sp.search}" — Courses` : "Courses",
    description: "Browse Islamic courses from qualified scholars",
  };
}

export default async function CoursesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { courses, total, page, totalPages, categories } = await getCoursesData(sp);

  const activeSort = (sp.sort ?? "newest") as SortOption;
  const hasFilters = !!(sp.search || sp.categoryId || sp.difficulty);

  const buildUrl = (overrides: Record<string, string>) => {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) { if (v !== undefined) merged[k] = v; }
    return `/courses?${new URLSearchParams({ ...merged, ...overrides }).toString()}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* ── Page header ── */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Islamic Courses
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-xl">
            Learn from verified scholars. Study Quran, Fiqh, Hadith, Aqeedah, and more
            at your own pace.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── Sidebar filters ── */}
          <aside className="lg:w-52 flex-shrink-0">

            {/* Search */}
            <form className="mb-8">
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Search
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={13} />
                <input
                  name="search"
                  defaultValue={sp.search}
                  placeholder="Search courses…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </form>

            {/* Category */}
            <div className="mb-8">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Category
              </p>
              <div className="space-y-0.5">
                <Link
                  href={buildUrl({ categoryId: "", page: "1" })}
                  className={`block px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    !sp.categoryId
                      ? "bg-[var(--accent-dim)] text-[var(--accent)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  All Categories
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={buildUrl({ categoryId: sp.categoryId === cat.id ? "" : cat.id, page: "1" })}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      sp.categoryId === cat.id
                        ? "bg-[var(--accent-dim)] text-[var(--accent)] font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {cat.icon && <span className="text-xs flex-shrink-0">{cat.icon}</span>}
                    <span className="truncate">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Level */}
            <div className="mb-8">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Level
              </p>
              <div className="space-y-0.5">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <Link
                    key={opt.value}
                    href={buildUrl({ difficulty: opt.value, page: "1" })}
                    className={`block px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      (sp.difficulty ?? "") === opt.value
                        ? "bg-[var(--accent-dim)] text-[var(--accent)] font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>

            {hasFilters && (
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
              >
                ✕ Clear filters
              </Link>
            )}
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">

            {/* Sort + count bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)]">
                <span className="text-[var(--text-primary)] font-medium">{total.toLocaleString()}</span>
                {" "}course{total !== 1 ? "s" : ""}
                {hasFilters && " found"}
              </p>

              {/* Sort links — clean tab style */}
              <div className="hidden sm:flex items-center gap-0.5 bg-[var(--bg-secondary)] rounded-lg p-0.5 border border-[var(--border)]">
                {SORT_OPTIONS.map((s) => (
                  <Link
                    key={s.value}
                    href={buildUrl({ sort: s.value, page: "1" })}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                      activeSort === s.value
                        ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>

              {/* Mobile sort — single select */}
              <div className="sm:hidden">
                <select
                  defaultValue={activeSort}
                  onChange={(e) => {
                    window.location.href = buildUrl({ sort: e.target.value, page: "1" });
                  }}
                  className="text-xs py-1.5 px-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  aria-label="Sort courses"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid */}
            {courses.length === 0 ? (
              <EmptyState hasFilters={hasFilters} />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
                  {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav
                    className="flex justify-center items-center gap-1"
                    aria-label="Pagination"
                  >
                    {page > 1 && (
                      <Link
                        href={buildUrl({ page: String(page - 1) })}
                        className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
                      >
                        ← Prev
                      </Link>
                    )}
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                      <Link
                        key={p}
                        href={buildUrl({ page: String(p) })}
                        aria-current={p === page ? "page" : undefined}
                        className={`px-3.5 py-2 text-sm rounded-lg transition-colors ${
                          p === page
                            ? "bg-[var(--accent)] text-white font-semibold"
                            : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]"
                        }`}
                      >
                        {p}
                      </Link>
                    ))}
                    {page < totalPages && (
                      <Link
                        href={buildUrl({ page: String(page + 1) })}
                        className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
                      >
                        Next →
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="py-24 text-center">
      <div className="text-5xl mb-5 opacity-40">📖</div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {hasFilters ? "No courses match your filters" : "No courses published yet"}
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs mx-auto">
        {hasFilters
          ? "Try adjusting your search terms or removing a filter."
          : "Check back soon — scholars are preparing new content."}
      </p>
      {hasFilters && (
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
        >
          ← Clear all filters
        </Link>
      )}
    </div>
  );
}
