"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FiSearch, FiFilter, FiX, FiArrowRight } from "react-icons/fi";

import { prisma } from "@/app/lib/prism";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: "TEXT" | "VIDEO";
  scholar?: {
    user: {
      name: string;
    };
  };
}

interface EnhancedSearchProps {
  initialQuery?: string;
}

export function EnhancedSearch({ initialQuery = "" }: EnhancedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filters, setFilters] = useState({
    type: "all", // all, text, video, audio
    scholar: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${filters.type}&scholar=${filters.scholar}`);
      const data = await response.json();
      setResults(data.slice(0, 5)); // Limit to 5 results
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/lectures?search=${encodeURIComponent(query)}&type=${filters.type}&scholar=${filters.scholar}`;
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="w-full max-w-lg relative">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <FiSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              size={17}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowResults(true)}
              placeholder="Search lectures, scholars, topics..."
              className="w-full pl-11 pr-12 py-3.5 bg-card border border-theme rounded-xl text-primary placeholder-muted focus:outline-none focus:border-accent text-sm backdrop-blur-sm transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-shrink-0 p-3.5 border rounded-xl transition-all duration-200 ${
              showFilters
                ? "bg-accent border-accent text-primary"
                : "border-theme bg-card text-muted hover:border-accent hover:bg-card-hover"
            }`}
          >
            <FiFilter size={16} />
          </button>

          <button
            type="submit"
            className="flex-shrink-0 px-5 py-3.5 bg-accent hover:bg-accent-light active:bg-accent text-primary rounded-xl text-sm font-medium transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card backdrop-blur-sm border border-theme rounded-xl p-4 z-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-2">Content Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 bg-card border border-theme rounded-lg text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="all">All Types</option>
                <option value="TEXT">Text</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-2">Scholar</label>
              <select
                value={filters.scholar}
                onChange={(e) => setFilters(prev => ({ ...prev, scholar: e.target.value }))}
                className="w-full px-3 py-2 bg-card border border-theme rounded-lg text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="all">All Scholars</option>
                {/* This would be populated dynamically */}
                <option value="scholar1">Dr. Ahmed</option>
                <option value="scholar2">Sheikh Omar</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {showResults && (results.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card backdrop-blur-sm border border-theme rounded-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-muted text-sm">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={`/lectures/${result.slug}`}
                  className="block p-4 hover:bg-card-hover transition-colors border-b border-theme last:border-b-0"
                  onClick={() => setShowResults(false)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent text-xs font-medium">
                      {result.type === "VIDEO" ? "🎥" : "📄"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-primary text-sm font-medium truncate">{result.title}</h4>
                      <p className="text-muted text-xs truncate mt-1">{result.description}</p>
                      {result.scholar && (
                        <p className="text-accent text-xs mt-1">{result.scholar.user.name}</p>
                      )}
                    </div>
                    <FiArrowRight className="flex-shrink-0 text-muted text-sm mt-1" />
                  </div>
                </Link>
              ))}
              <div className="p-3 border-t border-theme">
                <Link
                  href={`/lectures?search=${encodeURIComponent(query)}`}
                  className="block text-center text-accent hover:text-accent-light text-sm font-medium transition-colors"
                  onClick={() => setShowResults(false)}
                >
                  View all results
                </Link>
              </div>
            </>
          ) : (
            <div className="p-4 text-center">
              <p className="text-muted text-sm">No results found</p>
              <p className="text-secondary text-xs mt-1">Try different keywords or filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}