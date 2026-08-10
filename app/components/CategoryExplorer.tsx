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

  // Split into two columns for desktop layout
  const mid  = Math.ceil(categories.length / 2);
  const col1 = categories.slice(0, mid);
  const col2 = categories.slice(mid);

  return (
    <section className="w-full bg-[var(--bg-secondary)]" aria-labelledby="categories-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">

        {/* Section header */}
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-2">
              Browse by subject
            </p>
            <h2 id="categories-heading" className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
              Explore Categories
            </h2>
            <p className="section-subtitle mt-2">
              Find courses across the key disciplines of Islamic knowledge.
            </p>
          </div>
          <Link
            href="/courses"
            className="flex-shrink-0 flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors group"
          >
            All Courses
            <FiArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Directory rows — 2 col on lg+, single col otherwise */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16">
          {/* Column 1 */}
          <div>
            {col1.map((cat) => (
              <CategoryRow key={cat.id} cat={cat} />
            ))}
          </div>
          {/* Column 2 */}
          <div>
            {col2.map((cat) => (
              <CategoryRow key={cat.id} cat={cat} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

function CategoryRow({ cat }: { cat: CategoryItem }) {
  return (
    <Link
      href={`/courses?categoryId=${cat.id}`}
      className="category-row group"
      aria-label={`Browse ${cat.name} — ${cat.courseCount} course${cat.courseCount !== 1 ? "s" : ""}`}
    >
      {/* Icon */}
      <div
        className="category-row__icon"
        style={{ background: cat.color ? `${cat.color}18` : "var(--accent-dim)" }}
        aria-hidden="true"
      >
        {cat.icon ?? "📖"}
      </div>

      {/* Name */}
      <span className="category-row__name">{cat.name}</span>

      {/* Course count */}
      <span className="category-row__count">
        {cat.courseCount} course{cat.courseCount !== 1 ? "s" : ""}
      </span>

      {/* Arrow */}
      <FiArrowRight size={14} className="category-row__arrow" aria-hidden="true" />
    </Link>
  );
}
