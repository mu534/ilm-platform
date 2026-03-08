"use client";

import * as Toast from "@radix-ui/react-toast";
import { useState, createContext, useContext, useCallback } from "react";
import { FiX, FiCheck, FiAlertCircle } from "react-icons/fi";

type ToastType = "success" | "error" | "info";
interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

const ToastContext = createContext<{
  toast: (opts: Omit<ToastMessage, "id">) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((opts: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...opts, id }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }, []);

  const icons = {
    success: <FiCheck className="text-green-400" />,
    error: <FiAlertCircle className="text-red-400" />,
    info: <FiAlertCircle className="text-blue-400" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider swipeDirection="right">
        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            open={true}
            className="glass-card gold-border rounded-lg p-4 flex items-start gap-3 shadow-2xl w-80 animate-fadeInUp"
            style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}
          >
            <div className="mt-0.5">{icons[t.type]}</div>
            <div className="flex-1">
              <Toast.Title className="font-semibold text-sm text-white">
                {t.title}
              </Toast.Title>
              {t.description && (
                <Toast.Description className="text-xs text-ink-300 mt-1">
                  {t.description}
                </Toast.Description>
              )}
            </div>
            <Toast.Action asChild altText="Close">
              <button
                onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              >
                <FiX className="text-ink-400 hover:text-white transition-colors" />
              </button>
            </Toast.Action>
          </Toast.Root>
        ))}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
