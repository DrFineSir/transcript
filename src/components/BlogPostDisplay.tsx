import { useEffect, useRef } from "react";
import type { BlogGenerationState } from "../lib/types";

interface BlogPostDisplayProps {
  blogState: BlogGenerationState;
  blogText: string;
  blogModelProgress: number;
  blogModelMessage: string;
  onCopy: () => void;
  onClear: () => void;
  onAbort: () => void;
}

export function BlogPostDisplay({
  blogState,
  blogText,
  blogModelProgress,
  blogModelMessage,
  onCopy,
  onClear,
  onAbort,
}: BlogPostDisplayProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as tokens stream in
  useEffect(() => {
    if (blogState === "generating" && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [blogText, blogState]);

  if (blogState === "idle" && !blogText) return null;

  const isLoading = blogState === "loading-model";
  const isGenerating = blogState === "generating";
  const isDone = blogState === "done";
  const isError = blogState === "error";
  const hasText = blogText.length > 0;

  return (
    <div
      className={[
        "w-full rounded-2xl border backdrop-blur-xl",
        "shadow-xl shadow-black/10",
        "transition-all duration-300 ease-out",
        isError
          ? "border-red-500/20 bg-red-950/10"
          : "border-purple-500/15 bg-purple-950/[0.04]",
      ].join(" ")}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">✨</span>
          <h3 className="text-sm font-semibold text-zinc-200 tracking-tight">
            AI Writer
          </h3>

          {/* Status indicator */}
          {isLoading && (
            <span className="flex items-center gap-1.5 text-[11px] text-purple-400/70 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-purple-400" />
              </span>
              Loading model…
            </span>
          )}

          {isGenerating && (
            <span className="flex items-center gap-1.5 text-[11px] text-purple-400/70 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-purple-400" />
              </span>
              Writing…
            </span>
          )}

          {isDone && hasText && (
            <span className="text-[11px] text-emerald-400/70 font-medium">
              ✓ Complete
            </span>
          )}

          {isError && (
            <span className="text-[11px] text-red-400/70 font-medium">
              Error
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {isGenerating && (
            <button
              onClick={onAbort}
              className={[
                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium",
                "border border-red-500/30 bg-red-500/10 text-red-300",
                "hover:bg-red-500/20 hover:border-red-500/50",
                "transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-red-500/30",
              ].join(" ")}
              aria-label="Stop generation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-3 h-3"
              >
                <path d="M4.5 2A2.5 2.5 0 002 4.5v7A2.5 2.5 0 004.5 14h7a2.5 2.5 0 002.5-2.5v-7A2.5 2.5 0 0011.5 2h-7z" />
              </svg>
              Stop
            </button>
          )}

          {hasText && !isGenerating && (
            <>
              <button
                onClick={onCopy}
                className={[
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium",
                  "border border-zinc-700/50 bg-white/[0.03] text-zinc-400",
                  "hover:bg-white/[0.06] hover:border-zinc-600 hover:text-zinc-300",
                  "transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
                ].join(" ")}
                aria-label="Copy generated text"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-3 h-3"
                >
                  <path d="M5.5 3.5A1.5 1.5 0 017 2h5.5A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H7A1.5 1.5 0 015.5 10.5v-7z" />
                  <path d="M3 5a1.5 1.5 0 00-1.5 1.5v6A1.5 1.5 0 003 14h6a1.5 1.5 0 001.5-1.5V12H7a3 3 0 01-3-3V5H3z" />
                </svg>
                Copy
              </button>

              <button
                onClick={onClear}
                className={[
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium",
                  "border border-zinc-700/50 bg-white/[0.03] text-zinc-400",
                  "hover:bg-white/[0.06] hover:border-zinc-600 hover:text-zinc-300",
                  "transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
                ].join(" ")}
                aria-label="Clear generated text"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-3 h-3"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5zM6.05 6a.75.75 0 01.787.713l.275 5.5a.75.75 0 01-1.498.075l-.275-5.5A.75.75 0 016.05 6zm3.9 0a.75.75 0 01.712.787l-.275 5.5a.75.75 0 01-1.498-.075l.275-5.5A.75.75 0 019.95 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Model loading progress bar */}
      {isLoading && (
        <div className="px-5 pb-3 space-y-2">
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(blogModelProgress, 2)}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500 flex justify-between">
            <span>{blogModelMessage || "Preparing model…"}</span>
            <span className="tabular-nums">{blogModelProgress}%</span>
          </p>
        </div>
      )}

      {/* Text output area */}
      {(hasText || isGenerating) && (
        <div
          className={[
            "relative mx-3 mb-3 max-h-[50vh] overflow-y-auto rounded-xl",
            "bg-zinc-900/50 border border-white/[0.04]",
            "scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent",
          ].join(" ")}
        >
          <div className="px-5 py-4">
            <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
              {blogText}
              {/* Blinking cursor while generating */}
              {isGenerating && (
                <span className="inline-block w-0.5 h-4 ml-0.5 -mb-0.5 bg-purple-400 animate-pulse rounded-full" />
              )}
            </div>
            <div ref={bottomRef} className="h-px" />
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && !hasText && (
        <div className="px-5 pb-4">
          <p className="text-sm text-red-400/80">
            Something went wrong while generating. Try again or use the "Copy
            Prompt" button to paste into your preferred LLM.
          </p>
        </div>
      )}

      {/* Empty generating state (before first token) */}
      {isGenerating && !hasText && !isLoading && (
        <div className="px-5 pb-4 flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400/70 animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "0.8s" }}
          />
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400/70 animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "0.8s" }}
          />
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400/70 animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "0.8s" }}
          />
          <span className="ml-1 text-xs text-purple-400/50 font-medium select-none">
            Thinking…
          </span>
        </div>
      )}
    </div>
  );
}
