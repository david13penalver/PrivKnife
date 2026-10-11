# Architecture & TDD Plan: Foldable Table Tent & Counter Sign Maker

> **Tool**: `09 - Foldable Table Tent & Counter Sign Maker`  
> **Category**: `documents`  
> **Route**: `/tools/table-tent-maker` (and alias `/tools/table-tent`)  
> **Architecture Rules**: 100% Client-Side, Zero Server Ingestion, Zero Telemetry, Standalone Angular Components, Signals Reactivity, BEM CSS, Strict Memory Hygiene, TDD.

---

## 1. Executive Summary & Deliverables

The **Foldable Table Tent & Counter Sign Maker** enables businesses, restaurants, event hosts, and hotels to generate print-ready, double-sided folding table signs directly in their browser.
- **Physical Output**: High-resolution vector PDF in standard **A4** (210 × 297 mm) and **US Letter** (215.9 × 279.4 mm).
- **Mechanical Precision**: Automatic **180° rotation** for the top panel, dashed fold crease guides, and trim/cut corner marks.
- **Folding Configurations**:
  1. **Bi-Fold V-Card**: Two mirrored or independent faces meeting at a central fold crease.
  2. **Tri-Fold Triangular Prism**: Face A, Face B, and a bottom base/glue flap that folds underneath to form a standing triangular tent.
- **Panel Elements**: Header, Subtitle, Body/Instructions, Large Table Number badge, Vector QR Code (for menus, reviews, Wi-Fi), and venue Logo uploader.

---

## 2. Architecture & Seams Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Barcode / Tool Registry                       │
│    (src/app/tools/tool-registry.ts + src/app/app.routes.ts)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Seam 3: Integration)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       TableTentMakerComponent                          │
│     (src/app/tools/documents/table-tent-maker/table-tent-maker.component.ts) │
│   - Split-screen UI with live 2D SVG/CSS simulated folded sheet        │
│   - Signals-driven presets & panel state management                    │
│   - Memory hygiene: immediate URL.revokeObjectURL()                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Seam 2: Component & Signals)
┌───────────────────────────────────▼────────────────────────────────────┐
│                          Table Tent Engine                             │
│     (src/app/tools/documents/table-tent-maker/engine.ts)               │
│   - Millimeter geometry calculation for Bi-Fold and Tri-Fold           │
│   - Vector rendering with rotated graphics in jsPDF                    │
│   - Instant QR code matrix generation via qrcode                       │
│   - Dashed fold lines & trim marks                                     │
└────────────────────────────────────────────────────────────────────────┘
                                      (Seam 1: Pure Core Engine)
```

---

## 3. Test-Driven Development (TDD) Strategy

### Seam 1: Core Engine (`engine.spec.ts`)
- **Geometry**:
  - Exact panel division for A4 and US Letter in landscape and portrait.
  - Bi-fold 50/50 split and Tri-fold 3-panel split with base flap.
- **QR Code**:
  - Data URL generation for menu links and Wi-Fi strings.
- **PDF Generation**:
  - Valid PDF output buffer & blob.
  - Verification of fold lines, cut marks, inverted 180° panel orientation.

### Seam 2: Component UI & Signals (`table-tent-maker.component.spec.ts`)
- Initial default state with sample restaurant preset.
- Switching paper size (A4 vs Letter) and fold type (Bi-fold vs Tri-fold).
- Updating text fields, table numbers, QR URL, and logo image.
- "Mirror Front to Back" toggle functionality.
- Download PDF triggers anchor click and immediately revokes object URL.
- Zero network requests privacy verification (spy on `fetch` and `XMLHttpRequest`).

### Seam 3: Catalog & Routing
- Registration in `TOOL_REGISTRY`.
- Lazy routes in `app.routes.ts`.
- Status set to `'ready'` in `home.ts`.
