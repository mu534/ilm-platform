"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FiSearch, FiX, FiArrowRight, FiBookOpen } from "react-icons/fi";

interface LectureResult {
  id: string; title: string; slug: string;
  description: string; type: string;
  scholar?: { user: { name: string } } | null;
  category?: { name: string; icon?: string | null } | null;
}

interface CourseResult {
  id: string; title: string; slug: string;
  description: string; difficulty: string;
  category?: { name: string; icon?: string | null } | null;
  _count: { enrollments: number };
}

interface ScholarResult {
  id: string; photo?: string | null; verified: boolean;
  topics: string[];
  user: { name: string; image?: string | null };
  _count: { lectures: number };
}

interface SearchResults {
  lectures: LectureResult[];
  courses:  CourseResult[];
  scholars: ScholarResult[];
}

export function EnhancedSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [query,       setQuery]       = useState(initialQuery);
  const [results,     setResults]     = useState<SearchResults | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        setIsLoading(true);
        fetch(`/api/search?q=${encodeURIComponent(query)}&type=all`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success) {
              setResults(d.data as SearchResults);
              setShowResults(true);
            }
          })
          .catch(() => setResults(null))
          .finally(() => setIsLoading(false));
      } else {
        setResults(null);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/lectures?search=${encodeURIComponent(query)}`;
    }
  };

  const totalResults = results
    ? (results.lectures.length + results.courses.length + results.scholars.length)
    : 0;

  return (
    <div ref={searchRef} className="w-full max-w-lg relative mb-8">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)]/80 backdrop-blur-sm shadow-[var(--shadow-md)]">
          <div className="relative flex-1 min-w-0">
            <FiSearch
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              size={16}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results && setShowResults(true)}
              placeholder="Search lectures, courses, scholars…"
              className="w-full pl-10 pr-8 py-3 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none text-sm"
              aria-label="Search"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults(null); setShowResults(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all"
                aria-label="Clear search"
              >
                <FiX size={13} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Search
          </button>
        </div>
      </form>

      {/* Results dropdown */}
      {showResults && (isLoading || totalResults > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl overflow-hidden z-50 shadow-[var(--shadow-lg)] max-h-[420px] overflow-y-auto animate-fadeInUp">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-60" />

          {isLoading ? (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-[var(--accent-dim)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[var(--text-muted)] text-sm">Searching…</p>
            </div>
          ) : (
            <>
              {/* Lectures */}
              {results!.lectures.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Lectures
                  </p>
                  {results!.lectures.map((l) => (
                    <Link
                      key={l.id}
                      href={`/lectures/${l.slug}`}
                      onClick={() => setShowResults(false)}
                      className="group flex items-start gap-3 px-4 py-2.5 hover:bg-[var(--accent-dim)] transition-colors"
                    >
                      <span className="flex-shrink-0 text-base mt-0.5">
                        {l.type === "VIDEO" ? "🎥" : l.type === "AUDIO" ? "🎧" : l.type === "PDF" ? "📄" : "📝"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate transition-colors">
                          {l.title}
                        </p>
                        {l.scholar && (
                          <p className="text-xs text-[var(--text-muted)] truncate">{l.scholar.user.name}</p>
                        )}
                      </div>
                      <FiArrowRight className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] mt-1 transition-colors" size={12} />
                    </Link>
                  ))}
                </div>
              )}

              {/* Courses */}
              {results!.courses.length > 0 && (
                <div className={results!.lectures.length > 0 ? "border-t border-[var(--border)]" : ""}>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Courses
                  </p>
                  {results!.courses.map((c) => (
                    <Link
                      key={c.id}
                      href={`/courses/${c.slug}`}
                      onClick={() => setShowResults(false)}
                      className="group flex items-start gap-3 px-4 py-2.5 hover:bg-[var(--accent-dim)] transition-colors"
                    >
                      <FiBookOpen className="flex-shrink-0 text-[var(--accent)] mt-0.5" size={16} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate transition-colors">
                          {c.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {c.difficulty} · {c._count.enrollments} students
                        </p>
                      </div>
                      <FiArrowRight className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] mt-1 transition-colors" size={12} />
                    </Link>
                  ))}
                </div>
              )}

              {/* Scholars */}
              {results!.scholars.length > 0 && (
                <div className={(results!.lectures.length > 0 || results!.courses.length > 0) ? "border-t border-[var(--border)]" : ""}>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Scholars
                  </p>
                  {results!.scholars.map((s) => (
                    <Link
                      key={s.id}
                      href={`/scholars/${s.id}`}
                      onClick={() => setShowResults(false)}
                      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--accent-dim)] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-xs font-bold flex-shrink-0">
                        {s.user.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate transition-colors flex items-center gap-1">
                          {s.user.name}
                          {s.verified && <span className="text-emerald-400 text-xs">✓</span>}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{s._count.lectures} lectures</p>
                      </div>
                      <FiArrowRight className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" size={12} />
                    </Link>
                  ))}
                </div>
              )}

              {/* View all */}
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <Link
                  href={`/lectures?search=${encodeURIComponent(query)}`}
                  onClick={() => setShowResults(false)}
                  className="block text-center text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
                >
                  View all results for &ldquo;{query}&rdquo; →
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
