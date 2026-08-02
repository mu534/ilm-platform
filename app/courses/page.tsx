import Link from "next/link";
import { prisma } from "@/app/lib/prism";
import { CourseCard } from "@/app/components/courses/CourseCard";
import type { DifficultyLevel } from "@/app/types/auth.types";
import { FiSearch, FiSliders } from "react-icons/fi";

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
  { value: "newest",    label: "Newest"      },
  { value: "popular",   label: "Most Popular" },
  { value: "top-rated", label: "Top Rated"    },
  { value: "oldest",    label: "Oldest"       },
];

const DIFFICULTY_OPTIONS = [
  { value: "",             label: "All Levels"    },
  { value: "BEGINNER",     label: "Beginner"      },
  { value: "INTERMEDIATE", label: "Intermediate"  },
  { value: "ADVANCED",     label: "Advanced"      },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">
            Islamic Courses
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {total.toLocaleString()} course{total !== 1 ? "s" : ""} taught by verified scholars
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar filters ── */}
          <aside className="lg:w-56 flex-shrink-0 space-y-6">

            {/* Search */}
            <form>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Search
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                <input
                  name="search"
                  defaultValue={sp.search}
                  placeholder="Search courses…"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </form>

            {/* Category */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Category
              </p>
              <div className="space-y-0.5">
                <Link
                  href={buildUrl({ categoryId: "", page: "1" })}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      sp.categoryId === cat.id
                        ? "bg-[var(--accent-dim)] text-[var(--accent)] font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {cat.icon && <span className="text-xs">{cat.icon}</span>}
                    <span className="truncate">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Level */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Level
              </p>
              <div className="space-y-0.5">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <Link
                    key={opt.value}
                    href={buildUrl({ difficulty: opt.value, page: "1" })}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
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

            {/* Clear filters */}
            {hasFilters && (
              <Link
                href="/courses"
                className="block text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
              >
                ✕ Clear all filters
              </Link>
            )}
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">

            {/* Sort bar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-[var(--text-muted)]">
                {hasFilters && (
                  <span className="text-[var(--text-primary)] font-medium mr-1">
                    {total.toLocaleString()} result{total !== 1 ? "s" : ""}
                  </span>
                )}
                {!hasFilters && (
                  <span>{total.toLocaleString()} courses</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <FiSliders size={13} className="text-[var(--text-muted)]" />
                <select
                  value={activeSort}
                  onChange={() => {}}
                  className="text-sm bg-transparent text-[var(--text-muted)] border-none outline-none cursor-pointer"
                  aria-label="Sort by"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {/* Hidden links for server-side sort */}
                <div className="flex gap-1 ml-1">
                  {SORT_OPTIONS.map((s) => (
                    <Link
                      key={s.value}
                      href={buildUrl({ sort: s.value, page: "1" })}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        activeSort === s.value
                          ? "text-[var(--accent)] font-semibold"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
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
                  <div className="flex justify-center items-center gap-1">
                    {page > 1 && (
                      <Link href={buildUrl({ page: String(page - 1) })}
                        className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors">
                        Previous
                      </Link>
                    )}
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                      <Link key={p} href={buildUrl({ page: String(p) })}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                          p === page
                            ? "bg-[var(--accent)] text-white font-medium"
                            : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]"
                        }`}
                      >{p}</Link>
                    ))}
                    {page < totalPages && (
                      <Link href={buildUrl({ page: String(page + 1) })}
                        className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors">
                        Next
                      </Link>
                    )}
                  </div>
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
    <div className="py-20 text-center">
      <div className="text-4xl mb-4">📖</div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {hasFilters ? "No courses match your filters" : "No courses published yet"}
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {hasFilters ? "Try adjusting your search terms or removing filters." : "Check back soon."}
      </p>
      {hasFilters && (
        <Link href="/courses" className="text-sm text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
          Clear all filters →
        </Link>
      )}
    </div>
  );
}
