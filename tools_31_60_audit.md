# PrivKnife — Audit of Tools 31–60 (Functionality & Mobile Adaptation)

> Generated from live headless-Chrome testing (`google-chrome-stable` + `puppeteer-core`) against `ng serve` (dev build).
> Viewports: **Desktop 1366×900**, **Mobile 390×844 (touch, DPR2)**, **Small 320×640 (touch)**.
> Progress: **30 / 30** tools analysed. Last update: 2026-10-24T18:58:19.182Z

## Legend
- ✅ Works / well adapted — ⚠️ Works with issues — ❌ Broken / not adapted — ⏳ Pending

## Summary

| # | Tool | Functional | Mobile | Verdict |
|---|------|-----------|--------|---------|
| 31 | 3D Parametric Lamp & Lampshade Designer | ✅ Works | ⚠️ Minor issues | ⚠️ |
| 32 | Curved & Flat 3D Lithophane Maker | ✅ Works | ⚠️ Minor issues | ⚠️ |
| 33 | Gridfinity & Modular Drawer Bin Generator | ⚠️ Partial | ❌ Poor | ⚠️ |
| 34 | Parametric Electronics Box & Snap-Fit Enclosure | ⚠️ Partial | ❌ Poor | ⚠️ |
| 35 | Under-Desk Clamp & Cable Management Generator | ⚠️ Partial | ❌ Poor | ⚠️ |
| 36 | IKEA Skadis & Pegboard Hook & Holder Maker | ⚠️ Partial | ❌ Poor | ⚠️ |
| 37 | Geometric Plant Pot & Self-Watering Planter | ✅ Works | ⚠️ Minor issues | ⚠️ |
| 38 | Braille & ADA Tactile Door Sign Generator | ❌ Broken | ⚠️ Minor issues | ❌ |
| 39 | Custom Mechanical Keycap & Switch Tester Maker | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |
| 40 | Cappuccino Stencil & Airbrush Template Maker | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |
| 41 | Pet ID Tag & Collar Slide-On Generator | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |
| 42 | Honeycomb Storage Wall (HSW) Insert & Adapter | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |
| 43 | Passport, Visa & ID Biometric Photo Maker | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |
| 44 | HEIC & AVIF to JPG/PNG Batch Converter | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |
| 45 | Client-Side PDF Signer, Date Stamper & Initials | ⚠️ Partial | ❌ Poor | ⚠️ |
| 46 | Face & License Plate Privacy Blur Tool | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |
| 47 | Local OCR Image & Scanned PDF to Text/Word | ❌ Broken | ⚠️ Minor issues | ❌ |
| 48 | Zero-Knowledge File Encryptor & Vault | ✅ Works | ⚠️ Minor issues | ✅ |
| 49 | PII Log & CSV Scrubber & Data Anonymizer | ✅ Works | ⚠️ Minor issues | ⚠️ |
| 50 | Bank Statement CSV & OFX to Excel & QIF Converter | ✅ Works | ❌ Poor | ⚠️ |
| 51 | Audio Trimmer, Volume Booster & Ringtone Maker | ❌ Broken | ❌ Poor | ❌ |
| 52 | Client-Side Video Compressor & Social Resizer | ❌ Broken | ❌ Poor | ❌ |
| 53 | FDA & EU Nutrition Facts & Supplement Label Maker | ⚠️ Partial | ❌ Poor | ⚠️ |
| 54 | SVG Optimizer, Path Cleaner & React/Vue Exporter | ✅ Works | ❌ Poor | ⚠️ |
| 55 | Side-by-Side Code & Contract Diff Checker | ✅ Works | ⚠️ Minor issues | ⚠️ |
| 56 | Web Font Subsetter & TTF/OTF to WOFF2 Converter | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |
| 57 | Seamless Tileable Texture & Pattern Generator | ✅ Works | ⚠️ Minor issues | ⚠️ |
| 58 | Interactive 2D Floor Plan & Room Furniture Scaler | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |
| 59 | Printable Emergency Recovery & Password Kit Sheet | ✅ Works | ⚠️ Minor issues | ⚠️ |
| 60 | CSV/Paste to Vector Chart & Infographic Builder | ⚠️ Partial | ⚠️ Minor issues | ⚠️ |

## Methodology
1. **Baseline**: load each route at 3 viewports; collect console/page errors, failed & external network requests (privacy), horizontal overflow, touch targets < 32px, text < 11px, inputs < 16px (iOS zoom).
2. **Functional**: drive the main workflow (sample data / generated fixture files), trigger outputs (downloads/exports/copies) and verify result validity (file size, magic bytes, parseability).
3. **Code review**: engine/worker split, resource cleanup (`revokeObjectURL`, worker terminate, Three.js dispose), responsive SCSS (media queries), spec conformance (`specs/NN - */spec.md`).
4. **Visual review**: screenshots inspected at mobile widths.

---

<a id="tool-31"></a>
## 31 — 3D Parametric Lamp & Lampshade Designer (`/tools/parametric-lamp-designer`)

**Verdict:** ⚠️ Core 3D parametric generation, live WebGL preview, and STL/3MF/PNG exports work cleanly with zero errors, but mobile viewport overlays collide at 390px/320px and form controls misuse `.c-input` instead of `.c-input__control`/`.c-input__slider`.

### Functional testing
- **Initial state & 3D preview:** Loads `Nordic Flute` preset cleanly (`190.1 × 190.1 × 190 mm`, `70,392` triangles, `~248 grams`, `~8.9 hours`), rendering the illuminated lampshade and printer bed grid in WebGL with zero console, page, or network errors.
- **Presets & Parameter Controls:** Tested all 5 curated presets (`Nordic Flute`, `Origami Lantern`, `Empire Pleat`, `Swirl Ripple`, `Modern Spiral Vase`), profile curves, rib wave shapes, print mode toggle (`Watertight Hollow Shell` vs `Spiralize Vase Mode` reducing `Origami Lantern` from `1,864` to `816` triangles), socket presets (`E27`, `E14`, `IKEA`, `Custom`, `None`), filament simulation materials, viewport controls (`Bulb ON/OFF`, `Mesh` wireframe, `Reset View`), and `Reset Defaults` (restoring `70,392` triangles).
- **Export verification:**
  - **Binary `.STL`:** `PrivKnife_Shade_hourglass_200mm_E27.stl` (`93,284` bytes) has a valid 80-byte ASCII header, `1,864` triangles at byte offset 80, and exact byte length (`84 + 1864 × 50 = 93,284`).
  - **`.3MF` Archive:** `PrivKnife_Shade_hourglass_200mm_E27.3mf` (`35,123` bytes) is a valid ZIP package containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with `5,592` vertices and `1,864` triangles.
  - **High-Res `.PNG`:** `PrivKnife_LampShade_hourglass_200mm.png` (`66,710` bytes, valid PNG signature, `697 × 520` px).

### Mobile adaptation (390px / 320px)
- **Horizontal overflow:** None (`scrollWidth === viewport` at both 390px and 320px).
- **Touch targets:** 17 small targets flagged across all viewports (`<select class="c-input">` rendered at 21px height and `<input type="range" class="c-input">` at 16px height) because the template applies the wrapper class `.c-input` directly to `<select>` and `<input>` elements instead of `.c-input__control` (`min-height: 38px` in `_c-input.scss`) and `.c-input__slider`.
- **Viewport overlay collision (390px & 320px):** Inside the 3D canvas card, the top-left badge group (`Bed: 256×256 mm`, `Triangles: 70,392`) and top-right button bar (`💡 Bulb ON`, `Mesh`, `Reset View`) are both positioned with `position: absolute; top: 12px;` and collide/overlap directly on top of each other on narrow viewports.
- **Button contrast in dark canvas overlay:** `Mesh` and `Reset View` use `.c-button--outline` (`color: var(--color-text-primary)` which is dark slate in light theme) over a dark `#0f172a` WebGL background, making their labels nearly invisible in light mode.
- **Layout & ordering:** The 3D preview is placed below all 4 configuration cards on mobile (`max-width: 900px` single-column stack), requiring the user to scroll past ~1,400px of sliders to see changes in the 3D viewport.

### Code review
- **Pure engine (`engine.ts`):** Pure TypeScript + Three.js/JSZip math with zero Angular or DOM dependencies.
- **Thread safety (Directive 3) & duplicate computation:** No Web Worker (`worker.ts`) is used. Furthermore, `metrics` is a `computed()` signal that calls `generateLampShadeGeometry(this.config())` synchronously on the main thread every time `config()` changes, and `rebuildShadeMesh()` immediately calls `generateLampShadeGeometry(this.config())` a second time—generating 70k+ triangles twice per slider tick on the main UI thread.
- **Memory hygiene (Directive 4):** `URL.revokeObjectURL()` is called after downloads (`downloadStl`, `download3mf`), and `shadeMesh` geometry is disposed on rebuild. However, `updateMaterial()` creates a new `THREE.MeshStandardMaterial` without calling `.dispose()` on the replaced material, and `ngOnDestroy()` does not dispose `bulbMesh` geometry/material or `GridHelper`.
- **Privacy (Directives 1 & 2):** 100% client-side, zero network requests.
- **BEM & Styling:** Uses custom `.lamp-workspace` class instead of strict `c-`/`l-`/`g--` prefix, and relies heavily on inline `style="..."` attributes.
- **Spec conformance:** Spec mentions `voronoi_perforated` surface pattern and multi-component `.3mf` (separate socket collar + shade body objects); implementation provides 4 rib profiles (`sine`, `pleat`, `scallop`, `gear`) and exports a single merged mesh object (`<object id="1">`) in `.3mf`.
- **Routing & Registration:** Properly registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| Medium | Top-left info badges and top-right action buttons overlap inside the 3D canvas header on 390px and 320px screens, and `.c-button--outline` text is illegible against the dark canvas in light theme | [parametric-lamp-designer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L473-L509) | Move the toolbar into a flex bar above/below the canvas or stack badges and buttons at `@media (max-width: 640px)`, and give canvas overlay buttons explicit light text/semi-opaque dark background. |
| Medium | Duplicate main-thread mesh generation on every slider input & no Web Worker (`generateLampShadeGeometry` runs in both `metrics` computed signal and `rebuildShadeMesh`) | [parametric-lamp-designer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L619-L629), [L831-L861](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L831-L861) | Compute `metrics` once inside `rebuildShadeMesh()` (updating a writable `signal<LampMetrics>`) and offload heavy mesh/export generation to a Web Worker. |
| Low | `<select>` (21px tall) and `<input type="range">` (16px tall) use `.c-input` container class instead of `.c-input__control` / `.c-input__slider` | [parametric-lamp-designer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L105-L115), [_c-input.scss](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/styles/04_components/_c-input.scss#L23-L92) | Use `class="c-input__control"` on `<select>` elements and `class="c-input__slider"` (with >=24px touch height) on range inputs. |
| Low | Material leak in `updateMaterial()` and undisposed `bulbMesh` / `GridHelper` in `ngOnDestroy()` | [parametric-lamp-designer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L647-L665), [L879-L884](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L879-L884) | Dispose old `this.shadeMesh.material` before assigning `newMat`, and dispose `bulbMesh` geometry/material in `ngOnDestroy()`. |

---

<a id="tool-32"></a>
## 32 — Curved & Flat 3D Lithophane Maker (`/tools/lithophane-maker`)

**Verdict:** ⚠️ Image-to-heightmap displacement, 4 lithophane geometry types, backlit 3D preview, and STL/3MF exports work reliably, but hardcoded dark-mode text colors make telemetry metrics and slicer tips nearly invisible in light mode, preset button descriptions overflow on desktop, and 3D Viewport lacks touch event handlers on mobile.

### Functional testing
- **Initial state & 3D preview:** Loads with a procedural gradient image (`100 × 80 × 3 mm`, `16,184 tris`, `17.9 g (PLA)`, `~35.1 hrs`) and renders the backlit lithophane in WebGL with zero console, page, or network errors.
- **Image upload & Sample photos:** Uploaded a custom `160 × 120` radial-gradient PNG via `input[type=file]`; the component automatically adjusted aspect ratio to `100 × 75 × 3 mm` (`15,332 tris`, `16.7 g`). Tested all 3 built-in sample patterns (`Sunburst Gradient`, `Portrait Vignette`, `Geometric Grid`), contrast boost, and `Invert Optical Relief`.
- **Presets & Geometry styles:** Tested all 4 starting templates (`Curved Desk Portrait`, `Classic Flat Photo Frame`, `360° Cylinder Lampshade`, `LED Night Light Panel`), geometry buttons (`Flat Plate`, `Curved Arc`, `360° Cylinder` producing `35.8 × 110 × 35.8 mm` / `22,960 tris`, `Nightlight Tab`), `Backlight: ON/OFF` toggle, stabilizing foot checkbox, and `Reset Defaults` (restoring `100 × 80 × 3 mm`, `16,184 tris`).
- **Export verification:**
  - **Binary `.STL`:** `privknife-lithophane-curve_arc-110x85mm.stl` (`2,275,284` bytes) has a valid 80-byte header (`PrivKnife 3D Lithophane Maker - Client-Side STL Export`), `45,504` triangles (`resolution: 120`), and exact byte size (`84 + 45504 × 50 = 2,275,284`).
  - **`.3MF` Archive:** `privknife-lithophane-curve_arc-110x85mm.3mf` (`395,332` bytes) is a valid ZIP archive containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with `22,756` vertices and `45,504` triangles.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow:** None (`scrollWidth === viewport` at 1366px, 390px, and 320px).
- **Touch targets:** 9 small targets flagged: 7 range sliders (`16px` tall due to `.c-input--slider` instead of `.c-input__slider`) and 2 native `<input type="checkbox">` (`13 × 13` px).
- **No touch orbit/zoom on 3D viewport:** `.litho-viewport` only binds `(mousedown)`, `(mousemove)`, `(mouseup)`, and `(mouseleave)` (`lithophane-maker.component.ts` lines 358–361)—neither `OrbitControls` nor `(touchstart)`/`(touchmove)`/`(wheel)` handlers are attached, so mobile users cannot rotate or zoom the 3D preview, and desktop users cannot scroll-zoom despite the hint text reading `"🖱️ Click & Drag to Orbit • Scroll to Zoom"`.
- **Unreadable text in Light Theme (all viewports):** `.metric-value` uses hardcoded `color: #f3f4f6` on `background: rgba(255, 255, 255, 0.04)` and `.slicer-list` uses `color: #cbd5e1` on `rgba(59, 130, 246, 0.08)`, rendering the dimensions, triangle count, weight, print time, and slicer recommendations almost completely white-on-white in the default light theme.
- **Preset description text overflow on desktop:** `.c-button` sets `white-space: nowrap` at viewports `> 640px` (`_c-button.scss` line 23); because `.litho-preset-btn` does not override `white-space: normal`, the 2-line preset descriptions overflow horizontally out of the preset buttons and overlap adjacent buttons on desktop.

### Code review
- **Pure engine (`engine.ts`):** Pure functions with ITU-R BT.601 luminance (`0.299R + 0.587G + 0.114B`), watertight perimeter stitching, and STL/3MF serialization with zero Angular/DOM dependencies.
- **Thread safety (Directive 3):** No Web Worker (`worker.ts`) is implemented. Preview mesh generation (`resolution: 70`, ~16k–23k triangles) and high-resolution export (`resolution: 120`, 45,504 triangles + JSZip compression) run synchronously on the main UI thread. Also, the `isGenerating()` / `progressPercent()` signals and `<app-progress-bar>` overlay in the template (lines 364–368, 622–623) are dead code—never updated during generation or export.
- **Memory hygiene (Directive 4):** `URL.createObjectURL()` calls in `onFileDropped()` and `downloadFormat()` are pushed to `this.activeDownloadUrls` and only revoked in `ngOnDestroy()`, rather than immediately after image load (`img.onload`) or download trigger. Three.js geometry and material are properly disposed on rebuild and destroy.
- **Spec conformance:** Spec lists `.stl`, `.3mf`, and `.png` export deliverables; only `.stl` and `.3mf` export buttons are implemented (no PNG snapshot button).
- **BEM & Styling:** Uses custom unprefixed classes (`.litho-presets`, `.param-grid`, `.metrics-grid`, `.slicer-box`, etc.) and hardcoded dark-mode hex colors instead of CSS custom properties (`var(--color-text-primary)`, `var(--color-bg-subtle)`).
- **Routing & Registration:** Properly registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Hardcoded light text colors (`#f3f4f6`, `#cbd5e1`) on transparent backgrounds make telemetry metrics and slicer instructions nearly invisible in Light Mode | [lithophane-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L538-L577) | Replace hardcoded hex colors in `.metric-card`, `.metric-label`, `.metric-value`, `.slicer-title`, and `.slicer-list` with theme variables (`var(--color-bg-subtle)`, `var(--color-border-default)`, `var(--color-text-primary)`, `var(--color-text-secondary)`). |
| Medium | 3D viewport lacks touch events (`touchstart`/`touchmove`) for mobile orbit and `wheel` listener for zoom (or `OrbitControls`), making 3D rotation impossible on touch screens and zoom impossible everywhere | [lithophane-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L355-L373), [L1047-L1070](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L1047-L1070) | Use Three.js `OrbitControls(this.camera, this.renderer.domElement)` (which supports touch pinch/orbit and mouse wheel out of the box) and dispose it in `ngOnDestroy()`. |
| Medium | Preset button descriptions overflow and collide horizontally on desktop (`> 640px`) because `.c-button` enforces `white-space: nowrap` | [lithophane-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L443-L457) | Add `white-space: normal;` to `.litho-preset-btn` so preset descriptions wrap inside the 2-column grid cards on desktop. |
| Medium | High-resolution mesh generation (`45,504` triangles) and 3MF ZIP compression run on the main thread without a Web Worker (Directive 3), and `URL.revokeObjectURL` is deferred until `ngOnDestroy` instead of right after `img.onload` / download | [lithophane-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L821-L896) | Offload `processLithophane` to a Web Worker and revoke object URLs immediately inside `img.onload`/`img.onerror` and after `a.click()`. |
| Low | Range sliders (`16px` height) use non-existent `.c-input--slider` class instead of `.c-input__slider` and checkboxes are `13×13px` | [lithophane-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L122-L141) | Use `.c-input__slider` and `.c-input__switch` (or `width: 18px; height: 18px` on checkboxes). |

---

<a id="tool-33"></a>
## 33 — Gridfinity & Modular Drawer Bin Generator (`/tools/gridfinity-bin-generator`)

**Verdict:** ⚠️ Parametric Gridfinity bin generation, subdividers, scoops, label tabs, and STL/3MF exports work cleanly, but the `Base Magnet Pockets` checkbox is a no-op in `engine.ts`, hardcoded light text colors make telemetry/slicer tips unreadable in Light Mode, and 320px viewports suffer from horizontal scroll (`365px`).

### Functional testing
- **Initial state & 3D preview:** Loads default `1×1 (3U)` bin (`41.8 × 41.8 × 24.8 mm`, `1 pocket`, `10.3 g (PLA)`, `~1.8 hrs`) and renders the Gridfinity orange mesh in WebGL with zero console, page, or network errors.
- **Presets & Controls:** Tested all 5 curated presets (`1×1 Small Parts Bin (3U)`, `1×2 Dual Compartment (4U)`, `2×2 Deep Storage (6U)`, `3×1 Low-Profile Tool Tray (2U)`, `2×3 6-Pocket Organizer (6U)` updating dimensions to `83.8 × 125.8 × 45.8 mm`, `6 pockets`, `73.4 g`, `~7.7 hrs`), unit width/depth buttons (`1`–`6`), height slider (`2U`–`14U`), stacking lip styles (`Standard Gridfinity` `45.8 mm` vs `Flat Rim` `42 mm` vs `None`), X/Y compartments, finger scoop, label tab, and `Reset Defaults`.
- **Unimplemented Magnet & Screw Base Holes:** Toggling `Base Magnet Pockets (6×2mm neodymium press-fit pockets)` updates the `baseMagnetHoles` signal and triggers `rebuildMesh()`, but `generateGridfinityGeometry()` in `engine.ts` never reads `options.baseMagnetHoles` or `options.baseScrewHoles`—the exported mesh has solid flat bottom pads with zero magnet or screw pockets (`260` triangles regardless of checkbox state). Also, `fingerScoopRadiusMm`, `labelTabWidthMm`, `labelAngleDeg`, and `baseScrewHoles` exist as signals in the component (`lines 523–529`) and in the spec interface, but have no UI controls in the template.
- **Export verification:**
  - **Binary `.STL`:** `gridfinity-bin-2x3x6U.stl` (`13,084` bytes) has a valid 80-byte header, `260` triangles, and exact byte length (`84 + 260 × 50 = 13,084`).
  - **`.3MF` Archive:** `gridfinity-bin-2x3x6U.3mf` (`4,342` bytes) is a valid ZIP archive containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with `520` vertices and `260` triangles.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow at 320px:** `scrollWidth` is `365px` on a `320px` viewport (`hasHorizontalScroll: true`), caused by the `<h1 class="c-header__title">` and `.unit-btn-row` (6 buttons in a non-wrapping `display: flex; gap: 6px;` row) exceeding the 320px container width.
- **Unreadable text in Light Theme:** Identical to Tool 32, `.metric-value` (`color: #f3f4f6` on `rgba(255, 255, 255, 0.04)`) and `.slicer-list` (`color: #cbd5e1`) use hardcoded dark-theme text colors, making the dimensions, compartment count, weight, print time, and slicer settings almost invisible in Light Mode.
- **Preset description text overflow on desktop:** `.gridfinity-preset-btn` inherits `white-space: nowrap` from `.c-button` at `> 640px`, causing 2-line preset descriptions to spill outside the preset buttons and overlap adjacent buttons on desktop.
- **No touch orbit/zoom on 3D viewport:** Only mouse events (`mousedown`/`mousemove`/`mouseup`/`mouseleave`) are bound on `.gridfinity-viewport`; touch dragging and scroll-wheel zooming are not implemented.
- **Touch targets:** 6 small targets flagged (3 range sliders at `16px` height and 3 native checkboxes at `13×13px`).

### Code review
- **Pure engine (`engine.ts`):** Pure TypeScript + Three.js/JSZip without DOM or Angular dependencies. Note that in `addQuad()` (`lines 244–257`), the left/right cap triangles of `labelTab` pass a degenerate quad where the 1st and 4th vertices are identical (`[tabMinX, tabRearY, tabBottomZ]`), producing a zero-area triangle alongside the valid triangle.
- **Thread safety (Directive 3):** Mesh generation (~260 triangles) is very fast (<5ms), so main-thread execution is acceptable for preview, though 3MF ZIP compression runs on the main thread without a worker.
- **Memory hygiene (Directive 4):** Three.js geometries and materials are properly disposed in `rebuildMesh()` and `ngOnDestroy()`. Download `ObjectURL`s are stored in `activeDownloadUrls` and revoked in `ngOnDestroy()`.
- **BEM & Styling:** Uses custom unprefixed classes (`.gridfinity-presets`, `.unit-btn-row`, `.metrics-grid`, etc.) and hardcoded hex colors.
- **Routing & Registration:** Properly registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Hardcoded dark-mode text colors (`#f3f4f6`, `#cbd5e1`) on near-transparent backgrounds make telemetry metrics and slicer tips nearly invisible in Light Mode | [gridfinity-bin-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L449-L488) | Replace hardcoded hex colors in `.metric-card`, `.metric-value`, `.slicer-title`, and `.slicer-list` with CSS custom properties (`var(--color-bg-subtle)`, `var(--color-text-primary)`, `var(--color-text-secondary)`). |
| Medium | `baseMagnetHoles` checkbox and `baseScrewHoles` option are ignored by `generateGridfinityGeometry()` — no magnet or screw pockets are generated in the 3D mesh | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/engine.ts#L52-L68), [L123-L159](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/engine.ts#L123-L159) | Generate 4 corner recessed cylindrical pockets (6.5mm dia × 2.4mm depth for magnets, 3.2mm dia for M3 screws) in the bottom face of each 42mm base cell when `baseMagnetHoles` / `baseScrewHoles` are enabled, and expose the missing UI controls (`baseScrewHoles`, `fingerScoopRadiusMm`, `labelTabWidthMm`, `labelAngleDeg`). |
| Medium | Horizontal page overflow at 320px (`scrollWidth: 365px`) and preset button text collision on desktop (`> 640px`) | [gridfinity-bin-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L363-L390) | Add `flex-wrap: wrap;` to `.unit-btn-row`, `overflow-wrap: anywhere;` to `.c-header__title`, and `white-space: normal;` to `.gridfinity-preset-btn`. |
| Medium | 3D viewport lacks touch events (`touchstart`/`touchmove`) for mobile rotation and `wheel` listener for zoom | [gridfinity-bin-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L282-L293), [L820-L842](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L820-L842) | Attach Three.js `OrbitControls` to support touch orbit/pinch-zoom and mouse wheel zoom. |
| Low | Range sliders (`16px` height) use `.c-input--slider` instead of `.c-input__slider` and checkboxes are `13×13px` | [gridfinity-bin-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L135-L143), [L219-L250](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L219-L250) | Use `.c-input__slider` and increase checkbox hit target size. |

---

<a id="tool-34"></a>
## 34 — Parametric Electronics Box & Snap-Fit Enclosure (`/tools/electronics-box-enclosure`)

**Verdict:** ⚠️ Generates valid 2-part STL and multi-object 3MF enclosures with microcontroller standoffs and snap/screw joints, but `cornerRadiusMm` is unimplemented, `ventilationGrille` adds raised bars instead of slots, mobile viewports have horizontal overflow (`421px` on `390px`), and Light Mode telemetry text is nearly invisible.

### Functional testing
- **Initial state & 3D preview:** Loads default `DIY Project Box (Snap-Fit)` (`84 × 54 × 34 mm` outer footprint, `288 tris`, `43 g (PLA)`, `~3.8 hrs`), rendering both the base tub and lid side-by-side in WebGL with zero console, page, or network errors.
- **Presets & Controls:** Tested all 4 microcontroller presets (`DIY Project Box`, `Arduino Uno R3/R4 Box` updating to `79 × 62 × 28 mm` and `312 tris`, `ESP32 DevKit Compact Case`, `Raspberry Pi Pico Slider`), dimension sliders (`Inner Length`, `Inner Width`, `Inner Height`, `Wall Thickness`), closure mechanisms (`Cantilever Snap-Fit`, `M3 Screw Bosses`, `Friction Sliding Lid`), `PCB Standoff Height`, `Cable Pass-Through` + `Port Cutout Width`, `Heat Dissipation Cooling Grille Slots`, `Exploded View: ON/OFF` toggle, and `Reset Defaults`.
- **Unimplemented / flawed geometry features:**
  - `cornerRadiusMm` (`3.0 mm` signal in component, specified in `ElectronicsBoxEnclosureOptions`) has no UI slider and is completely ignored by `generateEnclosureGeometries()` in `engine.ts` (all walls use sharp rectangular `pushBox` primitives).
  - `ventilationGrille` (`engine.ts` lines 255–267) does not cut through-slots in the lid; instead it appends `0.8 mm` raised solid bars (`lidH` to `lidH + 0.8`) on top of the solid lid plate (`0` to `lidH`), providing zero airflow.
  - When `explodedView: false` (print-bed layout), the lid plate sits at `z = [0, lidH]` while its interlocking lip protrudes downward to `z = -lipProtrusion` (`-4.0 mm` for snap-fit), placing the lid plate in mid-air above the bed unless re-oriented in the slicer.
- **Export verification:**
  - **Binary `.STL`:** `electronics-box-75x58x24mm.stl` (`15,684` bytes) has a valid 80-byte header, `312` triangles, and exact byte length (`84 + 312 × 50 = 15,684`).
  - **Multi-Object `.3MF`:** `electronics-box-75x58x24mm.3mf` (`4,033` bytes) is a valid ZIP archive containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with 2 separate `<object>` definitions (`Base Enclosure` id=1 and `Lid Cover` id=2), `624` vertices, and `312` triangles.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow at both 390px and 320px:** `scrollWidth` is `421px` at `390px` viewport and `420px` at `320px` viewport (`hasHorizontalScroll: true`), caused by `.c-header` / `<h1 class="c-header__title">` overflowing horizontally out of the page container (visible in both mobile screenshots).
- **Unreadable text in Light Theme:** `.metric-value` (`color: #f3f4f6` on `rgba(255, 255, 255, 0.04)`) and `.slicer-list` (`color: #cbd5e1`) are hardcoded for a dark background, making all telemetry metrics and slicer tips nearly invisible in Light Mode.
- **Preset description text overflow on desktop:** `.enclosure-preset-btn` inherits `white-space: nowrap` from `.c-button` at `> 640px`, causing the 2-line descriptions to overflow out of the preset buttons and collide across columns on desktop.
- **No touch orbit/zoom on 3D viewport:** Only mouse events (`mousedown`/`mousemove`/`mouseup`/`mouseleave`) are bound on `.enclosure-viewport`; touch dragging and scroll-wheel zooming are not implemented.
- **Touch targets:** 8 small targets flagged (6 range sliders at `16px` height and 2 native checkboxes at `13×13px`).

### Code review
- **Pure engine (`engine.ts`):** Pure TypeScript + Three.js/JSZip without DOM or Angular dependencies. Properly exports multi-object `.3mf` with separate base and lid objects.
- **Memory hygiene (Directive 4):** `baseGeometry`, `lidGeometry`, and `combinedGeometry` are properly disposed after metrics/export and on component teardown. Download `ObjectURL`s are tracked in `activeDownloadUrls` and revoked in `ngOnDestroy()`.
- **BEM & Styling:** Uses custom unprefixed classes (`.enclosure-presets`, `.closure-btn-row`, `.metrics-grid`, etc.) and hardcoded hex colors.
- **Routing & Registration:** Properly registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Horizontal page overflow on both 390px (`scrollWidth: 421px`) and 320px (`scrollWidth: 420px`) mobile viewports, plus desktop preset button text collision | [electronics-box-enclosure.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L46-L56), [L363-L377](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L363-L377) | Add `min-width: 0; overflow-wrap: anywhere;` to `.c-header__title-group` / `.c-header__title` and `white-space: normal;` to `.enclosure-preset-btn`. |
| High | Hardcoded dark-mode text colors (`#f3f4f6`, `#cbd5e1`) make telemetry metrics and slicer tips nearly invisible in Light Mode | [electronics-box-enclosure.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L435-L474) | Replace hardcoded hex colors in `.metric-card`, `.metric-value`, `.slicer-title`, and `.slicer-list` with CSS custom properties (`var(--color-bg-subtle)`, `var(--color-text-primary)`, `var(--color-text-secondary)`). |
| Medium | `cornerRadiusMm` is unimplemented in `engine.ts` and has no UI slider; `ventilationGrille` adds solid raised strips (`lidH` to `lidH + 0.8`) instead of through-cut ventilation slots; lid is exported upside-down for flat bed printing (`-lipProtrusion` below `z = 0`) | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/engine.ts#L57-L68), [L230-L267](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/engine.ts#L230-L267) | Flip the lid orientation in print-bed mode so its outer top rests at `z = 0` with the lip pointing `+Z`, segmented lid top strips to leave actual open ventilation slots, and implement corner bevel/radius + slider. |
| Medium | 3D viewport lacks touch events (`touchstart`/`touchmove`) for mobile orbit and `wheel` listener for zoom | [electronics-box-enclosure.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L282-L293), [L800-L822](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L800-L822) | Use Three.js `OrbitControls` to support touch orbit/pinch-zoom and mouse wheel zoom. |
| Low | Range sliders (`16px` height) use `.c-input--slider` instead of `.c-input__slider` and checkboxes are `13×13px` | [electronics-box-enclosure.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L94-L144), [L207-L242](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L207-L242) | Use `.c-input__slider` and increase checkbox hit target size. |

---

<a id="tool-35"></a>
## 35 — Under-Desk Clamp & Cable Management Generator (`/tools/under-desk-clamp-generator`)

**Verdict:** ⚠️ Multi-part 3D preview and STL/3MF exports run cleanly, but the clamp's bottom thread boss and cup-holder ring are solid unperforated cylinders (`CylinderGeometry` without holes), `racewaySlotDiameterMm` is ignored by `engine.ts`, mobile viewports overflow horizontally (`439px`), and Light Mode text is nearly invisible.

### Functional testing
- **Initial state & 3D preview:** Loads default `Headphone Cradle Clamp` preset (`42.3 × 125.8 × 134.2 mm`, `66.2 g (PETG/PLA)`, `~4.2 hrs`, `3,808` triangles) and renders a multi-color 3D assembly (blue clamp frame, amber threaded bolt, dark swivel pad, and translucent desk slab) with zero console, page, or network errors.
- **Presets & Controls:** Tested all 4 presets (`Headphone Cradle Clamp`, `Cable Raceway Organizer` updating to `45 × 87 × 132.6 mm`, `89.4 g`, `3,232` triangles, `Under-Desk Power Strip Cradle`, `Desk Edge Mug & Can Holder`), dimension sliders (`Desk Thickness` auto-clamping `maxClampGapMm >= deskThicknessMm + 5`, `Clamp Opening Jaw Gap`, `Throat Depth`, `Clamp Width`, `Spine Wall Thickness`), screw thread controls (`Thread Diameter`, `Thread Pitch`), `Swivel Foot Pad` checkbox, `Exploded View` / `Assemble View` toggle, and `Reset to Defaults`.
- **Unimplemented / non-functional 3D geometry details:**
  - `racewaySlotDiameterMm` (`Slot Dia` slider in UI, line 232) is destructured in `createClampFrameGeometry()` (`engine.ts` line 162) and never used—changing the `Slot Dia` slider has zero effect on the generated mesh.
  - The bottom threaded boss (`engine.ts` lines 247–254) and the foot pad socket (`lines 491–498`) are solid `THREE.CylinderGeometry` primitives with no internal female threaded hole or socket recess, so a 3D-printed bolt cannot physically thread through the clamp jaw. Similarly, the `cup_holder` accessory (`lines 335–349`) defines `const ringInnerR = 40` and never uses it, producing a solid `90 mm` puck instead of a hollow cup ring, and the bolt threads (`lines 421–432`) are concentric unpitched rings rather than a helical screw thread.
- **Export verification:**
  - **Binary `.STL`:** `under-desk-clamp-cable_raceway-30mm.stl` (`161,684` bytes) has a valid 80-byte header, `3,232` triangles, and exact byte length (`84 + 3232 × 50 = 161,684`).
  - **Multi-Object `.3MF`:** `under-desk-clamp-cable_raceway-30mm.3mf` (`34,027` bytes) is a valid ZIP archive containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with 3 separate `<object>` meshes (`Clamp Frame`, `Clamping Screw Bolt`, `Swivel Foot Pad`), `4,629` vertices, and `3,232` triangles.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow at 390px and 320px:** `scrollWidth` is `439px` at both `390px` and `320px` viewports (`hasHorizontalScroll: true`), caused by `<h1 class="c-header__title">` overflowing horizontally out of the header container.
- **Cramped 2-column grids on mobile:** Unlike Tools 32–34, `.control-row-2` (`grid-template-columns: 1fr 1fr`) and `.metrics-grid` have no `@media (max-width: 768px)` single-column rule, squeezing paired range sliders down to `95px` wide at `320px` (`130px` at `390px`).
- **Unreadable text in Light Theme:** `.metric-value` (`color: #f3f4f6` on `rgba(255, 255, 255, 0.04)`) and `.tips-list` (`color: #cbd5e1`) are hardcoded for dark mode, rendering telemetry values and slicer instructions nearly invisible in Light Mode.
- **No touch orbit on 3D viewport:** `.clamp-viewport` binds mouse and `(wheel)` events (`lines 339–343`), but lacks `(touchstart)`/`(touchmove)` handlers or `OrbitControls` for mobile touch screens.
- **Touch targets:** 8 small targets flagged (7 range sliders at `16px` height and 1 checkbox at `13×13px`).

### Code review
- **Pure engine (`engine.ts`):** Pure TypeScript + Three.js/JSZip. Note that `createClampFrameGeometry()` (`lines 199–220`) builds an unused `gussetGeom` `BufferGeometry` that is never added to `parts` and never disposed.
- **Duplicate geometry generation on every input:** `rebuildMesh()` calls `this.recalculateMetrics()` (which calls `generateClampGeometries(options)`, building all 4 geometries including `combinedGeometry`), and then immediately calls `generateClampGeometries(options, options.explodedView)` a second time (`lines 935, 978`), while leaking the unused `combinedGeometry` returned by both calls!
- **Memory hygiene (Directive 4):** Neither `recalculateMetrics()` nor `rebuildMesh()` disposes the `combinedGeometry` returned by `generateClampGeometries()`, and `ngOnDestroy()` does not dispose `deskPreviewMesh` geometry/material. Additionally, when `swivelFootPad()` is `false`, `rebuildMesh()` does not dispose the empty `footPadGeometry`.
- **Routing & Registration:** Properly registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Horizontal page overflow on both 390px (`scrollWidth: 439px`) and 320px (`scrollWidth: 439px`) viewports, plus missing mobile breakpoint for `.control-row-2` (sliders crushed to 95px wide) | [under-desk-clamp-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L43-L53), [L455-L459](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L455-L459) | Add `min-width: 0; overflow-wrap: anywhere;` to `.c-header__title` and collapse `.control-row-2` and `.metrics-grid` to `grid-template-columns: 1fr` below `640px`. |
| High | Hardcoded dark-mode text colors (`#f3f4f6`, `#cbd5e1`) make telemetry metrics and slicer tips nearly invisible in Light Mode | [under-desk-clamp-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L517-L558) | Replace hardcoded hex colors in `.metric-card`, `.metric-value`, `.slicer-tips-card`, and `.tips-list` with CSS custom properties (`var(--color-bg-subtle)`, `var(--color-text-primary)`, `var(--color-text-secondary)`). |
| High | Clamp thread boss, foot pad socket, and cup-holder ring are solid unperforated cylinders (`ringInnerR` and `racewaySlotDiameterMm` are unused variables), so printed parts cannot assemble | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/engine.ts#L162), [L247-L254](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/engine.ts#L247-L254), [L335-L349](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/engine.ts#L335-L349) | Use hollow tube/lathe geometry (or `three-bvh-csg` subtraction) for the threaded boss bore, cup holder inner diameter (`ringInnerR`), and foot pad socket, and apply `racewaySlotDiameterMm` to the cable raceway slot spacing/opening. |
| Medium | `generateClampGeometries()` is called twice on every slider input, and `combinedGeometry` + `deskPreviewMesh` + `gussetGeom` are never disposed (Directive 4 memory leak) | [under-desk-clamp-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L920-L982), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/engine.ts#L199-L220) | Compute geometries once inside `rebuildMesh()`, only build `combinedGeometry` during STL export, dispose `deskPreviewMesh` in `ngOnDestroy()`, and remove dead `gussetGeom` in `engine.ts`. |
| Low | 3D viewport lacks touch event handlers (`touchstart`/`touchmove`) for mobile rotation, and sliders/checkboxes have `<20px` touch height | [under-desk-clamp-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L336-L344) | Use Three.js `OrbitControls` and `.c-input__slider` class. |

---

### 36. IKEA Skadis & Pegboard Hook & Holder Maker (`skadis-pegboard-maker`) — `/tools/3d/skadis-pegboard-maker`

- **Spec Compliance**:
  - **Implemented**:
    - 3 pegboard systems with distinct rear lug geometries in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L98-L277): **IKEA Skådis** (`5×15mm` oval slots, `40mm` horizontal / `20mm` staggered pitch, `4.5mm` wide × `4.8mm` deep T-hooks with `9.5mm` downward drop), **Standard 1" Pegboard** (`25.4mm` spacing, `6.35mm` / `1/4"` holes with `5.8mm` octagonal pins and upper L-hooks), and **Mini 1/2" Pegboard** (`12.7mm` spacing, `3.175mm` / `1/8"` holes with `2.8mm` pins).
    - Automatic dual-column (`4 Lugs`) vs single-column (`2 Lugs`) prong generation when `bracketWidthMm >= 60` on IKEA Skådis (`>= 45mm` on 1" pegboard, `>= 30mm` on 1/2" pegboard) ([`engine.ts:43-54`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L43-L54)).
    - 5 quick-start presets in [`test-fixtures.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/test-fixtures.ts#L15-L96): *Skådis Heavy-Duty Utility Hook*, *Skådis Dual Hammer & Pliers Prong*, *Standard Pegboard Shelf Bracket*, *Skådis Digital Caliper & Tool Holster*, and *Skådis Pen & Screwdriver Cup*.
    - Optional **Anti-Slip Locking Wedge Clip** (`createSkadisLockingWedgeGeometry()` in [`engine.ts:253-277`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L253-L277)) rendered as a distinct orange mesh in the 3D preview and exported as a separate object (`id="2" name="Locking Wedge"`) in `.3MF` or positioned alongside the hook on the build plate in `.STL`.
    - Side-oriented print-bed rotation (`combinedGeometry.rotateY(Math.PI / 2)` in [`engine.ts:438-446`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L438-L446)) so layer lines run continuously along the hook arm and rear lugs for maximum shear strength.
    - Client-side binary `.STL` (`exportBinaryStl()`) and multi-object `.3MF` (`export3mfPackage()` via `JSZip`) exporters ([`engine.ts:458-595`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L458-L595)), plus live telemetry (Dimensions, Prong Pins, Est. Weight, Est. Print Time) and Slicer & 3D Print Recommendations.
  - **Missing / Broken vs Spec**:
    - **Solid Instead of Hollow Geometry for `tool_holster` and `cylinder_cup` (Critical Functional Bug)**:
      - In [`createHolderFrontGeometry()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L350-L385), the `tool_holster` branch computes `const innerR = toolDiameterMm / 2;` ([`engine.ts:353`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L353)) and **never uses it**, constructing a solid cylinder (`new THREE.CylinderGeometry(outerR, outerR, holsterHeight, 32)`) instead of a hollow ring or open C-clip holster.
      - Similarly, the `cylinder_cup` branch computes `const cupInnerR = toolDiameterMm / 2;` ([`engine.ts:372`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L372)) and **never uses it**, constructing a solid cylinder block (`new THREE.CylinderGeometry(cupOuterR, cupOuterR - 2, cupHeight, 32)`) with no interior cavity. Printing either style produces an unusable solid plastic cylinder.
    - **No `Reinforced Gusset Rib` Effect on 3 of 5 Styles**: The `Reinforced Gusset Rib` checkbox ([`skadis-pegboard-maker.component.ts:266-273`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L266-L273)) stays visible for all styles, but `reinforceRib` is only checked in `single_hook` and `dual_prong` (`shelf_bracket` unconditionally adds its diagonal strut regardless of `reinforceRib`, while `tool_holster` and `cylinder_cup` ignore it).

- **Functional & Privacy Verification**:
  - **Console / Page Errors**: `0` console errors, `0` uncaught page errors, `0` failed requests.
  - **Network / Privacy**: `0` external network requests (`100%` client-side).
  - **Interactive Metrics Verification**:
    - Initial (*Skådis Heavy-Duty Utility Hook*): `24 × 64 × 62.4 mm`, `2 Lugs`, `6.5 g (PLA/PETG)`, `~0.5 hrs`.
    - Preset *Skådis Dual Hammer & Pliers Prong*: `45 × 74.5 × 56 mm`, `2 Lugs`, `7.8 g (PLA/PETG)`, `~0.6 hrs`.
    - Preset *Standard Pegboard Shelf Bracket*: `30 × 106.4 × 53.5 mm`, `2 Lugs`, `7.4 g (PLA/PETG)`, `~0.6 hrs`.
    - Preset *Skådis Digital Caliper & Tool Holster*: `38 × 54.3 × 56 mm`, `2 Lugs`, `6.5 g (PLA/PETG)`, `~0.5 hrs`.
    - Preset *Skådis Pen & Screwdriver Cup*: `56 × 72.3 × 76 mm`, `2 Lugs`, `14.3 g (PLA/PETG)`, `~0.9 hrs`.
    - Increasing `Faceplate Width` to `64 mm` on *Utility Hook*: `64 × 64 × 62.4 mm`, `4 Lugs`, `9.5 g (PLA/PETG)`, `~0.7 hrs`.
    - `Reset to Defaults` accurately restores `24 × 64 × 62.4 mm`, `2 Lugs`, `6.5 g (PLA/PETG)`, `~0.5 hrs`.
  - **Export Verification**:
    - **Binary `.STL`** (`ikea_skadis-single_hook-50mm.stl`): Valid binary STL, `7,884 bytes`, header `"PrivKnife Client-Side 3D Skadis & Pegboard Hook Maker"`, `156` triangles (`84 + 156 × 50 = 7,884 bytes`).
    - **Multi-Object `.3MF`** (`ikea_skadis-single_hook-50mm.3mf`): Valid ZIP archive (`2,995 bytes`) containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with 2 objects (`id="1" name="Pegboard single_hook"` and `id="2" name="Locking Wedge"`), `312` vertices, and `156` triangles.
  - **Memory Hygiene & Performance (Directive 4 Violation)**:
    - **Duplicate Geometry Build & Unreleased Geometries**: [`rebuildMesh()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L889-L942) calls `this.recalculateMetrics()` (which calls `generateSkadisGeometries(options)`, allocating 3 `THREE.BufferGeometry` instances) and then immediately calls `generateSkadisGeometries(options)` a second time on every slider change. Neither method calls `.dispose()` on `combinedGeometry`, and when `lockingWedge` is disabled (or on non-Skådis pegboards), `rebuildMesh()` also leaks `lockingWedgeGeometry`.
    - **Unreleased Ghost Pegboard Mesh on Destroy**: [`ngOnDestroy()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L639-L665) disposes `this.holderMesh` and `this.wedgeMesh`, but never disposes `this.pegboardMesh` (`boardGeom` and `boardMat` allocated in [`initThree()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L822-L831)).

- **UI/UX, Visual & Responsive Audit**:
  - **Desktop (`1366×900`)**:
    - **Severe Light Mode Contrast Defect (WCAG Failure)**: In [`skadis-pegboard-maker.component.ts:508-549`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L508-L549), `.metric-value` hardcodes `color: #f3f4f6` (`rgb(243, 244, 246)`) inside `.metric-card` (`background: rgba(255, 255, 255, 0.04)` over a white `#ffffff` card, contrast ratio **~1.09:1**), and `.tips-list` hardcodes `color: #cbd5e1` (`rgb(203, 213, 225)`) over `rgba(56, 189, 248, 0.05)` (contrast ratio **~1.42:1**). All 4 metric values and the slicer recommendations list are nearly invisible in Light Mode.
  - **Mobile (`390×844`) & Small (`320×640`)**:
    - **Horizontal Scroll Overflow (`hasHorizontalScroll: true`)**: Both `390px` and `320px` viewports overflow horizontally to `scrollWidth: 399px` because `.c-header__title` (`IKEA Skadis & Pegboard Hook & Holder Maker`) overflows the right edge of the header container.
    - **Missing Mobile Grid Collapse**: `.control-row-2` and `.metrics-grid` (`grid-template-columns: 1fr 1fr`, [`skadis-pegboard-maker.component.ts:441-445, 502-506`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L441-L445)) lack `@media (max-width: 768px)` single-column breakpoints, cramping the paired `Upward Tilt` and `Front Lip` range sliders down to `95×16px` on `320px` screens.
    - **No Touch Support in 3D Viewport**: `.skadis-viewport` ([`skadis-pegboard-maker.component.ts:314-322`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L314-L322)) binds only mouse and wheel events (`mousedown`, `mousemove`, `mouseup`, `mouseleave`, `wheel`) with no touch event handlers (`touchstart`, `touchmove`, `touchend`), making the 3D camera impossible to rotate or zoom on mobile touch devices.
    - **Small Touch Targets & BEM Class Mismatches**: 6 touch targets are smaller than `32×32px` across all viewports—4 range sliders (`16px` tall because the template uses `.c-input--slider` instead of `.c-input__slider`) and 2 raw `13×13px` checkboxes. Also uses raw `<div class="c-badge c-badge--privacy">` and `<button class="c-button">` instead of shared `<app-badge>` and `<app-button>` components.
  - **Screenshots**:
    - Desktop: `/home/deivision/.gemini/antigravity-cli/brain/21822bd4-d06a-4f78-8367-939e55b54aee/scratch/shots/skadis-pegboard-maker/desktop.png`
    - Mobile: `/home/deivision/.gemini/antigravity-cli/brain/21822bd4-d06a-4f78-8367-939e55b54aee/scratch/shots/skadis-pegboard-maker/mobile.png`
    - Small: `/home/deivision/.gemini/antigravity-cli/brain/21822bd4-d06a-4f78-8367-939e55b54aee/scratch/shots/skadis-pegboard-maker/small.png`

- **Recommended Fixes**:
  1. **Hollow Out `tool_holster` and `cylinder_cup` Geometries**: In [`engine.ts:350-385`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L350-L385), build `tool_holster` and `cylinder_cup` using `THREE.ExtrudeGeometry` with an outer circle `THREE.Shape` and a concentric `innerR` / `cupInnerR` circular `THREE.Path` hole (plus a bottom disc for `cylinder_cup` and an optional front slot for `tool_holster`) instead of solid `THREE.CylinderGeometry` cylinders.
  2. **Fix Light Mode Text Contrast**: Replace hardcoded `#f3f4f6` on `.metric-value` and `#cbd5e1` on `.tips-list` in [`skadis-pegboard-maker.component.ts:508-549`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L508-L549) with theme-aware CSS variables (`var(--color-text)` and `var(--color-text-muted)`).
  3. **Fix Mobile Overflow, Responsive Grids & Touch Viewport**: Allow `.c-header__title` to wrap (`overflow-wrap: anywhere; white-space: normal`), collapse `.control-row-2` and `.metrics-grid` to `1fr` below `768px`, use `.c-input__slider` on range inputs, and add `(touchstart)` / `(touchmove)` / `(touchend)` camera orbit handlers to `.skadis-viewport`.
  4. **Eliminate Duplicate Geometry Creation & Dispose All Buffers**: Compute `generateSkadisGeometries(options)` once inside `rebuildMesh()`, pass the resulting geometries to `calculateSkadisMetrics()`, dispose `combinedGeometry` (and `lockingWedgeGeometry` when unused), and dispose `this.pegboardMesh` geometry/material inside `ngOnDestroy()`.

---

<a id="tool-37"></a>
## 37 — Geometric Plant Pot & Self-Watering Planter (`/tools/geometric-plant-pot`)

**Verdict:** ⚠️ Functional 3D generator with working presets, live Three.js preview, and valid STL/3MF exports, but suffers from unreadable light-mode text contrast, 320px horizontal overflow, non-manifold insert surfaces, and missing drainage holes in saucer mode.

### Functional testing
- **3D Viewport & Presets:** WebGL canvas (`534×380` on desktop) initializes and renders cleanly with zero console or page errors. Tested all 4 presets:
  - *Hexagonal Spiral Self-Watering Planter*: `Ø90 × 85 mm`, `~73 ml` reservoir, `41.7 g`, `~2.6 hrs`.
  - *Low-Poly Faceted Succulent Pot & Saucer*: `Ø97.9 × 80 mm`, `44 g`, `~2.7 hrs`.
  - *Neoclassical Fluted Cachepot*: `Ø85 × 80 mm`, `36.6 g`, `~2.3 hrs`.
  - *Twisted Decagon Herb Planter*: `Ø110 × 100 mm`, `~111 ml` reservoir, `60.1 g`, `~3.6 hrs`.
- **Interactive Controls:** Verified all 4 aesthetic styles (`twisted_polygon`, `low_poly_faceted`, `vertical_flutes`, `smooth_minimal`), 3 drainage modes (`self_watering_insert`, `drainage_with_saucer`, `decorative_cover`), Exploded View / Assemble View toggle, and Reset to Defaults (`Ø90 × 85 mm`, `41.7 g`).
- **Deliverable Exports:**
  - **Binary `.STL`:** Downloaded `geometric-planter-twisted_polygon-110mm.stl` (`56,484` bytes, header `"PrivKnife Client-Side 3D Geometric Plant Pot Generator"`, `1,128` triangles; exact byte match `84 + 1128 × 50 = 56,484`).
  - **Multi-Part `.3MF`:** Downloaded `geometric-planter-twisted_polygon-110mm.3mf` (`12,832` bytes, valid ZIP `504b0304` containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with 2 separate mesh objects: `id="1"` `"Outer Planter (twisted_polygon)"` and `id="2"` `"Self-Watering Insert Basket"`).
- **Geometry Defects Identified:**
  - Selecting *Bottom Drainage with Matching Drip Saucer* (`drainage_with_saucer`) generates the saucer beside the pot, but `createOuterPotGeometry()` never uses `planterType` and seals the pot bottom solid with zero drainage holes.
  - `createReservoirInsertGeometry()` constructs the insert wall (`CylinderGeometry` with `openEnded: true`), floor (`RingGeometry`), and rim lip (`RingGeometry`) as zero-thickness 2D surfaces rather than manifold solid walls.

### Mobile adaptation (390px / 320px)
- **390px (Mobile):** `scrollWidth: 390` (no horizontal overflow). Controls and 3D viewport stack vertically and remain usable.
- **320px (Small):** Horizontal scroll occurs (`scrollWidth: 377` vs `320px` viewport); the `<h1>` header title overflows the right edge, and `.btn-grid-2`, `.control-row-2`, and `.metrics-grid` force 2-column grids (`grid-template-columns: 1fr 1fr`) with zero `@media` queries in the component stylesheet.
- **Light-Mode Contrast Failure:** In light mode (visible in `mobile.png` and `small.png`), `.metric-value` (`color: #f3f4f6`) and `.tips-list` (`color: #cbd5e1`) are hardcoded light-on-light text inside `.c-card`, rendering the metric readouts and "Watertight Slicing Recommendations" nearly invisible.
- **Touch Support & Targets:** Range sliders (`16px` tall — global `.c-input` issue) and the raw `<input type="checkbox">` (`13×13px`) are below the 32px touch target threshold. The Three.js viewport binds only mouse events (`mousedown`/`mousemove`/`mouseup`/`wheel`) and lacks touch listeners (`touchstart`/`touchmove`/`touchend`) for mobile orbit rotation.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry):** 100% client-side; zero external requests. Registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.
- **Directive 3 (Web Worker):** No `worker.ts` exists. Geometry generation and JSZip `.3mf` packaging run synchronously/asynchronously on the main thread.
- **Directive 4 (Memory Hygiene):**
  - `generatePlanterGeometries()` always builds `combinedGeometry`, which is never disposed in `recalculateMetrics()` or `rebuildMesh()` (leaking a `BufferGeometry` on every slider input event).
  - `createCombinedPrintBedGeometry()` disposes `potClone` but leaks `insertClone` and `saucerClone`.
  - `initThree()` creates a `soilMesh` that is immediately destroyed by `rebuildMesh()` in `ngAfterViewInit()` and never recreated.
- **BEM & i18n:** Component uses inline `styles` with unprefixed non-BEM class names (`.preset-strip`, `.btn-grid-2`, `.control-row-2`, `.planter-viewport`, `.metrics-grid`, `.slicer-tips-card`) and hardcoded English strings (no `TranslocoPipe`).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Metric values (`#f3f4f6`) and slicer tips (`#cbd5e1`) are hardcoded for dark backgrounds and are nearly invisible in light mode | [geometric-plant-pot.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/geometric-plant-pot.component.ts#L527-L568) | Replace hardcoded hex/rgba colors with theme CSS custom properties (`var(--color-text)`, `var(--color-surface-alt)`, `var(--color-border)`). |
| Medium | Horizontal overflow at 320px (`scrollWidth: 377`) and no responsive media queries for 2-column grids | [geometric-plant-pot.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/geometric-plant-pot.component.ts#L452-L525) | Collapse `.btn-grid-2`, `.control-row-2`, and `.metrics-grid` to `1fr` below `480px` and add `min-width: 0` on grid children. |
| Medium | `drainage_with_saucer` mode generates a solid sealed pot bottom with no drainage holes; `self_watering_insert` uses zero-thickness `RingGeometry` / open `CylinderGeometry` shells | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/engine.ts#L155-L277), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/engine.ts#L322-L336) | Leave a central drainage aperture in the pot floor when `planterType === 'drainage_with_saucer'`, and extrude manifold thickness for the insert basket wall, floor, and lip. |
| Medium | `combinedGeometry` is leaked on every slider change in `recalculateMetrics()` and `rebuildMesh()`, and `insertClone`/`saucerClone` are leaked in `createCombinedPrintBedGeometry()` | [geometric-plant-pot.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/geometric-plant-pot.component.ts#L912-L956), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/engine.ts#L445-L475) | Dispose `combinedGeometry` in `recalculateMetrics()`/`rebuildMesh()` (or skip generating it during preview), and dispose all temporary geometries in `geomsToMerge`. |
| Low | 3D viewport lacks touch event handlers for mobile rotation, and all UI classes/strings lack BEM prefixes and i18n translations | [geometric-plant-pot.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/geometric-plant-pot.component.ts#L336-L348) | Add `touchstart`/`touchmove`/`touchend` handlers, migrate styles to `.c-geometric-plant-pot__*` BEM classes, and wire up `TranslocoPipe`. |

---

<a id="tool-38"></a>
## 38 — Braille & ADA Tactile Door Sign Generator (`/tools/braille-ada-sign-generator`)

**Verdict:** ❌ Broken 3D preview and corrupted STL/3MF exports due to a Euclidean distance typo (`Math.sqrt(dx * dy + dx * dx)`) in `createTextGeometry()` that injects `NaN` vertex coordinates into tactile text meshes and sets the Three.js camera position to `NaN`.

### Functional testing
- **Root-Cause Geometry & Viewport Failure (`NaN` vertices):**
  - In `createTextGeometry()` ([engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/engine.ts#L355)), stroke length is calculated as `const len = Math.sqrt(dx * dy + dx * dx);` instead of `Math.sqrt(dx * dx + dy * dy)`. Whenever a letter stroke has `dx * dy + dx * dx < 0` (e.g., downward or diagonal strokes in `R`, `M`, `N`, `W`, `X`, `A`, `2`, `4`, etc.), `len` becomes `NaN`, bypassing `if (len < 0.001) continue;` and generating `ExtrudeGeometry` vertices with `NaN` coordinates.
  - Every load and preset switch logs two console errors:
    - `THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`
    - `THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN.`
  - In `fitCameraToSign()`, `new THREE.Box3().setFromObject(this.signGroup)` computes `maxDim = NaN` and executes `this.camera.position.set(0, NaN, NaN)`, leaving the 3D viewport completely blank/black across all 6 presets (`All-Gender Restroom`, `Men's Restroom`, `Women's Restroom`, `Tactile Exit Sign`, `Office & Room Plaque`, `Conference Room`).
- **Corrupted Exports (`.3MF` and `.STL`):**
  - **Multi-Color `.3MF`:** Downloaded `conference-a-ada-sign.3mf` (`87,545` bytes, valid ZIP structure with 3 objects: `Plaque Base (Dark Slate)`, `Tactile Text & Pictogram (Bright White)`, `Braille Domes (Tactile)`), but `3D/3dmodel.model` contains **`4,104` occurrences of `NaN`** in `<vertex>` attributes, making it invalid for 3D slicers.
  - **Unified `.STL`:** Downloaded `conference-a-ada-sign.stl` (`278,084` bytes, `5,560` triangles), which contains **`5,616` `NaN` float32 values** in its binary triangle records.
- **Unreactive Secondary Controls:**
  - Changing `subText`, `plaqueWidthMm`, `plaqueHeightMm`, `plaqueThicknessMm`, `tactileRaiseMm`, `cornerRadiusMm`, `includeFrameBorder`, or `mountHoles` only updates the signal (`.set(...)`) without invoking `updatePreviewMesh()` (and no `effect()` watches them). For example, changing Width from `203 mm` to `250 mm` updates the header badge (`250 × 152 × 3.8 mm`), but `Est. Weight` stays frozen at `~74.6 g` and the 3D mesh is never regenerated.
- **Grade 2 Braille Transliteration:** The 2D Unicode Braille badge works properly (`RESTROOM` → `⠗⠑⠌⠗⠕⠕⠍`, 7 cells / 21 domes; `OFFICE 204` → `⠷⠋⠊⠉⠑ ⠼⠃⠚⠙`, 10 cells / 26 domes; `CONFERENCE A` → `⠉⠕⠝⠋⠻⠑⠝⠉⠑ ⠁`, 11 cells / 28 domes).

### Mobile adaptation (390px / 320px)
- **390px (Mobile):** `scrollWidth: 390` (no horizontal overflow). `.btn-grid-3`, `.grid-2-col`, and `.export-buttons-grid` collapse cleanly at `@media (max-width: 768px)`.
- **320px (Small):** Horizontal scroll occurs (`scrollWidth: 360` vs `320px` viewport) as the `<h1>` title (`Braille & ADA Tactile Door Sign Generator`) overflows the right edge of the header container.
- **Light-Mode Contrast Failure:** `.c-input__label` and `.toggle-row` override text color with `var(--color-text-main, #e2e8f0)` (where `--color-text-main` is undefined in global styles, falling back to `#e2e8f0` light gray), making all form labels and checkbox labels nearly invisible against the white card background in light mode (`mobile.png` / `small.png`). Similarly, `.badge-dim` (`color: #cbd5e1` on `rgba(148, 163, 184, 0.15)`) and `.metric-key` inside `.metrics-panel` have poor contrast in light mode.
- **Touch Targets & Viewport Interaction:** Text inputs (`28px` tall), range sliders (`16px` tall), and checkboxes (`13×13px`) are below the 32px touch target threshold. Canvas interaction only binds mouse events (`mousedown`, `mousemove`, `mouseup`, `wheel`) with no touch listeners.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry):** 100% client-side; zero external requests. Registered in `tool-registry.ts` and routed in `app.routes.ts`.
- **Directive 3 (Web Worker):** Missing `worker.ts`; all Three.js `ExtrudeGeometry` generation, `BufferGeometryUtils.mergeGeometries`, and JSZip `.3mf` packaging run on the main thread.
- **Directive 4 (Memory Hygiene):**
  - `setupCanvasInteractions()` attaches an anonymous `window.addEventListener('mouseup', ...)` listener that is never removed in `ngOnDestroy()`.
  - `downloadFormat()` pushes `URL.createObjectURL` strings to `activeDownloadUrls` and only revokes them on component destroy rather than after download.
- **BEM & i18n:** Uses non-BEM classes (`.preset-strip`, `.btn-grid-2`, `.btn-grid-3`, `.grid-2-col`, `.braille-callout`, `.metrics-panel`, `.ada-notes-card`) and hardcoded English strings (no `TranslocoPipe`).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Typo `Math.sqrt(dx * dy + dx * dx)` in `createTextGeometry()` produces `NaN` vertex coordinates, breaking the 3D preview (`camera.position` = `NaN`) and corrupting `.3mf` (`4,104` `NaN`s) and `.stl` (`5,616` `NaN` floats) exports | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/engine.ts#L355), [braille-ada-sign-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L918-L926) | Change `Math.sqrt(dx * dy + dx * dx)` to `Math.hypot(dx, dy)` (or `Math.sqrt(dx * dx + dy * dy)`). |
| High | Changing `subText`, dimension sliders (`plaqueWidthMm`, `plaqueHeightMm`, `plaqueThicknessMm`, `tactileRaiseMm`, `cornerRadiusMm`), or checkboxes (`includeFrameBorder`, `mountHoles`) does not rebuild the 3D preview or recalculate metrics | [braille-ada-sign-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L109-L315) | Use an Angular `effect()` (or call `updatePreviewMesh()` in each handler) when any option signal changes. |
| High | Form labels (`.c-input__label`) and checkbox rows (`.toggle-row`) use `var(--color-text-main, #e2e8f0)` which falls back to `#e2e8f0`, rendering labels nearly invisible in light mode | [braille-ada-sign-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L464-L481) | Use defined global theme tokens (`var(--color-text)`) and remove the local `.c-input__label` override. |
| Medium | Horizontal overflow at 320px (`scrollWidth: 360`) due to long header title and unshrinkable flex/grid items | [braille-ada-sign-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L43-L53) | Add `overflow-wrap: break-word` / `min-width: 0` on header title group and collapse `.btn-grid-2` / `.metrics-panel` at `<= 360px`. |
| Low | Leaked `window.addEventListener('mouseup', ...)` on destroy, missing touch handlers on 3D canvas, missing Web Worker, and non-BEM class names | [braille-ada-sign-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L842-L844) | Store bound `mouseup` reference and remove it in `ngOnDestroy()`, add touch orbit listeners, and offload mesh generation to a Web Worker. |

---

<a id="tool-39"></a>
## 39 — Custom Mechanical Keycap & Switch Tester Maker (`/tools/keycap-switch-tester-maker`)

**Verdict:** ⚠️ Interactive 3D preview, presets, and STL/3MF exports work without runtime errors, but the generated 3D meshes have significant mechanical omissions (disconnected 4-pillar MX stem, flat un-dished keycap tops, and a rotated flat slab instead of a wedge for the switch tester tray), alongside mobile horizontal overflow at 390px/320px and invisible light-mode form labels.

### Functional testing
- **Presets & Mode Switching:** Tested all 6 presets across both tabs (*Mechanical Keycap Maker* and *Switch Tester Desk Tray*) with zero console or page errors:
  - *Cherry 1U Artisan ESC*: `18 × 18 × 9.4 mm`, `~1.3 g`, `256` triangles.
  - *DSA Uniform Minimalist Blank*: `18 × 18 × 7.4 mm`, `~1 g`, `76` triangles.
  - *OEM 2.25U Shift / Enter*: `41.8 × 18 × 11.5 mm`, `~3.8 g`, `376` triangles (includes center stem + 2 stabilizer stems at `±11.9 mm`).
  - *SA Retro High-Profile*: `18 × 18 × 13 mm`, `~1.8 g`, `148` triangles.
  - *2×2 Desk Switch Tester Tray*: `54.1 × 54.1 × 11.7 mm`, `~15.4 g`, `468` triangles, `4 MX Slots`.
  - *3×3 Artisan Display Base (9 Switches)*: `73.15 × 73.15 × 18.9 mm`, `~28.1 g`, `552` triangles, `9 MX Slots`.
- **Deliverable Exports:**
  - **Multi-Color `.3MF`:** Downloaded `keycap-cherry-1u-esc.3mf` (`4,736` bytes, valid ZIP with 3 objects: `id="1"` `"Keycap Shell (CHERRY 1u)"`, `id="2"` `"MX Cross Stem Post"`, `id="3"` `"Keycap Legend (ESC)"`, `0` `NaN` vertices).
  - **Unified `.STL` (Keycap):** Downloaded `keycap-cherry-1u-esc.stl` (`12,884` bytes, `256` triangles; exact byte match `84 + 256 × 50`).
  - **Unified `.STL` (Switch Tester Tray):** Downloaded `switch-tester-2x2.stl` (`23,484` bytes, `468` triangles).
- **Mechanical & Geometry Defects:**
  - **Disconnected MX Stem (`buildMxStemGeometry`):** Creates an outer `CylinderGeometry` (`2.75 mm` radius) and immediately disposes it without merging, returning only 4 floating square `BoxGeometry` corner tabs (`48` triangles total) with no outer cylindrical wall holding them together.
  - **Ignored Dish Curvature & Profile Tilt (`generateKeycapMesh`):** `options.dishDepthMm` and `dim.tiltAngleDeg` are never used; the keycap shell is a 16-vertex flat-topped frustum (`28` triangles) for every profile. Furthermore, `inlaid_multicolor` extrudes the legend `+0.2 mm` above `z = h` instead of inlaying it flush into the top cap face.
  - **Non-Flat Tilted Switch Tester Slab (`generateSwitchTesterMesh`):** Generates a `6 mm` flat slab with through-holes (no `1.5 mm` plate lip or hollow cavity for MX switch bottom housings) and calls `trayExtrude.rotateX(tiltRad)` directly (`minZ = -2.83 mm`, `maxZ = 8.79 mm`), leaving the tray tilted in mid-air rather than resting flat on `Z = 0` as a wedge.

### Mobile adaptation (390px / 320px)
- **Horizontal Overflow at 390px and 320px:** `scrollWidth: 433` at `390px` and `scrollWidth: 434` at `320px`. As seen in `mobile.png` and `small.png`, the long `<h1>` header (`Custom Mechanical Keycap & Switch Tester Maker`) overflows the right viewport edge on both mobile sizes.
- **Light-Mode Contrast Failure:** `.c-input__label` (`color: var(--color-text-main, #e2e8f0)`) and `.badge-dim` (`color: #cbd5e1`) use undefined CSS variable `--color-text-main` with a light-gray fallback, rendering all form labels ("Keycap Ergonomic Profile", "Unit Size (Width)", "Legend Character / Word", "Legend Style", "MX Cross Stem Tolerance") nearly invisible against the white card background in light mode.
- **Touch Targets & Viewport Interaction:** Text input (`28px` tall) and range slider (`16px` tall) are below the 32px touch target threshold. The 3D viewport lacks touch event handlers (`touchstart`/`touchmove`/`touchend`) for mobile rotation.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry):** 100% client-side; zero external requests. Registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.
- **Directive 3 (Web Worker):** Missing `worker.ts`; mesh generation and JSZip `.3mf` export run on the main thread.
- **Directive 4 (Memory Hygiene):**
  - `setupCanvasInteractions()` registers an anonymous `window.addEventListener('mouseup', ...)` listener that is never removed in `ngOnDestroy()`.
  - `downloadFormat()` keeps `URL.createObjectURL` blobs until `ngOnDestroy()`.
- **BEM & i18n:** Uses non-BEM classes (`.preset-strip`, `.mode-tabs`, `.btn-grid-3`, `.metrics-panel`, `.slicer-notes-card`) and hardcoded English strings (no `TranslocoPipe`).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Form labels (`.c-input__label`) use `var(--color-text-main, #e2e8f0)` which falls back to `#e2e8f0`, making all field labels nearly invisible in light mode | [keycap-switch-tester-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/keycap-switch-tester-maker.component.ts#L505-L510) | Remove the local `.c-input__label` color override or use `var(--color-text)`. |
| Medium | Horizontal overflow on mobile 390px (`scrollWidth: 433`) and small 320px (`scrollWidth: 434`) due to unbreakable header layout | [keycap-switch-tester-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/keycap-switch-tester-maker.component.ts#L43-L53) | Add `min-width: 0` and `overflow-wrap: break-word` to `.c-header__title-group` / `.c-header__title` and stack `.mode-tabs` on narrow screens. |
| Medium | `buildMxStemGeometry()` disposes the outer cylinder and only outputs 4 disconnected corner boxes; `generateKeycapMesh()` ignores `dishDepthMm` and `tiltAngleDeg` | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/engine.ts#L312-L350), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/engine.ts#L352-L458) | Extrude a circular `THREE.Shape` with a cruciform `Path` hole for a true manifold MX stem, and apply top-face tilt and concave dish offset. |
| Medium | `generateSwitchTesterMesh()` rotates a flat `6 mm` slab (`minZ = -2.83 mm`) instead of generating a flat-bottomed hollow switch frame with a `1.5 mm` snap-in lip | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/engine.ts#L558-L621) | Build a hollow perimeter frame with a `1.5 mm` top plate lip and taper the side walls to `Z = 0` for the incline angle. |
| Low | Anonymous `window.addEventListener('mouseup', ...)` is leaked on destroy; missing touch orbit listeners, Web Worker, BEM prefixes, and i18n | [keycap-switch-tester-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/keycap-switch-tester-maker.component.ts#L845-L847) | Remove the `mouseup` listener in `ngOnDestroy()`, add touch handlers, and adopt BEM/Transloco conventions. |

---

<a id="tool-40"></a>
## 40 — Cappuccino Stencil & Airbrush Template Maker (`/tools/cappuccino-stencil-maker`)

**Verdict:** ⚠️ 3D preview and binary STL export work for built-in motifs, but laser-ready SVG export is broken for all curved shapes/circles, "Bridge Floating Islands" and "Smooth Rim Chamfer" checkboxes are no-ops on the 3D geometry, custom logo/image upload is missing, and light-mode labels/metrics are nearly invisible.

### Functional testing
- **Presets & 3D Viewport:** Tested all 6 presets (*Classic Latte Art Heart*, *Roasted Coffee Bean*, *Steaming Coffee Mug*, *Barista Rosetta Leaf*, *Cute Cat Paw Print*, *Custom Name / Monogram*) with zero console or page errors:
  - *Classic Latte Art Heart*: `Ø 95 mm • 1.2 mm thick`, Overall Length `125.0 mm`, Cutout Area `1917 mm²`, `~7.8 g`, `652 tris`.
  - *Steaming Coffee Mug*: `Ø 100 mm • 1.2 mm thick`, Overall Length `150.0 mm`, Cutout Area `951 mm²`, `~10.4 g`, `1,020 tris`.
  - *Cute Cat Paw Print*: `Ø 90 mm • 1.2 mm thick`, Overall Length `120.0 mm`, Cutout Area `642 mm²`, `~8.6 g`, `1,056 tris`.
  - *Custom Name / Monogram (`COFFEE`)*: `Ø 90 mm • 1.2 mm thick`, Overall Length `140.0 mm`, Cutout Area `1314 mm²`, `778 tris`.
- **Deliverable Exports:**
  - **3D Printable `.STL`:** Downloaded `cappuccino-stencil-heart-95mm.stl` (`32,684` bytes, `652` triangles; exact byte match `84 + 652 × 50`).
  - **Laser-Ready `.SVG` (Broken for Arcs/Bezier Curves):** Downloaded `cappuccino-stencil-heart-95mm.svg` (`1,279` bytes). In `generateStencilSvg()`, `pathDataFromPoints()` only samples `c.getPoint(0)` and `c.getPoint(1)` and emits a straight `L` segment for every `THREE.Curve`. As a result, `EllipseCurve` (`absarc`) and `QuadraticBezierCurve` (`quadraticCurveTo`) are collapsed into single straight chords: the `95 mm` circular stencil outer contour becomes a 6-vertex triangle/wedge (`M 57.50 10.00 L 103.52 45.75 ... L 57.50 10.00 Z`, missing the entire left half of the disc), and full-circle `absarc(0, 2π)` cutouts (hanging peg hole and cat paw toes) collapse into zero-length points (`M x y L x y Z`).
- **No-Op Controls & Spec Gaps:**
  - **"Bridge Floating Islands" (`autoBridgeIslands`) is a UI-only counter:** In `buildMotifCutouts()` ([engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.ts#L358-L360)), `if (hasIsland && options.autoBridgeIslands) { bridgeTabCount += 1; }` only increments the displayed metric (`Bridge Tabs: 1` vs `0`) without modifying the mesh (`778 tris` in both states). Closed-loop letters like `O` are cut as overlapping stroke slots with an unbridged floating center island.
  - **"Smooth Rim Chamfer" (`rimBevel`) is ignored:** `generateStencilMesh()` ([engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.ts#L429-L432)) hardcodes `bevelEnabled: false` regardless of `options.rimBevel`.
  - **Missing Spec Features:** Spec §1–§5 specify uploading user logos/silhouette art (`contrastThreshold`, `invertCutout` are defined in `types.ts` but unused) and `.png` export, none of which are implemented in the UI.

### Mobile adaptation (390px / 320px)
- **Horizontal Overflow at 390px and 320px:** `scrollWidth: 405` at `390px` and `scrollWidth: 404` at `320px`. In `mobile.png` and `small.png`, the `<h1>` title (`Cappuccino Stencil & Airbrush Template Maker`) overflows the right edge of the viewport.
- **Light-Mode Contrast Failure:** `.c-input__label` (`#e2e8f0`), `.checkbox-label` (`#e2e8f0`), `.metric-value` (`#f8fafc` on `rgba(255, 255, 255, 0.03)`), and `.safety-list` (`#d1d5db` on `rgba(245, 158, 11, 0.07)`) use light text colors intended for dark backgrounds, making form labels, metric values, and food-safety tips nearly invisible in light mode (`mobile.png` / `small.png`).
- **Touch Targets & Viewport Interaction:** Range sliders (`16px` tall) and raw checkboxes (`13×13px`) are below the 32px touch target threshold. The Three.js canvas only binds mouse listeners (`mousedown`/`mousemove`/`mouseup`/`wheel`) with no touch support.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry):** 100% client-side; zero external requests. Registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.
- **Directive 4 (Memory Hygiene):**
  - `setupMouseEvents()` registers an anonymous `window.addEventListener('mouseup', ...)` listener that is never removed in `ngOnDestroy()`.
  - `downloadFormat()` retains `URL.createObjectURL` blobs until `ngOnDestroy()`.
- **BEM & i18n:** Uses non-BEM classes (`.preset-strip`, `.btn-grid-3`, `.grid-2-col`, `.metrics-panel`, `.safety-box`) and hardcoded English strings (no `TranslocoPipe`).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | `generateStencilSvg()` converts `EllipseCurve` and `QuadraticBezierCurve` into a single straight line between `getPoint(0)` and `getPoint(1)`, corrupting the circular stencil outline and turning circular holes into zero-length points | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.ts#L480-L503) | Sample curves with `path.getPoints(64)` (or emit SVG `A` / `Q` path commands) for both `shape` and each `hole` in `shape.holes`. |
| High | Labels (`.c-input__label`, `.checkbox-label`), metric values (`.metric-value`), and food safety tips (`.safety-list`) use light colors (`#e2e8f0`/`#f8fafc`/`#d1d5db`) that are nearly invisible in light mode | [cappuccino-stencil-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/cappuccino-stencil-maker.component.ts#L475-L570) | Replace hardcoded light hex colors and undefined `--color-text-main` with global theme variables (`var(--color-text)`, `var(--color-surface-alt)`). |
| Medium | `autoBridgeIslands` only increments `bridgeTabCount` without inserting bridge tabs in the mesh, and `rimBevel` is ignored (`bevelEnabled: false` hardcoded) | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.ts#L357-L360), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.ts#L429-L432) | Split closed-loop letter paths with a gap of `bridgeWidthMm` when `autoBridgeIslands` is enabled, and pass `bevelEnabled: options.rimBevel` to `ExtrudeGeometry`. |
| Medium | Horizontal overflow at 390px (`scrollWidth: 405`) and 320px (`scrollWidth: 404`) from the header title | [cappuccino-stencil-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/cappuccino-stencil-maker.component.ts#L39-L49) | Add `min-width: 0` and `overflow-wrap: break-word` on `.c-header__title-group` / `.c-header__title`. |
| Low | Missing custom silhouette image upload & `.png` export from spec; leaked `window.addEventListener('mouseup')`; missing touch orbit handlers, BEM prefixes, and i18n | [cappuccino-stencil-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/cappuccino-stencil-maker.component.ts#L852-L854) | Remove `mouseup` listener on destroy, add touch listeners to canvas, and implement BEM/i18n conventions. |

---

<a id="tool-41"></a>
## 41 — Pet ID Tag & Collar Slide-On Generator (`/tools/pet-id-tag-generator`)

**Verdict:** ⚠️ Presets, live 3D preview, and STL/3MF exports execute cleanly without console errors, but the Bone and Heart charms place the split-ring eyelet hole and emergency icon outside the top center boundary of the tag body (and long text overflows the bone waist), while light-mode labels/metrics are nearly invisible.

### Functional testing
- **Presets & Mode Tabs:** Tested all 5 presets across both tabs (*Hanging Charm Tag* and *Silent Collar Slide-On*) with zero console or page errors:
  - *Classic Dog Bone Charm (`LUNA`)*: `42 × 24 × 2.8 mm`, `~2.5 g`, `~18 min`, `2,230 tris`.
  - *Silent Collar Slide-On (`MAX`, 20mm / 3/4")*: `48 × 26 × 2.8 mm`, `~3.1 g`, `~24 min`, `2,272 tris`.
  - *Sweet Kitten Heart Charm (`BELLA`)*: `28 × 28 × 2.2 mm`, `~1.5 g`, `~12 min`, `1,464 tris`.
  - *Tactical K9 Shield Tag (`THOR`)*: `34 × 42 × 3.2 mm`, `~4.0 g`, `~24 min`, `1,532 tris`.
  - *Modern Hexagon Tag (`MILO`)*: `32 × 36 × 3.2 mm`, `~3.2 g`, `~24 min`, `1,528 tris`.
- **Deliverable Exports:**
  - **Dual-Color `.3MF`:** Downloaded `pet-tag-bone-luna.3mf` (`36,377` bytes, valid ZIP containing 3 objects: `id="1"` `"Base Plate"`, `id="2"` `"Text Lettering (LUNA)"`, `id="3"` `"Emergency Icon (paw)"`, `0` `NaN` vertices).
  - **Unified `.STL`:** Downloaded `pet-tag-bone-luna.stl` (`111,584` bytes, `2,230` triangles; exact byte match `84 + 2230 × 50`).
- **Geometry & Layout Defects:**
  - **Out-of-Bounds Eyelet Hole & Icon on Bone and Heart Shapes:** In `buildTagShape()` ([engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/engine.ts#L388-L459)), the bone contour's center neck only reaches `y = neckH / 2 = h * 0.2` (`4.8 mm` at default `h = 24 mm`), and the heart's center cleft is at `y = s * 0.35` (`4.41 mm` at `h = 28 mm`). However, the split-ring hole is placed at `holeY = halfH - holeR - 2.5` (`7.25 mm` on Bone, `9.25 mm` on Heart) without adding a protruding top eyelet tab, placing the hole in empty space outside the tag contour and colliding with the emergency icon (`iconY = h * 0.32 = 7.68 mm`). In the 3D preview (`mobile.png`), the paw icon and 3rd line (`MICROCHIPPED`) visibly overhang the bone's narrow center neck.
  - **Unsubdivided Curved Slide-On Band:** When `curvedBand` is enabled on `collar_slide_on`, `generatePetTagMesh()` displaces the Z coordinates of a flat `ExtrudeGeometry` whose top and bottom edges have no intermediate X vertices, resulting in coarse/warped triangulation across the band span.
  - **Unimplemented `dualSided` Option:** `dualSided` is declared in `PetIdTagGeneratorOptions` and `PetIdTagGeneratorComponent` (and Spec §3 mentions dual-sided text placement), but `engine.ts` never reads `options.dualSided` and no UI toggle is rendered.

### Mobile adaptation (390px / 320px)
- **390px (Mobile):** `scrollWidth: 390` (no horizontal overflow). `.btn-grid-5`, `.btn-grid-4`, `.grid-2-col`, and `.metrics-panel` collapse to 1–2 columns below `768px`.
- **320px (Small):** Horizontal scroll occurs (`scrollWidth: 333` vs `320px` viewport) from the `<h1>` title (`Pet ID Tag & Collar Slide-On Generator`).
- **Light-Mode Contrast Failure:** `.c-input__label` (`#e2e8f0`), `.checkbox-label` (`#e2e8f0`), `.metric-value` (`#f8fafc` on `rgba(255, 255, 255, 0.03)`), and `.safety-list` (`#d1d5db` on `rgba(56, 189, 248, 0.07)`) are hardcoded light colors, making form labels, metric readouts, and pet safety notes almost invisible in light mode (`mobile.png` / `small.png`).
- **Touch Targets & Viewport Interaction:** Text inputs (`28px` tall) and range sliders (`16px` tall) are below the 32px touch target threshold. The Three.js canvas binds only mouse events (`mousedown`/`mousemove`/`mouseup`/`wheel`) with no touch listeners.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry):** 100% client-side; zero external requests. Registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.
- **Directive 3 (Web Worker):** Missing `worker.ts`; Three.js geometry generation and JSZip `.3mf` packaging execute on the main thread.
- **Directive 4 (Memory Hygiene):**
  - `setupMouseEvents()` attaches an anonymous `window.addEventListener('mouseup', ...)` listener that is never removed in `ngOnDestroy()`.
  - `downloadFormat()` keeps `URL.createObjectURL` blobs until `ngOnDestroy()`.
- **BEM & i18n:** Uses non-BEM classes (`.preset-strip`, `.mode-tabs`, `.btn-grid-5`, `.metrics-panel`, `.safety-box`) and hardcoded English strings (no `TranslocoPipe`).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Labels (`.c-input__label`, `.checkbox-label`), metric values (`.metric-value`), and safety notes (`.safety-list`) use light colors (`#e2e8f0`/`#f8fafc`/`#d1d5db`) that are nearly invisible in light mode | [pet-id-tag-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/pet-id-tag-generator.component.ts#L619-L714) | Replace hardcoded light hex values and undefined `--color-text-main` with global theme tokens (`var(--color-text)`, `var(--color-surface-alt)`). |
| High | On `bone` and `heart` charms, the split-ring hole (`holeY = halfH - holeR - 2.5`) and emergency icon (`iconY = h * 0.32`) are placed above the recessed top-center edge (`y = h * 0.2`), floating outside the tag body and overlapping each other | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/engine.ts#L388-L459), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/engine.ts#L503-L553) | Add an integrated top eyelet lug to `bone`/`heart` shapes (or position the hole inside the left bone lobe / lower below the cleft) and scale/clamp text & icon within the neck bounds. |
| Medium | Horizontal overflow at 320px (`scrollWidth: 333`) due to unbreakable header title | [pet-id-tag-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/pet-id-tag-generator.component.ts#L40-L50) | Add `min-width: 0` and `overflow-wrap: break-word` on `.c-header__title-group` / `.c-header__title`. |
| Low | `dualSided` option in `types.ts` is unimplemented; `window.addEventListener('mouseup')` is leaked on destroy; missing touch orbit listeners, Web Worker, BEM prefixes, and i18n | [pet-id-tag-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/pet-id-tag-generator.component.ts#L1038-L1040) | Implement or remove `dualSided`, clean up the `mouseup` listener in `ngOnDestroy()`, add touch handlers, and offload mesh generation to a Web Worker. |

---

<a id="tool-42"></a>
## 42 — Honeycomb Storage Wall (HSW) Insert & Adapter (`/tools/hsw-insert-adapter`)

**Verdict:** ⚠️ All 6 presets, attachment modes, interactive 3D preview, and STL/3MF downloads run without console or network errors, but multiple attachment geometries have severe placement/boolean defects (`storage_ring` mounting neck blocks half the ring opening, `tool_hook` gusset rotates backward into the plug, `empty_plug` adds a protruding bar across the center hole instead of cutting a slot), spec-required multi-cell ganging (1x1/2x1/2x2) is missing, and light-mode labels/metrics are nearly invisible.

### Functional testing
- **Presets & Attachment Types:** Tested all 6 presets and all 6 attachment modes (`hex_nut_pocket`, `tool_hook`, `magnet_holder`, `storage_ring`, `threaded_post`, `empty_plug`) with zero console errors, page errors, or network requests:
  - *M4 Captive Nut Insert (`hex_nut_pocket`)*: `20 mm` across flats, `20 mm` reach, `~4.7 g`, `~24 min`, `384 tris`.
  - *Heavy-Duty 40mm Utility Hook (`tool_hook`)*: `20 mm` across flats, `52 mm` reach, `~9.1 g`, `~48 min`, `100 tris`.
  - *8x3mm Neodymium Magnet Holder (`magnet_holder`)*: `20 mm` across flats, `20 mm` reach, `~4.7 g`, `~24 min`, `256 tris`.
  - *32mm Tool Ring / Can Holder (`storage_ring`)*: `20 mm` across flats, `39 mm` reach, `~8.4 g`, `~42 min`, `268 tris`.
  - *M3 Threaded Post Standoff (`threaded_post`)*: `20 mm` across flats, `20 mm` reach, `~4.7 g`, `~24 min`, `256 tris`.
  - *Decorative Flush Blank Plug (`empty_plug`)*: `20 mm` across flats, `20 mm` reach, `~4.7 g`, `~24 min`, `272 tris` reported in UI (`276 tris` in exported STL).
- **Deliverable Exports:**
  - **Binary `.STL`:** Verified valid binary STL exports across all 6 insert types (`hsw-insert-hex-nut-pocket.stl`: `19,284` bytes / `384` tris; `hsw-insert-tool-hook.stl`: `5,084` bytes / `100` tris; `hsw-insert-magnet-holder.stl`: `12,884` bytes / `256` tris; `hsw-insert-storage-ring.stl`: `13,484` bytes / `268` tris; `hsw-insert-threaded-post.stl`: `12,884` bytes / `256` tris; `hsw-insert-empty-plug.stl`: `13,884` bytes / `276` tris; `0` `NaN` vertices, `0` degenerate normals).
  - **Multi-Part `.3MF`:** Verified valid OPC/ZIP `.3mf` archives across all 6 insert types (`2,549`–`5,463` bytes, containing `HSW Hex Plug` as object `id="1"` and `HSW Attachment (<type>)` as object `id="2"`).
- **Geometry, Metric & State Defects:**
  - **`storage_ring` Neck Bridge Penetrates Halfway Through Ring Opening:** In `generateHswMesh()` ([engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L328-L356)), the ring center is at `y = standOff = ringOuterDia / 2 + 2.0` (`21.5 mm` at `32 mm` inner diameter), so the inner hole starts at `y = standOff - ringInnerDia / 2 = 5.5 mm`. However, `neckGeom` is constructed with height `standOff` centered at `y = standOff / 2` (spanning `y = 0` to `y = standOff`), protruding `16 mm` into the interior of the tool loop and blocking half of the ring opening.
  - **`tool_hook` Gusset Rotates Backward Into the Plug & Self-Intersects:** In `generateHswMesh()` ([engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L307-L321)), `gussetShape` (`y ∈ [0, -10]`, extruded along `+Z`) is rotated by `+Math.PI / 4` around X and translated to `(0, -armThick, frontZ)`, which swings the `-10 mm` Y leg backward into the hex plug (`z = frontZ - 7.07 mm`) and hangs a rectangular block downward instead of forming a triangular brace between the plug face and hook arm.
  - **`empty_plug` Adds a Solid Bar Across the Center Hole Instead of Subtracting a Slot:** In `generateHswMesh()` ([engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L207-L213)), `slotGeom` (`BoxGeometry(8.0, 1.8, 0.8)`) is appended to `attachGeometries` rather than CSG-subtracted from the plug, placing a raised rectangular bar right across the `Ø 5 mm` center hole. Additionally, because `safeMergeGeometries()` ([engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L86-L89)) returns `geometries[0].clone()` without `.toNonIndexed()` when `geometries.length === 1`, the indexed `BoxGeometry` (`24` vertices, `36` indices) causes `metrics.totalTriangles` to under-count by 4 triangles (`272` reported vs `276` exported) and causes `exportHsw3MF()` to serialize only `8` triangles instead of `12` for object 2 (`if (!geom.index)` is missing in `exportHsw3MF`? No, `exportHsw3MF` calls `geom.toNonIndexed()`, so only `metrics` under-counts).
  - **`acrossFlatsMm` Metric Ignores Tightness Tolerance:** In `generateHswMesh()` ([engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L138-L139), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L389)), the mesh uses `effAcrossFlats = standardAcrossFlats + options.tightnessToleranceMm`, but `metrics.acrossFlatsMm` always returns hardcoded `standardAcrossFlats` (`20.0 mm`). Changing tolerance to `+0.25 mm` leaves the UI readout and viewport badge stuck at `20 mm`.
  - **Incomplete `resetToDefaults()`:** `resetToDefaults()` ([hsw-insert-adapter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L704-L711)) calls `applyPreset(this.presets[0])`, which only resets fields defined on `presets[0].options` and leaves `hookLengthMm`, `hookAngleDeg`, `magnetDiameterMm`, `magnetDepthMm`, and `ringDiameterMm` dirty (e.g., `hookLengthMm` stays at `40 mm` instead of resetting to `35 mm`).
  - **Missing Spec Feature (Multi-Cell Ganging):** Spec §2 & §4 require multi-cell ganging (`1x1`, `2x1`, `2x2` interconnected HSW plugs at canonical HSW pitch coordinates with a structural backplate) and hollow spring-wall slots, neither of which is implemented.

### Mobile adaptation (390px / 320px)
- **390px (Mobile) & 320px (Small):** Horizontal scroll occurs at both mobile viewports (`scrollWidth: 421` at `390px`, `scrollWidth: 420` at `320px`) caused by the long `<h1>` header (`Honeycomb Storage Wall (HSW) Insert & Adapter`) overflowing the right edge of the page.
- **Light-Mode Contrast Failure:** `.c-input__label` (`color: var(--color-text-main, #e2e8f0)`), `.checkbox-label` (`#e2e8f0`), `.metric-value` (`#f8fafc` on `rgba(255, 255, 255, 0.03)`), `.badge-dim` (`#cbd5e1`), and `.safety-list` (`#d1d5db`) use undefined `--color-text-main` with light fallbacks on a white card (`rgb(255, 255, 255)`), making form labels, checkbox text, metric values, and workshop slicing tips almost invisible in light mode (`desktop.png`, `mobile.png`, `small.png`).
- **Touch Targets & Viewport Interaction:** Range sliders (`16px` tall) and checkboxes (`13×13px`) are below the 32px touch target threshold. The Three.js canvas binds only mouse events (`mousedown`/`mousemove`/`mouseup`/`wheel`) with no touch listeners.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry):** 100% client-side; zero external network requests. Registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts`.
- **Directive 3 (Web Worker):** Missing `worker.ts`; Three.js geometry generation and JSZip `.3mf` compression run on the main thread.
- **Directive 4 (Memory Hygiene):**
  - `setupMouseEvents()` registers an anonymous `window.addEventListener('mouseup', ...)` listener in `ngOnInit()` that is never removed in `ngOnDestroy()`.
  - `downloadFormat()` accumulates `URL.createObjectURL` blobs in `activeDownloadUrls` until `ngOnDestroy()`.
- **BEM & i18n:** Uses non-BEM classes (`.preset-strip`, `.btn-grid-3`, `.grid-2-col`, `.metrics-panel`, `.safety-box`) and hardcoded English strings (no `TranslocoPipe`).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Labels (`.c-input__label`, `.checkbox-label`), metric values (`.metric-value`), `.badge-dim`, and `.safety-list` use light colors (`#e2e8f0`/`#f8fafc`/`#cbd5e1`/`#d1d5db`) that are nearly invisible on white cards in light mode | [hsw-insert-adapter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L479-L581) | Replace undefined `--color-text-main` and hardcoded light hex values with theme-aware CSS variables (`var(--color-text)`, `var(--color-surface-alt)`). |
| High | Broken attachment geometries: `storage_ring` neck spans `y = 0..standOff` (blocking half the ring hole); `tool_hook` gusset rotates backward into the plug; `empty_plug` adds a solid bar across the center hole instead of subtracting a slot | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L207-L213), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L307-L356) | Shorten `storage_ring` neck height to `standOff - ringOuterDia / 2`; build `tool_hook` gusset as a right-triangle prism in the Y–Z plane (`z >= frontZ`); subtract `slotGeom` via CSG or omit it across the center hole. |
| Medium | Horizontal overflow on both 390px (`scrollWidth: 421`) and 320px (`scrollWidth: 420`) viewports from the header title | [hsw-insert-adapter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L39-L49) | Add `min-width: 0` and `overflow-wrap: break-word` on `.c-header__title-group` / `.c-header__title`. |
| Medium | Missing spec-required multi-cell ganging (`1x1`, `2x1`, `2x2` interconnected HSW plugs); `metrics.acrossFlatsMm` ignores `tightnessToleranceMm`; `resetToDefaults()` does not reset all option signals; `safeMergeGeometries()` leaves single-item `BoxGeometry` indexed | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L86-L89), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L389), [hsw-insert-adapter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L704-L711) | Implement multi-cell ganging, report `Math.round(effAcrossFlats * 100) / 100` in `metrics.acrossFlatsMm`, reset all signals from `DEFAULT_HSW_OPTIONS`, and normalize single-item geometries in `safeMergeGeometries()`. |
| Low | `hookAngle` slider max is `55` in template vs `60` in `types.ts`/`validateHswOptions()`; `window.addEventListener('mouseup')` is leaked on destroy; missing touch orbit listeners, Web Worker, BEM prefixes, and i18n | [hsw-insert-adapter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L262), [hsw-insert-adapter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L863-L865) | Align `hookAngle` slider `max="60"`, remove `mouseup` listener in `ngOnDestroy()`, add touch handlers, and offload mesh generation to a Web Worker. |

---

<a id="tool-43"></a>
## 43 — Passport, Visa & ID Biometric Photo Maker (`/tools/passport-biometric-photo`)

**Verdict:** ⚠️ Core sheet/single-photo rendering and JPG/PNG/PDF exports work locally, but all three built-in sample portraits are a 1×1 pixel placeholder, pan controls are missing from the UI, biometric head-guide overlays are drawn over the entire multi-photo sheet instead of a single photo slot, and non-existent form CSS classes leave range sliders/labels unstyled.

### Functional testing
- **Country presets & sheet layouts:** Tested switching across US (`50.8×50.8 mm`, `600×600 px` at 300 DPI, 4 photos/sheet on 4×6″), EU/Schengen (`35×45 mm`, `413×531 px`, 6 photos/sheet on 4×6″), UK, Canada (`50×70 mm`, 2 photos/sheet), Japan (`30×40 mm`), and China (`33×48 mm`), plus sheet sizes (`4×6″`, `A4`, `A6`, `Single Digital Photo`) and DPI (`300`, `600`). Metrics and canvas pixel dimensions (`1800×1200` for 4×6″ at 300 DPI) update reactively.
- **Image upload & adjustments:** Uploaded a synthetic 400×500 transparent PNG portrait (`test-portrait.png`) via `<input type="file">`. Zoom (`0.5x–3.0x`), head tilt (`-15°` to `+15°`), brightness/contrast (`-50` to `+50`), scissor cut guidelines toggle, and `Reset All` updated the preview canvas cleanly.
- **Deliverable exports (JPG / PDF / PNG):**
  - `passport-photo-eu-schengen-35x45mm-4x6-inches.jpg`: **106,393 bytes**, valid JPEG magic bytes (`ff d8 ff e0`).
  - `passport-photo-eu-schengen-35x45mm-a4.pdf`: **457,166 bytes**, valid PDF header (`%PDF-1.3`).
  - `passport-photo-us-2x2-inch-single-digital.png`: **26,038 bytes**, valid PNG header (`89 50 4e 47 0d 0a 1a 0a`).
- **Functional defects found:**
  1. **Sample portraits are 1×1 pixel placeholders:** All three "Try Sample Portrait" buttons (`Sample Portrait (Neutral)`, `Formal Studio Portrait`, `Child / Infant Portrait`) load `DUMMY_PORTRAIT_DATA_URL` (a 1×1 solid red pixel PNG), so the preview initially renders solid red rectangles instead of a portrait face.
  2. **Biometric overlay misaligned on multi-photo sheets:** `.biometric-overlay` (`Crown of Head`, `Eye Level Centerline`, `Chin Baseline`) is positioned over the entire `.canvas-wrapper` with static CSS percentages (`top: 20%`, `45%`, `75%`). When `printSheetSize` is a multi-photo sheet (default `4×6″`), the head guide lines span across the whole 4- or 6-photo sheet rather than a single portrait slot, and do not adapt to `currentSpec().minHeadHeightMm` / `maxHeadHeightMm`.
  3. **Pan X/Y not exposed in UI:** `panX`/`panY` signals and `setPan(x, y)` exist in the component and engine, but there are no sliders or canvas drag interactions to reposition an off-center portrait.
  4. **Background tint only affects transparent images:** `renderSinglePhotoSlot` fills the background color behind the image and draws the image in `cover` mode on top; for standard opaque JPEG portraits, choosing `Pure White` / `Off-White` / `Light Grey` / `Light Blue` has no visible effect unless the background was already removed.
- **Zero network / console errors:** 0 console errors, 0 page errors, 0 external network requests.

### Mobile adaptation (390px / 320px)
- **390px (`mobile.png`):** No horizontal scroll (`scrollWidth: 390`). Columns stack vertically, with controls above the preview card.
- **320px (`small.png`):** Horizontal overflow detected (`scrollWidth: 367` vs `320px` viewport) because `.l-columns` children use the non-existent class `.l-columns__column` instead of `.l-columns__area` (which sets `min-width: 0`), causing `.c-header__title` and wide button groups to push the page width to 367px.
- **Touch targets & form controls:** Range sliders (`129×16 px`) and the checkbox (`13×13 px`) use non-existent classes (`.c-range`, `.c-checkbox-label`, `.c-form-label`, `.c-form-value`) instead of the design system's `.c-input__slider` and `.c-input__switch`, rendering as unstyled native inputs and concatenating label text directly with values (`Scale / Zoom Level1.00x`, `Head Tilt Correction0.0°`, `Brightness0`).
- **Tiny text:** `.biometric-tag` labels inside the canvas overlay render at `0.65rem` (`10.4px`).

### Code review
- **Architecture & Directives:**
  - `engine.ts` is pure client-side (`jsPDF` + HTML5 Canvas) with zero Angular/DOM dependencies and zero network calls (Directives 1 & 2 respected).
  - Memory cleanup (`URL.revokeObjectURL`) is properly called in `loadImageElement` and `ngOnDestroy` (Directive 4 respected).
  - Registered in `tool-registry.ts` and lazy-loaded in `app.routes.ts` (Directive 5 respected).
  - 600 DPI A4 sheet rendering (`4961×7016 px` canvas + `toDataURL` + `jsPDF`) runs on the main UI thread instead of a Web Worker (`OffscreenCanvas`), which can briefly block the main thread on high-DPI A4 exports (Directive 3).
- **BEM / Design System / i18n:**
  - Uses unprefixed component classes (`.preset-strip`, `.preview-container`, `.metrics-grid`, `.metric-item`, etc.) and hardcoded light-mode hex colors (`#f8fafc`, `#e2e8f0`, `#1e293b`) instead of BEM (`c-`/`l-`/`g--`) and CSS custom properties.
  - Uses `.l-extremo` without `.l-extremo__area-izquierda` / `.l-extremo__area-derecha`, causing adjacent label and value elements to touch without spacing.
  - All template copy is hardcoded in English without `TranslatePipe`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | All 3 sample portraits use a 1×1 red pixel placeholder (`DUMMY_PORTRAIT_DATA_URL`), rendering red rectangles in the default preview | [test-fixtures.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/test-fixtures.ts#L206-L231) | Replace with SVG/Canvas-generated portrait silhouettes or real embedded sample portraits with head/shoulders |
| Medium | Biometric head-guide overlay is stretched over the entire multi-photo print sheet rather than a single portrait crop frame | [passport-biometric-photo.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L329-L345) | Provide a dedicated single-portrait crop/alignment preview (or restrict overlay to the single photo slot) with head-height lines computed from `currentSpec()` |
| Medium | `panX` and `panY` signals exist in component & engine but have no UI sliders or canvas drag handlers | [passport-biometric-photo.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L603-L604) | Add pointer drag-to-pan on the preview canvas and/or Pan X / Pan Y sliders |
| Medium | Non-existent classes (`.l-columns__column`, `.c-range`, `.c-form-label`, `.c-checkbox-label`) and missing `.l-extremo__area-*` cause 320px overflow (`367px`), 129×16px unstyled sliders, and concatenated labels (`Scale / Zoom Level1.00x`) | [passport-biometric-photo.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L76-L250) | Replace `.l-columns__column` with `.l-columns__area`, use `.c-input__slider` / `.c-input__switch`, and wrap `.l-extremo` children in `__area-izquierda` / `__area-derecha` |
| Low | Unprefixed CSS classes and hardcoded light-mode hex colors (`#f8fafc`, `#e2e8f0`); hardcoded English strings | [passport-biometric-photo.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L446-L578) | Use BEM `c-` prefixes, CSS theme variables (`var(--color-*)`), and `TranslatePipe` |

---

<a id="tool-44"></a>
## 44 — HEIC & AVIF to JPG/PNG Batch Converter (`/tools/heic-avif-converter`)

**Verdict:** ⚠️ Batch conversion of AVIF/WebP/PNG/JPG to JPG/PNG/WebP with downscaling, filename suffixes, and `.zip` packaging works cleanly, but **no client-side HEIC/HEIF decoder (`heic2any` / `libheif` WASM) is implemented**, so `.heic`/`.heif` files fail to decode in Chrome, Firefox, and Edge.

### Functional testing
- **AVIF & standard image batch conversion:** Generated a real `1200×900` AVIF image (`photo-landscape.avif`, 5,543 B via `libaom-av1`) and a `1200×900` PNG (`sample-1200x900.png`, 1.0 MB), configured Target Format = `JPG`, Downscale Limit = `Web (800px)`, Filename Suffix = `-converted`, and clicked `Convert All`.
  - Both decoded via `createImageBitmap`, downscaled proportionally to `800×600 px`, and exported cleanly:
    - Single download `photo-landscape-converted.jpg`: **23,369 bytes**, valid JPEG header (`ff d8 ff e0`), verified decoded dimensions `800×600 px`.
    - Batch `Download All` archive `converted-photos-jpeg-2026-10-24.zip`: **43,636 bytes**, valid PKZIP header (`50 4b 03 04`).
- **HEIC/HEIF conversion failure:** Uploaded `.heic` input (`iphone-photo.heic`). Because `engine.ts` only calls native `createImageBitmap(source)` and `<img src="blob:...">` without `heic2any` or `libheif-js` WASM, Chromium/Firefox/Edge cannot decode HEIC containers and every `.heic`/`.heif` item fails with status `Error` (`Failed to decode image data`).
- **Queue & reset controls:** `Clear Queue`, per-item remove (`✕`), and `Reset Defaults` properly reset state and revoke object URLs.
- **Zero network / console errors:** 0 console errors, 0 page errors, 0 external network requests.

### Mobile adaptation (390px / 320px)
- **390px (`mobile.png`):** No horizontal overflow (`scrollWidth: 390`). Cards stack vertically (`1. Select or Drop Images`, `2. Output Settings`, `Batch Queue & Statistics`).
- **320px (`small.png`):** Horizontal overflow (`scrollWidth: 359` vs `320px` viewport) caused by using `.l-columns__column` instead of `.l-columns__area` (`min-width: 0` missing on grid items), allowing the `<h1>` title to exceed 320px.
- **Touch targets & form controls:**
  - `.c-range` (`129×16 px`), `<input type="text" class="c-input">` (`28px` height instead of `.c-input__control`'s `38px`), and `.c-checkbox-label` (`13×13 px`) use non-existent or misapplied CSS classes.
  - `.l-extremo` is used without `.l-extremo__area-izquierda` / `.l-extremo__area-derecha` (uses non-existent `.l-extremo__left` / `.l-extremo__right`), causing `Compression Quality92%` and action buttons (`Convert All` + `Clear Queue`) to butt directly against each other.

### Code review
- **Architecture & Directives:**
  - **Spec conformance gap (HEIC WASM missing):** `spec.md` specifies `heic2any / libheif WASM` for Apple HEIC/HEIF decoding, but `engine.ts` only uses browser-native `createImageBitmap` / `HTMLImageElement`.
  - **Dangerous 400ms fallback in `loadImageElement`:** In `engine.ts` (lines 161–167), the `HTMLImageElement` fallback sets a `400ms` timeout that resolves with an empty `800×600` blank canvas if an image takes >400ms to decode, silently producing blank images.
  - **Missing Web Worker (Directive 3):** Batch decoding, canvas re-encoding (up to 100 images), and `JSZip` compression run on the main UI thread instead of a Web Worker.
  - **`ImageBitmap` not closed (Directive 4):** `createImageBitmap(source)` in `loadImageElement` (`engine.ts:150`) is never `.close()`d after `ctx.drawImage`, retaining uncompressed bitmap memory across large batches.
- **BEM / Design System / i18n:**
  - Custom classes (`.format-pills`, `.dim-pills`, `.stats-grid`, `.stat-card`, `.queue-item`, etc.) lack BEM `c-` prefixes and hardcode light-mode hex colors (`#f8fafc`, `#e2e8f0`, `#1e293b`).
  - No `TranslatePipe` i18n integration; all strings are hardcoded in English.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | No HEIC/HEIF decoder (`heic2any` or `libheif-js`) is used; `.heic`/`.heif` files fail with `Failed to decode image data` in Chrome/Firefox/Edge | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/engine.ts#L133-L183) | Decode `.heic`/`.heif` files via client-side `libheif-js` / `heic2any` WASM before passing to Canvas |
| Medium | `loadImageElement` has a 400ms timeout that silently resolves with a blank 800×600 canvas if decoding takes >400ms | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/engine.ts#L161-L167) | Remove the 400ms blank-canvas fallback in browser environments and wait for `onload`/`onerror` |
| Medium | Batch image conversion (up to 100 files) and ZIP compression run on the main thread; `ImageBitmap.close()` is never called after drawing | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/engine.ts#L150-L241) | Offload batch conversion + `JSZip` to a Web Worker (`OffscreenCanvas`) and call `element.close()` on `ImageBitmap` instances |
| Medium | Non-existent classes (`.l-columns__column`, `.l-extremo__left`, `.c-range`, `.c-checkbox-label`) and `<input class="c-input">` cause 359px overflow at 320px, concatenated `Compression Quality92%`, and small touch targets (`129×16`, `28px` height) | [heic-avif-converter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/heic-avif-converter.component.ts#L48-L256) | Use `.l-columns__area`, `.l-extremo__area-izquierda`/`__area-derecha`, `.c-input__control`, `.c-input__slider`, and `.c-input__switch` |
| Low | Unprefixed CSS classes with hardcoded light-mode hex colors; hardcoded English strings | [heic-avif-converter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/heic-avif-converter.component.ts#L343-L433) | Use BEM `c-` prefixes, CSS variables (`var(--color-*)`), and `TranslatePipe` |

---

<a id="tool-45"></a>
## 45 — Client-Side PDF Signer, Date Stamper & Initials (`/tools/pdf-signer-stamper`)

**Verdict:** ⚠️ `pdf-lib` stamp embedding, multi-page navigation, and PDF flattening work locally, but **there is no visual PDF page preview (`PDF.js`) or coordinate control** (all stamps are placed at hardcoded X/Y coordinates), the signature canvas only listens to mouse events (cannot draw on mobile touchscreens), and the 400px fixed-width canvas overflows both 390px and 320px viewports.

### Functional testing
- **Sample & custom PDF loading:** Tested initial 2-page `sample-contract-agreement.pdf`, `Sample NDA Agreement`, `Sample Service Contract`, and re-uploading a signed PDF via `<input type="file">`. Invalid/corrupt PDF uploads are caught gracefully with an error alert (`Failed to parse PDF document (line:0 col:40 offset=20): No PDF header found`).
- **Signature pad, date stamps & initials:**
  - Drew a signature with Dark Blue ink (`#1e3a8a`) on `#signatureCanvas`, placed a signature stamp on Page 1 (`(100, 150)`), switched date format to `MMM D, YYYY` (`Oct 24, 2026`) and stamped on Page 1 (`(280, 150)`), navigated to Page 2 (`Next ▶`), and placed an initials stamp (`(420, 150)`).
  - Exported `non-disclosure-agreement-(nda)-signed.pdf` (**3,157 bytes**, valid `%PDF-1.7` header, contains embedded `/Subtype /Image` PNG XObject and 2 valid pages when re-inspected by `pdf-lib`).
- **Functional defects found:**
  1. **No visual PDF page preview (`PDF.js`) or interactive stamp positioning:** Despite `spec.md` requiring `PDF.js` and interactive coordinate placement, the right column only renders a text list of stamps (`SIGNATURE Page 1 @ (100, 150)`). Users cannot see the PDF document or drag/adjust stamp positions; `addSignatureStamp`, `addDateStamp`, and `addInitialsStamp` always use hardcoded coordinates `(100, 150)`, `(280, 150)`, and `(420, 150)`.
  2. **Signature canvas is broken on mobile touch devices:** `#signatureCanvas` only binds `(mousedown)`, `(mousemove)`, `(mouseup)`, and `(mouseleave)` (`MouseEvent`) with no `PointerEvent` (`pointerdown`/`pointermove`/`pointerup`) or `TouchEvent` support, nor `touch-action: none`.
  3. **No "Type Signature" mode:** Card 2 is titled `"2. Draw or Type Signature"`, but only a drawing canvas is provided (no text input to generate a typed cursive signature).
  4. **Blank signature pad not guarded:** Clicking `+ Stamp Signature` without drawing anything embeds a transparent 400×150 PNG without warning.
- **Zero network / console errors:** 0 console errors, 0 page errors, 0 external network requests.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow at 390px AND 320px (`scrollWidth: 400` on both):**
  - `<canvas #signatureCanvas class="signature-canvas" width="400" height="150">` has a fixed 400px width without `max-width: 100%`, and `.l-columns` children use the non-existent `.l-columns__column` class instead of `.l-columns__area` (`min-width: 0` missing). This forces the page to 400px wide on both 390px and 320px viewports and clips the `<h1>` header on the right (`mobile.png`, `small.png`).
  - Even more critically, because `#signatureCanvas` only binds mouse events, a mobile user cannot draw a signature on a touchscreen.
- **Touch targets & spacing:**
  - Ink color dots (`.color-dot`, `24×24 px` on desktop, squeezed to `19×24 px` at 320px), `.c-range` (`129×16 px`), `input.initials-input` (`100×28 px`), and checkbox (`13×13 px`) are all below the 32×32px minimum touch target threshold.
  - `.l-extremo` is used without `.l-extremo__area-izquierda` / `__area-derecha`, causing `Pen Stroke Width2px`, `Stamp Text: 2026-10-24+ Stamp Date`, and the initials input + `+ Stamp Initials` button to touch with zero gap.

### Code review
- **Architecture & Directives:**
  - `engine.ts` uses `pdf-lib` purely client-side with zero network requests (Directives 1 & 2 respected) and revokes object URLs in `ngOnDestroy` (Directive 4 respected).
  - `processSignedPdf` calls `inspectPdfDocument(pdfBuffer)` a second time after `applyStampsToPdf(pdfBuffer)` already loaded and saved the `PDFDocument` (`engine.ts:246-256`), parsing the PDF twice on the main thread.
- **BEM / Design System / i18n:**
  - Uses non-existent `.l-columns__column`, `.c-range`, `.c-form-label`, `.c-checkbox-label`, unprefixed component classes (`.preset-strip`, `.signature-pad-container`, `.color-dot`, `.stamp-row`), hardcoded light-mode hex colors (`#f8fafc`, `#e2e8f0`, `#334155`), and hardcoded English strings without `TranslatePipe`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | No visual PDF page preview (`PDF.js`) and no way to position stamps—all signatures, dates, and initials are placed at hardcoded coordinates `(100, 150)`, `(280, 150)`, `(420, 150)` | [pdf-signer-stamper.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L254-L318) | Render the active PDF page to a preview canvas via `pdfjs-dist` and allow click/drag placement (or X/Y coordinate controls) with live stamp overlays |
| High | Signature pad `#signatureCanvas` only binds `mousedown`/`mousemove`/`mouseup` (`MouseEvent`), making signature drawing unusable on mobile/touchscreens, and fixed `width="400"` overflows both 390px and 320px viewports (`scrollWidth: 400`) | [pdf-signer-stamper.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L101-L110) | Use PointerEvents (`pointerdown`/`pointermove`/`pointerup`) with `touch-action: none`, add `width: 100%; max-width: 400px` on `.signature-canvas`, and scale pointer coordinates by `canvas.width / rect.width` |
| Medium | Card 2 is titled `"2. Draw or Type Signature"` but provides no text input to type a signature | [pdf-signer-stamper.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L98-L170) | Add a Draw / Type toggle that renders typed signature text onto `#signatureCanvas` |
| Medium | Non-existent `.l-columns__column`, `.c-range`, `.c-checkbox-label`, missing `.l-extremo__area-*`, and small `.color-dot` (`24×24px`) cause cramped/touching controls and undersized touch targets | [pdf-signer-stamper.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L76-L250) | Use `.l-columns__area`, `.l-extremo__area-izquierda`/`__area-derecha`, `.c-input__slider`, `.c-input__control`, and enlarge `.color-dot` to at least `32×32px` |
| Low | Unprefixed CSS classes, hardcoded light-mode hex colors, and hardcoded English strings | [pdf-signer-stamper.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L360-L503) | Migrate to BEM `c-` classes, CSS custom properties (`var(--color-*)`), and `TranslatePipe` |

---

<a id="tool-46"></a>
## 46 — Face & License Plate Privacy Blur Tool (`/tools/face-plate-blur`)

**Verdict:** ⚠️ Canvas censoring algorithms (`mosaic_pixelate`, `blackout_box`, `gaussian_blur`) and EXIF-stripped JPEG/PNG exports work locally, but **users cannot draw, drag, resize, or edit censor box coordinates**—the UI only provides `+ Add Face Box` and `+ Add License Plate Box` buttons that insert regions at hardcoded pixel coordinates `(120, 80)` and `(100, 250)`.

### Functional testing
- **Censoring algorithms & export verification:**
  - Uploaded a `600×400` test image (`car-sale.jpg`), added a Face Box (`mosaic_pixelate`, 16px block size) and a License Plate Box (`blackout_box`), clicked `Apply Privacy Censors`, and tested both JPEG and PNG exports:
    - `car-sale-sanitized.jpg`: **4,268 bytes**, valid JPEG header (`ff d8 ff e0`).
    - `car-sale-sanitized.png`: **17,567 bytes**, valid PNG header (`89 50 4e 47 0d 0a 1a 0a`).
  - Verified exported pixel data on canvas: unmodified background at `(10, 10)` remained `[56, 189, 248, 255]`, license plate region at `(200, 280)` was blacked out (`[0, 0, 0, 255]`), and face region at `(150, 120)` was mosaic-pixelated (`[226, 161, 161, 255]`).
- **Critical functional defects:**
  1. **No interactive region selection, coordinate inputs, or auto-detection:** Despite `spec.md` and component signals (`selectionMode = signal<SelectionMode>('manual_rect')`, `brushRadiusPx = signal<number>(20)`) defining `manual_rect`, `brush_stroke`, and `auto_detect_faces`, the preview renders a static `<img>` tag with no pointer interaction. The only way to add regions in the UI is via `+ Add Face Box` (hardcoded `140×160` at `120, 80`) and `+ Add License Plate Box` (hardcoded `200×70` at `100, 250`), with no X/Y/Width/Height inputs to move or resize them.
  2. **Stale preview when uploading a second image:** `handleFileSelected()` sets `originalImage` without clearing `previewUrl` or `lastResult`, so the previous image's censored preview stays on screen until `Apply Privacy Censors` is clicked again.
  3. **300ms timeout in `loadImageElement()`:** In `engine.ts` (lines 85–90), if an image takes >300ms to decode, the timeout resolves with an uninitialized `800×600` `HTMLImageElement`, producing a blank canvas.
- **Zero network / console errors:** 0 console errors, 0 page errors, 0 external network requests.

### Mobile adaptation (390px / 320px)
- **390px (`mobile.png`):** No horizontal overflow (`scrollWidth: 390`). Uses `.l-columns__area.c-card` properly so cards stack cleanly.
- **320px (`small.png`):** Minor horizontal overflow (`scrollWidth: 333` vs `320px` viewport) caused by the long `.c-header__title` heading (`Face & License Plate Privacy Blur Tool`).
- **Touch targets:** Range sliders use the non-existent class `.c-input__range` instead of `.c-input__slider`, rendering at `16px` height (`316×16 px` on 390px, `246×16 px` on 320px). At 320px, `+ Add License Plate Box` wraps onto a second line with `.g--margin-left-2` indenting its left edge.

### Code review
- **Architecture & Directives:**
  - `engine.ts` is pure client-side HTML5 Canvas with zero network requests (Directives 1 & 2 respected).
  - `URL.revokeObjectURL()` is properly called on previous preview URLs and in `ngOnDestroy()` (Directive 4 respected).
  - Properly uses `.l-columns__area` and `.l-extremo__area-izquierda` / `.l-extremo__area-derecha` (better BEM adherence than tools 43–45), though it uses custom `<div class="c-dropzone">` instead of shared `<app-dropzone>` and `.c-input__range` instead of `.c-input__slider`.
  - Hardcoded light-mode hex colors (`#fff`, `#e2e8f0`, `#f8fafc`, `#065f46`) in component styles and hardcoded English strings without `TranslatePipe`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Users cannot position or resize censor boxes; `+ Add Face Box` and `+ Add License Plate Box` hardcode coordinates `(120, 80, 140×160)` and `(100, 250, 200×70)`, and `selectionMode`/`brushRadiusPx` signals are unused | [face-plate-blur.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L414-L485) | Replace static `<img>` preview with an interactive `<canvas>` supporting pointer drag-to-draw rectangles/brush strokes and draggable/resizable region handles (plus X/Y/W/H number inputs) |
| Medium | `loadImageElement` has a 300ms timeout that resolves with an unloaded `800×600` image if decoding takes >300ms | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/engine.ts#L85-L90) | Remove the 300ms fallback in browser runtime and await `img.onload` / `img.onerror` |
| Medium | `handleFileSelected()` does not reset `previewUrl` or `lastResult`, leaving stale preview/download from the previous photo | [face-plate-blur.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L495-L505) | Set `this.previewUrl.set(null)` and `this.lastResult.set(null)` inside `handleFileSelected()` |
| Low | Range input uses non-existent `.c-input__range` (`16px` height) instead of `.c-input__slider`; 333px overflow at 320px; hardcoded English text & hex colors | [face-plate-blur.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L119-L137) | Change `.c-input__range` to `.c-input__slider`, allow header wrapping at 320px, use CSS variables, and add `TranslatePipe` |

---

<a id="tool-47"></a>
## 47 — Local OCR Image & Scanned PDF to Text/Word (`/tools/local-ocr-text-extractor`)

**Verdict:** ❌ While the post-processing pipeline and `.txt`/`.md`/`.docx` (OpenXML ZIP) deliverable builders work locally, **actual Optical Character Recognition (`tesseract.js`) and PDF page rasterization (`PDF.js`) are completely unimplemented (stubbed)**—uploading any image or scanned PDF returns a hardcoded placeholder text string.

### Functional testing
- **Image OCR test (broken / stubbed):** Generated and uploaded a `600×200` PNG (`invoice-scan.png`) containing clear black-on-white text `"INVOICE #2026-9918 TOTAL $450.00"` and clicked `Start OCR Extraction`.
  - Instead of performing optical character recognition, `processLocalOcr` (`engine.ts:257-285`) decodes the raw binary buffer as UTF-8, checks for uncompressed PDF `(...) Tj` strings, and falls back to returning a hardcoded placeholder block:
    `"PRIVACY-FIRST CLIENT-SIDE OCR EXTRACTED TEXT / Document: invoice-scan.png / Language: ENG / Page Segmentation: auto / The requested document was analyzed 100% locally in your browser..."` with a hardcoded `Confidence: 96%`.
- **Uncompressed PDF regex path:** Uploaded a raw PDF containing an uncompressed stream `BT (Confidential Agreement 2026) Tj ET` (`contract.pdf`). The regex `/\(([^()]+)\)\s*Tj/g` extracted `"Confidential Agreement 2026"`, which fails on any real-world FlateDecode-compressed or scanned image PDF.
- **Deliverable builders (`.txt`, `.md`, `.docx`) & clipboard:**
  - `invoice-scan-ocr.txt`: **457 bytes**, plain text.
  - `invoice-scan-ocr.md`: **485 bytes**, Markdown with `# invoice-scan` and `## Page 1` headers.
  - `invoice-scan-ocr.docx`: **3,521 bytes**, valid PKZIP OpenXML package (`50 4b 03 04`) containing `[Content_Types].xml`, `_rels/.rels`, and `word/document.xml`.
  - `Copy Text` and `Reset` buttons function as expected.
- **Zero network / console errors:** 0 console errors, 0 page errors, 0 external network requests.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow at 390px (`scrollWidth: 421`) and 320px (`scrollWidth: 420`):**
  - On both mobile viewports, `<h1 class="c-header__title">Local OCR Image & Scanned PDF to Text & Word</h1>` overflows the right edge of the viewport (`421px` wide), causing horizontal scrolling (`mobile.png`, `small.png`).
- **Touch targets & form controls:**
  - `<select class="c-input__select">` uses the non-existent `.c-input__select` class instead of `.c-input__control`, rendering as an unstyled native `<select>` only `21px` tall (`316×21 px` at 390px, `246×21 px` at 320px).
  - Post-processing checkboxes use `.c-checkbox-label` instead of `.c-input__switch`, rendering `13×13 px` native checkboxes.

### Code review
- **Architecture & Directives:**
  - **Core engine stubbed (`engine.ts:255-285`):** `spec.md` specifies `tesseract.js` (client-side WASM Web Worker) and `PDF.js` (rendering scanned PDF pages to canvas), plus Directive 3 Web Worker execution. Neither `tesseract.js`, `pdfjs-dist`, nor a Web Worker (`worker.ts`) is implemented.
  - **Unused signals:** `binarizeThreshold` (`signal<number>(128)`) and `enhanceContrast` (`signal<boolean>(true)`) are defined on the component (`local-ocr-text-extractor.component.ts:341-342`) and passed to `processLocalOcr`, which validates `binarizeThreshold` but never performs image binarization or contrast enhancement, and neither signal has a UI control.
  - **Object URL leak on file selection:** `handleFileSelected()` (`local-ocr-text-extractor.component.ts:387-388`) calls `URL.createObjectURL(file)` and pushes it to `createdBlobUrls` even though `previewUrl` is never stored or rendered anywhere in the component.
- **BEM / Design System / i18n:**
  - Uses `.c-input__select` instead of `.c-input__control`, hardcoded light-mode hex colors (`#f8fafc`, `#cbd5e1`, `#0f172a`), and hardcoded English strings without `TranslatePipe`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | No OCR engine (`tesseract.js`) or PDF page renderer (`pdfjs-dist`) is implemented; `processLocalOcr` returns a hardcoded placeholder text string for all images and scanned PDFs | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.ts#L255-L285) | Integrate `tesseract.js` Web Worker (with local WASM/traineddata assets) and `pdfjs-dist` page-to-canvas rendering |
| Medium | Horizontal overflow on both 390px (`scrollWidth: 421`) and 320px (`scrollWidth: 420`) viewports due to `.c-header__title` overflowing the viewport | [local-ocr-text-extractor.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts#L20-L31) | Ensure `.c-header__title-group` and `.c-header__title` allow wrapping (`min-width: 0; overflow-wrap: break-word`) |
| Medium | `<select class="c-input__select">` uses a non-existent class (`21px` height) instead of `.c-input__control` (`38px` min-height), and checkboxes (`13×13px`) are unstyled | [local-ocr-text-extractor.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts#L72-L140) | Use `.c-input__control` on `<select>` and `.c-input__switch` on checkboxes |
| Low | `binarizeThreshold` and `enhanceContrast` signals have no UI controls and are no-ops in `engine.ts`; `handleFileSelected` creates an unused ObjectURL | [local-ocr-text-extractor.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts#L341-L389) | Wire preprocessing canvas filters + UI controls, and remove the unused `URL.createObjectURL(file)` call |

---

<a id="tool-48"></a>
## 48 — Zero-Knowledge File Encryptor & Vault (`/tools/file-encryptor-vault`)

**Verdict:** ✅ Real Web Crypto API (`AES-256-GCM` + `PBKDF2-SHA256`) encryption, `.priv`/`.enc` binary container packing, magic-byte auto-detection, wrong-password authentication rejection, and byte-identical decryption all work 100% client-side, with minor UI/UX and 320px responsive issues.

### Functional testing
- **End-to-end encryption (`AES-256-GCM` + `PBKDF2`):**
  - Uploaded `secret-financials.json` (**967 bytes**), entered a passphrase, selected `300,000 (High)` PBKDF2 iterations and `.priv (PrivKnife Vault)` container format, and clicked `Encrypt & Seal File`.
  - Downloaded `secret-financials.json.priv` (**1,142 bytes**). Verified binary container structure: magic bytes `PRIV` (`0x50 0x52 0x49 0x56`), version `1`, big-endian uint32 iterations `300000`, 16-byte CSPRNG salt, 12-byte IV, metadata block, and AES-GCM ciphertext + 16-byte authentication tag (verified zero plaintext payload leakage).
- **Magic-byte auto-detection & wrong-password rejection:**
  - Clicked `Reset` and uploaded `secret-financials.json.priv`. `isPrivKnifeVaultContainer()` inspected the `PRIV\x01` header and automatically switched the UI to `🔓 Decrypt Vault` mode.
  - Tested decryption with an incorrect password (`WrongPassword123!`): AES-GCM tag verification rejected the payload and rendered `⚠️ Decryption failed: Incorrect password or corrupted vault container.`
- **Round-trip decryption verification:**
  - Entered the original passphrase and clicked `Decrypt & Open Vault`, then `Download Decrypted File`.
  - Downloaded `secret-financials.json` (**967 bytes**), verified byte-for-byte identical (`Buffer.compare === 0`) to the original file.
- **Zero network / console errors:** 0 console errors, 0 page errors, 0 external network requests.

### Mobile adaptation (390px / 320px)
- **390px (`mobile.png`):** No horizontal overflow (`scrollWidth: 390`). Cards stack cleanly (`Vault Security Controls` above `Vault Status & Deliverable`) with all touch targets ≥ 32px.
- **320px (`small.png`):** Minor horizontal overflow (`scrollWidth: 336` vs `320px` viewport) caused by `.c-header__title` (`Zero-Knowledge File Encryptor & Vault`) and `.c-password-field` (`input.c-input__text` has `flex: 1` without `min-width: 0`, pushing the `Show` button to the right edge of the card).
- **iOS auto-zoom:** `<input class="c-input__text">` sets `font-size: 0.875rem` (`14px` < `16px`), which triggers iOS Safari page zoom on focus (`inputsUnder16px_iOSZoom: 1`).

### Code review
- **Architecture & Directives:**
  - Uses genuine `crypto.subtle` (`PBKDF2` with `SHA-256` + `AES-GCM` 256-bit key and 128-bit tag) and `crypto.getRandomValues()` with zero external network calls (Directives 1 & 2 respected).
  - **Cleartext metadata & missing UI toggle (`engine.ts:181-201`):** `ContainerMetadata` (`originalName`, `originalSize`, `mimeType`, `encryptedAt`) is stored as unencrypted UTF-8 JSON in the container header without being authenticated via AES-GCM `additionalData` (AAD), and the `embedOriginalFilename` signal (`file-encryptor-vault.component.ts:347`) has no checkbox in the template, so the original filename is always visible in cleartext inside `.priv`/`.enc` files.
  - **Unused `confirmPassword` signal (`file-encryptor-vault.component.ts:350`):** `confirmPassword` and `setConfirmPassword()` are defined on the component but never rendered in the template; in Encrypt mode, a single typo in the password field permanently locks the user out of the encrypted vault.
  - **Missing Web Worker (Directive 3):** PBKDF2 key derivation (up to 600,000 iterations) and whole-file `source.arrayBuffer()` encryption run on the main thread rather than in a Web Worker, and `handleFileSelected()` creates an unused `URL.createObjectURL(file)` (`line 399`).
  - **Misleading initial download button label (`line 268`):** `Download {{ lastResult()?.operation === 'encrypt' ? 'Encrypted Vault' : 'Decrypted File' }}` evaluates to `Download Decrypted File` when `lastResult()` is `null`, even while in `Encrypt File` mode.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| Medium | `confirmPassword` and `embedOriginalFilename` signals exist in the component but have no UI controls, and `ContainerMetadata` (`originalName`, `mimeType`, `encryptedAt`) is stored in cleartext in the `.priv`/`.enc` header without AES-GCM AAD | [file-encryptor-vault.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L347-L381), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/engine.ts#L170-L201) | Render a Confirm Password input in Encrypt mode and an "Embed original filename" toggle; encrypt the metadata block (or pass `metaBytes` as AES-GCM `additionalData`) |
| Medium | 600,000-iteration PBKDF2 and full-buffer `arrayBuffer()` encryption run on the main thread instead of a Web Worker; `handleFileSelected()` creates an unused `URL.createObjectURL(file)` | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/engine.ts#L152-L178), [file-encryptor-vault.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L399-L400) | Offload `encryptFileToVault` / `decryptVaultToFile` to a Web Worker and remove the unused `URL.createObjectURL(file)` call |
| Low | At 320px, `.c-password-field` and `.c-header__title` cause 336px horizontal overflow (`min-width: 0` missing on `.c-input__text`), and `14px` font-size on `.c-input__text` triggers iOS zoom | [file-encryptor-vault.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L282-L293) | Add `min-width: 0; font-size: 1rem` to `.c-input__text` (or use `.c-input__control`) and allow header title wrapping |
| Low | Disabled download button reads `Download Decrypted File` in Encrypt mode when `lastResult()` is `null` | [file-encryptor-vault.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L268) | Check `(lastResult()?.operation ?? operationMode()) === 'encrypt'` for the button label |

---

<a id="tool-49"></a>
## 49 — PII Log & CSV Scrubber & Data Anonymizer (`/tools/pii-scrubber-anonymizer`)

**Verdict:** ⚠️ Core PII scrubbing, masking, pseudonymization, audit stats, and TXT/CSV/JSON exports work cleanly, but IPv6 scrubbing, custom regex UI controls, and Web Worker offloading are missing, and a 320px horizontal overflow occurs.

### Functional testing
- **Sample Log & Replacement Tag Mode**: Clicked **Load Sample Log** and **Sanitize & Anonymize**. All 8 PII occurrences in the sample log were accurately replaced (`[EMAIL_REDACTED]` ×2, `[IP_REDACTED]` ×2, `[PHONE_REDACTED]` ×1, `[CARD_REDACTED]` ×1 Luhn-verified `4532-1234-5678-9014`, `[SSN_REDACTED]` ×1, `[API_KEY_REDACTED]` ×1) and the audit panel reported `✓ 8 Total Entities Redacted` with accurate per-category chips.
- **Character Masking Mode**: Switched to `Mask (a***@acme.corp)` and re-ran; emails (`a***e@acme.corp`), IPs (`192.168.*.*`), phones (`+* (***) ***-5678`), SSNs (`***-**-6789`), credit cards (`************9014`), and API tokens (`sk_live_***7890`) were masked while preserving structure.
- **Salted Pseudonym Mode & JSON Export**: Switched to `Salted Pseudonym` + `JSON + Audit (.json)` and clicked **Download JSON Deliverable**. Downloaded `sanitized-log-sanitized.json` (851 bytes), verified valid JSON containing `sanitizedContent` (deterministic tokens like `USER_370342d3`, `IP_f2d3d89e`, `CARD_2e5b209b`), `auditStats`, and `metadata`.
- **CSV Upload & IPv6 Edge Case**: Uploaded a `.csv` file containing an email, an IPv4 address, and an IPv6 address (`2001:0db8:85a3:0000:0000:8a2e:0370:7334`). The output format automatically switched to `CSV (.csv)`, and the email and IPv4 address were redacted, **but the IPv6 address remained unredacted** even though the UI label explicitly advertises `IP Addresses (IPv4 / IPv6)`.
- **Empty Salt Validation Edge Case**: If the user clears the salt input in `Salted Pseudonym` mode and clicks **Sanitize & Anonymize**, `validateScrubberOptions()` throws an unhandled error in the promise (`A custom salt is required when using salted_hash_pseudonym mode`) with no error banner displayed in the UI.
- **Reset**: Clicking **Reset** cleared the input, file selection, and preview state back to defaults. Zero console errors or network requests during normal workflows.

### Mobile adaptation (390px / 320px)
- **390px (Mobile)**: No horizontal scroll (`scrollWidth: 390`). Cards stack vertically into a single column; button groups wrap cleanly.
- **320px (Small Mobile)**: Horizontal overflow (`scrollWidth: 375` vs `320px` viewport). As seen in `small.png`, the unbreakable `<h1>` title (`PII Log & CSV Scrubber & Data Anonymizer`) and the 2-column `.c-card__header.l-extremo` flex header (`Scrubber Configuration & Input` + `Load Sample Log` button) push the layout beyond 320px. Additionally, `.c-entity-grid` stays hardcoded at `grid-template-columns: repeat(2, 1fr)` without collapsing to 1 column on narrow screens.
- **Touch targets & iOS zoom**: The 6 native `<input type="checkbox">` controls in `.c-entity-grid` are 13×13px, and `.c-scrubber-textarea` uses `font-size: 0.85rem` (13.6px < 16px, triggering iOS Safari auto-zoom on focus).

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: 100% client-side execution; zero external network requests.
- **Directive 3 (Web Worker)**: No `worker.ts` exists. `processPiiScrub()` runs regex passes synchronously on the main UI thread (`engine.ts`), which can freeze the UI when scrubbing multi-megabyte server logs or CSVs.
- **Directive 4 (Memory Hygiene)**: `cleanUpUrls()` is called in `ngOnDestroy()` and `resetToDefaults()`, and `downloadDeliverable()` revokes its blob URL after 100ms. However, `handleFileSelected()` calls `URL.createObjectURL(file)` on line 487 and pushes it to `createdBlobUrls` without ever using `previewUrl`.
- **Spec Conformance Gaps**:
  1. `engine.ts` supports `customRegexPatterns`, and `PiiScrubberAnonymizerComponent` defines `readonly customRegexPatterns = signal<string>('')`, but there is no input control in the template for users to enter custom regex patterns.
  2. `scrubIpAddresses` in `engine.ts` only defines `ipv4Regex` despite the UI checkbox and comment stating `IPv4 and IPv6`.
  3. `computePseudonym()` uses a 32-bit FNV-1a hash rather than Web Crypto (`crypto.subtle.digest('SHA-256', ...)` as specified in `spec.md`).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| Medium | IPv6 addresses are never scrubbed despite the checkbox label reading `IP Addresses (IPv4 / IPv6)` | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/engine.ts#L182-L196) | Add an IPv6 regex pass alongside `ipv4Regex` inside `if (options.scrubIpAddresses)`. |
| Medium | Missing UI input for `customRegexPatterns` even though signal and engine logic exist | [pii-scrubber-anonymizer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/pii-scrubber-anonymizer.component.ts#L428) | Add a text input bound to `customRegexPatterns` in the configuration card and display `customMatchesRedacted` in `.c-audit-grid`. |
| Medium | Horizontal overflow at 320px (`scrollWidth: 375px`) and 2-column `.c-entity-grid` not collapsing on small viewports | [pii-scrubber-anonymizer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/pii-scrubber-anonymizer.component.ts#L360-L364) | Add `@media (max-width: 480px)` to collapse `.c-entity-grid` to `1fr`, allow `.c-card__header.l-extremo` to wrap, and set `overflow-wrap: anywhere` on `.c-header__title`. |
| Low | Clearing `customSalt` in `salted_hash_pseudonym` mode throws an uncaught error in `scrubData()` with no UI feedback | [pii-scrubber-anonymizer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/pii-scrubber-anonymizer.component.ts#L525-L544) | Catch errors in `scrubData()` and surface an error signal/banner in the template, or fall back to default salt. |
| Low | Unused `URL.createObjectURL(file)` created on every file selection | [pii-scrubber-anonymizer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/pii-scrubber-anonymizer.component.ts#L487-L488) | Remove the unused `previewUrl` allocation in `handleFileSelected()`. |

---

<a id="tool-50"></a>
## 50 — Bank Statement CSV & OFX to Excel & QIF Converter (`/tools/bank-statement-converter`)

**Verdict:** ⚠️ CSV/OFX parsing, date/merchant normalization, and CSV/XLSX/QIF exports work accurately, but mobile viewports (390px and 320px) suffer from severe horizontal overflow (`scrollWidth: 453px`) and OFX parsing ignores the merchant cleaning and sign-inversion options.

### Functional testing
- **Sample CSV Statement & Normalization**: Clicked **Load Sample Statement** and **Normalize & Convert**. All 4 sample rows parsed accurately (`Total Income: +$2500.00`, `Total Expense: -$86.65`, `Net Cashflow: $2413.35`), dates converted from `MM/DD/YYYY` (`10/14/2026`) to ISO `2026-10-14`, and POS noise (`POS CARD 8812`, `10/16`) was stripped from merchant descriptions (`WHOLEFDS SFO 10424 SAN FRANCISCO CA`, `STARBUCKS STORE #04812 SEATTLE WA`).
- **Excel (.xlsx) Export**: Switched to `Excel Workbook (.xlsx)` and clicked **Download XLSX Deliverable**. Downloaded `statement-normalized.xlsx` (18,290 bytes); parsed via SheetJS (`XLSX.readFile`) and verified two sheets (`Transactions` with 4 rows and `Summary` with 6 key-value metrics).
- **OFX File Upload & QIF Export**: Uploaded a synthetic `.ofx` file (`sample.ofx`). The export format automatically switched to `Quicken / YNAB (.qif)`. Clicked **Normalize & Convert** and **Download QIF Deliverable**; verified `sample-normalized.qif` (117 bytes) had valid `!Type:Bank` header and `D`/`T`/`P`/`L`/`^` records.
- **OFX Edge Case (Options Ignored)**: When parsing OFX/QFX files (`parseOfxContent()` in `engine.ts`), `options.cleanMerchantDescriptions`, `options.stripPosCodes`, and `options.invertAmountSigns` are completely ignored (`WHOLEFDS SFO POS CARD 8812` kept its `POS CARD 8812` suffix in OFX mode).
- **Copy Formatted in XLSX Mode**: When `Excel Workbook (.xlsx)` is selected, `result.formattedText` is `undefined`, yet the **Copy Formatted** button still renders in the preview card header and silently does nothing when clicked.
- **Date Range Sorting Bug in Non-ISO Formats**: In `calculateSummary()`, `startDate` and `endDate` are computed via lexicographical `.sort()` on already-formatted date strings (`transactions.map(t => t.date).sort()`), which yields wrong start/end dates when `DD/MM/YYYY` or `MM/DD/YYYY` spans multiple months or years.

### Mobile adaptation (390px / 320px)
- **390px & 320px Horizontal Overflow**: Both `390px` (`scrollWidth: 453px`) and `320px` (`scrollWidth: 453px`) have significant horizontal scrolling. As visible in `mobile.png` and `small.png`, the header title (`Bank Statement CSV & OFX to Excel & QIF Converter`) extends past the right edge of the viewport because `.l-columns__area` / `.l-page__header` lacks `min-width: 0` / wrapping constraints, and `.c-summary-row` uses a fixed 4-column grid (`grid-template-columns: repeat(4, 1fr)`) with zero `@media` queries.
- **Touch targets & iOS zoom**: The 3 checkboxes in `.c-checkbox-group` are 13×13px (`smallTouchTargets: 3`), and `.c-statement-textarea` has `font-size: 0.8rem` (12.8px < 16px, triggering iOS Safari auto-zoom).

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: 100% client-side execution using `papaparse` and `xlsx`; zero external requests.
- **Directive 3 (Thread Safety)**: Runs asynchronously on the main thread as permitted by `spec.md` Section 3 for lightweight tabular parsing.
- **Directive 4 (Memory Hygiene)**: `cleanUpUrls()` revokes object URLs on destroy and reset, and `downloadDeliverable()` revokes its download URL after 100ms. However, `handleFileSelected()` allocates an unused `URL.createObjectURL(file)` on line 482.
- **Responsive SCSS**: Component styles contain zero `@media` queries; `.c-summary-row` (`repeat(4, 1fr)`) does not adapt to mobile screens.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Horizontal overflow on both 390px and 320px mobile viewports (`scrollWidth: 453px`), plus fixed 4-column `.c-summary-row` grid | [bank-statement-converter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/bank-statement-converter.component.ts#L355-L359) | Add `@media (max-width: 640px)` to switch `.c-summary-row` to `repeat(2, 1fr)`, add `min-width: 0` to `.l-columns__area`, and allow header wrapping. |
| Medium | `parseOfxContent()` ignores `cleanMerchantDescriptions`, `stripPosCodes`, and `invertAmountSigns` options | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/engine.ts#L114-L148) | Pass `options: BankStatementConverterOptions` into `parseOfxContent()` and apply `cleanMerchantName()` and `invertAmountSigns` just like `parseCsvContent()`. |
| Low | **Copy Formatted** button is shown in `xlsx` mode where `formattedText` is `undefined`, resulting in a no-op click | [bank-statement-converter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/bank-statement-converter.component.ts#L226-L234) | Condition the button on `@if (lastResult()?.formattedText)` or fall back to copying CSV text when `exportFormat() === 'xlsx'`. |
| Low | `calculateSummary()` sorts formatted `DD/MM/YYYY` / `MM/DD/YYYY` strings lexicographically to find `startDate`/`endDate` | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/engine.ts#L338-L340) | Normalize dates to ISO `YYYY-MM-DD` before sorting for `startDate`/`endDate`. |
| Low | Unused `URL.createObjectURL(file)` created on every file selection | [bank-statement-converter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/bank-statement-converter.component.ts#L482-L483) | Remove the unused `previewUrl` creation in `handleFileSelected()`. |

---

<a id="tool-51"></a>
## 51 — Audio Trimmer, Volume Booster & Ringtone Maker (`/tools/audio-trimmer-booster`)

**Verdict:** ❌ The **Trim & Export Audio** button stays permanently disabled (`disabled="true"`) after loading a sample track or uploading an audio file because `hasAudioData` is a `computed()` signal that reads a non-reactive plain class property (`this.cachedAudioBuffer`).

### Functional testing
- **Critical UI Blocker (`hasAudioData` never becomes `true`)**:
  - Clicked **Load Sample Audio Track** (`privknife_demo_synth.wav`) and also uploaded a real `.wav` file via `<input type="file">`. The dropzone label updated to `privknife_demo_synth.wav`, the waveform bars rendered, and `#endTimeInput` updated to `2` seconds, **but the primary action button `Trim & Export Audio` remained permanently disabled (`disabled: true`)**.
  - **Root cause**: In [`audio-trimmer-booster.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L460-L464), `private cachedAudioBuffer: AudioBufferLike | null = null;` is a plain TypeScript field (not a `signal()`), and `hasAudioData = computed(() => this.cachedAudioBuffer !== null);` is a computed signal with zero reactive dependencies. Angular evaluates `hasAudioData()` once at initialization (`false`), caches `false` forever, and never re-evaluates it when `this.cachedAudioBuffer = buffer` is assigned in `loadSyntheticSample()`.
- **Engine Verification (Invoked Directly via Component Instance)**:
  - When invoking `processAudio()` directly on the component instance (`ng.getComponent(...)`) with `startTime: 0.25s`, `endTime: 1.25s` (1.0s trimmed duration), and `volumeGainMultiplier: 2.5` (250%):
    - **WAV export**: Produced `privknife_demo_synth_trimmed.wav` (176,444 bytes = 44-byte RIFF/WAVE header `52494646...57415645` + 44,100 samples × 2 ch × 2 bytes), `peakAmplitudeBefore: 0.5`, `peakAmplitudeAfter: 1.0`, `clippedPrevented: true`.
    - **MP3 export**: Produced `privknife_demo_synth_trimmed.mp3` (25,077 bytes, valid MPEG-1 Layer 3 frame sync `fffbb004...` via `@breezystack/lamejs`).
    - **M4R export**: Produced `privknife_demo_synth_trimmed.m4r` (25,077 bytes). Note: `engine.ts` encodes `.m4r` using `encodeMp3()` (raw MP3 frames `fffbb004`) with a `.m4r` extension instead of an AAC/MP4 container (`ftypM4A`), which iOS/Finder ringtone sync rejects.
- **Invalid File Edge Case**: Uploading a non-audio file (`invalid.mp3` containing plain text) was caught cleanly by `decodeAudioData` and displayed `.c-alert--danger`: `Failed to decode audio file. Please ensure it is a valid audio format.`
- **Reset Bug**: Clicking **Reset** after loading a track leaves `this.cachedAudioBuffer` and `originalFileName` intact (`if (this.cachedAudioBuffer)` branch in `resetToDefaults()`), so the user cannot clear a loaded track back to the initial empty state.

### Mobile adaptation (390px / 320px)
- **390px & 320px Horizontal Overflow**: Both `390px` (`scrollWidth: 430px`) and `320px` (`scrollWidth: 430px`) overflow horizontally. As shown in `mobile.png` and `small.png`, the unbreakable page header (`Audio Trimmer, Volume Booster & Ringtone Maker`) extends past the right edge of the viewport, and `audio-trimmer-booster.component.ts` defines zero `@media` queries.
- **Touch targets**: 9 controls fall below the 32px minimum height on mobile (`#startTimeInput`, `#endTimeInput`, `#fadeInInput`, `#fadeOutInput` at 28px tall; 3 range sliders at 16px tall; 1 checkbox at 13×13px; `<select>` at 21px tall — part of the global `_c-input.scss` sizing).

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: 100% client-side using Web Audio API and `@breezystack/lamejs`; zero network requests.
- **Directive 3 (Web Worker)**: `spec.md` Section 1 & 8 require a Web Worker for audio processing and MP3 encoding (`@breezystack/lamejs`), but no `worker.ts` exists — all PCM slicing, soft-limiting, and MP3 encoding run on the main UI thread.
- **Directive 4 (Memory Hygiene)**: `ngOnDestroy()` properly calls `revokeDownloadUrl()` and closes `this.audioContext`.
- **Dropzone UX**: `.c-dropzone` only binds `(change)` on the hidden `<input type="file">`; it lacks `(dragover)` and `(drop)` handlers, so dragging and dropping an audio file onto the dropzone opens the file in the browser tab instead of loading it into the tool.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | **Trim & Export Audio** button is permanently disabled because `hasAudioData` is a `computed()` reading a non-signal field `this.cachedAudioBuffer` | [audio-trimmer-booster.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L460-L464) | Convert `cachedAudioBuffer` to `private cachedAudioBuffer = signal<AudioBufferLike | null>(null);` and read `this.cachedAudioBuffer() !== null` inside `hasAudioData`. |
| High | Horizontal overflow on 390px and 320px mobile viewports (`scrollWidth: 430px`) | [audio-trimmer-booster.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L26-L38) | Add `min-width: 0` on `.l-columns__area` and responsive wrapping on `.c-header__title` / `.l-page__header`. |
| Medium | `.m4r` iPhone ringtone export outputs an MP3 bitstream (`encodeMp3`) with `.m4r` extension instead of AAC-in-MP4/M4A | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/engine.ts#L365-L374) | Encode AAC/MP4 (e.g., via `MediaRecorder` / WebCodecs or `ffmpeg.wasm`) for `.m4r` ringtone deliverables. |
| Medium | Missing drag-and-drop `(dragover)` / `(drop)` event handlers on `.c-dropzone` despite prompt text reading `Drop audio file here` | [audio-trimmer-booster.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L47-L62) | Add `(dragover)="$event.preventDefault()"` and `(drop)="onFileDropped($event)"` handlers on `.c-dropzone`. |
| Medium | MP3 encoding and PCM processing run on the main thread instead of a Web Worker (Directive 3) | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/engine.ts#L219-L272) | Offload `processAudioTrimmer()` to a dedicated Web Worker (`worker.ts`). |

---

<a id="tool-52"></a>
## 52 — Client-Side Video Compressor & Social Resizer (`/tools/video-compressor-resizer`)

**Verdict:** ❌ Bitrate budget math and social aspect-ratio crop planning work in the UI, but `processVideoCompressor()` in `engine.ts` is a stub that simply copies the input `videoBlob` bytes unchanged without compressing, resizing, cropping, muting, or transcoding the video.

### Functional testing
- **Bitrate Budget & Crop Planner UI**:
  - Clicked **Load Sample Video Clip** (`privknife_gaming_highlight.mp4`), switched Target Size to `Discord Nitro / WhatsApp (25 MB)`, Aspect Ratio to `9:16 Vertical (TikTok, Reels, Shorts)`, Max Resolution to `1080p`, checked `Mute Audio Track`, and selected `WebM` output format.
  - The reactive **Bitrate Budget & Preview** panel updated to `Target Size: 25 MB`, `Target Video Bitrate: 6641 kbps`, `Output Dimensions: 608 x 1080`, `Audio Track: Muted (0 kbps)`, and rendered the 9:16 blue aspect silhouette.
- **No-Op Video Compression Stub (Critical Defect)**:
  - Uploaded a 10,000-byte `.mp4` test file (`test_input.mp4`, MP4 header `00000018667479706d703432`) and clicked **Compress & Resize Video** with `9:16_vertical` and `webm` output selected, then clicked **Download**.
  - Downloaded `test_input_608x1080.webm` (10,000 bytes). Byte-for-byte comparison (`b.equals(inputBuf)`) confirmed the downloaded `.webm` file is **100% identical to the input `.mp4` file** (`identicalToInput: true`, still starting with MP4 `ftypmp42` header `00000018667479706d703432` and reporting `Space Savings: 0% Reduced`).
  - Inspection of [`engine.ts` lines 274–278](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/video-compressor-resizer/engine.ts#L274-L278) confirms why:
    ```ts
    if (options.videoBlob && options.videoBlob.size > 0) {
      const buffer = await options.videoBlob.arrayBuffer();
      outBlob = new Blob([buffer], { type: mimeType });
    }
    ```
    No WebCodecs, `MediaRecorder` + `<canvas>`, or `ffmpeg.wasm` pipeline is implemented. Furthermore, `SYNTHETIC_VIDEO_BLOB` in `test-fixtures.ts` is a 4,096-byte zero-filled buffer with a 12-byte `ftypisom` header that cannot play in `<video controls>`.

### Mobile adaptation (390px / 320px)
- **390px & 320px Horizontal Overflow**: Both `390px` (`scrollWidth: 405px`) and `320px` (`scrollWidth: 404px`) exhibit horizontal scrolling. As shown in `mobile.png` and `small.png`, the unbreakable page header (`Client-Side Video Compressor & Social Resizer`) overflows the viewport width, and at `320px` the `<select>` option text overlaps the dropdown arrow (`Original Aspect Ratio (Preserve S...`).
- **Touch targets**: 5 controls are flagged under 32px height on mobile (4 `<select>` elements at 21px height from global `_c-input.scss` and 1 checkbox at 13×13px).

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: Zero network requests or telemetry.
- **Directive 3 (Web Worker)**: `spec.md` requires WebCodecs / `MediaRecorder` or `ffmpeg.wasm` inside a Web Worker, but neither a real transcoding engine nor `worker.ts` exists.
- **Directive 4 (Memory Hygiene)**: `revokeUrls()` cleans up `downloadUrl` and `videoPreviewUrl` in `ngOnDestroy()`, `resetToDefaults()`, and `loadSampleVideo()`, and `tempUrl` is revoked in `video.onloadedmetadata`/`onerror`.
- **Dropzone UX**: `.c-dropzone` lacks `(dragover)` and `(drop)` handlers on the container element, so dragging a video file onto the dropzone does not load it.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | `processVideoCompressor()` does not compress, resize, crop, mute, or transcode video—it copies the input `videoBlob` buffer unchanged into a new `Blob` | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/video-compressor-resizer/engine.ts#L274-L291) | Implement real client-side video transcoding/resizing/cropping via `ffmpeg.wasm` in a Web Worker or HTML5 `<video>` + `<canvas>` + `MediaRecorder` / WebCodecs at `plan.videoBitrateBps`. |
| High | Sample video fixture (`SYNTHETIC_VIDEO_BLOB`) is 4,096 zero bytes with a 12-byte header, which fails playback in `<video controls>` | [test-fixtures.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/video-compressor-resizer/test-fixtures.ts#L6-L24) | Generate a valid playable short video stream (e.g., via canvas `captureStream()` + `MediaRecorder` or a valid minimal MP4/WebM fixture). |
| Medium | Horizontal overflow at 390px (`scrollWidth: 405px`) and 320px (`scrollWidth: 404px`) | [video-compressor-resizer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/video-compressor-resizer/video-compressor-resizer.component.ts#L30-L42) | Add `min-width: 0` on `.l-columns__area`, wrap `.c-header__title`, and stack `.c-preview__plan-grid` to 1 column under 360px. |
| Low | Missing `(dragover)` and `(drop)` event handlers on `.c-dropzone` | [video-compressor-resizer.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/video-compressor-resizer/video-compressor-resizer.component.ts#L51-L68) | Bind `(dragover)="$event.preventDefault()"` and `(drop)` on `.c-dropzone`. |

---

<a id="tool-53"></a>
## 53 — FDA & EU Nutrition Facts & Supplement Label Maker (`/tools/nutrition-label-maker`)

**Verdict:** ⚠️ Live vector SVG preview and SVG export work across all 4 regulatory formats (FDA 2016, EU 1169/2011, Supplement Facts, FDA Dual Column), but the spec-required 300 DPI `.png` export is unimplemented, PDF export hardcodes the FDA 2016 layout regardless of the chosen regulatory standard, and mobile viewports (390px/320px) overflow horizontally (`scrollWidth: 450px`).

### Functional testing
- **Live SVG Preview Across All 4 Regulatory Formats**:
  - `fda_standard_2016`: Rendered valid `320×486` SVG with FDA 2016 typography, thick/medium black rules, % Daily Value math (`Total Fat 8g 10%`, `Saturated Fat 1g 5%`, `Sodium 160mg 7%`, `Total Carbohydrate 37g 13%`, `Dietary Fiber 4g 14%`, `Includes 10g Added Sugars 20%`, `Vitamin D 2mcg 10%`, `Calcium 260mg 20%`, `Iron 8mg 44%`, `Potassium 240mg 5%`).
  - `eu_standard_1169`: Rendered `320×274` `Nutrition Declaration` SVG with automatic kJ conversion (`962 kJ / 230 kcal`) and sodium-to-salt conversion (`Salt 0.40 g` from `160mg` sodium).
  - `fda_supplement_facts`: Rendered `320×231` `Supplement Facts` SVG with micronutrient rows.
  - `fda_dual_column`: Rendered `320×238` dual-column SVG (`Per serving` vs `Per container` multiplied by 8 servings: `Calories 230 / 1840`, `Total Fat 8g / 64g`).
- **SVG & PDF Deliverable Exports**:
  - Exported `organic_granola_crunch_fda_standard_2016.svg` (6,356 bytes, valid XML/SVG document).
  - Selected `EU Regulation 1169/2011` and exported `organic_granola_crunch_eu_standard_1169.pdf` (6,004 bytes, valid `%PDF-1.3` document via `jsPDF`). **Defect**: `generateNutritionLabelPdf()` in `engine.ts` ignores `options.regulatoryStandard` and always renders the US `Nutrition Facts` layout (`containsNutritionFacts: true`, `containsNutritionDeclaration: false`) while also omitting the `Added Sugars` row.
  - **Missing PNG Export**: `spec.md` Section 1 & 2 and `LabelExportFormat = 'svg' | 'png' | 'pdf'` in `types.ts` specify a 300 DPI `.png` export, but `<select id="exportFormatSelect">` only offers `svg` and `pdf`, and `processNutritionLabel()` in `engine.ts` has no `'png'` branch.
- **Validation & Reset**: Clearing `#servingSizeInput` and clicking **Export Deliverable** displayed `.c-alert--danger` (`Serving size is required`). Clicking **Reset to Defaults** restored `2/3 cup (55g)` and cleared the error banner.

### Mobile adaptation (390px / 320px)
- **390px & 320px Horizontal Overflow**: Both `390px` (`scrollWidth: 450px`) and `320px` (`scrollWidth: 450px`) overflow horizontally. As shown in `mobile.png` and `small.png`, the unbreakable page header (`FDA & EU Nutrition Facts & Supplement Label Maker`) overflows past the right edge of the viewport, and at `320px` the `<select id="exportFormatSelect">` text (`SVG (Scalable Vector Graphic - R...`) collides with the select caret.
- **Touch targets & tiny text**: 20 form controls are under 32px height (18 text/number inputs at 28px and 2 `<select>` elements at 21px from global `_c-input.scss`). The SVG footnote `<tspan>` uses `8.5px` font size, which is standard for FDA label print reproduction inside a 320px SVG viewBox.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: 100% client-side using SVG string templates and `jsPDF`; zero network requests.
- **Security / Sanitization**: User strings (`productName`, `servingSizeText`, `servingsPerContainer`) are escaped via `escapeXml()` in `engine.ts` before `bypassSecurityTrustHtml()` in `nutrition-label-maker.component.ts`, preventing XSS via label fields.
- **Directive 4 (Memory Hygiene)**: `revokeDownloadUrl()` cleans up blob URLs on re-generation, reset, and `ngOnDestroy()`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Horizontal overflow on 390px and 320px mobile viewports (`scrollWidth: 450px`) | [nutrition-label-maker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/nutrition-label-maker/nutrition-label-maker.component.ts#L28-L39) | Add `min-width: 0` on `.l-columns__area`, allow `.c-header__title` to wrap, and ensure `.c-preview__svg-container svg` has `max-width: 100%; height: auto`. |
| Medium | `generateNutritionLabelPdf()` ignores `options.regulatoryStandard` (always draws US FDA layout even when EU 1169, Supplement Facts, or Dual Column is selected) and omits `Added Sugars` | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/nutrition-label-maker/engine.ts#L541-L643) | Branch `generateNutritionLabelPdf()` by `options.regulatoryStandard` (or render the generated SVG onto a high-DPI canvas and embed into `jsPDF`) and include `Added Sugars` in FDA 2016 PDF output. |
| Medium | Missing 300 DPI `.png` export specified in `spec.md` and `LabelExportFormat` (`'svg' \| 'png' \| 'pdf'`) | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/nutrition-label-maker/engine.ts#L675-L690) | Add `<option value="png">PNG (300 DPI Print-Ready Raster)</option>` in the template and rasterize `svgString` onto an offscreen `<canvas>` scaled to 300 DPI in `processNutritionLabel()`. |

---

<a id="tool-54"></a>
## 54 — SVG Optimizer, Path Cleaner & React/Vue Exporter (`/tools/svg-optimizer-cleaner`)

**Verdict:** ⚠️ SVG minification, coordinate rounding, visual before/after preview, and all 5 code exports (`.svg`, `.tsx`, `.vue`, `.svelte`, Data URI) work well, but user-supplied SVG is injected via `bypassSecurityTrustHtml()` without DOMPurify sanitization (AGENTS.md Section 9 violation), `cleanEditorAttributes()` only strips a tiny hardcoded regex of IDs, and mobile viewports (390px/320px) overflow horizontally (`scrollWidth: 432px`).

### Functional testing
- **Sample SVG Optimization & Savings**: Clicked **Load Sample SVG**. The bloated Illustrator/Sketch SVG (`1.2 KB`) was minified to `373.0 B` (`Savings -68.5%`): stripped XML declaration, comments, `<metadata>`, `<title>`, `<desc>`, empty `<defs>`, `xmlns:sketch`/`xmlns:inkscape`/`enable-background`/`xml:space`, removed `width`/`height` in favor of `viewBox="0 0 200 200"`, converted `rgb(255, 255, 255)` / `#ffffff` → `#fff` and `#000000` → `#000`, and rounded 6-decimal path/circle coordinates to 2 decimals (`10.12,20.65`).
- **All 5 Export Formats & Downloads**:
  - **SVG File**: Downloaded `customsvgicon.svg` (373 bytes).
  - **React TSX**: Downloaded `customsvgicon.tsx` (530 bytes; valid `React.FC<React.SVGProps<SVGSVGElement>>` with `strokeWidth`, `xmlnsXlink`, and `{...props}`).
  - **Vue 3 SFC**: Downloaded `customsvgicon.vue` (463 bytes; `<template>` + `<script setup lang="ts">`).
  - **Svelte**: Downloaded `customsvgicon.svelte` (390 bytes; `<svg ... {...$$restProps}>`).
  - **Data URI**: Downloaded `customsvgicon.txt` (627 bytes; `data:image/svg+xml;utf8,...`).
- **File Upload & Component Naming**: Uploaded `BadgeShield.svg` (`<svg width="64" height="64"><g><rect ... fill="#ff0000"/></g></svg>`). `componentName` automatically updated to `BadgeShield`, the attribute-free `<g>` wrapper was collapsed, `width="64" height="64"` was converted into `viewBox="0 0 64 64"`, and `fill="#ff0000"` shortened to `fill="#f00"`.
- **Unused ID Cleanup Limitation**: In the sample fixture `SAMPLE_BLOATED_SVG`, `<g id="OuterGroup"><g id="InnerUselessGroup">` were **not** collapsed because `cleanEditorAttributes()` only strips `id` attributes matching `/^(Layer_\d+|Page-\d+|Artboard-\d+|path-\d+|g\d+|svg\d+)$/i`, leaving `id="OuterGroup"` and `id="InnerUselessGroup"` intact and preventing `collapseGroups()` from hoisting their children.
- **Invalid Input & Reset**: Pasting `<div>not an svg</div>` displayed `.c-alert--danger` (`Error: Missing root <svg> element.`). Clicking **Reset to Defaults** cleared the input and restored the empty state.

### Mobile adaptation (390px / 320px)
- **390px & 320px Horizontal Overflow**: Both `390px` (`scrollWidth: 432px`) and `320px` (`scrollWidth: 432px`) have horizontal scrolling. As shown in `mobile.png` and `small.png`, the unbreakable page header (`SVG Optimizer, Path Cleaner & React/Vue Exporter`) overflows the viewport width, and at `320px` the second card header (`Optimization Output` + `Visual Preview` / `Code Inspector` buttons) is cramped without wrapping.
- **Touch targets**: 7 controls are under 32px height on mobile (1 range slider at 16px, 5 checkboxes at 13×13px, and `#compName` text input at 28px).

### Code review
- **Security Violation (Unsanitized SVG Injection — AGENTS.md Section 9)**:
  - `AGENTS.md` Section 9 explicitly mandates: *"When rendering user-supplied SVG or HTML, ALWAYS sanitize with DOMPurify before injecting into the DOM via Angular's `DomSanitizer`."*
  - In [`svg-optimizer-cleaner.component.ts` lines 527–534](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/svg-optimizer-cleaner.component.ts#L527-L534), `safeOriginalSvg` and `safeOptimizedSvg` pass raw user-supplied `this.inputSvg()` and `res?.optimizedSvg` directly to `this.sanitizer.bypassSecurityTrustHtml(...)` without `DOMPurify.sanitize(..., { USE_PROFILES: { svg: true, svgFilters: true } })`. If a user pastes an SVG containing `<script>` or `onload="..."`, it executes in the page context.
- **BEM Naming Deviations**: Component template and styles use unprefixed non-BEM class names (`.options-grid`, `.format-buttons`, `.tab-buttons`, `.stats-banner`, `.stat-item`, `.preview-split`, `.preview-box`, `.code-container`, `.empty-state`) instead of `.c-*` / `.l-*` / `.g--*` required by `AGENTS.md` Section 5.1.
- **Directive 4 (Memory Hygiene)**: `activeObjectUrls` are properly revoked on download, reset, and `ngOnDestroy()`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Raw user-supplied SVG (`inputSvg` and `optimizedSvg`) is injected into `[innerHTML]` via `bypassSecurityTrustHtml()` without DOMPurify sanitization (XSS risk & AGENTS.md Section 9 violation) | [svg-optimizer-cleaner.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/svg-optimizer-cleaner.component.ts#L527-L534) | Sanitize both SVG strings with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` before calling `bypassSecurityTrustHtml()`. |
| High | Horizontal overflow on 390px and 320px mobile viewports (`scrollWidth: 432px`) | [svg-optimizer-cleaner.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/svg-optimizer-cleaner.component.ts#L20-L31) | Add `min-width: 0` on `.l-columns__area`, allow `.c-header__title` to wrap, and allow `.c-card__header.l-extremo` to wrap on narrow screens. |
| Medium | `cleanEditorAttributes()` only strips `id` values matching a narrow regex, leaving `OuterGroup` and `InnerUselessGroup` in `SAMPLE_BLOATED_SVG` uncleaned and uncollapsed | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/engine.ts#L172-L183) | When `cleanupIds` is true, strip any element `id` that is not referenced via `url(#id)`, `href="#id"`, or `xlink:href="#id"` in the SVG document. |
| Low | Custom CSS classes in `svg-optimizer-cleaner.component.ts` omit the mandatory `.c-` / `.l-` / `.g--` BEM prefixes | [svg-optimizer-cleaner.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/svg-optimizer-cleaner.component.ts#L353-L477) | Rename classes to `.c-svg-optimizer__*` following `AGENTS.md` Section 5.1. |

---

<a id="tool-55"></a>
## 55 — Side-by-Side Code & Contract Diff Checker (`/tools/diff-checker`)

**Verdict:** ⚠️ Core comparison, granularity toggles, file uploads, and `.patch`/`.html` exports work client-side, but a line-pairing bug in `engine.ts` reorders unmatched removed lines when modified lines follow them, heavy $O(M \times N)$ LCS diffing runs synchronously on the main thread without a Web Worker, and dark mode / 320px overflow need fixes.

### Functional testing
- **Sample presets**: Clicking **Code Refactor** loads 7 original and 5 modified lines (`+4` additions, `-6` deletions, `~4` modifications, `1` unchanged) and renders 7 rows in Side-by-Side mode or 11 rows in Unified Inline mode. Clicking **Legal Contract** loads 4 original and 5 modified lines (`+4`, `-3`, `~3`, `1` unchanged).
- **Granularity & normalization toggles**: Switching granularity on the contract preset updates inline `<mark class="diff-token">` highlights from `28` (Word) to `84` (Char) and `6` (Line). Testing `Hello   World` vs `hello world` transitions from `+1 / -1 / ~1` to `1 unchanged` when **Ignore Whitespace** and **Ignore Case** are checked.
- **File uploads**: Uploading `orig.txt` (4 lines) and `mod.txt` (5 lines) via both hidden `input[type=file]` controls accurately updates the textareas and stats (`+2`, `-1`, `~1`, `3` unchanged).
- **Exports & clipboard**:
  - **Download .patch** downloads a valid unified diff (`diff_report.patch`, 699 bytes, starting with `--- original` / `+++ modified` / `@@ -1,4 +1,5 @@`).
  - **Export HTML Report** downloads a self-contained styled HTML document (`diff_report.html`, 4,488 bytes).
  - **Copy .patch** copies the unified diff to the clipboard and shows `✓ Copied Patch!`.
  - **Reset / Clear** resets all inputs and restores the empty state prompt.
- **Line-ordering defect found**: In `computeDiff()` (`engine.ts`), contiguous removed/added blocks emit all paired `modified` lines before any unpaired `removed` lines. In the **Code Refactor** sample, original line 6 (`return total;`) pairs with modified line 4 (`return subtotal * (1 + taxRate);`) and is emitted as row 4 *above* original lines 4–5 (`total = total + items[i].price;` and `}`), misnumbering and reordering lines in both the UI table and exported `.patch`.

### Mobile adaptation (390px / 320px)
- **390px (Mobile)**: No horizontal page scroll (`scrollWidth: 390`). The Original and Modified input cards stack vertically (`l-columns--2`), and the 6 stat pills wrap cleanly into a 2×3 grid. However, in **Side-by-Side** mode, squeezing two code columns plus two 40px line-number gutters into ~350px with `word-break: break-all` breaks words every 12–15 characters (`func-tion calc-ulateTotal(it-ems)`).
- **320px (Small)**: Horizontal page overflow occurs (`scrollWidth: 369` vs `320px` viewport) because `.c-header__title` overflows the right edge. The footer action bar (`Reset / Clear`, `Download .patch`, `Export HTML Report`) is also cramped.
- **Touch targets & iOS zoom**: The two native checkbox inputs (`Ignore Whitespace`, `Ignore Case`) are `13×13px` (`smallTouchTargets: 2`), and both `.diff-input-textarea` elements use `font-size: 0.8125rem` (`13px` < `16px`), which triggers iOS Safari auto-zoom on focus.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: Passed. Zero external network requests; HTML report generation properly escapes HTML entities via `escapeHtml()`.
- **Directive 3 (Protect Main UI Thread)**: Violated. No `worker.ts` exists despite the spec requiring Web Worker execution. `computeDiff()` builds a full $O(M \times N)$ 2D DP array (`Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))`) synchronously inside an Angular `computed()` signal on every textarea keystroke.
- **Directive 4 (Memory Hygiene)**: `URL.revokeObjectURL()` is called after downloads and in `ngOnDestroy()`. Minor waste: `computeDiff()` instantiates an unused `new Blob([patch])` on every signal evaluation.
- **Spec conformance**: `syntaxLanguage` (`'javascript' | 'python' | ...`) and `syncScroll` are defined in `DiffCheckerOptions` and component signals but are never wired to UI controls or used during rendering (no syntax highlighting is performed).
- **BEM & styling**: Component styles use unprefixed classes (`.toolbar-grid`, `.stat-pill`, `.diff-table`, `.diff-row`, `.diff-code`) instead of `c-` / `l-` / `g--` namespaces, and hardcode light-mode hex backgrounds (`#f0fdf4`, `#fef2f2`, `#fffbeb`, `#f8fafc`) that break contrast in dark mode. UI copy is hardcoded in English without i18n bindings.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Paired `modified` lines are emitted before unpaired `removed` lines within a change hunk, reordering original lines and corrupting line numbers and `.patch` output | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/engine.ts#L233-L291) | Walk `removedBlock` and `addedBlock` monotonically (only pairing at non-crossing indices `r` and `a`, flushing any preceding unmatched removals/additions in order before emitting a paired modification). |
| Medium | Synchronous $O(M \times N)$ LCS matrix runs on the main thread on every keystroke without a Web Worker or input debounce | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/engine.ts#L12-L31), [diff-checker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L607-L621) | Offload `computeDiff` to a Web Worker (`worker.ts`) or use Myers $O(ND)$ diff with debounced input updates per Directive 3. |
| Medium | Hardcoded light-mode hex backgrounds (`#f0fdf4`, `#fef2f2`, `#fffbeb`, `#f8fafc`) make diff rows illegible in dark mode | [diff-checker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L530-L585) | Use theme-aware CSS variables or `color-mix()` / dark-mode overrides for diff row and token backgrounds/text colors. |
| Low | Horizontal overflow at 320px (`scrollWidth: 369`), cramped side-by-side table on mobile (`word-break: break-all`), 13×13px checkboxes, and 13px textarea font-size | [diff-checker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L457-L475), [diff-checker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L549-L558) | Set textarea `font-size: 1rem` (16px) on mobile, wrap footer buttons on `<400px`, enlarge checkbox touch targets, and default/scroll horizontally on narrow screens. |
| Low | `syntaxLanguage` and `syncScroll` options/signals are dead code; non-BEM class names and hardcoded English strings | [diff-checker.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L602-L603) | Either wire syntax highlighting / synced split panes or remove unused options; migrate local classes to `.c-diff-checker__*` BEM namespace. |

---

<a id="tool-56"></a>
## 56 — Web Font Subsetter & TTF/OTF to WOFF2 Converter (`/tools/font-subsetter-converter`)

**Verdict:** ⚠️ UI workflow, SFNT layout-table stripping (`GSUB`/`GPOS`/`GDEF`/`kern`), and `@font-face` CSS export work, but glyph subsetting does not actually modify font glyph tables, `packageWoff2()` writes uncompressed WOFF1-style table entries instead of valid Brotli-compressed WOFF2, and `.c-header__title` overflows horizontally on 390px/320px mobile screens.

### Functional testing
- **Sample font & real TTF upload**: Clicking **Load Sample Font** loads a 572 B synthetic SFNT buffer (`sample_font.ttf` → `468.0 B`, `-18.2%` when `GSUB` and `kern` tables are dropped). Uploading `/usr/share/fonts/noto/NotoSans-Regular.ttf` (`607.0 KB`) strips layout tables to `509.7 KB` (`-16%`). Uploading an invalid file (`invalid.ttf`) cleanly renders `.c-alert--danger` with `Error: Unrecognized font magic signature: 0x6e6f7420`.
- **Glyph subsetting presets (No-op on binary output)**: Switching between **Basic Latin (ASCII)** (`95` glyphs), **Latin Supplement** (`191` glyphs), **Numbers & Punctuation** (`43` glyphs), and **Custom Characters** (`"ABC"`, `3` glyphs) updates the `unicode-range` in the `@font-face` CSS snippet and the displayed `Glyphs` counter, but the output font binary remains `468.0 B` across every preset because `rebuildSfntTrueType()` copies `cmap`/`glyf`/`loca` tables unchanged without filtering glyphs.
- **Format exports & WOFF2 container defect**:
  - **TrueType (`.ttf`)**: Downloads `samplefont.ttf` (`572 B` with all tables kept, magic `00010000`).
  - **WOFF 1.0 (`.woff`)**: Downloads `samplefont.woff` (`632 B`, magic `774f4646` `wOFF`, uncompressed tables).
  - **WOFF2 (`.woff2`)**: Downloads `samplefont.woff2` (`636 B`, magic `774f4632` `wOF2`). Because `packageWoff2()` writes uncompressed 20-byte table directory headers instead of WOFF2 `UIntBase128` headers + Brotli stream compression, the `.woff2` file is larger than the input `.ttf` when tables are retained (`636 B` vs `572 B`, `Savings: -0%`) and is not a spec-compliant WOFF2 stream.
  - **CSS export**: **Download .css** downloads `samplefont.css` (`185 B`) with valid `@font-face` rules; **Copy CSS** copies to clipboard; **Reset to Defaults** restores the empty state.
- **Live Specimen preview**: `.specimen-textarea` uses `font-family: inherit` (resolving to system sans-serif) and never loads the uploaded/subsetted font via `FontFace` / `document.fonts`.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow**: Both `390px` (`scrollWidth: 446`) and `320px` (`scrollWidth: 447`) exhibit horizontal page scrolling (`hasHorizontalScroll: true`) because the long `<h1 class="c-header__title">` (`Web Font Subsetter & TTF/OTF to WOFF2 Converter`) extends past the right edge of the viewport.
- **Touch targets**: 3 controls fall below the 32px minimum height (`smallTouchTargetCount: 3`): the 2 native optimization checkboxes (`13×13px`) and `#fontFamilyName` (`input.c-input__field`, `height: 28px`).
- **Card stacking**: Below the header, the configuration and preview cards stack cleanly into a single column with wrapped preset buttons.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: Passed. Zero external network requests.
- **Directive 3 (Protect Main UI Thread)**: Violated. No `worker.ts` is present; `processFontSubset()` runs synchronously inside `computed()` on the main thread (and re-runs on every character typed in `#fontFamilyName` or `#customCharsInput`).
- **Directive 4 (Memory Hygiene)**: `URL.revokeObjectURL()` is called immediately on download and in `ngOnDestroy()`. However, `processFontSubset()` allocates new `ArrayBuffer`s and `new Blob()` on every reactive signal change.
- **WOFF/WOFF2 input parsing bug**: `validateFontBuffer()` accepts `wOFF` (`0x774F4646`) and `wOF2` (`0x774F4632`) inputs, but `extractSfntTables()` reads SFNT offsets (`numTables = view.getUint16(4)`, directory at byte 12), which misreads the WOFF `flavor` field (`0x00010000`) as `numTables = 1`.
- **BEM & styling**: Uses unprefixed local classes (`.preset-buttons`, `.options-grid`, `.stats-banner`, `.stat-item`, `.specimen-box`, `.code-block`) and hardcoded light-mode colors (`.specimen-box { background: #ffffff }`, `.code-header { background: #e2e8f0 }`).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | Glyph subsetting presets do not subset glyphs in the font binary (`rebuildSfntTrueType` only drops `GSUB`/`GPOS`/`GDEF`/`kern` tables and ignores `characterSet`) | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L231-L299), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L444-L453) | Parse `cmap`/`glyf`/`loca`/`hmtx` (e.g., via `opentype.js` or custom SFNT glyph table rebuilder) to strip unreferenced glyph outlines for codepoints outside `characterSet`. |
| High | `packageWoff2()` writes uncompressed 20-byte WOFF1-style table directory entries instead of valid WOFF2 `UIntBase128` directory + Brotli payload | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L359-L410) | Use a WOFF2/Brotli encoder (or deflate tables in WOFF 1.0 via `CompressionStream('deflate')`) so output files are valid and compressed. |
| Medium | Uploading `.woff` or `.woff2` passes `validateFontBuffer()` but corrupts output because `extractSfntTables()` assumes an uncompressed SFNT header at byte 0 | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L35-L46), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L203-L226) | Either parse WOFF directory headers at byte 44 (and decompress tables) or restrict input validation/accept attributes to `.ttf,.otf`. |
| Medium | Live Specimen `<textarea>` never loads the uploaded/subsetted font (`font-family: inherit`) | [font-subsetter-converter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts#L285-L291), [font-subsetter-converter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts#L398-L407) | Register the font buffer via `new FontFace('PreviewFont', buffer)` in `document.fonts` and bind `[style.font-family]` on `.specimen-textarea`. |
| Medium | Horizontal overflow at 390px (`scrollWidth: 446`) and 320px (`scrollWidth: 447`) from `.c-header__title` | [font-subsetter-converter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts#L20-L27) | Add `overflow-wrap: anywhere` / `min-width: 0` on `.c-header__title-group` and `.c-header__title`. |
| Low | Synchronous processing on main thread without a Web Worker (Directive 3); 28px input height and 13×13px checkboxes | [font-subsetter-converter.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts#L471-L485) | Offload binary font processing to `worker.ts` and increase input/checkbox touch target sizing to ≥32px. |

---

<a id="tool-57"></a>
## 57 — Seamless Tileable Texture & Pattern Generator (`/tools/seamless-texture-generator`)

**Verdict:** ⚠️ Image upload, sample preset, Sobel normal map generation, live tiled canvas preview, and PNG/ZIP exports work client-side, but `makeSeamlessTexture()` uses `&&` instead of blending along the full vertical/horizontal seam cross, invalid uploads silently fall back to the sample brick texture, and `.c-header__title` overflows on mobile.

### Functional testing
- **Sample surface & viewport tabs**: Clicking **Load Sample Surface** generates a `64×64` brick texture and renders the `<canvas>` across **Tiled Repeat** (`2x2 Grid` → `128×128`, `3x3 Grid` → `192×192`, `4x4 Grid` → `256×256`), **Diffuse Map** (`64×64`), **Normal Map** (`64×64` Sobel normal map), and **CSS Snippet** (`.tileable-surface` `background-repeat: repeat` rule with working **Copy CSS** button).
- **Blend modes & normal map controls**: Switching between **Linear Crossfade**, **Mirror Repeat** (which hides the `Edge Overlap` slider), and **Poisson Hermite**, plus adjusting **Edge Overlap** (`5%`–`45%`), **Normal Depth Strength** (`0.5`–`8.0`), and **Invert Normal Y** updates the preview canvas.
- **Image upload & exports**:
  - Uploading a `128×128` PNG (`real_128.png`) updates the diffuse/normal maps to `128×128`.
  - **Download Diffuse PNG**: Valid PNG (`diffuse_seamless.png`, 3,856 B, `64×64`, PNG signature `89504e470d0a1a0a`).
  - **Download Normal PNG**: Valid PNG (`normal_map.png`, 11,455 B, `64×64`, PNG signature `89504e470d0a1a0a`).
  - **Download Texture Pack (.zip)**: Valid ZIP archive (`seamless_textures.zip`, 15,776 B, containing `diffuse_seamless.png`, `normal_map.png`, and `texture.css`).
- **Functional defects found**:
  - **Incomplete seam blending (`&&` vs cross seam)**: After wrap-shifting by `(halfW, halfH)`, the original edges lie along the full vertical line `x = halfW` and horizontal line `y = halfH`. However, `makeSeamlessTexture()` checks `if (distX < overlapRadiusX && distY < overlapRadiusY)`, which only blends a small `2·overlapRadiusX × 2·overlapRadiusY` square in the center of the image while leaving the rest of the vertical (`x = halfW`) and horizontal (`y = halfH`) seams unblended.
  - **Silent fallback on invalid file**: Uploading a corrupt file (`invalid.png`) triggers the `catch` block in `handleFileSelected()`, which silently loads the `64×64` synthetic brick texture while displaying `invalid.png` as the filename, instead of surfacing an error in `.c-alert--danger`.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow**: Both `390px` (`scrollWidth: 399`) and `320px` (`scrollWidth: 399`) have a 9px horizontal page overflow (`hasHorizontalScroll: true`) caused by `<h1 class="c-header__title">` (`Seamless Tileable Texture & Pattern Generator`).
- **Cramped viewport card header**: In `.c-card__header.l-extremo` of the **Texture Viewport** card, the title `Texture Viewport` and the 4 tab buttons (`Tiled Repeat`, `Diffuse Map`, `Normal Map`, `CSS Snippet`) sit side-by-side without `flex-wrap: wrap`, cramping the heading against the buttons on `390px` and `320px`.
- **Touch targets**: 4 controls are below minimum touch target height (`smallTouchTargetCount: 4`): 2 range sliders (`16px` tall) and 2 native checkboxes (`13×13px`).

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: Passed. Zero external network requests.
- **Directive 3 (Protect Main UI Thread)**: Violated. No `worker.ts` exists. Every slider drag event (`setEdgeOverlap`, `setNormalStrength`) calls `recomputeTexture()` → `processTexture()`, which computes the diffuse texture, Sobel normal map, two synchronous `canvas.toDataURL('image/png')` encodes, and `JSZip.generateAsync()`, and 10ms later `renderCanvas()` recomputes `makeSeamlessTexture()` and `generateNormalMap()` a second time on the main thread.
- **Directive 4 (Memory Hygiene)**: `URL.revokeObjectURL()` is called after downloads and in `ngOnDestroy()`, but `handleFileSelected()` never calls `bitmap.close()` on the `ImageBitmap` returned by `createImageBitmap(file)`.
- **Engine purity & dead code**: `textureToPngBlob()` in `engine.ts` uses `document.createElement('canvas')` (DOM dependency inside `engine.ts`), `processTexture()` hardcodes placeholder strings `diffuseDataUrl = 'data:image/png;base64,mock'` and `normalMapDataUrl = 'data:image/png;base64,mockNormal'`, and `outputResolutionPx` (`signal<number>(256)`) is never exposed in the UI or used by `engine.ts` (while `handleFileSelected` hard-caps uploads to `512×512`).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | `makeSeamlessTexture()` checks `distX < overlapRadiusX && distY < overlapRadiusY`, blending only a small central patch and leaving vertical (`x = halfW`) and horizontal (`y = halfH`) seams unblended outside the center | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts#L70-L105) | Blend across the full horizontal seam (`distX < overlapRadiusX`) using X-shifted pixels and across the full vertical seam (`distY < overlapRadiusY`) using Y-shifted pixels. |
| Medium | Uploading an invalid image file silently falls back to the 64×64 synthetic brick sample instead of showing an error alert | [seamless-texture-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L491-L518) | Set an error result in `catch` so the `.c-alert--danger` banner renders, and call `bitmap.close()` after drawing valid images. |
| Medium | Duplicate main-thread execution (`processTexture` + `JSZip` + `renderCanvas` recomputing diffuse & normal maps on every slider movement without a Web Worker) | [seamless-texture-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L534-L595) | Offload pixel processing to a Web Worker (`worker.ts`), cache the computed `TextureImageData` for canvas rendering, and build the ZIP archive lazily on download. |
| Low | 9px horizontal overflow at 390px/320px (`scrollWidth: 399`) and cramped `Texture Viewport` header with 4 tab buttons | [seamless-texture-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L31-L38), [seamless-texture-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L244-L284) | Add `flex-wrap: wrap; gap: 0.5rem` to `.c-card__header.l-extremo` and `overflow-wrap: anywhere` on `.c-header__title`. |
| Low | `outputResolutionPx` signal is unused (`handleFileSelected` hard-caps at 512px); `diffuseDataUrl`/`normalMapDataUrl` contain `'data:image/png;base64,mock'` | [seamless-texture-generator.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L438), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts#L257-L270) | Wire `outputResolutionPx` selector (`256`, `512`, `1024`, `2048`) to resize output and remove unused mock data URL fields. |

---

<a id="tool-58"></a>
## 58 — Interactive 2D Floor Plan & Room Furniture Scaler (`/tools/floor-plan-furniture-scaler`)

**Verdict:** ⚠️ Architectural presets, furniture placement/collision detection, and SVG/PDF/JSON exports work, but unescaped SVG interpolation paired with `bypassSecurityTrustHtml` allows DOM XSS on JSON import (violating `AGENTS.md` §9), the SVG viewport clips the bottom of the floor plan, walls cannot be edited in the UI, and `snapToGrid()` / `blueprintScale` are not wired to geometry or PDF scaling.

### Functional testing
- **Presets & layer toggles**: Switching between **Studio (30m²)** (`4` walls, `3` furniture items, `30.0 m²`), **1-Bedroom (50m²)** (`5` walls, `2` rooms `28.1 m²` + `21.9 m²`), and **Studio Office (60m²)** (`4` walls, `60.0 m²`) updates the SVG blueprint immediately. Toggling **Grid**, **Dimensions**, **Area Readouts**, and **Furniture** checkboxes hides/shows the corresponding SVG groups; switching **Measurement Unit** to **Imperial (Feet / Inches)** converts `6.00 m × 5.00 m` (`30.0 m²`) to `19' 8" × 16' 5"` (`322.9 sq ft`).
- **Furniture placement, inspector & collision detection**: Clicking `+ King Bed (180x200)` twice adds two beds at `(300, 250)` and triggers the `⚠️ Clearance & Overlap Warning` banner (`Living Couch overlaps with King Bed`, `King Bed overlaps with King Bed`). Updating `X`, `Y`, `Rotation (°)`, `Width`, and `Depth` in the selected-item inspector or clicking **Delete** updates the plan and warnings reactively.
- **Exports**:
  - **Download Vector SVG**: Downloads valid XML SVG (`studio-apartment-30m-.svg`, 4,590 B).
  - **Download Blueprint PDF (A4)**: Downloads a valid landscape A4 PDF via `jsPDF` (`studio-apartment-30m--blueprint.pdf`, 6,967 B, `%PDF-1.3` header).
  - **Export JSON / Import JSON**: Exports (`2,737 B`) and re-imports `.json` floor plan projects.
- **Security & functional issues found**:
  - **DOM XSS on JSON import (`AGENTS.md` §9 violation)**: `generateFloorPlanSvg()` interpolates `project.name`, `r.name`, `f.name`, and `options.designerName` directly into raw `<text>` elements without XML escaping, and `sanitizedSvg` passes the string to `DomSanitizer.bypassSecurityTrustHtml()` without `DOMPurify`. Importing a JSON file containing `<img src=x onerror="window.__xss=true">` in `name` executed arbitrary JS (`window.__xss === true`) in headless Chrome.
  - **Clipped SVG preview**: `<svg>` sets fixed `width="1000" height="800"` attributes inside a flex container with `max-height: 520px; align-items: center`, leaving ~150px of empty dark space at the top of `.c-preview` while clipping the bottom wall, door swing arc, and title block (`desktop.png`, `mobile.png`).
  - **Non-interactive SVG & missing wall editor**: The SVG is injected via `[innerHTML]` with no click/drag handlers on canvas items (furniture can only be selected via the button list below the canvas and moved via numeric inputs), and there are no UI controls to draw or resize walls/doors/windows.
  - **`snapToGrid()` and `blueprintScale` not applied**: `snapToGrid()` in `engine.ts` is never called when moving furniture (`gridSnapStepCm` only changes visual grid line spacing), and `blueprintScale` (`1:20`, `1:50`, `1:100`) only changes the title-block text label while `generateBlueprintPdf()` auto-scales to fit the A4 page and draws a hardcoded `0 — 1m — 2m` (40mm) scale bar regardless of actual scale or unit.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow**: Both `390px` (`scrollWidth: 426`) and `320px` (`scrollWidth: 426`) exhibit horizontal page scrolling (`hasHorizontalScroll: true`) due to `<h1 class="c-header__title">` (`Interactive 2D Floor Plan & Room Furniture Scaler`).
- **Touch targets**: 8 controls are flagged (`smallTouchTargetCount: 8`): 4 `<select class="c-input c-input--select">` dropdowns (`21px` tall — shared `_c-input.scss` select height issue) and 4 native checkboxes (`13×13px`). Additionally, furniture chip buttons use inline `font-size: 11px; padding: 2px 8px` (~22px tall), and the SVG title block uses `10px` text (`tinyText: 1`).

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: Passed. Zero external network requests.
- **Directive 4 (Memory Hygiene)**: `URL.revokeObjectURL()` is called immediately in `triggerDownload()` and in `ngOnDestroy()`.
- **Security & Sandboxing (`AGENTS.md` §9)**: Violated. Uses `bypassSecurityTrustHtml()` on unsanitized SVG string containing user/file-supplied strings (`project.name`, `f.name`, `r.name`, `options.designerName`), and `onJsonFileSelected()` only logs `console.error` on invalid JSON without showing a UI error banner.
- **Styling**: Extensive inline `style="..."` attributes throughout `floor-plan-furniture-scaler.component.ts` instead of BEM component classes.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | DOM XSS vulnerability: `generateFloorPlanSvg()` interpolates unescaped `project.name`, `f.name`, `r.name`, and `designerName` into SVG and renders via `bypassSecurityTrustHtml()` without `DOMPurify` | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L246-L318), [floor-plan-furniture-scaler.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts#L428-L430) | Escape all dynamic strings with an XML/HTML escaper in `generateFloorPlanSvg()` and sanitize with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })` per `AGENTS.md` §9. |
| Medium | SVG preview is vertically offset and clipped at the bottom inside `.c-preview` (`max-height: 520px` vs fixed `<svg width="1000" height="800">`) | [floor-plan-furniture-scaler.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts#L347-L356), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L212) | Style `.c-preview svg { width: 100%; height: auto; max-height: 480px; display: block; }` so `viewBox` scales the entire blueprint cleanly into the viewport. |
| Medium | `snapToGrid()` is never called when updating furniture coordinates, `_walls` is ignored in `checkFurnitureClearances()`, and PDF export ignores furniture rotation (`rotationDeg`), windows, and actual `blueprintScale` on the graphical scale bar | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L18-L21), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L110-L113), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L424-L435), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/engine.ts#L488-L500) | Apply `snapToGrid(x, gridSnapStepCm)` when moving items, check furniture bounding boxes against wall bounds, and compute the PDF graphical scale bar length from `scaleFactor` and `measurementUnit`. |
| Low | Horizontal overflow at 390px/320px (`scrollWidth: 426`) from `.c-header__title`, plus 21px `<select>` and 13×13px checkbox touch targets | [floor-plan-furniture-scaler.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler/floor-plan-furniture-scaler.component.ts#L42-L49) | Add `overflow-wrap: anywhere` to `.c-header__title` and increase select/checkbox/chip touch target heights to ≥32px. |

---

<a id="tool-59"></a>
## 59 — Printable Emergency Recovery & Password Kit Sheet (`/tools/emergency-recovery-kit`)

**Verdict:** ⚠️ Vault templates, section toggles, and A4/US Letter vector PDF exports with embedded QR codes work client-side, but unescaped `kitTitle`/`vaultCustodian` interpolation in `generateEmergencyKitSvg()` paired with `bypassSecurityTrustHtml()` causes DOM XSS (and breaks on `&`), the SVG preview is vertically clipped and ignores the QR/instructions fields, and `.c-header__title` overflows at 390px/320px.

### Functional testing
- **Vault presets & section toggles**: Switching between **Comprehensive Succession Kit** (`47` SVG text nodes, `41` rects, all 4 vault sections enabled, 24-word BIP-39 grid) and **Cold Storage Crypto Sheet** (`23` text nodes, `19` rects, 12-word BIP-39 grid, monochrome mode) updates the live SVG preview. Changing **Paper Size Format** to **US Letter** updates `viewBox` from `0 0 735 1039.5` to `0 0 755.65 977.9`, and toggling **Monochrome Laser Print** switches the perimeter stroke from `#dc2626` to `#000000`.
- **PDF export**: Clicking **Download Vector PDF Sheet** downloads valid multi-section PDFs for both A4 (`emergency-recovery-kit-a4.pdf`, 56,748 B, `%PDF-1.3`) and US Letter (`emergency-recovery-kit-us_letter.pdf`, 56,748 B) containing the embedded offline verification QR PNG and Web Crypto SHA-256 fingerprint.
- **Security & functional defects found**:
  - **DOM XSS / broken XML on special characters (`AGENTS.md` §9 violation)**: `generateEmergencyKitSvg()` interpolates `options.kitTitle` and `options.vaultCustodian` directly into `<text>` tags without XML escaping and injects the result via `DomSanitizer.bypassSecurityTrustHtml()` without `DOMPurify`. Entering `Jane</text><img src=x onerror="window.__xss59=true"><text>` in **Designated Vault Custodian** executed arbitrary JS (`window.__xss59 === true`), and entering `&` (e.g., `Smith & Co.`) breaks SVG `<text>` rendering.
  - **Clipped SVG preview & header label overlap**: `<svg width="735" height="1039.5">` is placed inside `<div style="max-height: 600px">` inside `.c-preview` (`align-items: center`), leaving a ~160px blank gap at the top while clipping the bottom tamper-seal section and footer (`desktop.png`, `mobile.png`). In the preview card header, `Print-Ready Sheet Preview` and `A4 • SHA-256 Offline` collide (`PreviewA4`) because `.l-extremo__area-izquierda` / `.l-extremo__area-derecha` classes were omitted.
  - **Preview ignores `additionalInstructions` and `includeOfflineChecksumQr`**: Editing **Directives for Custodian / Heirs** or toggling **Offline Checksum QR** updates the exported PDF, but neither is rendered in `generateEmergencyKitSvg()`.
  - **Fake preview "SHA-256" fingerprint**: `ephemeralChecksum` computes a 32-bit FNV-1a hash and repeats the 8 hex chars 8 times (`7c42a6967c42a696...`) while labeling it `SHA-256:`, whereas `generateEmergencyKitPdf()` computes a real SHA-256 digest with `Date.now()`.
  - **Unstyled `window.print()`**: Clicking **🖨️ Print Directly** invokes `window.print()` with no `@media print` stylesheet, printing the app navigation, form controls, and clipped scroll container.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow**: Both `390px` (`scrollWidth: 455`) and `320px` (`scrollWidth: 455`) overflow horizontally (`hasHorizontalScroll: true`) due to `<h1 class="c-header__title">` (`Printable Emergency Recovery & Password Kit Sheet`).
- **Touch targets & iOS zoom**: 11 controls are below the 32px target height (`smallTouchTargetCount: 11`): 2 text inputs (`28px` tall), 2 `<select>` inputs (`21px` tall), and 7 native checkboxes (`13×13px`). The **Directives for Custodian / Heirs** `<textarea>` sets inline `font-size: 12px` (`inputsUnder16px_iOSZoom: 1`), triggering iOS auto-zoom on focus.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: Passed. Zero external network requests and zero persistence of user inputs.
- **Directive 4 (Memory Hygiene)**: `URL.revokeObjectURL()` is called immediately in `triggerDownload()` and in `ngOnDestroy()`.
- **Security & Sandboxing (`AGENTS.md` §9)**: Violated (`bypassSecurityTrustHtml` used without `DOMPurify` or XML escaping on user-supplied text inputs).

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | DOM XSS & broken SVG on `&`/`<`: `generateEmergencyKitSvg()` interpolates `kitTitle` and `vaultCustodian` without XML escaping and injects via `bypassSecurityTrustHtml()` without `DOMPurify` | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts#L98-L103), [emergency-recovery-kit.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L315-L317) | Escape XML characters (`&`, `<`, `>`, `"`, `'`) on all user strings in `generateEmergencyKitSvg()` and sanitize with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })`. |
| Medium | SVG preview is vertically offset and clipped at the bottom (`max-height: 600px` vs `<svg height="1039.5">`), and omits `additionalInstructions` and `includeOfflineChecksumQr` | [emergency-recovery-kit.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L258-L266), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts#L82), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts#L200-L212) | Style `.c-preview svg { width: 100%; height: auto; max-height: 560px; }`, render `options.additionalInstructions` and a QR preview in `generateEmergencyKitSvg()`, and add `@media print` CSS to hide app chrome during `printSheet()`. |
| Medium | Preview `ephemeralChecksum` repeats an 8-char FNV-1a hash 8 times (`7c42a696...`) while labeling it `SHA-256:`, mismatching the exported PDF's SHA-256 | [emergency-recovery-kit.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L299-L309), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts#L250-L251) | Use `computeDocumentHash()` for both preview and PDF (without `Date.now()` drift) so the preview and PDF fingerprints match. |
| Low | Horizontal overflow at 390px/320px (`scrollWidth: 455`), colliding `Print-Ready Sheet PreviewA4` header text, 12px textarea font-size, and 11 small touch targets | [emergency-recovery-kit.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L28-L35), [emergency-recovery-kit.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L249-L254) | Add `.l-extremo__area-izquierda` / `.l-extremo__area-derecha` to the preview card header, `overflow-wrap: anywhere` to `.c-header__title`, and `font-size: 16px` on mobile inputs. |

---

<a id="tool-60"></a>
## 60 — CSV/Paste to Vector Chart & Infographic Builder (`/tools/csv-vector-chart-builder`)

**Verdict:** ⚠️ CSV parsing (`PapaParse`), sample datasets, live SVG chart rendering, and SVG/PNG/PDF downloads work client-side, but unescaped CSV categories/titles in `generateChartSvg()` paired with `bypassSecurityTrustHtml()` allow DOM XSS (and break PNG export when CSV cells contain `&`), `generateChartPdf()` always draws a vertical bar chart regardless of `chartType`, `generateChartPngBlob()` stretches 1:1 and 4:3 charts to `1920×1080`, and `stacked_area` does not stack series values.

### Functional testing
- **Sample datasets & CSV upload**:
  - **Quarterly Revenue**: Parses `4 Categories • 2 Series` and renders 8 vertical bars (`viewBox="0 0 960 540"`).
  - **Market Share (Donut)**: Parses `5 Categories • 1 Series` and renders 5 donut arc paths with percentage labels.
  - **Website Traffic (Line)**: Parses `6 Categories • 2 Series` and renders 2 smooth cubic-bezier paths with point markers.
  - **Upload .csv**: Uploading `upload.csv` (`3` departments × `2` years) updates the chart to `3 Categories • 2 Series` (`6` vertical bars).
- **Exports & clipboard**:
  - **Download Vector SVG**: Downloads valid XML SVG (`quarterly-revenue-performance-.svg`, 3,516 B).
  - **Download 300 DPI PNG**: Downloads `quarterly-revenue-performance-.png` (128,890 B, `1920×1080`).
  - **Download Executive PDF**: Downloads `quarterly-revenue-performance-.pdf` (5,010 B, `%PDF-1.3`).
  - **Copy SVG Code** copies the SVG markup (`✓ SVG Copied!`), and **Reset to Defaults** restores the initial dataset.
- **Security & functional defects found**:
  - **DOM XSS & broken XML/PNG on `&` (`AGENTS.md` §9 violation)**: `generateChartSvg()` interpolates `chartTitle`, `chartSubtitle`, `data.categories[c]`, and `data.series[s].name` directly into `<text>` tags without XML escaping and injects the SVG via `DomSanitizer.bypassSecurityTrustHtml()` without `DOMPurify`. Pasting a CSV row with `"Test</text><img src=x onerror=""window.__xss60=true""><text>",100` executed arbitrary JS (`window.__xss60 === true`). Even benign CSV cells containing `&` (e.g., `R&D,100`) produce invalid SVG XML, causing `generateChartPngBlob()` (`img.src = url`) to fail and return a 61-byte dummy fallback PNG.
  - **PDF export ignores `chartType`**: `generateChartPdf()` (`engine.ts` lines 460–482) only implements a vertical bar loop (`doc.rect`), so exporting a Donut, Smooth Line, Stacked Area, or Horizontal Bar chart to PDF always produces a Vertical Bar chart without legend, gridlines, or data labels.
  - **PNG export stretches `1:1` and `4:3` aspect ratios**: `generateChartPngBlob()` hardcodes `canvas.width = 1920; canvas.height = 1080;` and ignores `_dpi`, distorting `1:1 Square (700×700)` and `4:3 Standard (800×600)` charts into `1920×1080` PNGs.
  - **`stacked_area` does not stack series**: Each series in `stacked_area` mode is plotted independently from `zeroY` (`y = getY(val)`) instead of accumulating series values vertically.

### Mobile adaptation (390px / 320px)
- **Horizontal overflow**: Both `390px` (`scrollWidth: 421`) and `320px` (`scrollWidth: 420`) overflow horizontally (`hasHorizontalScroll: true`) due to `<h1 class="c-header__title">` (`CSV / Paste to Vector Chart & Infographic Builder`).
- **Header text collision**: In the right card header (`desktop.png`), `Real-Time Vector Preview` and `4 Categories • 2 Series` collide (`Preview4 Categories`) because `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` were omitted.
- **Touch targets & iOS zoom**: 9 controls fall below 32px height (`smallTouchTargetCount: 9`): 2 text inputs (`28px`), 4 `<select>` inputs (`21px`), and 3 native checkboxes (`13×13px`). The CSV `<textarea>` uses inline `font-size: 11px` (`inputsUnder16px_iOSZoom: 1`), triggering iOS auto-zoom on focus.

### Code review
- **Directive 1 & 2 (Privacy / Zero Telemetry)**: Passed. Zero external network requests.
- **Directive 4 (Memory Hygiene)**: `URL.revokeObjectURL()` is called immediately in `triggerDownload()`, inside `generateChartPngBlob()` (`onload`/`onerror`), and in `ngOnDestroy()`.
- **Engine purity & Security (`AGENTS.md` §9, §10)**: `generateChartPngBlob()` in `engine.ts` directly uses `document.createElement('canvas')` and `new Image()`, and `csv-vector-chart-builder.component.ts` uses `bypassSecurityTrustHtml()` without `DOMPurify`.

### Issues found
| Severity | Issue | Location / evidence | Suggested fix |
|---|---|---|---|
| High | DOM XSS & broken SVG/PNG when CSV contains `&` or `<`: `generateChartSvg()` interpolates unescaped titles, categories, and series names into `<text>` tags and renders via `bypassSecurityTrustHtml()` without `DOMPurify` | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L153-L154), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L215-L404), [csv-vector-chart-builder.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts#L329-L331) | XML-escape all dynamic strings in `generateChartSvg()` and sanitize with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })` per `AGENTS.md` §9. |
| High | `generateChartPdf()` ignores `options.chartType` and always draws a vertical bar chart in the exported PDF | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L460-L482) | Either rasterize the rendered SVG via `generateChartPngBlob()` and embed it into the PDF with `doc.addImage()`, or implement PDF drawing branches for `donut_pie`, `smooth_line`, `stacked_area`, and `horizontal_bar`. |
| Medium | `generateChartPngBlob()` hardcodes `1920×1080` regardless of `options.aspectRatio` (`1:1` or `4:3`) and ignores `_dpi`, and `stacked_area` plots overlapping unstacked series | [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L350-L382), [engine.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L499-L506) | Compute PNG canvas dimensions from `getChartDimensions(aspectRatio)` scaled by `dpi / 96`, and accumulate cumulative series sums in `stacked_area` mode. |
| Low | Horizontal overflow at 390px/320px (`scrollWidth: 421`), colliding `Real-Time Vector Preview4 Categories` header text, 11px textarea font-size, and 9 small touch targets | [csv-vector-chart-builder.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts#L39-L46), [csv-vector-chart-builder.component.ts](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts#L258-L263) | Add `.l-extremo__area-izquierda` / `.l-extremo__area-derecha` to `.c-card__header`, `overflow-wrap: anywhere` to `.c-header__title`, and `font-size: 16px` on mobile textareas. |
