# Test-Driven Development (TDD) Implementation Plan: Parametric Spice Jar, Paint Bottle & Coffee Pod Rack Maker

> **Spec ID**: `133`  
> **Slug**: `jar-bottle-rack-maker`  
> **Route**: `/tools/jar-bottle-rack-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/jar-bottle-rack-maker/
├── index.ts                             # Lazy ToolDefinition ONLY
├── types.ts                             # Domain contracts & paint/spice/capsule presets
├── test-fixtures.ts                     # Spice stadium, Vallejo honeycomb, Nespresso track & thin-web fixtures
├── engine.ts                            # Hex/stepped pocket solver, vaulted relief, dovetails, STL/3MF
├── engine.spec.ts                       # Seam 1A + 1B packing math, hollowing & export tests
├── worker.ts                            # Web Worker for multi-pocket CSG & exports
├── worker.spec.ts                       # Seam 2 worker & privacy tests
├── jar-bottle-rack-maker.component.ts   # Angular Standalone UI + WebGL preview
├── jar-bottle-rack-maker.component.html # BEM template (.c-jar-rack)
├── jar-bottle-rack-maker.component.scss # Scoped BEM styles (< 6 KB)
└── jar-bottle-rack-maker.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Hex/Stepped Well Coordinates & Rack Topologies (`engine.ts`)
- **Public Functions**: `validateJarRackOptions(options)`, `computeWellCoordinates(options)`, `generateJarRackParts(options)`
- **Assertions**:
  - Enforces `webWallThicknessMm >= 1.8` and safe diameter bounds (`12..95mm`).
  - Verifies hexagonal row compression (`pitchY = pitchX * sqrt(3)/2`) and exact non-overlapping center distance (`>= diameter + clearance + web`).
  - Verifies finite zero-`NaN` geometries across `stepped_stadium`, `honeycomb_tray`, and `capsule_track` seated cleanly on `Z = 0`.

### Seam 1B: Vaulted Relief, Dovetails, Metrics & `.STL`/`.3MF` (`engine.ts`)
- **Public Functions**: `calculateJarRackMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**: Vaulted rear relief saves mass cleanly vs solid, single-pass metrics (`totalCapacityCount`), `.3MF` zip & binary `.STL` valid byte count, zero `fetch`/`Storage.setItem`/`Math.random`.

### Seam 2, Seam 3 & Seam 4
- Dedicated `worker.ts` + `.onerror`/`.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` delta); full GPU `.dispose()` + `createdObjectUrls: string[]`; 8-locale i18n (`jarBottleRackMaker`); registry, minimal lazy route, home card, QA manifest, and atomic commit.
