import { pipeline, env, TextStreamer } from "@huggingface/transformers";
import type {
  BlogWorkerIncomingMessage,
  BlogWorkerOutgoingMessage,
  WritingStyle,
} from "../lib/types";
import { WRITING_STYLE_PROMPTS } from "../lib/types";

// Fetch from HuggingFace Hub; browser Cache API handles caching automatically
env.allowLocalModels = false;

const MODEL_ID = "HuggingFaceTB/SmolLM2-360M-Instruct";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let generator: any = null;
let aborted = false;

function post(message: BlogWorkerOutgoingMessage) {
  self.postMessage(message);
}

async function initModel() {
  if (generator) {
    post({ status: "ready" });
    return;
  }

  try {
    post({
      status: "loading",
      message: "Downloading blog writer model…",
      progress: 0,
    });

    // Cast to `any` to avoid TS2590 "union type too complex" from the
    // heavily-overloaded `pipeline()` signature in @huggingface/transformers v3.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generator = await (pipeline as any)("text-generation", MODEL_ID, {
      dtype: "q4",
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
    post({ status: "error", error: `Blog model init failed: ${errorMessage}` });
  }
}

/**
 * Resolve the system prompt from a WritingStyle.
 * For preset styles, we look up WRITING_STYLE_PROMPTS.
 * For "custom", we use the user-provided prompt text.
 */
function resolveSystemPrompt(style: WritingStyle): string {
  if (style.presetId === "custom") {
    return (
      style.customPrompt.trim() ||
      "You are a helpful writer. Rewrite the following transcript in a polished style."
    );
  }

  return WRITING_STYLE_PROMPTS[style.presetId];
}

async function generateBlogPost(transcript: string, style: WritingStyle) {
  if (!generator) {
    post({ status: "error", error: "Blog model not loaded yet" });
    return;
  }

  aborted = false;
  post({ status: "generating" });

  try {
    const systemPrompt = resolveSystemPrompt(style);

    // Build chat messages for the instruct model
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here is a spoken transcript. Please rewrite it according to your instructions:\n\n${transcript}`,
      },
    ];

    let fullText = "";

    // Use TextStreamer for real-time token streaming
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token: string) => {
        if (aborted) return;
        fullText += token;
        post({ status: "token", token });
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await generator(messages as any, {
      max_new_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.1,
      do_sample: true,
      streamer,
    });

    if (aborted) {
      post({ status: "done", fullText: fullText.trim() });
      return;
    }

    // Extract final text from pipeline result as a fallback / final pass
    if (
      Array.isArray(result) &&
      result.length > 0 &&
      result[0]?.generated_text
    ) {
      const generatedText = result[0].generated_text;
      // When messages are passed, generated_text may be an array of message objects
      if (Array.isArray(generatedText)) {
        // Find the assistant reply (last message)
        const assistantMsg = generatedText.find(
          (m: { role: string; content: string }) => m.role === "assistant",
        );
        if (assistantMsg?.content) {
          fullText = assistantMsg.content;
        }
      } else if (typeof generatedText === "string") {
        fullText = generatedText;
      }
    }

    post({ status: "done", fullText: fullText.trim() });
  } catch (err) {
    if (aborted) {
      post({ status: "done", fullText: "" });
      return;
    }
    const errorMessage = err instanceof Error ? err.message : String(err);
    post({ status: "error", error: `Blog generation failed: ${errorMessage}` });
  }
}

self.addEventListener(
  "message",
  (event: MessageEvent<BlogWorkerIncomingMessage>) => {
    const { type } = event.data;

    switch (type) {
      case "init":
        initModel();
        break;
      case "generate":
        generateBlogPost(event.data.transcript, event.data.style);
        break;
      case "abort":
        aborted = true;
        break;
      default:
        post({
          status: "error",
          error: `Unknown message type: ${(event.data as { type: string }).type}`,
        });
    }
  },
);
