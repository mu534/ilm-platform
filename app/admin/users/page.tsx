"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { formatDate } from "../../utils/api";
import { FiSearch, FiMoreVertical, FiTrash2, FiShield } from "react-icons/fi";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SCHOLAR" | "USER";
  createdAt: string;
  _count: { lectures: number; comments: number };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    const res = await fetch(`/api/users?${params}`);
    const data = await res.json();
    if (data.success) setUsers(data.data.items);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const updateRole = async (userId: string, role: string) => {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    fetchUsers();
  };

  const roleBadge = (role: string) => {
    const styles =
      {
        ADMIN: "bg-red-900/30 text-red-400 border-red-700/30",
        SCHOLAR: "bg-gold-900/30 text-gold-400 border-gold-700/30",
        USER: "bg-blue-900/20 text-blue-400 border-blue-700/20",
      }[role] ?? "";
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${styles}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">Users</h1>
        <p className="text-ink-400 text-sm mt-1">
          Manage platform users and roles
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            size={14}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 bg-ink-800/80 border border-white/10 rounded-xl text-white text-sm placeholder-ink-500 focus:outline-none focus:border-gold-500/40"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-ink-800/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="SCHOLAR">Scholar</option>
          <option value="USER">User</option>
        </select>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-white/5">
        {loading ? (
          <div className="p-8 text-center text-ink-500">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-4 text-xs text-ink-500 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left p-4 text-xs text-ink-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left p-4 text-xs text-ink-500 uppercase tracking-wider">
                  Content
                </th>
                <th className="text-left p-4 text-xs text-ink-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/2">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold-700/30 flex items-center justify-center text-gold-400 text-sm font-bold">
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="text-sm text-white">{user.name}</p>
                        <p className="text-xs text-ink-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">{roleBadge(user.role)}</td>
                  <td className="p-4 text-xs text-ink-500">
                    {user._count.lectures} lectures · {user._count.comments}{" "}
                    comments
                  </td>
                  <td className="p-4 text-xs text-ink-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="p-4">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className="p-1.5 text-ink-500 hover:text-white hover:bg-white/5 rounded-lg">
                          <FiMoreVertical size={16} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="glass-card gold-border rounded-xl p-1.5 min-w-[160px] shadow-2xl"
                          sideOffset={4}
                          align="end"
                        >
                          <p className="px-3 py-1 text-xs text-ink-500">
                            Change Role
                          </p>
                          {["ADMIN", "SCHOLAR", "USER"].map((role) => (
                            <DropdownMenu.Item
                              key={role}
                              className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 rounded-lg cursor-pointer transition-colors ${user.role === role ? "text-gold-400" : "text-ink-300 hover:text-white"}`}
                              onClick={() => updateRole(user.id, role)}
                            >
                              <FiShield size={12} /> {role}
                            </DropdownMenu.Item>
                          ))}
                          <DropdownMenu.Separator className="my-1 border-t border-white/5" />
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/10 rounded-lg cursor-pointer"
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
