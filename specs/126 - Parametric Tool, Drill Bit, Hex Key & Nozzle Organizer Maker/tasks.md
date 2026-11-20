# Tasks Checklist: Parametric Tool, Drill Bit, Hex Key & Nozzle Organizer Maker (Spec 126)

> **Tool**: `126 - Parametric Tool, Drill Bit, Hex Key & Nozzle Organizer Maker` (`tool-bit-holder-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/tool-bit-holder-maker/types.ts` with `ToolBitHolderOptions`, `ToolSlotItem`, `ToolHolderMetrics`, presets, and bounds.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/tool-bit-holder-maker/test-fixtures.ts` covering metric drills, hex bits, Allen keys, printer nozzles, and malformed custom specs.

## Phase 2: Seam 1A — Slot Parser & Stepped CSG Bore Geometry (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests asserting CSV/fraction parsing, circumradius hex socket geometry, floor-thickness clamping, and zero-NaN stepped meshes.
- [x] **2.2 (Green)**: Implement `parseToolSlots()`, `validateToolHolderOptions()`, and `generateToolHolderParts()` in `engine.ts`.

## Phase 3: Seam 1B — Labels, Magnet Pockets, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` testing dual-color `.3MF` labels object, bottom magnet pockets, single-pass `calculateToolHolderMetrics()`, binary `.STL`, and zero network/storage/`Math.random`.
- [x] **3.2 (Green)**: Implement embossed size label geometry, magnet cutouts, `calculateToolHolderMetrics()`, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` asserting progress callbacks, transferable buffer STL/3MF output, and clean invalid-input error reporting.
- [x] **4.2 (Green)**: Implement `worker.ts` wrapping `engine.ts` exports.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `tool-bit-holder-maker.component.spec.ts` checking preset switching, `.c-input__control`/`.c-input__slider`, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `toolBitHolderMaker` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 126 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.
