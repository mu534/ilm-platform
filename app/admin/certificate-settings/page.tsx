"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FiArrowLeft, FiPlus, FiTrash2, FiSave,
  FiCheckCircle, FiLoader, FiAlertTriangle, FiEye, FiEyeOff,
} from "react-icons/fi";
import { FiAward } from "react-icons/fi";
import { FileUploader } from "../../components/FileUploader";

interface Signature {
  id:        string;
  name:      string;
  title:     string | null;
  imageUrl:  string;
  isActive:  boolean;
  createdAt: string;
}

export default function CertificateSettingsPage() {
  const [sigs,    setSigs]    = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState("");
  const [err,     setErr]     = useState("");

  // New signature form
  const [newName,  setNewName]  = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newUrl,   setNewUrl]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    const res  = await fetch("/api/admin/certificate-settings/signatures");
    const json = await res.json() as { success?: boolean; data?: Signature[] };
    if (json.success && json.data) setSigs(json.data);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const addSignature = async () => {
    if (!newName.trim() || !newUrl.trim()) { setErr("Name and signature image are required."); return; }
    setSaving(true); setErr(""); setMsg("");
    const res  = await fetch("/api/admin/certificate-settings/signatures", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: newName.trim(), title: newTitle.trim() || undefined, imageUrl: newUrl }),
    });
    const json = await res.json() as { success?: boolean; error?: string };
    if (json.success) {
      setMsg("Signature added."); setNewName(""); setNewTitle(""); setNewUrl("");
      void load();
    } else { setErr(json.error ?? "Failed"); }
    setSaving(false);
  };

  const deleteSignature = async (id: string) => {
    if (!confirm("Delete this signature?")) return;
    setDeleting(id); setErr(""); setMsg("");
    const res  = await fetch(`/api/admin/certificate-settings/signatures/${id}`, { method: "DELETE" });
    const json = await res.json() as { success?: boolean; error?: string };
    if (json.success) { setMsg("Signature deleted."); void load(); }
    else setErr(json.error ?? "Failed");
    setDeleting(null);
  };

  const toggleSignature = async (id: string, current: boolean) => {
    setToggling(id); setErr(""); setMsg("");
    const res  = await fetch(`/api/admin/certificate-settings/signatures/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !current }),
    });
    const json = await res.json() as { success?: boolean; error?: string };
    if (json.success) { void load(); }
    else setErr(json.error ?? "Failed");
    setToggling(null);
  };

  const activeCount = sigs.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link href="/admin/certificates" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-2">
          <FiArrowLeft size={12} /> Certificates
        </Link>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiAward className="text-[var(--accent)]" /> Certificate Settings
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Manage authorised signatures that appear on issued certificates.
          Up to 2 active signatures are snapshotted at issuance time.
        </p>
      </div>

      {msg && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2"><FiCheckCircle size={14} />{msg}</div>}
      {err && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><FiAlertTriangle size={14} />{err}</div>}

      {/* Active signatures summary */}
      <div className={`p-4 rounded-xl border text-sm ${activeCount > 0 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-amber-500/5 border-amber-500/20 text-amber-400"}`}>
        <FiCheckCircle size={14} className="inline mr-1.5" />
        {activeCount === 0
          ? "No active signatures — certificates will use the default platform signature."
          : `${activeCount} active signature${activeCount !== 1 ? "s" : ""} will appear on new certificates (up to 2 used).`}
      </div>

      {/* Existing signatures */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Signatures ({sigs.length})
        </h2>

        {loading ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <FiLoader className="animate-spin text-[var(--accent)] text-xl mx-auto" />
          </div>
        ) : sigs.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-[var(--text-muted)] text-sm">
            No signatures added yet. Add one below.
          </div>
        ) : (
          <div className="space-y-3">
            {sigs.map((sig) => (
              <div key={sig.id} className={`glass-card rounded-2xl p-4 border transition-all ${sig.isActive ? "border-emerald-500/20 bg-emerald-500/5" : "border-[var(--border)]"}`}>
                <div className="flex items-center gap-4">
                  {/* Signature image preview */}
                  <div className="w-24 h-14 rounded-xl border border-[var(--border)] bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sig.imageUrl} alt={sig.name} className="max-w-full max-h-full object-contain p-1" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{sig.name}</p>
                    {sig.title && <p className="text-xs text-[var(--text-muted)]">{sig.title}</p>}
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      sig.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"
                    }`}>
                      {sig.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => void toggleSignature(sig.id, sig.isActive)}
                      disabled={toggling === sig.id}
                      className={`p-2 rounded-lg transition-colors ${
                        sig.isActive
                          ? "text-amber-400 hover:bg-amber-500/10"
                          : "text-emerald-400 hover:bg-emerald-500/10"
                      }`}
                      title={sig.isActive ? "Deactivate" : "Activate"}
                    >
                      {toggling === sig.id
                        ? <FiLoader className="animate-spin" size={14} />
                        : sig.isActive ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                    <button
                      onClick={() => void deleteSignature(sig.id)}
                      disabled={deleting === sig.id}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete signature"
                    >
                      {deleting === sig.id
                        ? <FiLoader className="animate-spin" size={14} />
                        : <FiTrash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add signature form */}
      <div className="glass-card rounded-2xl p-5 border border-[var(--border-strong)] space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <FiPlus size={13} className="text-[var(--accent)]" /> Add New Signature
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Full Name *</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Dr. Ahmed Ibrahim"
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">Title / Position</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Director of Islamic Studies"
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
            Signature Image * <span className="font-normal">(PNG with transparent background recommended)</span>
          </label>
          <FileUploader
            accept="image/*"
            folder="ilm-platform/signatures"
            label="Upload Signature Image"
            onUpload={(url) => setNewUrl(url)}
            currentUrl={newUrl}
            aspectRatio="3/1"
          />
        </div>

        {/* Preview */}
        {newUrl && (
          <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
            <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">Certificate Preview</p>
            <div className="bg-[#fffdf8] border border-[var(--border)] rounded-xl p-5 flex items-end gap-8 justify-center">
              <div className="text-center">
                <div className="h-12 flex items-center justify-center mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newUrl} alt="Signature" className="max-h-12 max-w-32 object-contain" />
                </div>
                <div className="w-32 h-px bg-gray-400 mb-1" />
                <p className="text-xs font-semibold text-gray-800">{newName || "Full Name"}</p>
                {newTitle && <p className="text-[10px] text-gray-500">{newTitle}</p>}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={addSignature}
          disabled={saving || !newName.trim() || !newUrl.trim()}
          className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
          {saving ? "Saving…" : "Add Signature"}
        </button>
      </div>
    </div>
  );
}
