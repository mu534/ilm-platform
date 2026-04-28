"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FiSearch, FiFilter, FiX, FiArrowRight } from "react-icons/fi";

interface SearchResult {
  id:          string;
  title:       string;
  slug:        string;
  description: string;
  type:        "TEXT" | "VIDEO";
  scholar?: { user: { name: string } };
}

interface EnhancedSearchProps {
  initialQuery?: string;
}

export function EnhancedSearch({ initialQuery = "" }: EnhancedSearchProps) {
  const [query,       setQuery]       = useState(initialQuery);
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters,     setFilters]     = useState({ type: "all", scholar: "all" });

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) performSearch();
      else { setResults([]); setShowResults(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filters]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${filters.type}&scholar=${filters.scholar}`);
      const data = await res.json() as SearchResult[];
      setResults(data.slice(0, 5));
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/lectures?search=${encodeURIComponent(query)}&type=${filters.type}`;
    }
  };

  return (
    <div ref={searchRef} className="w-full max-w-lg relative mb-8">
      <form onSubmit={handleSubmit}>
        {/* ── Search bar ── */}
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
              onFocus={() => query.length >= 2 && setShowResults(true)}
              placeholder="Search lectures, scholars, topics…"
              className="w-full pl-10 pr-8 py-3 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults([]); setShowResults(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex-shrink-0 p-2.5 rounded-xl border transition-all duration-200
              ${showFilters
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
              }
            `}
          >
            <FiFilter size={15} />
          </button>

          {/* Submit */}
          <button
            type="submit"
            className="
              flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-gradient-to-r from-gold-500 to-gold-600
              hover:from-gold-400 hover:to-gold-500
              text-white shadow-sm shadow-gold-600/30
              transition-all duration-200 hover:scale-105 active:scale-95
            "
          >
            Search
          </button>
        </div>
      </form>

      {/* ── Filters panel ── */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] backdrop-blur-sm border border-[var(--border-strong)] rounded-2xl p-4 z-50 shadow-[var(--shadow-lg)] animate-fadeInUp">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-60" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wide">
                Content Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="all">All Types</option>
                <option value="TEXT">Text</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wide">
                Scholar
              </label>
              <select
                value={filters.scholar}
                onChange={(e) => setFilters(prev => ({ ...prev, scholar: e.target.value }))}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="all">All Scholars</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Results dropdown ── */}
      {showResults && (results.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] backdrop-blur-sm border border-[var(--border-strong)] rounded-2xl overflow-hidden z-50 shadow-[var(--shadow-lg)] max-h-96 overflow-y-auto animate-fadeInUp">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-60" />

          {isLoading ? (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-[var(--accent-dim)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[var(--text-muted)] text-sm">Searching…</p>
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={`/lectures/${result.slug}`}
                  onClick={() => setShowResults(false)}
                  className="group flex items-start gap-3 p-4 hover:bg-[var(--accent-dim)] border-b border-[var(--border-subtle)] last:border-b-0 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--accent-dim)] border border-[var(--border)] flex items-center justify-center text-sm">
                    {result.type === "VIDEO" ? "🎥" : "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[var(--text-primary)] text-sm font-semibold truncate group-hover:text-[var(--accent)] transition-colors">
                      {result.title}
                    </h4>
                    <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">
                      {result.description}
                    </p>
                    {result.scholar && (
                      <p className="text-[var(--accent)] text-xs mt-1">
                        {result.scholar.user.name}
                      </p>
                    )}
                  </div>
                  <FiArrowRight className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all mt-1" size={13} />
                </Link>
              ))}
              <div className="p-3 border-t border-[var(--border)]">
                <Link
                  href={`/lectures?search=${encodeURIComponent(query)}`}
                  onClick={() => setShowResults(false)}
                  className="block text-center text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
                >
                  View all results →
                </Link>
              </div>
            </>
          ) : (
            <div className="p-6 text-center">
              <p className="text-[var(--text-muted)] text-sm">No results found</p>
              <p className="text-[var(--text-secondary)] text-xs mt-1">Try different keywords</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}