"use client";
import { useState, useEffect, useCallback } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { FiMoreVertical, FiTrash2, FiStar, FiUser } from "react-icons/fi";

interface Scholar {
  id: string;
  bio: string;
  topics: string[];
  featured: boolean;
  photo?: string;
  user: { name: string; email: string };
  _count: { lectures: number };
}

export default function AdminScholarsPage() {
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScholars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scholars");
      const data = await res.json();
      if (data.success) setScholars(data.data);
    } catch (err) {
      console.error("Failed to fetch scholars:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/scholars");
        const data = await res.json();
        if (!cancelled && data.success) setScholars(data.data);
      } catch (err) {
        console.error("Failed to fetch scholars:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const toggle = async (id: string, field: "featured", value: boolean) => {
    await fetch(`/api/scholars/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !value }),
    });
    fetchScholars();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete scholar profile?")) return;
    await fetch(`/api/scholars/${id}`, { method: "DELETE" });
    fetchScholars();
  };

  return (
    <div className="p-6 sm:p-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">
          Manage
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Scholars
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Manage scholar profiles and featuring
        </p>
      </div>

      {/* ── States ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 h-40 shimmer"
            />
          ))}
        </div>
      ) : scholars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mb-4">
            <FiUser className="text-[var(--accent)] text-xl" />
          </div>
          <p className="text-[var(--text-primary)] font-semibold mb-1">
            No scholar profiles yet
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            Users with SCHOLAR role can create their profiles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scholars.map((scholar) => (
            <div
              key={scholar.id}
              className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-300 p-5"
            >
              {/* Top accent line on hover */}
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* ── Card header ── */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] font-bold text-sm flex-shrink-0">
                    {scholar.user.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {scholar.user.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {scholar._count.lectures} lecture{scholar._count.lectures !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Dropdown */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-colors">
                      <FiMoreVertical size={14} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-1.5 min-w-[160px] z-50"
                      align="end"
                      sideOffset={4}
                    >
                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/scholars/${scholar.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
                        >
                          <FiUser size={12} /> View Profile
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
                        onClick={() => toggle(scholar.id, "featured", scholar.featured)}
                      >
                        <FiStar
                          size={12}
                          className={scholar.featured ? "text-[var(--accent)]" : ""}
                        />
                        {scholar.featured ? "Unfeature" : "Feature"}
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none transition-colors"
                        onClick={() => remove(scholar.id)}
                      >
                        <FiTrash2 size={12} /> Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>

              {/* Featured badge */}
              {scholar.featured && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] mb-2">
                  <FiStar className="text-[var(--accent)]" size={10} />
                  <span className="text-xs text-[var(--accent)] font-medium">Featured</span>
                </div>
              )}

              {/* Bio */}
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 leading-relaxed">
                {scholar.bio}
              </p>

              {/* Topics */}
              <div className="flex flex-wrap gap-1">
                {scholar.topics.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)]"
                  >
                    {t}
                  </span>
                ))}
                {scholar.topics.length > 3 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
                    +{scholar.topics.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}