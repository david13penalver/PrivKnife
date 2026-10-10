# 3D QR Stand & Keychain Generator

# Product Strategy & Technical Execution Specification

Document Owner: PersonLast Updated: DateTarget Keyword: qr code 3d print generator

# 1. MVP Generation Prompt (/create-web-micro-saas)

/create-web-micro-saas

Act as a Principal Full-Stack Engineer and UX Designer. Build a high-performance, single-page Web App for a "3D QR Stand & Keychain Generator".

TECHNICAL CONSTRAINTS & STACK:

### 1. Pure Client-Side Architecture: Zero backend endpoints, zero server rendering. All computations, geometry evaluations, and mesh generation must run entirely in the browser.

### 2. Core WebGL Engine: Three.js for 3D rendering and scene interaction.

### 3. CSG Engine: three-bvh-csg for real-time 3D Constructive Solid Geometry operations (unions and subtractions).

### 4. QR Generation: qrcode library to generate clean, high-correctness binary matrix arrays.

### 5. File Exporters: JSZip, 3MFExporter (or custom XML builder), STLExporter, and HTML5 Canvas API for high-resolution PNG generation.

KEY FEATURES & USER INTERACTION:

- Input Controls: Dynamic text/URL entry, QR error correction level (L/M/Q/H), base shape toggle (Desk Stand vs. Keychain Loop vs. Flat Plaque), and custom label/text extrusion below the QR code.

- Live 3D Viewport: Real-time interactive preview with OrbitControls, custom dual-color material preview (base color + contrast QR color), and automatic scannability indicator.

- Export System:

a) Dual-color .3mf file with separate mesh components for multi-color slicers (Bambu Studio, PrusaSlicer, OrcaSlicer).

b) Standard single/multi-mesh .stl file.

c) High-resolution 2000x2000 .png rendered directly from the Three.js viewport canvas.

DESIGN & UX GUIDELINES:

- Clean, modern, distraction-free aesthetic with Slate Navy and Soft Zinc tones.

- Mobile-first responsive layout with side-by-side controls and viewport on desktop.

- Integrated non-intrusive ad zones (Top Leaderboard banner slot and right sidebar ad container).

# 2. Concept Overview & Value Proposition

The 3D QR Stand & Keychain Generator is a lightweight, zero-friction web application that converts any web address, Wi-Fi password, social media profile, or text payload into a 3D-printable model. It produces dual-color .3mf models, standalone .stl meshes, and high-resolution raster .png previews directly inside the user's browser.+-----------------------------------------------------------------------+

|                         User Browser Interface                        |

|                                                                       |

|  [ URL Input ] -> [ qrcode Matrix ] -> [ CSG Mesh Geometry ]          |

|                                                      |                |

|                                                      v                |

|  [ High-Res PNG Preview ] <--- [ Three.js Viewport ]                  |

|                                                      |                |

|                                                      v                |

|  [ Dual-Color .3mf Export ] <--- [ Client-Side File Packaging ]       |

+-----------------------------------------------------------------------+

## Core Value Drivers

Instant Browser-Based Execution: Eliminates the steep learning curve of CAD software (Fusion 360, Blender) or slow OpenSCAD script compilation.

100% Data Privacy & Zero Latency: No file uploads or data transmission; all QR matrix generation and mesh rendering occur locally on the user's device.

Native Multi-Color Slicer Support: Modern 3D printing is dominated by multi-material systems (Bambu Lab AMS, Prusa MMU). Exporting discrete mesh groups within a .3mf archive allows users to assign colors with one click.

No Account Required: Immediate access without registration or paywalls, optimizing user flow and ad viewability metrics.

# 3. Technical Feasibility & Difficulty Score

Feasibility Rating: 8.5 / 10

Complexity Level: Moderate

Backend Requirement: No (100% Client-Side)

## Core Tech Stack

| Component | Technology / Library | Strategic Purpose |
| --- | --- | --- |
| Matrix Generation | qrcode | Encodes input strings into 2D boolean matrices with adjustable error correction levels. |
| 3D Rendering | Three.js | Renders lighting, shadows, materials, and provides OrbitControls for viewport interaction. |
| Boolean CSG Engine | three-bvh-csg | Performs fast spatial operations to extrude QR modules and fuse them onto baseplates or keychains. |
| Export Engines | 3MFExporter ,  STLExporter | Serializes 3D scene meshes into production-ready  .3mf  and  .stl  files. |
| Image Engine | HTML5 Canvas API | Captures viewport frames and renders high-density PNG graphic files. |


Component

Technology / Library

Strategic Purpose

Matrix Generation

qrcode

Encodes input strings into 2D boolean matrices with adjustable error correction levels.

3D Rendering

Three.js

Renders lighting, shadows, materials, and provides OrbitControls for viewport interaction.

Boolean CSG Engine

three-bvh-csg

Performs fast spatial operations to extrude QR modules and fuse them onto baseplates or keychains.

Export Engines

3MFExporter, STLExporter

Serializes 3D scene meshes into production-ready .3mf and .stl files.

Image Engine

HTML5 Canvas API

Captures viewport frames and renders high-density PNG graphic files.

## Execution Pipeline

Matrix Parsing: The user types a URL. The qrcode library returns a 2D boolean grid.

2D-to-3D Extrusion: Each dark module in the grid is combined into a single InstancedMesh or extruded ShapeGeometry to keep draw calls low.

Baseplate Fusion: three-bvh-csg executes a union operation joining the extruded QR modules, base plate, angled kickstand/keychain ring, and extruded subtext.

Color Separation: The baseplate geometry (Component A) and raised QR geometry (Component B) are tagged with independent material indices for the .3mf export engine.

# 4. Competitive Landscape & Market Positioning

Traditional QR code 3D print solutions rely on basic OpenSCAD scripts, which require software downloads, or generic black-and-white image-to-STL converters that produce flat, non-optimized single-color models.

## Matrix of Solutions

| Solution | Dual-Color .3mf Support | Live 3D Preview | Mobile Friendly | Zero Install |
| --- | --- | --- | --- | --- |
| Our MicroSaaS Tool | Yes (Native) | Yes (Interactive) | Yes | Yes (100% Web) |
| OpenSCAD Scripts | Manual setup | No | No | No |
| Standard Image-to-STL | No (Single Mesh) | Basic | Partial | Yes |
| Desktop CAD (Fusion 360) | Manual grouping | Manual render | No | No |


Solution

Dual-Color .3mf Support

Live 3D Preview

Mobile Friendly

Zero Install

Our MicroSaaS Tool

Yes (Native)

Yes (Interactive)

Yes

Yes (100% Web)

OpenSCAD Scripts

Manual setup

No

No

No

Standard Image-to-STL

No (Single Mesh)

Basic

Partial

Yes

Desktop CAD (Fusion 360)

Manual grouping

Manual render

No

No

## Positioning Strategy

By capturing organic search intent around qr code 3d print generator, the platform serves makers, small business owners (restaurants, cafes, markets), and Etsy sellers seeking printable desktop QR display stands without CAD overhead.

# 5. Traffic & Audience Acquisition Strategy

Organic Search (SEO) --------+

|

3D Model Repositories ------+---> [ MicroSaaS Web App ] ---> Ad Revenues &

|                               Paid Reinvestment

Etsy / Print Community -----+

## 1. Organic SEO Strategy

Target Primary Keyword: qr code 3d print generator.

Secondary Keyword Clusters: 3d printable qr code stand, custom wifi qr keychain stl, bambu lab multi color qr code generator, dual color qr 3mf.

Programmatic Content Landing Pages: Build targeted programmatic pages for specific use-cases:

/generate/wifi-stand-3d

/generate/instagram-keychain-stl

/generate/table-tent-qr-3mf

## 2. Community Distribution (Maker Ecosystem)

Model Repository Publishing: Publish pre-rendered 3D models on Printables, MakerWorld, and Thingiverse with embedded links back to the interactive generator tool for customization.

Niche Communities: Share user-generated examples on relevant subreddits (r/3Dprinting, r/BambuLab, r/EtsySellers) showing live multi-color prints.

## 3. Paid Acquisition & Reinvestment Engine

Paid Reinvestment Engine: Direct 30% of monthly Google AdSense earnings into targeted search ads targeting high-conversion commercial terms like "custom restaurant QR stands" and "3D printed business cards".

# 6. Revenue Projections & Financial Model

Since the application runs 100% on the client side, hosting costs remain virtually non-existent (served via free edge networks such as Vercel, Cloudflare Pages, or Netlify). This yields profit margins exceeding 95%.

## Financial Projections (AdSense + Optional Donations)

| Metric | Phase 1 (5k MAU) | Phase 2 (25k MAU) | Phase 3 (100k MAU) | Phase 4 (500k MAU) |
| --- | --- | --- | --- | --- |
| Monthly Active Users (MAU) | 5,000 | 25,000 | 100,000 | 500,000 |
| Pageviews (2.5x sessions) | 12,500 | 62,500 | 250,000 | 1,250,000 |
| Ad Impressions (3 per page) | 37,500 | 187,500 | 750,000 | 3,750,000 |
| Estimated eCPM | $12.00 | $14.00 | $16.00 | $18.00 |
| Gross Monthly Revenue | $450.00 | $2,625.00 | $12,000.00 | $67,500.00 |
| Infrastructure Overhead | $0.00 | $0.00 | $15.00 | $50.00 |
| Net Monthly Profit | $450.00 | $2,625.00 | $11,985.00 | $67,450.00 |


Metric

Phase 1 (5k MAU)

Phase 2 (25k MAU)

Phase 3 (100k MAU)

Phase 4 (500k MAU)

Monthly Active Users (MAU)

5,000

25,000

100,000

500,000

Pageviews (2.5x sessions)

12,500

62,500

250,000

1,250,000

Ad Impressions (3 per page)

37,500

187,500

750,000

3,750,000

Estimated eCPM

$12.00

$14.00

$16.00

$18.00

Gross Monthly Revenue

$450.00

$2,625.00

$12,000.00

$67,500.00

Infrastructure Overhead

$0.00

$0.00

$15.00

$50.00

Net Monthly Profit

$450.00

$2,625.00

$11,985.00

$67,450.00

# 7. Strategic Ad Placement & Monetization Layout

The advertising UI layout prioritizes viewability and impression depth without obstructing the 3D viewport or rendering canvas.+-----------------------------------------------------------------------+

|  [HEADER LOGO]               [AD SLOT A: 728x90 Leaderboard Banner]    |

+-----------------------------------------------------------------------+

|  INPUT CONTROLS           |  LIVE THREE.JS 3D VIEWPORT                |

|                           |                                           |

|  - URL String             |  [ Interactive 3D Model ]                 |

|  - Stand Type             |                                           |

|  - Subtext                |                                           |

|                           |                                           |

|  -----------------------  +-------------------------------------------+

|  [AD SLOT B: 300x250      |  [EXPORT BUTTONS: .3MF / .STL / .PNG]     |

|   Sticky Medium Rectangle]|  (Triggers AD SLOT C: Interstitial / Modal) |

+-----------------------------------------------------------------------+

## Strategic Ad Units

Ad Slot A (Top Leaderboard - 728x90 / 320x50): Placed directly above the main title and primary configuration area. Guarantees 100% initial viewability.

Ad Slot B (Sticky Sidebar Rectangle - 300x250): Positioned directly beneath the primary adjustment controls. Remains visible while users tune dimensions and rotation parameters.

Ad Slot C (Download Interstitial Unit): Prompted when the user clicks "Export .3mf". Displays a brief loading visualizer while preparing the geometry, serving a high-eCPM interstitial ad frame.

# 8. Risks, Vulnerabilities & Future Expansion

## Technical Risks & Mitigations

QR Code Unscannability: Low layer resolution or improper nozzle extrusion widths can cause 3D printed QR codes to fail to scan.

Mitigation: Enforce a minimum physical block size parameter (e.g., min 1.6mm per module) and build a real-time "Scannability Checker" into the Three.js viewport using an embedded client-side vision library (jsQR).

Browser Memory Exhaustion: Heavy CSG boolean operations on high-density QR grids can strain mobile devices.

Mitigation: Offload CSG boolean calculations to a Web Worker thread using offscreen canvas logic to prevent UI thread freezing.

## Future Expansion Roadmap

Vector & Asset Branding: Allow users to upload custom .svg vector logos to extrude onto the back or header of the stand.

Smart Chip Physical Recesses: Add preset cutouts for standard NFC coin tags (25mm) inside the baseplate geometry for tap-to-pay/tap-to-follow functionality.

Bulk Batch Generation: Provide a CSV importer to generate zips containing hundreds of distinct table tent STL files for large event venues.
