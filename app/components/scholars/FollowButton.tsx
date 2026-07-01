"use client";

import { useState } from "react";
import { FiUserPlus, FiUserCheck } from "react-icons/fi";

interface FollowButtonProps {
  scholarId:       string;
  initialFollowing: boolean;
  initialCount:    number;
}

export function FollowButton({ scholarId, initialFollowing, initialCount }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count,     setCount]     = useState(initialCount);
  const [loading,   setLoading]   = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/scholars/${scholarId}/follow`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setFollowing(data.data.following);
        setCount(data.data.followerCount);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-60 ${
        following
          ? "bg-[var(--accent-dim)] border border-[var(--border-strong)] text-[var(--accent)] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
          : "bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white border border-transparent"
      }`}
    >
      {following ? <FiUserCheck size={14} /> : <FiUserPlus size={14} />}
      {following ? "Following" : "Follow"}
      <span className="text-xs opacity-70">({count})</span>
    </button>
  );
}
