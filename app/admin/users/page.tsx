"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { formatDate } from "../../utils/api";
import { FiSearch, FiMoreVertical, FiTrash2, FiShield } from "react-icons/fi";
import { RoleBadge } from "../../components/ui/Badge";
import type { Role } from "../../../generated/prisma/enums";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  createdAt: string;
  _count: { lectures: number; comments: number };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // ── Stable fetch function for mutations to call ──────────────────────────
  const refetch = useCallback(async (q: string, role: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (role) params.set("role", role);
      const res  = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) setUsers(data.data.items);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial load + re-fetch on filter change ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search)     params.set("search", search);
        if (roleFilter) params.set("role", roleFilter);
        const res  = await fetch(`/api/users?${params}`);
        const data = await res.json();
        if (!cancelled && data.success) setUsers(data.data.items);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [search, roleFilter]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateRole = async (userId: string, role: Role) => {
    // Optimistic update — immediately reflect in UI
    setUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, role } : u)
    );

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role }),
      });

      if (!res.ok) {
        // Revert on failure
        await refetch(search, roleFilter);
        return;
      }

      // Refresh server components (scholars page etc.) so they pick up the change
      router.refresh();
    } catch (err) {
      console.error("Failed to update role:", err);
      await refetch(search, roleFilter);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user?")) return;

    // Optimistic remove
    setUsers(prev => prev.filter(u => u.id !== userId));

    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) await refetch(search, roleFilter); // revert on failure
      else router.refresh();
    } catch (err) {
      console.error("Failed to delete user:", err);
      await refetch(search, roleFilter);
    }
  };

  // Role badge: use centralized `RoleBadge` from UI components

  return (
    <div className="p-6 sm:p-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1">
          Manage
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Users
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Manage platform users and roles
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            size={14}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="INSTRUCTOR">Instructor</option>
          <option value="USER">User</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 h-16 shimmer" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)] text-sm">
            No users found.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["User", "Role", "Content", "Joined", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  {/* User */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] text-sm font-bold flex-shrink-0">
                        {user.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {user.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-xs text-[var(--text-muted)]">
                            <a href={`tel:${user.phone}`} className="hover:text-[var(--accent)] transition-colors">
                              📞 {user.phone}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3.5"><RoleBadge role={user.role} /></td>

                  {/* Content */}
                  <td className="px-5 py-3.5 text-xs text-[var(--text-muted)]">
                    {user._count.lectures} lectures · {user._count.comments} comments
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-3.5 text-xs text-[var(--text-muted)]">
                    {formatDate(user.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] rounded-lg transition-colors">
                          <FiMoreVertical size={16} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-1.5 min-w-[160px] z-50"
                          sideOffset={4}
                          align="end"
                        >
                          <p className="px-3 py-1 text-xs text-[var(--text-muted)] font-medium">
                            Change Role
                          </p>
                          {(["ADMIN", "INSTRUCTOR", "USER"] as const).map((role) => (
                            <DropdownMenu.Item
                              key={role}
                              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none transition-colors ${
                                user.role === role
                                  ? "text-[var(--accent)] bg-[var(--accent-dim)]"
                                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                              }`}
                              onClick={() => updateRole(user.id, role)}
                            >
                              <FiShield size={12} /> {role}
                            </DropdownMenu.Item>
                          ))}
                          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none transition-colors"
                            onClick={() => deleteUser(user.id)}
                          >
                            <FiTrash2 size={12} /> Delete User
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}