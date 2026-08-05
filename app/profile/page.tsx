"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiMail, FiEdit2, FiCheck, FiAlertCircle,
  FiBookOpen, FiBookmark, FiAward, FiActivity,
  FiLock, FiEye, FiEyeOff, FiLoader,
} from "react-icons/fi";
import * as Avatar from "@radix-ui/react-avatar";
import { RoleBadge } from "../components/ui/Badge";
import { FileUploader } from "../components/FileUploader";
import type { SessionUser } from "../types/auth.types";

type SaveStatus = "idle" | "saving" | "success" | "error";

interface FormState {
  name:  string;
  bio:   string;
  image: string;
}

interface ApiResponse {
  success: boolean;
  error?:  string;
  data?:   { name?: string | null; email?: string | null; image?: string | null; bio?: string | null };
}

export default function ProfilePage() {
  const { data: session, status: authStatus, update } = useSession();
  const router = useRouter();
  const user   = session?.user as SessionUser | undefined;

  const [editing,    setEditing]    = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error,      setError]      = useState("");
  const [form,       setForm]       = useState<FormState>({
    name:  user?.name  ?? "",
    bio:   "",
    image: user?.image ?? "",
  });

  // Sync form when session loads
  useEffect(() => {
    if (user) {
      setForm({ name: user.name ?? "", bio: "", image: user.image ?? "" });
      // Load bio from API
      fetch(`/api/users/${user.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setForm((prev) => ({ ...prev, bio: d.data?.bio ?? "" }));
        })
        .catch(() => {});
    }
  }, [user?.id]);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  if (authStatus === "loading" || authStatus === "unauthenticated") return null;

  const handleSave = async () => {
    setSaveStatus("saving");
    setError("");
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: form.name, bio: form.bio, image: form.image }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!data.success) throw new Error(data.error ?? "Update failed");

      await update({
        name:  data.data?.name  ?? form.name,
        email: data.data?.email ?? user?.email,
        image: data.data?.image ?? form.image,
      });

      setSaveStatus("success");
      setEditing(false);
      router.refresh();
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaveStatus("error");
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-3xl font-bold text-[var(--text-primary)] mb-8">
        My Profile
      </h1>

      <div className="glass-card rounded-2xl p-8">

        {/* ── Avatar + name ── */}
        <div className="flex items-start gap-6 mb-8 pb-8 border-b border-[var(--border)]">
          <div className="flex flex-col items-center gap-2">
            <Avatar.Root className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border-strong)]">
              <Avatar.Image
                src={editing ? form.image : (user?.image ?? "")}
                alt={user?.name ?? "User"}
                className="w-full h-full object-cover"
              />
              <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-[var(--accent-dim)] text-[var(--accent)] text-2xl font-display font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </Avatar.Fallback>
            </Avatar.Root>
            {editing && (
              <div className="w-48">
                <FileUploader
                  accept="image/*"
                  folder="ilm-platform/avatars"
                  label="Change photo"
                  onUpload={(url) => setForm((f) => ({ ...f, image: url }))}
                  currentUrl={form.image}
                />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)] mb-1">
              {user?.name}
            </h2>
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-1 mb-2">
              <FiMail size={13} /> {user?.email}
            </p>
            <RoleBadge role={user?.role ?? "USER"} />
          </div>
        </div>

        {/* ── Status messages ── */}
        {saveStatus === "success" && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <FiCheck /> Profile updated successfully!
          </div>
        )}
        {saveStatus === "error" && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <FiAlertCircle /> {error}
          </div>
        )}

        {/* ── Edit form ── */}
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
              Display Name
            </label>
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                placeholder="Your name"
              />
            ) : (
              <p className="text-[var(--text-primary)]">{user?.name}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
              Email
            </label>
            <p className="text-[var(--text-secondary)] text-sm">{user?.email}</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
              Bio
            </label>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className={inputClass}
                rows={3}
                placeholder="Tell others about yourself..."
                maxLength={500}
              />
            ) : (
              <p className="text-[var(--text-secondary)] text-sm">
                {form.bio || <span className="text-[var(--text-muted)] italic">No bio added</span>}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
              Role
            </label>
            <p className="text-[var(--text-secondary)] text-sm capitalize">
              {user?.role?.toLowerCase()}
            </p>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 mt-8">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saveStatus === "saving" ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-5 py-2 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-5 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl text-sm transition-colors"
            >
              <FiEdit2 size={14} /> Edit Profile
            </button>
          )}
        </div>

        {/* ── Quick links ── */}
        <div className="mt-8 pt-8 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-4">
            Quick Access
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/dashboard",               icon: <FiActivity size={14} />,  label: "Dashboard"    },
              { href: "/dashboard/bookmarks",     icon: <FiBookmark size={14} />,  label: "Bookmarks"    },
              { href: "/dashboard/certificates",  icon: <FiAward size={14} />,     label: "Certificates" },
              { href: "/courses",                 icon: <FiBookOpen size={14} />,  label: "Courses"      },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all text-center"
              >
                <span className="text-[var(--accent)]">{link.icon}</span>
                <span className="text-xs text-[var(--text-muted)]">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Change Password ── */}
        <ChangePasswordSection />

        {/* ── Scholar / Admin tools ── */}
        {(user?.role === "ADMIN" || user?.role === "SCHOLAR") && (
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-4">
              Content Tools
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/courses/new"
                className="px-4 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm rounded-xl transition-colors"
              >
                + New Course
              </Link>
              <Link
                href="/admin/courses"
                className="px-4 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm rounded-xl transition-colors"
              >
                Manage Courses &amp; Lessons
              </Link>
              {user?.role === "SCHOLAR" && (
                <Link
                  href="/dashboard/scholar"
                  className="px-4 py-2 bg-[var(--accent-dim)] border border-[var(--border-strong)] text-[var(--accent)] text-sm rounded-xl transition-colors hover:bg-[var(--accent)] hover:text-white"
                >
                  Scholar Dashboard
                </Link>
              )}
              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-[var(--accent-dim)] border border-[var(--border-strong)] text-[var(--accent)] text-sm rounded-xl transition-colors hover:bg-[var(--accent)] hover:text-white"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Change Password Component ─────────────────────────────────────────────────
function ChangePasswordSection() {
  const [open,    setOpen]    = useState(false);
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [err,     setErr]     = useState("");

  const strength      = next.length === 0 ? 0 : next.length >= 8 && /[A-Z]/.test(next) && /[0-9]/.test(next) ? 3 : next.length >= 6 ? 2 : 1;
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-emerald-400"][strength];
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (next !== confirm) { setErr("Passwords do not match"); return; }
    if (strength < 3)     { setErr("Password is not strong enough"); return; }

    setSaving(true);
    try {
      const res  = await fetch("/api/auth/change-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("Password changed successfully!");
        setCurrent(""); setNext(""); setConfirm(""); setOpen(false);
      } else {
        setErr(data.error ?? "Failed to change password");
      }
    } catch { setErr("Something went wrong"); }
    finally   { setSaving(false); }
  };

  const ic = "w-full px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <div className="mt-6 pt-6 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
          Security
        </p>
        {msg && <span className="text-xs text-emerald-400">{msg}</span>}
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm rounded-xl transition-colors"
        >
          <FiLock size={13} /> Change Password
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
          {err && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <FiAlertCircle size={13} /> {err}
            </div>
          )}

          {/* Current password */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={`${ic} pr-9`}
                placeholder="••••••••"
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]" tabIndex={-1}>
                {showPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">New Password</label>
            <input
              type={showPw ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={ic}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              required
            />
            {next.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <div className="flex gap-1">
                  {[1,2,3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${strength >= i ? strengthColor : "bg-[var(--bg-secondary)]"}`} />
                  ))}
                </div>
                <p className={`text-xs ${["","text-red-400","text-yellow-400","text-emerald-400"][strength]}`}>
                  {strengthLabel} password
                </p>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1">Confirm New Password</label>
            <input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`${ic} ${confirm && confirm !== next ? "border-red-500/40" : ""}`}
              placeholder="Repeat new password"
              required
            />
            {confirm && confirm !== next && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">
              {saving ? <><FiLoader className="animate-spin" size={13} /> Saving…</> : <><FiCheck size={13} /> Update Password</>}
            </button>
            <button type="button" onClick={() => { setOpen(false); setErr(""); }} className="btn-secondary text-sm px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
