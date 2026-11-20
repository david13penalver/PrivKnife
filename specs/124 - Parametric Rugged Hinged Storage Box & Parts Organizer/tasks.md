# Tasks Checklist: Parametric Rugged Hinged Storage Box & Parts Organizer (Spec 124)

> **Tool**: `124 - Parametric Rugged Hinged Storage Box & Parts Organizer` (`rugged-hinged-box-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/rugged-hinged-box-maker/types.ts` with `RuggedHingedBoxOptions`, `RuggedBoxMetrics`, hinge/latch enums, and defaults.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/rugged-hinged-box-maker/test-fixtures.ts` with small/large box presets, TPU gasket fixture, and invalid bounds cases.

## Phase 2: Seam 1A — Shell, Ribs, Hinges & Latches (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests in `engine.spec.ts` verifying inner cavity clearance, external rib geometry, hinge offset separation, M3 bore cutouts, 1-vs-2 latch scaling, and invalid parameter guards.
- [x] **2.2 (Green)**: Implement `validateRuggedBoxOptions()` and `generateRuggedBoxParts()` in `engine.ts`.

## Phase 3: Seam 1B — Dividers, Gasket Loop, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` asserting gasket loop `.3mf` object separation, divider tray generation, single-pass `calculateRuggedBoxMetrics()`, valid binary `.STL`, and zero network/storage/`Math.random` calls.
- [x] **3.2 (Green)**: Implement `calculateRuggedBoxMetrics()`, gasket loop geometry, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` verifying progress notifications, transferable buffer exports, and malformed input handling.
- [x] **4.2 (Green)**: Implement `worker.ts` delegating STL/3MF generation cleanly off the main thread.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `rugged-hinged-box-maker.component.spec.ts` asserting open/closed preview toggle, `.c-input__control`/`.c-input__slider` bindings, non-overlapping HUD, GPU `.dispose()`, `worker.terminate()`, and paired `createdObjectUrls: string[]` cleanup.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `ruggedHingedBoxMaker` translations across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 124 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.
