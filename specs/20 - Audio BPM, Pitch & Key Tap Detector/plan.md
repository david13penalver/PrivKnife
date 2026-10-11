# Implementation Plan: Audio BPM, Pitch & Key Tap Detector

> **Tool**: `20 - Audio BPM, Pitch & Key Tap Detector`  
> **Route**: `/tools/audio-bpm-detector` (with aliases `/tools/bpm-tap-detector`, `/tools/tap-tempo`)  
> **Category**: `audio-video`  
> **Engine Path**: `src/app/tools/audio-video/bpm-tap-detector/`  
> **Standard**: Standalone Component • Angular Signals • BEM SASS • Web Audio API • 100% Client-Side DSP • Zero Telemetry

---

## 1. Overview & Architecture

The **Audio BPM, Pitch & Key Tap Detector** provides real-time client-side audio signal processing (DSP) and tempo extraction for musicians, DJs, and sound designers. It delivers:
1. **Interactive Tap Tempo Engine**: High-precision manual tapping with rolling interval averaging, tempo categorization, and an integrated Web Audio synthesizer metronome click track.
2. **Audio File Analyzer**: Zero-upload client-side audio decoding (`AudioContext.decodeAudioData()`), transient energy onset detection, autocorrelation BPM estimation, and confidence scoring.
3. **Pitch & Musical Key Detector**: Harmonic peak estimation (fundamental Hz, closest musical note, octave, cents detune) and 12-class chromagram profile matching against Krumhansl-Schmuckler profiles for 24 Major/Minor keys + Camelot Wheel codes (e.g., `8B`, `4A`).
4. **Waveform & Visualizer Canvas**: HTML5 Canvas waveform rendering with interactive playback playhead and synchronized beat pulse indicator.
5. **100% Client-Side Privacy**: Zero audio buffers or metadata ever leave the user's browser.

---

## 2. Directory Structure

```
src/app/tools/audio-video/bpm-tap-detector/
├── types.ts                      # Audio analysis, tap state, metronome, and key interfaces
├── test-fixtures.ts              # Synthetic PCM audio signals (sine waves, click trains, tap arrays)
├── engine.ts                     # Pure DSP algorithms (autocorrelation, pitch, chromagram, key, tap)
├── engine.spec.ts                # Unit tests for all mathematical and DSP functions
├── metronome.ts                  # Web Audio oscillator click scheduler (lookahead timer)
├── bpm-tap-detector.component.ts # Angular standalone component with Signals & Canvas
├── bpm-tap-detector.component.spec.ts # Component unit tests (tap, playback, metronome, privacy)
└── index.ts                      # Tool definition export for TOOL_REGISTRY
```

---

## 3. Core DSP Algorithms & Mathematical Seams

### Seam 1: Tap Tempo Math
- Input: Array of timestamps `number[]` (`performance.now()`).
- Auto-reset when interval between consecutive taps > 2500ms.
- Interval calculation: $\Delta t_i = t_i - t_{i-1}$.
- Mean interval $\bar{\Delta t} = \frac{1}{N-1} \sum \Delta t_i$.
- $\text{BPM} = \frac{60000}{\bar{\Delta t}}$.
- Tempo names: Largo (<60), Adagio (60-76), Andante (76-108), Moderato (108-120), Allegro (120-156), Vivace (156-176), Presto (>176) + DJ genre tags (Lo-Fi/Hip Hop, House/EDM, Drum & Bass).

### Seam 2: Audio BPM Detection (Low-Pass + Energy Onset + Autocorrelation)
- Input: PCM `Float32Array` audio channel data and `sampleRate`.
- Downsampling / envelope extraction:
  - Low-pass filter (Butterworth/IIR cutoff ~150Hz) to isolate bass/kick transients.
  - Energy onset envelope: $E[n] = \max(0, x[n]^2 - x[n-1]^2)$ downsampled to ~100Hz-200Hz frame rate.
- Autocorrelation across BPM interval range (60 BPM to 200 BPM, lag corresponding to 0.3s to 1.0s):
  $$R(\tau) = \frac{\sum E[t] E[t+\tau]}{\sqrt{\sum E[t]^2 \sum E[t+\tau]^2}}$$
- Pick highest correlation peak $\tau^* \to \text{BPM} = \frac{60}{\tau^*}$.
- Check octave ambiguities (double / half tempo).
- Calculate confidence metric.

### Seam 3: Pitch & Note Detection (Autocorrelation / Harmonic Peak)
- Input: PCM `Float32Array` frame and `sampleRate`.
- Autocorrelation / zero-crossing distance to find fundamental period $T_0 \to f_0 = \frac{1}{T_0}$.
- Note mapping:
  $$\text{MIDI} = \text{round}\left(69 + 12 \log_2 \frac{f_0}{440}\right)$$
  $$\text{Note} = \text{NOTE\_NAMES}[\text{MIDI} \pmod{12}], \quad \text{Octave} = \lfloor \text{MIDI}/12 \rfloor - 1$$
  $$\text{Cents} = 1200 \log_2 \frac{f_0}{440 \cdot 2^{(\text{MIDI}-69)/12}}$$

### Seam 4: Chromagram & Key Profile Correlation (Krumhansl-Schmuckler)
- Input: PCM data or FFT spectrum.
- Fold frequency energy into 12 semitone chroma bins (C to B).
- Correlate chroma vector against Krumhansl-Kessler 12 Major and 12 Minor key templates:
  $$r = \frac{\sum (X - \bar{X})(Y - \bar{Y})}{\sqrt{\sum (X - \bar{X})^2 \sum (Y - \bar{Y})^2}}$$
- Identify root note and modality (e.g. "A Minor").
- Map to Camelot Wheel system (e.g. "8A").

### Seam 5: Synthesized Metronome
- Native Web Audio `OscillatorNode` + `GainNode`.
- Standard lookahead scheduler (25ms timer checking next 100ms interval).
- Pitch click: 1200 Hz down to 800 Hz woodblock click with fast exponential decay.

---

## 4. Testing Strategy (TDD Red-Green-Refactor)

1. **`engine.spec.ts`**:
   - Synthetic 120 BPM click train produces 120 BPM (±1 BPM).
   - Synthetic 440 Hz sine wave detects A4 pitch (440 Hz, note A, octave 4, 0 cents).
   - Synthetic C Major chord / frequencies identify C Major key (Camelot 8B).
   - Tap tempo calculates exact BPM from sequential timestamp arrays and resets on timeout.
   - Frequency-to-note math tests for boundary frequencies.
2. **`bpm-tap-detector.component.spec.ts`**:
   - Component mounts with default state (idle, 120 BPM tap tempo default).
   - Tap button clicks update tap count, current BPM, and tempo label.
   - Reset button clears tap history.
   - BPM modifier buttons (+1, -1, x2, /2) update tempo accurately.
   - Metronome toggle activates/deactivates click track.
   - File dropzone handles audio file decoding simulation.
   - Privacy verification: Spies on `fetch` and `XMLHttpRequest` confirm zero network calls during audio analysis and metronome playback.

---

## 5. BEM Styling & Design System
- Namespace prefixes: `.c-tap-pad`, `.c-bpm-display`, `.c-metronome`, `.c-waveform-canvas`, `.l-columns`, `.g--*`.
- Dark studio theme palette matching design system tokens (`--color-bg`, `--color-primary`, `--color-surface`).
- Accessible keyboard shortcuts (Spacebar to tap, M to toggle metronome).
