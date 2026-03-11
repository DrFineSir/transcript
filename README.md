# 🎙️ Transcript

**Fully offline audio transcription + AI-powered writing — runs entirely in your browser or as a native desktop app.**

> ⚡ This project was **vibe coded** — built iteratively through conversational AI-assisted development (Claude), from initial scaffolding through architecture decisions, bug fixes, platform workarounds, and feature additions. Every line of code was generated through natural language conversation.

---

## What It Does

1. **Record** audio from your microphone
2. **Transcribe** it locally using [Whisper](https://huggingface.co/Xenova/whisper-tiny.en) (quantized, runs in-browser via ONNX/WASM)
3. **Rewrite** the transcript into polished content using an in-browser LLM ([SmolLM2-360M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct))
4. Or **copy a prompt** to paste into ChatGPT / Claude / any external LLM for higher-quality rewrites

**Zero data leaves your machine.** No API keys needed. No server. No cloud. Everything runs locally via WebAssembly.

---

## Features

- 🎤 **Live microphone capture** with device selection
- 🧠 **Whisper-powered transcription** running in a Web Worker (quantized `q8` ONNX model)
- ✍️ **In-browser AI writer** — SmolLM2-360M-Instruct (`q4` quantized) rewrites transcripts with real-time token streaming
- 📋 **Copy-paste prompt builder** — generates comprehensive, style-aware prompts for external LLMs (ChatGPT, Claude, etc.)
- 🎨 **5 writing style presets** — Blog Post, LinkedIn Post, Twitter/X Thread, Professional Email, Executive Summary — plus Custom
- 🗣️ **Voice-preserving prompts** — designed to maintain the speaker's natural tone, vocabulary, and personality (not generic AI slop)
- 💾 **Download transcripts** as text files (native save dialog on desktop, browser download on web)
- 🌙 **Dark UI** with glassmorphism, smooth transitions, and a responsive layout (Tailwind CSS v4)
- 🔔 **Toast notifications** for errors, status updates, and confirmations
- 📡 **Model caching** — downloads once, cached in browser Cache API for instant subsequent loads
- 🖥️ **Cross-platform** — runs as a Tauri desktop app (Linux, macOS, Windows) or a static web app

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · TypeScript · Tailwind CSS v4 · Vite 7 |
| **ML Runtime** | [@huggingface/transformers](https://github.com/huggingface/transformers.js) v3 (ONNX Runtime Web / WASM) |
| **Transcription Model** | [Xenova/whisper-tiny.en](https://huggingface.co/Xenova/whisper-tiny.en) (quantized `q8`) |
| **Writing Model** | [HuggingFaceTB/SmolLM2-360M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct) (quantized `q4`, ~388 MB) |
| **Desktop Shell** | [Tauri](https://tauri.app/) v2 (Rust) |
| **Native Audio** | [cpal](https://github.com/RustAudio/cpal) (Rust, for desktop mic capture bypassing WebKitGTK limitations) |
| **Workers** | Dedicated Web Workers for both Whisper and LLM inference (UI thread stays responsive) |

---

## Project Structure

```
transcript/
├── src/
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # React entry point
│   ├── index.css                  # Tailwind imports + global styles
│   ├── components/
│   │   ├── AudioControls.tsx      # Record / Stop / Download / Clear / AI buttons
│   │   ├── BlogPostDisplay.tsx    # AI-generated content output panel
│   │   ├── DeviceSelector.tsx     # Microphone dropdown
│   │   ├── ModelStatus.tsx        # Whisper model loading progress
│   │   ├── RecordingIndicator.tsx # Pulsing waveform animation
│   │   ├── StyleSelector.tsx      # Writing style preset picker
│   │   ├── ToastContainer.tsx     # Toast notification stack
│   │   └── TranscriptDisplay.tsx  # Streaming transcript output
│   ├── hooks/
│   │   ├── useAudioDevices.ts     # Mic permission + device enumeration
│   │   ├── useBlogWriter.ts       # Blog worker lifecycle + state
│   │   ├── useToast.ts            # Toast notification manager
│   │   └── useTranscription.ts    # Whisper worker lifecycle + recording
│   ├── lib/
│   │   ├── blogPrompt.ts          # Clipboard prompt builder for external LLMs
│   │   ├── platform.ts            # Tauri detection + file save (native vs browser)
│   │   ├── tauriAudio.ts          # Tauri command bindings for native audio
│   │   └── types.ts               # All TypeScript types + writing style prompts
│   └── workers/
│       ├── blogWorker.ts          # SmolLM2 text-generation pipeline (Web Worker)
│       └── whisperWorker.ts       # Whisper ASR pipeline (Web Worker)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                # Tauri entry point
│   │   ├── lib.rs                 # Plugin setup, Wayland workaround
│   │   └── audio.rs               # Native mic capture via cpal
│   ├── capabilities/
│   │   └── default.json           # Tauri permission scopes
│   ├── tauri.conf.json            # Tauri app config
│   ├── Cargo.toml                 # Rust dependencies
│   └── Info.plist                 # macOS microphone permission description
├── vite.config.ts                 # Vite config (WASM handling, COOP/COEP headers)
├── package.json
├── tsconfig.json
└── index.html
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** (comes with Node)
- For desktop builds: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (Rust, system deps)

### Web Development (no Rust needed)

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/transcript.git
cd transcript

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` in a modern browser (Chrome/Edge recommended for best WebAssembly + mic support).

### Desktop Development (Tauri)

```bash
# Install Tauri CLI (if not already)
npm install -g @tauri-apps/cli

# Run in dev mode (opens native window)
npm run tauri dev

# Build for production
npm run tauri build
```

Desktop build outputs (Linux):
- Binary: `src-tauri/target/release/transcript`
- DEB: `src-tauri/target/release/bundle/deb/transcript_0.1.0_amd64.deb`
- AppImage: `src-tauri/target/release/bundle/appimage/`
- RPM: `src-tauri/target/release/bundle/rpm/`

### Web Production Build

```bash
npm run build
```

Static files output to `dist/`. Deploy to any static hosting (Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.).

> **Note:** The web deployment requires COOP/COEP headers for SharedArrayBuffer support (needed by ONNX Runtime's multi-threaded WASM). Most static hosts let you configure response headers. See the headers in `vite.config.ts` for reference:
> ```
> Cross-Origin-Opener-Policy: same-origin
> Cross-Origin-Embedder-Policy: require-corp
> ```

---

## How It Works

### Audio Capture
- **Web:** Uses `navigator.mediaDevices.getUserMedia()` → `MediaRecorder` → `AudioContext` resampling to 16kHz mono Float32
- **Desktop (Tauri):** Uses `cpal` (Rust) for native mic access, bypassing WebKitGTK's limited getUserMedia support. Audio is captured as PCM, downmixed to mono, and sent to the frontend via Tauri commands.

### Transcription
A dedicated Web Worker loads the quantized Whisper model via `@huggingface/transformers`. The model downloads on first use (~40 MB) and is cached in the browser's Cache API. Audio buffers (Float32Array, 16kHz mono) are posted to the worker, which returns timestamped text segments.

### AI Writer
A second Web Worker lazily loads SmolLM2-360M-Instruct (quantized `q4`, ~388 MB download on first use). When triggered, it constructs a chat-template prompt with the selected writing style's system prompt + the transcript, then streams generated tokens back to the UI in real-time via `TextStreamer`.

### Prompt Copy
For higher-quality results with external LLMs, the app builds a comprehensive prompt (system instructions + transcript) tailored to the selected writing style and copies it to the clipboard. The prompts are designed to preserve the speaker's authentic voice and avoid generic AI phrasing.

---

## Writing Styles

| Style | Description |
|---|---|
| 📝 **Blog Post** | Conversational, scannable paragraphs, preserves speaker's voice |
| 💼 **LinkedIn Post** | 150–300 words, hook opening, short paragraphs, professional-personal tone |
| 🐦 **Twitter Thread** | Numbered tweets (<280 chars each), punchy, 4–10 tweets |
| ✉️ **Professional Email** | Greeting → point → details → action → sign-off |
| 📋 **Executive Summary** | Key takeaway + bullet points + next steps, 150–300 words |
| ✏️ **Custom** | Write your own system prompt |

All presets are explicitly engineered to:
- **Preserve the speaker's natural voice**, vocabulary, sentence rhythm, and personality
- **Never add information** the speaker didn't mention
- **Avoid AI-sounding phrases** ("dive into", "game-changer", "it's worth noting", "leverage", "delve", "tapestry", etc.)
- **Match the speaker's register** — casual stays casual, technical stays technical

---

## Platform Notes

### Linux (Wayland)
WebKitGTK can crash with GBM buffer errors on some Wayland/GPU configurations. The app automatically sets `WEBKIT_DISABLE_COMPOSITING_MODE=1` on Linux to prevent this.

### Linux (Desktop — Microphone)
WebKitGTK historically has limited `getUserMedia` support. The app uses native `cpal`-based audio capture on desktop to guarantee microphone access regardless of WebView limitations.

### macOS
`Info.plist` includes `NSMicrophoneUsageDescription` for the mic permission dialog. On first run, macOS will prompt the user to allow microphone access.

### Browser Compatibility
- **Chrome / Edge:** Full support (recommended)
- **Firefox:** Works, but SharedArrayBuffer requires the COOP/COEP headers
- **Safari:** Works with recent versions; may have minor WebAssembly performance differences

---

## Known Limitations

- **SmolLM2-360M is a small model.** In-browser generation quality is limited by the 360M parameter size. For production-quality writing, use the "Copy Prompt" feature and paste into ChatGPT, Claude, or similar.
- **First load downloads models.** Whisper (~40 MB) and SmolLM2 (~388 MB) download on first use. Subsequent loads are instant (cached).
- **WASM inference is CPU-bound.** No GPU acceleration in-browser. Transcription and generation are slower than native GPU inference but keep everything offline and private.
- **Whisper tiny.en is English-only.** The current model supports English. Swapping to `Xenova/whisper-small` or a multilingual variant is straightforward but increases download size.

---

## Environment Variables

None required. No API keys. No server configuration. Everything runs client-side.

For Tauri desktop development on Linux with GPU issues:

```bash
WEBKIT_DISABLE_COMPOSITING_MODE=1 npm run tauri dev
```

(The app sets this automatically in Rust, but you can also set it manually.)

---

## License

MIT

---

## Acknowledgments

- [Hugging Face Transformers.js](https://github.com/huggingface/transformers.js) — ML inference in the browser
- [OpenAI Whisper](https://github.com/openai/whisper) — speech recognition model
- [HuggingFace SmolLM2](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct) — compact instruction-tuned LLM
- [Tauri](https://tauri.app/) — lightweight native app shell
- [cpal](https://github.com/RustAudio/cpal) — cross-platform audio I/O in Rust
- [Vite](https://vite.dev/) — frontend tooling
- Built with [Claude](https://claude.ai) via vibe coding