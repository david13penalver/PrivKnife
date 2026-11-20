# Test-Driven Development (TDD) Implementation Plan: Parametric Washer, Spacer, Standoff, Shim & Bushing Maker

> **Spec ID**: `127`  
> **Slug**: `washer-spacer-shim-maker`  
> **Route**: `/tools/washer-spacer-shim-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/washer-spacer-shim-maker/
├── index.ts                                  # Lazy ToolDefinition ONLY
├── types.ts                                  # Domain contracts & M2..M10 fastener clearance tables
├── test-fixtures.ts                          # Washer, VESA standoff, wedge, U-shim & thin-wall failure fixtures
├── engine.ts                                 # Closed Lathe/Extrude hardware builders, plate array, STL/3MF exports
├── engine.spec.ts                            # Seam 1A + 1B geometry, tolerance & export tests
├── worker.ts                                 # Web Worker for multi-copy plate serialization
├── worker.spec.ts                            # Seam 2 worker & privacy tests
├── washer-spacer-shim-maker.component.ts     # Angular Standalone UI + WebGL preview
├── washer-spacer-shim-maker.component.html   # BEM template (.c-hardware-part)
├── washer-spacer-shim-maker.component.scss   # Scoped BEM styles (< 6 KB)
└── washer-spacer-shim-maker.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Radial Wall Guards, Chamfer Clamp & 5 Part Profiles (`engine.ts`)
- **Public Functions**: `validateHardwareOptions(options)`, `generateSingleHardwareGeometry(options)`
- **Assertions**:
  - Enforces `radialWallMm >= 0.8` before building, rejects overlapping OD/ID cleanly.
  - Clamps oversized chamfers cleanly to prevent vertex self-intersection.
  - Produces zero-`NaN` geometries seated at `Z = 0` for `washer_spacer`, `flanged_bushing`, `hex_standoff`, `leveling_wedge`, and `u_slot_shim`.

### Seam 1B: Build-Plate Array, Metrics & `.STL`/`.3MF` Export (`engine.ts`)
- **Public Functions**: `generateHardwarePlateParts(options)`, `calculateHardwareMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**:
  - Array quantity `1..24` places exact non-overlapping copies cleanly across `cols × rows` centered on XY build plane.
  - Flags `highAspectWarning` when `heightMm / outerDiameterMm > 3.0`.
  - Single-pass metrics, exact binary `.STL` byte length, valid multi-object `.3MF` XML, and zero `fetch`/`Storage.setItem`/`Math.random`.

### Seam 2, Seam 3 & Seam 4
- Dedicated `worker.ts` with transferable buffers + `.onerror`/`.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` delta); full GPU `.dispose()` + `createdObjectUrls: string[]`; 8-locale i18n (`washerSpacerShimMaker`); registry, minimal lazy route, home card, QA manifest, and atomic commit.
