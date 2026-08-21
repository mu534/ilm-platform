"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FiPlus, FiX, FiUpload, FiLoader, FiTrash2, FiFileText,
  FiCheckCircle, FiAlertCircle, FiUser, FiBook, FiGlobe,
  FiStar, FiPaperclip, FiSend, FiSave,
} from "react-icons/fi";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string };
type Document = { id: string; originalName: string; kind: string; size?: number };

const DOCUMENT_KINDS = [
  { value: "CERTIFICATE",  label: "Certificate"        },
  { value: "QUALIFICATION", label: "Qualification"      },
  { value: "SUPPORTING",   label: "Supporting document" },
] as const;

const ALLOWED_TYPES  = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_DOC_BYTES  = 15 * 1024 * 1024;

const EMPTY = {
  bio: "", city: "", phone: "", education: "",
  institutions:      [] as string[],
  qualifications:    [] as string[],
  specializations:   [] as string[],
  teachingExperience: "",
  teachingYears:     null as number | null,
  categoryIds:       [] as string[],
  teachingLanguages: ["English"] as string[],
};

function fmtBytes(b?: number) {
  if (!b) return "";
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Tag editor ────────────────────────────────────────────────────────────────

function TagEditor({
  label, placeholder, values, onChange, disabled,
}: {
  label: string; placeholder: string;
  values: string[]; onChange: (v: string[]) => void; disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const add = () => {
    const entry = value.trim();
    if (entry && !values.includes(entry)) onChange([...values, entry]);
    setValue("");
  };
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-medium border border-[var(--border-strong)]">
            {v}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(values.filter((i) => i !== v))}
                className="hover:text-red-400 transition-colors"
                aria-label={`Remove ${v}`}
              >
                <FiX size={11} />
              </button>
            )}
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-[var(--text-muted)] italic">None added yet</span>}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            className="input-themed flex-1 text-sm"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={add}
            disabled={!value.trim()}
            className="btn-secondary text-sm px-3 py-2 disabled:opacity-40"
          >
            <FiPlus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: {
  icon: React.ReactNode; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-[var(--border)]">
      <div className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-bold text-[var(--text-primary)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Status banner ──────────────────────────────────────────────────────────────

function StatusBanner({ state, decisionReason }: { state: string; decisionReason: string | null }) {
  if (state === "DRAFT") return null;

  const cfg: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; msg: string }> = {
    SUBMITTED:    { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20",    icon: <FiLoader className="animate-spin" />,  msg: "Your application has been submitted and is awaiting review." },
    UNDER_REVIEW: { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   icon: <FiBook />,                              msg: "An admin is reviewing your application." },
    APPROVED:     { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: <FiCheckCircle />,                       msg: "Your application has been approved! You now have instructor access." },
    REJECTED:     { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20",     icon: <FiAlertCircle />,                       msg: decisionReason ?? "Your application was not approved." },
  };

  const c = cfg[state];
  if (!c) return null;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${c.bg} ${c.border} mb-6`}>
      <span className={`${c.text} flex-shrink-0 mt-0.5`}>{c.icon}</span>
      <div>
        <p className={`text-sm font-semibold ${c.text}`}>{state.replace("_", " ")}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{c.msg}</p>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function ScholarApplicationPage() {
  const { status } = useSession();
  const router      = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form,          setForm]          = useState(EMPTY);
  const [appState,      setAppState]      = useState("DRAFT");
  const [saving,        setSaving]        = useState(false);
  const [message,       setMessage]       = useState("");
  const [messageType,   setMessageType]   = useState<"success" | "error">("success");
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [documents,     setDocuments]     = useState<Document[]>([]);
  const [documentKind,  setDocumentKind]  = useState<string>("CERTIFICATE");
  const [pendingFile,   setPendingFile]   = useState<File | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const [removingId,    setRemovingId]    = useState<string | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [decisionReason, setDecisionReason] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/scholar-application");
      return;
    }
    void Promise.all([
      fetch("/api/scholar-applications").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([appRes, catRes]) => {
      setCategories(catRes.data ?? []);
      const app = appRes.data;
      if (app) {
        setForm({ ...EMPTY, ...app, categoryIds: app.categories?.map((c: { categoryId: string }) => c.categoryId) ?? [] });
        setAppState(app.status);
        setDocuments(app.documents ?? []);
        setDecisionReason(app.decisionReason ?? null);
      }
    }).catch(() => undefined);
  }, [status, router]);

  const locked = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(appState);

  const submit = async (submitNow: boolean) => {
    setSaving(true); setMessage("");

    // Client-side validation for the submit (POST) action
    if (submitNow) {
      const errs: string[] = [];
      if (!form.bio.trim() || form.bio.trim().length < 30)
        errs.push("Bio must be at least 30 characters");
      if (form.specializations.length === 0)
        errs.push("Add at least one specialisation (e.g. Fiqh, Tafsir)");
      if (form.categoryIds.length === 0)
        errs.push("Select at least one subject you plan to teach");
      if (form.teachingLanguages.length === 0)
        errs.push("Add at least one teaching language");
      if (errs.length > 0) {
        setMessage(errs.join(" · "));
        setMessageType("error");
        setSaving(false);
        return;
      }
    }

    try {
      const res  = await fetch("/api/scholar-applications", {
        method:  submitNow ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json() as {
        success?: boolean;
        error?: string;
        details?: Record<string, string[]>;
      };

      if (!data.success) {
        // Surface Zod field-level errors when present
        if (data.details) {
          const fieldMsgs = Object.entries(data.details)
            .flatMap(([field, msgs]) => msgs.map((m) => `${field.replace(/([A-Z])/g, " $1").trim()}: ${m}`));
          setMessage(fieldMsgs.join(" · ") || (data.error ?? "Unable to save"));
        } else {
          setMessage(data.error ?? "Unable to save");
        }
        setMessageType("error");
        return;
      }
   
      setAppState((data as { data?: { status?: string } }).data?.status ?? appState);
      setMessage(submitNow ? "Application submitted for review!" : "Draft saved.");
      setMessageType("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save");
      setMessageType("error");
    } finally { setSaving(false); }
  };

  const upload = async (file: File, kind: string) => {
    setDocumentError(""); setUploading(true);
    try {
      // Ensure we have a saved application to attach documents to
      const saveRes  = await fetch("/api/scholar-applications", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      }).then((r) => r.json());
      if (!saveRes.success) { setDocumentError(saveRes.error ?? "Save your application details first."); return false; }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const uploadRes = await fetch(`/api/scholar-applications/${saveRes.data.id}/documents`, {
        method: "POST", body: fd,
      }).then((r) => r.json());

      if (!uploadRes.success) { setDocumentError(uploadRes.error ?? "Upload failed"); return false; }
      setDocuments((prev) => [...prev, uploadRes.data]);
      return true;
    } catch {
      setDocumentError("Upload failed — please try again"); return false;
    } finally { setUploading(false); }
  };

  const removeDocument = async (docId: string) => {
    setDocumentError(""); setRemovingId(docId);
    try {
      const res = await fetch(`/api/scholar-documents/${docId}`, { method: "DELETE" }).then((r) => r.json());
      if (res.success) setDocuments((prev) => prev.filter((d) => d.id !== docId));
      else setDocumentError(res.error ?? "Unable to remove");
    } catch { setDocumentError("Unable to remove document"); }
    finally { setRemovingId(null); }
  };

  const startUpload = async () => {
    if (!pendingFile) { setDocumentError("Please select a file first"); return; }
    if (!ALLOWED_TYPES.includes(pendingFile.type)) {
      setDocumentError("Files must be PDF, JPG, PNG, or WebP"); return;
    }
    if (pendingFile.size === 0 || pendingFile.size > MAX_DOC_BYTES) {
      setDocumentError("File must be between 1 byte and 15 MB"); return;
    }
    if (await upload(pendingFile, documentKind)) setPendingFile(null);
  };

  const ic = "input-themed mt-1.5";

  if (status === "loading") return (
    <div className="flex items-center justify-center min-h-screen">
      <FiLoader className="animate-spin text-[var(--accent)]" size={32} />
    </div>
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">

      {/* Page header */}
      <div>
        <p className="text-xs text-[var(--accent)] uppercase tracking-widest font-semibold">Instructor pathway</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mt-1">
          Scholar / Instructor Application
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-2 leading-relaxed max-w-xl">
          Submit your qualifications for a private admin review. Your information is
          only visible to authorised staff. Once approved, you will receive instructor access.
        </p>
      </div>

      {/* Status banner */}
      <StatusBanner state={appState} decisionReason={decisionReason} />

      {/* Global save message */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${
          messageType === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {messageType === "success" ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
          {message}
        </div>
      )}

      {/* ── Section 1: Personal background ─────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <SectionHeader icon={<FiUser size={16} />} title="Personal Background" subtitle="Tell us about yourself and your background" />

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
            Bio <span className="text-red-400">*</span>
            <span className="font-normal text-[var(--text-muted)] ml-1">(min 30 characters)</span>
          </label>
          <textarea
            disabled={locked}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className={`${ic} min-h-[120px] resize-y`}
            placeholder="Describe your Islamic education background, scholarly lineage, and teaching philosophy…"
            minLength={30}
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1 text-right">{form.bio.length} chars</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">City</label>
            <input disabled={locked} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={ic} placeholder="e.g. Medina, Cairo, London" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
              Phone Number
              <span className="ml-1 font-normal normal-case text-[var(--text-muted)]">(for admin contact)</span>
            </label>
            <input
              disabled={locked}
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={ic}
              placeholder="+1 555 000 0000"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Years Teaching</label>
            <input
              disabled={locked}
              type="number"
              min="0"
              value={form.teachingYears ?? ""}
              onChange={(e) => setForm({ ...form, teachingYears: e.target.value ? Number(e.target.value) : null })}
              className={ic}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
            Religious / Academic Background
          </label>
          <textarea
            disabled={locked}
            value={form.education}
            onChange={(e) => setForm({ ...form, education: e.target.value })}
            className={`${ic} min-h-[90px] resize-y`}
            placeholder="Describe your formal Islamic education, institutions attended, degrees, etc."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Teaching Experience</label>
          <textarea
            disabled={locked}
            value={form.teachingExperience}
            onChange={(e) => setForm({ ...form, teachingExperience: e.target.value })}
            className={`${ic} min-h-[80px] resize-y`}
            placeholder="Describe your teaching experience — classes, students, platforms, formats, etc."
          />
        </div>
      </div>

      {/* ── Section 2: Credentials ──────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <SectionHeader icon={<FiStar size={16} />} title="Credentials & Expertise" subtitle="Your qualifications and areas of specialisation" />

        <TagEditor label="Institutions" placeholder="Add institution (press Enter)" values={form.institutions} onChange={(v) => setForm({ ...form, institutions: v })} disabled={locked} />
        <TagEditor label="Qualifications" placeholder="e.g. Ijazah in Quran, BA Islamic Studies" values={form.qualifications} onChange={(v) => setForm({ ...form, qualifications: v })} disabled={locked} />
        <TagEditor label="Specialisations" placeholder="e.g. Fiqh, Hadith, Tafsir" values={form.specializations} onChange={(v) => setForm({ ...form, specializations: v })} disabled={locked} />
        <TagEditor label="Teaching Languages" placeholder="Add language" values={form.teachingLanguages} onChange={(v) => setForm({ ...form, teachingLanguages: v })} disabled={locked} />
      </div>

      {/* ── Section 3: Subjects ─────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <SectionHeader icon={<FiBook size={16} />} title="Subjects You Plan to Teach" subtitle="Select all that apply" />
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              disabled={locked}
              onClick={() => setForm({ ...form, categoryIds: form.categoryIds.includes(cat.id) ? form.categoryIds.filter((id) => id !== cat.id) : [...form.categoryIds, cat.id] })}
              className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
                form.categoryIds.includes(cat.id)
                  ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 4: Supporting documents ─────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <SectionHeader
          icon={<FiPaperclip size={16} />}
          title="Supporting Documents"
          subtitle="PDF, JPG, PNG or WebP — max 15 MB each. Visible only to you and authorised admins."
        />

        {/* Existing documents */}
        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 border border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--bg-secondary)]">
                <FiFileText size={16} className="text-[var(--accent)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <a
                    href={`/api/scholar-documents/${doc.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate block"
                  >
                    {doc.originalName}
                  </a>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {DOCUMENT_KINDS.find((k) => k.value === doc.kind)?.label ?? doc.kind}
                    {doc.size ? ` · ${fmtBytes(doc.size)}` : ""}
                  </p>
                </div>
                {!locked && (
                  <button
                    type="button"
                    disabled={removingId === doc.id}
                    onClick={() => void removeDocument(doc.id)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    aria-label={`Remove ${doc.originalName}`}
                  >
                    {removingId === doc.id ? <FiLoader className="animate-spin" size={14} /> : <FiTrash2 size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload form — only when not locked */}
        {!locked && (
          <div className="border border-[var(--border-strong)] rounded-xl p-5 space-y-4 bg-[var(--bg-secondary)]">
            {/* Document type selector */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Document Type</p>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_KINDS.map((k) => (
                  <label key={k.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="documentKind"
                      value={k.value}
                      checked={documentKind === k.value}
                      onChange={() => setDocumentKind(k.value)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">{k.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* File picker — styled, not the raw browser input */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Select File</p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-6 text-center cursor-pointer transition-colors group"
              >
                {pendingFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FiFileText size={20} className="text-[var(--accent)]" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{pendingFile.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{fmtBytes(pendingFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPendingFile(null); setDocumentError(""); }}
                      className="p-1 text-[var(--text-muted)] hover:text-red-400 rounded"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <FiUpload className="mx-auto text-2xl text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      Click to browse or drag &amp; drop
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">PDF, JPG, PNG, WebP — max 15 MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                className="hidden"
                onChange={(e) => { setDocumentError(""); setPendingFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
              />
            </div>

            {/* Error */}
            {documentError && (
              <div className="flex items-center gap-2 text-xs text-red-400 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <FiAlertCircle size={12} />
                {documentError}
              </div>
            )}

            {/* Upload button — clearly explains when disabled */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={uploading || !pendingFile}
                onClick={() => void startUpload()}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!pendingFile ? "Select a file above to enable upload" : "Upload selected file"}
              >
                {uploading ? (
                  <><FiLoader className="animate-spin" size={14} /> Uploading…</>
                ) : (
                  <><FiUpload size={14} /> Upload Document</>
                )}
              </button>
              {!pendingFile && (
                <p className="text-xs text-[var(--text-muted)]">← Select a file first</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 5: Submit / Save ─────────────────────────────────────────── */}
      {!locked && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <SectionHeader icon={<FiSend size={16} />} title="Submit Application" subtitle="Save a draft at any time. Submit when you are ready for admin review." />

          <div className="p-4 bg-[var(--accent-dim)] rounded-xl border border-[var(--border-strong)] text-xs text-[var(--text-secondary)] space-y-1">
            <p>✓ Your information is private and only visible to authorised admins.</p>
            <p>✓ You will be notified of the decision via email and in-app notification.</p>
            <p>✓ Once submitted, you cannot edit until the application is reviewed.</p>
          </div>

          {/* Required fields checklist */}
          <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] text-xs space-y-1.5">
            <p className="font-semibold text-[var(--text-primary)] mb-2">Required before submitting:</p>
            {[
              { label: "Bio (min 30 characters)",         met: form.bio.trim().length >= 30 },
              { label: "At least 1 specialisation",       met: form.specializations.length > 0 },
              { label: "At least 1 subject category",     met: form.categoryIds.length > 0 },
              { label: "At least 1 teaching language",    met: form.teachingLanguages.length > 0 },
            ].map(({ label, met }) => (
              <div key={label} className={`flex items-center gap-2 ${met ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                <span>{met ? "✓" : "○"}</span>
                <span className={met ? "line-through opacity-60" : ""}>{label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit(false)}
              className="btn-secondary flex items-center gap-2"
            >
              {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit(true)}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSend size={14} />}
              {saving ? "Submitting…" : "Submit for Review"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
