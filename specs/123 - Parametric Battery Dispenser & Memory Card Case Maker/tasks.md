# Tasks Checklist: Parametric Battery Dispenser & Memory Card Case Maker (Spec 123)

> **Tool**: `123 - Parametric Battery Dispenser & Memory Card Case Maker` (`battery-sdcard-case-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/battery-sdcard-case-maker/types.ts` with `BatterySdcardCaseOptions`, `BatteryCaseMetrics`, cell/card dimension tables, and defaults.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/battery-sdcard-case-maker/test-fixtures.ts` with dispenser, mixed memory-card case, sliding lid, and invalid edge-case fixtures.

## Phase 2: Seam 1A — Validation & CSG Geometry Engine (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests in `engine.spec.ts` verifying 7 battery presets, 4 mount styles, chute width clearance math, zero-slot card rejection, and finite zero-NaN meshes.
- [x] **2.2 (Green)**: Implement `validateBatteryCaseOptions()` and `generateBatteryCaseParts()` in `engine.ts` (`three` + `three-bvh-csg`).

## Phase 3: Seam 1B — Single-Pass Metrics, Multi-Color `.3MF` & Binary `.STL` (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` asserting single-pass `calculateMetrics()`, `84 + N*50` binary `.STL`, multi-object `<object>` `.3MF` zip XML (Body + Lid + Label), and zero `fetch`/`Storage.setItem`/`Math.random`.
- [x] **3.2 (Green)**: Implement `calculateMetrics()`, vector embossed label builder, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` testing progress events, transferable `ArrayBuffer` `.STL`/`.3MF` responses, and error handling on invalid options.
- [x] **4.2 (Green)**: Implement `worker.ts` wrapping pure `engine.ts` exports off the main UI thread.

## Phase 5: Seam 3 — Angular Standalone Component, WebGL Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `battery-sdcard-case-maker.component.spec.ts` testing privacy badge, single geometry rebuild per parameter update, `.c-input__control`/`.c-input__slider` classes, HUD layout, `.dispose()` calls, paired `createdObjectUrls: string[]` revocation on `reset()` + `ngOnDestroy()`, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and minimal lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `batterySdcardCaseMaker` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, add test in `tool-registry.spec.ts`, add lazy route in `app.routes.ts`, and add card in `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, increment expected count in `qa/smoke.mjs` & `qa/ads.test.mjs`, and mark Spec 123 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.
