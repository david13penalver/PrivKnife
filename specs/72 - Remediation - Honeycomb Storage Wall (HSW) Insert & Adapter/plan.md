# Remediation Implementation Plan: Honeycomb Storage Wall (HSW) Insert & Adapter

- **Spec ID**: `72`
- **Tool**: `42 - Honeycomb Storage Wall (HSW) Insert & Adapter` (`hsw-insert-adapter`)
- **Route**: `/tools/hsw-insert-adapter`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/hsw-insert-adapter/
├── types.ts                                    # Add HswCellGrid ('1x1' | '2x1' | '2x2') and Worker request/response interfaces
├── test-fixtures.ts                            # Include cellGrid: '1x1' in DEFAULT_HSW_OPTIONS
├── engine.ts                                   # Fix storage_ring neck bounds, tool_hook gusset orientation, empty_plug geometry, safeMergeGeometries single-item normalization, acrossFlatsMm metric, and multi-cell ganging
├── engine.spec.ts                              # NEW/UPDATED: Assert storage_ring unobstructed bore, tool_hook z >= frontZ, STL vs metrics triangle parity, acrossFlatsMm tolerance update, and 1x1/2x1/2x2 ganging
├── worker.ts                                   # NEW: Web Worker for off-main-thread STL/3MF export
├── hsw-insert-adapter.component.ts             # Fix resetToDefaults(), add cellGrid selector, set hookAngle max="60", fix mouseup leak, add touch orbit handlers & worker bridge
├── hsw-insert-adapter.component.scss           # NEW: Extract styles, fix light-mode contrast variables, fix 390px/320px overflow & 38px touch targets
└── hsw-insert-adapter.component.spec.ts        # Add tests for full resetToDefaults(), cellGrid toggle, mouseup cleanup, and touch orbit
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions Under Test**:
  - `generateHswMesh(options: HswInsertAdapterOptions): HswMeshResult`
  - `exportHswSTL(plugGeom, attachGeom): ArrayBuffer`
  - `processHsw(options, format): Promise<HswInsertAdapterResult>`
- **Concrete Assertions**:
  1. **Unobstructed `storage_ring` Bore**: For `insertType: 'storage_ring'`, every vertex `(x, y, z)` in `attachmentGeometry` satisfies `Math.hypot(x, y - standOff) >= options.ringDiameterMm / 2 - 0.05`.
  2. **Forward-Only `tool_hook` Gusset**: For `insertType: 'tool_hook'`, `attachmentGeometry` bounding box `min.z >= frontZ - 1e-3`.
  3. **Triangle Count Parity**: For all 6 `insertType` values (including `empty_plug`), `metrics.totalTriangles` equals the `uint32` triangle count at byte offset `80` of `exportHswSTL(plugGeometry, attachmentGeometry)`.
  4. **Tolerance Metric Reactivity**: `generateHswMesh({ ...DEFAULT_HSW_OPTIONS, tightnessToleranceMm: 0.25 }).metrics.acrossFlatsMm === 20.25`.
  5. **Multi-Cell Ganging**: `generateHswMesh({ ...DEFAULT_HSW_OPTIONS, cellGrid: '2x1' }).metrics.plugTriangles > generateHswMesh({ ...DEFAULT_HSW_OPTIONS, cellGrid: '1x1' }).metrics.plugTriangles * 1.8`.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `hsw-insert-adapter.component.ts`)
- **Protocol**:
  - Request: `{ id: number; options: HswInsertAdapterOptions; format: HswExportFormat }`
  - Response: `{ id: number; ok: true; result: HswInsertAdapterResult } | { id: number; ok: false; error: string }`
- **Lifecycle**: Terminated in `ngOnDestroy()`.

### Seam 3: Component State, Controls & Resource Disposal Boundary (`hsw-insert-adapter.component.ts` / `hsw-insert-adapter.component.spec.ts`)
- **Assertions**:
  - Selecting *Heavy-Duty 40mm Utility Hook* (`hookLengthMm = 40`) and then calling `resetToDefaults()` resets `hookLengthMm()` to `DEFAULT_HSW_OPTIONS.hookLengthMm` (`35`).
  - `ngOnDestroy()` removes the window `'mouseup'` listener and terminates the worker.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`hsw-insert-adapter.component.scss`)
- **Assertions**:
  - `.c-input__label`, `.checkbox-label`, `.metric-value`, `.badge-dim`, and `.safety-list` use `var(--color-text-primary)` / `var(--color-text-secondary)`.
  - `scrollWidth <= clientWidth` at `390px` and `320px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Fix `storage_ring` Neck Intrusion, `tool_hook` Gusset Orientation & `safeMergeGeometries` Single-Item Indexing
- **Red**: Write tests in `engine.spec.ts` asserting:
  1. `storage_ring` `attachmentGeometry` has zero vertices with `Math.hypot(x, y - standOff) < ringDiameterMm / 2 - 0.1`.
  2. `tool_hook` `attachmentGeometry` bounding box `min.z >= frontZ - 0.01`.
  3. `empty_plug` `metrics.totalTriangles === new DataView(exportHswSTL(plug, attach)).getUint32(80, true)`.
  Observe all 3 fail.
- **Green**:
  1. In `safeMergeGeometries()`, normalize single-item arrays through `.toNonIndexed()` and attribute filtering just like multi-item arrays.
  2. In `generateHswMesh()` (`case 'storage_ring'`), set `neckHeight = standOff - ringInnerDia / 2` and translate `neckGeom` to `y = neckHeight / 2`.
  3. In `generateHswMesh()` (`case 'tool_hook'`), build `gussetGeom` as a triangular prism in the Y–Z plane (`z ∈ [frontZ, frontZ + gussetLen]`, `y ∈ [-armThick - 8, -armThick]`).
  4. In `generateHswMesh()` (`case 'empty_plug'`), replace the hole-bridging bar with a solid flush front cap disk/hex face.
- **Refactor**: Verify `0` `NaN` vertices across all 6 insert types.

### Slice 2: `acrossFlatsMm` Metric Accuracy, Multi-Cell Ganging (`1x1`/`2x1`/`2x2`) & Complete `resetToDefaults()`
- **Red**: Write tests in `engine.spec.ts` and `hsw-insert-adapter.component.spec.ts` asserting:
  1. `metrics.acrossFlatsMm` equals `20.25` when `tightnessToleranceMm = 0.25`.
  2. `cellGrid: '2x1'` and `'2x2'` multiply plug geometry at HSW pitch spacing and connect them with a bridge plate.
  3. `component.resetToDefaults()` resets `hookLengthMm()` from `40` back to `35`.
- **Green**:
  1. Update `acrossFlatsMm: Math.round(effAcrossFlats * 100) / 100` in `engine.ts`.
  2. Implement `cellGrid` (`'1x1' | '2x1' | '2x2'`) in `types.ts`, `engine.ts`, and `hsw-insert-adapter.component.ts`.
  3. Update `resetToDefaults()` in `hsw-insert-adapter.component.ts` to set all option signals from `DEFAULT_HSW_OPTIONS`, and set `#hookAngle` slider `max="60"`.
- **Refactor**: Keep `DEFAULT_HSW_OPTIONS` as the single source of truth for default signal values.

### Slice 3: Window Listener Cleanup, Touch Orbit & Web Worker Bridge
- **Red**: Write a component test spying on `window.removeEventListener('mouseup', ...)` on destroy.
- **Green**: Store `onWindowMouseUp` and remove it in `ngOnDestroy()`; add `touchstart`/`touchmove`/`touchend` canvas listeners and `worker.ts`.
- **Refactor**: Revoke download object URLs after anchor click.

### Slice 4: Light-Mode Contrast & 390px/320px Mobile Overflow Fix
- **Red**: Check `layoutReport` at `390px` (`scrollWidth: 421`) and `320px` (`scrollWidth: 420`) and light-mode text colors (`#e2e8f0`, `#f8fafc`, `#d1d5db`).
- **Green**: Extract styles to `hsw-insert-adapter.component.scss`, replace hardcoded light colors with `var(--color-text-primary)` / `var(--color-text-secondary)`, and add `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
- **Refactor**: Verify 38px minimum touch target heights.
