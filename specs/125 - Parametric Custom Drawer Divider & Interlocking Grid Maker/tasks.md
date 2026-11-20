# Tasks Checklist: Parametric Custom Drawer Divider & Interlocking Grid Maker (Spec 125)

> **Tool**: `125 - Parametric Custom Drawer Divider & Interlocking Grid Maker` (`drawer-divider-grid-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/drawer-divider-grid-maker/types.ts` with `DrawerDividerGridOptions`, `DrawerGridMetrics`, bed size presets, and defaults.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/drawer-divider-grid-maker/test-fixtures.ts` covering standard, unequal-ratio, oversized-split (`500mm` on `220mm` bed), and invalid bounds inputs.

## Phase 2: Seam 1A — Ratio Normalization, Half-Lap Notches & Dovetail Splits (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests asserting normalized unequal splits, `>= 12mm` notch clearance around every dovetail seam, zero-NaN slat meshes, and valid bounds rejection.
- [x] **2.2 (Green)**: Implement `validateDrawerGridOptions()`, `planSlatSplits()`, and `generateDrawerGridParts()` in `engine.ts`.

## Phase 3: Seam 1B — Flat-Plate Layout, Metrics & STL/3MF/ZIP Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` checking `flat_plates` `Z = 0` orientation, single-pass `calculateDrawerGridMetrics()`, binary `.STL`, multi-object `.3MF`, and zero `fetch`/`Storage.setItem`/`Math.random`.
- [x] **3.2 (Green)**: Implement flat plate packer, single-pass metrics, `exportToBinaryStl()`, `exportTo3mf()`, and `exportPlateZip()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` verifying progress callbacks, transferable buffer responses, and graceful validation errors.
- [x] **4.2 (Green)**: Implement `worker.ts` handling off-thread slat pack exports.

## Phase 5: Seam 3 — Angular Component, WebGL Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `drawer-divider-grid-maker.component.spec.ts` asserting view-mode switch (`assembled` vs `flat_plates`), `.c-input__control`/`.c-input__slider`, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `drawerDividerGridMaker` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 125 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.
