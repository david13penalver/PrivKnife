# Test-Driven Development (TDD) Implementation Plan: Parametric Rugged Hinged Storage Box & Parts Organizer

> **Spec ID**: `124`  
> **Slug**: `rugged-hinged-box-maker`  
> **Route**: `/tools/rugged-hinged-box-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/rugged-hinged-box-maker/
├── index.ts                               # Lazy ToolDefinition ONLY
├── types.ts                               # Domain contracts, hardware defaults & bounds
├── test-fixtures.ts                       # Valid box presets & boundary invalid fixtures
├── engine.ts                              # Pure Three.js/CSG shell, hinge knuckles, latches, gasket & exports
├── engine.spec.ts                         # Seam 1A + 1B engine & export tests
├── worker.ts                              # Dedicated Web Worker for heavy CSG STL/3MF serialization
├── worker.spec.ts                         # Seam 2 worker protocol & zero-network tests
├── rugged-hinged-box-maker.component.ts   # Angular Standalone UI + WebGL preview & teardown
├── rugged-hinged-box-maker.component.html # BEM template (.c-rugged-box)
├── rugged-hinged-box-maker.component.scss # Scoped BEM styles (< 6 KB)
└── rugged-hinged-box-maker.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Validation, Shell/Ribs & Hinge/Latch Geometry (`engine.ts`)
- **Public Functions**: `validateRuggedBoxOptions(options)`, `generateRuggedBoxParts(options)`
- **Assertions**:
  - Validates inner dimension bounds (`60..240`, `50..200`, `18..110`, `10..60`), wall (`2.0..5.0`), corner radius, and divider ranges.
  - Builds zero-`NaN` watertight geometries for `base`, `lid`, `latches`, optional `dividers`, and optional `gasket` loop across `print_in_place`, `m3_screw`, and `filament_pin` hinges.
  - Verifies rear knuckle placement offset (`y < -outerDepth/2`) avoids rib collision and scales latch count (`1` for `<125mm`, `2` for `>=125mm`).

### Seam 1B: Single-Pass Metrics, Multi-Material `.3MF` & Binary `.STL` (`engine.ts`)
- **Public Functions**: `calculateRuggedBoxMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**:
  - `calculateRuggedBoxMetrics` computes all dimensions, bed overrun flag (`> 220×220mm`), weight, and print time in one pass without regenerating geometry.
  - `.3MF` archive emits independent `<object>` resources for Body, Lid, Latches, Dividers, and TPU Gasket Seal.
  - Binary `.STL` byte count equals `84 + triangleCount * 50`.
  - Zero `fetch()`, `Storage.setItem`, or `Math.random()`.

### Seam 2: Web Worker Boundary (`worker.ts`)
- **Protocol**: Typed `export-stl` / `export-3mf` messages with transferable `ArrayBuffer` and progress callbacks.

### Seam 3: Component Lifecycle & Zero Bloat (`*.component.ts`)
- **Assertions**: Zero `CommonModule`/pipes (`<= +2,500 B` initial bundle delta), single rebuild per parameter change, full Three.js `.dispose()` + worker `.terminate()` + `createdObjectUrls: string[]` cleanup on reset & destroy.

### Seam 4: Integration & Gate
- All 8 locales (`ruggedHingedBoxMaker`), `tool-registry.ts/.spec.ts`, minimal lazy route in `app.routes.ts`, `home.ts`, QA manifest/smoke/ads, `specs/README.md`, `ng test`, `npm run qa:test`, `npm run build`, and atomic commit.
