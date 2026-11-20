# Tasks Checklist: Parametric Cable Comb, Travel Cord Winder & Wall Clip Maker (Spec 130)

> **Tool**: `130 - Parametric Cable Comb, Travel Cord Winder & Wall Clip Maker` (`cable-comb-clip-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/cable-comb-clip-maker/types.ts` with `CableCombClipOptions`, `CableToolMetrics`, cable gauge presets, and defaults.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/cable-comb-clip-maker/test-fixtures.ts` with desk comb, 2m travel winder, P-clip batch, and undersized-core failure cases.

## Phase 2: Seam 1A — Teardrop Slots, P-Clips & Travel Spools (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests verifying teardrop pinch ratio math, `winderCoreDiameterMm` bend guard, multi-clip plate layout, and zero-NaN geometry.
- [x] **2.2 (Green)**: Implement `validateCableToolOptions()` and `generateCableToolParts()` in `engine.ts`.

## Phase 3: Seam 1B — Cord Capacity Solver, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` verifying `cordCapacityOk` boundary detection, single-pass metrics, binary `.STL` byte count, multi-object `.3MF`, and zero network/storage/`Math.random`.
- [x] **3.2 (Green)**: Implement cord-capacity solver, `calculateCableToolMetrics()`, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` testing progress events, transferable `.STL`/`.3MF` ArrayBuffers, and malformed option error responses.
- [x] **4.2 (Green)**: Implement `worker.ts` wrapping pure `engine.ts` functions.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `cable-comb-clip-maker.component.spec.ts` checking gauge presets, `.c-input__control`/`.c-input__slider`, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `cableCombClipMaker` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 130 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.
