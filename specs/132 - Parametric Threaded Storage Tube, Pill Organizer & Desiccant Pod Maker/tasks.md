# Tasks Checklist: Parametric Threaded Storage Tube, Pill Organizer & Desiccant Pod Maker (Spec 132)

> **Tool**: `132 - Parametric Threaded Storage Tube, Pill Organizer & Desiccant Pod Maker` (`threaded-tube-pill-organizer`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/threaded-tube-pill-organizer/types.ts` with `ThreadedTubePillOptions`, `ContainerToolMetrics`, spool presets, and thread bounds.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/threaded-tube-pill-organizer/test-fixtures.ts` covering knurled canister, Bambu desiccant pod, 7-day/14-slot pill organizer, and slit > 1.8mm rejection.

## Phase 2: Seam 1A — Helical Thread Sweep, Spool Slits & Pill Organizer (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests verifying helix clearance offset (`+2 * threadClearanceMm`), `desiccantSlitWidthMm <= 1.8mm` validation, `7`/`14` curved pill pockets, and zero-NaN geometry.
- [x] **2.2 (Green)**: Implement `validateContainerOptions()`, `buildHelixThreadGeometry()`, and `generateContainerParts()` in `engine.ts`.

## Phase 3: Seam 1B — Labels, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` verifying single-pass metrics, `.3MF` Body + Cap/Lid + Day Labels separation, binary `.STL` size, and zero network/storage/`Math.random`.
- [x] **3.2 (Green)**: Implement metrics, day-letter embossing, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` testing progress events, transferable `.STL`/`.3MF` ArrayBuffers, and invalid parameter errors.
- [x] **4.2 (Green)**: Implement `worker.ts` wrapping pure `engine.ts` functions.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `threaded-tube-pill-organizer.component.spec.ts` checking spool presets, flat-plate toggle, `.c-input__control`/`.c-input__slider`, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `threadedTubePillOrganizer` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 132 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.

The focused suites, production build, QA checks, and English/Spanish browser downloads passed. Initial JavaScript grew from 393,873 to 395,502 bytes, within the 2,500-byte change allowance. The absolute budget and PDF redaction failures predate this spec. Three.js uses random IDs internally, while mesh coordinates and export bytes are deterministic.
