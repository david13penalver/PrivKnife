# Implementation Plan: App Screenshot Mockup Studio

> **Tool**: `23 - App Screenshot Mockup Studio`  
> **Route**: `/tools/screenshot-mockup` (with aliases `/tools/app-screenshot-studio`, `/tools/device-mockup`)  
> **Category**: `media`  
> **Engine Path**: `src/app/tools/media/screenshot-mockup/`  
> **Standard**: Standalone Component • Angular Signals • BEM SASS • Pure Client-Side HTML5 Canvas 2D/2.5D Perspective Engine • 100% In-Browser • Zero Telemetry

---

## 1. Overview & Architecture

The **App Screenshot Mockup Studio** enables developers, designers, and marketers to transform flat mobile and web screenshots into high-fidelity, angled 3D device mockups with realistic drop shadows, glass sheen reflections, metallic chassis accents, and gradient backgrounds.

### Core Value Pillars
- **Zero Server Uploads & Zero Telemetry**: Screenshots never leave the user's browser, safely protecting unreleased apps, private client designs, and proprietary interfaces.
- **Instant Client-Side Canvas Engine**: Pure HTML5 2D/2.5D Canvas perspective matrix transform compositing. No heavy external 1MB+ 3D engine overhead, no WebGL context loss risks on low-tier mobile devices, and zero COOP/COEP dependencies.
- **Multiple Device Archetypes**: Smartphone (iPhone/Dynamic Island), Tablet, Laptop (MacBook style), and Browser Window (macOS Safari traffic lights).
- **High-DPI Retina Export**: Crisp 1x, 2x, and 4x PNG and WebP exports with optional transparent alpha cutout support.

---

## 2. Directory Structure

```
src/app/tools/media/screenshot-mockup/
├── types.ts                         # Device types, angle presets, background styles, config interface
├── test-fixtures.ts                 # Synthetic screenshot images, default configs, sample app designs
├── engine.ts                        # Pure rendering functions: perspective math, frame drawing, shadows, gradients
├── engine.spec.ts                   # Unit tests for projection math, dimensions, presets, frame layout
├── screenshot-mockup.component.ts   # Angular standalone component with Signals, live canvas preview, control deck
├── screenshot-mockup.component.spec.ts # Component tests (file loading, preset changes, export, privacy guard)
└── index.ts                         # ToolDefinition export for TOOL_REGISTRY
```

---

## 3. Core Technical Seams

### Seam 1: Mathematical 2.5D Perspective & Projection (`engine.ts`)
- Perspective affine projection mapping points `(x, y)` to transformed coordinates based on yaw, pitch, roll, and elevation.
- Viewport and canvas scaling preserving device aspect ratios within requested export bounds (1:1, 16:9, 9:16, 4:3).
- Metallic device chassis rendering with rounded rectangle clip paths, gradient bevel rims, Dynamic Island pill cutout, camera sensors, and speaker ear-pieces.
- Realistic layered drop shadows: multi-stage Gaussian offset blur with ambient ground contact shadow.
- Glass sheen reflection overlay: linear diagonal specular glare with adjustable opacity.

### Seam 2: Image Fitting & Texture Compositing (`engine.ts`)
- Dynamic aspect ratio handling: scale and fit/crop user screenshot onto device screen bounds (`contain`, `cover`, `stretch`).
- Fallback synthetic app screenshot generator for instant preview and preset testing.

### Seam 3: Angular Standalone Component UI (`screenshot-mockup.component.ts`)
- Angular Signals for state reactivity (`deviceType`, `anglePreset`, `chassisColor`, `backgroundStyle`, `shadowIntensity`, `glareOpacity`, `exportScale`).
- Interactive live Canvas preview with responsive redraw on state updates.
- Dropzone for local screenshot files (`.png`, `.jpg`, `.webp`, `.svg`).
- One-click angle presets: `Front`, `Isometric Left`, `Isometric Right`, `Dynamic Tilt`, `Float`.
- Export options: PNG with transparent background option, WebP, 1x/2x/4x multipliers.
- Built-in sample presets for instant demonstration.

### Seam 4: Platform Wiring & Integration
- Route `/tools/screenshot-mockup` with aliases in `app.routes.ts`.
- Registration in `TOOL_REGISTRY` (`tool-registry.ts` and `tool-registry.spec.ts`).
- Catalog entry in `home.ts`.
- Roadmap index updated in `specs/README.md`.
