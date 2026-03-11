/**
 * Platform detection and file export utilities.
 * Handles native Tauri desktop saves via plugin-dialog + plugin-fs,
 * falling back to browser Blob download for web builds.
 */

let _isTauri: boolean | null = null;

export function isTauriEnvironment(): boolean {
  if (_isTauri === null) {
    _isTauri =
      typeof window !== "undefined" &&
      "__TAURI_INTERNALS__" in window;
  }
  return _isTauri;
}

async function saveViaTauri(content: string, defaultFilename: string): Promise<boolean> {
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [
        { name: "Text Files", extensions: ["txt"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!filePath) {
      return false; // User cancelled the dialog
    }

    await writeTextFile(filePath, content);
    return true;
  } catch (err) {
    console.error("Tauri file save failed:", err);
    throw new Error(
      `Failed to save file: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function saveViaBrowser(content: string, filename: string): boolean {
  try {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();

    // Cleanup after a short delay so the browser can finish the download
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    }, 150);

    return true;
  } catch (err) {
    console.error("Browser file save failed:", err);
    throw new Error(
      `Failed to download file: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function generateTranscriptFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `transcript_${dateStr}_${timeStr}.txt`;
}

export async function downloadTranscript(content: string): Promise<boolean> {
  const filename = generateTranscriptFilename();

  if (isTauriEnvironment()) {
    return saveViaTauri(content, filename);
  }

  return saveViaBrowser(content, filename);
}
