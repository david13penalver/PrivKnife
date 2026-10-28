# Remediation Implementation Plan: Pet ID Tag & Collar Slide-On Generator

- **Spec ID**: `71`
- **Tool**: `41 - Pet ID Tag & Collar Slide-On Generator` (`pet-id-tag-generator`)
- **Route**: `/tools/pet-id-tag-generator`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/pet-id-tag-generator/
├── types.ts                                    # Add Worker request/response interfaces
├── engine.ts                                   # Integrate top eyelet lug on bone/heart, fix icon/text safe-zone bounds, subdivide curvedBand edges, and implement dualSided back-face engraving
├── engine.spec.ts                              # NEW/UPDATED: Assert eyelet enclosure on bone/heart, non-overlapping icon & hole, text within bone neck bounds, and dualSided back-face text
├── worker.ts                                   # NEW: Web Worker for off-main-thread STL/3MF export
├── pet-id-tag-generator.component.ts           # Add dualSided checkbox, fix mouseup leak, add touch orbit handlers, wire worker bridge
├── pet-id-tag-generator.component.scss         # NEW: Extract styles, fix light-mode contrast variables, fix 320px overflow & 38px touch targets
└── pet-id-tag-generator.component.spec.ts      # Add tests for dualSided toggle, mouseup cleanup, touch orbit, and responsive/theme classes
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions Under Test**:
  - `generatePetTagMesh(options: PetIdTagGeneratorOptions)`
  - `processPetTag(options, format)`
- **Concrete Assertions**:
  1. For `shape: 'bone'` and `shape: 'heart'`, `baseGeometry` has top-center (`|x| < 1.0`) vertices reaching `y >= holeY + holeR + 1.5`, proving the integrated top eyelet lug encloses the split-ring hole.
  2. For all shapes with `icon !== 'none'`, `iconGeometry` bounding box `max.y <= holeY - holeR - 0.3` (zero overlap between the emergency icon and split-ring hole).
  3. For `shape: 'bone'`, `textGeometry` bounding box `min.y` and `max.y` stay inside the bone waist (`[-neckH / 2 + 0.5, +neckH / 2 - 0.5]`).
  4. When `dualSided: true`, `textGeometry` includes vertices on the back side (`min.z < 0` for raised or recessed back-face engraving).

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `pet-id-tag-generator.component.ts`)
- **Protocol**:
  - Request: `{ id: number; options: PetIdTagGeneratorOptions; format: PetTagExportFormat }`
  - Response: `{ id: number; ok: true; result: PetIdTagGeneratorResult } | { id: number; ok: false; error: string }`
- **Lifecycle**: Terminated in `ngOnDestroy()`.

### Seam 3: Component State, Touch Controls & Resource Disposal Boundary (`pet-id-tag-generator.component.ts` / `pet-id-tag-generator.component.spec.ts`)
- **Assertions**:
  - Toggling the `dualSided` checkbox updates `dualSided()` and triggers `updatePreviewMesh()`.
  - `ngOnDestroy()` removes the window `'mouseup'` listener and terminates the worker.
  - Touch events on the canvas rotate `objectGroup`.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`pet-id-tag-generator.component.scss`)
- **Assertions**:
  - `.c-input__label`, `.checkbox-label`, `.metric-value`, and `.safety-list` use `var(--color-text-primary)` / `var(--color-text-secondary)`.
  - `scrollWidth <= clientWidth` at `390px` and `320px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Enclosed Top Eyelet Lug & Safe-Zone Layout for `bone` and `heart` Shapes
- **Red**: Write a test in `engine.spec.ts` generating a `bone` and `heart` tag and asserting:
  1. `baseGeometry` has vertices near `x = 0` (`|x| < 1.5`) with `y >= holeY + holeR + 1.5`.
  2. `iconGeometry` bounding box `max.y <= holeY - holeR`.
  3. `textGeometry` bounding box on `bone` stays within `|y| <= neckH / 2`.
  Observe failure on all 3 assertions.
- **Green**:
  1. In `buildTagShape()`, add an integrated top eyelet arch (`absarc(0, holeY, holeR + 2.0, ...)`) to the top-center contour of `bone` and `heart` when `mode === 'hanging_charm'`, and widen `bone` `neckH` to `h * 0.56`.
  2. In `generatePetTagMesh()`, compute shape-aware vertical layout bounds (`topSafeY = holeY - holeR - 1.2`, `bottomSafeY` respecting `bone` neck / `heart` tip) so the emergency icon and 1–3 lines of text never overlap the eyelet hole or overhang the bone waist.
- **Refactor**: Extract `computeTagContentLayout(options)` helper.

### Slice 2: Subdivided `curvedBand` Contour & `dualSided` Engraving Support
- **Red**: Write tests in `engine.spec.ts` asserting that:
  1. `generatePetTagMesh({ ...DEFAULT_PET_TAG_OPTIONS, mode: 'collar_slide_on', curvedBand: true })` has intermediate X vertices (`|x| < widthMm * 0.25`) with displaced Z values (`z < -1.0`).
  2. `generatePetTagMesh({ ...DEFAULT_PET_TAG_OPTIONS, dualSided: true })` places contact lines on the back face (`z <= 0`).
- **Green**:
  1. Subdivide the top and bottom horizontal segments of `collar_slide_on` in `buildTagShape()` into `24` segments so `curvedBand` bends smoothly across X.
  2. In `generatePetTagMesh()`, when `options.dualSided` is `true`, render `phonePrimary` and `line2` on the back face (`z = -textDepth` to `0` for `raised`, or `0` to `+textDepth` recessed into the back face, mirrored in X), and add the `dualSided` checkbox in `pet-id-tag-generator.component.ts`.
- **Refactor**: Keep front and back text geometry merged cleanly in `textGeometry`.

### Slice 3: Window Listener Cleanup, Touch Orbit & Web Worker Bridge
- **Red**: Write a component test spying on `window.removeEventListener('mouseup', ...)` on destroy.
- **Green**: Store `onWindowMouseUp` and remove it in `ngOnDestroy()`; add `touchstart`/`touchmove`/`touchend` canvas listeners and `worker.ts`.
- **Refactor**: Revoke download object URLs after anchor click.

### Slice 4: Light-Mode Contrast & 320px Mobile Overflow Fix
- **Red**: Check `layoutReport` at `320px` (`scrollWidth: 333`) and light-mode text colors (`#e2e8f0`, `#f8fafc`, `#d1d5db`).
- **Green**: Extract styles to `pet-id-tag-generator.component.scss`, replace hardcoded light colors with `var(--color-text-primary)` / `var(--color-text-secondary)`, and add `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
- **Refactor**: Verify 38px minimum touch target heights.
