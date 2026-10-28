# Tasks 61: Remediation Checklist — 3D Parametric Lamp & Lampshade Designer

- **Spec ID**: `61`
- **Remediates Tool**: `31 - 3D Parametric Lamp & Lampshade Designer` (`parametric-lamp-designer`)

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [x] **1.1 (Red)**: Add unit test in `src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.spec.ts` (or `engine.spec.ts`) asserting `evaluateRibWave(..., 'voronoi', ...)` and `generateLampShadeGeometry({ ...DEFAULT_LAMP_CONFIG, ribWave: 'voronoi' })` produce valid watertight geometry with zero `NaN` vertices (`DEFECT-31-05`).
- [x] **1.2 (Green)**: Add `'voronoi'` to `RibWaveType` in `types.ts` and implement cellular Voronoi relief modulation in `evaluateRibWave()` in `engine.ts` (`DEFECT-31-05`).
- [x] **1.3 (Red)**: Add unit test asserting `calculateLampMetrics(config, prebuiltGeometry)` computes metrics from `prebuiltGeometry` without calling `generateLampShadeGeometry()` a second time (`DEFECT-31-02`).
- [x] **1.4 (Green)**: Update `calculateLampMetrics(config, existingGeometry?)` in `engine.ts` to reuse `existingGeometry` when provided (`DEFECT-31-02`).
- [x] **1.5 (Red)**: Add unit test asserting `exportTo3MF()` outputs separate `<object>` meshes for the shade body and socket spider fitter when `socketPreset !== 'none'` and `printMode === 'hollow_shell'` (`DEFECT-31-05`).
- [x] **1.6 (Green)**: Update `exportTo3MF()` in `engine.ts` to emit multi-object `.3mf` XML resources (`DEFECT-31-05`).

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [x] **2.1 (Red)**: Write component test verifying that updating any slider parameter executes `generateLampShadeGeometry` only once per update instead of twice (`DEFECT-31-02`).
- [x] **2.2 (Green)**: Replace `readonly metrics = computed(...)` in `parametric-lamp-designer.component.ts` with a writable `signal<LampMetrics>` updated inside `rebuildShadeMesh()` using the single generated geometry (`DEFECT-31-02`).
- [x] **2.3 (Green)**: Create `src/app/tools/3d/parametric-lamp-designer/worker.ts` to offload binary `.STL` and `.3MF` generation off the main thread with progress callbacks (`DEFECT-31-02`).
- [x] **2.4 (Red)**: Write component test spying on `.dispose()` for `shadeMesh.material` during `updateMaterial()` and on `bulbMesh.geometry`, `bulbMesh.material`, and `gridHelper` during `ngOnDestroy()` (`DEFECT-31-03`).
- [x] **2.5 (Green)**: Dispose replaced `shadeMesh.material` inside `updateMaterial()`, and dispose `bulbMesh` geometry/material, `gridHelper` geometry/material, and active `Worker` inside `ngOnDestroy()` (`DEFECT-31-03`).

## Phase 3: Component UI State & Form Control Accessibility (Seam 3 — Red → Green)
- [x] **3.1 (Red)**: Write component DOM test asserting all `<select>` elements use `.c-input__control`, all `<input type="range">` elements use `.c-input__slider`, and `voronoi` appears in the Rib Wave selector (`DEFECT-31-04`, `DEFECT-31-05`).
- [x] **3.2 (Green)**: Update `<select>` and `<input type="range">` classes in `parametric-lamp-designer.component.ts` from `.c-input` to `.c-input__control` and `.c-input__slider`, and add `<option value="voronoi">Voronoi Cellular Relief</option>` (`DEFECT-31-04`, `DEFECT-31-05`).

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [x] **4.1 (Red)**: Write component DOM test verifying the 3D viewport header uses `.c-lamp-designer__viewport-hud` instead of colliding inline `position: absolute; top: 12px` containers (`DEFECT-31-01`).
- [x] **4.2 (Green)**: Create/update `parametric-lamp-designer.component.scss` with `.c-lamp-designer__viewport-hud` flex layout (`flex-wrap: wrap; gap: 8px;`), explicit high-contrast dark-canvas HUD buttons (`background: rgba(15, 23, 42, 0.85); color: #f8fafc;`), mobile viewport ordering, and `min-height: 38px` touch targets (`DEFECT-31-01`, `DEFECT-31-04`).

## Phase 5: Verification & Regression Gate
- [x] **5.1**: Run unit tests: `npx vitest run src/app/tools/3d/parametric-lamp-designer/`
- [x] **5.2**: Run production build check: `npm run build`
- [x] **5.3**: Run headless Chrome audit (`node $SCRATCH/work/parametric-lamp-designer/test.mjs`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`
  - `smallTouchTargetCount === 0`
  - Non-overlapping HUD badges and legible `Bulb ON` / `Mesh` / `Reset View` buttons in Light Mode
  - Valid `.STL`, `.3MF`, and `.PNG` downloads
