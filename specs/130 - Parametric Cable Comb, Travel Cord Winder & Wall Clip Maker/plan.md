# Test-Driven Development (TDD) Implementation Plan: Parametric Cable Comb, Travel Cord Winder & Wall Clip Maker

> **Spec ID**: `130`  
> **Slug**: `cable-comb-clip-maker`  
> **Route**: `/tools/cable-comb-clip-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/cable-comb-clip-maker/
├── index.ts                              # Lazy ToolDefinition ONLY
├── types.ts                              # Domain contracts & USB/HDMI/AC gauge presets
├── test-fixtures.ts                      # Cable comb, tight travel spool & multi-clip fixtures
├── engine.ts                             # Teardrop slot geometry, spool capacity math, metrics & STL/3MF
├── engine.spec.ts                        # Seam 1A + 1B geometry, detent & export tests
├── worker.ts                             # Web Worker for batch plates & STL/3MF exports
├── worker.spec.ts                        # Seam 2 worker & privacy tests
├── cable-comb-clip-maker.component.ts    # Angular Standalone UI + WebGL preview & teardown
├── cable-comb-clip-maker.component.html  # BEM template (.c-cable-maker)
├── cable-comb-clip-maker.component.scss  # Scoped BEM styles (< 6 KB)
└── cable-comb-clip-maker.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Bend-Radius Guards, Teardrop Slots & Winder Capacity (`engine.ts`)
- **Public Functions**: `validateCableToolOptions(options)`, `generateCableToolParts(options)`
- **Assertions**:
  - Verifies `entryMouthWidthMm < cavityDiameterMm` across all pinch ratios (`0.78..0.92`).
  - Rejects unsafe travel winder hub bend radii (`winderCoreDiameterMm < 22`) or impossible annulus widths (`>= winderOuterDiameterMm - 10`).
  - Produces zero-`NaN` geometries grounded on `Z = 0` for `cable_comb`, `travel_winder`, and `1..12` `p_clip_array`.

### Seam 1B: Spool Capacity Solver, Metrics & `.STL`/`.3MF` Export (`engine.ts`)
- **Public Functions**: `calculateCableToolMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**: Accurately flags `cordCapacityOk: false` for overloaded tiny spools, single-pass metrics, `84 + N * 50` binary `.STL`, multi-object `.3MF` (`Base` / `Spool Lid` / clips), zero `fetch`/`Storage.setItem`/`Math.random`.

### Seam 2, Seam 3 & Seam 4
- Dedicated `worker.ts` + `.onerror`/`.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` delta); full GPU `.dispose()` + `createdObjectUrls: string[]`; 8-locale i18n (`cableCombClipMaker`); registry, minimal lazy route, home card, QA manifest, and atomic commit.
