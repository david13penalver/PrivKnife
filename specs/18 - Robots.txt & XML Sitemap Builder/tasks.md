# Task List (TDD Vertical Slices): Robots.txt & XML Sitemap Builder

> **Tool**: `18 - Robots.txt & XML Sitemap Builder`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/dev/robots-sitemap-builder/types.ts`
  - Define `RobotsUserAgentRule`, `RobotsConfig`, `ChangeFrequency`, `SitemapUrlEntry`, `RobotsPresetKey`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/dev/robots-sitemap-builder/test-fixtures.ts`
  - Define sample robots configs, presets, sitemap entries, and raw URL lists.

---

### 🟩 Phase 2: Core Robots & Sitemap Engine (Seam 1)
- [x] **Task 2.1: Implement Robots.txt Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateRobotsTxt()` outputs standard User-agent, Disallow, Allow, Crawl-delay, and Sitemap directives.
  - **Implementation (Green)**: Implement robots.txt generator in `engine.ts`.
- [x] **Task 2.2: Implement XML Sitemap Generator & Validator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateSitemapXml()` formats valid XML and `validateSitemapXml()` checks validity with DOMParser.
  - **Implementation (Green)**: Implement sitemap generator and validator in `engine.ts`.
- [x] **Task 2.3: Implement Bulk URL Import Parser (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `parseBulkUrls()` converts multiline and CSV strings into structured `SitemapUrlEntry[]`.
  - **Implementation (Green)**: Implement bulk URL parser in `engine.ts`.
- [x] **Task 2.4: Implement Blob Exporters (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `exportRobotsBlob()` and `exportSitemapBlob()` output valid Blobs with appropriate MIME types.
  - **Implementation (Green)**: Implement Blob exporters in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `robots-sitemap-builder.component.spec.ts`, assert:
    - Component initializes with default robots.txt and sitemap entries.
    - Switching mode updates active editor and output view.
    - Updating robots rules updates live preview reactively.
    - Adding/editing sitemap URLs updates XML preview reactively.
    - Applying presets (e.g. "Block AI", "WordPress") updates robots configuration.
    - Bulk URL import converts textarea lines into sitemap rows.
  - **Implementation (Green)**: Build `RobotsSitemapBuilderComponent`.
- [x] **Task 3.2: Export, Download & Clipboard Actions (Red → Green)**
  - **Test (Red)**: In `robots-sitemap-builder.component.spec.ts`, assert:
    - "Download File" creates download anchor with correct filename (`robots.txt` or `sitemap.xml`) and immediately revokes Object URL.
    - "Copy to Clipboard" copies code and sets feedback state.
  - **Implementation (Green)**: Wire export handlers and clipboard copy.

---

### 🟩 Phase 4: Privacy Guard Verification (Seam 2)
- [x] **Task 4.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `robots-sitemap-builder.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run rule additions, bulk parsing, and file downloads, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 5: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/dev/robots-sitemap-builder/index.ts` and add `robotsSitemapBuilderTool` to `TOOL_REGISTRY`.
- [x] **Task 5.2: Configure Route in `app.routes.ts`**
  - Add `/tools/robots-sitemap-builder` (and aliases) with complete SEO metadata.
- [x] **Task 5.3: Update Home Catalog & Specs Roadmap**
  - Add `robots-sitemap-builder` to `home.ts` catalog with status `'ready'`.
  - Mark Spec 18 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 6: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 budget warnings).
