"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  FiBell, FiGlobe, FiLock, FiTrash2, FiSave,
  FiLoader, FiCheck, FiAlertTriangle, FiX, FiArrowRight,
  FiMapPin, FiEdit3, FiUser, FiImage, FiPhone, FiCheckCircle,
} from "react-icons/fi";

interface Preferences {
  notifyNewContent:  boolean;
  notifyComments:    boolean;
  preferredLanguage: string;
  profileCompletion?: { percentage: number; missing: string[] };
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "ur", label: "اردو (Urdu)" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "tr", label: "Türkçe (Turkish)" },
  { code: "fr", label: "Français" },
];

const inputClass =
  "w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors";

// Best-effort icon per missing-field label — falls back to a generic dot
// if the field name doesn't match a known one, so this never breaks if the
// backend adds a new field to the completion check.
const FIELD_ICONS: Record<string, React.ReactNode> = {
  Country: <FiMapPin size={11} />,
  City:    <FiMapPin size={11} />,
  Bio:     <FiEdit3 size={11} />,
  Photo:   <FiImage size={11} />,
  Phone:   <FiPhone size={11} />,
};

function ProfileCompletionRing({ percentage, isComplete }: { percentage: number; isComplete: boolean }) {
  const size = 56, stroke = 5, r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percentage / 100);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#profile-ring-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="profile-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="var(--accent-light)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete
          ? <FiCheckCircle size={20} className="text-[var(--accent)]" />
          : <span className="text-sm font-bold text-[var(--text-primary)]">{percentage}%</span>}
      </div>
    </div>
  );
}

function ProfileCompletionCard({
  completion,
}: {
  completion: { percentage: number; missing: string[] };
}) {
  const isComplete = completion.missing.length === 0;

  return (
    <Link
      href="/profile"
      className="group relative block overflow-hidden glass-card rounded-2xl p-5 sm:p-6 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all duration-300"
    >
      {/* Warm gradient wash — purely decorative, echoes the homepage hero */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{ background: "radial-gradient(ellipse 60% 100% at 100% 0%, var(--accent-dim), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-4">
        <ProfileCompletionRing percentage={completion.percentage} isComplete={isComplete} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Profile completion</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
            {isComplete
              ? "Your profile is fully set up — nice work."
              : "Complete your details to improve recommendations."}
          </p>
        </div>

        <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-[var(--accent)] flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          {isComplete ? "View profile" : "Complete it"} <FiArrowRight size={12} />
        </span>
      </div>

      {!isComplete && (
        <div className="relative flex flex-wrap gap-1.5 mt-4">
          {completion.missing.map((field) => (
            <span
              key={field}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-dim)] text-[var(--accent-light)] border border-[var(--border-subtle)]"
            >
              {FIELD_ICONS[field] ?? <FiUser size={11} />} {field}
            </span>
          ))}
        </div>
      )}

      {/* Mobile-only CTA — the hover reveal above is desktop-only */}
      <span className="sm:hidden relative flex items-center gap-1 text-xs font-semibold text-[var(--accent)] mt-4">
        {isComplete ? "View profile" : "Complete your profile"} <FiArrowRight size={12} />
      </span>
    </Link>
  );
}

function SettingsSection({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <section className="border border-[var(--border)] rounded-2xl p-5 sm:p-6 bg-[var(--bg-card)]">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string;
}) {  return (
    <label className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0 cursor-pointer">
      <div className="min-w-0">
        <p className="text-sm text-[var(--text-primary)] font-medium">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`} />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [prefs,    setPrefs]    = useState<Preferences | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword,    setDeletePassword]    = useState("");
  const [deleting,          setDeleting]           = useState(false);
  const [deleteError,       setDeleteError]        = useState("");

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/account/preferences");
      const data = await res.json();
      if (data.success) setPrefs(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/settings");
    if (status === "authenticated") void load();
  }, [status, load, router]);

  const savePrefs = async (updates: Partial<Preferences>) => {
    if (!prefs) return;
    const next = { ...prefs, ...updates };
    setPrefs(next);
    setSaving(true); setSaved(false);
    try {
      const res  = await fetch("/api/account/preferences", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword.length < 8) {
      setPwMessage({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }
    setPwSaving(true);
    try {
      const res  = await fetch("/api/auth/change-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setPwMessage({ type: "error", text: data.error ?? "Failed to change password" });
        return;
      }
      setPwMessage({ type: "success", text: "Password updated successfully" });
      setCurrentPassword(""); setNewPassword("");
    } catch {
      setPwMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setPwSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleteError(""); setDeleting(true);
    try {
      const res  = await fetch("/api/account", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password: deletePassword || undefined, confirm: true }),
      });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error ?? "Failed to delete account");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError("Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  if (status === "loading" || loading || !prefs) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl shimmer" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div>
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold mb-1.5">
          Account
        </p>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
      </div>

      {/* Profile completion */}
      {prefs.profileCompletion && (
        <ProfileCompletionCard completion={prefs.profileCompletion} />
      )}

      {/* Notifications */}
      <SettingsSection icon={<FiBell size={16} />} title="Notifications" description="Control which in-app notifications you receive">
        <div className="divide-y divide-[var(--border)]">
          <Toggle
            checked={prefs.notifyNewContent}
            onChange={(v) => void savePrefs({ notifyNewContent: v })}
            label="New lessons & courses"
            description="From scholars you follow and courses you're enrolled in"
          />
          <Toggle
            checked={prefs.notifyComments}
            onChange={(v) => void savePrefs({ notifyComments: v })}
            label="Comment replies"
            description="When someone replies to your comment"
          />
        </div>
        {saving && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-3">
            <FiLoader size={11} className="animate-spin" /> Saving…
          </p>
        )}
        {saved && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400 mt-3">
            <FiCheck size={11} /> Saved
          </p>
        )}
      </SettingsSection>

      {/* Language */}
      <SettingsSection icon={<FiGlobe size={16} />} title="Language" description="Preferred language for course recommendations and content">
        <select
          value={prefs.preferredLanguage}
          onChange={(e) => void savePrefs({ preferredLanguage: e.target.value })}
          className={inputClass}
        >
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </SettingsSection>

      {/* Security */}
      <SettingsSection icon={<FiLock size={16} />} title="Security" description="Change your password (Google sign-in accounts can skip this)">
        <form onSubmit={changePassword} className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className={inputClass}
            autoComplete="current-password"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min. 8 characters)"
            className={inputClass}
            autoComplete="new-password"
          />
          {pwMessage && (
            <p className={`text-xs ${pwMessage.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {pwMessage.text}
            </p>
          )}
          <button type="submit" disabled={pwSaving || !currentPassword || !newPassword} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
            {pwSaving ? <FiLoader className="animate-spin" size={13} /> : <FiSave size={13} />}
            Update Password
          </button>
        </form>
      </SettingsSection>

      {/* Danger zone */}
      <section className="border border-red-500/20 rounded-2xl p-5 sm:p-6 bg-red-500/5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
            <FiAlertTriangle size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Danger Zone</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
          >
            <FiTrash2 size={13} /> Delete My Account
          </button>
        ) : (
          <div className="space-y-3 p-4 rounded-xl border border-red-500/20 bg-[var(--bg-card)]">
            <p className="text-sm text-[var(--text-primary)] font-medium">Are you absolutely sure?</p>
            <p className="text-xs text-[var(--text-muted)]">
              This will permanently delete your enrollments, progress, comments, and certificates.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Confirm your password (leave blank if you signed in with Google)"
              className={inputClass}
            />
            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => void deleteAccount()}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleting ? <FiLoader className="animate-spin" size={13} /> : <FiTrash2 size={13} />}
                Yes, delete permanently
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteError(""); }}
                className="btn-secondary text-sm px-4 py-2"
              >
                <FiX size={13} /> Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
