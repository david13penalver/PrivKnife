# Tasks Checklist: Parametric Air-Vented Funnel & Exact-Volume Measuring Scoop Maker (Spec 131)

> **Tool**: `131 - Parametric Air-Vented Funnel & Exact-Volume Measuring Scoop Maker` (`funnel-scoop-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/funnel-scoop-maker/types.ts` with `FunnelScoopOptions`, `FunnelScoopMetrics`, preset sizes, and bounds.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/funnel-scoop-maker/test-fixtures.ts` with resin bottle funnel, 30mL/100mL scoops, and narrow-spout rejection cases.

## Phase 2: Seam 1A — Volume Root Solver & Lathe Funnel/Scoop (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests verifying analytical frustum volume accuracy (`± 0.1 mL`), minimum `>= 3.2mm` flow bore validation, air-vent rib count, and zero-NaN geometry on `Z = 0`.
- [x] **2.2 (Green)**: Implement `solveScoopFrustumDimensions()`, `validateFunnelScoopOptions()`, and `generateFunnelScoopParts()` in `engine.ts`.

## Phase 3: Seam 1B — Embossed Labels, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` verifying `.3MF` multi-object label split, single-pass `calculateFunnelScoopMetrics()`, binary `.STL` byte count, and zero network/storage/`Math.random`.
- [x] **3.2 (Green)**: Implement embossed volume text, metrics, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` checking progress events, transferable `.STL`/`.3MF` ArrayBuffers, and invalid parameter rejection.
- [x] **4.2 (Green)**: Implement `worker.ts` wrapping pure `engine.ts` functions.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `funnel-scoop-maker.component.spec.ts` checking quick-volume chips, `.c-input__control`/`.c-input__slider`, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `funnelScoopMaker` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 131 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.

The focused suites, production build, QA checks, and English/Spanish browser downloads passed. Initial JavaScript grew from 392,144 to 393,873 bytes, within the 2,500-byte change allowance. The absolute bundle budget and existing PDF redaction tests also fail on the Spec 130 baseline. Three.js allocates random internal object IDs. Geometry and exports are deterministic.
