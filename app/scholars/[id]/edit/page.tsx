"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { FileUploader } from "../../../components/FileUploader";
import Link from "next/link";
import {
  FiSave, FiArrowLeft, FiPlus, FiTrash2,
  FiCheckCircle, FiAlertCircle, FiLoader,
} from "react-icons/fi";
import type { SessionUser } from "../../../types/auth.types";

interface FormState {
  bio:                     string;
  professionalDesignation: string;
  topics:                  string[];
  qualifications:          string[];
  photo:                   string;
}

export default function ScholarProfileEditPage() {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const { id }  = useParams<{ id: string }>();
  const user    = session?.user as SessionUser | undefined;

  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error,   setError]     = useState("");
  const [scholarId, setScholarId] = useState("");
  const [form, setForm] = useState<FormState>({
    bio: "", professionalDesignation: "", topics: [""], qualifications: [""], photo: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (!user) return;

    // Fetch scholar by URL id param
    fetch(`/api/scholars/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { router.push("/scholars"); return; }
        const s = d.data;

        // Only the scholar owner or admin can edit
        if (s.userId !== user.id && user.role !== "ADMIN") {
          router.push(`/scholars/${id}`);
          return;
        }

        setScholarId(s.id);
        setForm({
          bio:                     s.bio                     ?? "",
          professionalDesignation: s.professionalDesignation ?? "",
          topics:                  s.topics?.length ? s.topics         : [""],
          qualifications:          s.qualifications?.length ? s.qualifications : [""],
          photo:                   s.photo                   ?? "",
        });
      })
      .catch(() => router.push("/scholars"))
      .finally(() => setLoading(false));
  }, [id, user?.id, status, router, user]);

  const updateList = (field: "topics" | "qualifications", idx: number, val: string) => {
    const arr  = [...form[field]]; arr[idx] = val;
    setForm({ ...form, [field]: arr });
  };
  const addItem    = (field: "topics" | "qualifications") =>
    setForm({ ...form, [field]: [...form[field], ""] });
  const removeItem = (field: "topics" | "qualifications", idx: number) =>
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== idx) });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false); setSaving(true);

    const payload = {
      bio:                     form.bio,
      professionalDesignation: form.professionalDesignation || undefined,
      topics:                  form.topics.filter(Boolean),
      qualifications:          form.qualifications.filter(Boolean),
      photo:                   form.photo || undefined,
    };

    try {
      const res  = await fetch(`/api/scholars/${scholarId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push(`/scholars/${id}`), 1500);
      } else {
        setError(data.error ?? "Failed to save changes");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "input-themed";

  if (loading || status === "loading") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl shimmer" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Back */}
      <Link
        href={`/scholars/${id}`}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-8"
      >
        <FiArrowLeft size={14} /> Back to Profile
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
          Edit Scholar Profile
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Keep your profile accurate and up to date
        </p>
      </div>

      {/* Status messages */}
      {success && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
          <FiCheckCircle size={16} className="flex-shrink-0" />
          Profile updated! Redirecting…
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
          <FiAlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">

        {/* Photo */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Profile Photo</h2>
          <FileUploader
            accept="image/*"
            folder="ilm-platform/scholars"
            label="Upload photo"
            onUpload={(url) => setForm({ ...form, photo: url })}
            currentUrl={form.photo}
          />
        </section>

        {/* Professional Designation */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Professional Designation</h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Optional title (e.g. Islamic Scholar, Qur&apos;an Teacher, Arabic Instructor, Islamic History Educator, Researcher)
          </p>
          <input
            type="text"
            value={form.professionalDesignation}
            onChange={(e) => setForm({ ...form, professionalDesignation: e.target.value })}
            className={inputClass}
            placeholder="e.g. Islamic Scholar, Arabic Language Instructor, Researcher…"
          />
        </section>

        {/* Bio */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Biography</h2>
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
              Bio <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className={inputClass}
              rows={5}
              placeholder="Describe your background, education, and areas of expertise (min 20 characters)…"
              required
              minLength={20}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {form.bio.length}/3000 characters
            </p>
          </div>
        </section>

        {/* Topics */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Areas of Knowledge <span className="text-red-400">*</span>
          </h2>
          <div className="space-y-2">
            {form.topics.map((topic, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={topic}
                  onChange={(e) => updateList("topics", i, e.target.value)}
                  className={inputClass}
                  placeholder={`e.g. Quran, Hadith, Fiqh…`}
                />
                {form.topics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem("topics", i)}
                    className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex-shrink-0"
                    aria-label="Remove"
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addItem("topics")}
              className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors mt-1"
            >
              <FiPlus size={13} /> Add topic
            </button>
          </div>
        </section>

        {/* Qualifications */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Qualifications</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Degrees, certificates, institutions attended, etc.
          </p>
          <div className="space-y-2">
            {form.qualifications.map((q, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => updateList("qualifications", i, e.target.value)}
                  className={inputClass}
                  placeholder={`e.g. B.A. Islamic Studies, Al-Azhar University`}
                />
                {form.qualifications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem("qualifications", i)}
                    className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex-shrink-0"
                    aria-label="Remove"
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addItem("qualifications")}
              className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors mt-1"
            >
              <FiPlus size={13} /> Add qualification
            </button>
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || success}
            className="btn-primary"
          >
            {saving
              ? <><FiLoader className="animate-spin" size={15} /> Saving…</>
              : <><FiSave size={15} /> Save Profile</>
            }
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
