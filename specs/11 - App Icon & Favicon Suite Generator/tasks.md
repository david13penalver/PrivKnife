# Task List (TDD Vertical Slices): App Icon & Favicon Suite Generator

> **Tool**: `11 - App Icon & Favicon Suite Generator`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/media/favicon-generator/types.ts`
  - Define `FaviconSizeSpec`, `FaviconConfig`, `GeneratedIconAsset`, `FaviconSuiteResult`, `WebManifestData`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/media/favicon-generator/test-fixtures.ts`
  - Define standard icon specs (16, 32, 48, 180, 192, 512), sample mock images, and default config.

---

### 🟩 Phase 2: Core Favicon Suite & ICO Engine (Seam 1)
- [x] **Task 2.1: Implement Pure Binary .ico Packager (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `packIcoBinary()` generates valid Windows `.ico` byte buffer matching header structure.
  - **Implementation (Green)**: Implement `packIcoBinary()` in `engine.ts`.
- [x] **Task 2.2: Implement Manifest & HTML Snippet Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateWebManifest()` and `generateHtmlSnippet()` return valid JSON and HTML `<head>` tags.
  - **Implementation (Green)**: Implement manifest and snippet builders in `engine.ts`.
- [x] **Task 2.3: Implement Canvas Resizer & Suite Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateFaviconSuite()` generates all platform icons, `.ico`, and manifest.
  - **Implementation (Green)**: Implement `generateFaviconSuite()` in `engine.ts`.
- [x] **Task 2.4: Implement JSZip Packaging (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `createFaviconZip()` bundles all assets into a `.zip` Blob.
  - **Implementation (Green)**: Implement `createFaviconZip()` using `JSZip`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `favicon-generator.component.spec.ts`, assert:
    - Component initializes with default site name, theme color, and sample preview.
    - Dropping a source image triggers suite generation.
    - User can customize site name, short name, theme color, and background color.
  - **Implementation (Green)**: Build `FaviconGeneratorComponent` with dropzone, options, and live preview mockups.
- [x] **Task 3.2: Multi-Platform Previews & HTML Code Copy (Red → Green)**
  - **Test (Red)**: In `favicon-generator.component.spec.ts`, assert:
    - Multi-platform mockups (Chrome tab, iPhone squircle, Android circle, Google SERP) display the icon.
    - "Copy HTML Code" copies `<head>` markup to clipboard.
  - **Implementation (Green)**: Wire preview mockups and clipboard action.

---

### 🟩 Phase 4: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 4.1: Download ZIP & Revoke Object URLs (Red → Green)**
  - **Test (Red)**: In `favicon-generator.component.spec.ts`, assert:
    - Clicking "Download Favicon Suite (.zip)" generates zip, triggers anchor click, and immediately revokes object URL.
    - Post-download modal is displayed.
    - Component cleanup (`ngOnDestroy`) disposes of all active preview object URLs.
  - **Implementation (Green)**: Implement `downloadZip()`, modal dialog, and lifecycle disposal.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 2)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `favicon-generator.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run suite generation and ZIP download, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/media/favicon-generator/index.ts` and add `faviconAppIconSuiteTool` to `TOOL_REGISTRY`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/favicon-app-icon-suite` (and alias `/tools/favicon-generator`) with complete SEO metadata.
- [x] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/favicon-app-icon-suite`.
  - Mark Spec 11 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
