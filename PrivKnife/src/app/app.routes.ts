import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'PrivKnife — Private In-Browser Swiss Army Knife',
    data: {
      description:
        'A private, client-side Swiss Army Knife of everyday tools. PDF tools, media compressors, EXIF strippers, 3D generators — 100% in-browser with zero servers and zero telemetry.',
      keywords: ['privacy', 'swiss army knife', 'client-side tools', 'wasm', 'browser tools'],
      url: '/',
    },
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'ui-kit',
    title: 'UI Kit & Design System — PrivKnife',
    data: {
      description: 'Explore the 6-layer SASS and BEM visual component system powering PrivKnife.',
      keywords: ['design system', 'ui kit', 'bem', 'components', 'sass'],
      url: '/ui-kit',
    },
    loadComponent: () => import('./pages/showcase/showcase').then((m) => m.Showcase),
  },
  {
    path: 'privacy',
    title: 'Privacy Policy & Architecture — PrivKnife',
    data: {
      description:
        'PrivKnife operates with zero servers and zero telemetry. Learn how our client-side architecture keeps your sensitive files on your machine.',
      keywords: ['privacy policy', 'zero telemetry', 'zero knowledge', 'in-browser', 'gdpr compliance'],
      url: '/privacy',
    },
    loadComponent: () => import('./pages/privacy/privacy').then((m) => m.Privacy),
  },
  {
    path: 'terms',
    title: 'Terms of Service — PrivKnife',
    data: {
      description:
        'Terms of Service and MIT Open Source License for PrivKnife. You retain 100% ownership of all processed files.',
      keywords: ['terms of service', 'mit license', 'open source', 'user ownership'],
      url: '/terms',
    },
    loadComponent: () => import('./pages/terms/terms').then((m) => m.Terms),
  },
  {
    path: 'tools/exif-stripper',
    title: 'EXIF Metadata Stripper & Privacy Cleaner — PrivKnife',
    data: {
      description:
        'Strip GPS location, camera model, and device timestamps from your photos online for free. 100% in-browser with zero file uploads.',
      keywords: [
        'remove exif data',
        'exif stripper',
        'photo metadata cleaner',
        'remove gps from photo',
        'privacy photo stripper',
      ],
      url: '/tools/exif-stripper',
    },
    loadComponent: () =>
      import('./tools/privacy/exif-stripper').then((m) => m.ExifStripperComponent),
  },
  {
    path: 'tools/crypto-hash-uuid',
    title: 'Cryptographic Hash & UUID Batch Generator — PrivKnife',
    data: {
      description:
        'Generate RFC 4122 UUIDv4 identifiers and calculate SHA-256, SHA-512, SHA-1, or MD5 digests in bulk. 100% in-browser with zero server roundtrips.',
      keywords: [
        'uuid generator',
        'uuidv4 batch',
        'hash generator',
        'sha256 online',
        'sha512 generator',
        'md5 bulk',
        'client side hashing',
      ],
      url: '/tools/crypto-hash-uuid',
    },
    loadComponent: () =>
      import('./tools/privacy/crypto-hash-uuid').then((m) => m.CryptoHashUuidComponent),
  },
  {
    path: 'tools/csv-to-sql-json',
    title: 'CSV / Excel to JSON, SQL & Markdown Converter — PrivKnife',
    data: {
      description:
        'Convert spreadsheets into structured JSON, SQL INSERT scripts, or Markdown tables offline with zero server roundtrips.',
      keywords: [
        'csv to json',
        'csv to sql',
        'excel to json',
        'csv to markdown',
        'excel to sql insert',
        'client side csv converter',
      ],
      url: '/tools/csv-to-sql-json',
    },
    loadComponent: () =>
      import('./tools/dev/csv-converter').then((m) => m.CsvConverterComponent),
  },
  {
    path: 'tools/pdf-merger-splitter',
    title: 'PDF Merger, Splitter & Page Organizer — PrivKnife',
    data: {
      description:
        'Combine multiple PDF files, delete sensitive pages, or rotate sheets 100% locally in browser memory with zero upload limits.',
      keywords: [
        'merge pdf',
        'combine pdf',
        'split pdf',
        'organize pdf pages',
        'rotate pdf',
        'client side pdf merger',
      ],
      url: '/tools/pdf-merger-splitter',
    },
    loadComponent: () =>
      import('./tools/documents/pdf-merger').then((m) => m.PdfMergerComponent),
  },
  {
    path: 'tools/pdf-redaction',
    title: 'PDF Redaction & Anonymizer — PrivKnife',
    data: {
      description:
        'Permanently black out or white out sensitive information, numbers, and names from PDFs. 100% in-browser flattening destroys un-rendered text layers permanently.',
      keywords: [
        'redact pdf',
        'pdf redaction',
        'anonymize pdf',
        'black out pdf',
        'redact pdf online safe',
        'sanitize pdf',
      ],
      url: '/tools/pdf-redaction',
    },
    loadComponent: () =>
      import('./tools/privacy/pdf-redaction').then((m) => m.PdfRedactionComponent),
  },
  {
    path: 'tools/invoice-maker',
    title: 'Instant Client-Side Invoice & Receipt Maker — PrivKnife',
    data: {
      description:
        'Free invoice generator with no sign up. Generate professional vector PDF invoices and printable receipts offline. 100% in-browser with zero server tracking.',
      keywords: [
        'free invoice generator no sign up',
        'invoice generator',
        'receipt maker',
        'client side invoice generator',
        'instant invoice maker',
        'private invoice generator',
        'offline invoice pdf',
      ],
      url: '/tools/invoice-maker',
    },
    loadComponent: () =>
      import('./tools/documents/invoice-maker').then((m) => m.InvoiceMakerComponent),
  },
  {
    path: 'tools/invoice-receipt-maker',
    redirectTo: 'tools/invoice-maker',
    pathMatch: 'full',
  },
  {
    path: 'tools/grid-paper',
    title: 'Custom Printable Graph & Dot Grid Paper — PrivKnife',
    data: {
      description:
        'Printable dot grid paper PDF generator. Custom dot grid, square graph, isometric, hexagonal, and ruled paper templates with millimeter precision. 100% in-browser.',
      keywords: [
        'printable dot grid paper pdf',
        'custom graph paper generator',
        'a4 dot grid pdf download',
        'printable isometric paper 5mm',
        'bullet journal refill printable pdf',
        'hexagonal grid printable',
        'ruled paper pdf',
        'client side grid generator',
      ],
      url: '/tools/grid-paper',
    },
    loadComponent: () =>
      import('./tools/documents/grid-paper').then((m) => m.GridPaperComponent),
  },
  {
    path: 'tools/graph-dot-grid-paper',
    redirectTo: 'tools/grid-paper',
    pathMatch: 'full',
  },
  {
    path: 'tools/barcode-labels',
    title: 'Avery® Barcode & Label Sheet Generator — PrivKnife',
    data: {
      description:
        'Generate precision grid-aligned barcode sticker sheets for standard Avery® labels (5160, 5163, 5167, L7160). 100% in-browser with zero server uploads.',
      keywords: [
        'avery 5160 barcode generator',
        'barcode label sheet generator',
        'print barcodes on avery labels',
        'free avery label template with barcodes',
        'generate avery 5163 barcode stickers',
        'sequential barcode sticker sheet',
        'client side barcode generator',
        'upc label sheet generator',
      ],
      url: '/tools/barcode-labels',
    },
    loadComponent: () =>
      import('./tools/documents/barcode-labels').then((m) => m.BarcodeLabelsComponent),
  },
  {
    path: 'tools/avery-barcode-sheet',
    redirectTo: 'tools/barcode-labels',
    pathMatch: 'full',
  },
  {
    path: 'tools/table-tent-maker',
    title: 'Foldable Table Tent & Counter Sign Maker — PrivKnife',
    data: {
      description:
        'Create print-ready foldable triangular table signs with menus, QR codes, or Wi-Fi login badges with millimeter crease fold lines. 100% in-browser.',
      keywords: [
        'printable table tent generator',
        'free table tent template pdf',
        'qr code counter sign maker',
        'printable desk nameplate tent',
        'a4 table tent maker with fold lines',
        'restaurant menu table tent',
        'wedding table number tent card',
      ],
      url: '/tools/table-tent-maker',
    },
    loadComponent: () =>
      import('./tools/documents/table-tent-maker').then((m) => m.TableTentMakerComponent),
  },
  {
    path: 'tools/table-tent',
    redirectTo: 'tools/table-tent-maker',
    pathMatch: 'full',
  },
  {
    path: 'tools/batch-image-compressor',
    title: 'Batch Image Compressor & WebP Converter — PrivKnife',
    data: {
      description:
        'Losslessly compress hundreds of photos and convert them to modern WebP with zero upload limits. 100% in-browser with instant ZIP download.',
      keywords: [
        'bulk image compressor no upload',
        'batch image compressor',
        'convert png to webp batch',
        'offline bulk image compressor',
        'compress images in browser',
        'client side webp converter',
        'batch photo optimizer',
      ],
      url: '/tools/batch-image-compressor',
    },
    loadComponent: () =>
      import('./tools/media/batch-compressor').then((m) => m.BatchCompressorComponent),
  },
  {
    path: 'tools/image-compressor',
    redirectTo: 'tools/batch-image-compressor',
    pathMatch: 'full',
  },
  {
    path: 'tools/background-remover',
    title: 'Automated Background Removal (High Quality) — PrivKnife',
    data: {
      description:
        'Instant, client-side background removal producing clean transparent .png cutouts. 100% in-browser with zero server uploads and zero watermarks.',
      keywords: [
        'remove background free',
        'remove background from product photo',
        'remove background free no watermark',
        'transparent png converter',
        'car photo background remover',
        'client side background remover',
        'free background eraser',
        'chroma key background remover',
      ],
      url: '/tools/background-remover',
    },
    loadComponent: () =>
      import('./tools/media/background-remover').then(
        (m) => m.BackgroundRemoverComponent
      ),
  },
  {
    path: 'tools/remove-background',
    redirectTo: 'tools/background-remover',
    pathMatch: 'full',
  },
  {
    path: 'tools/bg-remover',
    redirectTo: 'tools/background-remover',
    pathMatch: 'full',
  },
  {
    path: 'tools/favicon-app-icon-suite',
    title: 'App Icon & Favicon Suite Generator — PrivKnife',
    data: {
      description:
        'Transform any logo into a complete package of multi-resolution favicon.ico, Apple touch icons, Android Chrome PWAs, and web manifests. 100% client-side with zero telemetry.',
      keywords: [
        'favicon generator',
        'app icon generator',
        'favicon.ico maker',
        'apple-touch-icon generator',
        'pwa icons',
        'site.webmanifest generator',
        'offline favicon suite generator',
      ],
      url: '/tools/favicon-app-icon-suite',
    },
    loadComponent: () =>
      import('./tools/media/favicon-generator').then((m) => m.FaviconGeneratorComponent),
  },
  {
    path: 'tools/favicon-generator',
    redirectTo: 'tools/favicon-app-icon-suite',
    pathMatch: 'full',
  },
  {
    path: 'tools/og-card-maker',
    title: 'Social Share (Open Graph) Card Maker — PrivKnife',
    data: {
      description:
        'Generate high-CTR 1200×630 Open Graph preview cards for Twitter, Facebook, and LinkedIn in seconds. 100% in-browser with zero telemetry.',
      keywords: [
        'og image generator online',
        'open graph card maker',
        'twitter card generator 1200x630',
        'github social preview generator',
        'linkedin card builder',
        'social share preview card',
        'free og card maker offline',
      ],
      url: '/tools/og-card-maker',
    },
    loadComponent: () =>
      import('./tools/media/og-card-maker').then((m) => m.OgCardMakerComponent),
  },
  {
    path: 'tools/social-share-card',
    redirectTo: 'tools/og-card-maker',
    pathMatch: 'full',
  },
  {
    path: 'tools/color-palette-extractor',
    title: 'Color Palette Extractor & Contrast Checker — PrivKnife',
    data: {
      description:
        'Extract dominant color palettes from any photo and verify WCAG 2.1 AA text readability ratios instantly. 100% in-browser with zero telemetry.',
      keywords: [
        'extract palette from image',
        'wcag color matrix generator',
        'extract color palette to ase',
        'image color accessibility checker',
        'bulk contrast ratio check',
        'color contrast matrix',
        'client side palette extractor',
      ],
      url: '/tools/color-palette-extractor',
    },
    loadComponent: () =>
      import('./tools/dev/color-palette-extractor').then(
        (m) => m.ColorPaletteExtractorComponent
      ),
  },
  {
    path: 'tools/palette-contrast',
    redirectTo: 'tools/color-palette-extractor',
    pathMatch: 'full',
  },
  {
    path: 'tools/css-mesh-gradient-maker',
    title: 'CSS Mesh Gradient & Glassmorphism Code Maker — PrivKnife',
    data: {
      description:
        'Design fluid multi-point radial mesh gradients and frosted glassmorphism UI cards with copy-ready Pure CSS, Tailwind classes, and 1200x800 PNG download.',
      keywords: [
        'css mesh gradient generator',
        'glassmorphism generator',
        'css backdrop-filter blur tool',
        'tailwind glassmorphism classes',
        'mesh gradient to png export',
        'fluid gradient maker offline',
        'client side css gradient designer',
      ],
      url: '/tools/css-mesh-gradient-maker',
    },
    loadComponent: () =>
      import('./tools/dev/mesh-gradient-maker').then(
        (m) => m.MeshGradientMakerComponent
      ),
  },
  {
    path: 'tools/mesh-gradient',
    redirectTo: 'tools/css-mesh-gradient-maker',
    pathMatch: 'full',
  },
  {
    path: 'tools/subtitles-shifter',
    title: 'Subtitles Timestamp Shifter & SRT/VTT Converter — PrivKnife',
    data: {
      description:
        'Shift subtitle delays in milliseconds or seconds, apply FPS conversion scaling, and convert between SRT and WebVTT formats offline. 100% in-browser.',
      keywords: [
        'shift srt subtitles online',
        'sync srt files',
        'convert srt to vtt free',
        'fix subtitle delay online',
        'vtt time offset tool',
        'adjust subtitle fps 24 to 25',
        'client side subtitle shifter',
        'offline srt vtt converter',
      ],
      url: '/tools/subtitles-shifter',
    },
    loadComponent: () =>
      import('./tools/media/subtitles-shifter').then(
        (m) => m.SubtitlesShifterComponent
      ),
  },
  {
    path: 'tools/subtitle-shifter',
    redirectTo: 'tools/subtitles-shifter',
    pathMatch: 'full',
  },
  {
    path: 'tools/srt-vtt-converter',
    redirectTo: 'tools/subtitles-shifter',
    pathMatch: 'full',
  },
  {
    path: 'tools/calendar-linker',
    title: 'Universal Event & .ics Calendar Linker — PrivKnife',
    data: {
      description:
        'Generate universal "Add to Calendar" links for Google, Outlook, Office 365, and Yahoo, plus standard RFC 5545 .ics files and email embed snippets offline.',
      keywords: [
        'add to calendar link generator',
        'free ics file generator online',
        'create add to calendar button for email',
        'google calendar url builder',
        'outlook invite link maker',
        'rfc 5545 ics maker offline',
        'client side event calendar linker',
      ],
      url: '/tools/calendar-linker',
    },
    loadComponent: () =>
      import('./tools/dev/calendar-linker').then(
        (m) => m.CalendarLinkerComponent
      ),
  },
  {
    path: 'tools/event-calendar-linker',
    redirectTo: 'tools/calendar-linker',
    pathMatch: 'full',
  },
  {
    path: 'tools/email-signature-generator',
    title: 'Free HTML Email Signature Generator — PrivKnife',
    data: {
      description:
        'Create professional, responsive HTML email signatures for Gmail, Outlook, and Apple Mail with zero server uploads, zero tracking, and instant rich-text copying.',
      keywords: [
        'free html email signature maker',
        'gmail signature generator',
        'outlook html signature builder',
        'no sign up email signature tool',
        'raw html email signature generator',
        'responsive email signature templates',
        'client side signature maker',
      ],
      url: '/tools/email-signature-generator',
    },
    loadComponent: () =>
      import('./tools/dev/email-signature-generator').then(
        (m) => m.EmailSignatureGeneratorComponent
      ),
  },
  {
    path: 'tools/html-email-signature',
    redirectTo: 'tools/email-signature-generator',
    pathMatch: 'full',
  },
  {
    path: 'tools/email-signature',
    redirectTo: 'tools/email-signature-generator',
    pathMatch: 'full',
  },
  {
    path: 'tools/robots-sitemap-builder',
    title: 'Robots.txt & XML Sitemap Builder — PrivKnife',
    data: {
      description:
        'Generate valid search crawler directives (robots.txt) and valid XML sitemaps client-side with AI bot blocking, bulk URL parsing, and instant export.',
      keywords: [
        'robots txt generator tool',
        'xml sitemap builder free',
        'bulk sitemap generator',
        'block ai scrapers robots txt',
        'gptbot claudebot robots txt',
        'sitemap xml validator',
        'client side robots txt maker',
      ],
      url: '/tools/robots-sitemap-builder',
    },
    loadComponent: () =>
      import('./tools/dev/robots-sitemap-builder').then(
        (m) => m.RobotsSitemapBuilderComponent
      ),
  },
  {
    path: 'tools/robots-txt-generator',
    redirectTo: 'tools/robots-sitemap-builder',
    pathMatch: 'full',
  },
  {
    path: 'tools/dns-checker',
    title: 'Global DNS Propagation & WHOIS Checker — PrivKnife',
    data: {
      description:
        'Verify DNS record propagation across multiple global Anycast resolvers in real time using direct browser DNS-over-HTTPS (DoH) and inspect RDAP domain registration records.',
      keywords: [
        'dns propagation checker',
        'check A record propagation',
        'online whois lookup tool',
        'test mx record global',
        'dns over https checker',
        'browser doh lookup',
        'global dns lookup tool',
      ],
      url: '/tools/dns-checker',
    },
    loadComponent: () =>
      import('./tools/dev/dns-checker').then((m) => m.DnsCheckerComponent),
  },
  {
    path: 'tools/dns-propagation',
    redirectTo: 'tools/dns-checker',
    pathMatch: 'full',
  },
  {
    path: 'tools/whois-checker',
    redirectTo: 'tools/dns-checker',
    pathMatch: 'full',
  },
  {
    path: 'tools/web-vitals',
    title: 'Website Performance & Core Web Vitals Checker — PrivKnife',
    data: {
      description:
        'Audit page loading speed, inspect official Google Core Web Vitals (LCP, INP, CLS, FCP, TTFB), and receive actionable developer diagnostics directly from your browser.',
      keywords: [
        'check website speed online',
        'core web vitals checker',
        'free page speed test',
        'lighthouse audit online',
        'lcp cls inp checker',
        'website performance test',
        'mobile speed test online',
      ],
      url: '/tools/web-vitals',
    },
    loadComponent: () =>
      import('./tools/dev/web-vitals').then((m) => m.WebVitalsComponent),
  },
  {
    path: 'tools/pagespeed-checker',
    redirectTo: 'tools/web-vitals',
    pathMatch: 'full',
  },
  {
    path: 'tools/core-web-vitals',
    redirectTo: 'tools/web-vitals',
    pathMatch: 'full',
  },
  {
    path: 'tools/markdown-cheatsheet',
    title: 'Markdown to Academic / Tech PDF Cheatsheet — PrivKnife',
    data: {
      description:
        'Transform markdown notes into high-density 2, 3, or 4-column academic and tech reference cheat sheets. 100% in-browser vector PDF generator with zero server uploads.',
      keywords: [
        'markdown cheatsheet maker',
        'markdown to pdf cheatsheet',
        'academic cheatsheet generator',
        'multi column markdown pdf',
        'developer cheatsheet maker',
        'quick reference sheet generator',
        'client side markdown to pdf',
      ],
      url: '/tools/markdown-cheatsheet',
    },
    loadComponent: () =>
      import('./tools/documents/markdown-cheatsheet').then(
        (m) => m.MarkdownCheatsheetComponent
      ),
  },
  {
    path: 'tools/markdown-to-pdf',
    redirectTo: 'tools/markdown-cheatsheet',
    pathMatch: 'full',
  },
  {
    path: 'tools/cheatsheet-maker',
    redirectTo: 'tools/markdown-cheatsheet',
    pathMatch: 'full',
  },
  {
    path: 'tools/audio-bpm-detector',
    title: 'Audio BPM, Pitch & Key Tap Detector — PrivKnife',
    data: {
      description:
        'Detect audio tempo (BPM), musical key, and pitch tuning directly in your browser. Client-side audio file analyzer and interactive tap metronome with zero server uploads.',
      keywords: [
        'find bpm of song online',
        'tap tempo online',
        'detect key of song online',
        'free bpm analyzer no upload',
        'audio pitch detector web',
        'camelot wheel key detector',
        'online metronome tap tempo',
        'client side audio bpm',
      ],
      url: '/tools/audio-bpm-detector',
    },
    loadComponent: () =>
      import('./tools/audio-video/bpm-tap-detector').then(
        (m) => m.BpmTapDetectorComponent
      ),
  },
  {
    path: 'tools/bpm-tap-detector',
    redirectTo: 'tools/audio-bpm-detector',
    pathMatch: 'full',
  },
  {
    path: 'tools/tap-tempo',
    redirectTo: 'tools/audio-bpm-detector',
    pathMatch: 'full',
  },
  {
    path: 'tools/soundwave-art-maker',
    title: 'Spotify Code & Soundwave Art Maker — PrivKnife',
    data: {
      description:
        'Transform audio tracks, voice notes, or Spotify links into custom soundwave art. Export laser-cut vectors (.svg), printable framed posters (.pdf), and dual-color 3D printable models (.stl).',
      keywords: [
        'soundwave art generator stl',
        'spotify code 3d print',
        'custom soundwave stl maker',
        'voice note 3d print generator',
        'printable soundwave art pdf',
        'wedding vows soundwave maker',
        'client side soundwave svg',
      ],
      url: '/tools/soundwave-art-maker',
    },
    loadComponent: () =>
      import('./tools/audio-video/soundwave-art-maker').then(
        (m) => m.SoundwaveArtMakerComponent
      ),
  },
  {
    path: 'tools/soundwave-art',
    redirectTo: 'tools/soundwave-art-maker',
    pathMatch: 'full',
  },
  {
    path: 'tools/video-to-gif',
    title: 'Video to GIF & Clip Trimmer — PrivKnife',
    data: {
      description:
        'Trim video clips and convert them into lightweight animated GIFs or trimmed video clips directly in your browser with zero uploads, zero queues, and zero file size caps.',
      keywords: [
        'convert video to gif without upload',
        'free video to gif offline',
        'trim video in browser free',
        'video to gif maker no watermark',
        'video clip trimmer online',
        'client side video to gif converter',
        'video trimmer no upload',
      ],
      url: '/tools/video-to-gif',
    },
    loadComponent: () =>
      import('./tools/audio-video/video-gif-trimmer').then(
        (m) => m.VideoGifTrimmerComponent
      ),
  },
  {
    path: 'tools/video-trimmer',
    redirectTo: 'tools/video-to-gif',
    pathMatch: 'full',
  },
  {
    path: 'tools/screenshot-mockup',
    title: 'App Screenshot Mockup Studio — PrivKnife',
    data: {
      description:
        'Transform mobile and web app screenshots into realistic 3D angled device frames with customizable drop shadows, glass reflections, metallic finishes, and high-DPI transparent or gradient exports. 100% in-browser.',
      keywords: [
        'device mockup generator free',
        '3d app screenshot mockup',
        'iphone mockup generator no upload',
        'free store screenshot maker',
        'macbook mockup generator',
        'browser mockup frame generator',
        'app store screenshot generator',
        'client side screenshot mockup',
      ],
      url: '/tools/screenshot-mockup',
    },
    loadComponent: () =>
      import('./tools/media/screenshot-mockup').then(
        (m) => m.ScreenshotMockupComponent
      ),
  },
  {
    path: 'tools/app-screenshot-studio',
    redirectTo: 'tools/screenshot-mockup',
    pathMatch: 'full',
  },
  {
    path: 'tools/3d-qr-stand',
    title: '3D QR Stand & Keychain Generator — PrivKnife',
    data: {
      description:
        'Generate slice-ready dual-color .3mf and .stl models of functional tabletop QR code stands, keychain loops, and plaques for 3D printing. 100% in-browser with zero uploads.',
      keywords: [
        'qr code 3d print generator',
        '3d printable qr code stand',
        'custom wifi qr keychain stl',
        'bambu lab multi color qr code generator',
        'dual color qr 3mf',
        'tabletop qr stand 3d print',
        '3mf qr generator',
      ],
      url: '/tools/3d-qr-stand',
    },
    loadComponent: () =>
      import('./tools/3d/qr-stand-keychain').then(
        (m) => m.QrStandKeychainComponent
      ),
  },
  {
    path: 'tools/qr-stand-keychain',
    redirectTo: 'tools/3d-qr-stand',
    pathMatch: 'full',
  },
  {
    path: 'tools/cookie-cutter',
    title: 'Custom Cookie Cutter & Stamp 3D Maker — PrivKnife',
    data: {
      description:
        'Transform silhouettes, graphics, or logos into dual-part 3D-printable cookie cutters and impression stamps. 100% in-browser with slice-ready .3mf and .stl exports.',
      keywords: [
        'custom cookie cutter stl maker',
        '3d print cookie cutter generator',
        'image to cookie cutter stl',
        'free custom stamp stl generator',
        'convert picture to cookie cutter',
        'cookie cutter 3mf',
        'baking 3d print stl',
      ],
      url: '/tools/cookie-cutter',
    },
    loadComponent: () =>
      import('./tools/3d/cookie-cutter').then(
        (m) => m.CookieCutterComponent
      ),
  },
  {
    path: 'tools/cookie-cutter-3d',
    redirectTo: 'tools/cookie-cutter',
    pathMatch: 'full',
  },
  {
    path: 'tools/custom-cookie-cutter',
    redirectTo: 'tools/cookie-cutter',
    pathMatch: 'full',
  },
  {
    path: 'tools/desk-wedge-nameplate',
    title: 'Parametric Desk Wedge & Nameplate Maker — PrivKnife',
    data: {
      description:
        'Design bespoke executive, technical, and medical desk signs with crisp parametric bevels and dual-color typography. Dual-material .3mf and .stl exports.',
      keywords: [
        'custom desk nameplate 3d print stl',
        'desk wedge 3d model generator',
        'dual color desk nameplate 3mf',
        '3d print office name plate free',
        'parametric desk sign generator',
        'bambu lab multi color desk wedge',
        'prusa mmu desk nameplate stl',
      ],
      url: '/tools/desk-wedge-nameplate',
    },
    loadComponent: () =>
      import('./tools/3d/desk-wedge-nameplate').then(
        (m) => m.DeskWedgeNameplateComponent
      ),
  },
  {
    path: 'tools/desk-nameplate',
    redirectTo: 'tools/desk-wedge-nameplate',
    pathMatch: 'full',
  },
  {
    path: '**',
    title: 'Page Not Found — PrivKnife',
    data: {
      description:
        'The tool or page you requested could not be found. Explore 29+ private, client-side tools.',
      url: '/404',
    },
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
