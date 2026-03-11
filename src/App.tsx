import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioDevices } from "./hooks/useAudioDevices";
import { useTranscription } from "./hooks/useTranscription";
import { useToast } from "./hooks/useToast";
import { useBlogWriter } from "./hooks/useBlogWriter";
import { downloadTranscript } from "./lib/platform";
import { copyPromptToClipboard } from "./lib/blogPrompt";
import type { WritingStyle } from "./lib/types";
import { DeviceSelector } from "./components/DeviceSelector";
import { AudioControls } from "./components/AudioControls";
import { RecordingIndicator } from "./components/RecordingIndicator";
import { TranscriptDisplay } from "./components/TranscriptDisplay";
import { ModelStatus } from "./components/ModelStatus";
import { ToastContainer } from "./components/ToastContainer";
import { StyleSelector } from "./components/StyleSelector";
import { BlogPostDisplay } from "./components/BlogPostDisplay";

export default function App() {
  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    permissionGranted,
    permissionError,
  } = useAudioDevices();

  const {
    modelState,
    modelProgress,
    modelLoadingMessage,
    recordingState,
    isTranscribing,
    transcriptLines,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useTranscription();

  const toast = useToast();

  const {
    blogState,
    blogModelProgress,
    blogModelMessage,
    blogText,
    generate,
    abortGeneration,
    clearBlogPost,
  } = useBlogWriter();

  const [writingStyle, setWritingStyle] = useState<WritingStyle>({
    presetId: "blog",
    customPrompt: "",
  });

  // Surface mic permission errors as toasts (only once per unique error)
  const lastShownErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (permissionError && permissionError !== lastShownErrorRef.current) {
      lastShownErrorRef.current = permissionError;
      toast.error(permissionError);
    }
  }, [permissionError, toast]);

  const handleStartRecording = useCallback(async () => {
    if (!permissionGranted) {
      toast.error(
        "Microphone access is required. Please grant permission and reload.",
      );
      return;
    }

    if (!selectedDeviceId) {
      toast.error(
        "No microphone selected. Please choose an audio input device.",
      );
      return;
    }

    const errorMessage = await startRecording(selectedDeviceId);
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.info("Recording started");
    }
  }, [permissionGranted, selectedDeviceId, startRecording, toast]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    toast.info("Recording stopped — transcribing audio…");
  }, [stopRecording, toast]);

  const handleDownload = useCallback(async () => {
    if (transcriptLines.length === 0) {
      toast.error("No transcript to download.");
      return;
    }

    const fullText = transcriptLines.join("\n\n");

    try {
      const saved = await downloadTranscript(fullText);
      if (saved) {
        toast.success("Transcript saved successfully");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save transcript",
      );
    }
  }, [transcriptLines, toast]);

  const handleWriteWithAI = useCallback(() => {
    if (transcriptLines.length === 0) {
      toast.error("No transcript to rewrite.");
      return;
    }

    toast.info("Starting AI writer — model will download on first use…");
    generate(transcriptLines, writingStyle);
  }, [transcriptLines, writingStyle, generate, toast]);

  const handleCopyPrompt = useCallback(async () => {
    if (transcriptLines.length === 0) {
      toast.error("No transcript to copy.");
      return;
    }

    try {
      await copyPromptToClipboard(transcriptLines, writingStyle);
      toast.success("Prompt + transcript copied to clipboard");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to copy to clipboard",
      );
    }
  }, [transcriptLines, writingStyle, toast]);

  const handleCopyBlogText = useCallback(async () => {
    if (!blogText) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(blogText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = blogText;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Generated text copied to clipboard");
    } catch {
      toast.error("Failed to copy text");
    }
  }, [blogText, toast]);

  const handleClear = useCallback(() => {
    clearTranscript();
    clearBlogPost();
    toast.info("Transcript cleared");
  }, [clearTranscript, clearBlogPost, toast]);

  const isRecording = recordingState === "recording";
  const showBlogOutput = blogState !== "idle" || blogText.length > 0;

  return (
    <div className="relative min-h-screen flex flex-col items-center bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
        <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-1/3 -right-1/4 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl mx-auto px-4 py-8 gap-6 flex-1">
        {/* Header */}
        <header className="text-center space-y-2 select-none">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            Transcript
          </h1>
          <p className="text-sm text-zinc-500 font-medium">
            Offline audio transcription powered by Whisper
          </p>
        </header>

        {/* Model loading status */}
        <ModelStatus
          modelState={modelState}
          modelProgress={modelProgress}
          modelLoadingMessage={modelLoadingMessage}
        />

        {/* Action bar — glassmorphism card */}
        <div
          className={[
            "w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl",
            "shadow-xl shadow-black/10 p-5 space-y-4",
            "transition-all duration-300 ease-out",
          ].join(" ")}
        >
          {/* Top row: device selector + recording indicator */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DeviceSelector
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelect={setSelectedDeviceId}
              disabled={isRecording || !permissionGranted}
            />

            <RecordingIndicator
              isRecording={isRecording}
              isTranscribing={isTranscribing}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />

          {/* Writing style selector */}
          <StyleSelector
            style={writingStyle}
            onChange={setWritingStyle}
            disabled={
              blogState === "loading-model" || blogState === "generating"
            }
          />

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />

          {/* Controls row */}
          <AudioControls
            recordingState={recordingState}
            modelState={modelState}
            isTranscribing={isTranscribing}
            hasTranscript={transcriptLines.length > 0}
            blogState={blogState}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onDownload={handleDownload}
            onClear={handleClear}
            onWriteWithAI={handleWriteWithAI}
            onCopyPrompt={handleCopyPrompt}
          />
        </div>

        {/* Transcript output */}
        <TranscriptDisplay
          lines={transcriptLines}
          isTranscribing={isTranscribing}
        />

        {/* AI-generated blog output */}
        {showBlogOutput && (
          <BlogPostDisplay
            blogState={blogState}
            blogText={blogText}
            blogModelProgress={blogModelProgress}
            blogModelMessage={blogModelMessage}
            onCopy={handleCopyBlogText}
            onClear={clearBlogPost}
            onAbort={abortGeneration}
          />
        )}

        {/* Footer */}
        <footer className="text-center py-4 select-none">
          <p className="text-[11px] text-zinc-600">
            All processing happens locally on your device — no data leaves your
            machine.
          </p>
        </footer>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
