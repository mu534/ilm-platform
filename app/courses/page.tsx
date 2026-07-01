import Link from "next/link";
import { prisma } from "@/app/lib/prism";
import { CourseCard } from "@/app/components/courses/CourseCard";
import type { DifficultyLevel } from "@/app/types/auth.types";
import { FiSearch } from "react-icons/fi";

type SearchParams = {
  search?:     string;
  categoryId?: string;
  difficulty?: string;
  featured?:   string;
  page?:       string;
};

interface Props {
  searchParams: Promise<SearchParams>;
}

const PAGE_SIZE = 12;

async function getCoursesData(params: SearchParams) {
  const page       = Math.max(1, Number(params.page ?? 1));
  const search     = params.search ?? "";
  const categoryId = params.categoryId ?? "";
  const featured   = params.featured === "true";
  const difficulty = params.difficulty ?? "";

  const validDifficulty =
    difficulty === "BEGINNER" || difficulty === "INTERMEDIATE" || difficulty === "ADVANCED"
      ? (difficulty as DifficultyLevel)
      : undefined;

  const where = {
    published: true,
    status: "PUBLISHED" as const,
    ...(featured     ? { featured: true } : {}),
    ...(validDifficulty ? { difficulty: validDifficulty } : {}),
    ...(categoryId   ? { categoryId } : {}),
    ...(search ? {
      OR: [
        { title:       { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [total, courses, categories] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        author:   { select: { id: true, name: true, image: true } },
        scholar:  {
          select: {
            id: true, photo: true, verified: true,
            user: { select: { name: true } },
          },
        },
        _count: { select: { modules: true, enrollments: true, ratings: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  return { courses, total, page, totalPages: Math.ceil(total / PAGE_SIZE), categories };
}

export const metadata = { title: "Courses" };

export default async function CoursesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { courses, total, page, totalPages, categories } = await getCoursesData(sp);

  const buildUrl = (overrides: Record<string, string>) => {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) {
      if (v !== undefined) merged[k] = v;
    }
    return `/courses?${new URLSearchParams({ ...merged, ...overrides }).toString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-2">
          Learning Paths
        </p>
        <h1 className="font-display text-4xl font-bold text-[var(--text-primary)]">
          Courses
        </h1>
        <p className="text-[var(--text-muted)] mt-2">{total} courses available</p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <form className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={16}
            />
            <input
              name="search"
              defaultValue={sp.search}
              placeholder="Search courses..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white rounded-xl text-sm font-medium transition-colors"
          >
            Search
          </button>
        </form>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildUrl({ categoryId: "", page: "1" })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !sp.categoryId
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={buildUrl({ categoryId: sp.categoryId === cat.id ? "" : cat.id, page: "1" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                sp.categoryId === cat.id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]"
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-2">
          {(["", "BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((d) => {
            const label = { "": "All Levels", BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" }[d];
            return (
              <Link
                key={d}
                href={buildUrl({ difficulty: d, page: "1" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  (sp.difficulty ?? "") === d
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)]"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Course grid */}
      {courses.length === 0 ? (
        <div className="text-center py-24 text-[var(--text-muted)]">
          <p className="text-lg font-display">No courses found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
          <Link href="/courses" className="mt-4 inline-block text-[var(--accent)] text-sm hover:text-[var(--accent-light)]">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          {page > 1 && (
            <Link href={buildUrl({ page: String(page - 1) })} className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Previous
            </Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildUrl({ page: String(p) })}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                p === page
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })} className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
