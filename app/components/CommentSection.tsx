"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Avatar from "@radix-ui/react-avatar";
import Link from "next/link";
import type { Comment, SessionUser } from "../types/auth.types";
import { formatDate } from "../utils/api";
import { FiSend, FiTrash2, FiMessageCircle } from "react-icons/fi";

interface CommentSectionProps {
  lectureId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function fetchComments(lectureId: string): Promise<Comment[]> {
  const res = await fetch(`/api/comments?lectureId=${lectureId}`);
  const data = (await res.json()) as ApiResponse<Comment[]>;
  if (!data.success) throw new Error(data.error ?? "Failed to fetch comments");
  return data.data;
}

export function CommentSection({ lectureId }: CommentSectionProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const user = session?.user as SessionUser | undefined;

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", lectureId],
    queryFn: () => fetchComments(lectureId),
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, lectureId }),
      });
      const data = (await res.json()) as ApiResponse<Comment>;
      if (!data.success)
        throw new Error(data.error ?? "Failed to post comment");
      return data.data;
    },
    onSuccess: () => {
      setBody("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["comments", lectureId] });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to post comment";
      setError(message);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      const data = (await res.json()) as ApiResponse<null>;
      if (!data.success)
        throw new Error(data.error ?? "Failed to delete comment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", lectureId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError("Comment cannot be empty");
      return;
    }
    if (body.length < 2) {
      setError("Comment too short");
      return;
    }
    addComment.mutate(body.trim());
  };

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold text-white mb-6 flex items-center gap-2">
        <FiMessageCircle className="text-gold-400" />
        Comments{" "}
        <span className="text-sm font-normal text-ink-400 font-body">
          ({(comments as Comment[]).length})
        </span>
      </h2>

      {/* Comment form */}
      {session ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <Avatar.Root className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 mt-1">
              <Avatar.Image
                src={user?.image ?? ""}
                alt={user?.name ?? "User"}
                className="w-full h-full object-cover"
              />
              <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-gold-700 text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </Avatar.Fallback>
            </Avatar.Root>
            <div className="flex-1">
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setError("");
                }}
                placeholder="Share your thoughts..."
                rows={3}
                className="w-full bg-ink-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-gold-500/50 resize-none transition-colors"
              />
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={addComment.isPending || !body.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <FiSend size={14} />
                  {addComment.isPending ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 rounded-xl border border-white/5 bg-ink-800/30 text-sm text-ink-400 text-center">
          <Link href="/login" className="text-gold-400 hover:text-gold-300">
            Sign in
          </Link>{" "}
          to leave a comment
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-ink-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-ink-700 rounded w-1/4" />
                <div className="h-3 bg-ink-700 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (comments as Comment[]).length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-8">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div className="space-y-6">
          {(comments as Comment[]).map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar.Root className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                <Avatar.Image
                  src={comment.author.image ?? ""}
                  alt={comment.author.name}
                  className="w-full h-full object-cover"
                />
                <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-ink-700 text-white text-xs font-bold">
                  {comment.author.name[0]?.toUpperCase()}
                </Avatar.Fallback>
              </Avatar.Root>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">
                    {comment.author.name}
                  </span>
                  <span className="text-xs text-ink-500">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-ink-300 leading-relaxed">
                  {comment.body}
                </p>
              </div>
              {(user?.id === comment.author.id || user?.role === "ADMIN") && (
                <button
                  onClick={() => deleteComment.mutate(comment.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-ink-600 hover:text-red-400 transition-all"
                >
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
