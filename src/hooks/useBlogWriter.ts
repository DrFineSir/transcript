import { useState, useRef, useCallback, useEffect } from "react";
import type {
  BlogGenerationState,
  BlogWorkerOutgoingMessage,
  WritingStyle,
} from "../lib/types";

/**
 * Manages the blog writer Web Worker lifecycle.
 *
 * The LLM model is loaded lazily — only when the user first clicks
 * "Write". Once loaded it stays in memory for the session.
 * Generated tokens stream in one-by-one so the UI shows a typing effect.
 */
export function useBlogWriter() {
  const [blogState, setBlogState] = useState<BlogGenerationState>("idle");
  const [blogModelProgress, setBlogModelProgress] = useState(0);
  const [blogModelMessage, setBlogModelMessage] = useState("");
  const [blogText, setBlogText] = useState("");

  const workerRef = useRef<Worker | null>(null);
  const modelReadyRef = useRef(false);
  const pendingRequestRef = useRef<{
    transcript: string;
    style: WritingStyle;
  } | null>(null);

  // Accumulate tokens into a ref so we don't depend on stale state
  // inside the message handler, then sync to React state.
  const blogTextRef = useRef("");

  function getOrCreateWorker(): Worker {
    if (workerRef.current) {
      return workerRef.current;
    }

    const worker = new Worker(
      new URL("../workers/blogWorker.ts", import.meta.url),
      { type: "module" },
    );

    worker.addEventListener("message", handleWorkerMessage);
    workerRef.current = worker;
    return worker;
  }

  function handleWorkerMessage(event: MessageEvent<BlogWorkerOutgoingMessage>) {
    const msg = event.data;

    switch (msg.status) {
      case "loading":
        setBlogState("loading-model");
        setBlogModelMessage(msg.message);
        if (msg.progress !== undefined) {
          setBlogModelProgress(msg.progress);
        }
        break;

      case "ready":
        modelReadyRef.current = true;
        setBlogModelProgress(100);
        setBlogModelMessage("");

        // If we queued a generation request while the model was loading, fire it now
        if (pendingRequestRef.current !== null) {
          const { transcript, style } = pendingRequestRef.current;
          pendingRequestRef.current = null;
          workerRef.current?.postMessage({
            type: "generate",
            transcript,
            style,
          });
        } else {
          setBlogState("idle");
        }
        break;

      case "generating":
        blogTextRef.current = "";
        setBlogText("");
        setBlogState("generating");
        break;

      case "token":
        blogTextRef.current += msg.token;
        setBlogText(blogTextRef.current);
        break;

      case "done":
        if (msg.fullText) {
          blogTextRef.current = msg.fullText;
          setBlogText(msg.fullText);
        }
        setBlogState("done");
        break;

      case "error":
        console.error("[BlogWorker]", msg.error);
        setBlogState("error");
        break;
    }
  }

  const generate = useCallback(
    (transcriptLines: string[], style: WritingStyle) => {
      const transcript = transcriptLines.join("\n\n");
      const worker = getOrCreateWorker();

      if (!modelReadyRef.current) {
        // Model hasn't been loaded yet — kick off init and queue the generation
        pendingRequestRef.current = { transcript, style };
        setBlogState("loading-model");
        worker.postMessage({ type: "init" });
      } else {
        // Model is ready — generate immediately
        worker.postMessage({ type: "generate", transcript, style });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const abortGeneration = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "abort" });
    }
    setBlogState("done");
  }, []);

  const clearBlogPost = useCallback(() => {
    blogTextRef.current = "";
    setBlogText("");
    setBlogState("idle");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.removeEventListener("message", handleWorkerMessage);
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    blogState,
    blogModelProgress,
    blogModelMessage,
    blogText,
    generate,
    abortGeneration,
    clearBlogPost,
  };
}
