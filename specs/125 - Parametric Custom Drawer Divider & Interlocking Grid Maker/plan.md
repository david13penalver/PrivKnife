# Test-Driven Development (TDD) Implementation Plan: Parametric Custom Drawer Divider & Interlocking Grid Maker

> **Spec ID**: `125`  
> **Slug**: `drawer-divider-grid-maker`  
> **Route**: `/tools/drawer-divider-grid-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/drawer-divider-grid-maker/
├── index.ts                                  # Lazy ToolDefinition ONLY
├── types.ts                                  # Domain contracts & bed presets
├── test-fixtures.ts                          # Kitchen cutlery, workbench & oversized drawer fixtures
├── engine.ts                                 # Ratio solver, notch-safe dovetail splitter, flat-plate packer, STL/3MF/ZIP
├── engine.spec.ts                            # Seam 1A + 1B unit & geometry tests
├── worker.ts                                 # Web Worker for CSG slat pack & ZIP/3MF serialization
├── worker.spec.ts                            # Seam 2 worker & privacy tests
├── drawer-divider-grid-maker.component.ts    # Angular Standalone UI + Assembled/Flat WebGL preview
├── drawer-divider-grid-maker.component.html  # BEM template (.c-drawer-grid)
├── drawer-divider-grid-maker.component.scss  # Scoped BEM styles (< 6 KB)
└── drawer-divider-grid-maker.component.spec.ts # Seam 3 component & disposal tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Ratio Solver, Half-Lap Slat Geometry & Notch-Safe Dovetail Splitting (`engine.ts`)
- **Public Functions**: `validateDrawerGridOptions(options)`, `planSlatSplits(totalLengthMm, notchPositions, maxPieceMm)`, `generateDrawerGridParts(options)`
- **Assertions**:
  - Correctly parses unequal ratio strings (`"1,2,1"` -> `0.25, 0.50, 0.25`) and falls back evenly on malformed/empty ratios without `NaN`.
  - `planSlatSplits` bounds every piece `<= maxPieceMm` and verifies `Math.abs(splitPos - notch) >= 12` for every notch position.
  - Produces clean zero-`NaN` `BufferGeometry` in both `'assembled'` and `'flat_plates'` orientations.

### Seam 1B: Multi-Plate Packing, Metrics & `.STL`/`.3MF`/`.ZIP` Export (`engine.ts`)
- **Public Functions**: `calculateDrawerGridMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`, `exportPlateZip(parts)`
- **Assertions**:
  - Single-pass metrics accurately count `totalSlatsCount`, `dovetailSplitCount`, `buildPlateCount`, and filament grams.
  - `.3MF` separates individual plate pieces as `<object>` nodes; `.STL` matches `84 + N * 50`.
  - Zero `fetch()`, `Storage.setItem`, or `Math.random()`.

### Seam 2 & Seam 3: Worker, Angular Component, Disposal & Zero Bloat
- Dedicated `worker.ts` + `.onerror` + `.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` initial bundle delta); paired `createdObjectUrls: string[]`; Three.js GPU disposal.

### Seam 4: Catalog, 8 Locales, QA Parity & Atomic Commit
- 8 locales (`drawerDividerGridMaker`), `tool-registry.ts/.spec.ts`, minimal lazy route, `home.ts`, QA manifest/smoke/ads, `specs/README.md`.
