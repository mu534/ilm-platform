"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FiX } from "react-icons/fi";
import { cn } from "../../utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-fadeIn" />

        {/* Panel */}
        <Dialog.Content
          className={cn(
            "fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-full p-6 rounded-2xl shadow-2xl",
            "glass-card gold-border",
            "focus:outline-none",
            "data-[state=open]:animate-fadeIn",
            sizes[size],
          )}
        >
          {/* Header */}
          {(title ?? description) && (
            <div className="mb-5 pr-8">
              {title && (
                <Dialog.Title className="font-display text-xl font-semibold text-white">
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="mt-1 text-sm text-ink-400">
                  {description}
                </Dialog.Description>
              )}
            </div>
          )}

          {/* Close button */}
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 p-1.5 text-ink-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Close"
            >
              <FiX size={16} />
            </button>
          </Dialog.Close>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Convenience sub-components for modal footer
export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 mt-6 pt-5 border-t border-white/5",
        className,
      )}
    >
      {children}
    </div>
  );
}
