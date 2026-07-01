"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FiHeart } from "react-icons/fi";

interface LikeButtonProps {
  lectureId: string;
}

interface LikeData {
  liked: boolean;
  count: number;
}

async function fetchLikes(lectureId: string): Promise<LikeData> {
  const res  = await fetch(`/api/likes?lectureId=${lectureId}`);
  const data = await res.json();
  return data.success ? data.data : { liked: false, count: 0 };
}

export function LikeButton({ lectureId }: LikeButtonProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["likes", lectureId],
    queryFn:  () => fetchLikes(lectureId),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res  = await fetch("/api/likes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lectureId }),
      });
      const d = await res.json();
      return d.data as LikeData;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["likes", lectureId], updated);
    },
  });

  const liked = data?.liked ?? false;
  const count = data?.count ?? 0;

  if (!session) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors"
      >
        <FiHeart size={15} />
        <span>{count}</span>
      </Link>
    );
  }

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className={`flex items-center gap-1.5 text-sm transition-colors disabled:opacity-60 ${
        liked
          ? "text-red-400 hover:text-red-300"
          : "text-[var(--text-muted)] hover:text-red-400"
      }`}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <FiHeart
        size={15}
        className={liked ? "fill-current" : ""}
      />
      <span>{count}</span>
    </button>
  );
}
