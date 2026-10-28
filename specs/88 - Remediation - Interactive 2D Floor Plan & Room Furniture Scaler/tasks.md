# Remediation Tasks: Interactive 2D Floor Plan & Room Furniture Scaler (Tool 58)

- **Target Tool**: `58` — `floor-plan-furniture-scaler`
- **Spec Reference**: [`specs/88 - Remediation - Interactive 2D Floor Plan & Room Furniture Scaler/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/88%20-%20Interactive%202D%20Floor%20Plan%20&%20Room%20Furniture%20Scaler/spec.md)
- **Plan Reference**: [`specs/88 - Remediation - Interactive 2D Floor Plan & Room Furniture Scaler/plan.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/88%20-%20Interactive%202D%20Floor%20Plan%20&%20Room%20Furniture%20Scaler/plan.md)

---

## Phase 1: Engine Remediation (`engine.ts`)

- [ ] **Task 1.1 (RED — `DEFECT-58-01`)**: Add failing unit tests in [`floor-plan-furniture-scaler.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.spec.ts) verifying that `generateFloorPlanSvg()` escapes `<`, `>`, `&`, `"`, and `'` in `project.name`, `r.name`, `f.name`, and `options.designerName`.
- [ ] **Task 1.2 (GREEN — `DEFECT-58-01`)**: Implement `escapeXml()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts) and apply it to all user/project text interpolated into SVG `<text>` nodes.
- [ ] **Task 1.3 (RED — `DEFECT-58-03`)**: Add failing unit tests in [`floor-plan-furniture-scaler.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.spec.ts) verifying wall-boundary collision warnings in `checkFurnitureClearances(furniture, walls)`, room resizing via `resizeRoomDimensions()`, and rotated furniture / window rendering in `generateBlueprintPdf()`.
- [ ] **Task 1.4 (GREEN — `DEFECT-58-03`)**: Update `checkFurnitureClearances()`, `generateBlueprintPdf()`, and `resizeRoomDimensions()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts).

---

## Phase 2: Component State, Error Handling & Resource Disposal (`floor-plan-furniture-scaler.component.ts`)

- [ ] **Task 2.1 (RED — `DEFECT-58-01`, `DEFECT-58-03`)**: Add failing component tests asserting that malformed JSON imports set `importError()` and render `.c-alert--danger`, `addFurnitureFromCatalog()` snaps coordinates using `snapToGrid()`, and room dimension controls resize the room.
- [ ] **Task 2.2 (GREEN — `DEFECT-58-01`, `DEFECT-58-03`)**: Update [`floor-plan-furniture-scaler.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts) to display `.c-alert--danger` on invalid JSON import, wire `snapToGrid()`, and add Room Width / Depth inputs.

---

## Phase 3: DOM Security & Sanitization (`floor-plan-furniture-scaler.component.ts`)

- [ ] **Task 3.1 (RED — `DEFECT-58-01`)**: Add a security unit test in [`floor-plan-furniture-scaler.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.spec.ts) importing a project with `name: '</text><img src=x onerror="window.__xss=true"><text>'` and verifying zero `<img>` or `[onerror]` nodes exist in the rendered `.c-preview` DOM.
- [ ] **Task 3.2 (GREEN — `DEFECT-58-01`)**: Sanitize `svgOutput()` with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` before calling `DomSanitizer.bypassSecurityTrustHtml()` in [`floor-plan-furniture-scaler.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts).

---

## Phase 4: Styling, BEM Compliance & Responsive Layout

- [ ] **Task 4.1 (RED — `DEFECT-58-02`, `DEFECT-58-04`)**: Add DOM assertions in [`floor-plan-furniture-scaler.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.spec.ts) checking for `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, and `.c-floor-plan__*` BEM classes.
- [ ] **Task 4.2 (GREEN — `DEFECT-58-02`, `DEFECT-58-04`)**: Refactor [`floor-plan-furniture-scaler.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts) to scale `<svg>` responsively inside `.c-preview` without clipping, add `.l-extremo__area-*` classes to the card header, replace inline styles with `.c-floor-plan__*` BEM SCSS, fix `.c-header__title` wrapping (`overflow-wrap: anywhere`), and enforce `>= 44px` touch targets on all controls.

---

## Phase 5: Final Verification & Regression Gate

- [ ] **Task 5.1**: Run `npx vitest run src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.spec.ts` and verify 100% of unit, security, and privacy tests pass.
- [ ] **Task 5.2**: Verify in headless Chrome at `1440×900`, `390×844`, and `320×568` that the full `1000×800` SVG blueprint renders uncropped, `scrollWidth <= clientWidth`, and `smallTouchTargets === 0`.
