import { useState, useEffect, useCallback } from "react";
import type { AudioDevice } from "../lib/types";
import { isTauriEnvironment } from "../lib/platform";

/**
 * Enumerates audio input devices.
 *
 * In Tauri desktop mode, delegates to the Rust `list_audio_devices` command
 * (backed by cpal) — no browser permission prompt needed.
 *
 * In web mode, requests getUserMedia first to trigger the permission prompt
 * (required for browsers to return labeled devices), then enumerateDevices().
 */
export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const isTauri = isTauriEnvironment();

  // ---- Browser path helpers ----

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs: AudioDevice[] = allDevices
        .filter((d) => d.kind === "audioinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
        }));

      setDevices(audioInputs);

      if (audioInputs.length > 0) {
        setSelectedDeviceId((prev) => {
          const stillExists = audioInputs.some((d) => d.deviceId === prev);
          return stillExists && prev ? prev : audioInputs[0].deviceId;
        });
      }
    } catch (err) {
      console.error("Device enumeration failed:", err);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      setPermissionError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      setPermissionGranted(true);
      await enumerateDevices();
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission was denied. Please allow access in your browser or system settings."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No microphone found. Please connect an audio input device."
            : `Microphone error: ${err instanceof Error ? err.message : String(err)}`;

      setPermissionError(message);
      setPermissionGranted(false);
    }
  }, [enumerateDevices]);

  // ---- Tauri path helpers ----

  const enumerateNativeDevices = useCallback(async () => {
    try {
      const { listNativeAudioDevices } = await import("../lib/tauriAudio");
      const nativeDevices = await listNativeAudioDevices();

      setDevices(nativeDevices);
      setPermissionGranted(true);
      setPermissionError(null);

      if (nativeDevices.length > 0) {
        setSelectedDeviceId((prev) => {
          const stillExists = nativeDevices.some((d) => d.deviceId === prev);
          return stillExists && prev ? prev : nativeDevices[0].deviceId;
        });
      }
    } catch (err) {
      const message = `Native audio error: ${err instanceof Error ? err.message : String(err)}`;
      console.error(message);
      setPermissionError(message);
      setPermissionGranted(false);
    }
  }, []);

  // ---- Initialization ----

  useEffect(() => {
    let cancelled = false;

    if (isTauri) {
      // Tauri desktop: use cpal via Rust commands — no permission prompt
      (async () => {
        try {
          const { listNativeAudioDevices } = await import("../lib/tauriAudio");
          const nativeDevices = await listNativeAudioDevices();

          if (cancelled) return;

          setDevices(nativeDevices);
          setPermissionGranted(true);

          if (nativeDevices.length > 0) {
            setSelectedDeviceId(nativeDevices[0].deviceId);
          }
        } catch (err) {
          if (cancelled) return;

          const message = `Native audio error: ${err instanceof Error ? err.message : String(err)}`;
          console.error(message);
          setPermissionError(message);
          setPermissionGranted(false);
        }
      })();
    } else {
      // Web browser: getUserMedia for permission, then enumerateDevices
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());

          if (cancelled) return;
          setPermissionGranted(true);

          const allDevices = await navigator.mediaDevices.enumerateDevices();
          if (cancelled) return;

          const audioInputs: AudioDevice[] = allDevices
            .filter((d) => d.kind === "audioinput")
            .map((d, index) => ({
              deviceId: d.deviceId,
              label: d.label || `Microphone ${index + 1}`,
            }));

          setDevices(audioInputs);
          if (audioInputs.length > 0) {
            setSelectedDeviceId(audioInputs[0].deviceId);
          }
        } catch (err) {
          if (cancelled) return;

          const message =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Microphone permission was denied. Please allow access in your browser or system settings."
              : err instanceof DOMException && err.name === "NotFoundError"
                ? "No microphone found. Please connect an audio input device."
                : `Microphone error: ${err instanceof Error ? err.message : String(err)}`;

          setPermissionError(message);
          setPermissionGranted(false);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTauri]);

  // Re-enumerate when devices change (browser only — cpal has no such event)
  useEffect(() => {
    if (isTauri || !permissionGranted) return;

    const handler = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handler);
    };
  }, [isTauri, permissionGranted, enumerateDevices]);

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    permissionGranted,
    permissionError,
    requestPermission: isTauri ? enumerateNativeDevices : requestPermission,
  };
}
