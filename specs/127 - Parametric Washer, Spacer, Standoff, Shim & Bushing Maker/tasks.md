# Tasks Checklist: Parametric Washer, Spacer, Standoff, Shim & Bushing Maker (Spec 127)

> **Tool**: `127 - Parametric Washer, Spacer, Standoff, Shim & Bushing Maker` (`washer-spacer-shim-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/washer-spacer-shim-maker/types.ts` with `WasherSpacerShimOptions`, `HardwarePartMetrics`, `M2–M10` bolt preset clearances, and defaults.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/washer-spacer-shim-maker/test-fixtures.ts` with bushing, hex standoff, leveling wedge, U-slot shim, and thin-wall rejection fixtures.

## Phase 2: Seam 1A — Closed Lathe, Slotted Shims & Wedge Profiles (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests verifying `< 0.8mm` radial-wall rejection, large-chamfer auto-clamping, monotonic wedge slope, U-slot clearance, and zero-NaN `Z = 0` grounding.
- [x] **2.2 (Green)**: Implement `validateHardwareOptions()` and `generateSingleHardwareGeometry()` in `engine.ts`.

## Phase 3: Seam 1B — Build-Plate Array, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` verifying 1–24 grid array cloning, `highAspectWarning` trigger, single-pass `calculateHardwareMetrics()`, binary `.STL` length, `.3MF` zip structure, and zero network/storage/`Math.random`.
- [x] **3.2 (Green)**: Implement plate array builder, metrics, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` checking progress callbacks, transferable `.STL`/`.3MF` buffers, and invalid bounds errors.
- [x] **4.2 (Green)**: Implement `worker.ts` wrapping pure `engine.ts` functions.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `washer-spacer-shim-maker.component.spec.ts` checking M2–M10 quick presets, `.c-input__control`/`.c-input__slider` classes, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `washerSpacerShimMaker` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 127 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.
