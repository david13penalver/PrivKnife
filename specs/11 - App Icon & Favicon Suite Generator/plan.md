# Architecture & TDD Plan: App Icon & Favicon Suite Generator

> **Tool**: `11 - App Icon & Favicon Suite Generator`  
> **Category**: `media`  
> **Route**: `/tools/favicon-app-icon-suite` (and alias `/tools/favicon-generator`)  
> **Architecture Rules**: 100% Client-Side, Zero Server Ingestion, Zero Telemetry, Standalone Angular Components, Signals Reactivity, BEM CSS, Strict Memory Hygiene, TDD.

---

## 1. Executive Summary & Deliverables

The **App Icon & Favicon Suite Generator** transforms a single high-resolution source image (PNG, SVG, JPG, WebP) into an asset package for modern websites, iOS devices, and Android PWAs:
- **Binary Multi-Resolution `.ico`**: Valid Windows/browser `.ico` file packing 16×16, 32×32, and 48×48 images.
- **Platform Icon PNGs**: `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `apple-touch-icon.png` (180×180), `android-chrome-192x192.png`, `android-chrome-512x512.png`.
- **Manifest & Config**: Valid `site.webmanifest` JSON and `browserconfig.xml`.
- **Live Real-Time Previews**:
  - Chrome / Safari Desktop Browser Tab (Dark & Light modes).
  - iOS Home Screen Squircle Mockup.
  - Android Adaptive Circle Launcher Mockup.
  - Google Search Result Snippet.
- **HTML `<head>` Code Generator**: Copy-ready HTML tags.
- **Export Deliverable**: Instant `.zip` download (`favicon-suite.zip`) compiled in-browser via `JSZip`.

---

## 2. Architecture & Seams Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Tool Registry & Routing                       │
│    (src/app/tools/tool-registry.ts + src/app/app.routes.ts)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Seam 3: Catalog & Route Integration)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    FaviconGeneratorComponent                           │
│  (src/app/tools/media/favicon-generator/favicon-generator.component.ts)│
│   - Split-screen / grid workspace with Drag & Drop ingestion           │
│   - Signals-driven config (Site Name, Theme Color, Padding)            │
│   - Interactive multi-platform preview mockups                         │
│   - HTML code snippet with 1-click copy                                │
│   - Strict memory hygiene via URL.revokeObjectURL() & ngOnDestroy      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Seam 2: Component UI & Signals)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Favicon Suite Engine                             │
│     (src/app/tools/media/favicon-generator/engine.ts)                  │
│   - Multi-resolution Canvas rendering with high-quality bicubic filter │
│   - Pure TypeScript binary .ico packager                               │
│   - site.webmanifest & HTML <head> snippet generation                  │
│   - In-memory JSZip archive builder                                    │
└────────────────────────────────────────────────────────────────────────┘
                                      (Seam 1: Pure Core Engine)
```

---

## 3. Test-Driven Development (TDD) Strategy

### Seam 1: Core Favicon Engine (`engine.spec.ts`)
- **Binary ICO Packager**:
  - `packIcoBinary`: takes 16x16 and 32x32 PNG byte buffers and generates valid `.ico` binary structure (0x0000 header, type 1, directory entries, image offsets).
- **Manifest & Markup Generation**:
  - `generateWebManifest`: produces valid JSON with icons array, theme color, display standalone.
  - `generateHtmlSnippet`: produces valid `<link>` and `<meta>` tags.
- **Suite Asset Generation**:
  - `generateFaviconSuite`: creates all standard sizes, `.ico`, manifest, and returns asset map.
- **ZIP Packaging**:
  - `createFaviconZip`: produces valid `.zip` Blob containing all icons and manifest.

### Seam 2: Component UI & Signals (`favicon-generator.component.spec.ts`)
- Initial default state with sample icon data or empty prompt.
- Ingesting a source image updates signals and generates platform previews.
- Customizing site name and theme color reactively updates manifest and HTML snippet.
- Copying HTML snippet triggers clipboard write.
- "Download All as ZIP" compiles `favicon-suite.zip`, triggers anchor download, and revokes object URL.
- Zero network requests verified (privacy guard).

### Seam 3: Catalog & Routing
- Registration in `TOOL_REGISTRY`.
- Route `/tools/favicon-app-icon-suite` (and alias `/tools/favicon-generator`).
- Update `home.ts` status to `'ready'`.
