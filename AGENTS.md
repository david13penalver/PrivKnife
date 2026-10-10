# AGENTS.md — PrivKnife AI Agent Operational Manual

> **Scope**: This document defines the engineering standards, architecture rules, privacy guardrails, and implementation procedures for all AI assistants (Antigravity, Claude, Cursor, ChatGPT, GitHub Copilot) working within the **PrivKnife** repository.

---

## 1. Project Mission & Identity

**PrivKnife** is a private, client-side web application inspired by the **Swiss Army Knife**: a consolidated suite of high-utility, everyday tools (PDF manipulation, image compression, format conversion, metadata stripping, cryptographic hashing, 3D generators, etc.) operating **with zero backend servers and zero telemetry**.

### The Core Philosophy
> **"Privacy by Architecture, Not by Policy."**  
> Rather than asking users to trust a privacy policy, PrivKnife's architecture ensures that user files and sensitive inputs **physically cannot leave the client's browser**, because no ingestion server or remote processing endpoint exists.

---

## 2. Non-Negotiable Prime Directives

Every AI agent operating in this codebase MUST abide by the following non-negotiable rules:

### 🚫 Directive 1: Zero Server Ingestion & Zero Exfiltration
- **NEVER** introduce a backend server, serverless function, cloud API, or third-party proxy that receives, parses, stores, or transforms user files or sensitive data.
- **NEVER** transmit file contents, hashes of private files, or text payloads over the network.
- Every tool must be **100% client-side** using browser APIs (HTML5 Canvas, Web Crypto, Web Audio, File API) and client-side libraries (WASM, `pdf-lib`, `ffmpeg.wasm`, `PapaParse`, `Three.js`, `JSZip`, etc.).
- If a utility idea historically required a server (e.g., DNS propagation or PageSpeed), it must either:
  1. Rely strictly on direct client-side protocols (e.g., browser-native DNS-over-HTTPS via Cloudflare/Google DoH endpoints directly from the browser), OR
  2. Be marked as explicitly external/disabled, OR
  3. Be omitted from the core client-side suite.

### 🚫 Directive 2: Zero Telemetry & Tracking
- **DO NOT** add Google Analytics, Mixpanel, PostHog, telemetry beacons, tracking pixels, or remote error reporting scripts (like Sentry) that transmit user activity or metadata to external servers.
- Respect the user's right to complete anonymity.

### ⚡ Directive 3: Protect the Main UI Thread
- Any CPU-intensive computation (e.g., batch image compression, video trimming, PDF flattening, heavy regex parsing, 3D mesh CSG operations, large file hashing) **MUST** run inside a **Web Worker**.
- The Angular main thread must remain fluid (target: 60 FPS) and responsive at all times.
- Provide real-time progress callbacks (`onProgress(percent: number)`) from workers to the UI.

### 🧹 Directive 4: Strict Memory Hygiene & Resource Disposal
- Browser tabs will crash if large files or Blobs accumulate in memory.
- **ALWAYS** call `URL.revokeObjectURL(url)` immediately after downloads or when component previews unmount (`ngOnDestroy`).
- Terminate idle or completed one-off Web Workers.
- In Three.js tools, explicitly dispose of `geometry.dispose()`, `material.dispose()`, and `texture.dispose()`.
- Avoid holding large `ArrayBuffer` or `Uint8Array` references in global closures.

### 🧩 Directive 5: Modular Lazy Loading
- Every tool is a self-contained Angular Standalone Component.
- All tool components and heavy dependencies (like `Three.js`, `ffmpeg.wasm`, `pdf-lib`) **MUST** be loaded dynamically via Angular router `loadComponent: () => import(...)`. The initial bundle of PrivKnife must remain lightweight (< 200KB initial JS).

---

## 3. Specifications Reference: `Documents/`

The repository includes a comprehensive specifications directory at [`Documents/`](file:///home/deivision/Projects/Programming/PrivKnife/Documents).

### Structure of `Documents/`:
- **`MicroSaaS Ideas - No Backend & AdSense.xlsx`**: Master index of 29 tools detailing output deliverables, core client-side tech stacks, primary SEO keywords, and backend requirements.
- **29 Subdirectories (e.g., `Documents/EXIF & Privacy Metadata Stripper/`)**:
  - Contains `.docx` execution blueprints.
  - Includes exact product strategy, MVP generation prompts, recommended client-side libraries, detailed UI/UX specs, input/output specifications, and step-by-step technical execution details.

### How Agents Must Use `Documents/`:
1. When asked to implement or refine a tool, **first check if a corresponding folder exists in `Documents/`**.
2. Read the `.docx` guide (e.g., via script or inspection) to understand:
   - Target client-side libraries (e.g., `piexifjs` for EXIF, `pdf-lib` for PDF, `Three.js` + `three-bvh-csg` for 3D).
   - Expected UI panels: Input configuration, live preview, export formats, presets.
   - Output deliverables (e.g., dual-color `.3mf`, clean `.pdf`, `.zip` with `.webp`).
3. Adhere to the core client-side tech outlined in the guide.

---

## 4. Frontend Framework: Angular Guidelines

PrivKnife is built with modern **Angular**:

- **Standalone Components**: All components, directives, and pipes MUST be `standalone: true`. No `NgModule` wrappers.
- **Angular Signals**: Use Signals (`signal()`, `computed()`, `effect()`) for fine-grained reactivity in tool UI state (file selection, progress, options).
- **Control Flow**: Use modern Angular control flow syntax (`@if`, `@for`, `@switch`) instead of legacy structural directives (`*ngIf`, `*ngFor`).
- **Reactive Forms / Typed Forms**: When handling tool configuration parameters, use Angular Typed Forms (`FormGroup`, `FormControl`).
- **Routing**: Lazy-load each tool component via `loadComponent` in `app.routes.ts`:
  ```typescript
  {
    path: 'tools/batch-compressor',
    loadComponent: () => import('./tools/media/batch-compressor/batch-compressor.component')
      .then(m => m.BatchCompressorComponent)
  }
  ```
- **Lifecycle Cleanup**: Implement `OnDestroy` (`ngOnDestroy`) or use `DestroyRef` to clean up Web Workers, subscriptions, and revoke object URLs.

---

## 5. Styling & Design System: SASS + BEM Architecture

PrivKnife's styling strictly follows the Web Interface Design theory specified in:
- **Reference**: [DAW-2 Web Interface Design Theory](https://github.com/david13penalver/DAW-2/tree/master/Web%20Interface%20Design/First%20Evaluation/Theory)
- **Course Reference**: [logongas.es DIW](https://logongas.es/doku.php?id=clase:daw:diw:start)

### 5.1. BEM Methodology & Namespace Prefixes

Every CSS class in PrivKnife MUST follow BEM with specific prefix namespaces:

```
.<prefix>-<block>
.<prefix>-<block>__<element>
.<prefix>-<block>--<modifier>
.<prefix>-<block>__<element>--<modifier>
```

#### The 3 Namespace Prefixes:
1. **`c-` (Visual Components)**:
   - Used for all visual, interactive, reusable UI components.
   - Examples:
     - `.c-button`, `.c-button--primary`, `.c-button--danger`, `.c-button--small`
     - `.c-dropzone`, `.c-dropzone__input`, `.c-dropzone--drag-over`
     - `.c-card`, `.c-card__header`, `.c-card__body`, `.c-card__footer`
     - `.c-badge`, `.c-badge--privacy`, `.c-badge--success`
     - `.c-input`, `.c-input--number`, `.c-input__label`
     - `.c-preview`, `.c-preview__canvas`, `.c-preview__split`
     - `.c-progress`, `.c-progress__bar`

2. **`l-` (Layout Structures)**:
   - Used for layout containers responsible ONLY for positioning, arrangement, and sizing of areas using Flexbox and Grid.
   - **Crucial Rule**: Layout classes MUST NOT define background colors, typography, fonts, or decorative borders. They only arrange space.
   - **BEM Layout Rules (The "Area" Pattern)**:
     - Always constructed with 2 tiers: the father layout block and child **area** elements:
       ```scss
       .l-extremo {
         display: flex;
         &__area-izquierda { margin-right: auto; }
         &__area-derecha   { margin-left: auto; }
       }

       .l-columns {
         display: grid;
         grid-template-columns: repeat(1, 1fr);
         @for $i from 1 through 12 {
           &--#{$i} { grid-template-columns: repeat($i, 1fr); }
         }
         &__area { /* placement */ }
       }
       ```
     - Components are placed inside areas, or assigned alongside the area class:
       ```html
       <div class="l-extremo">
         <div class="l-extremo__area-izquierda c-button">Cancel</div>
         <div class="l-extremo__area-derecha c-button c-button--primary">Process</div>
       </div>
       ```

3. **`g--` (Global Modifiers & Utilities)**:
   - Used for utility helpers (spacing, alignment, display).
   - Must strictly begin with `g--`.
   - Examples:
     - `.g--margin-4`, `.g--margin-bottom-6`, `.g--padding-2`
     - `.g--text-center`, `.g--text-right`
     - `.g--hidden`, `.g--flex-center`

---

### 5.2. SASS 6-Layer Directory Structure

Global styles are structured in `src/styles/` in accordance with the theoretical file hierarchy:

```
src/styles/
├── 01_utilities/
│   ├── _css-variables.scss     # Native CSS custom properties (--color-bg, --color-primary)
│   ├── _sass-variables.scss    # SASS variables ($font-main, $primary-color, $breakpoints)
│   ├── _functions.scss         # SASS functions (getBorderSize($n), em($px), color math)
│   └── _mixins.scss            # SASS mixins (@mixin box-shadow, @mixin responsive, @mixin transition)
├── 02_base/
│   ├── _reset.scss             # Reset CSS
│   ├── _typography.scss        # Global typography, font faces, and base sizing
│   └── _override.scss          # Overrides for external libraries (if any)
├── 03_layout/
│   ├── _l-page.scss            # Base page wrapper layout
│   ├── _l-columns.scss         # Responsive grid columns layout
│   ├── _l-extremo.scss         # Left/right flex alignment layout
│   └── _l-sidebar.scss         # Sidebar-content layout
├── 04_components/
│   ├── _c-button.scss          # Button component styles
│   ├── _c-dropzone.scss        # Drag-and-drop zone
│   ├── _c-card.scss            # Tool cards
│   ├── _c-badge.scss           # Privacy badge & tags
│   ├── _c-input.scss           # Form fields, sliders, toggles
│   ├── _c-preview.scss         # Split & canvas preview viewers
│   └── _c-progress.scss        # Progress indicators
├── 05_pages/
│   └── (Avoid page-specific styles; keep modular and reusable)
├── 06_global/
│   ├── _g--margin.scss         # Global margin utilities generated via loops
│   ├── _g--padding.scss        # Global padding utilities
│   └── _g--display.scss        # Display helper classes
└── main.scss                   # Main compilation aggregator
```

### 5.3. SASS Language Best Practices
AI agents writing SCSS must use the idiomatic SASS features from the theory:
- **Parent Selector (`&`)**: Nest elements (`&__element`) and modifiers (`&--modifier`).
- **Mixins**:
  ```scss
  @mixin box-shadow($color) {
    box-shadow: 0 4px 16px $color;
  }
  ```
- **Functions**:
  ```scss
  @function spacing($multiplier) {
    @return 4px * $multiplier;
  }
  ```
- **Maps and Loops (`@each`, `@for`)**:
  ```scss
  $spacings: (1: 4px, 2: 8px, 3: 12px, 4: 16px, 6: 24px, 8: 32px);
  @each $key, $val in $spacings {
    .g--margin-#{$key} { margin: $val; }
    .g--margin-bottom-#{$key} { margin-bottom: $val; }
  }
  ```
- **Arrays**: Access via `nth($list, $index)` and measure via `length($list)`.

---

## 6. Directory Conventions & File Layout

```
src/
├── app/
│   ├── core/                        # Core infrastructure & shared services
│   │   ├── privacy/                 # CSP validation, network assertion guards
│   │   ├── workers/                 # Web Worker bridge & pool management
│   │   ├── storage/                 # Client-side storage (IndexedDB / LocalStorage)
│   │   └── utils/                   # Download triggers, file formatters, byte units
│   ├── components/                  # Shared reusable Angular standalone components
│   │   ├── button/                  # <app-button> with .c-button
│   │   ├── dropzone/                # <app-dropzone> with .c-dropzone
│   │   ├── preview/                 # <app-split-preview> with .c-preview
│   │   ├── progress/                # <app-progress-bar> with .c-progress
│   │   └── badge/                   # <app-badge> with .c-badge
│   ├── layout/                      # Navigation shell
│   │   ├── header/                  # <app-header> with .c-header / .l-page__header
│   │   └── footer/                  # <app-footer> with .c-footer / .l-page__footer
│   ├── tools/                       # Tool implementations categorized by domain
│   │   ├── privacy/                 # EXIF stripper, PDF redactor, Hash generator
│   │   ├── documents/               # PDF merger/splitter, Invoice maker, Cheatsheet
│   │   ├── media/                   # Image compressor, Favicon suite, Mockup studio
│   │   ├── audio-video/             # Video to GIF, Audio BPM, Subtitle shifter
│   │   ├── dev/                     # CSV converter, Robots.txt, CSS gradients
│   │   ├── 3d/                      # 3D QR stand, Cookie cutter, Nameplate maker
│   │   └── tool-registry.ts         # Central registry of available tools
│   ├── app.routes.ts                # Application lazy routing
│   ├── app.component.ts             # Root component
│   └── app.config.ts                # Application configuration
├── styles/                          # 6-Layer SASS Design System (BEM)
├── assets/                          # Static assets and WASM binaries
├── index.html                       # Entry HTML with strict CSP
└── main.ts                          # Bootstrap entry point
```

---

## 7. Tool Standard Contract & File Layout

Each tool must reside in its own directory: `src/app/tools/<category>/<tool-slug>/`.

### File Structure for a Tool:
```
src/app/tools/<category>/<tool-slug>/
├── index.ts                     # Export tool definition & metadata
├── <tool-slug>.component.ts     # Angular standalone component (UI state, Signals)
├── <tool-slug>.component.html   # Template using reusable components & BEM classes
├── <tool-slug>.component.scss   # Component styles (if specific) or relies on shared SASS
├── engine.ts                    # Pure client-side processing functions (zero Angular, zero DOM)
├── worker.ts                    # (Optional) Dedicated Web Worker for CPU workloads
├── types.ts                     # Types, options interface, default configs
└── <tool-slug>.component.spec.ts# Unit tests for component & privacy verification
```

### The `ToolDefinition` Interface (`src/app/core/models/tool.model.ts`):
```typescript
import { Type } from '@angular/core';

export type ToolCategory =
  | 'privacy'
  | 'documents'
  | 'media'
  | 'audio-video'
  | 'dev'
  | '3d';

export interface ToolDefinition {
  id: string;                                    // Unique slug (e.g., 'exif-stripper')
  name: string;                                  // Human-readable title
  category: ToolCategory;                        // Category grouping
  description: string;                           // Short 1-2 sentence description
  keywords: string[];                            // Search & SEO tags
  icon: string;                                  // Icon identifier
  isFullyClientSide: true;                       // Strict requirement: MUST be true
  loadComponent: () => Promise<Type<any>>;       // Dynamic import for Angular standalone component
}
```

---

## 8. Standard UI/UX Patterns for Reusable Components

Every tool in PrivKnife must present a predictable, high-polish user experience built with shared Angular components:

1. **Header & Privacy Indicator**:
   - Title, subtitle, and `<app-badge variant="privacy">` displaying `🛡️ 100% In-Browser • Never Leaves Your Device`.
2. **Input Zone (`<app-dropzone>`)**:
   - Drag-and-drop zone with accepted MIME types, file size warning, and file selection button.
   - For text tools (e.g. CSV, Hashes), provide code/text input area with sample data button.
3. **Configuration & Controls**:
   - Sliders, toggles, dropdowns styled with `.c-input` and `.c-input--*`.
4. **Live / Instant Preview (`<app-split-preview>`)**:
   - Real-time side-by-side or tabbed preview (Before vs. After, visual canvas, or 3D viewport).
5. **Output & Action Bar**:
   - Prominent **Download** `<app-button variant="primary">` with clear file extension and generated size.
   - **Copy to Clipboard** `<app-button variant="secondary">` where applicable.
   - **Reset / Clear** `<app-button variant="outline">` to dispose of memory and return to initial state.
6. **Progress & Status (`<app-progress-bar>`)**:
   - For operations taking >100ms, display deterministic progress with stage descriptions.

---

## 9. Security & Sandboxing Guidelines

### Content Security Policy (CSP)
PrivKnife enforces strict client-side containment:
- `connect-src 'self' blob: data:` (Blocks arbitrary external API requests).
- `script-src 'self' 'wasm-unsafe-eval'` (Permits WebAssembly execution while blocking remote scripts).
- `object-src 'none'`.

### User Input & DOM Sanitization
- When rendering user-supplied SVG or HTML (e.g., Email Signature, Markdown Cheatsheet), **ALWAYS sanitize with DOMPurify** before injecting into the DOM via Angular's `DomSanitizer`.
- Never use `eval()` or unsanitized `Function()` constructors.

### Large File Handling
- Enforce client-side safeguards (warn if a user drops a massive 2GB video into an in-memory trimmer).
- For files exceeding 100MB, use streaming or chunked processing via `ReadableStream` or file slice reading.

---

## 10. Agent Implementation Checklist

When creating a new tool or updating an existing one, AI agents MUST follow this checklist:

- [ ] **Step 1: Check Specification**: Review [`Documents/<Tool Name>/`](file:///home/deivision/Projects/Programming/PrivKnife/Documents) for requirements, libraries, and expected outputs.
- [ ] **Step 2: Engine Implementation (`engine.ts`)**:
  - Implement pure, decoupled functions that take inputs (`File`, `Blob`, `string`, `ArrayBuffer`) and return outputs (`Blob`, `string`).
  - No Angular or DOM dependencies inside `engine.ts`.
- [ ] **Step 3: Web Worker (if heavy)**:
  - If processing takes >50ms or uses WASM, wrap the engine in a Web Worker (`worker.ts`).
  - Implement message passing with typed requests and responses.
- [ ] **Step 4: Angular Standalone Component (`<tool-slug>.component.ts`)**:
  - Build UI using shared standalone components (`<app-dropzone>`, `<app-progress-bar>`, `<app-button>`).
  - Apply BEM styling with proper prefixes (`.c-*`, `.l-*`, `.g--*`).
  - Handle drag-and-drop, loading states, error states, and empty states using Angular Signals.
- [ ] **Step 5: Resource Cleanup**:
  - Verify every `URL.createObjectURL()` is matched with `URL.revokeObjectURL()`.
  - Clean up event listeners and worker instances in `ngOnDestroy`.
- [ ] **Step 6: Registration & Routing**:
  - Register the tool in `src/app/tools/tool-registry.ts` and add lazy route to `app.routes.ts`.
- [ ] **Step 7: Privacy Verification Test**:
  - Write a test verifying that the tool's engine processes input without triggering any network calls.

---

## 11. Coding Standards & Conventions

- **Framework**: Angular (latest version, Standalone Components, Signals).
- **Language**: TypeScript in strict mode (`"strict": true`).
- **Styling**: Modular SASS (`.scss`) with BEM (`c-`, `l-`, `g--`) following the referenced theory.
- **Icons**: Lucide icons (`lucide-angular`).
- **Git Commits**: Follow Conventional Commits:
  - `feat(tool-exif): add client-side metadata stripper`
  - `fix(pdf-merger): handle encrypted pdf error gracefully`
  - `docs: update tool status in README`
  - `perf(image-compressor): offload squoosh wasm to web worker`
  - `style(components): implement BEM c-button and c-dropzone in SASS`
