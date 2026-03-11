import type { WritingStyle, WritingStylePresetId } from "./types";
import { WRITING_STYLE_PROMPTS } from "./types";

/**
 * Builds a clipboard-ready string that prepends a style-appropriate AI prompt
 * to the raw transcript. The user can paste this directly into ChatGPT, Claude,
 * or any other LLM to get a polished rewrite.
 */

const STYLE_LABELS: Record<WritingStylePresetId, string> = {
  blog: "Blog Post",
  linkedin: "LinkedIn Post",
  twitter: "Twitter/X Thread",
  email: "Professional Email",
  summary: "Executive Summary",
  custom: "Custom Style",
};

function resolveSystemPrompt(style: WritingStyle): string {
  if (style.presetId === "custom") {
    return (
      style.customPrompt.trim() ||
      "You are a helpful writer. Rewrite the following transcript in a polished style."
    );
  }

  return WRITING_STYLE_PROMPTS[style.presetId];
}

export function buildPromptForStyle(
  transcriptLines: string[],
  style: WritingStyle,
): string {
  const systemPrompt = resolveSystemPrompt(style);
  const styleLabel = STYLE_LABELS[style.presetId];
  const transcriptBody = transcriptLines.join("\n\n");

  return [
    systemPrompt,
    "",
    "---",
    "",
    `Output format: ${styleLabel}`,
    "",
    "TRANSCRIPT:",
    "",
    transcriptBody,
    "",
  ].join("\n");
}

export async function copyPromptToClipboard(
  transcriptLines: string[],
  style: WritingStyle,
): Promise<void> {
  const content = buildPromptForStyle(transcriptLines, style);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  // Fallback for older browsers or insecure contexts (http://)
  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
