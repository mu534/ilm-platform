"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiMail, FiEdit2, FiCheck, FiAlertCircle } from "react-icons/fi";
import * as Avatar from "@radix-ui/react-avatar";
import { RoleBadge } from "../components/ui/Badge";
import type { SessionUser } from "../types/auth.types";

type Status = "idle" | "saving" | "success" | "error";

interface ApiResponse {
  success: boolean;
  error?: string;
  data?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function ProfilePage() {
  const { data: session, status: authStatus, update } = useSession();
  const router = useRouter();

  const user = session?.user as SessionUser | undefined;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? "" });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({ name: user?.name ?? "" });
  }, [user?.name]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  if (authStatus === "loading" || authStatus === "unauthenticated") {
    return null;
  }

  const handleSave = async () => {
    setStatus("saving");
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name }),
      });

      const data = (await res.json()) as ApiResponse;
      if (!data.success) throw new Error(data.error ?? "Update failed");

      const updatedName = data.data?.name ?? form.name;
      await update({
        name: updatedName,
        email: data.data?.email ?? user?.email,
        image: data.data?.image ?? user?.image,
      });

      setForm({ name: updatedName });
      setStatus("success");
      setEditing(false);
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setStatus("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">
          My Profile
        </h1>
      </div>

      <div className="glass-card gold-border rounded-2xl p-8">
        {/* Avatar & basic info */}
        <div className="flex items-start gap-6 mb-8 pb-8 border-b border-white/5">
          <Avatar.Root className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold-500/30">
            <Avatar.Image
              src={user?.image ?? ""}
              alt={user?.name ?? "User"}
              className="w-full h-full object-cover"
            />
            <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-gold-700 text-white text-2xl font-display font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>

          <div>
            <h2 className="font-display text-2xl font-semibold text-white">
              {user?.name}
            </h2>
            <p className="text-sm text-ink-400 flex items-center gap-1 mt-1">
              <FiMail size={13} /> {user?.email}
            </p>
            <div className="mt-2">
              <RoleBadge role={user?.role ?? "USER"} />
            </div>
          </div>
        </div>

        {/* Status messages */}
        {status === "success" && (
          <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
            <FiCheck /> Profile updated!
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
            <FiAlertCircle /> {error}
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-ink-400 font-medium mb-1.5">
              Display Name
            </label>
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-ink-800/80 border border-gold-500/30 rounded-xl text-white text-sm focus:outline-none"
              />
            ) : (
              <p className="text-white">{user?.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-ink-400 font-medium mb-1.5">
              Email
            </label>
            <p className="text-ink-300 text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-8">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={status === "saving"}
                className="px-5 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {status === "saving" ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-5 py-2 border border-white/10 text-ink-300 hover:text-white rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-5 py-2 border border-white/10 hover:border-gold-500/30 text-ink-300 hover:text-white rounded-xl text-sm transition-colors"
            >
              <FiEdit2 size={14} /> Edit Profile
            </button>
          )}
        </div>

        {/* Role-based actions */}
        {(user?.role === "ADMIN" || user?.role === "SCHOLAR") && (
          <div className="mt-8 pt-8 border-t border-white/5">
            <p className="text-xs text-ink-500 uppercase tracking-wider font-semibold mb-3">
              Actions
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/lectures/new"
                className="px-4 py-2 bg-ink-800/60 hover:bg-ink-700/60 text-sm text-white border border-white/10 rounded-xl transition-colors"
              >
                + New Lecture
              </Link>
              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-gold-600/20 hover:bg-gold-600/30 text-sm text-gold-400 border border-gold-700/30 rounded-xl transition-colors"
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
