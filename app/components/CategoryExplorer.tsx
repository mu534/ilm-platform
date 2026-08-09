import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

interface CategoryItem {
  id:          string;
  name:        string;
  slug:        string;
  icon:        string | null;
  color:       string | null;
  courseCount: number;
}

interface CategoryExplorerProps {
  categories: CategoryItem[];
}

export function CategoryExplorer({ categories }: CategoryExplorerProps) {
  if (categories.length === 0) return null;

  return (
    <section className="w-full bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-2">
              Browse by subject
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
              Explore Categories
            </h2>
          </div>
          <Link
            href="/courses"
            className="flex-shrink-0 flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors group"
          >
            All Courses
            <FiArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/courses?categoryId=${cat.id}`}
              className="group relative flex items-center gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-250"
            >
              <div
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl border border-[var(--border-subtle)]"
                style={{ background: cat.color ? `${cat.color}1a` : "var(--accent-dim)" }}
              >
                {cat.icon ?? "📖"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                  {cat.name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  {cat.courseCount} course{cat.courseCount !== 1 ? "s" : ""}
                </p>
              </div>
              <FiArrowRight
                size={14}
                className="flex-shrink-0 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

