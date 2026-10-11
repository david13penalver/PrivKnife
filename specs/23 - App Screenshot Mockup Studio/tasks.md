# Task List (TDD Vertical Slices): App Screenshot Mockup Studio

> **Tool**: `23 - App Screenshot Mockup Studio`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Synthetic Fixtures Setup
- [x] **Task 1.1: Define Domain Interfaces & Types**
  - Path: `src/app/tools/media/screenshot-mockup/types.ts`
  - Types: `DeviceType`, `AnglePreset`, `ChassisColor`, `BackgroundStyle`, `CanvasSizePreset`, `MockupConfig`, `DeviceDimensions`, `ExportOptions`, `ExportResult`.
- [x] **Task 1.2: Create Programmatic Synthetic Test Fixtures**
  - Path: `src/app/tools/media/screenshot-mockup/test-fixtures.ts`
  - Fixtures: `DEFAULT_MOCKUP_CONFIG`, `DEVICE_SPECS`, `createSyntheticScreenshot()`, `SAMPLE_PRESETS`.

---

### 🟩 Phase 2: Perspective Projection Math & Frame Engine (Seam 1 & 2)
- [x] **Task 2.1: Canvas Sizing & Scale Calculations (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `getCanvasDimensions()` returns accurate pixel bounds for 1:1, 16:9, 9:16, 4:3 with 1x, 2x, 4x density multipliers.
  - **Implementation (Green)**: Implement `getCanvasDimensions()` in `engine.ts`.
- [x] **Task 2.2: Device Screen Bounds & Aspect Ratio Fitting (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `calculateDeviceScreenBounds()` correctly calculates screen area within device bezel for phone, tablet, laptop, and browser.
  - **Implementation (Green)**: Implement `calculateDeviceScreenBounds()` and image fitting math in `engine.ts`.
- [x] **Task 2.3: 2.5D Perspective Transformation Math (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `calculatePerspectiveTransform()` returns valid affine matrix parameters (scale, skewX, skewY, rotate, translate) for Front, Isometric Left, Isometric Right, Tilt, and Float.
  - **Implementation (Green)**: Implement `calculatePerspectiveTransform()` in `engine.ts`.
- [x] **Task 2.4: Gradient & Background Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `renderBackground()` handles transparent, solid hex, and gradient presets with valid color stops.
  - **Implementation (Green)**: Implement background styling functions in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 3)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `screenshot-mockup.component.spec.ts`:
    - Mounts with default device and angle preset.
    - Updates device type (phone, tablet, laptop, browser).
    - Updates angle preset and chassis color.
    - Updates background style and gradient presets.
    - Handles local screenshot file selection.
  - **Implementation (Green)**: Build `ScreenshotMockupComponent` in `screenshot-mockup.component.ts`.
- [x] **Task 3.2: Live Canvas Redraw & Export Handling (Red → Green)**
  - **Test (Red)**: In `screenshot-mockup.component.spec.ts`:
    - Triggers simulated render to Blob/DataURL.
    - Download triggers URL creation and immediate URL revocation.
    - Resets back to default state.
  - **Implementation (Green)**: Wire canvas redraw effect, export pipeline, and download trigger.

---

### 🟩 Phase 4: Privacy Guard Verification (Seam 4)
- [x] **Task 4.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `screenshot-mockup.component.spec.ts`, assert 0 calls to `fetch` or `XMLHttpRequest` during screenshot upload, angle shifts, background alterations, and PNG download.
  - **Implementation (Green)**: Enforce 100% offline isolation.

---

### 🟩 Phase 5: Tool Registry, Routing & Catalog Integration (Seam 5)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/media/screenshot-mockup/index.ts`.
  - Register `screenshotMockupTool` in `tool-registry.ts` and test in `tool-registry.spec.ts`.
- [x] **Task 5.2: Configure Route in `app.routes.ts`**
  - Add `/tools/screenshot-mockup` with aliases `/tools/app-screenshot-studio` and `/tools/device-mockup`.
- [x] **Task 5.3: Update Home Catalog & Roadmap Index**
  - Add `screenshot-mockup` to `home.ts` catalog with status `'ready'`.
  - Mark Spec 23 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 6: Final Verification & Build
- [x] Run full test suite: `npx ng test --no-watch` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 budget warnings).
- [x] Commit: `feat(tool-mockup): complete app screenshot mockup studio (Spec 23)`.
