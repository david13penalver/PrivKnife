# Tasks Checklist: Parametric 3D Printer Calibration, Clearance & Fastener Fit Suite (Spec 134)

> **Tool**: `134 - Parametric 3D Printer Calibration, Clearance & Fastener Fit Suite` (`calibration-tolerance-suite`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/calibration-tolerance-suite/types.ts` with `CalibrationToleranceOptions`, `CalibrationMetrics`, printer bed/nozzle presets, and fastener table.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/calibration-tolerance-suite/test-fixtures.ts` covering spin gauge, M4 fastener block, overhang petals, 256mm bed sheet, and invalid input cases.

## Phase 2: Seam 1A — Clearance Spin Pins, Fastener Block & Z-Locked Bed Sheet (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests asserting CSV clearance parsing, exact `zMax === layerHeightMm` lock, `M4` bore/hex tolerances, bridge/overhang steps, and zero-NaN geometry.
- [x] **2.2 (Green)**: Implement `parseClearanceList()`, `validateCalibrationOptions()`, and `generateCalibrationParts()` in `engine.ts`.

## Phase 3: Seam 1B — Labels, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` verifying `.3MF` multi-object pin & label splits, nozzle-scaled stroke labels, single-pass `calculateCalibrationMetrics()`, binary `.STL` size, and zero network/storage/`Math.random`.
- [x] **3.2 (Green)**: Implement embossed gauge labels, metrics, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` testing progress events, transferable `.STL`/`.3MF` ArrayBuffers, and malformed option error reporting.
- [x] **4.2 (Green)**: Implement `worker.ts` wrapping pure `engine.ts` functions.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `calibration-tolerance-suite.component.spec.ts` checking bed/nozzle quick-presets, `.c-input__control`/`.c-input__slider`, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `calibrationToleranceSuite` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 134 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.

The focused suites, production build, QA checks, and English/Spanish downloads passed. Chromium rendered and exported STL for all 12 modes across Specs 131–134. Initial JavaScript grew from 397,001 to 398,654 bytes, within the 2,500-byte change allowance. The absolute 200,000-byte budget still fails and was already exceeded on the Spec 130 baseline. Three.js uses random object IDs internally. The generated dimensions and binary geometry are deterministic.
