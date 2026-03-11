import type {
  RecordingState,
  ModelState,
  BlogGenerationState,
} from "../lib/types";

interface AudioControlsProps {
  recordingState: RecordingState;
  modelState: ModelState;
  isTranscribing: boolean;
  hasTranscript: boolean;
  blogState: BlogGenerationState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownload: () => void;
  onClear: () => void;
  onWriteWithAI: () => void;
  onCopyPrompt: () => void;
}

export function AudioControls({
  recordingState,
  modelState,
  isTranscribing,
  hasTranscript,
  blogState,
  onStartRecording,
  onStopRecording,
  onDownload,
  onClear,
  onWriteWithAI,
  onCopyPrompt,
}: AudioControlsProps) {
  const isRecording = recordingState === "recording";
  const isStopping = recordingState === "stopping";
  const isModelReady = modelState === "ready";
  const canRecord = isModelReady && !isStopping && !isTranscribing;
  const canDownload = hasTranscript && !isRecording && !isTranscribing;
  const isBlogBusy =
    blogState === "loading-model" || blogState === "generating";
  const canGenerate = canDownload && !isBlogBusy;

  return (
    <div className="flex items-center justify-center gap-2.5 flex-wrap">
      {/* Record / Stop button */}
      <button
        onClick={isRecording ? onStopRecording : onStartRecording}
        disabled={!canRecord}
        className={[
          "group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-medium text-sm",
          "border transition-all duration-200 ease-out",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950",
          isRecording
            ? "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25 hover:border-red-500/60 focus:ring-red-500/40 shadow-lg shadow-red-500/10"
            : "bg-white/5 border-zinc-700/60 text-zinc-200 hover:bg-white/10 hover:border-zinc-600 focus:ring-indigo-500/40",
        ].join(" ")}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? (
          <span className="relative flex items-center justify-center w-4 h-4">
            <span className="absolute inset-0 rounded-sm bg-red-400 animate-pulse" />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="relative w-4 h-4 text-red-300"
            >
              <path d="M5.75 3A2.75 2.75 0 003 5.75v8.5A2.75 2.75 0 005.75 17h8.5A2.75 2.75 0 0017 14.25v-8.5A2.75 2.75 0 0014.25 3h-8.5z" />
            </svg>
          </span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
            <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
          </svg>
        )}

        <span>
          {isRecording ? "Stop" : isStopping ? "Stopping…" : "Record"}
        </span>

        <span
          className={[
            "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            "bg-gradient-to-r from-transparent via-white/[0.03] to-transparent",
            "pointer-events-none",
          ].join(" ")}
        />
      </button>

      {/* Write with AI — in-browser LLM generation */}
      <button
        onClick={onWriteWithAI}
        disabled={!canGenerate}
        className={[
          "group relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm",
          "border transition-all duration-200 ease-out",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-purple-500/40",
          isBlogBusy
            ? "bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-sm shadow-purple-500/10"
            : "border-zinc-700/60 bg-white/5 text-zinc-200 hover:bg-purple-500/10 hover:border-purple-500/40 hover:text-purple-300",
        ].join(" ")}
        aria-label="Generate with in-browser AI"
      >
        {/* Sparkle icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" />
        </svg>
        <span>{isBlogBusy ? "Writing…" : "Write with AI"}</span>

        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />
      </button>

      {/* Copy Prompt — for pasting into an external LLM */}
      <button
        onClick={onCopyPrompt}
        disabled={!canDownload}
        className={[
          "group relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm",
          "border border-zinc-700/60 bg-white/5 text-zinc-200",
          "transition-all duration-200 ease-out",
          "hover:bg-sky-500/10 hover:border-sky-500/40 hover:text-sky-300",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:border-zinc-700/60 disabled:hover:text-zinc-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-sky-500/40",
        ].join(" ")}
        aria-label="Copy prompt for external LLM"
      >
        {/* Clipboard icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M13.887 3.182c.396.037.79.08 1.183.128C16.194 3.45 17 4.414 17 5.517V16.75A2.25 2.25 0 0114.75 19h-9.5A2.25 2.25 0 013 16.75V5.517c0-1.103.806-2.068 1.93-2.207.393-.048.787-.09 1.183-.128A3.001 3.001 0 019 1h2c1.373 0 2.531.923 2.887 2.182zM7.5 4A1.5 1.5 0 019 2.5h2A1.5 1.5 0 0112.5 4v.5h-5V4z"
            clipRule="evenodd"
          />
        </svg>
        <span>Copy Prompt</span>

        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />
      </button>

      {/* Download transcript button */}
      <button
        onClick={onDownload}
        disabled={!canDownload}
        className={[
          "group relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm",
          "border border-zinc-700/60 bg-white/5 text-zinc-200",
          "transition-all duration-200 ease-out",
          "hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-300",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:border-zinc-700/60 disabled:hover:text-zinc-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-emerald-500/40",
        ].join(" ")}
        aria-label="Download transcript"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
          <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
        </svg>
        <span>Download</span>

        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />
      </button>

      {/* Clear transcript button */}
      <button
        onClick={onClear}
        disabled={!canDownload}
        className={[
          "group relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-sm",
          "border border-zinc-700/60 bg-white/5 text-zinc-400",
          "transition-all duration-200 ease-out",
          "hover:bg-zinc-800 hover:border-zinc-600 hover:text-zinc-300",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:border-zinc-700/60 disabled:hover:text-zinc-400",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-zinc-500/40",
        ].join(" ")}
        aria-label="Clear transcript"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
            clipRule="evenodd"
          />
        </svg>
        <span>Clear</span>

        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />
      </button>
    </div>
  );
}
