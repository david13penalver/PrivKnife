# Test-Driven Development (TDD) Implementation Plan: Parametric Threaded Storage Tube, Pill Organizer & Desiccant Pod Maker

> **Spec ID**: `132`  
> **Slug**: `threaded-tube-pill-organizer`  
> **Route**: `/tools/threaded-tube-pill-organizer`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/threaded-tube-pill-organizer/
├── index.ts                                      # Lazy ToolDefinition ONLY
├── types.ts                                      # Domain contracts, spool hub presets & defaults
├── test-fixtures.ts                              # Tube, Bambu desiccant pod, AM/PM pill & slit-overflow fixtures
├── engine.ts                                     # 45° helix sweep builder, spool slits, pill organizer, STL/3MF
├── engine.spec.ts                                # Seam 1A + 1B helix thread, slit & export tests
├── worker.ts                                     # Web Worker for helix geometry & STL/3MF export
├── worker.spec.ts                                # Seam 2 worker & privacy tests
├── threaded-tube-pill-organizer.component.ts     # Angular Standalone UI + WebGL preview
├── threaded-tube-pill-organizer.component.html   # BEM template (.c-container-maker)
├── threaded-tube-pill-organizer.component.scss   # Scoped BEM styles (< 6 KB)
└── threaded-tube-pill-organizer.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Thread Safety, Slit Bounds & Container Geometries (`engine.ts`)
- **Public Functions**: `validateContainerOptions(options)`, `buildHelixThreadGeometry(...)`, `generateContainerParts(options)`
- **Assertions**:
  - Enforces `desiccantSlitWidthMm` in `1.0..1.8mm`, `neckWallRemainingMm >= 1.4mm`, and thread clearance separation.
  - Verifies zero-`NaN` swept helix geometry with smooth tapered starts/ends.
  - Generates paired Base + Threaded Cap for `knurled_tube` & `desiccant_pod`, and Tray + Sliding Lid + Day Labels for `pill_organizer`.

### Seam 1B: Single-Pass Metrics & `.STL`/`.3MF` Separation (`engine.ts`)
- **Public Functions**: `calculateContainerMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**: Single-pass metrics (`internalVolumeMl`, `neckWallRemainingMm`), `.3MF` object split (`Base` + `Cap/Lid` + `Day Labels`), binary `.STL` exact length, zero `fetch`/`Storage.setItem`/`Math.random`.

### Seam 2, Seam 3 & Seam 4
- Dedicated `worker.ts` + `.onerror`/`.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` delta); full GPU `.dispose()` + `createdObjectUrls: string[]`; 8-locale i18n (`threadedTubePillOrganizer`); registry, minimal lazy route, home card, QA manifest, and atomic commit.
