# Task List (TDD Vertical Slices): Social Share (Open Graph) Card Maker

> **Tool**: `12 - Social Share (Open Graph) Card Maker`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/media/og-card-maker/types.ts`
  - Define `OgCardTemplate`, `BackgroundStyle`, `OgCardConfig`, `CardExportResult`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/media/og-card-maker/test-fixtures.ts`
  - Define `DEFAULT_OG_CONFIG`, preset template configs, and mock file helpers.

---

### 🟩 Phase 2: Core Canvas Rendering Engine (Seam 1)
- [x] **Task 2.1: Implement Multiline Text Wrapping (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `wrapText()` accurately splits strings across boundaries and clips overflow.
  - **Implementation (Green)**: Implement `wrapText()` in `engine.ts`.
- [x] **Task 2.2: Implement HTML Meta Snippet Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateOgMetaSnippet()` produces standard Open Graph and Twitter summary_large_image tags.
  - **Implementation (Green)**: Implement `generateOgMetaSnippet()` in `engine.ts`.
- [x] **Task 2.3: Implement 1200x630 Canvas Card Renderer (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `renderOgCardToCanvas()` renders all 4 templates ('modern-tech', 'article-blog', 'product-hunt', 'code-snippet') onto canvas context.
  - **Implementation (Green)**: Implement canvas drawing and gradients in `engine.ts`.
- [x] **Task 2.4: Implement Image Exporting (PNG & WebP) (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `exportCanvasBlob()` outputs valid blobs of `image/png` and `image/webp`.
  - **Implementation (Green)**: Implement export helper in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `og-card-maker.component.spec.ts`, assert:
    - Component initializes with default config and generates preview.
    - User can update title, subtitle, author, domain, and colors reactively.
    - Switching templates updates canvas rendering and meta snippet.
  - **Implementation (Green)**: Build `OgCardMakerComponent` with form controls, color pickers, and responsive preview canvas.
- [x] **Task 3.2: Social Media Mockup Previews & HTML Code Copy (Red → Green)**
  - **Test (Red)**: In `og-card-maker.component.spec.ts`, assert:
    - Mockup tab switcher displays Twitter/X card and LinkedIn post previews.
    - "Copy HTML Code" copies meta tags to clipboard with feedback state.
  - **Implementation (Green)**: Wire mockup preview tabs and clipboard handler.

---

### 🟩 Phase 4: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 4.1: Download PNG & WebP with Object URL Disposal (Red → Green)**
  - **Test (Red)**: In `og-card-maker.component.spec.ts`, assert:
    - Clicking download triggers anchor click for `1200x630` PNG or WebP and immediately revokes object URL.
    - Component cleanup (`ngOnDestroy`) disposes of all active preview object URLs.
  - **Implementation (Green)**: Implement `downloadCard()`, modal dialog, and lifecycle cleanup.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 2)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `og-card-maker.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run generation and export, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/media/og-card-maker/index.ts` and add `ogCardMakerTool` to `TOOL_REGISTRY`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/og-card-maker` (and alias `/tools/social-share-card`) with complete SEO metadata.
- [x] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/og-card-maker`.
  - Mark Spec 12 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
