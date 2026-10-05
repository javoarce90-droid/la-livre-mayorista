"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
}

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string) => {
    const id = ++nextId;
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto rounded-lg bg-brand-950 px-4 py-2.5 text-sm text-white shadow-lg">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
