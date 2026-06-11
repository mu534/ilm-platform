"use client";

import { cn } from "../../utils/cn";

type BadgeVariant =
  | "default"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "info";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-ink-800/60  text-ink-300  border-white/10",
  gold: "bg-gold-900/30 text-gold-400  border-gold-700/30",
  success: "bg-green-900/30 text-green-400 border-green-700/30",
  warning: "bg-yellow-900/30 text-yellow-400 border-yellow-700/30",
  danger: "bg-red-900/30  text-red-400   border-red-700/30",
  info: "bg-blue-900/20 text-blue-400  border-blue-700/20",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1   text-sm",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-ink-400",
  gold: "bg-gold-400",
  success: "bg-green-400",
  warning: "bg-yellow-400",
  danger: "bg-red-400",
  info: "bg-blue-400",
};

export function Badge({
  variant = "default",
  size = "sm",
  dot = false,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            dotColors[variant],
          )}
        />
      )}
      {children}
    </span>
  );
}

// Role badge — convenience wrapper used across the app
import { Role } from "../../../generated/prisma/enums";

const roleVariant: Record<Role, BadgeVariant> = {
  ADMIN: "danger",
  SCHOLAR: "gold",
  USER: "info",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={roleVariant[role]}>{role}</Badge>;
}
