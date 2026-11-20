# Test-Driven Development (TDD) Implementation Plan: Parametric Replacement Knob, Dial & Captive-Nut Thumbscrew Maker

> **Spec ID**: `128`  
> **Slug**: `knob-dial-handwheel-maker`  
> **Route**: `/tools/knob-dial-handwheel-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/knob-dial-handwheel-maker/
├── index.ts                                  # Lazy ToolDefinition ONLY
├── types.ts                                  # Domain contracts & DIN 934 / 1/4"-20 hex standards
├── test-fixtures.ts                          # Potentiometer D-shaft, M6 star-nut & thin-hub fixtures
├── engine.ts                                 # Outer grip extrusions, D-flat/spline/hex CSG sockets, STL/3MF
├── engine.spec.ts                            # Seam 1A + 1B engine & export tests
├── worker.ts                                 # Web Worker for CSG sockets & exports
├── worker.spec.ts                            # Seam 2 worker & privacy tests
├── knob-dial-handwheel-maker.component.ts    # Angular Standalone UI + Section Cutaway WebGL preview
├── knob-dial-handwheel-maker.component.html  # BEM template (.c-knob-maker)
├── knob-dial-handwheel-maker.component.scss  # Scoped BEM styles (< 6 KB)
└── knob-dial-handwheel-maker.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Hub Wall Safety, Outer Grips & Shaft Drive Sockets (`engine.ts`)
- **Public Functions**: `validateKnobOptions(options)`, `generateKnobParts(options)`
- **Assertions**:
  - Rejects undersized hub walls (`minHubWallMm < 2.5mm`) cleanly.
  - Verifies all 4 grip curves (`knurled`, `fluted`, `star_handwheel`, `pointer_wing`) and all 5 drives (`d_shaft`, `splined`, `captive_hex_nut`, `captive_hex_bolt`, `set_screw_round`) produce zero-`NaN` watertight geometries.
  - Confirms `DIN 934` M6 pocket circumradius `((10.0 + fitToleranceMm)/2) / cos(PI/6)` accuracy and `flatRotationDeg` rotation.

### Seam 1B: Dual-Color Indicator, Metrics & `.STL`/`.3MF` (`engine.ts`)
- **Public Functions**: `calculateKnobMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**: Single-pass metrics, independent `.3MF` `Knob Body` + `Position Indicator` `<object>` nodes, `84 + N * 50` binary `.STL`, zero `fetch`/`Storage.setItem`/`Math.random`.

### Seam 2, Seam 3 & Seam 4
- Dedicated `worker.ts` + `.onerror`/`.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` delta); full Three.js `.dispose()` & `createdObjectUrls: string[]`; 8-locale i18n (`knobDialHandwheelMaker`); registry, minimal lazy route, home card, QA manifest, and atomic commit.
