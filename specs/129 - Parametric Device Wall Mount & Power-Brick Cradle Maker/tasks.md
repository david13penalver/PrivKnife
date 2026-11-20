# Tasks Checklist: Parametric Device Wall Mount & Power-Brick Cradle Maker (Spec 129)

> **Tool**: `129 - Parametric Device Wall Mount & Power-Brick Cradle Maker` (`device-wall-cradle-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/device-wall-cradle-maker/types.ts` with `DeviceWallCradleOptions`, `DeviceCradleMetrics`, device presets, and defaults.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/device-wall-cradle-maker/test-fixtures.ts` with under-desk rail pair, GaN power-brick U-cradle, remote pocket, and invalid wall thickness fixtures.

## Phase 2: Seam 1A — Profiles, Clearances & Rail Pairing (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests asserting `wallThicknessMm >= 2.8` validation, exact inner clearance computation, 2-part rail generation, and zero-NaN `Z_min === 0` geometry.
- [x] **2.2 (Green)**: Implement `validateDeviceCradleOptions()` and `generateDeviceCradleParts()` in `engine.ts`.

## Phase 3: Seam 1B — Countersinks, Thermal Vents, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` verifying thermal vent subtraction, `external_ears` countersunk screw bores, single-pass `calculateDeviceCradleMetrics()`, binary `.STL`, `.3MF` part separation, and zero network/storage/`Math.random`.
- [x] **3.2 (Green)**: Implement vent cutouts, countersink bores, metrics, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` testing progress events, transferable `.STL`/`.3MF` export buffers, and invalid option rejection.
- [x] **4.2 (Green)**: Implement `worker.ts` delegating off-thread CSG exports.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `device-wall-cradle-maker.component.spec.ts` verifying device quick-presets, `.c-input__control`/`.c-input__slider` bindings, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `deviceWallCradleMaker` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 129 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.
