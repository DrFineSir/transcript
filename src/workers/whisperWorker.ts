import { pipeline, env } from "@huggingface/transformers";
import type {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
} from "../lib/types";

// Disable local model loading — we fetch from HuggingFace Hub and cache via Cache API
env.allowLocalModels = false;

const MODEL_ID = "Xenova/whisper-tiny.en";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;

function post(message: WorkerOutgoingMessage) {
  self.postMessage(message);
}

async function initModel() {
  try {
    post({ status: "loading", message: "Downloading model…", progress: 0 });

    transcriber = await pipeline("automatic-speech-recognition", MODEL_ID, {
      dtype: "q8",
      device: "wasm",
      progress_callback: (data: {
        status: string;
        progress?: number;
        file?: string;
      }) => {
        if (data.status === "progress" && data.progress !== undefined) {
          const fileName = data.file ? data.file.split("/").pop() : "model";
          post({
            status: "loading",
            message: `Downloading ${fileName}…`,
            progress: Math.round(data.progress),
          });
        } else if (data.status === "done") {
          post({ status: "loading", message: "Finalizing…", progress: 100 });
        }
      },
    });

    post({ status: "ready" });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    post({ status: "error", error: `Model init failed: ${errorMessage}` });
  }
}

async function transcribeAudio(audioData: Float32Array) {
  if (!transcriber) {
    post({ status: "error", error: "Model not loaded yet" });
    return;
  }

  post({ status: "transcribing" });

  try {
    // Whisper expects 16kHz mono Float32Array.
    // The pipeline typing is too narrow for raw audio buffers, so we cast through `any`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await transcriber(audioData as any, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      force_full_sequences: false,
    });

    // The pipeline returns either a single result or an array; normalize to a single object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output: any = Array.isArray(result) ? result[0] : result;

    const segments = (output.chunks ?? []).map(
      (chunk: { text: string; timestamp: [number, number | null] }) => ({
        text: chunk.text,
        timestamp: chunk.timestamp,
      }),
    );

    post({
      status: "result",
      text: (output.text ?? "").trim(),
      segments,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    post({ status: "error", error: `Transcription failed: ${errorMessage}` });
  }
}

// Message handler — the only entry point from the main thread
self.addEventListener(
  "message",
  (event: MessageEvent<WorkerIncomingMessage>) => {
    const { type } = event.data;

    switch (type) {
      case "init":
        initModel();
        break;
      case "transcribe":
        transcribeAudio(event.data.audio);
        break;
      default:
        post({
          status: "error",
          error: `Unknown message type: ${(event.data as { type: string }).type}`,
        });
    }
  },
);
