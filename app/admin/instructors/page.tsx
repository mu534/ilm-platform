"use client";

import { useState, useEffect, useCallback } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import {
  FiMoreVertical, FiTrash2, FiStar, FiUser,
  FiEdit2, FiSearch, FiCheckCircle,
} from "react-icons/fi";

interface InstructorProfile {
  id:       string;
  bio:      string;
  professionalDesignation?: string | null;
  topics:   string[];
  featured: boolean;
  verified: boolean;
  photo:    string | null;
  user:     { name: string; email: string; image: string | null };
  _count:   { lectures: number };
}

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<InstructorProfile[]>([]);
  const [filtered, setFiltered]       = useState<InstructorProfile[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");

  const fetchInstructors = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/scholars");
      const data = await res.json();
      if (data.success) { setInstructors(data.data); setFiltered(data.data); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchInstructors(); }, [fetchInstructors]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? instructors.filter(
            (s) =>
              s.user.name.toLowerCase().includes(q) ||
              s.user.email.toLowerCase().includes(q) ||
              s.topics.some((t) => t.toLowerCase().includes(q)) ||
              (s.professionalDesignation && s.professionalDesignation.toLowerCase().includes(q)),
          )
        : instructors,
    );
  }, [search, instructors]);

  const toggle = async (
    id: string,
    field: "featured" | "verified",
    current: boolean,
  ) => {
    const endpoint =
      field === "verified" ? `/api/scholars/${id}/verify` : `/api/scholars/${id}`;
    const body     = field === "verified" ? {} : { [field]: !current };

    await fetch(endpoint, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    void fetchInstructors();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete instructor profile for "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/scholars/${id}`, { method: "DELETE" });
    void fetchInstructors();
  };

  return (
    <div className="p-6 sm:p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">Manage</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Instructors</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {instructors.length} total · {instructors.filter((s) => s.verified).length} verified
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search instructors…"
          className="input-themed pl-9 text-sm"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] h-44 shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center mb-4">
            <FiUser className="text-[var(--accent)] text-xl" />
          </div>
          <p className="text-[var(--text-primary)] font-semibold mb-1">
            {search ? "No instructors match your search" : "No instructor profiles yet"}
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            {search ? "Try a different search term" : "Users with INSTRUCTOR role can create their profiles."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inst) => (
            <div
              key={inst.id}
              className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-300 p-5"
            >
              {/* Top accent */}
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border-strong)]">
                    {inst.photo ?? inst.user.image ? (
                      <Image
                        src={(inst.photo ?? inst.user.image)!}
                        alt={inst.user.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--accent-dim)] text-[var(--accent)] font-bold text-sm">
                        {inst.user.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {inst.user.name}
                    </p>
                    {inst.professionalDesignation && (
                      <p className="text-xs text-[var(--accent)] font-medium">
                        {inst.professionalDesignation}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-muted)] truncate max-w-[130px]">
                      {inst.user.email}
                    </p>
                  </div>
                </div>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-colors">
                      <FiMoreVertical size={14} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-1.5 min-w-[180px] z-50"
                      align="end"
                      sideOffset={4}
                    >
                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/scholars/${inst.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
                        >
                          <FiUser size={12} /> View Profile
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/scholars/${inst.id}/edit`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
                        >
                          <FiEdit2 size={12} /> Edit Info
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
                        onClick={() => toggle(inst.id, "featured", inst.featured)}
                      >
                        <FiStar size={12} className={inst.featured ? "text-[var(--accent)]" : ""} />
                        {inst.featured ? "Remove Feature" : "Feature"}
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg cursor-pointer outline-none transition-colors"
                        onClick={() => toggle(inst.id, "verified", inst.verified)}
                      >
                        <FiCheckCircle size={12} className={inst.verified ? "text-emerald-400" : ""} />
                        {inst.verified ? "Remove Verification" : "Verify"}
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />

                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none transition-colors"
                        onClick={() => remove(inst.id, inst.user.name)}
                      >
                        <FiTrash2 size={12} /> Delete Profile
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>

              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {inst.featured && (
                  <span className="status-featured text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FiStar size={9} /> Featured
                  </span>
                )}
                {inst.verified && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <FiCheckCircle size={9} /> Verified
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
                  {inst._count.lectures} lecture{inst._count.lectures !== 1 ? "s" : ""}
                </span>
              </div>

              <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 leading-relaxed">
                {inst.bio}
              </p>

              <div className="flex flex-wrap gap-1">
                {inst.topics.slice(0, 3).map((t) => (
                  <span key={t} className="tag text-xs">{t}</span>
                ))}
                {inst.topics.length > 3 && (
                  <span className="tag text-xs">+{inst.topics.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
