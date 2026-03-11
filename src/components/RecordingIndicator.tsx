interface RecordingIndicatorProps {
  isRecording: boolean;
  isTranscribing: boolean;
}

export function RecordingIndicator({
  isRecording,
  isTranscribing,
}: RecordingIndicatorProps) {
  const bars = [
    { id: 0, delay: 0, minHeight: 5, maxHeight: 20 },
    { id: 1, delay: 0.15, minHeight: 6, maxHeight: 28 },
    { id: 2, delay: 0.3, minHeight: 4, maxHeight: 24 },
    { id: 3, delay: 0.45, minHeight: 7, maxHeight: 18 },
    { id: 4, delay: 0.6, minHeight: 5, maxHeight: 26 },
  ];

  const isActive = isRecording || isTranscribing;

  if (!isActive) return null;
  const color = isRecording
    ? "bg-red-500"
    : isTranscribing
      ? "bg-amber-400"
      : "bg-zinc-600";
  const glowColor = isRecording
    ? "shadow-red-500/40"
    : isTranscribing
      ? "shadow-amber-400/30"
      : "";

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2 rounded-full
        bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50
        transition-all duration-300
        ${isActive ? `shadow-lg ${glowColor}` : "opacity-0"}
      `}
    >
      {/* Pulsing dot */}
      <div className="relative flex items-center justify-center w-3 h-3">
        <div
          className={`
            absolute inset-0 rounded-full ${color}
            ${isActive ? "animate-ping opacity-75" : ""}
          `}
          style={{ animationDuration: "1.5s" }}
        />
        <div className={`relative w-2 h-2 rounded-full ${color}`} />
      </div>

      {/* Waveform bars */}
      <div className="flex items-center gap-[3px] h-8">
        {bars.map((bar) => (
          <div
            key={bar.id}
            className={`
              w-[3px] rounded-full transition-colors duration-200
              ${color}
            `}
            style={{
              height: isActive ? undefined : `${bar.minHeight}px`,
              animation: isActive
                ? `waveform-bar 0.8s ease-in-out ${bar.delay}s infinite alternate`
                : "none",
              minHeight: `${bar.minHeight}px`,
            }}
          />
        ))}
      </div>

      {/* Label */}
      <span className="text-xs font-medium text-zinc-300 tracking-wide select-none">
        {isRecording ? "Recording" : isTranscribing ? "Transcribing" : ""}
      </span>

      {/* Inline keyframes — avoids needing a separate CSS file or Tailwind config */}
      <style>{`
        @keyframes waveform-bar {
          0% {
            height: 4px;
          }
          100% {
            height: 28px;
          }
        }
      `}</style>
    </div>
  );
}
