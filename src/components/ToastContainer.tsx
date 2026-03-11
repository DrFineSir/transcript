import { useEffect, useState } from "react";
import type { Toast } from "../lib/types";

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<Toast["variant"], string> = {
  info: "border-sky-500/40 bg-sky-950/60 text-sky-200",
  success: "border-emerald-500/40 bg-emerald-950/60 text-emerald-200",
  error: "border-red-500/40 bg-red-950/60 text-red-200",
};

const VARIANT_ICONS: Record<Toast["variant"], string> = {
  info: "ℹ",
  success: "✓",
  error: "✕",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next frame
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl
        shadow-lg shadow-black/20 cursor-pointer select-none
        transition-all duration-200 ease-out
        ${VARIANT_STYLES[toast.variant]}
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
      `}
      onClick={handleDismiss}
      role="alert"
    >
      <span className="text-sm font-bold shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white/10">
        {VARIANT_ICONS[toast.variant]}
      </span>
      <p className="text-sm font-medium leading-snug">{toast.message}</p>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
