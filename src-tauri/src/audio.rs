use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::State;

/// cpal::Stream is !Send + !Sync on some platforms, but we only ever
/// access it from Tauri command handlers which are serialized through
/// a Mutex. This wrapper lets us store it in Tauri managed state.
#[allow(dead_code)]
struct SendSyncStream(cpal::Stream);
unsafe impl Send for SendSyncStream {}
unsafe impl Sync for SendSyncStream {}

/// Shared state for the audio recording session.
/// Held in Tauri's managed state so all commands can access it.
pub struct AudioState {
    buffer: Arc<Mutex<Vec<f32>>>,
    sample_rate: Mutex<u32>,
    stream: Mutex<Option<SendSyncStream>>,
    is_recording: Mutex<bool>,
}

// cpal::Stream is !Send+!Sync but our wrapper handles that.
// AudioState itself needs Send+Sync for Tauri managed state.
unsafe impl Send for AudioState {}
unsafe impl Sync for AudioState {}

impl AudioState {
    pub fn new() -> Self {
        Self {
            buffer: Arc::new(Mutex::new(Vec::new())),
            sample_rate: Mutex::new(44100),
            stream: Mutex::new(None),
            is_recording: Mutex::new(false),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct AudioDeviceInfo {
    #[serde(rename = "deviceId")]
    pub device_id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RecordingResult {
    pub samples: Vec<f32>,
    #[serde(rename = "sampleRate")]
    pub sample_rate: u32,
}

/// List all available audio input devices via cpal.
#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDeviceInfo>, String> {
    let host = cpal::default_host();
    let mut devices_out = Vec::new();

    let input_devices = host
        .input_devices()
        .map_err(|e| format!("Failed to enumerate input devices: {}", e))?;

    for device in input_devices {
        let name = device
            .name()
            .unwrap_or_else(|_| "Unknown device".to_string());
        devices_out.push(AudioDeviceInfo {
            device_id: name.clone(),
            label: name,
        });
    }

    if devices_out.is_empty() {
        if let Some(device) = host.default_input_device() {
            let name = device
                .name()
                .unwrap_or_else(|_| "Default Microphone".to_string());
            devices_out.push(AudioDeviceInfo {
                device_id: name.clone(),
                label: name,
            });
        }
    }

    Ok(devices_out)
}

/// Find a cpal input device by name. Falls back to the default input device.
fn find_device_by_name(name: &str) -> Result<cpal::Device, String> {
    let host = cpal::default_host();

    if !name.is_empty() && name != "default" {
        if let Ok(input_devices) = host.input_devices() {
            for device in input_devices {
                if let Ok(dev_name) = device.name() {
                    if dev_name == name {
                        return Ok(device);
                    }
                }
            }
        }
    }

    host.default_input_device()
        .ok_or_else(|| "No default input device available".to_string())
}

/// Start recording from the specified device.
#[tauri::command]
pub fn start_recording(state: State<'_, AudioState>, device_id: String) -> Result<(), String> {
    let mut is_recording = state
        .is_recording
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if *is_recording {
        return Err("Already recording".to_string());
    }

    let device = find_device_by_name(&device_id)?;

    let supported_config = device
        .default_input_config()
        .map_err(|e| format!("Failed to get default input config: {}", e))?;

    let config = supported_config.config();
    let channels = config.channels as usize;
    let rate = config.sample_rate.0;

    {
        let mut sr = state
            .sample_rate
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        *sr = rate;
    }

    {
        let mut buf = state
            .buffer
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        buf.clear();
    }

    let buffer_ref: Arc<Mutex<Vec<f32>>> = Arc::clone(&state.buffer);

    let stream = device
        .build_input_stream(
            &config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                let mut buf: std::sync::MutexGuard<'_, Vec<f32>> = match buffer_ref.lock() {
                    Ok(b) => b,
                    Err(_) => return,
                };

                if channels == 1 {
                    buf.extend_from_slice(data);
                } else {
                    for chunk in data.chunks(channels) {
                        let sum: f32 = chunk.iter().sum();
                        buf.push(sum / channels as f32);
                    }
                }
            },
            move |err| {
                eprintln!("Audio input stream error: {}", err);
            },
            None,
        )
        .map_err(|e| format!("Failed to build input stream: {}", e))?;

    stream
        .play()
        .map_err(|e| format!("Failed to start input stream: {}", e))?;

    {
        let mut stream_slot = state
            .stream
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        *stream_slot = Some(SendSyncStream(stream));
    }

    *is_recording = true;
    Ok(())
}

/// Stop the active recording and return the captured PCM data + sample rate.
#[tauri::command]
pub fn stop_recording(state: State<'_, AudioState>) -> Result<RecordingResult, String> {
    let mut is_recording = state
        .is_recording
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if !*is_recording {
        return Err("Not currently recording".to_string());
    }

    {
        let mut stream_slot = state
            .stream
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        *stream_slot = None;
    }

    *is_recording = false;

    let samples = {
        let mut buf = state
            .buffer
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        std::mem::take(&mut *buf)
    };

    let sample_rate = {
        let sr = state
            .sample_rate
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        *sr
    };

    Ok(RecordingResult {
        samples,
        sample_rate,
    })
}
