"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import { StudentSidebar } from "./StudentSidebar";
import type { SessionUser } from "@/app/types/auth.types";

interface StudentMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: SessionUser | null;
}

export function StudentMobileDrawer({
  isOpen,
  onClose,
  user,
}: StudentMobileDrawerProps) {
  // Prevent body scrolling when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div className="relative flex-1 max-w-xs w-full bg-[var(--bg-secondary)] border-r border-[var(--border)] shadow-2xl z-50 flex flex-col animate-slide-right">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-3 p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-dim)] transition-all z-10 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label="Close navigation drawer"
        >
          <FiX size={20} />
        </button>

        <StudentSidebar
          collapsed={false}
          onToggleCollapse={() => {}}
          user={user}
          isMobile={true}
          onCloseMobile={onClose}
        />
      </div>
    </div>
  );
}
