import { useEffect, useRef } from "react";

interface TranscriptDisplayProps {
  lines: string[];
  isTranscribing: boolean;
}

export function TranscriptDisplay({
  lines,
  isTranscribing,
}: TranscriptDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new lines arrive
  useEffect(() => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines.length]);

  const isEmpty = lines.length === 0;

  return (
    <div
      ref={containerRef}
      className={[
        "relative w-full flex-1 min-h-[200px] max-h-[60vh] overflow-y-auto",
        "rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl",
        "shadow-xl shadow-black/10",
        "transition-all duration-300 ease-out",
        "scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent",
      ].join(" ")}
    >
      {/* Subtle top fade for scroll context */}
      <div className="sticky top-0 left-0 right-0 h-6 bg-gradient-to-b from-zinc-950/80 to-transparent z-10 pointer-events-none rounded-t-2xl" />

      <div className="px-6 pb-6 pt-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <div className="mb-4 rounded-full bg-white/[0.04] p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.2}
                stroke="currentColor"
                className="w-8 h-8 text-zinc-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm font-medium">
              No transcript yet
            </p>
            <p className="text-zinc-600 text-xs mt-1.5 max-w-[240px] leading-relaxed">
              Press <strong className="text-zinc-400">Record</strong> to start
              capturing audio. Your transcript will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div
                key={index}
                className={[
                  "group rounded-lg px-4 py-3",
                  "bg-white/[0.02] hover:bg-white/[0.05]",
                  "border border-transparent hover:border-white/[0.06]",
                  "transition-all duration-200 ease-out",
                  // Fade-in animation for new lines
                  "animate-in fade-in slide-in-from-bottom-2 duration-300",
                ].join(" ")}
                style={{
                  animationDelay: `${Math.min(index * 30, 150)}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Line index marker */}
                  <span className="shrink-0 mt-0.5 text-[10px] tabular-nums font-medium text-zinc-600 group-hover:text-zinc-500 transition-colors w-5 text-right select-none">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-zinc-300 group-hover:text-zinc-200 transition-colors">
                    {line}
                  </p>
                </div>
              </div>
            ))}

            {/* Transcribing shimmer indicator */}
            {isTranscribing && (
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="shrink-0 w-5" />
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-bounce"
                    style={{ animationDelay: "0ms", animationDuration: "0.8s" }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-bounce"
                    style={{
                      animationDelay: "150ms",
                      animationDuration: "0.8s",
                    }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-bounce"
                    style={{
                      animationDelay: "300ms",
                      animationDuration: "0.8s",
                    }}
                  />
                  <span className="ml-2 text-xs text-amber-400/60 font-medium select-none">
                    Processing audio…
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invisible anchor to scroll into view */}
        <div ref={bottomAnchorRef} className="h-px" />
      </div>

      {/* Subtle bottom fade */}
      <div className="sticky bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none rounded-b-2xl" />

      {/* Inline keyframes for the fade-in animation (Tailwind v4 compatible) */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom-2 {
          from { transform: translateY(0.5rem); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out, slide-in-from-bottom-2 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
