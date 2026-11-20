# Test-Driven Development (TDD) Implementation Plan: Parametric Device Wall Mount & Power-Brick Cradle Maker

> **Spec ID**: `129`  
> **Slug**: `device-wall-cradle-maker`  
> **Route**: `/tools/device-wall-cradle-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/device-wall-cradle-maker/
├── index.ts                                  # Lazy ToolDefinition ONLY
├── types.ts                                  # Domain contracts & presets (Mini-PC, GaN Brick, Remote)
├── test-fixtures.ts                          # Slide rail, U-cradle, pocket & invalid wall fixtures
├── engine.ts                                 # Profile extrusion, CSG countersinks/vents, metrics, STL/3MF
├── engine.spec.ts                            # Seam 1A + 1B geometry, clearance & export tests
├── worker.ts                                 # Web Worker for CSG vent/screw cutting & exports
├── worker.spec.ts                            # Seam 2 worker & privacy tests
├── device-wall-cradle-maker.component.ts     # Angular Standalone UI + WebGL preview & disposal
├── device-wall-cradle-maker.component.html   # BEM template (.c-device-cradle)
├── device-wall-cradle-maker.component.scss   # Scoped BEM styles (< 6 KB)
└── device-wall-cradle-maker.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Structural Validation & 3 Mount Geometries (`engine.ts`)
- **Public Functions**: `validateDeviceCradleOptions(options)`, `generateDeviceCradleParts(options)`
- **Assertions**:
  - Enforces `wallThicknessMm >= 2.8` and caliper dimension limits (`30..280`, `14..90`, `25..180`).
  - Produces exact inner clearances (`deviceWidthMm + 2 * fitClearanceMm`, `deviceThicknessMm + fitClearanceMm`).
  - Generates paired Left/Right rails in `slide_rails_pair`, full U-channel in `u_wrap_cradle`, and open-front notched pocket in `remote_pocket` with zero `NaN` vertices and `Z_min === 0`.

### Seam 1B: Thermal Vents, Countersinks, Metrics & `.STL`/`.3MF` (`engine.ts`)
- **Public Functions**: `calculateDeviceCradleMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**: Single-pass metrics, independent Left/Right rail `<object>` entries in `.3MF`, valid binary `.STL`, zero `fetch`/`Storage.setItem`/`Math.random`.

### Seam 2, Seam 3 & Seam 4
- Dedicated `worker.ts` + `.onerror`/`.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` delta); full GPU `.dispose()` + `createdObjectUrls: string[]`; 8-locale i18n (`deviceWallCradleMaker`); registry, minimal lazy route, home card, QA manifest, and atomic commit.
