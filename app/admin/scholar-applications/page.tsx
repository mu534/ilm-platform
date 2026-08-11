"use client";
import { useCallback, useEffect, useState } from "react";
import { Modal, ModalFooter } from "../../components/ui/Modal";

type ReviewAction = "UNDER_REVIEW" | "APPROVE" | "REJECT";
type Item = {
  id: string; status: string; submittedAt: string | null; createdAt: string;
  specializations: string[]; qualifications: string[]; institutions: string[]; teachingLanguages: string[];
  bio: string | null; city: string | null; education: string | null; teachingExperience: string | null; teachingYears: number | null;
  decisionReason: string | null;
  user: { name: string; email: string; country: string | null };
  categories: { category: { name: string } }[];
  documents: { id: string; originalName: string; kind: string }[];
  reviewHistory: { id: string; status: string; createdAt: string; decisionReason: string | null; internalNotes: string | null; reviewer: { name: string } }[];
};

const statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"];
const kindLabels: Record<string, string> = { CERTIFICATE: "Certificate", QUALIFICATION: "Qualification", SUPPORTING: "Supporting document" };
const humanize = (value: string) => value.replaceAll("_", " ");
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p><div className="text-sm mt-0.5">{children || "—"}</div></div>;
}

export default function ScholarApplicationsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/scholar-applications?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`);
      const data = await response.json();
      if (data.success) setItems(data.data.items); else setMessage(data.error ?? "Unable to load applications");
    } finally { setLoading(false); }
  }, [status, q]);

  useEffect(() => { const timer = setTimeout(() => void load(), 300); return () => clearTimeout(timer); }, [load]);

  const openReview = (item: Item) => { setSelected(item); setPendingAction(null); setReason(""); setNotes(""); setReviewError(""); };

  const review = async (action: ReviewAction) => {
    if (!selected) return;
    if (action === "REJECT" && !reason.trim()) { setReviewError("An applicant-visible reason is required to reject."); return; }
    setSubmitting(true); setReviewError("");
    try {
      const response = await fetch(`/api/admin/scholar-applications/${selected.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, decisionReason: reason, internalNotes: notes }),
      });
      const data = await response.json();
      if (!data.success) { setReviewError(data.error || "Unable to update application"); return; }
      setMessage(`Application ${humanize(data.data.status).toLowerCase()}.`);
      setSelected(null); setPendingAction(null);
      await load();
    } catch {
      setReviewError("Unable to update application");
    } finally { setSubmitting(false); }
  };

  return <div className="p-6 sm:p-10">
    <h1 className="font-display text-3xl font-bold">Scholar Applications</h1>
    <p className="text-sm text-[var(--text-muted)] mt-1">Review qualifications, private documents, and the complete decision history.</p>

    <div className="flex flex-wrap gap-3 mt-6">
      <input className="input-themed" placeholder="Search name or email" value={q} onChange={(event) => setQ(event.target.value)} />
      <select className="input-themed max-w-48" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
        <option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}
      </select>
      <button className="btn-primary" onClick={() => void load()}>Filter</button>
    </div>
    {message && <p className="mt-3 text-sm">{message}</p>}

    <div className="mt-6 space-y-3">
      {loading ? <p>Loading…</p> : items.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No applications match these filters.</p> : items.map((item) => (
        <article key={item.id} className="border border-[var(--border)] rounded-xl p-4">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="font-semibold">{item.user.name}</h2>
              <p className="text-sm text-[var(--text-muted)]">{item.user.email} · {item.user.country || "Country not provided"}</p>
              <p className="text-sm mt-2">{item.specializations.join(", ") || "No specializations listed"}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Submitted {formatDate(item.submittedAt)} · {item.documents.length} document(s)</p>
            </div>
            <strong className="text-sm">{humanize(item.status)}</strong>
          </div>
          <button className="btn-secondary text-sm mt-4" onClick={() => openReview(item)}>Open review</button>
        </article>
      ))}
    </div>

    {selected && <Modal size="xl" title={`Review ${selected.user.name}`} description={`${selected.user.email} · Status: ${humanize(selected.status)}`} onClose={() => setSelected(null)}>
      <div className="space-y-4 text-sm max-h-[65vh] overflow-y-auto pr-1">
        <div className="grid sm:grid-cols-2 gap-4">
          <Detail label="Country">{selected.user.country}</Detail>
          <Detail label="City">{selected.city}</Detail>
          <Detail label="Years teaching">{selected.teachingYears ?? "—"}</Detail>
          <Detail label="Submitted">{formatDate(selected.submittedAt)}</Detail>
        </div>
        <Detail label="Bio">{selected.bio}</Detail>
        <Detail label="Education">{selected.education}</Detail>
        <Detail label="Teaching experience">{selected.teachingExperience}</Detail>
        <Detail label="Qualifications">{selected.qualifications.join(", ")}</Detail>
        <Detail label="Institutions">{selected.institutions.join(", ")}</Detail>
        <Detail label="Specializations">{selected.specializations.join(", ")}</Detail>
        <Detail label="Languages">{selected.teachingLanguages.join(", ")}</Detail>
        <Detail label="Intended categories">{selected.categories.map((entry) => entry.category.name).join(", ")}</Detail>

        <Detail label="Private documents">
          {selected.documents.length === 0 ? "No documents uploaded" : <ul className="space-y-1 mt-1">{selected.documents.map((document) => (
            <li key={document.id}><a className="text-[var(--accent)]" href={`/api/scholar-documents/${document.id}`} target="_blank" rel="noreferrer">{kindLabels[document.kind] ?? document.kind}: {document.originalName}</a></li>
          ))}</ul>}
        </Detail>

        <Detail label="Review history">
          {selected.reviewHistory.length === 0 ? "No decisions recorded yet" : <ul className="space-y-2 mt-1">{selected.reviewHistory.map((entry) => (
            <li key={entry.id} className="border border-[var(--border)] rounded-lg p-2">
              <p className="text-xs text-[var(--text-muted)]">{formatDate(entry.createdAt)} · {entry.reviewer.name}</p>
              <p><strong>{humanize(entry.status)}</strong></p>
              {entry.decisionReason && <p className="text-xs mt-1">Applicant reason: {entry.decisionReason}</p>}
              {entry.internalNotes && <p className="text-xs mt-1 text-[var(--text-muted)]">Internal: {entry.internalNotes}</p>}
            </li>
          ))}</ul>}
        </Detail>

        <label className="block">Internal reviewer notes (never shown to the applicant)
          <textarea className="input-themed mt-1" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        {reviewError && <p role="alert" className="text-red-400">{reviewError}</p>}
      </div>

      <ModalFooter>
        <button className="btn-secondary" disabled={submitting} onClick={() => void review("UNDER_REVIEW")}>Mark under review</button>
        <button className="btn-primary" disabled={submitting} onClick={() => setPendingAction("APPROVE")}>Approve</button>
        <button className="btn-secondary text-red-400" disabled={submitting} onClick={() => { setReason(""); setPendingAction("REJECT"); }}>Reject</button>
      </ModalFooter>
    </Modal>}

    {selected && pendingAction === "APPROVE" && <Modal title="Approve application" description={`${selected.user.name} will be granted the instructor role and a verified scholar profile.`} onClose={() => setPendingAction(null)}>
      <label className="block text-sm">Internal reviewer notes (optional)
        <textarea className="input-themed mt-1" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {reviewError && <p role="alert" className="text-sm text-red-400 mt-2">{reviewError}</p>}
      <ModalFooter>
        <button className="btn-secondary" disabled={submitting} onClick={() => setPendingAction(null)}>Cancel</button>
        <button className="btn-primary" disabled={submitting} onClick={() => void review("APPROVE")}>{submitting ? "Approving…" : "Confirm approval"}</button>
      </ModalFooter>
    </Modal>}

    {selected && pendingAction === "REJECT" && <Modal title="Reject application" description={`${selected.user.name} will be notified with the reason you provide.`} onClose={() => setPendingAction(null)}>
      <label className="block text-sm">Applicant-visible reason (required)
        <textarea className="input-themed mt-1" required value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      <label className="block text-sm mt-3">Internal reviewer notes (optional)
        <textarea className="input-themed mt-1" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {reviewError && <p role="alert" className="text-sm text-red-400 mt-2">{reviewError}</p>}
      <ModalFooter>
        <button className="btn-secondary" disabled={submitting} onClick={() => setPendingAction(null)}>Cancel</button>
        <button className="btn-primary" disabled={submitting || !reason.trim()} onClick={() => void review("REJECT")}>{submitting ? "Rejecting…" : "Confirm rejection"}</button>
      </ModalFooter>
    </Modal>}
  </div>;
}
