# Test-Driven Development (TDD) Implementation Plan: SVG Optimizer, Path Cleaner & React_Vue Exporter

> **Tool**: `54 - SVG Optimizer, Path Cleaner & React_Vue Exporter`  
> **Route**: `/tools/svg-optimizer-cleaner`  
> **Category**: `dev`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor)

---

## 1. Architecture & Domain Overview

The **SVG Optimizer, Path Cleaner & React_Vue Exporter** is a self-contained, client-side utility built according to the non-negotiable directives in `AGENTS.md`.

### Directory Layout (`src/app/tools/dev/svg-optimizer-cleaner/`)
```
src/app/tools/dev/svg-optimizer-cleaner/
├── index.ts                         # Tool registry metadata & definition
├── types.ts                         # Domain contracts, options, and result interfaces
├── engine.ts                        # Pure client-side computational engine (zero Angular, zero DOM)
├── engine.spec.ts                   # Unit tests for core engine (Seam 1)
├── test-fixtures.ts                 # Synthetic independent test vectors & mocks
├── svg-optimizer-cleaner.component.ts    # Angular Standalone Component with Signals & BEM
├── svg-optimizer-cleaner.component.html  # Accessible UI template
├── svg-optimizer-cleaner.component.scss  # Scoped component styling
└── svg-optimizer-cleaner.component.spec.ts # Component & Privacy Verification Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

Tests live exclusively at public seams to survive internal refactorings while exercising observable behavior:

### Seam 1: `SvgOptimizerEngine` (Pure Processing Boundary — `engine.ts`)
- **Public Interface**:
  - `process(options: SvgOptimizerCleanerOptions): Promise<SvgOptimizerCleanerResult>`
  - `validateOptions(options: SvgOptimizerCleanerOptions): boolean`
- **What it catches**:
  - Algorithmic correctness of data transformations and asset compilations.
  - Correct export encoding for '.svg', '.tsx', '.vue'.
  - Boundary value handling (minimum, maximum, negative, and extreme inputs).
  - Clean error handling on invalid or corrupt input without throwing uncaught exceptions.
- **What it misses**:
  - DOM events, Drag-and-drop bindings, Angular Signal reactivity, visual download prompts, and UI animations.

### Seam 2: `SvgOptimizerCleanerComponent` (Angular UI & Interaction Boundary)
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
export interface SvgOptimizerCleanerOptions {
  floatPrecision: number;
  stripMetadataComments: boolean;
  cleanupIds: boolean;
  collapseUselessGroups: boolean;
  convertColorsToHex: boolean;
  removeDimensionsForViewBox: boolean;
  codeExportFormat: 'svg' | 'react_tsx' | 'vue_sfc' | 'svelte' | 'data_uri';
  componentName: string;
}

export interface SvgOptimizerCleanerResult {
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
- **Input**: Standard default configuration `SvgOptimizerCleanerOptions`.
- **Expected Output**: Valid `SvgOptimizerCleanerResult` with correct MIME type and non-zero byte size.
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
