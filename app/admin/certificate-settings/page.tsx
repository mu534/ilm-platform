"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FiArrowLeft, FiSave, FiCheckCircle, FiLoader,
  FiAlertTriangle, FiEye, FiEyeOff, FiAward, FiUser, FiShield,
} from "react-icons/fi";
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
  const [sig,      setSig]      = useState<Signature | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState("");
  const [err,      setErr]      = useState("");

  // Form state — used for both creating and editing
  const [name,    setName]    = useState("");
  const [title,   setTitle]   = useState("");
  const [imgUrl,  setImgUrl]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/certificate-settings/signatures");
    const json = await res.json() as { success?: boolean; data?: Signature[] };
    const sigs = json.data ?? [];
    // Take the most recently created (or the only one)
    const current = sigs[0] ?? null;
    setSig(current);
    if (current) {
      setName(current.name);
      setTitle(current.title ?? "");
      setImgUrl(current.imageUrl);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!name.trim()) { setErr("CEO full name is required."); return; }
    if (!imgUrl.trim()) { setErr("Signature image is required."); return; }
    setSaving(true); setErr(""); setMsg("");

    try {
      if (sig) {
        // Update existing
        const res  = await fetch(`/api/admin/certificate-settings/signatures/${sig.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: name.trim(), title: title.trim() || undefined, imageUrl: imgUrl }),
        });
        const json = await res.json() as { success?: boolean; error?: string };
        if (json.success) { setMsg("CEO signature updated."); void load(); }
        else setErr(json.error ?? "Failed to update.");
      } else {
        // Create new — first check none exists
        const res  = await fetch("/api/admin/certificate-settings/signatures", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: name.trim(), title: title.trim() || undefined, imageUrl: imgUrl }),
        });
        const json = await res.json() as { success?: boolean; error?: string };
        if (json.success) {
          setMsg("CEO signature saved. Activate it below to use it on certificates.");
          void load();
        } else setErr(json.error ?? "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggle = async () => {
    if (!sig) return;
    setToggling(true); setErr(""); setMsg("");
    const res  = await fetch(`/api/admin/certificate-settings/signatures/${sig.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !sig.isActive }),
    });
    const json = await res.json() as { success?: boolean; error?: string };
    if (json.success) { void load(); }
    else setErr(json.error ?? "Failed.");
    setToggling(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <Link
          href="/admin/certificates"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-3"
        >
          <FiArrowLeft size={12} /> Back to Certificates
        </Link>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiAward className="text-[var(--accent)]" /> Certificate Settings
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Configure the official CEO signature used on all issued certificates.
        </p>
      </div>

      {/* Admin-only notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-strong)]">
        <FiShield size={15} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Only the <strong className="text-[var(--text-primary)]">Platform Administrator</strong> can configure the
          CEO signature. This signature will be immutably snapshotted onto every certificate at the time of issuance.
          Changing the signature will not affect previously issued certificates.
        </p>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <FiCheckCircle size={14} /> {msg}
        </div>
      )}
      {err && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <FiAlertTriangle size={14} /> {err}
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <FiLoader className="animate-spin text-[var(--accent)] text-2xl mx-auto" />
        </div>
      ) : (
        <>
          {/* Active status banner */}
          <div className={`flex items-center justify-between p-4 rounded-xl border text-sm ${
            sig?.isActive
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-amber-500/5 border-amber-500/20"
          }`}>
            <div className="flex items-center gap-2">
              {sig?.isActive
                ? <><FiCheckCircle size={14} className="text-emerald-400" /><span className="text-emerald-400 font-medium">CEO signature is active — certificates will include this signature.</span></>
                : <><FiAlertTriangle size={14} className="text-amber-400" /><span className="text-amber-400 font-medium">{sig ? "CEO signature is inactive — certificates cannot be issued." : "No CEO signature configured — certificates cannot be issued."}</span></>
              }
            </div>
            {sig && (
              <button
                onClick={() => void toggle()}
                disabled={toggling}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  sig.isActive
                    ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                {toggling
                  ? <FiLoader className="animate-spin" size={12} />
                  : sig.isActive ? <><FiEyeOff size={12} /> Deactivate</> : <><FiEye size={12} /> Activate</>}
              </button>
            )}
          </div>

          {/* CEO Signature form */}
          <div className="glass-card rounded-2xl p-6 border border-[var(--border-strong)] space-y-5">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FiUser size={14} className="text-[var(--accent)]" />
              Official CEO Signature
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wider">
                  CEO Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Ahmad Al-Farsi"
                  className="w-full px-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wider">
                  Position
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="CEO, Ilm Platform"
                  className="w-full px-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1.5 uppercase tracking-wider">
                Signature Image <span className="text-red-400">*</span>{" "}
                <span className="font-normal normal-case text-[var(--text-muted)]">
                  — transparent PNG recommended
                </span>
              </label>
              <FileUploader
                accept="image/png,image/jpeg,image/webp"
                folder="ilm-platform/signatures"
                label="Upload CEO Signature"
                onUpload={(url) => { setImgUrl(url); setErr(""); }}
                currentUrl={imgUrl}
                aspectRatio="4/1"
              />
            </div>

            {/* Preview */}
            {imgUrl && (
              <div className="p-5 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] font-semibold mb-3 uppercase tracking-wider">
                  Certificate Preview
                </p>
                <div className="bg-[#fffdf8] border border-[var(--border)] rounded-xl p-6 flex justify-center">
                  <div className="text-center">
                    <div className="h-14 flex items-center justify-center mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt="CEO Signature Preview" className="max-h-14 max-w-40 object-contain" />
                    </div>
                    <div className="w-36 h-px bg-gray-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-gray-800">{name || "CEO Full Name"}</p>
                    <p className="text-[10px] text-gray-500">{title || "CEO, Ilm Platform"}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => void save()}
              disabled={saving || !name.trim() || !imgUrl.trim()}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <><FiLoader className="animate-spin" size={14} /> Saving…</> : <><FiSave size={14} /> {sig ? "Update CEO Signature" : "Save CEO Signature"}</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
