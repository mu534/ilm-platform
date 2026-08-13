"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiPlus, FiX, FiUpload, FiLoader, FiTrash2, FiFileText } from "react-icons/fi";

type Category = { id: string; name: string };
type Document = { id: string; originalName: string; kind: string; size?: number };

const documentKinds = [
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "QUALIFICATION", label: "Qualification" },
  { value: "SUPPORTING", label: "Supporting document" },
] as const;
const allowedDocumentTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxDocumentBytes = 15 * 1024 * 1024;
const formatBytes = (bytes?: number) => (typeof bytes === "number" ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : "");
const empty = { bio: "", city: "", education: "", institutions: [] as string[], qualifications: [] as string[], specializations: [] as string[], teachingExperience: "", teachingYears: null as number | null, categoryIds: [] as string[], teachingLanguages: ["English"] as string[] };
function TagEditor({ label, values, onChange, disabled }: { label: string; values: string[]; onChange: (values: string[]) => void; disabled: boolean }) { const [value, setValue] = useState(""); const add = () => { const entry = value.trim(); if (entry && !values.includes(entry)) onChange([...values, entry]); setValue(""); }; return <fieldset className="space-y-2"><legend className="text-sm">{label}</legend><div className="flex flex-wrap gap-2">{values.map((entry) => <span key={entry} className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-dim)] px-3 py-1 text-sm">{entry}<button type="button" disabled={disabled} onClick={() => onChange(values.filter((item) => item !== entry))} aria-label={`Remove ${entry}`}><FiX /></button></span>)}</div>{!disabled && <div className="flex gap-2"><input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} className="input-themed" placeholder={`Add ${label.toLowerCase()}`} /><button type="button" className="btn-secondary" onClick={add}><FiPlus /> Add</button></div>}</fieldset>; }
export default function ScholarApplicationPage() {
  const { status } = useSession(); const router = useRouter(); const [form, setForm] = useState(empty); const [state, setState] = useState("DRAFT"); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const [categories, setCategories] = useState<Category[]>([]); const [documents, setDocuments] = useState<Document[]>([]); const [documentKind, setDocumentKind] = useState<string>("CERTIFICATE"); const [pendingFile, setPendingFile] = useState<File | null>(null); const [uploading, setUploading] = useState(false); const [removingId, setRemovingId] = useState<string | null>(null); const [documentError, setDocumentError] = useState(""); const [decisionReason, setDecisionReason] = useState<string | null>(null);
  useEffect(() => { if (status === "unauthenticated") router.replace("/login?callbackUrl=/scholar-application"); void Promise.all([fetch("/api/scholar-applications").then((response) => response.json()), fetch("/api/categories").then((response) => response.json())]).then(([applicationResponse, categoriesResponse]) => { setCategories(categoriesResponse.data ?? []); const application = applicationResponse.data; if (application) { setForm({ ...empty, ...application, categoryIds: application.categories?.map((item: { categoryId: string }) => item.categoryId) ?? [] }); setState(application.status); setDocuments(application.documents ?? []); setDecisionReason(application.decisionReason ?? null); } }).catch(() => undefined); }, [status, router]);
  const submit = async (submitNow: boolean) => { setSaving(true); setMessage(""); try { const response = await fetch("/api/scholar-applications", { method: submitNow ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!data.success) throw new Error(data.error || "Unable to save application"); setState(data.data.status); setMessage(submitNow ? "Application submitted for admin review." : "Draft saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save application"); } finally { setSaving(false); } };
  const upload = async (file: File, kind: string) => {
    setDocumentError(""); setUploading(true);
    try {
      const application = await fetch("/api/scholar-applications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).then((response) => response.json());
      if (!application.success) { setDocumentError(application.error ?? "Save your application details before uploading."); return false; }
      const formData = new FormData(); formData.append("file", file); formData.append("kind", kind);
      const result = await fetch(`/api/scholar-applications/${application.data.id}/documents`, { method: "POST", body: formData }).then((response) => response.json());
      if (!result.success) { setDocumentError(result.error ?? "Upload failed"); return false; }
      setDocuments((current) => [...current, result.data]);
      return true;
    } catch {
      setDocumentError("Upload failed"); return false;
    } finally { setUploading(false); }
  };
  const removeDocument = async (documentId: string) => {
    setDocumentError(""); setRemovingId(documentId);
    try {
      const result = await fetch(`/api/scholar-documents/${documentId}`, { method: "DELETE" }).then((response) => response.json());
      if (result.success) setDocuments((current) => current.filter((entry) => entry.id !== documentId));
      else setDocumentError(result.error ?? "Unable to remove document");
    } catch {
      setDocumentError("Unable to remove document");
    } finally { setRemovingId(null); }
  };
  const startUpload = async () => {
    if (!pendingFile) { setDocumentError("Choose a file to upload"); return; }
    if (!allowedDocumentTypes.includes(pendingFile.type)) { setDocumentError("Documents must be a PDF, JPG, PNG, or WebP file"); return; }
    if (pendingFile.size === 0 || pendingFile.size > maxDocumentBytes) { setDocumentError("Documents must be larger than 0 bytes and no larger than 15 MB"); return; }
    if (await upload(pendingFile, documentKind)) setPendingFile(null);
  };
  if (status === "loading") return null; const locked = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(state);
  return <main className="max-w-2xl mx-auto px-4 py-12"><p className="text-xs text-[var(--accent)] uppercase tracking-widest">Instructor pathway</p><h1 className="font-display text-3xl font-bold mt-2">Become a Scholar / Instructor</h1><p className="text-[var(--text-muted)] mt-2">Submit qualifications for a private admin review.</p>{message && <p className="mt-4 p-3 rounded-xl bg-[var(--accent-dim)] text-sm">{message}</p>}{state === "REJECTED" && decisionReason && <div className="mt-4 p-3 rounded-xl border border-red-400/40 text-sm"><strong>Your application needs changes.</strong><p className="mt-1 text-[var(--text-muted)]">{decisionReason}</p></div>}<div className="glass-card rounded-2xl p-6 mt-6 space-y-5"><label className="block text-sm">Bio<textarea disabled={locked} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="input-themed mt-1 min-h-28" minLength={30} /></label><label className="block text-sm">City<input disabled={locked} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="input-themed mt-1" /></label><label className="block text-sm">Religious / academic background<textarea disabled={locked} value={form.education} onChange={(event) => setForm({ ...form, education: event.target.value })} className="input-themed mt-1 min-h-24" /></label><TagEditor label="Institutions" values={form.institutions} onChange={(institutions) => setForm({ ...form, institutions })} disabled={locked} /><TagEditor label="Qualifications" values={form.qualifications} onChange={(qualifications) => setForm({ ...form, qualifications })} disabled={locked} /><TagEditor label="Specializations" values={form.specializations} onChange={(specializations) => setForm({ ...form, specializations })} disabled={locked} /><label className="block text-sm">Teaching experience<textarea disabled={locked} value={form.teachingExperience} onChange={(event) => setForm({ ...form, teachingExperience: event.target.value })} className="input-themed mt-1" /></label><label className="block text-sm">Years teaching<input disabled={locked} type="number" min="0" value={form.teachingYears ?? ""} onChange={(event) => setForm({ ...form, teachingYears: event.target.value ? Number(event.target.value) : null })} className="input-themed mt-1" /></label><fieldset><legend className="text-sm mb-2">Subjects you plan to teach</legend><div className="flex flex-wrap gap-2">{categories.map((category) => <button disabled={locked} type="button" key={category.id} onClick={() => setForm({ ...form, categoryIds: form.categoryIds.includes(category.id) ? form.categoryIds.filter((id) => id !== category.id) : [...form.categoryIds, category.id] })} className={`px-3 py-2 rounded-lg text-sm border ${form.categoryIds.includes(category.id) ? "bg-[var(--accent)] text-white" : "border-[var(--border)]"}`}>{category.name}</button>)}</div></fieldset><TagEditor label="Teaching languages" values={form.teachingLanguages} onChange={(teachingLanguages) => setForm({ ...form, teachingLanguages })} disabled={locked} /><section className="space-y-3">
      <h2 className="text-sm font-medium">Supporting documents</h2>
      <p className="text-xs text-[var(--text-muted)]">PDF, JPG, PNG or WebP, up to 15 MB each. Documents are private and visible only to you and authorized admins.</p>
      {documents.length > 0 && <ul className="space-y-2">{documents.map((document) => <li key={document.id} className="flex items-center justify-between gap-3 border border-[var(--border)] rounded-xl px-3 py-2">
        <a className="flex items-center gap-2 text-sm text-[var(--accent)] min-w-0" href={`/api/scholar-documents/${document.id}`} target="_blank" rel="noreferrer"><FiFileText className="shrink-0" /><span className="truncate">{document.originalName}</span></a>
        <span className="flex items-center gap-3 text-xs text-[var(--text-muted)] shrink-0">{documentKinds.find((entry) => entry.value === document.kind)?.label ?? document.kind}{document.size ? ` · ${formatBytes(document.size)}` : ""}
          {!locked && <button type="button" aria-label={`Remove ${document.originalName}`} disabled={removingId === document.id} onClick={() => void removeDocument(document.id)} className="text-red-400 disabled:opacity-50">{removingId === document.id ? <FiLoader className="animate-spin" /> : <FiTrash2 />}</button>}
        </span>
      </li>)}</ul>}
      {!locked && <div className="space-y-3 border border-[var(--border)] rounded-xl p-4">
        <fieldset className="space-y-2"><legend className="text-sm">Document type</legend>{documentKinds.map((entry) => <label key={entry.value} className="flex items-center gap-2 text-sm"><input type="radio" name="documentKind" value={entry.value} checked={documentKind === entry.value} onChange={() => setDocumentKind(entry.value)} />{entry.label}</label>)}</fieldset>
        <input type="file" accept={allowedDocumentTypes.join(",")} onChange={(event) => { setDocumentError(""); setPendingFile(event.target.files?.[0] ?? null); }} className="block w-full text-sm" />
        {pendingFile && <p className="text-xs text-[var(--text-muted)]">{pendingFile.name} · {formatBytes(pendingFile.size)}</p>}
        {documentError && <p role="alert" className="text-xs text-red-400">{documentError}</p>}
        <button type="button" className="btn-secondary" disabled={uploading || !pendingFile} onClick={() => void startUpload()}>{uploading ? <><FiLoader className="animate-spin" /> Uploading…</> : <><FiUpload /> Upload</>}</button>
      </div>}
    </section>{!locked && <div className="flex gap-3 pt-2"><button className="btn-secondary" disabled={saving} onClick={() => void submit(false)}>Save draft</button><button className="btn-primary" disabled={saving} onClick={() => void submit(true)}>{saving ? "Saving…" : "Submit application"}</button></div>}{locked && <p className="text-sm text-[var(--text-muted)]">Status: <strong>{state.replaceAll("_", " ")}</strong></p>}</div></main>;
}
