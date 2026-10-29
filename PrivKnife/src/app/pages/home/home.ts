import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Badge } from '../../components/badge/badge';
import { Button } from '../../components/button/button';
import { Card } from '../../components/card/card';
import { ToolCategory } from '../../core/models/tool.model';
import { I18nService, TranslatePipe } from '../../core/i18n';

export interface CatalogTool {
  id: string;
  name: string;
  i18nKey?: string;
  category: ToolCategory;
  categoryLabel: string;
  description: string;
  keywords: string[];
  status: 'ready' | 'roadmap';
  route?: string;
  techStack: string;
  icon: string;
}

const CATALOG_TOOLS: CatalogTool[] = [
  {
    id: 'exif-stripper',
    i18nKey: 'exifStripper',
    name: 'EXIF & Privacy Metadata Stripper',
    category: 'privacy',
    categoryLabel: 'Privacy',
    description: 'Purge hidden GPS location, camera model, and device timestamps from photos in one click.',
    keywords: ['exif', 'metadata', 'gps', 'photo', 'camera', 'privacy', 'sanitize'],
    status: 'ready',
    route: '/tools/exif-stripper',
    techStack: 'Binary Parser • HTML5 File API',
    icon: '🛡️',
  },
  {
    id: 'crypto-hash-uuid',
    i18nKey: 'cryptoHash',
    name: 'Cryptographic Hash & UUID Batch Generator',
    category: 'privacy',
    categoryLabel: 'Privacy / Dev',
    description: 'Bulk SHA-256, SHA-512, MD5, and UUIDv4 generation directly in your browser with zero server roundtrips.',
    keywords: ['hash', 'sha256', 'md5', 'uuid', 'crypto', 'checksum'],
    status: 'ready',
    route: '/tools/crypto-hash-uuid',
    techStack: 'Native Web Crypto API',
    icon: '🔑',
  },
  {
    id: 'csv-json-sql',
    i18nKey: 'csvConverter',
    name: 'CSV to JSON, SQL & Markdown Converter',
    category: 'dev',
    categoryLabel: 'Dev / Data',
    description: 'Convert spreadsheets and CSV data into structured JSON, SQL INSERT scripts, or Markdown tables offline.',
    keywords: ['csv', 'json', 'sql', 'markdown', 'excel', 'table', 'convert'],
    status: 'ready',
    route: '/tools/csv-to-sql-json',
    techStack: 'PapaParse • SheetJS',
    icon: '📊',
  },
  {
    id: 'pdf-merger-splitter',
    i18nKey: 'pdfMerger',
    name: 'PDF Merger, Splitter & Page Organizer',
    category: 'documents',
    categoryLabel: 'Documents',
    description: 'Combine multiple PDF files, delete sensitive pages, or extract custom page ranges in browser memory.',
    keywords: ['pdf', 'merge', 'split', 'organize', 'pages', 'documents'],
    status: 'ready',
    route: '/tools/pdf-merger-splitter',
    techStack: 'pdf-lib • Canvas API',
    icon: '📑',
  },
  {
    id: 'pdf-redaction',
    i18nKey: 'pdfRedaction',
    name: 'PDF Redaction & Anonymizer',
    category: 'privacy',
    categoryLabel: 'Privacy',
    description: 'Black out confidential paragraphs and flatten documents to destroy un-rendered text layers permanently.',
    keywords: ['pdf', 'redact', 'anonymize', 'black out', 'privacy', 'flatten'],
    status: 'ready',
    route: '/tools/pdf-redaction',
    techStack: 'PDF.js • Canvas 2D Redaction',
    icon: '✏️',
  },
  {
    id: 'invoice-receipt-maker',
    i18nKey: 'invoiceMaker',
    name: 'Instant Client-Side Invoice & Receipt Maker',
    category: 'documents',
    categoryLabel: 'Documents',
    description: 'Draft professional PDF invoices and printable receipts without storing financial records on third-party servers.',
    keywords: ['invoice', 'receipt', 'billing', 'pdf', 'finance'],
    status: 'ready',
    route: '/tools/invoice-maker',
    techStack: 'jsPDF • LocalStorage Drafts',
    icon: '🧾',
  },
  {
    id: 'graph-dot-grid-paper',
    i18nKey: 'gridPaper',
    name: 'Custom Printable Graph & Dot Grid Paper',
    category: 'documents',
    categoryLabel: 'Documents',
    description: 'Generate high-precision vector grid, dot, isometric, and music staff paper customized for printing.',
    keywords: ['graph paper', 'grid', 'dots', 'notebook', 'printable', 'pdf'],
    status: 'ready',
    route: '/tools/grid-paper',
    techStack: 'Vector Canvas • jsPDF',
    icon: '📐',
  },
  {
    id: 'avery-barcode-sheet',
    i18nKey: 'barcodeLabels',
    name: 'Avery Barcode & Label Sheet Generator',
    category: 'documents',
    categoryLabel: 'Documents',
    description: 'Design and print standard barcode label sheets (UPC, Code128, QR) mapped to exact Avery template sizes.',
    keywords: ['barcode', 'labels', 'avery', 'stickers', 'qr code', 'inventory'],
    status: 'ready',
    route: '/tools/barcode-labels',
    techStack: 'JsBarcode • Vector jsPDF',
    icon: '🏷️',
  },
  {
    id: 'table-tent-maker',
    i18nKey: 'tableTentMaker',
    name: 'Foldable Table Tent & Counter Sign Maker',
    category: 'documents',
    categoryLabel: 'Documents',
    description: 'Create print-ready foldable triangular table signs with menus, QR codes, or Wi-Fi login badges.',
    keywords: ['table tent', 'sign', 'qr menu', 'print', 'restaurant'],
    status: 'ready',
    route: '/tools/table-tent-maker',
    techStack: 'SVG Renderer • jsPDF',
    icon: '⛺',
  },
  {
    id: 'batch-image-compressor',
    i18nKey: 'batchCompressor',
    name: 'Batch Image Compressor & WebP Converter',
    category: 'media',
    categoryLabel: 'Media',
    description: 'Losslessly compress hundreds of photos and convert them to modern WebP with zero upload limits.',
    keywords: ['compress', 'webp', 'image', 'jpeg', 'png', 'shrink', 'batch'],
    status: 'ready',
    route: '/tools/batch-image-compressor',
    techStack: 'Canvas API • Web Workers • JSZip',
    icon: '🗜️',
  },
  {
    id: 'background-remover',
    i18nKey: 'backgroundRemover',
    name: 'Automated Background Removal (High Quality)',
    category: 'media',
    categoryLabel: 'Media',
    description: 'Instant, client-side background removal producing clean transparent .png cutouts with edge anti-aliasing.',
    keywords: ['background remover', 'transparent png', 'cutout', 'chroma key', 'product photo', 'white background'],
    status: 'ready',
    route: '/tools/background-remover',
    techStack: 'Canvas Pixel Segmentation • Alpha Matting • File API',
    icon: '✂️',
  },
  {
    id: 'favicon-app-icon-suite',
    i18nKey: 'faviconGenerator',
    name: 'App Icon & Favicon Suite Generator',
    category: 'media',
    categoryLabel: 'Media',
    description: 'Turn a single logo into a complete package of multi-size favicons, Apple touch icons, and web manifests.',
    keywords: ['favicon', 'icon', 'apple-touch', 'pwa', 'manifest', 'android'],
    status: 'ready',
    route: '/tools/favicon-app-icon-suite',
    techStack: 'Canvas API • JSZip Generator',
    icon: '🎨',
  },
  {
    id: 'og-card-maker',
    i18nKey: 'ogCardMaker',
    name: 'Social Share (Open Graph) Card Maker',
    category: 'media',
    categoryLabel: 'Media',
    description: 'Generate high-CTR 1200×630 Open Graph preview cards for Twitter, Facebook, and LinkedIn in seconds.',
    keywords: ['open graph', 'social card', 'twitter card', 'banner', 'preview'],
    status: 'ready',
    route: '/tools/og-card-maker',
    techStack: 'Canvas 2D • SVG Typography',
    icon: '🖼️',
  },
  {
    id: 'color-palette-extractor',
    i18nKey: 'colorPalette',
    name: 'Color Palette Extractor & Contrast Checker',
    category: 'dev',
    categoryLabel: 'Design / Dev',
    description: 'Extract dominant color palettes from any photo and verify WCAG 2.1 AA text readability ratios instantly.',
    keywords: ['color palette', 'contrast', 'wcag', 'accessibility', 'colors'],
    status: 'ready',
    route: '/tools/color-palette-extractor',
    techStack: 'ColorThief • Canvas Pixel Sampling',
    icon: '🎭',
  },
  {
    id: 'css-mesh-gradient-maker',
    i18nKey: 'meshGradient',
    name: 'CSS Mesh Gradient & Glassmorphism Maker',
    category: 'dev',
    categoryLabel: 'Dev / Design',
    description: 'Craft fluid multi-point mesh gradients and copy production-ready CSS or Tailwind CSS utility code.',
    keywords: ['mesh gradient', 'css', 'tailwind', 'glassmorphism', 'backdrop-filter'],
    status: 'ready',
    route: '/tools/css-mesh-gradient-maker',
    techStack: 'Canvas 2D • Pure CSS & Tailwind',
    icon: '🌈',
  },
  {
    id: 'subtitles-shifter',
    i18nKey: 'subtitlesShifter',
    name: 'Subtitles Timestamp Shifter & Converter',
    category: 'media',
    categoryLabel: 'Media',
    description: 'Batch re-sync subtitle delays (millisecond shifts) and convert between SRT and WebVTT formats.',
    keywords: ['subtitles', 'srt', 'vtt', 'sync', 'timestamp', 'video'],
    status: 'ready',
    route: '/tools/subtitles-shifter',
    techStack: 'Regex Parser • File API',
    icon: '💬',
  },
  {
    id: 'calendar-linker',
    i18nKey: 'calendarLinker',
    name: 'Universal Event & .ics Calendar Linker',
    category: 'dev',
    categoryLabel: 'Dev / Productivity',
    description: 'Generate universal "Add to Calendar" links for Google, Outlook, and Yahoo, plus standard RFC 5545 .ics files.',
    keywords: ['calendar', 'ics', 'google calendar', 'outlook', 'event', 'invite'],
    status: 'ready',
    route: '/tools/calendar-linker',
    techStack: 'RFC 5545 • Deep-Link Encoders',
    icon: '📅',
  },
  {
    id: 'email-signature-generator',
    i18nKey: 'emailSignature',
    name: 'HTML Email Signature Generator',
    category: 'dev',
    categoryLabel: 'Dev / Productivity',
    description: 'Design responsive, multi-client compatible HTML email signatures for Gmail, Outlook, and Apple Mail with instant rich-text copy.',
    keywords: ['email signature', 'html email', 'gmail', 'outlook', 'signature', 'templates'],
    status: 'ready',
    route: '/tools/email-signature-generator',
    techStack: 'DOM Table Renderer • Clipboard API',
    icon: '✉️',
  },
  {
    id: 'robots-sitemap-builder',
    i18nKey: 'robotsSitemap',
    name: 'Robots.txt & XML Sitemap Builder',
    category: 'dev',
    categoryLabel: 'Dev / Productivity',
    description: 'Generate standard search crawler directives (robots.txt) and valid XML sitemaps with AI bot blocking and bulk URL import.',
    keywords: ['robots.txt', 'sitemap.xml', 'seo', 'crawlers', 'xml sitemap', 'block ai'],
    status: 'ready',
    route: '/tools/robots-sitemap-builder',
    techStack: 'DOMParser • XMLSerializer',
    icon: '🤖',
  },
  {
    id: 'dns-checker',
    i18nKey: 'dnsChecker',
    name: 'Global DNS Propagation & WHOIS Checker',
    category: 'dev',
    categoryLabel: 'Dev / Networking',
    description: 'Verify DNS record propagation across multiple global Anycast resolvers in real time using direct browser DoH and inspect RDAP WHOIS records.',
    keywords: ['dns propagation', 'whois', 'doh', 'dns over https', 'dns records', 'a record', 'mx record'],
    status: 'ready',
    route: '/tools/dns-checker',
    techStack: 'Browser DoH • RFC 8484 • RDAP Protocol',
    icon: '🌐',
  },
  {
    id: 'web-vitals',
    i18nKey: 'webVitals',
    name: 'Website Performance & Core Web Vitals Checker',
    category: 'dev',
    categoryLabel: 'Dev / Performance',
    description: 'Audit page loading speed, inspect official Google Core Web Vitals (LCP, INP, CLS, FCP, TTFB), and receive actionable developer diagnostics.',
    keywords: ['core web vitals', 'pagespeed', 'lighthouse', 'lcp', 'inp', 'cls', 'website speed', 'performance'],
    status: 'ready',
    route: '/tools/web-vitals',
    techStack: 'Direct PageSpeed API • Navigation Timing • Client-Side Audit',
    icon: '⚡',
  },
  {
    id: 'markdown-cheatsheet',
    i18nKey: 'markdownCheatsheet',
    name: 'Markdown to Academic / Tech PDF Cheatsheet',
    category: 'documents',
    categoryLabel: 'Documents',
    description: 'Transform markdown notes into high-density 2, 3, or 4-column academic and tech reference cheat sheets with live preview.',
    keywords: ['markdown cheatsheet', 'markdown to pdf', 'cheatsheet maker', 'multi-column pdf', 'cheat sheet generator', 'print cheatsheet'],
    status: 'ready',
    route: '/tools/markdown-cheatsheet',
    techStack: 'marked • jsPDF Vector • DOMPurify',
    icon: '📝',
  },
  {
    id: 'audio-bpm-detector',
    i18nKey: 'bpmTapDetector',
    name: 'Audio BPM, Pitch & Key Tap Detector',
    category: 'audio-video',
    categoryLabel: 'Audio / Video',
    description: 'Detect tempo, musical key, and pitch in real time from audio tracks offline or tap along with an audible synthesized metronome.',
    keywords: ['bpm detector', 'tap tempo', 'key detection', 'pitch detector', 'metronome', 'camelot wheel', 'audio'],
    status: 'ready',
    route: '/tools/audio-bpm-detector',
    techStack: 'Web Audio API • Onset Autocorrelation • Canvas',
    icon: '🎵',
  },
  {
    id: 'soundwave-art-maker',
    i18nKey: 'soundwaveArt',
    name: 'Spotify Code & Soundwave Art Maker',
    category: 'audio-video',
    categoryLabel: 'Audio / Video',
    description: 'Transform memorable songs, voice notes, or Spotify links into custom soundwave art with laser-cut SVG, framed PDF, and dual-color 3D STL exports.',
    keywords: ['soundwave art', 'spotify code', '3d print soundwave', 'voice note art', 'stl maker', 'laser cut svg', 'audio visualizer'],
    status: 'ready',
    route: '/tools/soundwave-art-maker',
    techStack: 'Web Audio API • Vector SVG • Solid 3D STL',
    icon: '〰️',
  },
  {
    id: 'video-to-gif',
    i18nKey: 'videoGifTrimmer',
    name: 'Video to GIF & Clip Trimmer',
    category: 'audio-video',
    categoryLabel: 'Audio / Video',
    description: 'Trim video clips and convert them into lightweight animated GIFs or trimmed video clips with millisecond timeline scrubbing.',
    keywords: ['video to gif', 'trim video', 'gif converter', 'video trimmer', 'clip maker', 'animated gif'],
    status: 'ready',
    route: '/tools/video-to-gif',
    techStack: 'GIF89a LZW • HTML5 Canvas • MediaRecorder',
    icon: '🎬',
  },
  {
    id: 'screenshot-mockup',
    i18nKey: 'screenshotMockup',
    name: 'App Screenshot Mockup Studio',
    category: 'media',
    categoryLabel: 'Media',
    description: 'Transform mobile and web app screenshots into realistic 3D angled device frames with customizable shadows, glass reflections, and gradient backgrounds.',
    keywords: ['device mockup', 'screenshot studio', 'iphone mockup', '3d mockup', 'app store screenshots', 'macbook frame'],
    status: 'ready',
    route: '/tools/screenshot-mockup',
    techStack: 'HTML5 2.5D Canvas • Perspective Math • File API',
    icon: '📱',
  },
  {
    id: '3d-qr-stand',
    i18nKey: 'qrStandKeychain',
    name: '3D QR Stand & Keychain Generator',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Generate dual-color 3MF and STL files of functional tabletop QR code stands for 3D printing.',
    keywords: ['3d print', 'stl', '3mf', 'qr code', 'bambu lab', 'keychain'],
    status: 'ready',
    route: '/tools/3d-qr-stand',
    techStack: 'Three.js • three-bvh-csg',
    icon: '🧊',
  },
  {
    id: 'cookie-cutter-3d',
    i18nKey: 'cookieCutter',
    name: 'Custom Cookie Cutter & Stamp 3D Maker',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Transform 2D silhouettes into dual-part 3D-printable cookie cutters and matching impression stamps.',
    keywords: ['cookie cutter', 'stamp', '3d print', 'stl', '3mf', 'baking', 'silhouette'],
    status: 'ready',
    route: '/tools/cookie-cutter',
    techStack: 'Three.js • Polygon Offsetting • File API',
    icon: '🍪',
  },
  {
    id: 'desk-wedge-nameplate',
    i18nKey: 'deskWedge',
    name: 'Parametric Desk Wedge & Nameplate Maker',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Design executive, technical, and medical desk signs with crisp bevels, dual-color 3MF, and slice-ready STL files.',
    keywords: ['desk wedge', 'nameplate', 'office sign', '3d print', 'stl', '3mf', 'bambu lab'],
    status: 'ready',
    route: '/tools/desk-wedge-nameplate',
    techStack: 'Three.js • CSG Subtraction • Binary STL / 3MF',
    icon: '🏷️',
  },
  {
    id: 'parametric-lamp-designer',
    i18nKey: 'parametricLampDesigner',
    name: '3D Parametric Lamp & Lampshade Designer',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Design bespoke spiral, ribbed, fluted, and organic lampshades with standard E27, E14, or IKEA socket adapters and vase mode support.',
    keywords: ['3d print', 'lamp', 'lampshade', 'vase mode', 'e27', 'e14', 'parametric', 'spiral', 'stl', '3mf'],
    status: 'ready',
    route: '/tools/parametric-lamp-designer',
    techStack: 'Three.js • Web Worker • Binary STL / 3MF',
    icon: '💡',
  },
  {
    id: 'lithophane-maker',
    i18nKey: 'lithophaneMaker',
    name: 'Curved & Flat 3D Lithophane Maker',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Turn photographs into high-resolution curved, flat, or cylindrical 3D-printable lithophanes.',
    keywords: ['lithophane', '3d print', 'photo', 'night light', 'stl'],
    status: 'ready',
    route: '/tools/lithophane-maker',
    techStack: 'Three.js • Canvas Greyscale • Binary STL',
    icon: '🖼️',
  },
  {
    id: 'gridfinity-bin-generator',
    i18nKey: 'gridfinityBinGenerator',
    name: 'Gridfinity & Modular Drawer Bin Generator',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Generate parametric Gridfinity organizer bins with custom compartments, lip types, and magnet base holes.',
    keywords: ['gridfinity', 'modular', 'organizer', 'drawer bin', '3d print', 'stl'],
    status: 'ready',
    route: '/tools/gridfinity-bin-generator',
    techStack: 'Three.js • Gridfinity Spec • STL / 3MF',
    icon: '📦',
  },
  {
    id: 'electronics-box-enclosure',
    i18nKey: 'electronicsBoxEnclosure',
    name: 'Parametric Electronics Box & Snap-Fit Enclosure',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Create snap-fit or screwed enclosures for Arduino, ESP32, Raspberry Pi, and custom PCBs with cable cutouts.',
    keywords: ['enclosure', 'electronics box', 'snap fit', 'pcb', '3d print', 'arduino', 'esp32'],
    status: 'ready',
    route: '/tools/electronics-box-enclosure',
    techStack: 'Three.js • Snap-fit Math • STL / 3MF',
    icon: '📟',
  },
  {
    id: 'under-desk-clamp-generator',
    i18nKey: 'underDeskClampGenerator',
    name: 'Under-Desk Clamp & Cable Management Generator',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Design custom screw clamps, headphone hooks, and cable channels with ACME lead-screw threads.',
    keywords: ['clamp', 'desk clamp', 'cable management', 'headphone hook', '3d print', 'acme thread'],
    status: 'ready',
    route: '/tools/under-desk-clamp-generator',
    techStack: 'Three.js • Thread Generator • STL / 3MF',
    icon: '🔧',
  },
  {
    id: 'skadis-pegboard-maker',
    i18nKey: 'skadisPegboardMaker',
    name: 'IKEA Skådis & Pegboard Hook / Holder Maker',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Generate custom tool holders, universal hooks, and shelves specifically engineered for IKEA Skådis pegboards.',
    keywords: ['ikea skadis', 'skadis hook', 'pegboard holder', 'tool organizer', '3d print'],
    status: 'ready',
    route: '/tools/skadis-pegboard-maker',
    techStack: 'Three.js • Pegboard Specs • STL / 3MF',
    icon: '🧱',
  },
  {
    id: 'geometric-plant-pot',
    i18nKey: 'geometricPlantPot',
    name: 'Geometric Plant Pot & Self-Watering Planter',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Create faceted, voronoi, and spiral succulent planters with sub-irrigation reservoirs and drainage grids.',
    keywords: ['planter', 'plant pot', 'succulent', 'self watering', '3d print', 'voronoi'],
    status: 'ready',
    route: '/tools/geometric-plant-pot',
    techStack: 'Three.js • Procedural Mesh • STL / 3MF',
    icon: '🪴',
  },
  {
    id: 'braille-ada-sign-generator',
    i18nKey: 'brailleAdaSignGenerator',
    name: 'Braille & ADA Tactile Door Sign Generator',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Generate compliant ADA room and door signs with California Grade 2 Braille dots and raised tactile lettering.',
    keywords: ['braille', 'ada sign', 'tactile sign', 'door sign', '3d print', 'dual color 3mf'],
    status: 'ready',
    route: '/tools/braille-ada-sign-generator',
    techStack: 'Three.js • ADA Tactile Standard • STL / 3MF',
    icon: '🔤',
  },
  {
    id: 'keycap-switch-tester-maker',
    i18nKey: 'keycapSwitchTesterMaker',
    name: 'Custom Mechanical Keycap & Switch Tester Maker',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Design custom Cherry MX stem keycaps and multi-switch sound test plates with customizable layout grids.',
    keywords: ['keycap', 'switch tester', 'mechanical keyboard', 'cherry mx', '3d print'],
    status: 'ready',
    route: '/tools/keycap-switch-tester-maker',
    techStack: 'Three.js • Cherry MX Stem • STL / 3MF',
    icon: '⌨️',
  },
  {
    id: 'cappuccino-stencil-maker',
    i18nKey: 'cappuccinoStencilMaker',
    name: 'Cappuccino Stencil & Airbrush Template Maker',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Turn SVG logos and silhouettes into food-safe coffee art stencils with automated island bridge connections.',
    keywords: ['cappuccino stencil', 'coffee art', 'latte stencil', 'airbrush template', 'svg to 3d'],
    status: 'ready',
    route: '/tools/cappuccino-stencil-maker',
    techStack: 'Canvas 2D • Vector Bridges • SVG / STL',
    icon: '☕',
  },
  {
    id: 'pet-id-tag-generator',
    i18nKey: 'petIdTagGenerator',
    name: 'Pet ID Tag & Collar Slide-On Generator',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Design silent slide-on or hanging dog and cat ID tags with embossed names, phone numbers, and emergency microchip info.',
    keywords: ['pet tag', 'dog tag', 'cat id', 'collar slide on', '3d print', 'dual color 3mf'],
    status: 'ready',
    route: '/tools/pet-id-tag-generator',
    techStack: 'Three.js • Dual-Color 3MF • Extrusion',
    icon: '🏷️',
  },
  {
    id: 'hsw-insert-adapter',
    i18nKey: 'hswInsertAdapter',
    name: 'Honeycomb Storage Wall (HSW) Insert & Adapter',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Create snap-in hexagonal inserts, M3/M4/M5 nut holders, and custom tool adapters for Honeycomb Storage Walls.',
    keywords: ['honeycomb storage wall', 'hsw', 'hex insert', 'tool wall', '3d print'],
    status: 'ready',
    route: '/tools/hsw-insert-adapter',
    techStack: 'Three.js • Hex Insert Spec • STL / 3MF',
    icon: '🧱',
  },
  {
    id: 'passport-biometric-photo',
    i18nKey: 'passportBiometricPhoto',
    name: 'Passport, Visa & ID Biometric Photo Maker',
    category: 'media',
    categoryLabel: 'Media',
    description: 'Crop and scale portrait photos to strict 2x2 inch, 35x45 mm, and international biometric visa specs on printable 4x6 / A4 sheets.',
    keywords: ['passport photo', 'visa photo', 'biometric photo', 'id photo', 'print sheet'],
    status: 'ready',
    route: '/tools/passport-biometric-photo',
    techStack: 'Canvas 2D • Biometric Face Detection • High-DPI Print',
    icon: '🛂',
  },
  {
    id: 'heic-avif-converter',
    i18nKey: 'heicAvifConverter',
    name: 'HEIC & AVIF to JPG / PNG Batch Converter',
    category: 'media',
    categoryLabel: 'Media',
    description: 'Batch convert Apple iPhone HEIC/HEIF photos and next-gen AVIF images to standard high-quality JPG or PNG files in-browser.',
    keywords: ['heic to jpg', 'heic converter', 'avif to png', 'apple photos', 'batch converter'],
    status: 'ready',
    route: '/tools/heic-avif-converter',
    techStack: 'WebAssembly • Canvas 2D • Multi-threaded Worker',
    icon: '🔄',
  },
  {
    id: 'pdf-signer-stamper',
    i18nKey: 'pdfSignerStamper',
    name: 'Client-Side PDF Signer, Date Stamper & Initials',
    category: 'documents',
    categoryLabel: 'Documents',
    description: 'Draw or upload signatures, add audit date stamps and initials onto PDF contracts without uploading confidential legal files to cloud servers.',
    keywords: ['sign pdf', 'pdf signature', 'date stamp', 'pdf contract', 'privacy signer'],
    status: 'ready',
    route: '/tools/pdf-signer-stamper',
    techStack: 'pdf-lib • Smooth Bezier Canvas • Vector Overlay',
    icon: '✍️',
  },
  {
    id: 'face-plate-blur',
    i18nKey: 'facePlateBlur',
    name: 'Face & License Plate Privacy Blur Tool',
    category: 'privacy',
    categoryLabel: 'Privacy',
    description: 'Automatically detect and censor faces and vehicle license plates with Gaussian blur, pixelation, or black privacy bars.',
    keywords: ['blur faces', 'license plate blur', 'privacy censor', 'anonymize photo'],
    status: 'ready',
    route: '/tools/face-plate-blur',
    techStack: 'TensorFlow Lite WASM • Canvas Blur Shaders',
    icon: '🎭',
  },
  {
    id: 'local-ocr-text-extractor',
    i18nKey: 'localOcrTextExtractor',
    name: 'Local OCR Image & Scanned PDF to Text / Word',
    category: 'documents',
    categoryLabel: 'Documents',
    description: 'Extract editable text from scanned receipts, screenshots, and multi-page PDFs using local machine learning without server ingestion.',
    keywords: ['ocr', 'extract text from image', 'scanned pdf to text', 'tesseract wasm'],
    status: 'ready',
    route: '/tools/local-ocr-text-extractor',
    techStack: 'Tesseract.js WASM • Multi-lingual OCR • PDF.js',
    icon: '🔍',
  },
  {
    id: 'file-encryptor-vault',
    i18nKey: 'fileEncryptorVault',
    name: 'Zero-Knowledge File Encryptor & Vault',
    category: 'privacy',
    categoryLabel: 'Privacy',
    description: 'Encrypt any file or folder with military-grade AES-256-GCM and Argon2id / PBKDF2 key derivation into self-decrypting packages.',
    keywords: ['encrypt file', 'file vault', 'aes 256 gcm', 'zero knowledge', 'password protect'],
    status: 'ready',
    route: '/tools/file-encryptor-vault',
    techStack: 'Web Crypto API • AES-256-GCM • Streaming Encryption',
    icon: '🔐',
  },
  {
    id: 'pii-scrubber-anonymizer',
    i18nKey: 'piiScrubberAnonymizer',
    name: 'PII Log & CSV Scrubber / Data Anonymizer',
    category: 'privacy',
    categoryLabel: 'Privacy / Dev',
    description: 'Detect and redact SSNs, emails, credit cards, IP addresses, and phone numbers from logs, CSVs, and customer data before sharing.',
    keywords: ['pii scrubber', 'anonymize logs', 'redact ssn', 'gdpr compliance', 'regex masking'],
    status: 'ready',
    route: '/tools/pii-scrubber-anonymizer',
    techStack: 'High-speed Regex Engine • Streaming Tokenizer',
    icon: '🧹',
  },
  {
    id: 'bank-statement-converter',
    i18nKey: 'bankStatementConverter',
    name: 'Bank Statement CSV / OFX to Excel & QIF Converter',
    category: 'dev',
    categoryLabel: 'Dev / Data',
    description: 'Clean up ugly bank exports, normalize transaction columns, and convert messy OFX/QFX/CSV files into clean Excel spreadsheets.',
    keywords: ['bank statement', 'csv to excel', 'ofx to csv', 'qif converter', 'accounting clean'],
    status: 'ready',
    route: '/tools/bank-statement-converter',
    techStack: 'PapaParse • SheetJS • OFX XML Parser',
    icon: '🏦',
  },
  {
    id: 'audio-trimmer-booster',
    i18nKey: 'audioTrimmerBooster',
    name: 'Audio Trimmer, Volume Booster & Ringtone Maker',
    category: 'audio-video',
    categoryLabel: 'Audio / Video',
    description: 'Trim MP3, WAV, and AAC audio tracks, apply gentle fade-in/fade-out envelopes, and safely boost quiet recordings offline.',
    keywords: ['audio trimmer', 'volume booster', 'cut mp3', 'ringtone maker', 'audio fade'],
    status: 'ready',
    route: '/tools/audio-trimmer-booster',
    techStack: 'Web Audio API • LAME MP3 Encoder • AudioBuffer',
    icon: '✂️',
  },
  {
    id: 'video-compressor-resizer',
    i18nKey: 'videoCompressorResizer',
    name: 'Client-Side Video Compressor & Social Resizer',
    category: 'audio-video',
    categoryLabel: 'Audio / Video',
    description: 'Compress large MP4 and WebM videos below Discord 10MB / 25MB limits and crop for TikTok, Instagram Reels, and YouTube Shorts.',
    keywords: ['video compressor', 'discord 25mb video', 'resize video for tiktok', 'crop video'],
    status: 'ready',
    route: '/tools/video-compressor-resizer',
    techStack: 'HTML5 Video Canvas • MediaRecorder • WebM Chunking',
    icon: '📹',
  },
  {
    id: 'nutrition-label-maker',
    i18nKey: 'nutritionLabelMaker',
    name: 'FDA & EU Nutrition Facts & Supplement Label Maker',
    category: 'documents',
    categoryLabel: 'Documents',
    description: 'Generate vector FDA Nutrition Facts panels, EU Food Regulation tables, and Supplement Facts labels ready for commercial packaging.',
    keywords: ['nutrition facts label', 'fda nutrition label', 'food packaging', 'supplement facts'],
    status: 'ready',
    route: '/tools/nutrition-label-maker',
    techStack: 'Vector SVG • FDA CFR 101.9 Spec • jsPDF',
    icon: '🥗',
  },
  {
    id: 'svg-optimizer-cleaner',
    i18nKey: 'svgOptimizerCleaner',
    name: 'SVG Optimizer, Path Cleaner & React / Vue Exporter',
    category: 'dev',
    categoryLabel: 'Dev / Design',
    description: 'Strip bloated metadata from vector SVGs, simplify bezier curves, and export optimized JSX, React, and Vue icon components.',
    keywords: ['svg optimizer', 'clean svg', 'svg to jsx', 'svg to react', 'vector minify'],
    status: 'ready',
    route: '/tools/svg-optimizer-cleaner',
    techStack: 'XML DOM Parser • SVGO Engine • AST Transform',
    icon: '⚡',
  },
  {
    id: 'diff-checker',
    i18nKey: 'diffChecker',
    name: 'Side-by-Side Code & Contract Diff Checker',
    category: 'dev',
    categoryLabel: 'Dev / Docs',
    description: 'Compare code files, legal contracts, or markdown texts side-by-side with character-level inline highlighting and unified patch export.',
    keywords: ['diff checker', 'compare text', 'code diff', 'contract comparison', 'diff tool'],
    status: 'ready',
    route: '/tools/diff-checker',
    techStack: 'Myers Diff Algorithm • Inline Syntax Highlighter',
    icon: '⚖️',
  },
  {
    id: 'font-subsetter-converter',
    i18nKey: 'fontSubsetterConverter',
    name: 'Web Font Subsetter & TTF / OTF to WOFF2 Converter',
    category: 'dev',
    categoryLabel: 'Dev / Design',
    description: 'Reduce font file sizes by 90% by stripping unused glyphs and converting heavy TTF/OTF fonts into high-compression WOFF2 web fonts.',
    keywords: ['font subsetter', 'ttf to woff2', 'compress font', 'web font generator'],
    status: 'ready',
    route: '/tools/font-subsetter-converter',
    techStack: 'OpenType.js • Brotli / WOFF2 Compressor WASM',
    icon: '🔡',
  },
  {
    id: 'seamless-texture-generator',
    i18nKey: 'seamlessTextureGenerator',
    name: 'Seamless Tileable Texture & Pattern Generator',
    category: 'media',
    categoryLabel: 'Media / 3D',
    description: 'Convert photos and game textures into seamless repeating tiles with Poisson blending, mirrored seams, and normal map generation.',
    keywords: ['seamless texture', 'tileable pattern', '3d texture', 'game dev texture', 'normal map'],
    status: 'ready',
    route: '/tools/seamless-texture-generator',
    techStack: 'Canvas 2D • Sobel Filter • Frequency Blending',
    icon: '🧱',
  },
  {
    id: 'floor-plan-furniture-scaler',
    i18nKey: 'floorPlanFurnitureScaler',
    name: 'Interactive 2D Floor Plan & Room Furniture Scaler',
    category: 'documents',
    categoryLabel: 'Documents / Design',
    description: 'Calibrate scale from architectural blueprint images and drag standard furniture items to verify room clearances offline.',
    keywords: ['floor plan scaler', 'measure blueprint', 'room planner', 'furniture layout'],
    status: 'ready',
    route: '/tools/floor-plan-furniture-scaler',
    techStack: 'Canvas 2D • Scale Vector Math • Dimension Ruler',
    icon: '📐',
  },
  {
    id: 'emergency-recovery-kit',
    i18nKey: 'emergencyRecoveryKit',
    name: 'Printable Emergency Recovery & Password Kit Sheet',
    category: 'privacy',
    categoryLabel: 'Privacy',
    description: 'Generate high-security offline paper recovery sheets for password managers, 2FA backup codes, and crypto seed phrases.',
    keywords: ['emergency recovery kit', 'password backup sheet', 'crypto seed phrase paper', '2fa backup'],
    status: 'ready',
    route: '/tools/emergency-recovery-kit',
    techStack: 'Vector PDF • High-Density QR Matrix • Web Crypto',
    icon: '📜',
  },
  {
    id: 'csv-vector-chart-builder',
    i18nKey: 'csvVectorChartBuilder',
    name: 'CSV / Paste to Vector Chart & Infographic Builder',
    category: 'dev',
    categoryLabel: 'Dev / Data',
    description: 'Transform spreadsheet data into publication-ready SVG bar charts, line plots, and infographics with instant SVG and PNG export.',
    keywords: ['csv to chart', 'chart maker', 'svg chart', 'infographic builder', 'data visualization'],
    status: 'ready',
    route: '/tools/csv-vector-chart-builder',
    techStack: 'PapaParse • Vector SVG Math • Canvas Exporter',
    icon: '📈',
  },
];

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, Badge, Card, TranslatePipe],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1200px;">
      <!-- Hero Presentation Section -->
      <div class="l-columns__area g--text-center g--margin-bottom-8">
        <div class="g--flex-center g--margin-bottom-4">
          <app-badge variant="privacy" [dot]="true">
            {{ 'home.heroBadge' | translate }}
          </app-badge>
        </div>

        <h1 style="font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.02em;">
          {{ 'home.heroHeadingStart' | translate }}<br />
          <span style="color: var(--color-primary);">{{ 'home.heroHeadingHighlight' | translate }}</span>
        </h1>

        <p class="g--margin-top-4 g--margin-x-auto" style="max-width: 680px; font-size: 1.25rem; color: var(--color-text-secondary); line-height: 1.6;">
          {{ 'home.heroDescription' | translate }}
        </p>

        <!-- Platform Pillars Badge Ribbon -->
        <div class="g--flex-center g--margin-top-6" style="gap: 12px; flex-wrap: wrap;">
          <app-badge variant="neutral">{{ 'home.ribbonTools' | translate }}</app-badge>
          <app-badge variant="neutral">{{ 'home.ribbonZeroBytes' | translate }}</app-badge>
          <app-badge variant="neutral">{{ 'home.ribbonWasm' | translate }}</app-badge>
          <app-badge variant="neutral">{{ 'home.ribbonOpenSource' | translate }}</app-badge>
        </div>
      </div>

      <!-- Search & Category Filters Bar -->
      <div class="l-columns__area g--margin-bottom-6">
        <div class="c-card" style="padding: 16px;">
          <div class="l-columns l-columns--1" style="gap: 16px;">
            <!-- Search Bar -->
            <div>
              <input
                type="text"
                class="c-input"
                [placeholder]="'home.searchPlaceholder' | translate"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                style="width: 100%; font-size: 1rem; padding: 12px 16px;" />
            </div>

            <!-- Category Pills -->
            <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap; justify-content: flex-start;">
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === 'all'"
                [class.c-button--outline]="selectedCategory() !== 'all'"
                (click)="selectedCategory.set('all')">
                {{ 'home.categories.all' | translate }} ({{ allCount() }})
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === 'privacy'"
                [class.c-button--outline]="selectedCategory() !== 'privacy'"
                (click)="selectedCategory.set('privacy')">
                {{ 'home.categories.privacy' | translate }}
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === 'documents'"
                [class.c-button--outline]="selectedCategory() !== 'documents'"
                (click)="selectedCategory.set('documents')">
                {{ 'home.categories.documents' | translate }}
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === 'media'"
                [class.c-button--outline]="selectedCategory() !== 'media'"
                (click)="selectedCategory.set('media')">
                {{ 'home.categories.media' | translate }}
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === 'dev'"
                [class.c-button--outline]="selectedCategory() !== 'dev'"
                (click)="selectedCategory.set('dev')">
                {{ 'home.categories.dev' | translate }}
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === '3d'"
                [class.c-button--outline]="selectedCategory() !== '3d'"
                (click)="selectedCategory.set('3d')">
                {{ 'home.categories.3d' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tools Grid -->
      <div class="l-columns__area g--margin-bottom-8">
        <div class="l-columns l-columns--3 l-columns--cards" style="gap: 20px;">
          @for (tool of filteredTools(); track tool.id) {
            <div class="l-columns__area">
              <app-card [interactive]="tool.status === 'ready'" [hasHeader]="true" [hasFooter]="true">
                <!-- Card Header -->
                <div card-header class="l-extremo" style="align-items: center; width: 100%;">
                  <span style="font-size: 1.5rem;" aria-hidden="true">{{ tool.icon }}</span>
                  <div>
                    @if (tool.status === 'ready') {
                      <app-badge variant="success" [dot]="true">{{ 'common.readyToUse' | translate }}</app-badge>
                    } @else {
                      <app-badge variant="neutral">{{ 'common.roadmap' | translate }}</app-badge>
                    }
                  </div>
                </div>

                <!-- Card Body -->
                <div>
                  <h3 style="font-size: 1.125rem; font-weight: 600; line-height: 1.3; margin-bottom: 8px;">
                    {{ tool.i18nKey ? ('tools.' + tool.i18nKey + '.name' | translate) : tool.name }}
                  </h3>
                  <p style="color: var(--color-text-secondary); font-size: 0.875rem; line-height: 1.5; margin-bottom: 12px;">
                    {{ tool.i18nKey ? ('tools.' + tool.i18nKey + '.description' | translate) : tool.description }}
                  </p>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">
                    ⚡ {{ tool.techStack }}
                  </div>
                </div>

                <!-- Card Footer Action -->
                <div card-footer class="l-extremo" style="align-items: center; width: 100%;">
                  <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500;">
                    {{ 'home.categories.' + (tool.category === 'audio-video' ? 'audioVideo' : tool.category) | translate }}
                  </span>
                  <div>
                    @if (tool.status === 'ready' && tool.route) {
                      <a [routerLink]="tool.route" class="c-button c-button--primary c-button--small">
                        {{ 'common.openTool' | translate }} &rarr;
                      </a>
                    } @else {
                      <span style="font-size: 0.75rem; color: var(--color-text-muted); font-style: italic;">
                        {{ 'common.comingSoon' | translate }}
                      </span>
                    }
                  </div>
                </div>
              </app-card>
            </div>
          }
        </div>

        @if (filteredTools().length === 0) {
          <div class="g--text-center g--padding-y-8">
            <p style="color: var(--color-text-muted); font-size: 1.125rem;">
              {{ 'home.noResultsTitle' | translate }}
            </p>
            <button
              type="button"
              class="c-button c-button--outline g--margin-top-4"
              (click)="resetFilters()">
              {{ 'common.clearFilters' | translate }}
            </button>
          </div>
        }
      </div>

      <!-- Core Philosophy: "Privacy by Architecture" (3 Pillars) -->
      <div class="l-columns__area g--margin-bottom-8">
        <div class="g--text-center g--margin-bottom-6">
          <app-badge variant="privacy">{{ 'common.guaranteedClientSide' | translate }}</app-badge>
          <h2 class="g--margin-top-2">{{ 'home.privacyByArchTitle' | translate }}</h2>
          <p style="color: var(--color-text-muted); max-width: 640px; margin: 8px auto 0;">
            {{ 'home.privacyByArchDesc' | translate }}
          </p>
        </div>

        <div class="l-columns l-columns--3 l-columns--cards" style="gap: 20px;">
          <div class="l-columns__area">
            <app-card [title]="'🛡️ ' + ('home.pillars.zeroServerTitle' | translate)">
              <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6;">
                {{ 'home.pillars.zeroServerDesc' | translate }}
              </p>
            </app-card>
          </div>

          <div class="l-columns__area">
            <app-card [title]="'🚫 ' + ('home.pillars.privacyTitle' | translate)">
              <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6;">
                {{ 'home.pillars.privacyDesc' | translate }}
              </p>
            </app-card>
          </div>

          <div class="l-columns__area">
            <app-card [title]="'⚡ ' + ('home.pillars.threadTitle' | translate)">
              <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6;">
                {{ 'home.pillars.threadDesc' | translate }}
              </p>
            </app-card>
          </div>
        </div>
      </div>

      <!-- Verification & Open Source Footer Callout -->
      <div class="l-columns__area g--margin-bottom-6">
        <app-card>
          <div class="l-extremo" style="align-items: center; gap: 24px; flex-wrap: wrap;">
            <div>
              <h3 style="font-size: 1.25rem; font-weight: 700;">{{ 'home.verifiableTitle' | translate }}</h3>
              <p style="color: var(--color-text-muted); font-size: 0.875rem; margin-top: 4px;">
                {{ 'home.verifiableDesc' | translate }}
              </p>
            </div>
            <div class="g--flex-center" style="gap: 12px; flex-wrap: wrap;">
              <a
                href="https://github.com/david13penalver/PrivKnife"
                target="_blank"
                rel="noopener noreferrer"
                class="c-button c-button--outline">
                {{ 'home.githubRepo' | translate }} &rarr;
              </a>
              <a routerLink="/ui-kit" class="c-button c-button--outline">
                {{ 'home.uiKitDesignSystem' | translate }} &rarr;
              </a>
            </div>
          </div>
        </app-card>
      </div>
    </div>
  `,
})
export class Home {
  private readonly i18n = inject(I18nService);

  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('all');
  readonly allTools = signal<CatalogTool[]>(CATALOG_TOOLS);

  readonly allCount = computed(() => this.allTools().length);

  readonly filteredTools = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    // Reactively track current language signal
    this.i18n.currentLang();

    return this.allTools().filter((tool) => {
      // Category match
      const matchesCategory = cat === 'all' || tool.category === cat;
      if (!matchesCategory) return false;

      // Search match
      if (!q) return true;
      const translatedName = tool.i18nKey ? this.i18n.t(`tools.${tool.i18nKey}.name`) : '';
      const translatedDesc = tool.i18nKey ? this.i18n.t(`tools.${tool.i18nKey}.description`) : '';
      const inName = tool.name.toLowerCase().includes(q) || translatedName.toLowerCase().includes(q);
      const inDesc = tool.description.toLowerCase().includes(q) || translatedDesc.toLowerCase().includes(q);
      const inKeywords = tool.keywords.some((k) => k.toLowerCase().includes(q));
      return inName || inDesc || inKeywords;
    });
  });

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
  }
}
