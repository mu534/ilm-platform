import { prisma } from "../../lib/prism";
import { LectureCard } from "../../components/LectureCard";
import Link from "next/link";
import { FiSearch, FiFilter } from "react-icons/fi";

interface Props {
  searchParams: {
    search?: string;
    tag?: string;
    type?: string;
    featured?: string;
    page?: string;
  };
}

const PAGE_SIZE = 12;

async function getLectures(params: Props["searchParams"]) {
  const page = Math.max(1, Number(params.page ?? 1));
  const search = params.search ?? "";
  const tag = params.tag ?? "";
  const type = params.type ?? "";
  const featured = params.featured === "true";

  const where: any = { published: true };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (tag) where.tags = { has: tag };
  if (type) where.type = type;
  if (featured) where.featured = true;

  const [total, lectures] = await Promise.all([
    prisma.lecture.count({ where }),
    prisma.lecture.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, image: true } },
        scholar: { include: { user: { select: { name: true } } } },
        _count: { select: { comments: true } },
      },
    }),
  ]);

  // Get all tags for filter
  const allTags = await prisma.lecture.findMany({
    where: { published: true },
    select: { tags: true },
  });
  const tagSet = new Set(allTags.flatMap((l) => l.tags));

  return {
    lectures,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
    tags: Array.from(tagSet),
  };
}

export default async function LecturesPage({ searchParams }: Props) {
  const { lectures, total, page, totalPages, tags } =
    await getLectures(searchParams);

  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({
      ...searchParams,
      ...overrides,
    } as any);
    return `/lectures?${params.toString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-2">
          Library
        </p>
        <h1 className="font-display text-4xl font-bold text-white">Lectures</h1>
        <p className="text-ink-400 mt-2">{total} lectures available</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <form className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              size={16}
            />
            <input
              name="search"
              defaultValue={searchParams.search}
              placeholder="Search lectures..."
              className="w-full pl-10 pr-4 py-2.5 bg-ink-800/80 border border-white/10 rounded-xl text-white text-sm placeholder-ink-500 focus:outline-none focus:border-gold-500/50"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-gold-600 hover:bg-gold-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {/* Type filters */}
          {[
            ["", "All"],
            ["TEXT", "Articles"],
            ["VIDEO", "Videos"],
            ["AUDIO", "Audio"],
          ].map(([val, label]) => (
            <Link
              key={val}
              href={buildUrl({ type: val, page: "1" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (searchParams.type ?? "") === val
                  ? "bg-gold-600 text-white"
                  : "bg-ink-800/60 text-ink-300 hover:text-white border border-white/5"
              }`}
            >
              {label}
            </Link>
          ))}

          {/* Tag filters */}
          {tags.slice(0, 10).map((tag) => (
            <Link
              key={tag}
              href={buildUrl({
                tag: searchParams.tag === tag ? "" : tag,
                page: "1",
              })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                searchParams.tag === tag
                  ? "bg-gold-600/20 text-gold-300 border border-gold-500/30"
                  : "bg-ink-800/40 text-ink-400 hover:text-white border border-white/5"
              }`}
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
      {lectures.length === 0 ? (
        <div className="text-center py-24 text-ink-400">
          <FiFilter className="mx-auto text-4xl mb-4 text-ink-600" />
          <p className="text-lg font-display">No lectures found</p>
          <p className="text-sm mt-2">Try adjusting your search or filters</p>
          <Link
            href="/lectures"
            className="mt-4 inline-block text-gold-400 text-sm hover:text-gold-300"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lectures.map((lecture) => (
            <LectureCard
              key={lecture.id}
              lecture={lecture as any}
              variant="featured"
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          {page > 1 && (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="px-4 py-2 text-sm border border-white/10 rounded-lg text-ink-300 hover:text-white hover:border-gold-500/30 transition-colors"
            >
              Previous
            </Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <Link
                key={p}
                href={buildUrl({ page: String(p) })}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  p === page
                    ? "bg-gold-600 text-white"
                    : "border border-white/10 text-ink-300 hover:text-white hover:border-gold-500/30"
                }`}
              >
                {p}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="px-4 py-2 text-sm border border-white/10 rounded-lg text-ink-300 hover:text-white hover:border-gold-500/30 transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
