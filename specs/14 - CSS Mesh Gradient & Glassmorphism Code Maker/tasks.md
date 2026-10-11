# Task List (TDD Vertical Slices): CSS Mesh Gradient & Glassmorphism Code Maker

> **Tool**: `14 - CSS Mesh Gradient & Glassmorphism Code Maker`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/dev/mesh-gradient-maker/types.ts`
  - Define `MeshPoint`, `GlassmorphismConfig`, `MeshGradientConfig`, `GradientPreset`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/dev/mesh-gradient-maker/test-fixtures.ts`
  - Define `DEFAULT_MESH_CONFIG`, `DEFAULT_GLASS_CONFIG`, and presets (Sunset, Aurora, Cyberpunk).

---

### 🟩 Phase 2: Core Mesh Gradient Engine & Code Exporters (Seam 1)
- [x] **Task 2.1: Implement Pure CSS Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generatePureCss()` generates multi-layer `radial-gradient` background and `backdrop-filter: blur(...)` glass styles.
  - **Implementation (Green)**: Implement CSS builder in `engine.ts`.
- [x] **Task 2.2: Implement Tailwind CSS Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateTailwindCss()` outputs standard utility classes (`backdrop-blur-...`, `bg-opacity`, `rounded-...`, `border-...`).
  - **Implementation (Green)**: Implement Tailwind formatter in `engine.ts`.
- [x] **Task 2.3: Implement Canvas Renderer & High-Res PNG Exporter (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `renderMeshToCanvas()` and `exportMeshPngBlob()` output valid 1200x800 canvas and PNG blob.
  - **Implementation (Green)**: Implement canvas radial compositing and PNG export in `engine.ts`.
- [x] **Task 2.4: Implement Point Randomizer & Preset Loader (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `randomizeMeshPoints()` generates bounded, distinct color nodes.
  - **Implementation (Green)**: Implement randomizer in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `mesh-gradient-maker.component.spec.ts`, assert:
    - Component initializes with default mesh and glass configurations.
    - User can add, edit, and move mesh points reactively.
    - Adjusting glassmorphism sliders updates preview styles and generated code.
  - **Implementation (Green)**: Build `MeshGradientMakerComponent` with visual preview, point chips, and glassmorphism sliders.
- [x] **Task 3.2: Code Output Tabs & Clipboard Action (Red → Green)**
  - **Test (Red)**: In `mesh-gradient-maker.component.spec.ts`, assert:
    - Tab switching between Pure CSS and Tailwind updates displayed code.
    - "Copy Code" copies snippet to clipboard with feedback state.
  - **Implementation (Green)**: Wire code panel tabs and clipboard handler.

---

### 🟩 Phase 4: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 4.1: Download High-Res PNG with Object URL Disposal (Red → Green)**
  - **Test (Red)**: In `mesh-gradient-maker.component.spec.ts`, assert:
    - Clicking download triggers anchor click for PNG and immediately revokes object URL.
    - Component cleanup (`ngOnDestroy`) disposes of all active preview object URLs.
  - **Implementation (Green)**: Implement `downloadPng()`, modal dialog, and lifecycle cleanup.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 2)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `mesh-gradient-maker.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run generation and download, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/dev/mesh-gradient-maker/index.ts` and add `cssMeshGradientMakerTool` to `TOOL_REGISTRY`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/css-mesh-gradient-maker` (and alias `/tools/mesh-gradient`) with complete SEO metadata.
- [x] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/css-mesh-gradient-maker`.
  - Mark Spec 14 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
