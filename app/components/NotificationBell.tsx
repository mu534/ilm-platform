"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { FiBell, FiCheck } from "react-icons/fi";
import { formatDate } from "../utils/api";

interface Notification {
  id:        string;
  type:      string;
  title:     string;
  message:   string;
  link:      string | null;
  read:      boolean;
  createdAt: string;
}

interface NotifResponse {
  notifications: Notification[];
  unreadCount:   number;
}

async function fetchNotifications(): Promise<NotifResponse> {
  const res  = await fetch("/api/notifications?pageSize=10");
  const data = await res.json();
  if (!data.success) throw new Error("Failed to load notifications");
  return data.data;
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey:  ["notifications"],
    queryFn:   fetchNotifications,
    refetchInterval: 60_000, // refresh every minute
    staleTime: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ all: true }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="relative p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all border border-transparent hover:border-[var(--border)]"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <FiBell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-[var(--accent)] text-white text-[9px] font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="w-80 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] z-50 animate-fadeInUp"
          sideOffset={8}
          align="end"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
              >
                <FiCheck size={11} /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <FiBell className="text-[var(--text-muted)] text-2xl mx-auto mb-2" />
                <p className="text-sm text-[var(--text-muted)]">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 transition-colors ${n.read ? "" : "bg-[var(--accent-dim)]"}`}
                >
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className="block hover:text-[var(--accent)] transition-colors"
                    >
                      <NotifItem n={n} />
                    </Link>
                  ) : (
                    <NotifItem n={n} />
                  )}
                </div>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NotifItem({ n }: { n: Notification }) {
  return (
    <>
      <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">{n.title}</p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.message}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{formatDate(n.createdAt)}</p>
    </>
  );
}
