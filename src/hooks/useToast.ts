import { useState, useCallback, useRef } from "react";
import type { Toast } from "../lib/types";

const TOAST_DURATION_MS = 4000;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: Toast["variant"] = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: Toast = { id, message, variant };

      setToasts((prev) => [...prev, toast]);

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION_MS);

      timersRef.current.set(id, timer);

      return id;
    },
    []
  );

  const info = useCallback(
    (message: string) => show(message, "info"),
    [show]
  );

  const success = useCallback(
    (message: string) => show(message, "success"),
    [show]
  );

  const error = useCallback(
    (message: string) => show(message, "error"),
    [show]
  );

  return { toasts, dismiss, info, success, error };
}
