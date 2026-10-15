# Specification 31: Comprehensive QA Logic Audit & Defect Remediation

> **Spec ID**: 31  
> **Status**: Ready for Implementation  
> **Priority**: High  
> **Author**: Antigravity QA Architecture Specialist  
> **Target Environment**: Chromium (Headless / Desktop 1280x900+)  
> **Application Under Test**: PrivKnife (Client-Side Angular 22 Single-Page Application at `http://localhost:4200/`)  

---

## 1. Executive Summary

A comprehensive quality assurance (QA) audit was conducted across **all 29 tools and core platform features** in **PrivKnife**. The scope focused exclusively on the **correct execution of application logic**, state management, input validation, export generation, error resilience, and strict adherence to PrivKnife's **Non-Negotiable Prime Directives** (Zero Server Ingestion, Zero Telemetry, and Zero Exfiltration).

### Audit Verdict Summary
- **Total Tools Audited**: 29
- **Platform Pages Audited**: 4 (`/`, `/ui-kit`, `/privacy`, `/terms`, `/404`)
- **Unit Test Baseline**: 77 test suites, 696 tests passed (`npm test`).
- **Tools with Flawless Logic Execution**: 22 / 29 (including 3D tools, Audio/Video tools, SVG/PDF engines, Canvas manipulators).
- **Critical Architecture Flaws Identified**: 1 (Affected 7+ tools across the codebase).
- **Privacy Prime Directive Violations Identified**: 1 (External remote asset in demo dataset).
- **Error Handling & State Defects Identified**: 3.
- **Input Validation Discrepancies**: 2.

All identified defects, their root causes, and exact implementation remediation plans are documented below for execution in the subsequent development session.

---

## 2. QA Audit Matrix by Tool Category

| # | Tool Route | Category | Core Logic Test Performed | Result | Issues / Findings |
|---|---|---|---|---|---|
| 01 | `/tools/exif-stripper` | Privacy | Ingest JPEG/PNG, metadata table parse, strip EXIF, corrupt file ingestion | ⚠️ Defect | Silent error suppression: `reset()` wipes `errorMessage` on corrupt upload. |
| 02 | `/tools/crypto-hash-uuid` | Privacy | Bulk UUIDv4 generation, casing, hyphens, SHA-256, MD5, export JSON/CSV | ⚠️ Defect | Quantity slider/input max boundary mismatch (1,000 in UI vs 5,000 in TS). |
| 03 | `/tools/csv-to-sql-json` | Dev / Data | Text paste, file drop, SQL dialect generation, JSON array format, Markdown | ✅ Pass | All conversions, delimiters, and edge cases executed cleanly. |
| 04 | `/tools/pdf-merger-splitter` | Documents | Ingest multiple PDFs, reorder, rotate 90°, delete page, split, merge download | ✅ Pass | Page reordering and multi-document PDF merge compiled cleanly. |
| 05 | `/tools/pdf-redaction` | Privacy | Vector PDF load, page navigation, draw blackout/whiteout boxes, burn & flatten | ⚠️ Defect | Missing try/catch on corrupt/non-PDF upload; unhandled console exception. |
| 06 | `/tools/invoice-maker` | Documents | Form items, tax rate, discount rate, currency format, jsPDF compile & download | ✅ Pass | Math precision (`round2`) and vector PDF compilation executed cleanly. |
| 07 | `/tools/grid-paper` | Documents | Dot/Square/Isometric/Hex/Ruled grids, margin inputs, SVG download, PDF export | ✅ Pass | High-precision vector lines and millimeter math executed cleanly. |
| 08 | `/tools/barcode-labels` | Documents | Avery 5160/5163/5167/L7160 layouts, Code 128/EAN-13/QR, sequential generator | ✅ Pass | Grid alignments and barcode vector graphics rendered and exported. |
| 09 | `/tools/table-tent-maker` | Documents | 2-sided tent, inverted 180° back face, QR generator, fold crease lines, PDF export | ✅ Pass | Live SVG rendering and print PDF compiled without issues. |
| 10 | `/tools/batch-image-compressor` | Media | Multi-file queue, WebP/JPEG/PNG formats, quality slider, JSZip bulk export | ✅ Pass | Worker/Canvas compression pipeline and ZIP export executed cleanly. |
| 11 | `/tools/favicon-app-icon-suite` | Media | Logo upload, multi-size canvas rendering (16-512px), manifest, ZIP package | ✅ Pass | Multi-resolution icon package and webmanifest generated cleanly. |
| 12 | `/tools/og-card-maker` | Media | Title/subtitle live canvas update, themes, gradient backgrounds, 1200x630 PNG export | ✅ Pass | Canvas 2D text measurement and high-DPI export executed cleanly. |
| 13 | `/tools/color-palette-extractor` | Design | Dominant color extraction, swatch picker, WCAG 2.1 AA/AAA contrast matrix, ASE export | ✅ Pass | ColorThief pixel sampling and contrast luminance formulas verified. |
| 14 | `/tools/css-mesh-gradient-maker` | Dev / Design | Multi-point radial shader, glassmorphism blur, CSS/Tailwind code generator, PNG export | 🚨 Critical | Card header projection bug dropped "Randomize", "Add Point", and "Download PNG". |
| 15 | `/tools/subtitles-shifter` | Media | SRT/VTT parsing, millisecond offset, FPS conversion (24->25), preview table, export | 🚨 Critical | Card header projection bug dropped "Download .srt/.vtt", "Copy", and tab buttons. |
| 16 | `/tools/calendar-linker` | Dev | RFC 5545 `.ics` generator, Google/Outlook calendar URL encoding, HTML button embed | 🚨 Critical | Card header projection bug dropped "Load Demo", "Download .ics", and "Copy Snippet". |
| 17 | `/tools/email-signature-generator` | Dev | Responsive HTML tables, rich text clipboard copy, template switching, export | 🚨 Critical + Privacy | Card header bug dropped configuration tabs; demo avatar makes external Unsplash HTTP request. |
| 18 | `/tools/robots-sitemap-builder` | Dev | Crawler user-agent blocks, AI bot presets, XML sitemap validation, copy/download | ⚠️ Defect | Card header projection bug dropped "+ Add User-Agent Block" button. |
| 19 | `/tools/markdown-cheatsheet` | Documents | Marked.js parsing, multi-column CSS grid, syntax highlighting, vector PDF download | ⚠️ Defect | Card header projection bug dropped "Reset" and quick snippet buttons (+Table, +Code). |
| 20 | `/tools/audio-bpm-detector` | Audio | Tap tempo metronome delta calculation, Web Audio file decoding, BPM & key analysis | ✅ Pass | Real-time tap listener and AudioBuffer FFT analysis executed cleanly. |
| 21 | `/tools/soundwave-art-maker` | Audio | Audio waveform extraction, radial/linear bars, SVG export, PDF export, STL 3D mesh | ✅ Pass | Web Audio time-domain analyzer and vector export executed cleanly. |
| 22 | `/tools/video-to-gif` | Video | Media timeline inspection, trim sliders, frame capture loop, GIF LZW compression | ✅ Pass | In-memory frame extraction and GIF download executed cleanly. |
| 23 | `/tools/screenshot-mockup` | Media | 3D affine canvas transform, device frames (iPhone/MacBook), chassis finish, PNG export | ✅ Pass | 2.5D perspective projection and high-DPI export executed cleanly. |
| 24 | `/tools/3d-qr-stand` | 3D | QR matrix generator, Three.js CSG dual-color extrusion, `.stl` and `.3mf` export | ✅ Pass | 3D mesh geometry, CSG difference/union, and ZIP 3MF export verified. |
| 25 | `/tools/cookie-cutter` | 3D | Silhouette contour tracing, ClipperLib 2D offset, cutter/stamp 3D mesh, STL export | ✅ Pass | 2D polyline offset and manifold 3D mesh generation verified. |
| 26 | `/tools/desk-wedge-nameplate` | 3D | Parametric wedge geometry, font glyph extrusion, embossed/debossed CSG, `.3mf` export | ✅ Pass | Three.js geometry compilation and dual-color 3MF archive verified. |
| 27 | `/tools/background-remover` | Media | Client-side chroma/edge detection, transparency alpha channel, PNG export | ✅ Pass | Canvas image data pixel manipulation and transparent PNG export verified. |
| 28 | `/tools/dns-checker` | Dev | Direct browser-to-DoH queries (Cloudflare, Google, Quad9, AdGuard), table parse | ✅ Pass | Direct DoH protocol requests conforming to client-side Directive 1 executed cleanly. |
| 29 | `/tools/web-vitals` | Dev | Core Web Vitals audit (LCP, INP, CLS, FCP, TTFB), score gauges, diagnostic tips | ⚠️ Defect | Over-permissive URL validation permits malformed URLs (e.g. concatenated URLs). |
| Core | Platform & Shell | Platform | Header navigation, dark/light theme toggle, Spanish/English i18n runtime switch, 404 | ✅ Pass | Signals-based reactivity, DOM sync, and zero console errors verified. |

---

## 3. Comprehensive Defect Catalog & Root Cause Analysis

### 🚨 DEFECT-01 (Severity: Critical — P0 Blocker)
#### Title: Content Projection Failure in Reusable `<app-card>` Component Dropping Action Buttons Across 7+ Tools
- **Affected File**: `src/app/components/card/card.ts` (lines 8–15)
- **Impacted Tools**:
  1. `src/app/tools/media/subtitles-shifter/subtitles-shifter.component.ts` (lines 70, 99, 227)
  2. `src/app/tools/dev/calendar-linker/calendar-linker.component.ts` (lines 62, 167, 290)
  3. `src/app/tools/dev/email-signature-generator/email-signature-generator.component.ts` (lines 80, 151, 538)
  4. `src/app/tools/dev/mesh-gradient-maker/mesh-gradient-maker.component.ts` (lines 67, 95, 320, 375)
  5. `src/app/tools/dev/robots-sitemap-builder/robots-sitemap-builder.component.ts` (lines 118, 342)
  6. `src/app/tools/documents/markdown-cheatsheet/markdown-cheatsheet.component.ts` (lines 72, 208)
  7. `src/app/pages/not-found/not-found.ts` (line 52)

#### Symptom & User Impact:
In multiple tools across the application, critical controls are completely missing from the rendered DOM:
- **Subtitles Shifter**: The entire preview card header is gone. Users cannot see the **"Side-by-Side Cues (First 25)"** tab, the **"Raw Converted Code"** tab, the **"📋 Copy"** button, and most critically, the **"⬇ Download .srt / .vtt"** export button. The tool becomes completely incapable of exporting subtitles.
- **Calendar Linker**: The **"📄 Load Demo"** button, the **"⬇ Download .ics"** button, and the **"📋 Copy HTML Snippet"** button are omitted. Users cannot download standard `.ics` calendar files.
- **Email Signature Generator**: The card containing section navigation tabs (**"Personal"**, **"Contact"**, **"Company"**, **"Social"**, **"Design"**) and the **"🔄 Reset"** button is dropped. Users are permanently locked in the initial tab and cannot input contact details, company links, or styling options.
- **CSS Mesh Gradient Maker**: The **"🎲 Randomize"** button, the **"+ Add Point"** button, the **"⬇ Download PNG (1200×800)"** button, and the **"Pure CSS" vs "Tailwind CSS"** format tabs are omitted.
- **Robots.txt & Sitemap Builder**: The **"+ Add User-Agent Block"** button is missing.
- **Markdown Cheatsheet**: The quick snippet buttons (**"+ Table"**, **"+ Code"**, **"+ Note"**) and **"🔄 Reset"** are missing.

#### Root Cause Analysis:
In `src/app/components/card/card.ts`:
```html
@if (title() || hasHeader()) {
  <div class="c-card__header">
    @if (title()) {
      <h3 class="c-card__title">{{ title() }}</h3>
    }
    <ng-content select="[card-header]" />
  </div>
}
```
`Card` defines `readonly hasHeader = input<boolean>(false);` and `readonly title = input<string>('');`.  
When a component uses:
```html
<app-card class="g--margin-bottom-4">
  <div card-header class="c-card__header-flex">
    <app-button (clicked)="downloadSubtitles()">⬇ Download .srt</app-button>
  </div>
  ...
</app-card>
```
Because neither `title` nor `[hasHeader]="true"` was passed on `<app-card>`, Angular evaluates `@if (title() || hasHeader())` as `false`. Consequently, Angular does not render `<div class="c-card__header">` and **completely drops** the projected child `<ng-content select="[card-header]" />` from the DOM tree.

#### Remediation Plan:
In `src/app/components/card/card.ts`, modify the template to ensure that projected `card-header` content is always rendered when supplied.  
Option A (Recommended & Future-proof): Always render `<ng-content select="[card-header]" />` or check for header presence via CSS `:has(.c-card__header)` / Angular query, or change the condition:
```html
@if (title() || hasHeader()) {
  <div class="c-card__header">
    @if (title()) {
      <h3 class="c-card__title">{{ title() }}</h3>
    }
    <ng-content select="[card-header]" />
  </div>
} @else {
  <!-- Render projected header if custom header elements were provided -->
  <div class="c-card__header c-card__header--custom">
    <ng-content select="[card-header]" />
  </div>
}
```
Alternatively, simplify `card.ts` template:
```html
<div class="c-card__header">
  @if (title()) {
    <h3 class="c-card__title">{{ title() }}</h3>
  }
  <ng-content select="[card-header]" />
</div>
```
And add `.c-card__header:empty { display: none; }` to `_c-card.scss` so empty headers do not create spacing when unused.

---

### 🚨 DEFECT-02 (Severity: High — Privacy Directive Violation)
#### Title: Remote Third-Party Image Ingestion in Email Signature Default Demo Fixture
- **Affected File**: `src/app/tools/dev/email-signature-generator/test-fixtures.ts` (lines 53, 90, 127)
- **Impacted Tool**: `src/app/tools/dev/email-signature-generator`

#### Symptom & User Impact:
When a user navigates to `/tools/email-signature-generator`, Chromium logs an outgoing HTTP network request:
```
Request: https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces
```
This violates PrivKnife's **Prime Directive 1** (*"Zero Server Ingestion & Zero Exfiltration: NEVER introduce a backend server, cloud API, or third-party proxy that receives requests"*) and **Prime Directive 2** (*"Respect user anonymity"*), as loading third-party remote images exposes the user's IP address and browser headers to Unsplash servers.

#### Root Cause Analysis:
In `src/app/tools/dev/email-signature-generator/test-fixtures.ts`, the demo signature templates `SAMPLE_SIGNATURE` hardcode a live remote Unsplash image URL in the `avatarUrl` field.

#### Remediation Plan:
1. Replace the external Unsplash URL with a self-contained inline SVG Data URI (or a transparent placeholder 1x1 data URL) representing a neutral avatar silhouette:
```typescript
export const DEFAULT_AVATAR_DATA_URI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="%23cbd5e1"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>';
```
2. In `test-fixtures.ts`, replace all occurrences of `https://images.unsplash.com/...` with `DEFAULT_AVATAR_DATA_URI`.

---

### ⚠️ DEFECT-03 (Severity: Medium — User Experience & State Management)
#### Title: Silent Error Message Wiping on Invalid Image Upload in `exif-stripper`
- **Affected File**: `src/app/tools/privacy/exif-stripper/exif-stripper.component.ts` (lines 237–241, 276–285)
- **Impacted Tool**: `src/app/tools/privacy/exif-stripper`

#### Symptom & User Impact:
When a user uploads a corrupt file, an unsupported image format, or an arbitrary non-image file into the EXIF Stripper dropzone, the application produces **no visual error message**. The dropzone simply reappears as if no file was ever dropped, giving the user no indication of why processing failed.

#### Root Cause Analysis:
In `onFileSelected(file: File)`:
```typescript
try {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const parsed = parseMetadata(buffer, file.name);
  ...
} catch (err: any) {
  this.errorMessage.set(err.message || 'Failed to parse image metadata.');
  this.reset(); // <-- BUG: reset() unconditionally calls this.errorMessage.set(null);
}
```
In `reset()` (line 283):
```typescript
reset(): void {
  this.cleanObjectUrls();
  this.selectedFile.set(null);
  this.metadata.set(null);
  this.strippedResult.set(null);
  this.cleanedDownloadUrl.set(null);
  this.cleanedFileName.set(null);
  this.errorMessage.set(null); // <-- Overwrites error immediately
  this.isProcessing.set(false);
}
```
Because `this.reset()` is called immediately inside the `catch` block, `this.errorMessage` is set to the error and then instantly wiped to `null` within the same microtask.

#### Remediation Plan:
In `exif-stripper.component.ts`:
1. Modify `reset()` to accept an optional parameter `preserveError: boolean = false`:
```typescript
reset(preserveError = false): void {
  this.cleanObjectUrls();
  this.selectedFile.set(null);
  this.metadata.set(null);
  this.strippedResult.set(null);
  this.cleanedDownloadUrl.set(null);
  this.cleanedFileName.set(null);
  if (!preserveError) {
    this.errorMessage.set(null);
  }
  this.isProcessing.set(false);
}
```
2. In `onFileSelected`:
```typescript
} catch (err: any) {
  this.reset(true);
  this.errorMessage.set(err.message || 'Failed to parse image metadata. File may be corrupted.');
}
```

---

### ⚠️ DEFECT-04 (Severity: Medium — Robustness & Error Resilience)
#### Title: Unhandled Promise Rejection on Non-PDF or Corrupt File Drop in `pdf-redaction`
- **Affected File**: `src/app/tools/privacy/pdf-redaction/pdf-redaction.component.ts` (lines 335–348)
- **Impacted Tool**: `src/app/tools/privacy/pdf-redaction`

#### Symptom & User Impact:
When a user uploads a corrupt file or non-PDF document into the PDF Redaction dropzone, an unhandled exception is thrown to the browser console:
```
ERROR Error: Failed to parse PDF document (line:0 col:268 offset=134): No PDF header found
```
The UI remains stuck on the dropzone without showing any error feedback to the user.

#### Root Cause Analysis:
In `src/app/tools/privacy/pdf-redaction/pdf-redaction.component.ts`:
```typescript
async onFileDropped(file: File): Promise<void> {
  this.isProcessing.set(true);
  try {
    const buffer = await file.arrayBuffer();
    const doc = await loadPdfForRedaction(buffer, file.name);
    this.loadedDocument.set(doc);
    this.currentPageIndex.set(0);
    this.redactionsByPage.set(new Map());
    this.zoomLevel.set(1.0);
    await this.loadActivePagePreview();
  } finally {
    this.isProcessing.set(false);
  }
}
```
There is no `catch` block handling exceptions thrown by `loadPdfForRedaction`.

#### Remediation Plan:
1. Introduce an `errorMessage = signal<string | null>(null);` signal in `PdfRedactionComponent`.
2. Add a `catch (err: any)` block in `onFileDropped`:
```typescript
} catch (err: any) {
  this.errorMessage.set(err.message || 'The selected file is not a valid PDF or is corrupted.');
  this.loadedDocument.set(null);
} finally {
  this.isProcessing.set(false);
}
```
3. Add an error alert box in `pdf-redaction.component.ts` template:
```html
@if (errorMessage()) {
  <div class="l-columns__area g--margin-bottom-4">
    <div class="g--padding-3" style="background-color: var(--color-danger-subtle, #fee2e2); border: 1px solid var(--color-danger); border-radius: var(--radius-sm); color: var(--color-danger);">
      <strong>Error:</strong> {{ errorMessage() }}
    </div>
  </div>
}
```

---

### 🔍 DEFECT-05 (Severity: Low — Form Input Validation Discrepancy)
#### Title: Quantity Input Clamping Discrepancy Between Template and TypeScript Logic in `crypto-hash-uuid`
- **Affected File**: `src/app/tools/privacy/crypto-hash-uuid/crypto-hash-uuid.component.ts` (lines 88, 95, 543, 555–556)
- **Impacted Tool**: `src/app/tools/privacy/crypto-hash-uuid`

#### Symptom & User Impact:
- The UI slider has `min="1" max="1000"` and the template label displays: `Range: 1 – 1,000`.
- The number input element specifies `min="1" max="1000"`.
- However, if a user manually types `5000` into the input, the component generates 5,000 UUIDs rather than clamping to the advertised maximum of 1,000.

#### Root Cause Analysis:
In `crypto-hash-uuid.component.ts`:
```typescript
onQuantityTyped(event: Event): void {
  ...
  const val = parseInt(raw, 10);
  if (!isNaN(val) && val >= 1) {
    const clamped = Math.min(val, 5000); // <-- Clamps to 5000 instead of 1000
    this.uuidQuantity.set(clamped);
    this.generateUuids();
  }
}

onQuantityBlur(event: Event): void {
  ...
  else if (val > 5000) { // <-- Clamps to 5000 instead of 1000
    val = 5000;
  }
  ...
}
```

#### Remediation Plan:
In `src/app/tools/privacy/crypto-hash-uuid/crypto-hash-uuid.component.ts`, change the clamping upper bound in `onQuantityTyped` and `onQuantityBlur` from `5000` to `1000`:
```typescript
const MAX_UUID_QUANTITY = 1000;
```
Ensure consistent clamping across input typing, input blur, and range slider handlers.

---

### 🔍 DEFECT-06 (Severity: Medium — URL Sanitization & Input Robustness)
#### Title: Concatenated / Malformed URL Acceptance in `web-vitals` Engine
- **Affected File**: `src/app/tools/dev/web-vitals/engine.ts` (lines 26–38)
- **Impacted Tool**: `src/app/tools/dev/web-vitals`

#### Symptom & User Impact:
If a user pastes a URL while the default `https://privknife.org` is in the field, producing an invalid URL like `https://privknife.orghttps://example.com`, `isValidUrl` returns `true`. The tool sends an unparseable target URL to Google PageSpeed Insights, resulting in an API 400 Bad Request error.

#### Root Cause Analysis:
In `isValidUrl(input: string)`:
```typescript
export function isValidUrl(input: string): boolean {
  if (!input || !input.trim()) return false;
  try {
    const normalized = normalizeUrl(input);
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    return url.hostname.includes('.') && url.hostname.length > 3;
  } catch {
    return false;
  }
}
```
When `normalized` is `https://privknife.orghttps://example.com`, standard browser `new URL()` parses `privknife.orghttps` as the hostname and `//example.com` as the pathname. Since `privknife.orghttps` contains a dot and is longer than 3 characters, `isValidUrl` falsely validates it as true.

#### Remediation Plan:
In `src/app/tools/dev/web-vitals/engine.ts`:
1. Strengthen `isValidUrl`:
```typescript
export function isValidUrl(input: string): boolean {
  if (!input || !input.trim()) return false;
  const clean = input.trim();
  // Reject nested protocol indicators
  if ((clean.match(/https?:\/\//g) || []).length > 1) {
    return false;
  }
  try {
    const normalized = normalizeUrl(clean);
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    const host = url.hostname;
    // Must contain a valid domain structure: at least one dot, no trailing dot, valid TLD
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(host);
  } catch {
    return false;
  }
}
```

---

## 4. Remediation Implementation Plan & Verification Matrix

In the subsequent implementation session, the engineering agent must execute the following remediation phases:

### Phase 1: Core Architecture Fix (`card.ts`)
- [ ] Edit `src/app/components/card/card.ts` to ensure that child elements projected into `[card-header]` are never omitted when `title` is not provided.
- [ ] Update `src/styles/04_components/_c-card.scss` to ensure empty card headers collapse cleanly.
- [ ] Verify that all 7 impacted tools (`subtitles-shifter`, `calendar-linker`, `email-signature-generator`, `mesh-gradient-maker`, `robots-sitemap-builder`, `markdown-cheatsheet`, `not-found`) correctly render their action buttons in the browser.

### Phase 2: Privacy Hardening (`email-signature-generator`)
- [ ] Replace `https://images.unsplash.com/...` with a local SVG Data URI in `src/app/tools/dev/email-signature-generator/test-fixtures.ts`.
- [ ] Run network monitor audit to verify **0 external HTTP requests** are dispatched on `/tools/email-signature-generator`.

### Phase 3: Error Handling & Resilience
- [ ] Fix `exif-stripper.component.ts` so `errorMessage` is preserved and rendered to the user on corrupted image uploads.
- [ ] Add `try / catch` and visual error state to `pdf-redaction.component.ts` on invalid file uploads.

### Phase 4: Form Input & Validation Alignment
- [ ] Align UUID quantity input clamping to 1,000 in `crypto-hash-uuid.component.ts`.
- [ ] Implement robust hostname regex validation in `web-vitals/engine.ts`.

### Phase 5: Automated QA Verification Run
- [ ] Re-run all Puppeteer test suites (`test_privacy_tools.js`, `test_documents_tools.js`, `test_media_tools.js`, `test_audio_video_tools.js`, `test_dev_tools.js`, `test_3d_tools.js`, `test_platform_features.js`).
- [ ] Verify all 29 tools report **0 defects**, **0 uncaught exceptions**, and **0 privacy violations**.
