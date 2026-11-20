# PrivKnife — Proposed Tool Expansion Roadmap (Batch 3)

> **Architectural Mandate**: Every tool proposed in this document strictly adheres to PrivKnife's core philosophy: **"Privacy by Architecture, Not by Policy."** All processing executes **100% client-side** inside Web Workers or browser APIs (WASM, `pdf-lib`, `PDF.js`, `Three.js`, Web Crypto, Canvas) with zero server ingestion and zero telemetry.

---

## 1. Baseline Inventory: Already Developed Tools (60 Tools)

Before proposing new tools, below is the categorized inventory of the **60 tools already implemented** in PrivKnife (`src/app/tools/tool-registry.ts`):

### 📄 Documents & PDFs (11 Built — incl. Privacy PDFs)
- **PDF Merger, Splitter & Page Organizer** (`pdf-merger-splitter`) — Covers *Merge PDF*, *Split PDF*, *Remove/Extract Pages*, *Organize PDF*, and *Rotate PDF*.
- **Client-Side PDF Signer, Date Stamper & Initials** (`pdf-signer-stamper`) — Covers *Sign PDF* and date/initials stamping.
- **PDF Redaction & Anonymizer** (`pdf-redaction`, under `privacy`) — Covers *Redact PDF* and metadata stripping.
- **Local OCR Image & Scanned PDF to Text/Word** (`local-ocr-text-extractor`) — Covers *OCR PDF* to text/DOCX.
- **Markdown to Academic / Tech PDF Cheatsheet** (`markdown-cheatsheet`) — Covers Markdown/code to structured PDF.
- **Instant Client-Side Invoice & Receipt Maker** (`invoice-receipt-maker`)
- **Custom Printable Graph & Dot Grid Paper** (`graph-dot-grid-paper`)
- **Avery Barcode & Label Sheet Generator** (`avery-barcode-sheet`)
- **Foldable Table Tent & Counter Sign Maker** (`table-tent-maker`)
- **FDA / EU Nutrition Facts & Supplement Label Maker** (`nutrition-label-maker`)
- **Interactive 2D Floor Plan & Room Furniture Scaler** (`floor-plan-furniture-scaler`)

### 💻 Developer & Data Utilities (13 Built — incl. Crypto/Privacy)
- **Cryptographic Hash & UUID Batch Generator** (`crypto-hash-uuid`, under `privacy`) — Covers *Hash Generator (MD5, SHA-1, SHA-256, SHA-512)* and *UUID Generator*.
- **CSV / Excel to JSON, SQL & Markdown Converter** (`csv-to-sql-json`)
- **Side-by-Side Code & Contract Diff Checker** (`diff-checker`) — Covers *Diff Checker*.
- **Color Palette Extractor & Contrast Checker** (`color-palette-extractor`) — Partially covers *Color Converter* & WCAG contrast.
- **CSS Mesh Gradient & Glassmorphism Code Maker** (`css-mesh-gradient-maker`)
- **SVG Optimizer, Path Cleaner & React/Vue Exporter** (`svg-optimizer-cleaner`)
- **Web Font Subsetter & TTF/OTF to WOFF2 Converter** (`font-subsetter-converter`)
- **Robots.txt & XML Sitemap Builder** (`robots-sitemap-builder`)
- **Global DNS Propagation & WHOIS Checker** (`dns-checker`)
- **Universal Event & .ics Calendar Linker** (`calendar-linker`)
- **HTML Email Signature Generator** (`email-signature-generator`)
- **Bank Statement CSV / OFX to Excel & QIF Converter** (`bank-statement-converter`)
- **CSV / Paste to Vector Chart & Infographic Builder** (`csv-vector-chart-builder`)

### 🧊 3D Printing & Parametric Generators (15 Built)
- **Geometric Plant Pot & Self-Watering Planter** (`geometric-plant-pot`) — Faceted, twisted, or ribbed plant pots with sub-irrigation reservoir inserts, wick slots, and drip saucers.
- **3D QR Stand & Keychain Generator** (`3d-qr-stand`) — Covers 3D QR & barcode plates.
- **Custom Cookie Cutter & Stamp 3D Maker** (`cookie-cutter-3d`)
- **Parametric Desk Wedge & Nameplate Maker** (`desk-wedge-nameplate`)
- **3D Parametric Lamp & Lampshade Designer** (`parametric-lamp-designer`)
- **Curved & Flat 3D Lithophane Maker** (`lithophane-maker`)
- **Gridfinity & Modular Drawer Bin Generator** (`gridfinity-bin-generator`)
- **Parametric Electronics Box & Snap-Fit Enclosure** (`electronics-box-enclosure`)
- **Under-Desk Clamp & Cable Management Generator** (`under-desk-clamp-generator`)
- **IKEA Skadis & Pegboard Hook/Holder Maker** (`skadis-pegboard-maker`)
- **Honeycomb Storage Wall (HSW) Insert & Adapter** (`hsw-insert-adapter`)
- **Braille & ADA Tactile Door Sign Generator** (`braille-ada-sign-generator`)
- **Custom Mechanical Keycap & Switch Tester Maker** (`keycap-switch-tester-maker`)
- **Cappuccino Stencil & Airbrush Template Maker** (`cappuccino-stencil-maker`)
- **Pet ID Tag & Collar Slide-On Generator** (`pet-id-tag-generator`)

### 🖼️ Media, Audio/Video & Privacy (21 Built)
- **Media (9)**: `batch-image-compressor`, `favicon-app-icon-suite`, `og-card-maker`, `screenshot-mockup`, `subtitles-shifter`, `passport-biometric-photo`, `heic-avif-converter`, `seamless-texture-generator`, `background-remover`.
- **Audio/Video (5)**: `audio-bpm-detector`, `soundwave-art-maker`, `video-to-gif`, `audio-trimmer-booster`, `video-compressor-resizer`.
- **Privacy (7)**: `exif-stripper`, `crypto-hash-uuid`, `pdf-redaction`, `face-plate-blur`, `file-encryptor-vault`, `pii-scrubber-anonymizer`, `emergency-recovery-kit`.

---

## 2. Proposed PDF Tools (Inspired by iLovePDF)

By comparing iLovePDF's complete catalog against PrivKnife's existing PDF tools (`pdf-merger-splitter`, `pdf-signer-stamper`, `pdf-redaction`, `local-ocr-text-extractor`), the following **11 high-value client-side PDF tools** fill every remaining gap while staying 100% in-browser:

| # | Proposed Tool Name | Suggested Slug | iLovePDF Equivalent | Core Client-Side Tech Stack | Key Features & Deliverables |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Client-Side PDF Compressor & Image Downsampler** | `pdf-compressor` | Compress PDF | `pdf-lib`, `PDF.js`, `OffscreenCanvas` (Web Worker) | Re-compresses embedded JPEG/PNG streams inside PDFs, strips unused objects/fonts, and offers presets (*Extreme*, *Recommended*, *Low Compression*) with before/after byte savings. |
| **2** | **PDF Watermark, Page Numbers & Bates Stamper** | `pdf-watermark-numbering` | Add Watermark + Add Page Numbers | `pdf-lib`, `@pdf-lib/fontkit` | Stamp diagonal/tiled text or image logos with opacity, rotation, and layer control (over/under content). Includes automatic page numbering (`Page X of Y`) and legal/medical Bates numbering. |
| **3** | **PDF to Images & Images to PDF Studio** | `pdf-image-converter` | PDF to JPG + JPG to PDF + Scan to PDF | `PDF.js` (Canvas rendering), `pdf-lib`, `JSZip` | Bidirectional converter: render PDF pages to high-DPI `.jpg` / `.png` / `.webp` packaged in a `.zip`, OR combine photos/scans into a multi-page PDF with perspective crop, margin, and page size (A4/Letter) controls. |
| **4** | **PDF Password Protector & Unlocker** | `pdf-password-security` | Protect PDF + Unlock PDF | `qpdf-wasm` or `muhammara.js` (WASM) in Web Worker | Encrypt PDFs with AES-256 user/owner passwords and granular permission flags (disable printing, copying, or form filling), or strip restrictions from PDFs when the user supplies the known password. |
| **5** | **PDF Margin Cropper, Resizer & N-Up Booklet Maker** | `pdf-cropper-booklet` | Crop PDF | `pdf-lib`, `PDF.js` | Visually draw crop boxes (`CropBox` / `MediaBox`) with live page overlays, auto-trim white margins, normalize mixed page sizes to A4/Letter, or impose pages into 2-up/4-up printable saddle-stitch booklets. |
| **6** | **Interactive PDF Form Filler, Creator & Flattener** | `pdf-form-studio` | Edit PDF (Forms) | `pdf-lib` (`PDFForm`), `PDF.js` | Fill existing AcroForm fields (text inputs, checkboxes, radio buttons, dropdowns), create new interactive form fields from scratch, or flatten filled forms into static tamper-proof pages. |
| **7** | **Visual PDF Comparison & Overlay Diff Tool** | `pdf-visual-compare` | Compare PDF | `PDF.js`, HTML5 Canvas pixel-diff (`pixelmatch`) + text diff | Compare two versions of a contract or blueprint side-by-side. Offers both **Visual Overlay Mode** (highlights shifted lines/drawings in red/green) and **Extracted Text Diff Mode**. |
| **8** | **PDF to Excel, CSV & JSON Table Extractor** | `pdf-table-extractor` | PDF to Excel | `PDF.js` (spatial X/Y text clustering), `SheetJS (xlsx)` | Detects tabular coordinate grids in invoices, financial reports, and data sheets without OCR when vector text exists. Exports cleanly to `.xlsx`, `.csv`, or `.json`. |
| **9** | **PDF to Word (DOCX) & Markdown Layout Converter** | `pdf-to-word-markdown` | PDF to Word + PDF to Markdown | `PDF.js`, `docx` (JS library) | Analyzes font sizes, weights, and bounding boxes to reconstruct headings, paragraphs, lists, and embedded images into an editable `.docx` file or structured `.md` document. |
| **10** | **Office & HTML to PDF Local Converter** | `office-html-to-pdf` | Word / Excel / HTML to PDF | `mammoth.js`, `SheetJS`, `pdf-lib` / `html2pdf` | Convert `.docx`, `.xlsx`, and `.html` files into clean PDFs locally inside the browser without uploading sensitive corporate documents to cloud conversion servers. |
| **11** | **PDF Structural Repair, Metadata Editor & PDF/A Archiver** | `pdf-repair-metadata` | Repair PDF + PDF to PDF/A | `qpdf-wasm`, `pdf-lib` | Rebuild broken XRef tables in corrupted PDFs, inspect/edit XMP & document info metadata (`Title`, `Author`, `Keywords`), and embed sRGB color profiles for archival compliance. |

---

## 3. Proposed Developer Tools (Inspired by Coddy.tech/tools)

Comparing [coddy.tech/tools](https://coddy.tech/tools) against PrivKnife's existing `dev` and `privacy` categories shows that **Hash Generator**, **UUID Generator**, **Diff Checker**, **Markdown Cheatsheet**, and **3D QR Generator** are already covered. We can consolidate the remaining Coddy utilities into **9 comprehensive, zero-telemetry developer suites**:

| # | Proposed Tool Name | Suggested Slug | Coddy.tech Tools Covered | Core Client-Side Tech Stack | Key Features & Deliverables |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **JSON, SQL & YAML Formatter, Validator & Type Generator** | `json-sql-formatter` | JSON Formatter + SQL Formatter | `sql-formatter`, native JSON/Tree parser, Web Worker | Beautify, minify, and validate JSON, SQL (PostgreSQL, MySQL, SQLite dialects), and YAML. Includes JSONPath querying and 1-click generation of TypeScript interfaces / Zod schemas from JSON. |
| **2** | **Interactive Regex Tester, Debugger & Explainer** | `regex-tester-debugger` | Regex Tester | Native `RegExp` in Web Worker (with ReDoS timeout guard) | Live match highlighting, capture group extraction table, replacement preview, human-readable AST explanation of every regex token, and a library of common patterns (email, IPv6, credit card, semver). |
| **3** | **JWT Debugger, Signature Verifier & Token Minting Studio** | `jwt-debugger-studio` | JWT Decoder | Web Crypto API (`SubtleCrypto`), Base64Url | Decode JWT header & payload, inspect expiration (`exp`/`iat`/`nbf`) with human countdowns, **verify HMAC (HS256/384/512) and RSA/ECDSA signatures locally**, and mint test JWTs for local development. |
| **4** | **Universal Encoder / Decoder Workbench (Base64, URL, Binary, Morse)** | `encoder-decoder-workbench` | Base64 Encoder/Decoder + URL Encoder/Decoder + Binary Translator + Morse Code Translator | Native `TextEncoder`, `FileReader`, Web Audio API | All-in-one encoding pipeline: Base64 (text & file data-URI), URL/Query parameter parser, Hex, HTML Entities, Binary/ASCII translator, and Morse Code translator (with Web Audio CW tone playback!). |
| **5** | **Cron Expression Builder, Human Explainer & Schedule Simulator** | `cron-expression-studio` | Cron Expression Generator / Parser | `cron-parser`, `cronstrue` | Interactive 5-field (standard) and 6-field (seconds/Quartz) cron builder. Translates cron syntax into plain English/Spanish and simulates the next 20 execution timestamps across any IANA timezone. |
| **6** | **Unix Epoch, ISO-8601 & Multi-Timezone Timestamp Converter** | `timestamp-timezone-converter` | Timestamp Converter | Native `Intl.DateTimeFormat`, `Temporal`-ready math | Convert between Unix seconds, milliseconds, nanoseconds, ISO-8601, RFC-2822, and Discord dynamic timestamp tags (`<t:...:R>`). Includes batch log timestamp conversion and duration delta calculator. |
| **7** | **Cryptographic Password, Passphrase & API Key Generator** | `password-passphrase-generator` | Password Generator | `crypto.getRandomValues()`, EFF Diceware wordlist | Generate high-entropy passwords, memorable EFF Diceware passphrases, `.env` secrets, and WPA2 keys. Displays real-time Shannon entropy (bits), offline crack-time estimation, and batch export. |
| **8** | **String Case, Text Transform & Unicode Typography Studio** | `case-unicode-text-studio` | Case Converter + Fancy Text / Font Generator + Glitch Text (Zalgo) + Kaomoji | Pure TypeScript string transformers | Convert identifiers between `camelCase`, `PascalCase`, `snake_case`, `kebab-case`, `SCREAMING_SNAKE_CASE`, and `Title Case`. Includes Unicode font math styles, configurable Zalgo glitch text, and searchable Kaomoji picker. |
| **9** | **ASCII Art Banner, Diagram & 2D QR/Barcode Studio** | `ascii-art-qr-studio` | ASCII Art Generator + QR Code Generator | `figlet.js`, HTML5 Canvas luminance mapper, `qrcode` | Generate FIGlet source-code header banners, convert images into colored/monochrome ASCII or Braille Unicode art, and create customizable 2D SVG/PNG QR codes (Wi-Fi, vCard, URL) with custom finder eyes and logos. |

---

## 4. Proposed 3D Printing & Parametric Generators

### Review of Existing 3D Printing Tools (15 Built)
PrivKnife already has an impressive suite of 15 parametric `.stl` / `.3mf` generators:
1. `geometric-plant-pot` (*Geometric Plant Pot & Self-Watering Planter*)
2. `3d-qr-stand` (*3D QR Stand & Keychain Generator*)
3. `cookie-cutter-3d` (*Custom Cookie Cutter & Stamp 3D Maker*)
4. `desk-wedge-nameplate` (*Parametric Desk Wedge & Nameplate Maker*)
5. `parametric-lamp-designer` (*3D Parametric Lamp & Lampshade Designer*)
6. `lithophane-maker` (*Curved & Flat 3D Lithophane Maker*)
7. `gridfinity-bin-generator` (*Gridfinity & Modular Drawer Bin Generator*)
8. `electronics-box-enclosure` (*Parametric Electronics Box & Snap-Fit Enclosure*)
9. `under-desk-clamp-generator` (*Under-Desk Clamp & Cable Management Generator*)
10. `skadis-pegboard-maker` (*IKEA Skadis & Pegboard Hook/Holder Maker*)
11. `hsw-insert-adapter` (*Honeycomb Storage Wall Insert & Adapter*)
12. `braille-ada-sign-generator` (*Braille & ADA Tactile Door Sign Generator*)
13. `keycap-switch-tester-maker` (*Custom Mechanical Keycap & Switch Tester Maker*)
14. `cappuccino-stencil-maker` (*Cappuccino Stencil & Airbrush Template Maker*)
15. `pet-id-tag-generator` (*Pet ID Tag & Collar Slide-On Generator*)

### High-Utility Everyday Parametric 3D Printing Generators (12 New Proposals)
Keeping **Parametric Battery Dispenser & Memory Card Case Maker** (`battery-sdcard-case-maker`) as the flagship storage generator, this revised lineup replaces decorative or niche ideas with **caliper-driven, support-free functional prints** built around exact real-world dimensions, clearance tolerances, and zero overlap with the 15 existing 3D tools:

| # | Proposed Tool Name | Suggested Slug | Sub-Category | Core Client-Side Tech Stack | Key Features & Parametric Controls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Parametric Battery Dispenser & Memory Card Case Maker** | `battery-sdcard-case-maker` | 🔋 Storage & EDC | `Three.js`, snap-hinge & print-in-place tolerances | Generate gravity-fed AA/AAA/CR2032/9V/18650/21700 battery dispensers (desk or wall/Skadis mounted) & compact snap-shut or sliding cases with custom slots for SD, MicroSD, CFexpress cards, game cartridges, and USB flash drives. |
| **2** | **Parametric Rugged Hinged Storage Box & Parts Organizer** | `rugged-hinged-box-maker` | 🧰 Cases & Storage | `Three.js`, `three-bvh-csg`, compliant latch & hinge generator | Custom internal `L × W × H` hinged carry boxes with compliant snap latches, optional TPU seal groove, print-in-place or M3-pin hinges, and configurable fixed/removable internal divider grids. |
| **3** | **Parametric Custom Drawer Divider & Interlocking Grid Maker** | `drawer-divider-grid-maker` | 🗄️ Home Organization | `Three.js`, CSG notches & dovetail bed splitter | Exact-fit wall-to-wall drawer partition grids for non-Gridfinity drawers (`L × W × H` + custom row/column splits) with automatic dovetail or puzzle bed-splitting for oversized drawers. |
| **4** | **Parametric Tool, Drill Bit, Hex Key & Nozzle Organizer Maker** | `tool-bit-holder-maker` | 🔧 Workshop & Tools | `Three.js`, `opentype.js` (dual-color `.3mf`) | Multi-row stepped stadium racks with caliper-exact hole diameters and depths for drill bits, 1/4" hex driver bits, Allen keys, screwdrivers, or 3D printer nozzles, plus embossed size labels and bottom magnet recesses. |
| **5** | **Parametric Washer, Spacer, Standoff, Shim & Bushing Maker** | `washer-spacer-shim-maker` | 🔩 Precision Hardware | `Three.js`, procedural lathe & plate array tiling | Instant custom-tolerance washers, flanged bushings, stepped VESA/PCB standoffs, and angled leveling wedges/shims (exact OD, ID, height, outer chamfer) with multi-copy build-plate array export. |
| **6** | **Parametric Replacement Knob, Dial & Captive-Nut Thumbscrew Maker** | `knob-dial-handwheel-maker` | 🎛️ Repair & Hardware | `Three.js`, CSG shaft bores & hex nut pockets | Custom appliance, audio, tripod, and workshop knobs/thumbscrews supporting D-shafts, knurled/splined shafts, set-screw collars, and captive hex nut or bolt-head pockets with knurled, fluted, or star-lobe grips and dual-color indicator marks. |
| **7** | **Parametric Device Wall Mount & Power-Brick Cradle Maker** | `device-wall-cradle-maker` | 🖥️ Desk & Home Tech | `Three.js`, perforated rib & mount generator | Exact-dimension under-desk slide rails, ventilated wall cradles, and remote holders for routers, mini-PCs, USB hubs, Apple TVs, and laptop power bricks with port cutouts, cable reliefs, and countersunk screw or adhesive mounts. |
| **8** | **Parametric Cable Comb, Travel Cord Winder & Wall Clip Maker** | `cable-comb-clip-maker` | 🔌 Cable Management | `Three.js`, extrusion & snap-flex clip math | Wire-diameter-calibrated (`2.5–12 mm`) desk cable combs with retention lips, compact travel cord winders with plug-end locks, and single- or multi-channel screw or adhesive P-clips. |
| **9** | **Parametric Air-Vented Funnel & Exact-Volume Measuring Scoop Maker** | `funnel-scoop-maker` | 🧪 Utility & Kitchen/Lab | `Three.js`, revolved profile & exact volume solver | Exact bottle-neck funnels with anti-airlock external vent ribs and mathematically calibrated volumetric scoops (`5–250 mL`) with dual-color `.3mf` embossed volume markings and ergonomic handle fillets. |
| **10** | **Parametric Threaded Storage Tube, Pill Organizer & Desiccant Pod Maker** | `threaded-tube-pill-organizer` | 💊 Travel & Filament Care | `Three.js`, ISO metric helix thread & dovetail slider engine | Watertight ISO-threaded knurled screw-top tubes, filament-spool-hub perforated silica gel desiccant canisters with tunable vent slits, and 7-day or AM-PM sliding-lid pill organizers with tactile day labels. |
| **11** | **Parametric Spice Jar, Paint Bottle & Coffee Pod Rack Maker** | `jar-bottle-rack-maker` | 🏺 Kitchen & Hobby | `Three.js`, nested pocket & interlocking tab generator | Exact-diameter tiered stadium stands and honeycomb bottle/vial/capsule racks (spice jars, Vallejo/Citadel paints, essential oils, coffee pods) with interlocking side tabs for modular build-plate tiling. |
| **12** | **Parametric 3D Printer Calibration, Clearance & Fastener Fit Suite** | `calibration-tolerance-suite` | 📏 3D Printer Tuning | `Three.js`, `opentype.js` (`.3mf` embossed gauge labels) | Nozzle- and bed-size-tailored calibration prints: labeled print-in-place tolerance/clearance gauges (`0.10–0.50 mm`), M2–M8 bolt & hex-nut test blocks, overhang/bridging arches, and full-bed first-layer sheets. |

---

## 5. Summary & Recommended Prioritization

| Category | Currently Built | Newly Proposed | Total After Batch 3 | Top 3 Quick Wins (High SEO & Reuse of Existing Engines) |
| :--- | :---: | :---: | :---: | :--- |
| **Documents & PDFs** (iLovePDF focus) | 11 | **11** | 22 | 1. `pdf-watermark-numbering`<br>2. `pdf-image-converter`<br>3. `pdf-compressor` |
| **Developer Tools** (Coddy.tech focus) | 13 | **9** | 22 | 1. `json-sql-formatter`<br>2. `jwt-debugger-studio`<br>3. `regex-tester-debugger` |
| **3D Printing Generators** (High-Utility Parametric focus) | 15 | **12** | 27 | 1. `battery-sdcard-case-maker`<br>2. `rugged-hinged-box-maker`<br>3. `washer-spacer-shim-maker` |
| **Media, Audio/Video & Other Privacy** | 21 | — | 21 | — |
| **TOTAL** | **60** | **32** | **92** | |
