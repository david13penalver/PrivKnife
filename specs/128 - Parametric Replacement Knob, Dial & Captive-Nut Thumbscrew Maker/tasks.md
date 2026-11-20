# Tasks Checklist: Parametric Replacement Knob, Dial & Captive-Nut Thumbscrew Maker (Spec 128)

> **Tool**: `128 - Parametric Replacement Knob, Dial & Captive-Nut Thumbscrew Maker` (`knob-dial-handwheel-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/knob-dial-handwheel-maker/types.ts` with `KnobDialHandwheelOptions`, `KnobDialMetrics`, DIN 934 hex standards, and defaults.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/knob-dial-handwheel-maker/test-fixtures.ts` covering appliance D-shaft dial, M6 star handwheel, splined knob, and thin-hub invalid cases.

## Phase 2: Seam 1A — Grip Profiles, D-Shaft & Hex Socket CSG (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests asserting min hub-wall guard, all 4 grip curves, DIN 934 M6 hex pocket dimensions, `flatRotationDeg` orientation shift, and zero-NaN geometry.
- [x] **2.2 (Green)**: Implement `validateKnobOptions()` and `generateKnobParts()` in `engine.ts`.

## Phase 3: Seam 1B — Dual-Color Indicator, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` verifying `.3MF` Body + Indicator object separation, single-pass `calculateKnobMetrics()`, binary `.STL` size, and zero network/storage/`Math.random`.
- [x] **3.2 (Green)**: Implement dual-color indicator geometry, metrics, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` testing progress events, transferable `.STL`/`.3MF` outputs, and invalid bounds handling.
- [x] **4.2 (Green)**: Implement `worker.ts` wrapping pure `engine.ts` calls.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `knob-dial-handwheel-maker.component.spec.ts` asserting section cutaway toggle, `.c-input__control`/`.c-input__slider`, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `knobDialHandwheelMaker` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 128 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.
