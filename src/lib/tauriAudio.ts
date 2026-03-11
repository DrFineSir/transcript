import { invoke } from "@tauri-apps/api/core";
import type { AudioDevice } from "./types";

interface NativeRecordingResult {
  samples: number[];
  sampleRate: number;
}

/**
 * Typed wrappers around the Tauri commands exposed by src-tauri/src/audio.rs.
 * These are only callable when running inside a Tauri desktop shell —
 * the caller must gate on `isTauriEnvironment()` before using these.
 */

export async function listNativeAudioDevices(): Promise<AudioDevice[]> {
  const devices = await invoke<AudioDevice[]>("list_audio_devices");
  return devices;
}

export async function startNativeRecording(deviceId: string): Promise<void> {
  await invoke<void>("start_recording", { deviceId });
}

export async function stopNativeRecording(): Promise<{
  samples: Float32Array;
  sampleRate: number;
}> {
  // Tauri serializes Vec<f32> as a JSON number array.
  // We convert it back to a Float32Array for the Whisper worker.
  const result = await invoke<NativeRecordingResult>("stop_recording");

  return {
    samples: new Float32Array(result.samples),
    sampleRate: result.sampleRate,
  };
}
