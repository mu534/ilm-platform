import Link from "next/link";
import { FiSearch, FiFilter } from "react-icons/fi";
import { prisma } from "@/app/lib/prism";
import { LectureCard } from "@/app/components/lectures/LectureCard";
import type { Lecture, LectureType } from "@/app/types/auth.types";

type SearchParams = { search?: string; tag?: string; type?: string; featured?: string; page?: string };
interface Props { searchParams: Promise<SearchParams> }

const VALID_TYPES = new Set(["TEXT", "VIDEO", "AUDIO", "PDF"]);
const PAGE_SIZE   = 12;

function mapLecture(l: {
  id: string; title: string; slug: string; description: string;
  content: string | null; type: LectureType; mediaUrl: string | null;
  thumbnailUrl: string | null; tags: string[]; published: boolean;
  featured: boolean; views: number; createdAt: Date; updatedAt: Date;
  author: { id: string; name: string; image: string | null };
  scholar: { id: string; bio: string; photo: string | null; topics: string[];
    qualifications: string[]; featured: boolean; userId: string;
    createdAt: Date; updatedAt: Date; user: { name: string } } | null;
  _count: { comments: number };
}): Lecture {
  return {
    id: l.id, title: l.title, slug: l.slug, description: l.description,
    content: l.content, type: l.type, mediaUrl: l.mediaUrl,
    thumbnailUrl: l.thumbnailUrl, tags: l.tags, published: l.published,
    featured: l.featured, views: l.views,
    createdAt: l.createdAt.toISOString(),
    author: l.author,
    scholar: l.scholar
      ? { id: l.scholar.id, bio: l.scholar.bio, photo: l.scholar.photo,
          topics: l.scholar.topics, user: { name: l.scholar.user.name } }
      : null,
    _count: l._count,
  };
}

async function getLectures(params: SearchParams) {
  const page    = Math.max(1, Number(params.page ?? 1));
  const search  = params.search ?? "";
  const tag     = params.tag ?? "";
  const type    = params.type ?? "";
  const featured = params.featured === "true";
  const typeFilter = VALID_TYPES.has(type) ? (type as LectureType) : undefined;

  const where = {
    published: true,
    ...(featured && { featured: true }),
    ...(typeFilter && { type: typeFilter }),
    ...(tag && { tags: { has: tag } }),
    ...(search && { OR: [
      { title:       { contains: search, mode: "insensitive" as const } },
      { description: { contains: search, mode: "insensitive" as const } },
    ]}),
  };

  const [total, lectures] = await Promise.all([
    prisma.lecture.count({ where }),
    prisma.lecture.findMany({
      where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        author:  { select: { id: true, name: true, image: true } },
        scholar: { include: { user: { select: { name: true } } } },
        _count:  { select: { comments: true } },
      },
    }),
  ]);

  const allTags = await prisma.lecture.findMany({ where: { published: true }, select: { tags: true } });
  const tagSet  = new Set(allTags.flatMap((l) => l.tags));

  return { lectures: lectures.map(mapLecture), total, page, totalPages: Math.ceil(total / PAGE_SIZE), tags: Array.from(tagSet) };
}

export default async function LecturesPage({ searchParams }: Props) {
  const sp  = await searchParams;
  const { lectures, total, page, totalPages, tags } = await getLectures(sp);

  const buildUrl = (overrides: Record<string, string>) => {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) { if (v !== undefined) merged[k] = v; }
    return `/lectures?${new URLSearchParams({ ...merged, ...overrides }).toString()}`;
  };

  const paginationClass = "px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-2">Library</p>
        <h1 className="font-display text-4xl font-bold text-[var(--text-primary)]">Lectures</h1>
        <p className="text-[var(--text-muted)] mt-2">{total} lectures available</p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <form className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              name="search"
              defaultValue={sp.search}
              placeholder="Search lectures…"
              className="input-themed pl-10"
            />
          </div>
          <button type="submit" className="btn-primary px-5">Search</button>
        </form>

        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {(["", "TEXT", "VIDEO", "AUDIO", "PDF"] as const).map((val) => {
            const label = { "": "All", TEXT: "Articles", VIDEO: "Videos", AUDIO: "Audio", PDF: "PDF" }[val];
            return (
              <Link key={val} href={buildUrl({ type: val, page: "1" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  (sp.type ?? "") === val
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 12).map((tag) => (
              <Link key={tag} href={buildUrl({ tag: sp.tag === tag ? "" : tag, page: "1" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sp.tag === tag
                    ? "tag-accent"
                    : "tag"
                }`}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {lectures.length === 0 ? (
        <div className="text-center py-24 text-[var(--text-muted)]">
          <FiFilter className="mx-auto text-4xl mb-4 opacity-30" />
          <p className="text-lg font-display text-[var(--text-primary)]">No lectures found</p>
          <p className="text-sm mt-2">Try adjusting your search or filters</p>
          <Link href="/lectures" className="mt-4 inline-block text-[var(--accent)] text-sm hover:text-[var(--accent-light)] transition-colors">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lectures.map((lecture) => <LectureCard key={lecture.id} lecture={lecture} variant="featured" />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} className={paginationClass}>Previous</Link>}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={buildUrl({ page: String(p) })}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                p === page
                  ? "bg-[var(--accent)] text-white"
                  : paginationClass
              }`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && <Link href={buildUrl({ page: String(page + 1) })} className={paginationClass}>Next</Link>}
        </div>
      )}
    </div>
  );
}
