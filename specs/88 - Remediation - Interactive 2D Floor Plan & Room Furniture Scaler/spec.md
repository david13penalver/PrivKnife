# Remediation Specification: Interactive 2D Floor Plan & Room Furniture Scaler (Tool 58)

- **Target Tool**: `58` — `floor-plan-furniture-scaler` (Interactive 2D Floor Plan & Room Furniture Scaler)
- **Category**: `documents`
- **Original Spec**: [`specs/58 - Interactive 2D Floor Plan & Room Furniture Scaler/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/58%20-%20Interactive%202D%20Floor%20Plan%20&%20Room%20Furniture%20Scaler/spec.md)
- **Audit Report**: [`tools_31_60_audit.md` §58](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md)
- **Source Directory**: [`PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/)
- **Remediation Priority**: `Critical`

---

## 1. Executive Summary & Audit Baseline

- **Audit Verdict**: Functional `⚠️ Partial` | Mobile `⚠️ Minor issues` | Overall `⚠️`
- **Desktop / Mobile / Small Screenshots**:
  - `desktop.png`, `mobile.png`, `mobile-small.png` (`$SCRATCH/shots/floor-plan-furniture-scaler/`)
  - `functional-studio-queenbed.png`, `functional-conference.png` (`$SCRATCH/shots/floor-plan-furniture-scaler/`)
- **Defect Summary Table**:

| Defect ID | Severity | Category | Summary |
| :--- | :--- | :--- | :--- |
| `DEFECT-58-01` | `Critical` | `DOM Security & Sanitization` | Stored/Self XSS via unescaped `project.name`, `r.name`, `f.name`, and `options.designerName` interpolated into `generateFloorPlanSvg()` and injected via `DomSanitizer.bypassSecurityTrustHtml()` without `DOMPurify`; invalid JSON import fails silently without UI error state |
| `DEFECT-58-02` | `Medium` | `Mobile & Responsive Layout` / `Viewport Rendering` | Fixed `<svg width="1000" height="800">` inside `.c-preview` (`align-items: center`) and `<div style="max-height: 520px">` leaves ~150px empty top space and clips the bottom wall, door swing arc, and architectural title block |
| `DEFECT-58-03` | `Medium` | `Engine Logic` / `Spec Conformance` | `snapToGrid()` is never invoked when adding or moving furniture; `checkFurnitureClearances(furniture, _walls)` ignores `_walls` boundary collisions; `generateBlueprintPdf()` ignores `f.rotationDeg`, `project.windows`, door arcs, and `options.blueprintScale`; room dimensions cannot be edited from the UI |
| `DEFECT-58-04` | `Low` | `Mobile & Responsive Layout` / `BEM & Form Accessibility` | Horizontal overflow at `390px` and `320px` (`426px`) from `.c-header__title`; header text collision (`Real-Time Scaled BlueprintWalls: 4 • Furniture: 3`); 8 undersized touch targets; heavy inline `style="..."` usage instead of `.c-floor-plan__*` BEM SCSS |

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-58-01` — Stored/Self XSS via Unescaped SVG Text Interpolation + `bypassSecurityTrustHtml()` Without `DOMPurify`
- **Severity**: `Critical`
- **Category**: `DOM Security & Sanitization`
- **Location**:
  - [`engine.ts#L246-L250`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L246-L250) (`r.name` in `generateFloorPlanSvg`)
  - [`engine.ts#L294-L295`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L294-L295) (`f.name` in `generateFloorPlanSvg`)
  - [`engine.ts#L314-L318`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L314-L318) (`project.name`, `options.designerName` in `generateFloorPlanSvg`)
  - [`floor-plan-furniture-scaler.component.ts#L428-L430`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts#L428-L430) (`sanitizedSvg`)
  - [`floor-plan-furniture-scaler.component.ts#L556-L567`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts#L556-L567) (`onJsonFileSelected`)
- **Audit Evidence & Reproduction Steps**:
  1. Import a `.json` project file containing `"name": "XSS</text><img src=x onerror=\"window.__xss=true\"><text>"` via **Import JSON**.
  2. `generateFloorPlanSvg()` interpolates `project.name` directly into `<text ...>PROJECT: ${project.name.toUpperCase()}</text>` (or `f.name` / `r.name` / `options.designerName` in default case) and `sanitizedSvg` passes the string directly to `this.sanitizer.bypassSecurityTrustHtml(this.svgOutput())` without `DOMPurify.sanitize()`.
  3. Headless Chrome audit verified `window.__xss === true` immediately after importing the JSON payload.
  4. Additionally, importing an invalid JSON file (`invalid.json`) catches the exception in `onJsonFileSelected()` (`line 565`) with only `console.error('Failed to import floor plan JSON:', err)` and zero user-facing error banner.
- **Root Cause Analysis**:
  - Direct violation of `AGENTS.md` §9 (*"When rendering user-supplied SVG or HTML, ALWAYS sanitize with DOMPurify before injecting into the DOM via Angular's DomSanitizer"*). Neither XML entity escaping (`escapeXml()`) in `engine.ts` nor `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` in the component is performed.

### `DEFECT-58-02` — Fixed `1000×800` SVG Inside Flex-Centered `.c-preview` Clips Bottom Wall, Door Arc & Title Block
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout` / `Viewport Rendering`
- **Location**:
  - [`engine.ts#L212`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L212) (`<svg width="${svgW}" height="${svgH}">`)
  - [`floor-plan-furniture-scaler.component.ts#L347-L356`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts#L347-L356)
- **Audit Evidence & Reproduction Steps**:
  1. Open `http://127.0.0.1:4300/tools/floor-plan-furniture-scaler` at `1440×900` (`desktop.png`) or `390×844` (`mobile.png`).
  2. Inspect the **Real-Time Scaled Blueprint** card: there is ~150px of empty dark space above the blueprint while the bottom wall (`y = 400 cm`), door swing arc, clearance legend, and title block are clipped off the bottom of the preview box.
- **Root Cause Analysis**:
  - `generateFloorPlanSvg()` emits hardcoded `width="1000" height="800"` attributes on `<svg>`, and the component places it inside `<div style="width: 100%; max-height: 520px; display: flex; justify-content: center;">` inside `.c-preview` (`display: flex; align-items: center; justify-content: center; overflow: auto`). When an `800px`-tall flex child overflows a `520px` flex container with `align-items: center`, the top overflows upward (unreachable by scroll) and the bottom is clipped. Setting responsive CSS (`width: 100%; height: auto; max-height: 520px; display: block`) on the `<svg>` makes the entire `1000×800` `viewBox` scale cleanly into the viewport without clipping.

### `DEFECT-58-03` — Unused `snapToGrid()`, Missing Wall-Boundary Collision Checks, Incomplete PDF Export, and Missing Room Dimension Controls
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**:
  - [`engine.ts#L18-L21`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L18-L21) (`snapToGrid`)
  - [`engine.ts#L110-L141`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L110-L141) (`checkFurnitureClearances`)
  - [`engine.ts#L373-L501`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L373-L501) (`generateBlueprintPdf`)
  - [`floor-plan-furniture-scaler.component.ts#L502-L527`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts#L502-L527) (`addFurnitureFromCatalog`, `updateSelectedFurnitureField`)
- **Audit Evidence & Reproduction Steps**:
  1. Change **Grid Snap** to `25 cm (Coarse)` and enter `X (cm) = 137` on a selected furniture item: the coordinate stays at `137` instead of snapping to `125` or `150` because `snapToGrid()` in `engine.ts` is never called by the component.
  2. Move a sofa to `X = -50, Y = -50` (straddling or outside the room walls): `checkFurnitureClearances(furniture, _walls)` returns `0` warnings because `_walls` is unused (`_walls: WallSegment[]`).
  3. Rotate a furniture item by `90°` (`rotateSelectedFurniture()`): the SVG preview rotates the item (`transform="rotate(90 ...)"`), but `generateBlueprintPdf()` (`engine.ts#L424-L435`) draws unrotated `f.widthCm × f.depthCm` rectangles, omits `project.windows` and door swing arcs, ignores `options.blueprintScale` (`1:20`, `1:50`, `1:100`), and draws a static `0 — 1m — 2m` scale bar.
  4. Users cannot adjust the active room's width or depth from the UI without hand-editing a JSON file.
- **Root Cause Analysis**:
  - `snapToGrid()` was implemented in `engine.ts` for unit tests but never wired into `addFurnitureFromCatalog()` or `updateSelectedFurnitureField()`.
  - `checkFurnitureClearances()` only iterates pairwise over `furniture[i]` and `furniture[j]`, ignoring `_walls` bounding box containment.
  - `generateBlueprintPdf()` uses `getEffectiveDimensions(f)` ONLY in `checkFurnitureClearances()`, while `lines 426-427` use raw `f.widthCm` and `f.depthCm` instead of `getEffectiveDimensions(f)`, and omit windows/door swing arcs/scale ratio.

### `DEFECT-58-04` — Mobile Horizontal Overflow, Header Text Collision, Undersized Touch Targets, and Inline Styles
- **Severity**: `Low`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**:
  - [`floor-plan-furniture-scaler.component.ts#L42-L49`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts#L42-L49)
  - [`floor-plan-furniture-scaler.component.ts#L338-L343`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts#L338-L343)
- **Audit Evidence & Reproduction Steps**:
  1. At `390×844` and `320×568`, `scrollWidth` is `426px` due to `.c-header__title`.
  2. In `.c-card__header.l-extremo` (`line 338`), the two child `<span>` elements lack `.l-extremo__area-izquierda` and `.l-extremo__area-derecha`, causing `Real-Time Scaled BlueprintWalls: 4 • Furniture: 3` to butt together with zero gap.
  3. 8 form controls (`4` `<select>` at `21px` height and `4` checkboxes at `13×13px`) and the `11px` furniture catalog buttons fall below the `44px` mobile touch target guideline.
- **Root Cause Analysis**:
  - Missing `.l-extremo__area-izquierda` / `.l-extremo__area-derecha` classes, missing `overflow-wrap: anywhere` on `.c-header__title`, and extensive inline `style="..."` attributes instead of structured `.c-floor-plan__*` BEM classes.

---

## 3. Target Acceptance Criteria

1. **Full XSS Protection & JSON Import Error Handling (`DEFECT-58-01`)**:
   - `generateFloorPlanSvg()` MUST escape all user/project strings (`project.name`, `r.name`, `f.name`, `options.designerName`, dimension labels) with `escapeXml()` (`&`, `<`, `>`, `"`, `'`).
   - `sanitizedSvg` MUST sanitize the generated SVG markup with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` before calling `DomSanitizer.bypassSecurityTrustHtml()`.
   - Importing a JSON file containing `<img src=x onerror=...>` or `<script>` MUST NOT execute any JavaScript (`window.__xss` remains `undefined`), and importing malformed JSON MUST set a user-visible `importError` signal rendered in `.c-alert--danger`.
2. **Uncropped Responsive SVG Blueprint Viewport (`DEFECT-58-02`)**:
   - The `<svg>` inside `.c-preview` MUST scale responsively (`width: 100%; height: auto; max-height: 520px; display: block`) so that all 4 walls, door swing arcs, clearance legend, and the bottom architectural title block are 100% visible without top dead space or bottom clipping on both desktop (`1440×900`) and mobile (`390×844`).
3. **Grid Snapping, Wall Collision Detection, Accurate PDF Export & Room Size Editing (`DEFECT-58-03`)**:
   - `snapToGrid()` MUST be applied when adding or moving furniture (or via a `Snap Position` action / coordinate update when `gridSnapStepCm > 1`).
   - `checkFurnitureClearances(furniture, walls)` MUST detect when a furniture item's effective bounding box (`getEffectiveDimensions(f)`) extends outside the room wall boundary (`minX`, `minY`, `maxX`, `maxY` of `walls`) and emit a `'collision'` warning (`"overlaps or extends beyond room wall boundary"`).
   - `generateBlueprintPdf()` MUST use `getEffectiveDimensions(f)` so rotated furniture (`90°` / `270°`) renders with accurate rotated width/depth, render `project.windows` and door swing indicators, and label the scale bar accurately according to `options.blueprintScale` and `options.measurementUnit`.
   - Provide **Room Width (cm)** and **Room Depth (cm)** numeric inputs in the configuration panel that dynamically resize the primary room polygon, bounding walls, and area calculation.
4. **Responsive BEM Layout & Accessible Touch Targets (`DEFECT-58-04`)**:
   - Zero horizontal overflow (`scrollWidth <= clientWidth`) at `1440px`, `390px`, and `320px`.
   - Add `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` to `.c-card__header.l-extremo`.
   - Replace inline `style="..."` blocks with `.c-floor-plan__*` BEM SCSS classes and ensure all inputs, selects, checkboxes, and buttons have `>= 44px` touch targets on mobile.
