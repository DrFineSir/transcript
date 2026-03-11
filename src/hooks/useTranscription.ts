import { useState, useRef, useCallback, useEffect } from "react";
import type {
  ModelState,
  RecordingState,
  WorkerOutgoingMessage,
} from "../lib/types";
import { isTauriEnvironment } from "../lib/platform";

const WHISPER_SAMPLE_RATE = 16_000;

/**
 * Orchestrates the Whisper Web Worker, microphone capture, and recording lifecycle.
 *
 * Audio capture strategy (dual-path):
 *
 * TAURI DESKTOP:
 * - Calls Rust `start_recording` / `stop_recording` commands backed by cpal.
 * - `stop_recording` returns the full PCM buffer + sample rate from Rust.
 * - The buffer is resampled to 16kHz in JS and sent to the Whisper worker.
 *
 * WEB BROWSER:
 * - Acquires a MediaStream via getUserMedia with the selected device ID.
 * - Routes it through a ScriptProcessorNode to accumulate PCM Float32 chunks.
 * - On stop, concatenates chunks, resamples to 16kHz mono, and sends to worker.
 *
 * The worker is initialized once on mount and kept alive for the session so
 * subsequent recordings don't re-download the model.
 */
export function useTranscription() {
  const [modelState, setModelState] = useState<ModelState>("unloaded");
  const [modelProgress, setModelProgress] = useState(0);
  const [modelLoadingMessage, setModelLoadingMessage] = useState("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  // Browser-only refs (unused in Tauri mode)
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);

  const isTauri = isTauriEnvironment();

  // ---- Worker lifecycle ----

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/whisperWorker.ts", import.meta.url),
      { type: "module" },
    );

    worker.addEventListener("message", handleWorkerMessage);
    workerRef.current = worker;

    worker.postMessage({ type: "init" });

    return () => {
      worker.removeEventListener("message", handleWorkerMessage);
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleWorkerMessage(event: MessageEvent<WorkerOutgoingMessage>) {
    const msg = event.data;

    switch (msg.status) {
      case "loading":
        setModelState("loading");
        setModelLoadingMessage(msg.message);
        if (msg.progress !== undefined) {
          setModelProgress(msg.progress);
        }
        break;

      case "ready":
        setModelState("ready");
        setModelProgress(100);
        setModelLoadingMessage("");
        break;

      case "transcribing":
        setIsTranscribing(true);
        break;

      case "result":
        setIsTranscribing(false);
        if (msg.text) {
          setTranscriptLines((prev) => [...prev, msg.text]);
        }
        break;

      case "error":
        setIsTranscribing(false);
        setModelState((prev) => (prev === "loading" ? "error" : prev));
        console.error("[WhisperWorker]", msg.error);
        break;
    }
  }

  // ---- Audio helpers ----

  /**
   * Linearly interpolate audio from inputSampleRate down to 16kHz mono
   * for Whisper inference.
   */
  function resampleTo16kHz(
    inputBuffer: Float32Array,
    inputSampleRate: number,
  ): Float32Array {
    if (inputSampleRate === WHISPER_SAMPLE_RATE) {
      return inputBuffer;
    }

    const ratio = inputSampleRate / WHISPER_SAMPLE_RATE;
    const outputLength = Math.round(inputBuffer.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcFloor = Math.floor(srcIndex);
      const srcCeil = Math.min(srcFloor + 1, inputBuffer.length - 1);
      const fraction = srcIndex - srcFloor;

      output[i] =
        inputBuffer[srcFloor] * (1 - fraction) +
        inputBuffer[srcCeil] * fraction;
    }

    return output;
  }

  function concatenateFloat32Arrays(arrays: Float32Array[]): Float32Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  function sendToWorker(audio: Float32Array) {
    if (workerRef.current && audio.length > 0) {
      workerRef.current.postMessage({ type: "transcribe", audio }, [
        audio.buffer,
      ]);
    }
  }

  // ---- Tauri (native cpal) recording ----

  const startNativeRecording = useCallback(
    async (selectedDeviceId: string): Promise<string | null> => {
      try {
        const { startNativeRecording: nativeStart } =
          await import("../lib/tauriAudio");
        await nativeStart(selectedDeviceId);
        setRecordingState("recording");
        return null;
      } catch (err) {
        return `Native recording error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    [],
  );

  const stopNativeRecording = useCallback(async () => {
    setRecordingState("stopping");

    try {
      const { stopNativeRecording: nativeStop } =
        await import("../lib/tauriAudio");
      const { samples, sampleRate } = await nativeStop();

      if (samples.length === 0) {
        setRecordingState("idle");
        return;
      }

      const resampled = resampleTo16kHz(samples, sampleRate);
      sendToWorker(resampled);
    } catch (err) {
      console.error("Native stop recording error:", err);
    }

    setRecordingState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Browser (getUserMedia) recording ----

  const startBrowserRecording = useCallback(
    async (selectedDeviceId: string): Promise<string | null> => {
      try {
        const hasSpecificDevice =
          selectedDeviceId && selectedDeviceId !== "default";

        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: { ideal: WHISPER_SAMPLE_RATE },
          ...(hasSpecificDevice
            ? { deviceId: { exact: selectedDeviceId } }
            : selectedDeviceId
              ? { deviceId: { ideal: selectedDeviceId } }
              : {}),
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
          });
        } catch (constraintErr) {
          if (
            constraintErr instanceof DOMException &&
            (constraintErr.name === "OverconstrainedError" ||
              constraintErr.name === "NotFoundError")
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: true,
                sampleRate: { ideal: WHISPER_SAMPLE_RATE },
              },
            });
          } else {
            throw constraintErr;
          }
        }

        mediaStreamRef.current = stream;
        audioChunksRef.current = [];

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event: AudioProcessingEvent) => {
          const inputData = event.inputBuffer.getChannelData(0);
          audioChunksRef.current.push(new Float32Array(inputData));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        setRecordingState("recording");
        return null;
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Microphone permission was denied."
            : err instanceof DOMException && err.name === "NotFoundError"
              ? "Selected microphone was not found. It may have been disconnected."
              : err instanceof DOMException && err.name === "NotReadableError"
                ? "Microphone is already in use by another application."
                : err instanceof DOMException &&
                    err.name === "OverconstrainedError"
                  ? "Selected microphone is unavailable. Try choosing a different device."
                  : `Recording error: ${err instanceof Error ? err.message : String(err)}`;
        return message;
      }
    },
    [],
  );

  const stopBrowserRecording = useCallback(() => {
    setRecordingState("stopping");

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    const sampleRate = audioContextRef.current?.sampleRate ?? 44100;

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];

    if (chunks.length === 0) {
      setRecordingState("idle");
      return;
    }

    const rawAudio = concatenateFloat32Arrays(chunks);
    const resampledAudio = resampleTo16kHz(rawAudio, sampleRate);
    sendToWorker(resampledAudio);

    setRecordingState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Unified public API ----

  const startRecording = useCallback(
    async (selectedDeviceId: string): Promise<string | null> => {
      if (modelState !== "ready") {
        return "Model is not ready yet. Please wait for it to finish loading.";
      }

      if (recordingState !== "idle") {
        return "Already recording.";
      }

      if (isTauri) {
        return startNativeRecording(selectedDeviceId);
      } else {
        return startBrowserRecording(selectedDeviceId);
      }
    },
    [
      modelState,
      recordingState,
      isTauri,
      startNativeRecording,
      startBrowserRecording,
    ],
  );

  const stopRecording = useCallback(() => {
    if (recordingState !== "recording") return;

    if (isTauri) {
      stopNativeRecording();
    } else {
      stopBrowserRecording();
    }
  }, [recordingState, isTauri, stopNativeRecording, stopBrowserRecording]);

  const clearTranscript = useCallback(() => {
    setTranscriptLines([]);
  }, []);

  return {
    modelState,
    modelProgress,
    modelLoadingMessage,
    recordingState,
    isTranscribing,
    transcriptLines,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
