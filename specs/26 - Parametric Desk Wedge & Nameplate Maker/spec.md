# Parametric Desk Wedge & Nameplate Maker

Product Architecture & Execution Strategy

# 1. MVP Generation Prompt

t/create-web-micro-saas

System Persona: You are an expert 3D Web Graphics Engineer and Senior Front-End Developer specializing in Three.js, Constructive Solid Geometry (CSG), and 3D printing file exports (.3mf / .stl).

Task: Build a 100% client-side Web Application titled "Parametric Desk Wedge & Nameplate Maker".

Core Functional Requirements:

Interactive 3D Canvas (Three.js):

Render a real-time parametric desk wedge/nameplate model with orbit controls, realistic lighting, grid floor, and material shaders (simulating PLA plastic textures).

Allow user customization of wedge dimensions: Width (100–300mm), Base Depth (20–60mm), Angle (45°–75°), Chamfer/Fillet radius, and Base Lip height.

Typography & Text Extrusion (FontLoader & TextGeometry):

Provide primary line (e.g., Full Name) and secondary line (e.g., Job Title / Department).

Support font selection from 5 preloaded Google Fonts (e.g., Roboto Bold, Montserrat, Playfair Display, Space Grotesk, Cinzel).

Allow real-time adjustments for text size, extrusion depth, letter spacing, bevel thickness, and vertical/horizontal alignment on the wedge face.

Multi-Material CSG & Layer Presets (three-bvh-csg):

Perform boolean operations to attach text to the wedge base or carve recessed text (embossed vs. debossed mode).

Assign distinct material colors to the base body and the text element.

Calculate layer height color-change thresholds based on a standard 0.2mm layer height (e.g., "Swap color at Layer 45 / 9.0mm").

File Export Engine (Client-Side):

Export multi-color .3mf file containing distinct geometry groups for dual-extrusion / multi-material 3D printers (Bambu Lab AMS, Prusa MMU, Creality K1).

Export unified .stl file for single-material prints.

Include quick client-side preview rendering to downloadable .png thumbnail.

UI/UX Design:

Modern, sleek dark/light responsive interface using Tailwind CSS.

Sidebar control panel split into tabs: Base Setup, Text & Fonts, Color & Materials, Export Settings.

Non-intrusive ad banner placeholders (Leaderboard top, Rectangle sidebar) optimized for Google AdSense layout.

Tech Stack Constraints:

Pure HTML5, Modern JavaScript / TypeScript, Three.js, three-bvh-csg, FontLoader, 3MFExporter / STLExporter.

Zero server backend dependency (100% client-side computation).

## 2. Concept Overview & Value Proposition

The **Parametric Desk Wedge & Nameplate Maker** is a browser-based, serverless utility that empowers professionals, makers, office managers, and 3D printing hobbyists to generate customized, print-ready 3D desk nameplates.

Traditionally, creating personalized 3D printed desk plates required CAD proficiency in tools like Fusion 360, SolidWorks, or OpenSCAD. Existing downloadable models on platforms like Printables or Thingiverse offer static designs that cannot be easily adapted for custom names, titles, or corporate branding.

+-------------------------------------------------------------------------------+

|                             CLIENT BROWSER (100%)                             ||                                                                               ||  +------------------+    +-------------------+    +------------------------+  ||  |  User Parametric | -> | Three.js CSG &    | -> | Multi-Color .3mf File  |  ||  |  Inputs & Text   |    | Font Extrusion    |    | + Layer Height Presets |  ||  +------------------+    +-------------------+    +------------------------+  |+-------------------------------------------------------------------------------+

### Key Value Pillars

* **Zero Software Installation:** Operates entirely inside any WebGL-enabled browser.

* **Instant Slicer Compatibility:** Generates standard dual-color `.3mf` files pre-configured for automated multi-material systems (Bambu Lab AMS, Prusa MMU3, Anycubic ACE) as well as manual layer-swap prompts for single-extruder printers.

* **Real-Time Visual Validation:** Provides instant, physically accurate 3D preview with customizable filament colors (Matte, Silk, Metallic PLA) before downloading.

* **Privacy & Speed:** Because processing happens 100% on the client side, no personal names, titles, or corporate structures are sent to external servers.

## 3. Technical Feasibility & Difficulty Score

* **Difficulty Score:** 3.5 / 5 (Moderate-High Front-End Complexity)

* **Backend Requirement:** None (100% Client-Side Engine)

+---------------------------------------------------------------------------------+|                                 TECH STACK                                      |+---------------------+-----------------------------------------------------------+| 3D Rendering        | Three.js (WebGL rendering engine)                         || CSG Boolean Engine  | three-bvh-csg (High-performance mesh booleans)            || Text Processing     | FontLoader + TextGeometry / ExtrudeGeometry               || File Formatting     | 3MFExporter, STLExporter                                  || UI Framework        | React / Tailwind CSS                                      || Analytics & Storage | HTML5 LocalStorage, Google Tag Manager                    |+---------------------+-----------------------------------------------------------+

### Technical Execution Details

### 1. **Mesh Generation & Boolean Operations:** The application uses `three-bvh-csg` to perform rapid mesh union and subtraction operations between the base wedge solid and extruded text geometry. This ensures clean manifold geometry required by 3D slicers.

### 2. **Multi-Material Structure:** Rather than outputting a single fused mesh, the exporter structures the `.3mf` package into distinct named objects/volumes. Slicers interpret these volumes as separate filament assignments automatically.

### 3. **Performance Optimization:** To maintain 60 FPS performance during real-time parametric slider adjustments, high-cost CSG operations are debounced (150ms delay) while lightweight Three.js transform controls update live visual approximations.

## 4. Competitive Landscape & Market Positioning

+------------------------+-------------------+---------------------+-------------------------+| Solution               | Ease of Use       | Customization Level | Multi-Color Support     |+------------------------+-------------------+---------------------+-------------------------+| Fusion 360 / CAD       | Low (High steep)  | Complete            | Manual Setup Required   || OpenSCAD Web Tools     | Low (Code based)  | Moderate            | Basic / Clunky          || Etsy Custom Sellers    | High              | Dependent on Seller | Paid ($20 - $50 / unit) || Parametric Nameplate   | High (Instant UI) | High (Parametric)   | Native Native (.3mf)    |+------------------------+-------------------+---------------------+-------------------------+

### Market Positioning

The tool targets the sweet spot between overly complex CAD software and rigid static models. By offering a tailored, single-purpose application with exact layer-preset exports, it serves both end-user makers and Etsy/Shopify store owners producing custom 3D printed office accessories in bulk.

## 5. Traffic & Audience Acquisition Strategy

### Organic SEO Strategy

* **Primary SEO Keyword:** `desk nameplate 3d print generator`

* **Secondary Target Keywords:** `custom 3mf nameplate maker`, `bambu lab desk sign generator`, `free printable desk wedge stl`, `3d printed office sign creator`.

* **Programmatic SEO & Content Marketing:** Create dedicated landing pages for specific 3D printer models (e.g., *"How to Print Custom Multi-Color Nameplates on Bambu Lab P1S"*) and use-case templates (e.g., *"Executive Desk Signs"*, *"Teacher Nameplates"*, *"Conference Room Signs"*).

### Community & Viral Channels

* **3D Printing Repositories:** Publish parametric baseline models on MakerWorld, Printables, and Thingiverse, inserting direct links to the web editor: *"Customize this model live in your browser"*.

* **Social Showcase:** Short-form video content (TikTok, YouTube Shorts, Instagram Reels) demonstrating the workflow: *30-second custom nameplate design -> sliced in Bambu Studio -> timelapse print*.

* **Reddit Communities:** Native engagement on `r/3Dprinting`, `r/BambuLab`, `r/FunctionalPrint`, and `r/EtsySellers`.

### Paid Reinvestment Model

* Allocate 25% of monthly AdSense yield into low-cost, high-intent keywords via Google Search Ads.

* Target niche subreddits with native display ads during peak Q4 holiday gifting periods (when custom 3D printed gifts experience peak demand).

## 6. Revenue Projections & Financial Model

Monetization combines Google AdSense display advertising, affiliate commissions (3D printers, multi-material units, specialty PLA filaments), and optional premium asset exports.

+-------------------------------+-----------+------------+------------+------------+| Metric                        | 5k MAU    | 25k MAU    | 100k MAU   | 500k MAU   |+-------------------------------+-----------+------------+------------+------------+| Monthly Pageviews (2.5 p/s)   | 12,500    | 62,500     | 250,000    | 1,250,000  || Ad Impressions (3 ads/page)   | 37,500    | 187,500    | 750,000    | 3,750,000  || AdSense Revenue ($12 Effective RPM)| $150  | $750       | $3,000     | $15,000    || Affiliate Revenue (Filament/Printers)| $75 | $375       | $1,500     | $7,500     || Premium Font / SVG Upload Sales| $50      | $250       | $1,000     | $5,000     || Total Estimated Monthly Revenue| $275     | $1,375     | $5,500     | $27,500    || Server Infrastructure Costs   | $0        | $0         | $0         | $0         || Net Monthly Margin            | 100%      | 100%       | 100%       | 100%       |+-------------------------------+-----------+------------+------------+------------+

*Note: Infrastructure costs remain effectively $0 due to 100% client-side execution hosted on static web distribution platforms (GitHub Pages, Vercel, or Cloudflare Pages).*

## 7. Strategic Ad Placement & Monetization Layout

+---------------------------------------------------------------------------------+| [HEADER BAR]  Parametric Nameplate Maker        [Top Leaderboard Ad: 728x90]   |+------------------------------------+--------------------------------------------+| CONTROLS PANEL                     | 3D INTERACTIVE CANVAS                      ||                                    |                                            || - Dimensions & Angles              |                                            || - Text Input & Font Selection      |   [ Live 3D Render Viewport ]              ||                                    |   (Orbit, Zoom, Pan Controls)              || [Sidebar Ad Slot: 300x250]         |                                            ||                                    |                                            || - Color & Material Swaps           |                                            || - Layer Height Presets             |                                            ||                                    +--------------------------------------------+| [ DOWNLOAD .3MF ]  [ DOWNLOAD .STL]| [AFFILIATE FOOTER BAR]                     ||                                    | Recommended Filaments: Matte Black | Gold  |+------------------------------------+--------------------------------------------+

### Monetization Units

### 1. **Top Leaderboard (728x90 / responsive):** High visibility on page load without pushing the primary 3D viewport below the fold.

### 2. **Sidebar Medium Rectangle (300x250):** Embedded smoothly into the parametric control stack between typography and material presets.

### 3. **Export Processing Interstitial / Modal:** Displayed for 3–5 seconds while the client-side CSG compiler finishes packing the `.3mf` zip container.

### 4. **Contextual Filament Affiliate Links:** Dynamic recommendations based on selected render colors (e.g., *"Get this Silk Gold Metallic PLA on Amazon"*).

## 8. Risks, Vulnerabilities & Future Expansion

### Technical Risks & Mitigation

* **Client-Side CPU/RAM Constraints:** Complex font geometries or extreme bevel settings can cause browser slowdowns during CSG generation.

* *Mitigation:* Enforce vertex caps on exported meshes, utilize Web Workers for off-thread CSG processing, and provide fallback low-poly draft previews.

* **Font Licensing Issues:** Including commercial TTF/WOFF files directly can violate copyright.

* *Mitigation:* Use strictly SIL Open Font License (OFL) Google Fonts.

### Potential Vulnerabilities

* **AdBlocker Impact:** Tech-savvy maker audiences frequently run browser ad blockers, reducing ad revenue yield.

* *Mitigation:* Implement unobtrusive non-ad revenue streams such as affiliate links and a "Buy Me a Coffee" or Pro feature tier.

### Future Expansion Opportunities

* **Custom Logo / SVG Extrusion:** Allow users to upload company logos in `.svg` format to place alongside or in place of text.

* **Braille Signage Integration:** Automatically generate compliant tactile ADA Braille text on nameplate bases for institutional facilities.

* **Etsy Seller Batch API:** Offer a commercial subscription tier enabling batch processing from CSV spreadsheets to generate dozens of personalized `.3mf` files simultaneously.
