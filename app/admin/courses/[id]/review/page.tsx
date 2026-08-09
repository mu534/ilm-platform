"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiLoader,
  FiBookOpen, FiUser, FiTag, FiClock, FiAlertTriangle,
  FiEye, FiBarChart2,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lecture { id: string; title: string; published: boolean; type: string }
interface Module  { id: string; title: string; lectures: Lecture[]; _count: { quizzes: number } }

interface CourseDetail {
  id:             string;
  title:          string;
  subtitle:       string | null;
  slug:           string;
  description:    string;
  thumbnailUrl:   string | null;
  difficulty:     string;
  language:       string;
  estimatedDuration: number;
  objectives:     string[];
  prerequisites:  string[];
  tags:           string[];
  status:         string;
  approvalStatus: string;
  approvalNote:   string | null;
  enrollmentType: string;
  price:          number;
  category:       { name: string; icon: string | null } | null;
  author:         { id: string; name: string; image: string | null };
  modules:        Module[];
  _count:         { enrollments: number; ratings: number };
}

interface CheckResult { valid: boolean; errors: string[] }

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PUBLISHED:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    DRAFT:          "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]",
    PENDING_REVIEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    PENDING:        "bg-blue-500/10 text-blue-400 border-blue-500/20",
    REJECTED:       "bg-red-500/10 text-red-400 border-red-500/20",
    ARCHIVED:       "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${styles[status] ?? styles.DRAFT}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CourseReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [course,  setCourse]  = useState<CourseDetail | null>(null);
  const [check,   setCheck]   = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [note,    setNote]    = useState("");
  const [showReject, setShowReject] = useState(false);
  const [msg,  setMsg]  = useState("");
  const [err,  setErr]  = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [cr, ck] = await Promise.all([
          fetch(`/api/courses/${id}`),
          fetch(`/api/courses/${id}/checklist`),
        ]);
        const cd = await cr.json() as { success?: boolean; data?: CourseDetail };
        const ch = await ck.json() as { success?: boolean; data?: CheckResult };
        if (cd.success && cd.data) setCourse(cd.data);
        if (ch.success && ch.data) setCheck(ch.data);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const approve = async () => {
    setActing(true); setErr(""); setMsg("");
    try {
      const res  = await fetch(`/api/courses/${id}/review`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "approve", note: note.trim() || undefined }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        setMsg("✅ Course approved and published!");
        router.refresh();
      } else {
        setErr(data.error ?? "Approval failed");
      }
    } finally { setActing(false); }
  };

  const reject = async () => {
    if (!note.trim()) { setErr("A rejection note is required so the scholar knows what to fix."); return; }
    setActing(true); setErr(""); setMsg("");
    try {
      const res  = await fetch(`/api/courses/${id}/review`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "reject", note: note.trim() }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        setMsg("Course rejected. The scholar has been notified.");
        router.refresh();
      } else {
        setErr(data.error ?? "Rejection failed");
      }
    } finally { setActing(false); }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl space-y-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 shimmer rounded-2xl" />)}
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        <p>Course not found or you don&apos;t have permission to review it.</p>
        <Link href="/admin/courses" className="text-[var(--accent)] text-sm mt-2 inline-block">← Back to courses</Link>
      </div>
    );
  }

  const isPending   = course.status === "PENDING_REVIEW" || course.approvalStatus === "PENDING";
  const isPublished = course.status === "PUBLISHED";
  const totalLectures = course.modules.reduce((s, m) => s + m.lectures.length, 0);
  const publishedLectures = course.modules.reduce((s, m) => s + m.lectures.filter((l) => l.published).length, 0);
  const totalQuizzes = course.modules.reduce((s, m) => s + m._count.quizzes, 0);

  return (
    <div className="p-6 sm:p-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-2"
          >
            <FiArrowLeft size={12} /> All Courses
          </Link>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Course Review
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={course.status} />
            {isPending && (
              <span className="text-xs text-blue-400 font-medium animate-pulse">
                Awaiting your review
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${course.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs btn-secondary px-3 py-2"
          >
            <FiEye size={12} /> Preview
          </Link>
          <Link
            href={`/admin/courses/${id}/builder`}
            className="flex items-center gap-1.5 text-xs btn-secondary px-3 py-2"
          >
            <FiBookOpen size={12} /> Curriculum
          </Link>
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <FiCheckCircle size={14} /> {msg}
        </div>
      )}
      {err && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <FiAlertTriangle size={14} /> {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — course info */}
        <div className="lg:col-span-2 space-y-5">

          {/* Thumbnail + core info */}
          <div className="glass-card rounded-2xl p-5 flex gap-4">
            {course.thumbnailUrl ? (
              <div className="relative w-32 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
                <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-32 h-20 rounded-xl flex-shrink-0 bg-[var(--bg-secondary)] flex items-center justify-center">
                <FiBookOpen className="text-[var(--text-muted)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg font-bold text-[var(--text-primary)] leading-tight">
                {course.title}
              </h2>
              {course.subtitle && (
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{course.subtitle}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><FiUser size={11} /> {course.author.name}</span>
                {course.category && (
                  <span className="flex items-center gap-1">
                    <FiTag size={11} /> {course.category.icon} {course.category.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FiClock size={11} /> {course.estimatedDuration > 0 ? `${course.estimatedDuration} min` : "No duration set"}
                </span>
                <span className="capitalize">{course.difficulty.toLowerCase()}</span>
                <span>{course.language.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Description</h3>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Objectives */}
          {course.objectives.filter(Boolean).length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Learning Objectives</h3>
              <ul className="space-y-1.5">
                {course.objectives.filter(Boolean).map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <FiCheckCircle size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Curriculum overview */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Curriculum</h3>
              <span className="text-xs text-[var(--text-muted)]">
                {course.modules.length} modules · {totalLectures} lectures ({publishedLectures} published) · {totalQuizzes} quizzes
              </span>
            </div>
            {course.modules.length === 0 ? (
              <p className="text-sm text-red-400">⚠ No modules added yet</p>
            ) : (
              <div className="space-y-2">
                {course.modules.map((mod, i) => (
                  <div key={mod.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[var(--bg-secondary)] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Module {i + 1}: {mod.title}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {mod.lectures.length} lesson{mod.lectures.length !== 1 ? "s" : ""}
                        {mod._count.quizzes > 0 && ` · ${mod._count.quizzes} quiz`}
                      </span>
                    </div>
                    {mod.lectures.length > 0 && (
                      <div className="divide-y divide-[var(--border)]">
                        {mod.lectures.map((lec) => (
                          <div key={lec.id} className="px-4 py-2 flex items-center justify-between">
                            <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{lec.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ml-2 flex-shrink-0 ${
                              lec.published
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"
                            }`}>
                              {lec.published ? "Live" : "Draft"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          {course.tags.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {course.tags.map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Previous rejection note */}
          {course.approvalNote && course.status !== "PUBLISHED" && (
            <div className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5">
              <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <FiAlertTriangle size={13} /> Previous Review Note
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">{course.approvalNote}</p>
            </div>
          )}
        </div>

        {/* Right — review panel */}
        <div className="space-y-5">

          {/* Stats */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <FiBarChart2 size={13} /> Course Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Enrollments</span>
                <span className="font-medium text-[var(--text-primary)]">{course._count.enrollments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Ratings</span>
                <span className="font-medium text-[var(--text-primary)]">{course._count.ratings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Price</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {course.enrollmentType === "PAID" && course.price > 0
                    ? `$${(course.price / 100).toFixed(2)}`
                    : "Free"
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Publishing checklist */}
          {check && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <FiCheckCircle size={13} className={check.valid ? "text-emerald-400" : "text-red-400"} />
                Publishing Checklist
              </h3>
              <div className="space-y-2">
                {[
                  "Title must be at least 5 characters",
                  "Description must be at least 50 characters",
                  "A thumbnail image is required",
                  "A category must be selected",
                  "At least 2 learning objectives are required",
                  "At least one module is required",
                  "At least one published lecture is required",
                ].map((req) => {
                  const failed = check.errors.includes(req);
                  return (
                    <div key={req} className={`flex items-start gap-2 text-xs ${failed ? "text-red-400" : "text-emerald-400"}`}>
                      {failed
                        ? <FiXCircle size={12} className="flex-shrink-0 mt-0.5" />
                        : <FiCheckCircle size={12} className="flex-shrink-0 mt-0.5" />
                      }
                      <span className={failed ? "" : "line-through opacity-60"}>{req}</span>
                    </div>
                  );
                })}
              </div>
              {!check.valid && (
                <p className="text-xs text-red-400 mt-3">
                  {check.errors.length} issue{check.errors.length !== 1 ? "s" : ""} must be fixed before approval.
                </p>
              )}
            </div>
          )}

          {/* Review actions */}
          {!isPublished && (
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Review Decision</h3>

              {/* Note field */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-medium mb-1.5">
                  Note to scholar <span className="font-normal">(required for rejection)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                  placeholder="Optional feedback for the scholar…"
                />
              </div>

              {/* Approve */}
              <button
                onClick={approve}
                disabled={acting || !check?.valid}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {acting && !showReject
                  ? <FiLoader className="animate-spin" size={14} />
                  : <FiCheckCircle size={14} />
                }
                {acting && !showReject ? "Approving…" : "Approve & Publish"}
              </button>

              {check && !check.valid && (
                <p className="text-xs text-amber-400 text-center -mt-2">
                  Fix {check.errors.length} checklist issue{check.errors.length !== 1 ? "s" : ""} before approving
                </p>
              )}

              {/* Reject */}
              {!showReject ? (
                <button
                  onClick={() => setShowReject(true)}
                  disabled={acting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <FiXCircle size={14} /> Reject Course
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-400">Add a note above explaining what needs to change, then confirm.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={reject}
                      disabled={acting}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {acting && showReject
                        ? <FiLoader className="animate-spin" size={13} />
                        : <FiXCircle size={13} />
                      }
                      {acting && showReject ? "Rejecting…" : "Confirm Reject"}
                    </button>
                    <button
                      onClick={() => { setShowReject(false); setErr(""); }}
                      className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isPublished && (
            <div className="glass-card rounded-2xl p-5 text-center">
              <FiCheckCircle className="text-emerald-400 text-2xl mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Course is Live</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">This course is published and visible to students.</p>
              <Link
                href={`/courses/${course.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
              >
                <FiEye size={11} /> View live course →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
