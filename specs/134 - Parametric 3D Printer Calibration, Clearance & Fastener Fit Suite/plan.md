# Test-Driven Development (TDD) Implementation Plan: Parametric 3D Printer Calibration, Clearance & Fastener Fit Suite

> **Spec ID**: `134`  
> **Slug**: `calibration-tolerance-suite`  
> **Route**: `/tools/calibration-tolerance-suite`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/calibration-tolerance-suite/
├── index.ts                                    # Lazy ToolDefinition ONLY
├── types.ts                                    # Domain contracts, nozzle/bed presets & bolt table
├── test-fixtures.ts                            # Spin gauge, M4 block, overhang & 256mm bed sheet fixtures
├── engine.ts                                   # Benchmark CSG builders, nozzle-safe stroke text, STL/3MF exports
├── engine.spec.ts                              # Seam 1A + 1B geometry, Z-thickness & export tests
├── worker.ts                                   # Web Worker for multi-feature calibration exports
├── worker.spec.ts                              # Seam 2 worker & privacy tests
├── calibration-tolerance-suite.component.ts    # Angular Standalone UI + WebGL preview & teardown
├── calibration-tolerance-suite.component.html  # BEM template (.c-calibration-suite)
├── calibration-tolerance-suite.component.scss  # Scoped BEM styles (< 6 KB)
└── calibration-tolerance-suite.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Clearance Parsing, Exact Z-Locked Bed Sheets & 4 Benchmark Builders (`engine.ts`)
- **Public Functions**: `parseClearanceList(text)`, `validateCalibrationOptions(options)`, `generateCalibrationParts(options)`
- **Assertions**:
  - Parses valid comma-separated gaps (`0.05..0.80mm`) and rejects empty/corrupt strings cleanly.
  - Verifies `first_layer_sheet` exact height lock (`zMax === layerHeightMm ± 0.001`) and footprint inside `[bedWidthMm - 2*margin, bedDepthMm - 2*margin]`.
  - Produces zero-`NaN` watertight geometries grounded at `Z = 0` for `clearance_gauge` (base + captive pins), `fastener_fit_block`, `bridge_overhang_test`, and `first_layer_sheet`.

### Seam 1B: Nozzle-Safe Gauge Labels, Metrics & `.STL`/`.3MF` (`engine.ts`)
- **Public Functions**: `calculateCalibrationMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**: Nozzle-scaled stroke width (`>= max(0.55, nozzle * 1.25)`), single-pass metrics (`estimatedPrintTimeMinutes`, `testFeatureCount`), `.3MF` object separation (`Base` + `Pins` + `Labels`), binary `.STL` exact length, zero `fetch`/`Storage.setItem`/`Math.random`.

### Seam 2, Seam 3 & Seam 4
- Dedicated `worker.ts` + `.onerror`/`.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` delta); full GPU `.dispose()` + `createdObjectUrls: string[]`; 8-locale i18n (`calibrationToleranceSuite`); registry, minimal lazy route, home card, QA manifest, and atomic commit.
