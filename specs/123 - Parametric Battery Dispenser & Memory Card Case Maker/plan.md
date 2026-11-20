# Test-Driven Development (TDD) Implementation Plan: Parametric Battery Dispenser & Memory Card Case Maker

> **Spec ID**: `123`  
> **Slug**: `battery-sdcard-case-maker`  
> **Route**: `/tools/battery-sdcard-case-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/battery-sdcard-case-maker/
├── index.ts                                  # Lazy ToolDefinition ONLY (zero eager Three.js import)
├── types.ts                                  # Domain interfaces, cell/card presets & defaults
├── test-fixtures.ts                          # Deterministic option fixtures & invalid cases
├── engine.ts                                 # Pure Three.js + CSG mesh builder, single-pass metrics, STL & 3MF serializers
├── engine.spec.ts                            # Seam 1A + 1B engine & export tests
├── worker.ts                                 # Dedicated Web Worker for off-thread STL/3MF generation
├── worker.spec.ts                            # Seam 2 worker protocol & zero-network tests
├── battery-sdcard-case-maker.component.ts    # Angular Standalone Component (Signals, OnPush, WebGL disposal)
├── battery-sdcard-case-maker.component.html  # Accessible BEM template (.c-battery-case)
├── battery-sdcard-case-maker.component.scss  # Scoped BEM SASS (< 6 KB, mobile-first)
└── battery-sdcard-case-maker.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Validation, Battery Dispenser & Card Slot Geometry (`types.ts`, `engine.ts`)
- **Public Functions**: `validateBatteryCaseOptions(options)`, `generateBatteryCaseParts(options)`
- **Assertions**:
  - Validates slot counts (`>= 1` slot in `memory_card_case`), `stackCount` (`4..24`), `rampAngleDeg` (`12..30`), and `fitToleranceMm` (`0.15..0.60`).
  - Produces finite, zero-`NaN` `THREE.BufferGeometry` for all 7 cell presets (`aaa`, `aa`, `c`, `cr2032`, `9v`, `18650`, `21700`) and all 4 mount styles (`desk`, `wall_keyhole`, `skadis`, `magnetic`).
  - Enforces exact inner chute length clearance (`>= nominalLength + 2 * fitToleranceMm`) and minimum thin-wall perimeter floor (`>= 1.2mm`) on dense MicroSD racks.

### Seam 1B: Multi-Part Assembly, Single-Pass Metrics & Binary `.STL`/`.3MF` (`engine.ts`)
- **Public Functions**: `calculateMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**:
  - `calculateMetrics` accepts pre-built `parts` without invoking `generateBatteryCaseParts()` again (`triangleCount`, `widthMm`, `depthMm`, `heightMm`, `estimatedWeightG`, `exceedsStandardBed`).
  - Binary `.STL` matches `84 + triangleCount * 50` bytes with valid LE uint32 header count.
  - Multi-object `.3MF` parses cleanly via `JSZip` containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with distinct `<object>` blocks for Body, Lid (if present), and Embossed Label (when enabled).
  - Zero `fetch()`, `Storage.setItem`, and `Math.random()` calls.

### Seam 2: Web Worker Boundary (`worker.ts`)
- **Protocol**: `{ id, type: 'export-stl' | 'export-3mf', options }` -> `{ id, type: 'progress' | 'result' | 'error', percent?, buffer?, error? }`
- **Assertions**: Transfers `ArrayBuffer` cleanly without DOM access and handles invalid options gracefully with `{ type: 'error' }`.

### Seam 3: Angular UI, WebGL Lifecycle & Privacy (`*.component.ts`)
- **Assertions**:
  - Zero `CommonModule` / `KeyValuePipe` / `JsonPipe` imports (keeps initial JS bundle delta `<= +2,500 B`).
  - Updating any slider/select triggers at most 1 geometry rebuild pass and disposes replaced `BufferGeometry`/`Material`.
  - `.c-input__control` on all `<select>`, `.c-input__slider` on all `<input type="range">`, non-overlapping `.c-battery-case__viewport-hud`.
  - Every `URL.createObjectURL` is tracked in `createdObjectUrls: string[]` and revoked on `reset()` & `ngOnDestroy()`; `worker.terminate()`, `renderer.dispose()`, and `controls.dispose()` run in `ngOnDestroy()`.

### Seam 4: Catalog, 8-Locale i18n, Route & QA Gate
- Updates all 8 locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`), `tool-registry.ts`, `tool-registry.spec.ts`, minimal lazy route in `app.routes.ts`, `home.ts`, `qa/tool-manifest.json`, `qa/smoke.mjs`, `qa/ads.test.mjs`, and `specs/README.md`.

---

## 3. Verification Commands & Acceptance Gates
- `npx ng test --watch=false --include=src/app/tools/3d/battery-sdcard-case-maker/*.spec.ts --include=src/app/core/i18n/i18n.service.spec.ts --include=src/app/tools/tool-registry.spec.ts`
- `npm run qa:test`
- `npm run build && (npm run qa:bundle-budget || true)` (`ng build` exit 0, component `.scss < 6 KB`, initial JS delta `<= +2,500 B`).
