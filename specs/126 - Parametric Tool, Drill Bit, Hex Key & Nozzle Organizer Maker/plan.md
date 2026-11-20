# Test-Driven Development (TDD) Implementation Plan: Parametric Tool, Drill Bit, Hex Key & Nozzle Organizer Maker

> **Spec ID**: `126`  
> **Slug**: `tool-bit-holder-maker`  
> **Route**: `/tools/tool-bit-holder-maker`  
> **Category**: `3d`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Directory Layout

```text
PrivKnife/src/app/tools/3d/tool-bit-holder-maker/
├── index.ts                              # Lazy ToolDefinition ONLY
├── types.ts                              # Domain contracts & presets
├── test-fixtures.ts                      # Drill/Allen/Hex/Nozzle & invalid custom spec fixtures
├── engine.ts                             # Slot parser, circumradius hex/round CSG bores, labels, metrics, STL/3MF
├── engine.spec.ts                        # Seam 1A + 1B engine tests
├── worker.ts                             # Web Worker for heavy multi-bore CSG & export serialization
├── worker.spec.ts                        # Seam 2 worker & privacy tests
├── tool-bit-holder-maker.component.ts    # Angular Standalone Component (Signals, OnPush, WebGL disposal)
├── tool-bit-holder-maker.component.html  # BEM template (.c-tool-rack)
├── tool-bit-holder-maker.component.scss  # Scoped BEM styles (< 6 KB)
└── tool-bit-holder-maker.component.spec.ts # Seam 3 component, GPU disposal & teardown tests
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1A: Slot Spec Parser, Floor Safety & CSG Bores (`engine.ts`)
- **Public Functions**: `parseToolSlots(specText, preset, hexBitCount)`, `validateToolHolderOptions(options)`, `generateToolHolderParts(options)`
- **Assertions**:
  - Accurately parses CSV diameters & labels (`"M6:8"` or `"1.5, 2, 2.5"`), rejects zero-valid-slot strings cleanly.
  - Verifies hexagonal circumradius calculation (`AF / sqrt(3)`), minimum bottom floor clamping (`>= 2.5mm`), and zero-`NaN` geometries across `stepped_bench`, `flat_tray`, and `skadis_wall`.

### Seam 1B: Dual-Color Labels, Metrics & `.STL`/`.3MF` Export (`engine.ts`)
- **Public Functions**: `calculateToolHolderMetrics(options, parts)`, `exportToBinaryStl(parts)`, `exportTo3mf(options, parts)`
- **Assertions**:
  - Single-pass metrics calculation, multi-object `.3MF` (`Rack Body` + `Size Labels`), exact `84 + N * 50` binary `.STL`, zero network/storage/`Math.random`.

### Seam 2 & Seam 3: Worker, Component, GPU Disposal & Zero Bloat
- Web Worker transferable buffers + `.onerror`/`.terminate()`; zero `CommonModule`/pipes (`<= +2,500 B` delta); `.c-input__control`/`.c-input__slider`; full Three.js `.dispose()` & `createdObjectUrls: string[]` cleanup.

### Seam 4: Catalog, 8 Locales, QA Parity & Atomic Commit
- 8 locales (`toolBitHolderMaker`), `tool-registry.ts/.spec.ts`, minimal lazy route, `home.ts`, QA manifest/smoke/ads, `specs/README.md`.
