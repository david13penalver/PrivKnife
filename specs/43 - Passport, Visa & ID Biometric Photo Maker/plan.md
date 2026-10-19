# Test-Driven Development (TDD) Implementation Plan: Passport, Visa & ID Biometric Photo Maker

> **Tool**: `43 - Passport, Visa & ID Biometric Photo Maker`  
> **Route**: `/tools/passport-biometric-photo`  
> **Category**: `media`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor)

---

## 1. Architecture & Domain Overview

The **Passport, Visa & ID Biometric Photo Maker** is a self-contained, client-side utility built according to the non-negotiable directives in `AGENTS.md`.

### Directory Layout (`src/app/tools/media/passport-biometric-photo/`)
```
src/app/tools/media/passport-biometric-photo/
├── index.ts                         # Tool registry metadata & definition
├── types.ts                         # Domain contracts, options, and result interfaces
├── engine.ts                        # Pure client-side computational engine (zero Angular, zero DOM)
├── engine.spec.ts                   # Unit tests for core engine (Seam 1)
├── test-fixtures.ts                 # Synthetic independent test vectors & mocks
├── passport-biometric-photo.component.ts    # Angular Standalone Component with Signals & BEM
├── passport-biometric-photo.component.html  # Accessible UI template
├── passport-biometric-photo.component.scss  # Scoped component styling
└── passport-biometric-photo.component.spec.ts # Component & Privacy Verification Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

Tests live exclusively at public seams to survive internal refactorings while exercising observable behavior:

### Seam 1: `PassportEngine` (Pure Processing Boundary — `engine.ts`)
- **Public Interface**:
  - `process(options: PassportBiometricPhotoOptions): Promise<PassportBiometricPhotoResult>`
  - `validateOptions(options: PassportBiometricPhotoOptions): boolean`
- **What it catches**:
  - Algorithmic correctness of data transformations and asset compilations.
  - Correct export encoding for '.jpg', '.pdf', '.png'.
  - Boundary value handling (minimum, maximum, negative, and extreme inputs).
  - Clean error handling on invalid or corrupt input without throwing uncaught exceptions.
- **What it misses**:
  - DOM events, Drag-and-drop bindings, Angular Signal reactivity, visual download prompts, and UI animations.

### Seam 2: `PassportBiometricPhotoComponent` (Angular UI & Interaction Boundary)
- **Public Interface**:
  - User interacts with configuration controls &rarr; signals update and preview regenerates.
  - User clicks primary action button &rarr; triggers export generation and displays download link.
  - User triggers Reset / Clear &rarr; clears state and revokes all active `ObjectURL`s.
- **What it catches**:
  - Angular Signals reactivity and form state synchronization.
  - BEM styling contract compliance (`.c-card`, `.c-badge--privacy`, `.c-button`, `.c-input`, `.c-preview`).
  - Zero Network Exfiltration: Asserts that 0 HTTP requests (`fetch` / `XMLHttpRequest`) are made during processing.
  - Memory Hygiene: Asserts that `URL.revokeObjectURL()` is called when resetting and on `ngOnDestroy`.
- **What it misses**:
  - Algorithmic edge cases covered at Seam 1.

### Seam 3: `ToolRegistry & AppRoutes` (Integration Boundary)
- **Public Interface**:
  - `toolRegistry` entry in `src/app/tools/tool-registry.ts`.
  - Lazy route definition in `src/app/app.routes.ts`.
- **What it catches**:
  - Route reachability, SEO title & meta description tags, category registration.
- **What it misses**:
  - Interactive UI behavior and binary parsing.

---

## 3. Data Models (`types.ts`)

```typescript
export interface PassportBiometricPhotoOptions {
  countryPreset: 'us_2x2_inch' | 'eu_schengen_35x45mm' | 'uk_35x45mm' | 'canada_50x70mm' | 'japan_30x40mm';
  printSheetSize: '4x6_inches' | 'a4' | 'a6' | 'single_digital';
  backgroundColor: 'original' | 'pure_white' | 'off_white' | 'light_grey';
  cutGuideLines: boolean;
  exportDpi: number;
  zoomLevel: number;
  tiltAngleDeg: number;
}

export interface PassportBiometricPhotoResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
}
```

---

## 4. Vertical Slices & Test Vectors

### Slice 1: Pure Engine Math & Transformation (Seam 1)
- **Input**: Standard default configuration `PassportBiometricPhotoOptions`.
- **Expected Output**: Valid `PassportBiometricPhotoResult` with correct MIME type and non-zero byte size.
- **Test Vectors**:
  - Minimum boundary values (smallest permissible dimensions/values).
  - Maximum boundary values (stress test thresholds).
  - Corrupted or invalid parameter combinations.

### Slice 2: Angular Component UI & Reactive State (Seam 2)
- **Inputs**: User interaction events on controls.
- **Expected Outputs**: Reactive updates reflected in signals, live preview canvas rendered.

### Slice 3: Privacy & Zero Exfiltration Assertion (Seam 2)
- **Spy**: `window.fetch` and `XMLHttpRequest.prototype.open`.
- **Assert**: Call count is strictly `0` across the full execution lifecycle.

---

## 5. Edge Cases & Memory Hygiene Checklist

- [ ] Verify `URL.revokeObjectURL()` is called on every download trigger cleanup and in `ngOnDestroy`.
- [ ] Ensure non-blocking execution to keep main UI thread at 60 FPS.
- [ ] Assert zero network calls dispatched during tool operation.
