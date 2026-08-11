"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FileUploader } from "../../../../components/FileUploader";
import { PublishingChecklist } from "../../../../components/courses/PublishingChecklist";
import {
  FiSave, FiX, FiPlus, FiTrash2, FiArrowLeft,
  FiSettings, FiSearch, FiGlobe, FiInfo, FiLock,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; icon?: string | null }

type Tab = "info" | "curriculum" | "seo" | "settings";

interface FormState {
  // Core info
  title:             string;
  subtitle:          string;
  description:       string;
  shortDescription:  string;
  thumbnailUrl:      string;
  bannerUrl:         string;
  // Curriculum metadata
  difficulty:        "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  language:          string;
  estimatedDuration: number;
  categoryId:        string;
  objectives:        string[];
  prerequisites:     string[];
  tags:              string;
  // Visibility
  published:         boolean;
  featured:          boolean;
  // SEO
  seoTitle:          string;
  seoDescription:    string;
  // Settings
  enrollmentType:    "FREE" | "PAID";
  price:             number; // cents
  currency:          string;
  sequentialLearning: boolean;
}

const EMPTY_FORM: FormState = {
  title: "", subtitle: "", description: "", shortDescription: "", thumbnailUrl: "", bannerUrl: "",
  difficulty: "BEGINNER", language: "en", estimatedDuration: 0, categoryId: "",
  objectives: [""], prerequisites: [""], tags: "",
  published: false, featured: false,
  seoTitle: "", seoDescription: "",
  enrollmentType: "FREE",
  price: 0,
  currency: "usd",
  sequentialLearning: false,
};

const LANGUAGES = [
  { code: "en",  label: "English"      },
  { code: "ar",  label: "Arabic"       },
  { code: "om",  label: "Afaan Oromo"  },
  { code: "fr",  label: "French"       },
  { code: "ur",  label: "Urdu"         },
  { code: "id",  label: "Indonesian"   },
  { code: "tr",  label: "Turkish"      },
  { code: "ms",  label: "Malay"        },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ic = (err?: string) =>
  `w-full px-4 py-2.5 bg-[var(--bg-card)] border rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors ${
    err ? "border-red-500/40" : "border-[var(--border)]"
  }`;

// ─── Reusable list editor ─────────────────────────────────────────────────────

function ListEditor({
  label, items, onChange, placeholder,
}: {
  label:       string;
  items:       string[];
  onChange:    (v: string[]) => void;
  placeholder: string;
}) {
  const update = (idx: number, val: string) => {
    const next = [...items]; next[idx] = val; onChange(next);
  };
  const add    = () => onChange([...items, ""]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div>
      <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">{label}</label>
      <div className="space-y-2">
        {items.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input value={v} onChange={(e) => update(i, e.target.value)} className={ic()} placeholder={`${placeholder} ${i + 1}`} />
            {items.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0" aria-label="Remove">
                <FiTrash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={add} className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
          <FiPlus size={13} /> Add {label.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EditCoursePage() {
  const router  = useRouter();
  const { id }  = useParams<{ id: string }>();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  const [categories,   setCategories]   = useState<Category[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [courseStatus, setCourseStatus] = useState("DRAFT");
  const [activeTab,    setActiveTab]    = useState<Tab>("info");
  const [form,         setForm]         = useState<FormState>(EMPTY_FORM);

  // Load course + categories in parallel
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [cr, catR] = await Promise.all([
          fetch(`/api/courses/${id}`),
          fetch("/api/categories"),
        ]);
        const cd   = await cr.json();
        const catd = await catR.json();

        if (catd.success) setCategories(catd.data);
        if (cd.success) {
          const c = cd.data;
          setCourseStatus(c.status ?? "DRAFT");
          setForm({
            title:             c.title           ?? "",
            subtitle:          c.subtitle         ?? "",
            description:       c.description      ?? "",
            shortDescription:  c.shortDescription ?? "",
            thumbnailUrl:      c.thumbnailUrl      ?? "",
            bannerUrl:         c.bannerUrl         ?? "",
            difficulty:        c.difficulty        ?? "BEGINNER",
            language:          c.language          ?? "en",
            estimatedDuration: c.estimatedDuration ?? 0,
            categoryId:        c.category?.id      ?? "",
            objectives:        c.objectives?.length ? c.objectives         : [""],
            prerequisites:     c.prerequisites?.length ? c.prerequisites   : [""],
            tags:              (c.tags ?? []).join(", "),
            published:         c.published  ?? false,
            featured:          c.featured   ?? false,
            seoTitle:          c.seoTitle          ?? "",
            seoDescription:    c.seoDescription    ?? "",
            enrollmentType:    c.enrollmentType     ?? "FREE",
            price:             c.price              ?? 0,
            currency:          c.currency           ?? "usd",
            sequentialLearning: c.sequentialLearning ?? false,
          });
        }
      } finally { setLoading(false); }
    };
    void load();
  }, [id]);

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      // Publication and moderation state are owned by the review workflow, so
      // they are never part of a metadata save.
      const { published: _published, ...editable } = form;
      const payload = {
        ...editable,
        objectives:    form.objectives.filter(Boolean),
        prerequisites: form.prerequisites.filter(Boolean),
        tags:          form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        categoryId:    form.categoryId || undefined,
        subtitle:      form.subtitle || undefined,
        shortDescription: form.shortDescription || undefined,
        seoTitle:      form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
      };
      const res  = await fetch(`/api/courses/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.details) {
          const fe: Record<string, string> = {};
          Object.entries(data.details).forEach(([k, v]) => { fe[k] = (v as string[])[0]; });
          setErrors(fe);
          // Jump to the tab with the first error
          const errorKeys = Object.keys(fe);
          if (errorKeys.some((k) => ["seoTitle", "seoDescription"].includes(k))) setActiveTab("seo");
          else if (errorKeys.some((k) => ["language", "enrollmentType"].includes(k))) setActiveTab("settings");
        } else {
          setErrors({ general: data.error ?? "Failed to update course" });
        }
      } else {
        router.push("/admin/courses");
      }
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl space-y-4">
        <div className="h-8 w-48 shimmer rounded-xl" />
        {[1,2,3,4,5].map((i) => <div key={i} className="h-12 shimmer rounded-xl" />)}
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "info",       label: "Course Info",   icon: <FiInfo size={14} />     },
    { id: "seo",        label: "SEO",           icon: <FiSearch size={14} />   },
    { id: "settings",   label: "Settings",      icon: <FiSettings size={14} /> },
  ];

  return (
    <div className="p-6 sm:p-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-2">
            <FiArrowLeft size={12} /> All Courses
          </Link>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Edit Course</h1>
          <p className="text-[var(--text-muted)] text-sm mt-0.5">
            Status: <span className={`font-medium ${
              courseStatus === "PUBLISHED"      ? "text-emerald-400" :
              courseStatus === "PENDING_REVIEW" ? "text-blue-400"    :
              courseStatus === "REJECTED"       ? "text-red-400"     :
              "text-[var(--text-muted)]"
            }`}>{courseStatus.replace("_", " ")}</span>
          </p>
        </div>
        <Link href={`/admin/courses/${id}/builder`} className="btn-secondary text-sm">
          Manage Curriculum →
        </Link>
      </div>

      {errors.general && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{errors.general}</div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)] pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Tab: Course Info ── */}
        {activeTab === "info" && (
          <>
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Title *</label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} className={ic(errors.title)} required placeholder="e.g. Introduction to Tafsir Al-Quran" />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
                Subtitle <span className="text-[var(--text-muted)] font-normal">(optional tagline)</span>
              </label>
              <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} className={ic()} placeholder="e.g. Master the fundamentals of Quranic interpretation" maxLength={300} />
              <p className="text-xs text-[var(--text-muted)] mt-1">{form.subtitle.length}/300</p>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
                Short Description <span className="text-[var(--text-muted)] font-normal">(shown on course cards)</span>
              </label>
              <textarea
                value={form.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
                className={ic(errors.shortDescription)}
                rows={2}
                maxLength={300}
                placeholder="A brief 1–3 line summary students see on course cards…"
              />
              <div className="flex justify-between mt-1">
                {errors.shortDescription && <p className="text-xs text-red-400">{errors.shortDescription}</p>}
                <p className={`text-xs ml-auto ${form.shortDescription.length > 260 ? "text-yellow-400" : "text-[var(--text-muted)]"}`}>
                  {form.shortDescription.length}/300
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Full Description *</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} className={ic(errors.description)} rows={5} required placeholder="Detailed information shown on the course detail page…" />
              {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
              <p className="text-xs text-[var(--text-muted)] mt-1">{form.description.length}/5000</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Category</label>
                <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={ic()}>
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Level</label>
                <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as FormState["difficulty"])} className={ic()}>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Duration (min)</label>
                <input type="number" min="0" value={form.estimatedDuration} onChange={(e) => set("estimatedDuration", Number(e.target.value))} className={ic()} placeholder="0" />
              </div>
            </div>

            <FileUploader accept="image/*" folder="ilm-platform/courses/thumbnails" label="Thumbnail Image" onUpload={(url) => set("thumbnailUrl", url)} currentUrl={form.thumbnailUrl} aspectRatio="16/9" />
            <FileUploader accept="image/*" folder="ilm-platform/courses/banners"    label="Banner Image (wide hero)"    onUpload={(url) => set("bannerUrl",    url)} currentUrl={form.bannerUrl}    aspectRatio="3/1" />

            <ListEditor label="Learning Objectives" items={form.objectives}   onChange={(v) => set("objectives",   v)} placeholder="Students will be able to…" />
            <ListEditor label="Prerequisites"       items={form.prerequisites} onChange={(v) => set("prerequisites", v)} placeholder="Basic knowledge of…" />

            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
                Tags <span className="text-[var(--text-muted)] font-normal">(comma-separated)</span>
              </label>
              <input value={form.tags} onChange={(e) => set("tags", e.target.value)} className={ic()} placeholder="Quran, Tafsir, Beginner, Arabic…" />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
                <span className="text-sm text-[var(--text-secondary)]">Feature on homepage</span>
              </label>
            </div>
          </>
        )}

        {/* ── Tab: SEO ── */}
        {activeTab === "seo" && (
          <div className="space-y-5">
            <div className="p-4 glass-card rounded-xl text-sm text-[var(--text-secondary)] border border-[var(--border)]">
              <p className="font-medium text-[var(--text-primary)] mb-1">SEO Tips</p>
              <ul className="space-y-1 text-xs text-[var(--text-muted)] list-disc list-inside">
                <li>SEO title: 50–60 characters ideal</li>
                <li>SEO description: 150–160 characters ideal</li>
                <li>Leave blank to use the course title and description</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
                SEO Title <span className="text-[var(--text-muted)] font-normal">(max 70 chars)</span>
              </label>
              <input
                value={form.seoTitle}
                onChange={(e) => set("seoTitle", e.target.value)}
                className={ic(errors.seoTitle)}
                placeholder={form.title || "SEO-optimised title…"}
                maxLength={70}
              />
              <div className="flex justify-between mt-1">
                {errors.seoTitle && <p className="text-xs text-red-400">{errors.seoTitle}</p>}
                <p className="text-xs text-[var(--text-muted)] ml-auto">{form.seoTitle.length}/70</p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
                SEO Description <span className="text-[var(--text-muted)] font-normal">(max 160 chars)</span>
              </label>
              <textarea
                value={form.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
                className={ic(errors.seoDescription)}
                rows={3}
                placeholder={form.description.slice(0, 160) || "Brief description for search engines…"}
                maxLength={160}
              />
              <div className="flex justify-between mt-1">
                {errors.seoDescription && <p className="text-xs text-red-400">{errors.seoDescription}</p>}
                <p className={`text-xs ml-auto ${form.seoDescription.length > 155 ? "text-yellow-400" : "text-[var(--text-muted)]"}`}>
                  {form.seoDescription.length}/160
                </p>
              </div>
            </div>

            {/* Live preview */}
            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <p className="text-xs text-[var(--text-muted)] font-medium mb-2 uppercase tracking-wide">Search Preview</p>
              <div className="space-y-0.5">
                <p className="text-sm text-blue-400 font-medium truncate">
                  {form.seoTitle || form.title || "Course Title"}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                  {typeof window !== "undefined" ? window.location.origin : "https://ilm-platform.com"}/courses/…
                </p>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                  {form.seoDescription || form.description.slice(0, 160) || "Course description…"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Settings ── */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Language */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
                <FiGlobe size={12} className="inline mr-1" />
                Course Language
              </label>
              <select value={form.language} onChange={(e) => set("language", e.target.value)} className={ic()}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1">The primary language this course is taught in.</p>
            </div>

            {/* Enrollment type */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Enrollment Type</label>
              <div className="glass-card rounded-xl p-4 border border-[var(--border)] space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.enrollmentType === "FREE"}
                    onChange={() => set("enrollmentType", "FREE")}
                    name="enrollmentType"
                    value="FREE"
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Free</p>
                    <p className="text-xs text-[var(--text-muted)]">Any registered student can enroll at no cost.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.enrollmentType === "PAID"}
                    onChange={() => set("enrollmentType", "PAID")}
                    name="enrollmentType"
                    value="PAID"
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Paid</p>
                    <p className="text-xs text-[var(--text-muted)]">Students pay once via Stripe checkout before they can enroll.</p>
                  </div>
                </label>

                {form.enrollmentType === "PAID" && (
                  <div className="grid grid-cols-2 gap-3 pl-6 pt-1">
                    <div>
                      <label className="block text-[11px] text-[var(--text-muted)] mb-1">Price</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.price / 100}
                        onChange={(e) => set("price", Math.round(Number(e.target.value) * 100))}
                        className={ic()}
                        placeholder="29.99"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-muted)] mb-1">Currency</label>
                      <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={ic()}>
                        <option value="usd">USD ($)</option>
                        <option value="eur">EUR (€)</option>
                        <option value="gbp">GBP (£)</option>
                        <option value="cad">CAD ($)</option>
                        <option value="aud">AUD ($)</option>
                      </select>
                    </div>
                    <p className="col-span-2 text-[11px] text-[var(--text-muted)]">
                      Requires Stripe to be configured (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) — see .env.example.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sequential learning */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
                <FiLock size={12} className="inline mr-1" />
                Learning Path
              </label>
              <div className="glass-card rounded-xl p-4 border border-[var(--border)]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sequentialLearning}
                    onChange={(e) => set("sequentialLearning", e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[var(--accent)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Require sequential learning</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Students must complete each lesson before the next one unlocks. Turn this off
                      to let students jump to any lesson freely.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Publishing checklist */}
            {id && (
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium mb-2 uppercase tracking-wide">Publishing</p>
                <PublishingChecklist courseId={id} currentStatus={courseStatus} isAdmin={isAdmin} />
              </div>
            )}

            {/* Danger zone */}
            <div className="glass-card rounded-xl p-5 border border-red-500/20">
              <p className="text-sm font-semibold text-red-400 mb-3">Danger Zone</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-primary)]">Archive this course</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Hides the course from students. Enrolled students keep their progress.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Archive this course? It will be hidden from students.")) return;
                    await fetch(`/api/courses/${id}`, {
                      method:  "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body:    JSON.stringify({ status: "ARCHIVED", published: false }),
                    });
                    router.push("/admin/courses");
                  }}
                  className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors flex-shrink-0 ml-4"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons — always visible */}
        <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
          <button type="submit" disabled={saving} className="btn-primary">
            <FiSave size={14} /> {saving ? "Saving…" : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            <FiX size={14} /> Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
