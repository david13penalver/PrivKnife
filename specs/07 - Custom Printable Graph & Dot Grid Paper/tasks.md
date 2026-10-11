# Task List (TDD Vertical Slices): Custom Printable Graph & Dot Grid Paper

> **Tool**: `07 - Custom Printable Graph & Dot Grid Paper`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/documents/grid-paper/types.ts`
  - Define `GridStyle`, `PaperSize`, `PaperOrientation`, `GridPaperOptions`, `GridGeometry`, `PaperPreset`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/documents/grid-paper/test-fixtures.ts`
  - Define preset test configs (Dot Grid 5mm, Engineering Graph, Isometric 3D, Hexagonal, Ruled Notebook).

---

### 🟩 Phase 2: Grid Paper Engine — Vector Math & jsPDF Generation (Seam 1)
- [x] **Task 2.1: Implement Grid Geometry & Margin Boundary Checks (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `calculateGridGeometry()` calculates:
    - Point grid coordinates strictly bounded by page margins.
    - Square graph vertical and horizontal line segments with major accent line flags.
    - Isometric line angles (60° / 120°).
    - Hexagonal polygons.
    - Ruled horizontal lines.
  - **Implementation (Green)**: Implement `calculateGridGeometry()` and `getPaperDimensionsMm()` in `engine.ts`.
- [x] **Task 2.2: Implement Live Vector SVG Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generatePaperSvg()` produces valid SVG markup with viewBox, correct dimensions, and stroke attributes.
  - **Implementation (Green)**: Implement `generatePaperSvg()` in `engine.ts`.
- [x] **Task 2.3: Implement Vector PDF Generator with jsPDF (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generatePaperPdf()` compiles a valid PDF Blob and buffer:
    - Sets page dimensions and orientation.
    - Draws vector circles (`doc.circle()`) for dot grid or lines (`doc.line()`) for graph/ruled.
    - Applies color, opacity, line width, and bold major accents.
  - **Implementation (Green)**: Implement `generatePaperPdf()` in `engine.ts` using `jspdf`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `grid-paper.component.spec.ts`, assert:
    - Component initializes with default options and generates live SVG preview.
    - User can change grid style (Dot Grid, Square Graph, Isometric, Hexagonal, Ruled).
    - User can change spacing (pitch), margins, color, and line weight with immediate reactive updates.
    - Toggling major accent lines updates option state.
  - **Implementation (Green)**: Build `GridPaperComponent` with split-screen sidebar and live preview canvas.
- [x] **Task 3.2: Presets & LocalStorage Auto-Save (Red → Green)**
  - **Test (Red)**: In `grid-paper.component.spec.ts`, assert:
    - Selecting preset ("Bullet Journal", "Engineering", "Isometric") applies full config.
    - User edits persist to `localStorage` and recover on init.
    - Reset restores default state.
  - **Implementation (Green)**: Implement preset selector and `localStorage` persistence.

---

### 🟩 Phase 4: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 4.1: Download PDF & Trigger Confirmation Modal (Red → Green)**
  - **Test (Red)**: In `grid-paper.component.spec.ts`, assert:
    - Clicking "Download PDF" generates PDF, triggers anchor download with filename, and immediately revokes object URL.
    - Post-download modal is displayed.
  - **Implementation (Green)**: Implement `downloadPdf()`, modal dialog, and URL cleanup.
- [x] **Task 4.2: Download SVG for Vector Plotters / CAD (Red → Green)**
  - **Test (Red)**: In `grid-paper.component.spec.ts`, assert:
    - Clicking "Download SVG" generates `.svg` file and revokes object URL.
  - **Implementation (Green)**: Implement `downloadSvg()`.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 2)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `grid-paper.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run PDF and SVG generation, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/documents/grid-paper/index.ts` and add `gridPaperTool` to `TOOL_REGISTRY`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/grid-paper` (and alias `/tools/graph-dot-grid-paper`) with complete SEO metadata.
- [x] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/grid-paper`.
  - Mark Spec 07 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
