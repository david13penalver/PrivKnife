# Remediation Implementation Plan: Interactive 2D Floor Plan & Room Furniture Scaler (Tool 58)

- **Target Tool**: `58` — `floor-plan-furniture-scaler`
- **Spec Reference**: [`specs/88 - Remediation - Interactive 2D Floor Plan & Room Furniture Scaler/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/88%20-%20Remediation%20-%20Interactive%202D%20Floor%20Plan%20&%20Room%20Furniture%20Scaler/spec.md)

---

## 1. Impacted Files

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| [`PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts) | `MODIFY` | Add `escapeXml()` to all SVG text interpolations (`DEFECT-58-01`), add wall-boundary collision detection in `checkFurnitureClearances()` and `resizeRoomDimensions()` helper (`DEFECT-58-03`), and fix `generateBlueprintPdf()` to use `getEffectiveDimensions(f)`, draw windows/door swing lines, and honor `blueprintScale` (`DEFECT-58-03`) |
| [`PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts) | `MODIFY` | Sanitize SVG with `DOMPurify.sanitize()` and add `importError` alert (`DEFECT-58-01`), fix responsive `<svg>` scaling inside `.c-preview` (`DEFECT-58-02`), wire `snapToGrid()` and Room Width/Depth inputs (`DEFECT-58-03`), and refactor inline styles to `.c-floor-plan__*` BEM SCSS with mobile touch target fixes (`DEFECT-58-04`) |
| [`PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.spec.ts) | `MODIFY` | Add security, engine, component, and responsive DOM tests covering `DEFECT-58-01` through `DEFECT-58-04` |

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Pure Engine Unit Tests (`engine.ts`)
- Test `generateFloorPlanSvg()` escapes malicious strings (`<img src=x onerror=alert(1)>`, `&`, `<`, `>`, `"`) in `project.name`, `r.name`, `f.name`, and `options.designerName` so no raw HTML tags can break out of `<text>` (`DEFECT-58-01`).
- Test `checkFurnitureClearances(furniture, walls)` emits a `'collision'` warning when a furniture item is placed outside the room wall bounding box (e.g., `xCm: -50, yCm: 100` or `xCm + widthCm > roomWidthCm`) (`DEFECT-58-03`).
- Test `generateBlueprintPdf()` uses `getEffectiveDimensions(f)` for rotated (`90°` / `270°`) items and renders windows and scale bar labels (`DEFECT-58-03`).
- Test `resizeRoomDimensions(project, widthCm, depthCm)` updates the primary room polygon, wall segments, and doors/windows clamped to the new room perimeter (`DEFECT-58-03`).

### Seam 2: Web Worker Message Contract Tests
- Not applicable (2D vector SVG/PDF math executes in `<5ms`), verified synchronous latency remains `<10ms`.

### Seam 3: Component State, Error Recovery & Resource Disposal (`floor-plan-furniture-scaler.component.ts`)
- Test importing a JSON file with an XSS payload in `name` does not inject executable `<img onerror>` or `<script>` elements into the rendered `.c-preview` DOM (`DEFECT-58-01`).
- Test importing malformed JSON sets `importError()` and renders `.c-alert--danger` (`DEFECT-58-01`).
- Test `addFurnitureFromCatalog()` and `snapSelectedFurnitureToGrid()` snap `xCm` and `yCm` via `snapToGrid(val, options().gridSnapStepCm)` (`DEFECT-58-03`).
- Test updating room width/depth inputs updates `project().walls` and `totalAreaFormatted()` (`DEFECT-58-03`).

### Seam 4: DOM, BEM, A11y & Security Verification
- Verify `.c-card__header.l-extremo` uses `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` (`DEFECT-58-04`).
- Verify `.c-preview svg` scales responsively (`width: 100%; height: auto; max-height: 520px`) (`DEFECT-58-02`).
- Verify zero network calls (`fetch` / `XMLHttpRequest`) during SVG generation, JSON import/export, and PDF export.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: SVG XML Escaping, `DOMPurify` Sanitization & JSON Import Error Alert (`DEFECT-58-01`)
- **RED**: Write unit tests in `floor-plan-furniture-scaler.component.spec.ts` asserting that:
  1. `generateFloorPlanSvg()` with `project.name = 'Bad</text><img src=x onerror=alert(1)><text>'` and `options.designerName = 'A & B <Studio>'` produces valid XML with `&lt;img` and `&amp;` and zero raw `<img` tags.
  2. Component `sanitizedSvg()` strips any `<script>` or `onerror` attributes via `DOMPurify.sanitize()`.
  3. Passing invalid JSON to `importProjectJsonString('{broken')` sets `importError()` and displays `.c-alert--danger`.
- **GREEN**:
  1. Add `export function escapeXml(str: string): string` in `engine.ts` and wrap `r.name`, `f.name`, `project.name`, and `options.designerName` in `generateFloorPlanSvg()`.
  2. Import `DOMPurify` in `floor-plan-furniture-scaler.component.ts` and sanitize `this.svgOutput()` with `DOMPurify.sanitize(rawSvg, { USE_PROFILES: { svg: true, svgFilters: true } })` before `this.sanitizer.bypassSecurityTrustHtml()`.
  3. Add `importError = signal<string | null>(null)` in `floor-plan-furniture-scaler.component.ts`, populate it on JSON parse/validation failure, and render `.c-alert.c-alert--danger` when present.
- **REFACTOR**: Extract `importProjectJsonString(rawJson: string)` method on the component for direct deterministic unit testing.

### Slice 2: Wall Collision Checks, Grid Snapping, Room Dimension Editing & Accurate PDF Export (`DEFECT-58-03`)
- **RED**: Write unit tests asserting that:
  1. Placing a furniture item at `xCm = -20, yCm = 50` inside a `[0, 0, 500, 400]` room triggers a `'collision'` clearance warning from `checkFurnitureClearances(project.furniture, project.walls)`.
  2. Adding furniture when `gridSnapStepCm = 25` snaps its initial `xCm` and `yCm` to multiples of `25`.
  3. Calling `updateRoomDimensions(600, 450)` updates the room area to `27.0 m²`.
  4. `generateBlueprintPdf()` succeeds with rotated furniture (`rotationDeg: 90`), windows, and `1:100` scale.
- **GREEN**:
  1. Enhance `checkFurnitureClearances(furniture, walls)` in `engine.ts` to compute the bounding box `[minWallX, minWallY, maxWallX, maxWallY]` from `walls` (when `walls.length > 0`) and emit a `'collision'` warning whenever a furniture item's effective bounds (`xCm < minWallX || yCm < minWallY || xCm + w > maxWallX || yCm + d > maxWallY`) extend outside the room perimeter.
  2. Add `export function resizeRoomDimensions(project: FloorPlanProject, widthCm: number, depthCm: number): FloorPlanProject` in `engine.ts` and expose **Room Width (cm)** and **Room Depth (cm)** inputs in the component.
  3. Apply `snapToGrid()` in `addFurnitureFromCatalog()` and `updateSelectedFurnitureField()` (for `xCm`/`yCm` when `snapToGrid` is active, or via a **Snap to Grid** button).
  4. Update `generateBlueprintPdf()` in `engine.ts` to use `getEffectiveDimensions(f)` for furniture rectangles, render `project.windows` and door swing arcs, and label the scale bar using `options.blueprintScale` and `options.measurementUnit`.
- **REFACTOR**: Clean up coordinate conversion helpers in `engine.ts`.

### Slice 3: Uncropped SVG Viewport, `.l-extremo` Header Fix & BEM Responsive Styles (`DEFECT-58-02`, `DEFECT-58-04`)
- **RED**: Write DOM tests asserting that `.c-card__header.l-extremo` contains `.l-extremo__area-izquierda` and `.l-extremo__area-derecha`, and that `.c-floor-plan__preview-stage svg` is styled to scale without clipping.
- **GREEN**:
  1. Replace the inline `max-height: 520px` wrapper in `floor-plan-furniture-scaler.component.ts` with `.c-floor-plan__preview-stage` where `svg { width: 100%; height: auto; max-height: 540px; display: block; }`.
  2. Add `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` to the preview card header.
  3. Replace inline `style="..."` attributes with `.c-floor-plan__*` BEM SCSS rules, add `overflow-wrap: anywhere` on `.c-header__title`, and ensure all `<select>`, `<input>`, checkbox labels, and catalog buttons have `>= 44px` touch target height on mobile.
- **REFACTOR**: Verify all unit tests pass and inspect desktop/mobile viewports in headless Chrome.
