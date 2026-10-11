# Implementation Plan: Spotify Code & Soundwave Art Maker

> **Tool**: `21 - Spotify Code & Soundwave Art Maker`  
> **Route**: `/tools/soundwave-art-maker` (with aliases `/tools/soundwave-art`, `/tools/spotify-code-maker`)  
> **Category**: `audio-video`  
> **Engine Path**: `src/app/tools/audio-video/soundwave-art-maker/`  
> **Standard**: Standalone Component • Angular Signals • BEM SASS • Web Audio API • Vector SVG • jsPDF Vector • Solid 3D STL Mesh • 100% Client-Side DSP • Zero Telemetry

---

## 1. Overview & Architecture

The **Spotify Code & Soundwave Art Maker** transforms audio tracks, voice notes, or Spotify track links into customizable soundwave art, vector laser-cutter templates, print-ready framed posters, and dual-layer 3D printable plaques/keychains.
Key capabilities:
1. **Audio Ingestion & Microphone Voice Recording**:
   - Audio file dropzone (`.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`).
   - Browser microphone live voice recorder (`MediaRecorder` API) for personal voice messages (e.g. "I love you", wedding vows, baby heartbeat).
   - Instant sample presets (Voice Memo, Acoustic Melody, Heartbeat).
2. **Parametric Soundwave Generation**:
   - Configurable bar count (20 to 120 bars), width, spacing, corner radius (pill vs sharp).
   - Symmetry styles: Center-mirrored, Bottom-aligned, Radial circular.
   - Dynamic amplitude normalization, noise floor filtering, and smoothing.
3. **Spotify Scannable Code & Typography Overlay**:
   - Optional Spotify URI / track link parser (`spotify:track:...` or `https://open.spotify.com/track/...`).
   - Spotify scannable code vector representation.
   - Customizable typography: Song title, artist, date, or personalized dedication.
4. **Multi-Format Export Pipeline**:
   - **Scalable Vector Graphics (`.svg`)**: Clean vector paths with metric dimensions for laser cutters (Glowforge, xTool), CNC routers, and vinyl plotters (Cricut, Silhouette).
   - **Print-Ready Poster (`.pdf`)**: High-DPI vector document via `jsPDF` for A4, Letter, and 8×10 inch photo frames.
   - **3D Printable Solid Mesh (`.stl`)**: Physical dual-layer geometry (Baseplate layer 2.0mm + Extruded soundwave bars + optional keychain hole) ready for FDM/SLA slicers (Bambu Studio, PrusaSlicer, Cura).
5. **100% In-Browser Privacy**:
   - Zero audio data uploaded.
   - LocalStorage draft persistence.
   - Immediate Object URL cleanup.

---

## 2. Directory Structure

```
src/app/tools/audio-video/soundwave-art-maker/
├── types.ts                        # Configuration, theme, 3D options, and export interfaces
├── test-fixtures.ts                # Synthetic PCM waveforms, sample tracks, and test configs
├── engine.ts                       # Pure DSP extraction, SVG builder, PDF generator, and STL mesh exporter
├── engine.spec.ts                  # Comprehensive unit tests for DSP, SVG, PDF, and 3D STL generation
├── soundwave-art-maker.component.ts # Standalone component with Signals, 2D art preview, and export actions
├── soundwave-art-maker.component.spec.ts # Component tests (audio upload, voice recording, live preview, privacy)
└── index.ts                        # ToolDefinition export for TOOL_REGISTRY
```

---

## 3. Core Technical Seams

### Seam 1: Audio Sampling & Waveform Extraction
- Input: PCM `Float32Array` audio channel data.
- Downsample into $N$ normalized bars ($N \in [20, 120]$):
  - Split buffer into $N$ equal time slices.
  - Calculate RMS or peak absolute amplitude in each slice:
    $\text{RMS}_i = \sqrt{\frac{1}{M}\sum x_j^2}$.
  - Apply threshold gate and normalize to $[0.08, 1.0]$.
  - Optional smoothing (moving average across neighboring bars).

### Seam 2: Vector SVG Generation
- Input: Array of normalized amplitudes, dimensions, colors, style, typography, and optional Spotify code.
- Builds XML-compliant SVG string with `viewBox`.
- Generates `<rect rx="..." ...>` or path elements for each bar.
- Supports Center-mirrored, Bottom-aligned, and Radial circular paths.
- Embeds title, subtitle, and Spotify code bar elements.

### Seam 3: Vector jsPDF Poster Exporter
- Input: SVG string and poster configuration (paper size, background theme, font size).
- Creates crisp vector PDF with sharp text and solid fills.
- Exports standard A4 / US Letter PDF Blob.

### Seam 4: 3D Manifold STL Generator
- Generates valid binary/ASCII STL facet data:
  - Baseplate: Box $[0, W] \times [0, H] \times [0, T_{\text{base}}]$ with optional cylindrical hole for keychain ring.
  - Extruded soundwave bars: Cuboids positioned on top of the baseplate with height $T_{\text{bar}} = 1.5\text{mm}$ (total height $T_{\text{base}} + T_{\text{bar}}$) for dual-color filament swap.
  - Manifold triangles with outwards-facing normals.
- Returns `model/stl` Blob.

### Seam 5: Angular UI & Privacy Isolation
- Signals for interactive controls: bar count, symmetry, color palette, custom text, audio file, recording state.
- Live SVG preview container.
- Download buttons with instant `URL.revokeObjectURL()`.
- Spies verify zero network requests during all operations.

---

## 4. TDD Testing Plan
- `engine.spec.ts`: Test waveform normalization, SVG formatting, Spotify code parsing, PDF export, and STL triangle generation.
- `soundwave-art-maker.component.spec.ts`: Test signal updates, preset selection, simulated audio upload, SVG download, STL download, and offline privacy guard.
