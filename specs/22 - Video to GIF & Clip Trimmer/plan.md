# Implementation Plan: Video to GIF & Clip Trimmer

> **Tool**: `22 - Video to GIF & Clip Trimmer`  
> **Route**: `/tools/video-to-gif` (with aliases `/tools/video-trimmer`, `/tools/gif-converter`)  
> **Category**: `audio-video`  
> **Engine Path**: `src/app/tools/audio-video/video-gif-trimmer/`  
> **Standard**: Standalone Component • Angular Signals • BEM SASS • Client-Side GIF Encoder • MediaRecorder Canvas Trimmer • 100% In-Browser • Zero Telemetry

---

## 1. Overview & Architecture

The **Video to GIF & Clip Trimmer** enables users to upload local video files (`.mp4`, `.webm`, `.mov`), trim the active playback segment with a dual-marker timeline scrubber, adjust resolution, framerate (FPS), and playback speed, and export either:
1. **High-Quality Animated GIF (`.gif`)**: Self-contained client-side GIF89a encoder with median-cut/octree color quantization, LZW variable-length compression, and infinite loop headers.
2. **Trimmed Video Clip (`.webm` / `.mp4`)**: Canvas capture stream (`captureStream()`) with `MediaRecorder` for fast client-side video clipping.

### Key Value Pillars
- **Zero Server Uploads & Zero Telemetry**: Videos never leave the device. Safe for confidential screen recordings and personal videos.
- **No COOP/COEP Header Dependency**: Native HTML5 Canvas + pure TypeScript GIF89a encoder runs reliably in all browser contexts, tests, and offline without requiring external 30MB multi-threaded WASM downloads.
- **Fluid Timeline Scrubber**: Interactive range controls with millisecond precision, playback speed multipliers, and real-time progress callbacks.

---

## 2. Directory Structure

```
src/app/tools/audio-video/video-gif-trimmer/
├── types.ts                        # Configuration, resolution, format, and progress interfaces
├── test-fixtures.ts                # Synthetic ImageData frames, mock video files, and default configs
├── gif-encoder.ts                  # GIF89a binary encoder (LZW compression, color quantization, Netscape loop)
├── engine.ts                       # Dimension scaling, frame sampling, trim math, and conversion pipeline
├── engine.spec.ts                  # Unit tests for GIF binary structure, quantization, and trim calculations
├── video-gif-trimmer.component.ts  # Standalone component with Signals, video player, and timeline scrubber
├── video-gif-trimmer.component.spec.ts # Component tests (file loading, trimming, GIF export, privacy guard)
└── index.ts                        # ToolDefinition export for TOOL_REGISTRY
```

---

## 3. Core Technical Seams

### Seam 1: Pure TypeScript GIF89a Binary Encoder (`gif-encoder.ts`)
- Header: `GIF89a` (6 bytes).
- Logical Screen Descriptor (width, height, packed fields, background color, aspect ratio).
- Global Color Table (palette of up to 256 colors quantized via color frequency/octree).
- Netscape 2.0 Application Extension for looping (infinite loop `loopCount = 0`).
- Per frame:
  - Graphic Control Extension (disposal method 2, delay time in 1/100s, transparency).
  - Image Descriptor (left, top, width, height, local color table flag).
  - LZW Compression with variable code size (2 to 12 bits) and clear/end-of-information codes.
- Trailer byte: `0x3B` (`;`).

### Seam 2: Core Processing & Dimension Scaling Engine (`engine.ts`)
- Resolution presets: `'original'`, `'720p'`, `'480p'`, `'360p'`, `'240p'`.
- Proportional aspect ratio dimension scaler (`scaleDimensions(width, height, preset)`).
- Time bounds validation and formatting (`formatVideoTime(seconds)`, `calculateTrimBounds(duration, start, end)`).
- Frame delay math: `delayHundredths = Math.round(100 / fps)`.

### Seam 3: Video Extraction & Conversion Pipeline
- HTML5 `<video>` and `<canvas>` frame extraction:
  - Seek video to `t = start + i * (1 / fps)`.
  - Draw frame onto resized offscreen canvas.
  - Extract `ctx.getImageData()`.
  - Pass frames to `createAnimatedGif(frames, options)`.
  - Real-time progress updates (`onProgress(percent, stage)`).

### Seam 4: Angular Standalone Component UI & Signals
- Interactive video player with timeline slider.
- Start and End handle adjustments with "Set Current Time" buttons.
- Real-time progress indicator during conversion.
- Before/After comparison with instant download and Object URL revocation.
- Privacy test verifying zero network calls.

---

## 4. TDD Verification Strategy
1. `engine.spec.ts`: Test GIF header, palette quantization, LZW encoding, dimension scaling, and trim calculation math.
2. `video-gif-trimmer.component.spec.ts`: Test state signals, timeline bounds, preset updates, simulated conversion, and privacy assertion.
