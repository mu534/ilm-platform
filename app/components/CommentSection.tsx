"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Avatar from "@radix-ui/react-avatar";
import Link from "next/link";
import type { SessionUser } from "../types/auth.types";
import { formatDate } from "../utils/api";
import { FiSend, FiTrash2, FiMessageCircle, FiCornerDownRight } from "react-icons/fi";
import { ReportButton } from "./ReportButton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommentAuthor {
  id:    string;
  name:  string;
  image: string | null;
}

interface Comment {
  id:        string;
  body:      string;
  lectureId: string;
  approved:  boolean;
  parentId:  string | null;
  createdAt: string;
  author:    CommentAuthor;
  replies?:  Comment[];
}

interface ApiResponse<T> { success: boolean; data: T; error?: string }

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchComments(lectureId: string): Promise<Comment[]> {
  const res  = await fetch(`/api/comments?lectureId=${lectureId}`);
  const data = (await res.json()) as ApiResponse<Comment[]>;
  if (!data.success) throw new Error(data.error ?? "Failed to fetch comments");
  return data.data;
}

function buildTree(flat: Comment[]): Comment[] {
  const map   = new Map<string, Comment>();
  const roots: Comment[] = [];

  flat.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  map.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

// ── Comment input ─────────────────────────────────────────────────────────────

function CommentInput({
  lectureId,
  parentId,
  placeholder,
  onSuccess,
  onCancel,
  autoFocus,
}: {
  lectureId:   string;
  parentId?:   string;
  placeholder: string;
  onSuccess:   () => void;
  onCancel?:   () => void;
  autoFocus?:  boolean;
}) {
  const { data: session } = useSession();
  const user              = session?.user as SessionUser | undefined;
  const queryClient       = useQueryClient();
  const [body,  setBody]  = useState("");
  const [error, setError] = useState("");

  const post = useMutation({
    mutationFn: async (text: string) => {
      const res  = await fetch("/api/comments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ body: text, lectureId, parentId }),
      });
      const d = (await res.json()) as ApiResponse<Comment>;
      if (!d.success) throw new Error(d.error ?? "Failed to post");
      return d.data;
    },
    onSuccess: () => {
      setBody(""); setError("");
      void queryClient.invalidateQueries({ queryKey: ["comments", lectureId] });
      onSuccess();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to post"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 2) { setError("Comment must be at least 2 characters"); return; }
    post.mutate(body.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Avatar.Root className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
        <Avatar.Image src={user?.image ?? ""} alt={user?.name ?? "User"} className="w-full h-full object-cover" />
        <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-white text-xs font-bold">
          {user?.name?.[0]?.toUpperCase()}
        </Avatar.Fallback>
      </Avatar.Root>

      <div className="flex-1 space-y-2">
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); setError(""); }}
          placeholder={placeholder}
          rows={parentId ? 2 : 3}
          autoFocus={autoFocus}
          className="input-themed resize-none text-sm"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={post.isPending || !body.trim()}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            <FiSend size={12} />
            {post.isPending ? "Posting…" : parentId ? "Reply" : "Comment"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

// ── Single comment ────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  lectureId,
  user,
  onDelete,
  depth,
}: {
  comment:  Comment;
  lectureId: string;
  user:      SessionUser | undefined;
  onDelete:  (id: string) => void;
  depth:     number;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div className={depth > 0 ? "ml-8 border-l border-[var(--border)] pl-4 mt-3" : ""}>
      <div className="flex gap-3 group">
        <Avatar.Root className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
          <Avatar.Image src={comment.author.image ?? ""} alt={comment.author.name} className="w-full h-full object-cover" />
          <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] text-xs font-bold">
            {comment.author.name[0]?.toUpperCase()}
          </Avatar.Fallback>
        </Avatar.Root>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{comment.author.name}</span>
            <span className="text-xs text-[var(--text-muted)]">{formatDate(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{comment.body}</p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1.5">
            {depth < 2 && (
              <button
                onClick={() => setReplying(!replying)}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              >
                <FiCornerDownRight size={11} />
                Reply
              </button>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ReportButton commentId={comment.id} />
              {(user?.id === comment.author.id || user?.role === "ADMIN") && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors rounded"
                  title="Delete"
                >
                  <FiTrash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Reply form */}
          {replying && (
            <div className="mt-3">
              <CommentInput
                lectureId={lectureId}
                parentId={comment.id}
                placeholder={`Reply to ${comment.author.name}…`}
                onSuccess={() => setReplying(false)}
                onCancel={() => setReplying(false)}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              lectureId={lectureId}
              user={user}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommentSection({ lectureId }: { lectureId: string }) {
  const { data: session } = useSession();
  const queryClient       = useQueryClient();
  const user              = session?.user as SessionUser | undefined;

  const { data: flatComments = [], isLoading } = useQuery({
    queryKey: ["comments", lectureId],
    queryFn:  () => fetchComments(lectureId),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const res  = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      const d    = (await res.json()) as ApiResponse<null>;
      if (!d.success) throw new Error(d.error ?? "Failed to delete");
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["comments", lectureId] }),
  });

  const threaded = buildTree(flatComments as Comment[]);
  const rootCount = flatComments.filter((c) => !(c as Comment).parentId).length;

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
        <FiMessageCircle className="text-[var(--accent)]" />
        Comments
        <span className="text-sm font-normal text-[var(--text-muted)] font-body">({rootCount})</span>
      </h2>

      {/* Top-level comment form */}
      {session ? (
        <div className="mb-8">
          <CommentInput
            lectureId={lectureId}
            placeholder="Share your thoughts…"
            onSuccess={() => {}}
          />
        </div>
      ) : (
        <div className="mb-8 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-sm text-[var(--text-muted)] text-center">
          <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-light)] font-medium">Sign in</Link>
          {" "}to leave a comment
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 shimmer rounded w-1/4" />
                <div className="h-3 shimmer rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : threaded.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div className="space-y-6">
          {threaded.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              lectureId={lectureId}
              user={user}
              onDelete={(id) => deleteComment.mutate(id)}
              depth={0}
            />
          ))}
        </div>
      )}
    </section>
  );
}
