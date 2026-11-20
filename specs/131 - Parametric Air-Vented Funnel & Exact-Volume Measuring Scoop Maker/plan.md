# Test-Driven Development (TDD) Implementation Plan: Parametric Air-Vented Funnel & Exact-Volume Measuring Scoop Maker

> **Spec ID**: `131`  
> **Slug**: `funnel-scoop-maker`  
> **Route**: `/tools/funnel-scoop-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/funnel-scoop-maker/
├── index.ts                             # Lazy ToolDefinition ONLY
├── types.ts                             # Domain contracts & common mL / neck presets
├── test-fixtures.ts                     # Resin funnel, 30 mL coffee scoop & clogged-bore fixtures
├── engine.ts                            # Inverse frustum volume solver, vented lathe, labels, STL/3MF
├── engine.spec.ts                       # Seam 1A + 1B volume math & export tests
├── worker.ts                            # Web Worker for lathe/CSG & STL/3MF serialization
├── worker.spec.ts                       # Seam 2 worker & privacy tests
├── funnel-scoop-maker.component.ts      # Angular Standalone UI + WebGL preview
├── funnel-scoop-maker.component.html    # BEM template (.c-funnel-scoop)
├── funnel-scoop-maker.component.scss    # Scoped BEM styles (< 6 KB)
└── funnel-scoop-maker.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Inverse Volume Solver, Flow Bore Guards & Lathe Geometry (`engine.ts`)
- **Public Functions**: `solveScoopFrustumDimensions(targetMl, aspect)`, `validateFunnelScoopOptions(options)`, `generateFunnelScoopParts(options)`
- **Assertions**:
  - Inverse frustum solver yields `(rBottom, rTop, innerHeight)` with `computeFrustumMl(...) === targetMl ± 0.1`.
  - Rejects clogged inner spout bores (`innerFlowBoreMm < 3.2mm`) or invalid `mouthDiameterMm <= spoutOuterDiameterMm + 8` cleanly.
  - Builds zero-`NaN` watertight geometries grounded cleanly on `Z = 0` with `0..6` radial external vent ribs.

### Seam 1B: Dual-Color Volume Tag, Single-Pass Metrics & `.STL`/`.3MF` (`engine.ts`)
- **Public Functions**: `calculateFunnelScoopMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**: Single-pass metrics, `.3MF` `Body` + `Volume Label` separation, `84 + N * 50` binary `.STL`, zero `fetch`/`Storage.setItem`/`Math.random`.

### Seam 2, Seam 3 & Seam 4
- Dedicated `worker.ts` + `.onerror`/`.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` delta); full GPU `.dispose()` + `createdObjectUrls: string[]`; 8-locale i18n (`funnelScoopMaker`); registry, minimal lazy route, home card, QA manifest, and atomic commit.
