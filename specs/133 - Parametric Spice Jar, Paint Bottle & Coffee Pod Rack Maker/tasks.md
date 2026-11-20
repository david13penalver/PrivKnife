# Tasks Checklist: Parametric Spice Jar, Paint Bottle & Coffee Pod Rack Maker (Spec 133)

> **Tool**: `133 - Parametric Spice Jar, Paint Bottle & Coffee Pod Rack Maker` (`jar-bottle-rack-maker`)  
> **Rule**: Strict Red → Green → Refactor per slice. Commit atomically when complete.

---

## Phase 1: Contracts & Test Fixtures
- [x] **1.1**: Create `PrivKnife/src/app/tools/3d/jar-bottle-rack-maker/types.ts` with `JarBottleRackOptions`, `JarRackMetrics`, bottle/pod presets, and defaults.
- [x] **1.2**: Create `PrivKnife/src/app/tools/3d/jar-bottle-rack-maker/test-fixtures.ts` covering spice riser, Vallejo 17mL honeycomb, Nespresso track, and thin-web invalid fixtures.

## Phase 2: Seam 1A — Hex Packing, Stadium Tiers & Pocket CSG (Red → Green)
- [x] **2.1 (Red)**: Write Seam 1A tests asserting `webWallThicknessMm >= 1.8` guard, hex staggered center compression (`sqrt(3)/2`), zero-overlap pocket centers, and zero-NaN geometry.
- [x] **2.2 (Green)**: Implement `validateJarRackOptions()`, `computeWellCoordinates()`, and `generateJarRackParts()` in `engine.ts`.

## Phase 3: Seam 1B — Vaulted Relief, Side Dovetails, Metrics & STL/3MF Export (Red → Green)
- [x] **3.1 (Red)**: Extend `engine.spec.ts` verifying vaulted underside mass reduction, side dovetail geometry, single-pass `calculateJarRackMetrics()`, `.STL`/`.3MF` formats, and zero network/storage/`Math.random`.
- [x] **3.2 (Green)**: Implement vaulted relief, side dovetails, metrics, `exportToBinaryStl()`, and `exportTo3mf()` in `engine.ts`.

## Phase 4: Seam 2 — Dedicated Web Worker (Red → Green)
- [x] **4.1 (Red)**: Write `worker.spec.ts` testing progress events, transferable `.STL`/`.3MF` buffers, and malformed option error reporting.
- [x] **4.2 (Green)**: Implement `worker.ts` wrapping pure `engine.ts` calls.

## Phase 5: Seam 3 — Angular Component, Disposal & BEM UI (Red → Green)
- [x] **5.1 (Red)**: Write `jar-bottle-rack-maker.component.spec.ts` checking bottle presets, `.c-input__control`/`.c-input__slider`, GPU `.dispose()`, `worker.terminate()`, paired `createdObjectUrls: string[]` cleanup, and zero network/storage calls.
- [x] **5.2 (Green)**: Implement `*.component.ts`, `*.component.html`, `*.component.scss` (`< 6 KB`), and lazy `index.ts` (zero `CommonModule`/pipes).

## Phase 6: Seam 4 — Integration, Verification & Atomic Commit
- [x] **6.1**: Add `jarBottleRackMaker` keys across all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`).
- [x] **6.2**: Register in `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, and `home.ts`.
- [x] **6.3**: Update `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and mark Spec 133 `[x]` in `specs/README.md`.
- [x] **6.4**: Verify `ng test`, `npm run qa:test`, `npm run build`, and `qa:bundle-budget` delta (`<= +2,500 B`), then commit atomically.

The focused suites include closed-mesh checks for the three layouts and the stadium dovetail. The production build, QA checks, English/Spanish downloads, and full isolated unit suite passed. Initial JavaScript grew from 395,502 to 397,001 bytes, within the 2,500-byte change allowance. The absolute budget already failed before Spec 131. Three.js uses random IDs internally. Rack geometry remains deterministic.
