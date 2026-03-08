"use client";
import { useState, useEffect } from "react";
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

  const fetchScholars = async () => {
    setLoading(true);
    const res = await fetch("/api/scholars");
    const data = await res.json();
    if (data.success) setScholars(data.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchScholars();
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">Scholars</h1>
        <p className="text-ink-400 text-sm mt-1">
          Manage scholar profiles and featuring
        </p>
      </div>

      {loading ? (
        <div className="text-center text-ink-500 py-12">Loading...</div>
      ) : scholars.length === 0 ? (
        <div className="text-center py-16 text-ink-500">
          <FiUser className="mx-auto text-4xl mb-3 text-ink-700" />
          <p>No scholar profiles yet.</p>
          <p className="text-sm mt-1">
            Users with SCHOLAR role can create their profiles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scholars.map((scholar) => (
            <div
              key={scholar.id}
              className="glass-card rounded-xl p-5 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-700/30 flex items-center justify-center text-gold-400 font-bold">
                    {scholar.user.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {scholar.user.name}
                    </p>
                    <p className="text-xs text-ink-500">
                      {scholar._count.lectures} lectures
                    </p>
                  </div>
                </div>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-1.5 text-ink-500 hover:text-white rounded-lg">
                      <FiMoreVertical size={14} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="glass-card gold-border rounded-xl p-1.5 min-w-[160px] shadow-2xl"
                      align="end"
                    >
                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/scholars/${scholar.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-ink-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
                        >
                          <FiUser size={12} /> View Profile
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm text-ink-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
                        onClick={() =>
                          toggle(scholar.id, "featured", scholar.featured)
                        }
                      >
                        <FiStar
                          size={12}
                          className={scholar.featured ? "text-gold-400" : ""}
                        />
                        {scholar.featured ? "Unfeature" : "Feature"}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/10 rounded-lg cursor-pointer"
                        onClick={() => remove(scholar.id)}
                      >
                        <FiTrash2 size={12} /> Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>

              {scholar.featured && (
                <div className="flex items-center gap-1 mb-2">
                  <FiStar className="text-gold-400" size={11} />
                  <span className="text-xs text-gold-400">Featured</span>
                </div>
              )}

              <p className="text-xs text-ink-400 line-clamp-2 mb-3">
                {scholar.bio}
              </p>

              <div className="flex flex-wrap gap-1">
                {scholar.topics.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-full bg-gold-900/20 text-gold-500 border border-gold-700/20"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
