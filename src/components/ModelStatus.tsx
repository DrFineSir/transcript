import type { ModelState } from "../lib/types";

interface ModelStatusProps {
  modelState: ModelState;
  modelProgress: number;
  modelLoadingMessage: string;
}

export function ModelStatus({
  modelState,
  modelProgress,
  modelLoadingMessage,
}: ModelStatusProps) {
  if (modelState === "ready") return null;

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      {modelState === "loading" && (
        <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-md p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative h-5 w-5 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30" />
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-zinc-300 truncate">
              {modelLoadingMessage || "Preparing model…"}
            </p>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(modelProgress, 2)}%` }}
            />
          </div>

          <p className="text-xs text-zinc-500 text-right tabular-nums">
            {modelProgress}%
          </p>
        </div>
      )}

      {modelState === "unloaded" && (
        <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-md p-5">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-500 animate-pulse" />
            <p className="text-sm text-zinc-400">
              Initializing transcription engine…
            </p>
          </div>
        </div>
      )}

      {modelState === "error" && (
        <div className="rounded-xl bg-red-950/40 border border-red-500/20 backdrop-blur-md p-5">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm text-red-300">
              Failed to load the transcription model. Please refresh the page to
              try again.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
