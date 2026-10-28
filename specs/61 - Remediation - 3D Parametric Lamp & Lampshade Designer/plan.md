# Plan 61: TDD Implementation Plan — 3D Parametric Lamp & Lampshade Designer Remediation

- **Spec ID**: `61`
- **Remediates Tool**: `31 - 3D Parametric Lamp & Lampshade Designer` (`parametric-lamp-designer`)
- **Route**: `/tools/parametric-lamp-designer`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/parametric-lamp-designer/
├── types.ts                                    # Add 'voronoi' to RibWaveType and worker message interfaces
├── engine.ts                                   # Add 'voronoi' cellular wave modulation & multi-object 3MF support
├── engine.spec.ts                              # (New/Update) Unit tests for voronoi wave, STL/3MF exports, and single-pass metrics
├── worker.ts                                   # (New) Dedicated Web Worker for geometry & STL/3MF export generation
├── parametric-lamp-designer.component.ts       # Deduplicate metrics signal, fix material/scene disposal, use .c-input__control/.c-input__slider
├── parametric-lamp-designer.component.scss     # (New/Extract) BEM styles (.c-lamp-designer), non-overlapping HUD, Light/Dark mode contrast, >=38px touch targets
└── parametric-lamp-designer.component.spec.ts  # Component tests for single geometry pass, material/scene disposal, HUD classes, and zero network calls
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Functions Under Test**:
  - `evaluateRibWave(angleRad, zNorm, waveType, ribCount, twistRad): number`
  - `generateLampShadeGeometry(config: LampConfig): THREE.BufferGeometry`
  - `calculateLampMetrics(config: LampConfig, geometry: THREE.BufferGeometry): LampMetrics`
  - `exportToBinarySTL(geometry: THREE.BufferGeometry): ArrayBuffer`
  - `exportTo3MF(config: LampConfig, geometry?: THREE.BufferGeometry): Promise<Blob>`
- **Concrete Assertions**:
  - Calling `evaluateRibWave(..., 'voronoi', 16, ...)` returns deterministic values in `[-1, 1]` that vary across both `angleRad` and `zNorm`.
  - `calculateLampMetrics(config, prebuiltGeometry)` computes dimensions, triangle count, weight, and print time directly from the passed `prebuiltGeometry` without calling `generateLampShadeGeometry` again.
  - `exportTo3MF(config)` produces a valid ZIP containing `3D/3dmodel.model` with separate `<object>` entries for the shade body and socket spider fitter when `socketPreset !== 'none'` and `printMode === 'hollow_shell'`.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / Component)
- **Worker Protocol**:
  - Request: `{ id: number; type: 'export-stl' | 'export-3mf'; config: LampConfig }`
  - Response: `{ id: number; type: 'progress' | 'result' | 'error'; percent?: number; buffer?: ArrayBuffer; error?: string }`
- **Concrete Assertions**:
  - Component terminates any active `Worker` instance inside `ngOnDestroy()`.

### Seam 3: Component State, Controls & Resource Disposal Boundary (`parametric-lamp-designer.component.ts` / `.spec.ts`)
- **Concrete Assertions**:
  - Updating a slider parameter (e.g., `updateParam('heightMm', 210)`) invokes `generateLampShadeGeometry` **at most once** per update (not twice via a `computed` `metrics` signal).
  - Calling `updateParam('filamentColor', '#ff5500')` (which triggers `updateMaterial()`) calls `.dispose()` on the previous `shadeMesh.material`.
  - Calling `ngOnDestroy()` calls `.dispose()` on `shadeMesh.geometry`, `shadeMesh.material`, `bulbMesh.geometry`, `bulbMesh.material`, `gridHelper.geometry`, `gridHelper.material`, and `renderer`.
  - Calling `downloadStl()` or `download3mf()` calls `URL.revokeObjectURL()`.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`parametric-lamp-designer.component.scss`)
- **Concrete Assertions**:
  - All `<select>` elements in the template carry `.c-input__control` and all `<input type="range">` elements carry `.c-input__slider`.
  - The 3D viewport HUD uses a responsive flex bar (`.c-lamp-designer__viewport-hud`) instead of colliding left/right `position: absolute; top: 12px;` containers, and HUD buttons use explicit high-contrast dark-surface styling.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Single-Pass Metrics Calculation & `voronoi` Cellular Rib Pattern (`DEFECT-31-02`, `DEFECT-31-05`)
1. **Red**:
   - In `engine.spec.ts`, write a test verifying `evaluateRibWave(theta, z, 'voronoi', 12, 0)` returns bounded values in `[-1, 1]` and `generateLampShadeGeometry({ ...DEFAULT_LAMP_CONFIG, ribWave: 'voronoi' })` returns a geometry with `> 10,000` triangles and zero `NaN` vertices.
   - Write a test verifying `calculateLampMetrics(config, existingGeometry)` accepts an existing `THREE.BufferGeometry` and computes `triangleCount` without invoking `generateLampShadeGeometry`.
2. **Green**:
   - Add `'voronoi'` to `RibWaveType` in `types.ts` and implement cellular distance wave synthesis in `evaluateRibWave()` in `engine.ts`.
   - Overload `calculateLampMetrics(config: LampConfig, existingGeometry?: THREE.BufferGeometry): LampMetrics` in `engine.ts` so it reuses `existingGeometry` when provided.
   - In `parametric-lamp-designer.component.ts`, change `metrics` from `computed()` to `signal<LampMetrics>(...)` updated inside `rebuildShadeMesh()` using the already-built `geometry`.
3. **Refactor**:
   - Clean up unused temporary geometry allocations.

### Slice 2: Multi-Object `.3MF` Export & Web Worker Offloading (`DEFECT-31-02`, `DEFECT-31-05`)
1. **Red**:
   - In `engine.spec.ts`, write a test that calls `exportTo3MF({ ...DEFAULT_LAMP_CONFIG, socketPreset: 'E27', printMode: 'hollow_shell' })`, parses `3D/3dmodel.model` with `JSZip`, and asserts two `<object>` definitions (`Lampshade Body` and `Socket Spider Fitter`).
2. **Green**:
   - Update `exportTo3MF` in `engine.ts` to emit separate `<object>` resources when a socket fitter is enabled in `hollow_shell` mode.
   - Create `worker.ts` wrapping `exportToBinarySTL` and `exportTo3MF` with progress messages, and wire it into `parametric-lamp-designer.component.ts` with direct fallback when `Worker` is unavailable.
3. **Refactor**:
   - Ensure `ArrayBuffer` payloads use transferable objects (`[buffer]`) when posted from `worker.ts`.

### Slice 3: Complete Three.js Material, Bulb & GridHelper Disposal (`DEFECT-31-03`)
1. **Red**:
   - In `parametric-lamp-designer.component.spec.ts`, spy on `.dispose()` for `shadeMesh.material`, `bulbMesh.geometry`, `bulbMesh.material`, and `gridHelper.geometry`. Trigger `updateMaterial()` and `ngOnDestroy()`, asserting every spy was called.
2. **Green**:
   - In `updateMaterial()`, call `(this.shadeMesh.material as THREE.Material).dispose()` prior to assigning the new `THREE.MeshStandardMaterial`.
   - In `ngOnDestroy()`, dispose `this.bulbMesh` geometry/material, `this.gridHelper` geometry/material, and terminate any active worker.
3. **Refactor**:
   - Extract a helper `disposeObject3D(obj: THREE.Object3D | null)` for clean teardown.

### Slice 4: Mobile HUD Collision, Light Mode Button Contrast & `.c-input__control` / `.c-input__slider` (`DEFECT-31-01`, `DEFECT-31-04`)
1. **Red**:
   - In `parametric-lamp-designer.component.spec.ts`, query all `<select>` and `<input type="range">` elements and assert every `<select>` has `.c-input__control`, every range input has `.c-input__slider`, and `.c-lamp-designer__viewport-hud` wraps the badges and action buttons without inline `position: absolute` collision.
2. **Green**:
   - Update the template in `parametric-lamp-designer.component.ts` to use `.c-input__control` on `<select>` elements, `.c-input__slider` on `<input type="range">` elements, and `.c-lamp-designer__viewport-hud` for the viewport header bar.
   - Add [`parametric-lamp-designer.component.scss`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.scss) with responsive flex wrapping, high-contrast dark-canvas HUD buttons (`color: #f8fafc; background: rgba(15, 23, 42, 0.85)`), mobile preview ordering, and `>= 38px` touch targets.
3. **Refactor**:
   - Remove remaining inline `style="..."` attributes in favor of BEM classes.
