# Plan 62: TDD Implementation Plan — Curved & Flat 3D Lithophane Maker Remediation

- **Spec ID**: `62`
- **Remediates Tool**: `32 - Curved & Flat 3D Lithophane Maker` (`lithophane-maker`)
- **Route**: `/tools/lithophane-maker`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/lithophane-maker/
├── types.ts                                 # Add worker request/response types & progress callback signature
├── engine.ts                                # Add optional onProgress callback to processLithophane()
├── engine.spec.ts                           # Unit tests for progress callbacks, 4 geometry styles, and STL/3MF validity
├── worker.ts                                # (New) Dedicated Web Worker for high-resolution lithophane mesh & export packaging
├── lithophane-maker.component.ts            # Wire worker + progress signals, add wheel zoom & touch orbit, add PNG snapshot, revoke URLs immediately, fix .c-input__slider
├── lithophane-maker.component.scss          # (New/Extract) Theme-aware CSS variables for metrics/slicer cards, white-space: normal on presets, >=38px touch targets
└── lithophane-maker.component.spec.ts       # Component tests for Light Mode CSS vars, touch/wheel handlers, immediate URL revocation, and PNG snapshot
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Functions Under Test**:
  - `processLithophane(grayscaleGrid, gridW, gridH, options, onProgress?): Promise<LithophaneEngineOutput>`
  - `generateLithophaneGeometry(grayscaleGrid, gridW, gridH, options): THREE.BufferGeometry`
- **Concrete Assertions**:
  - Calling `processLithophane(grid, 32, 32, options, onProgress)` invokes `onProgress` with monotonically increasing percentages ending at `100` and returns valid `.stl` (`84 + triCount * 50` bytes) and `.3mf` (`JSZip` package).

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / Component)
- **Worker Protocol**:
  - Request: `{ id: number; grayscaleGrid: Float32Array; gridW: number; gridH: number; options: LithophaneMakerOptions }`
  - Response: `{ id: number; type: 'progress' | 'result' | 'error'; percent?: number; buffer?: ArrayBuffer; mimeType?: string; filename?: string; metrics?: LithophaneMetrics; error?: string }`
- **Concrete Assertions**:
  - During `downloadFormat('stl')`, `isGenerating()` transitions `true → false` and `progressPercent()` updates cleanly.
  - `ngOnDestroy()` terminates any active `Worker`.

### Seam 3: Component State, Controls, Viewport Interaction & Resource Disposal Boundary (`lithophane-maker.component.ts` / `.spec.ts`)
- **Concrete Assertions**:
  - `onWheel(WheelEvent)` adjusts `camera.position.z` within `[60, 350]` and calls `event.preventDefault()`.
  - `onTouchStart(TouchEvent)` and `onTouchMove(TouchEvent)` rotate `lithoMesh.rotation.y` and `lithoMesh.rotation.x` on single-finger touch drag.
  - `onFileDropped(file)` revokes the created object URL immediately upon image load/error (`URL.revokeObjectURL` spy called).
  - `downloadFormat('stl')` and `downloadPngSnapshot()` call `URL.revokeObjectURL()` immediately after triggering the anchor click.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`lithophane-maker.component.scss`)
- **Concrete Assertions**:
  - `.metric-value` and `.slicer-list` use `var(--color-text-primary)` / `var(--color-text-secondary)` instead of hardcoded `#f3f4f6` / `#cbd5e1`.
  - `.litho-preset-btn` sets `white-space: normal` so desktop preset descriptions wrap inside the button.
  - All `<input type="range">` elements use `.c-input__slider` (`min-height: 38px`).

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Light Mode Contrast & Desktop Preset Wrapping (`DEFECT-32-01`, `DEFECT-32-02`, `DEFECT-32-05`)
1. **Red**:
   - In `lithophane-maker.component.spec.ts`, assert that all `<input type="range">` controls carry `.c-input__slider` (not `.c-input--slider`), and verify that the component styles do not contain hardcoded `#f3f4f6` on `.metric-value` or `#cbd5e1` on `.slicer-list`.
2. **Green**:
   - Replace `.c-input--slider` with `.c-input__slider` in `lithophane-maker.component.ts`.
   - Replace hardcoded dark-theme hex colors in `.metric-card`, `.metric-label`, `.metric-value`, `.slicer-box`, `.slicer-title`, and `.slicer-list` with CSS custom properties (`var(--color-bg-subtle)`, `var(--color-border)`, `var(--color-text-primary)`, `var(--color-text-secondary)`).
   - Add `white-space: normal; min-width: 0; height: auto;` to `.litho-preset-btn` and increase slider/checkbox touch target height to `>= 38px`.
3. **Refactor**:
   - Extract component styles into `lithophane-maker.component.scss`.

### Slice 2: 3D Viewport Touch Orbit, Mouse-Wheel Zoom & `.PNG` Snapshot Export (`DEFECT-32-03`, `DEFECT-32-05`)
1. **Red**:
   - In `lithophane-maker.component.spec.ts`, write tests for `onWheel(event)`, `onTouchStart(event)`, `onTouchMove(event)`, `onTouchEnd()`, and `downloadPngSnapshot()`. Assert that wheel events zoom the camera, touch move events rotate `lithoMesh`, and `downloadPngSnapshot()` triggers a `.png` download and revokes the object URL.
2. **Green**:
   - Add `(wheel)="onWheel($event)"`, `(touchstart)="onTouchStart($event)"`, `(touchmove)="onTouchMove($event)"`, and `(touchend)="onTouchEnd()"` bindings to `.litho-viewport` in `lithophane-maker.component.ts` with `touch-action: none`.
   - Implement `downloadPngSnapshot()` and add a `Snapshot .PNG` button in the export panel.
3. **Refactor**:
   - Share rotation clamping logic (`[-Math.PI / 2.2, Math.PI / 2.2]`) between mouse and touch handlers.

### Slice 3: Web Worker Offloading, Live Progress Bar & Immediate `URL.revokeObjectURL()` (`DEFECT-32-04`)
1. **Red**:
   - Write a unit test in `engine.spec.ts` asserting `processLithophane(..., onProgress)` invokes `onProgress` with progress steps up to `100`.
   - Write a component test spying on `URL.revokeObjectURL` during `downloadFormat('stl')` and `onFileDropped(file)`, asserting immediate revocation without waiting for `ngOnDestroy()`.
2. **Green**:
   - Add `onProgress?: (percent: number) => void` to `processLithophane()` in `engine.ts`.
   - Create `worker.ts` to run `processLithophane()` in a background worker and stream progress messages back to the component.
   - Update `downloadFormat()` in `lithophane-maker.component.ts` to toggle `isGenerating.set(true)`, update `progressPercent`, use the worker (with direct fallback in test environments), and revoke `url` immediately after `a.click()`.
   - Update `onFileDropped()` to call `URL.revokeObjectURL(objectUrl)` inside `img.onload` and `img.onerror`.
3. **Refactor**:
   - Ensure `ngOnDestroy()` terminates any active worker and disposes all Three.js resources.
