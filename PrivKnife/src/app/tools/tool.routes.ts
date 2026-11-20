import type { Routes } from '@angular/router';
import { withEnglishToolCatalog } from '../core/i18n/route-localization';

export const toolRoutes: Routes = [
  {
    path: 'exif-stripper',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./privacy/exif-stripper').then((m) => m.ExifStripperComponent),
      'exifStripper',
    ),
  },
  {
    path: 'crypto-hash-uuid',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./privacy/crypto-hash-uuid').then((m) => m.CryptoHashUuidComponent),
      'cryptoHash',
    ),
  },
  {
    path: 'csv-to-sql-json',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/csv-converter').then((m) => m.CsvConverterComponent),
      'csvConverter',
    ),
  },
  {
    path: 'pdf-compressor',
    title: 'Client-Side PDF Compressor & Image Downsampler — PrivKnife',
    data: {
      description:
        'Shrink bloated PDF files by up to 80% directly in your browser while preserving selectable vector text. 100% client-side with zero uploads.',
      keywords: [
        'compress pdf',
        'reduce pdf file size',
        'pdf compressor no upload',
        'downsample pdf images',
        'client side pdf compressor',
      ],
      url: '/tools/pdf-compressor',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-compressor/pdf-compressor.component').then((m) => m.PdfCompressorComponent),
      'pdfCompressor',
    ),
  },
  {
    path: 'pdf-image-converter',
    title: 'PDF to Images & Images to PDF Studio — PrivKnife',
    data: {
      description:
        'Convert PDF pages to high-DPI PNG, JPG, or WebP images—or combine and reorder photos into a PDF—100% locally in your browser.',
      keywords: ['pdf to jpg', 'pdf to png', 'pdf to webp', 'images to pdf', 'jpg to pdf', 'scan to pdf'],
      url: '/tools/pdf-image-converter',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-image-converter/pdf-image-converter.component').then(
          (m) => m.PdfImageConverterComponent,
        ),
      'pdfImageConverter',
    ),
  },
  {
    path: 'pdf-password-security',
    title: 'PDF Password Protector & Unlocker (AES-256) — PrivKnife',
    data: {
      description:
        'Encrypt PDFs with AES-256 and print/copy permission locks, or unlock your own password-protected PDFs 100% offline via QPDF WebAssembly.',
      keywords: [
        'protect pdf',
        'encrypt pdf aes 256',
        'unlock pdf offline',
        'remove pdf password client side',
        'qpdf wasm',
      ],
      url: '/tools/pdf-password-security',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-password-security/pdf-password-security.component').then(
          (m) => m.PdfPasswordSecurityComponent,
        ),
      'pdfPasswordSecurity',
    ),
  },
  {
    path: 'pdf-cropper-booklet',
    title: 'PDF Margin Cropper, Resizer & N-Up Booklet Maker — PrivKnife',
    data: {
      description:
        'Auto-trim scanner margins, crop PDF pages with Odd/Even mirror support, standardize to A4/Letter, and generate 2-up/4-up handouts or saddle-stitch booklets locally.',
      keywords: ['crop pdf', 'trim pdf margins', 'resize pdf a4 letter', 'pdf booklet maker', 'n-up pdf'],
      url: '/tools/pdf-cropper-booklet',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-cropper-booklet/pdf-cropper-booklet.component').then(
          (m) => m.PdfCropperBookletComponent,
        ),
      'pdfCropperBooklet',
    ),
  },
  {
    path: 'pdf-form-studio',
    title: 'Interactive PDF Form Filler, Creator & Flattener — PrivKnife',
    data: {
      description:
        'Fill AcroForm PDFs, place new interactive form fields on flat PDFs, or permanently flatten completed forms 100% locally in your browser.',
      keywords: [
        'fill pdf form',
        'create fillable pdf',
        'flatten pdf form',
        'acroform editor',
        'pdf form studio',
      ],
      url: '/tools/pdf-form-studio',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-form-studio/pdf-form-studio.component').then((m) => m.PdfFormStudioComponent),
      'pdfFormStudio',
    ),
  },
  {
    path: 'pdf-visual-compare',
    title: 'Visual PDF Comparison & Overlay Diff Tool — PrivKnife',
    data: {
      description:
        'Spot visual pixel shifts and semantic word edits between two PDF contracts or blueprints using YIQ pixel overlay, curtain slider, and word diff 100% locally.',
      keywords: ['compare pdf', 'pdf diff tool', 'visual pdf overlay', 'contract comparison'],
      url: '/tools/pdf-visual-compare',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-visual-compare/pdf-visual-compare.component').then(
          (m) => m.PdfVisualCompareComponent,
        ),
      'pdfVisualCompare',
    ),
  },
  {
    path: 'pdf-table-extractor',
    title: 'PDF to Excel, CSV & JSON Table Extractor — PrivKnife',
    data: {
      description:
        'Extract tables from PDF statements and reports to Excel (.xlsx), RFC-4180 CSV, JSON, or clipboard TSV with visual column dividers 100% in your browser.',
      keywords: ['pdf to excel', 'pdf to csv', 'extract tables from pdf', 'xlsx offline converter'],
      url: '/tools/pdf-table-extractor',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-table-extractor/pdf-table-extractor.component').then(
          (m) => m.PdfTableExtractorComponent,
        ),
      'pdfTableExtractor',
    ),
  },
  {
    path: 'pdf-to-word-markdown',
    title: 'PDF to Word (DOCX) & Markdown Layout Converter — PrivKnife',
    data: {
      description:
        'Convert digital PDFs into editable Word (.docx) files, clean Markdown (.md), and text with paragraph reflow and 2-column reading order 100% offline.',
      keywords: ['pdf to word', 'pdf to docx', 'pdf to markdown', 'offline word converter'],
      url: '/tools/pdf-to-word-markdown',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-to-word-markdown/pdf-to-word-markdown.component').then(
          (m) => m.PdfToWordMarkdownComponent,
        ),
      'pdfToWordMarkdown',
    ),
  },
  {
    path: 'office-html-to-pdf',
    title: 'Office & HTML to PDF Local Converter - PrivKnife',
    data: {
      seo: {
        title: 'Office (DOCX, XLSX, CSV) & HTML/Markdown to PDF Converter | PrivKnife',
        description:
          'Convert Word .docx, Excel .xlsx, CSV, Markdown, and HTML files into searchable print-ready PDFs inside your browser with zero uploads or tracking leaks.',
        keywords:
          'word to pdf offline, docx to pdf, excel to pdf, xlsx to pdf, html to pdf zero network, markdown to pdf',
      },
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/office-html-to-pdf/office-html-to-pdf.component').then(
          (m) => m.OfficeHtmlToPdfComponent,
        ),
      'officeHtmlToPdf',
    ),
  },
  {
    path: 'pdf-repair-metadata',
    title: 'PDF Structural Repair, Metadata Editor & PDF/A Archiver - PrivKnife',
    data: {
      seo: {
        title: 'Repair Corrupted PDF, Scrub Metadata & Package PDF/A-2b | PrivKnife',
        description:
          'Repair broken PDF XRefs, linearize for Fast Web View, strip JavaScript triggers, scrub hidden metadata/XMP, and package PDF/A-2b archives locally.',
        keywords:
          'repair corrupted pdf, pdf to pdfa, scrub pdf metadata, remove pdf xmp, linearize pdf offline, qpdf wasm',
      },
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-repair-metadata/pdf-repair-metadata.component').then(
          (m) => m.PdfRepairMetadataComponent,
        ),
      'pdfRepairMetadata',
    ),
  },
  {
    path: 'pdf-merger-splitter',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./documents/pdf-merger').then((m) => m.PdfMergerComponent),
      'pdfMerger',
    ),
  },
  {
    path: 'pdf-watermark-numbering',
    title: 'PDF Watermark, Page Numbers & Bates Stamper — PrivKnife',
    data: {
      description:
        'Stamp diagonal or tiled watermarks, page numbers, and sequential legal Bates identifiers onto PDFs 100% locally in your browser.',
      keywords: [
        'watermark pdf',
        'add page numbers to pdf',
        'bates numbering pdf',
        'stamp pdf confidential',
        'client side pdf watermark',
      ],
      url: '/tools/pdf-watermark-numbering',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/pdf-watermark-numbering/pdf-watermark-numbering.component').then(
          (m) => m.PdfWatermarkNumberingComponent,
        ),
      'pdfWatermarkNumbering',
    ),
  },
  {
    path: 'pdf-redaction',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./privacy/pdf-redaction').then((m) => m.PdfRedactionComponent),
      'pdfRedaction',
    ),
  },
  {
    path: 'invoice-maker',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./documents/invoice-maker').then((m) => m.InvoiceMakerComponent),
      'invoiceMaker',
    ),
  },
  {
    path: 'invoice-receipt-maker',
    redirectTo: 'invoice-maker',
    pathMatch: 'full',
  },
  {
    path: 'grid-paper',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./documents/grid-paper').then((m) => m.GridPaperComponent),
      'gridPaper',
    ),
  },
  {
    path: 'graph-dot-grid-paper',
    redirectTo: 'grid-paper',
    pathMatch: 'full',
  },
  {
    path: 'barcode-labels',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./documents/barcode-labels').then((m) => m.BarcodeLabelsComponent),
      'barcodeLabels',
    ),
  },
  {
    path: 'avery-barcode-sheet',
    redirectTo: 'barcode-labels',
    pathMatch: 'full',
  },
  {
    path: 'table-tent-maker',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./documents/table-tent-maker').then((m) => m.TableTentMakerComponent),
      'tableTentMaker',
    ),
  },
  {
    path: 'table-tent',
    redirectTo: 'table-tent-maker',
    pathMatch: 'full',
  },
  {
    path: 'batch-image-compressor',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./media/batch-compressor').then((m) => m.BatchCompressorComponent),
      'batchCompressor',
    ),
  },
  {
    path: 'image-compressor',
    redirectTo: 'batch-image-compressor',
    pathMatch: 'full',
  },
  {
    path: 'background-remover',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./media/background-remover').then((m) => m.BackgroundRemoverComponent),
      'backgroundRemover',
    ),
  },
  {
    path: 'remove-background',
    redirectTo: 'background-remover',
    pathMatch: 'full',
  },
  {
    path: 'bg-remover',
    redirectTo: 'background-remover',
    pathMatch: 'full',
  },
  {
    path: 'bg-removal',
    redirectTo: 'background-remover',
    pathMatch: 'full',
  },
  {
    path: 'favicon-app-icon-suite',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./media/favicon-generator').then((m) => m.FaviconGeneratorComponent),
      'faviconGenerator',
    ),
  },
  {
    path: 'favicon-generator',
    redirectTo: 'favicon-app-icon-suite',
    pathMatch: 'full',
  },
  {
    path: 'og-card-maker',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./media/og-card-maker').then((m) => m.OgCardMakerComponent),
      'ogCardMaker',
    ),
  },
  {
    path: 'social-share-card',
    redirectTo: 'og-card-maker',
    pathMatch: 'full',
  },
  {
    path: 'color-palette-extractor',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/color-palette-extractor').then((m) => m.ColorPaletteExtractorComponent),
      'colorPalette',
    ),
  },
  {
    path: 'palette-contrast',
    redirectTo: 'color-palette-extractor',
    pathMatch: 'full',
  },
  {
    path: 'css-mesh-gradient-maker',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/mesh-gradient-maker').then((m) => m.MeshGradientMakerComponent),
      'meshGradient',
    ),
  },
  {
    path: 'mesh-gradient',
    redirectTo: 'css-mesh-gradient-maker',
    pathMatch: 'full',
  },
  {
    path: 'subtitles-shifter',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./media/subtitles-shifter').then((m) => m.SubtitlesShifterComponent),
      'subtitlesShifter',
    ),
  },
  {
    path: 'subtitle-shifter',
    redirectTo: 'subtitles-shifter',
    pathMatch: 'full',
  },
  {
    path: 'srt-vtt-converter',
    redirectTo: 'subtitles-shifter',
    pathMatch: 'full',
  },
  {
    path: 'calendar-linker',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/calendar-linker').then((m) => m.CalendarLinkerComponent),
      'calendarLinker',
    ),
  },
  {
    path: 'event-calendar-linker',
    redirectTo: 'calendar-linker',
    pathMatch: 'full',
  },
  {
    path: 'email-signature-generator',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/email-signature-generator').then((m) => m.EmailSignatureGeneratorComponent),
      'emailSignature',
    ),
  },
  {
    path: 'html-email-signature',
    redirectTo: 'email-signature-generator',
    pathMatch: 'full',
  },
  {
    path: 'email-signature',
    redirectTo: 'email-signature-generator',
    pathMatch: 'full',
  },
  {
    path: 'robots-sitemap-builder',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/robots-sitemap-builder').then((m) => m.RobotsSitemapBuilderComponent),
      'robotsSitemap',
    ),
  },
  {
    path: 'robots-txt-generator',
    redirectTo: 'robots-sitemap-builder',
    pathMatch: 'full',
  },
  {
    path: 'dns-checker',
    title: 'DNS Resolver Comparison — PrivKnife',
    data: {
      description:
        'Compare DNS answers from selected public resolvers with direct browser DNS-over-HTTPS requests after reviewing the disclosure and authorizing the query.',
      keywords: [
        'dns resolver comparison',
        'check DNS records',
        'public DNS resolver',
        'compare A and MX records',
        'dns over https checker',
        'browser doh lookup',
      ],
      url: '/tools/dns-checker',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/dns-checker').then((m) => m.DnsCheckerComponent),
      'dnsChecker',
    ),
  },
  {
    path: 'dns-propagation',
    redirectTo: 'dns-checker',
    pathMatch: 'full',
  },
  {
    path: 'whois-checker',
    redirectTo: 'dns-checker',
    pathMatch: 'full',
  },
  {
    path: 'web-vitals',
    title: 'Web Vitals checker unavailable — PrivKnife privacy notice',
    data: {
      description:
        'This legacy route is disabled because its PageSpeed service sends the submitted website URL to Google for processing.',
      keywords: ['privacy notice', 'disabled tool'],
      url: '/tools/web-vitals',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/web-vitals').then((m) => m.WebVitalsComponent),
      'webVitals',
    ),
  },
  {
    path: 'pagespeed-checker',
    redirectTo: 'web-vitals',
    pathMatch: 'full',
  },
  {
    path: 'core-web-vitals',
    redirectTo: 'web-vitals',
    pathMatch: 'full',
  },
  {
    path: 'markdown-cheatsheet',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./documents/markdown-cheatsheet').then((m) => m.MarkdownCheatsheetComponent),
      'markdownCheatsheet',
    ),
  },
  {
    path: 'markdown-to-pdf',
    redirectTo: 'markdown-cheatsheet',
    pathMatch: 'full',
  },
  {
    path: 'cheatsheet-maker',
    redirectTo: 'markdown-cheatsheet',
    pathMatch: 'full',
  },
  {
    path: 'audio-bpm-detector',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./audio-video/bpm-tap-detector').then((m) => m.BpmTapDetectorComponent),
      'bpmTapDetector',
    ),
  },
  {
    path: 'bpm-tap-detector',
    redirectTo: 'audio-bpm-detector',
    pathMatch: 'full',
  },
  {
    path: 'tap-tempo',
    redirectTo: 'audio-bpm-detector',
    pathMatch: 'full',
  },
  {
    path: 'soundwave-art-maker',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./audio-video/soundwave-art-maker').then((m) => m.SoundwaveArtMakerComponent),
      'soundwaveArt',
    ),
  },
  {
    path: 'soundwave-art',
    redirectTo: 'soundwave-art-maker',
    pathMatch: 'full',
  },
  {
    path: 'video-to-gif',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./audio-video/video-gif-trimmer').then((m) => m.VideoGifTrimmerComponent),
      'videoGifTrimmer',
    ),
  },
  {
    path: 'video-trimmer',
    redirectTo: 'video-to-gif',
    pathMatch: 'full',
  },
  {
    path: 'screenshot-mockup',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./media/screenshot-mockup').then((m) => m.ScreenshotMockupComponent),
      'screenshotMockup',
    ),
  },
  {
    path: 'app-screenshot-studio',
    redirectTo: 'screenshot-mockup',
    pathMatch: 'full',
  },
  {
    path: '3d-qr-stand',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/qr-stand-keychain').then((m) => m.QrStandKeychainComponent),
      'qrStandKeychain',
    ),
  },
  {
    path: 'qr-stand-keychain',
    redirectTo: '3d-qr-stand',
    pathMatch: 'full',
  },
  {
    path: 'cookie-cutter',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/cookie-cutter').then((m) => m.CookieCutterComponent),
      'cookieCutter',
    ),
  },
  {
    path: 'cookie-cutter-3d',
    redirectTo: 'cookie-cutter',
    pathMatch: 'full',
  },
  {
    path: 'custom-cookie-cutter',
    redirectTo: 'cookie-cutter',
    pathMatch: 'full',
  },
  {
    path: 'desk-wedge-nameplate',
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
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/desk-wedge-nameplate').then((m) => m.DeskWedgeNameplateComponent),
      'deskWedge',
    ),
  },
  {
    path: 'desk-nameplate',
    redirectTo: 'desk-wedge-nameplate',
    pathMatch: 'full',
  },
  {
    path: 'nameplate-maker',
    redirectTo: 'desk-wedge-nameplate',
    pathMatch: 'full',
  },
  {
    path: 'parametric-lamp-designer',
    title: '3D Parametric Lamp & Lampshade Designer — PrivKnife',
    data: {
      description:
        'Design custom spiral, ribbed, fluted, and organic lampshades with standard E27/E14 socket mounts. Watertight shell and spiralize vase mode STL & 3MF exports.',
      keywords: [
        '3d printed lamp shade generator parametric stl',
        'custom lampshade 3d print',
        'spiral vase mode lamp shade stl',
        'e27 socket lampshade generator',
        'parametric lighting 3d print',
        'bambu lab lampshade 3mf',
        'prusa vase mode lamp',
        'organic fluted lampshade 3d model',
      ],
      url: '/tools/parametric-lamp-designer',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/parametric-lamp-designer').then((m) => m.ParametricLampDesignerComponent),
      'parametricLampDesigner',
    ),
  },
  {
    path: 'lamp-designer',
    redirectTo: 'parametric-lamp-designer',
    pathMatch: 'full',
  },
  {
    path: 'lampshade-studio',
    redirectTo: 'parametric-lamp-designer',
    pathMatch: 'full',
  },
  {
    path: 'lithophane-maker',
    title: 'Curved & Flat 3D Lithophane Maker — PrivKnife',
    data: {
      description:
        'Turn digital photos into high-detail 3D printable lithophanes with flat, curved arc, 360° cylindrical, and nightlight geometries with real-time backlit preview.',
      keywords: [
        'lithophane stl generator online free 3d print curved',
        'curved lithophane generator',
        'cylinder lithophane maker 3d print',
        'nightlight lithophane stl',
        'photo to 3d print stl',
        'bambu lithophane generator',
        'prusa lithophane maker',
        'backlit 3d photo print',
      ],
      url: '/tools/lithophane-maker',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/lithophane-maker').then((m) => m.LithophaneMakerComponent),
      'lithophaneMaker',
    ),
  },
  {
    path: 'lithophane',
    redirectTo: 'lithophane-maker',
    pathMatch: 'full',
  },
  {
    path: 'gridfinity-bin-generator',
    title: 'Gridfinity & Modular Drawer Bin Generator — PrivKnife',
    data: {
      description:
        'Parametric 3D printable bins conforming to Zack Freedman’s open-source Gridfinity standard. Custom unit sizes, internal dividers, scoops, and label tabs.',
      keywords: [
        'gridfinity bin generator stl 3d print modular drawer',
        'custom gridfinity bins',
        'gridfinity generator online',
        '3d printable drawer organizer',
        'zack freedman gridfinity stl',
        'gridfinity divider bin 3mf',
        'bambu gridfinity generator',
        'modular workshop storage 3d print',
      ],
      url: '/tools/gridfinity-bin-generator',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/gridfinity-bin-generator').then((m) => m.GridfinityBinGeneratorComponent),
      'gridfinityBinGenerator',
    ),
  },
  {
    path: 'gridfinity',
    redirectTo: 'gridfinity-bin-generator',
    pathMatch: 'full',
  },
  {
    path: 'electronics-box-enclosure',
    title: 'Parametric Electronics Box & Snap-Fit Enclosure — PrivKnife',
    data: {
      description:
        'Generate custom two-part 3D printable enclosures for DIY electronics, microcontrollers (Arduino, ESP32, Raspberry Pi Pico), and PCBs with snap-fit or screw joints.',
      keywords: [
        'parametric electronics box stl 3d print enclosure snap fit',
        '3d printed project box generator',
        'arduino uno enclosure 3d print',
        'esp32 case generator stl',
        'raspberry pi pico snap fit case',
        'custom pcb enclosure 3d model',
        'bambu electronics enclosure 3mf',
        'screw boss standoff electronics box',
      ],
      url: '/tools/electronics-box-enclosure',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/electronics-box-enclosure').then((m) => m.ElectronicsBoxEnclosureComponent),
      'electronicsBoxEnclosure',
    ),
  },
  {
    path: 'electronics-box',
    redirectTo: 'electronics-box-enclosure',
    pathMatch: 'full',
  },
  {
    path: 'under-desk-clamp-generator',
    title: 'Under-Desk Clamp & Cable Management Generator — PrivKnife',
    data: {
      description:
        'Generate heavy-duty parametric C-clamps with 3D-printable trapezoidal screw threads, clamping bolt knobs, and customizable attachments for headphones, cable raceways, power strips, and beverages.',
      keywords: [
        'under desk clamp 3d print generator stl cable raceway headphone hook',
        '3d printed desk clamp stl',
        'headphone hanger clamp generator',
        'cable management raceway under desk 3d print',
        'parametric c clamp threaded bolt 3d model',
        'power strip under desk mount 3mf',
        'desk edge cup holder 3d print',
        'trapezoidal thread 3d printable screw bolt',
      ],
      url: '/tools/under-desk-clamp-generator',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/under-desk-clamp-generator').then((m) => m.UnderDeskClampGeneratorComponent),
      'underDeskClampGenerator',
    ),
  },
  {
    path: 'desk-clamp',
    redirectTo: 'under-desk-clamp-generator',
    pathMatch: 'full',
  },
  {
    path: 'cable-clamp',
    redirectTo: 'under-desk-clamp-generator',
    pathMatch: 'full',
  },
  {
    path: 'skadis-pegboard-maker',
    title: 'IKEA Skadis & Pegboard Hook & Holder Maker — PrivKnife',
    data: {
      description:
        'Generate precision 3D printable hooks, prongs, tool holsters, and shelf brackets with custom mounting lugs for IKEA Skådis slots or standard 1/4" pegboards.',
      keywords: [
        'ikea skadis hook generator 3d print pegboard stl holder',
        'skadis custom hook 3d print',
        'ikea skadis tool holder generator',
        '3d printable pegboard hooks stl',
        'standard pegboard shelf bracket 3d model',
        'skadis caliper holster 3mf',
        'dual prong pegboard hook generator',
        'skadis parts cup 3d print',
      ],
      url: '/tools/skadis-pegboard-maker',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/skadis-pegboard-maker').then((m) => m.SkadisPegboardMakerComponent),
      'skadisPegboardMaker',
    ),
  },
  {
    path: 'skadis-hook',
    redirectTo: 'skadis-pegboard-maker',
    pathMatch: 'full',
  },
  {
    path: 'skadis-generator',
    redirectTo: 'skadis-pegboard-maker',
    pathMatch: 'full',
  },
  {
    path: 'pegboard-hook',
    redirectTo: 'skadis-pegboard-maker',
    pathMatch: 'full',
  },
  {
    path: 'geometric-plant-pot',
    title: 'Geometric Plant Pot & Self-Watering Planter — PrivKnife',
    data: {
      description:
        'Generate modern faceted, twisted, or ribbed plant pots with sub-irrigation reservoir inserts, wick slots, and matching drip saucers. 100% in-browser.',
      keywords: [
        'geometric plant pot 3d print stl self watering planter',
        'twisted vase mode plant pot 3d print',
        'self watering planter stl generator',
        'faceted geometric succulent planter 3d print',
        'plant pot with saucer stl',
        'sub irrigation plant pot 3mf',
        'custom planter generator 3d print',
      ],
      url: '/tools/geometric-plant-pot',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/geometric-plant-pot').then((m) => m.GeometricPlantPotComponent),
      'geometricPlantPot',
    ),
  },
  {
    path: 'plant-pot',
    redirectTo: 'geometric-plant-pot',
    pathMatch: 'full',
  },
  {
    path: 'self-watering-planter',
    redirectTo: 'geometric-plant-pot',
    pathMatch: 'full',
  },
  {
    path: 'braille-ada-sign-generator',
    title: 'Braille & ADA Tactile Door Sign Generator — PrivKnife',
    data: {
      description:
        'Generate 100% ADA-compliant room signage featuring 1/32" raised tactile lettering, Grade 2 contracted Braille domes, standard pictograms, and multi-color 3MF slicer layers. 100% in-browser.',
      keywords: [
        'ada braille sign generator 3d print stl 3mf tactile door sign',
        '3d printable braille door sign stl',
        'ada compliant room sign generator',
        'tactile door sign 3mf bambu',
        'grade 2 braille sign 3d print',
        'restroom sign with braille stl',
        'accessible wheelchair sign 3d print',
      ],
      url: '/tools/braille-ada-sign-generator',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/braille-ada-sign-generator').then((m) => m.BrailleAdaSignGeneratorComponent),
      'brailleAdaSignGenerator',
    ),
  },
  {
    path: 'ada-sign',
    redirectTo: 'braille-ada-sign-generator',
    pathMatch: 'full',
  },
  {
    path: 'braille-sign',
    redirectTo: 'braille-ada-sign-generator',
    pathMatch: 'full',
  },
  {
    path: 'keycap-switch-tester-maker',
    title: 'Custom Mechanical Keycap & Switch Tester Maker — PrivKnife',
    data: {
      description:
        'Parametrically generate Cherry, OEM, DSA, and SA mechanical keycaps with custom legends and calibrated MX stems, or modular snap-in switch tester desk trays. 100% in-browser.',
      keywords: [
        'custom keycap stl 3d print mechanical keyboard switch tester',
        'cherry mx keycap 3d print',
        'switch tester stl',
        'custom keycap maker 3mf',
        'dsa keycap 3d print',
        'oem profile keycap stl',
        'artisan keycap 3d model generator',
      ],
      url: '/tools/keycap-switch-tester-maker',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/keycap-switch-tester-maker').then((m) => m.KeycapSwitchTesterMakerComponent),
      'keycapSwitchTesterMaker',
    ),
  },
  {
    path: 'keycap-maker',
    redirectTo: 'keycap-switch-tester-maker',
    pathMatch: 'full',
  },
  {
    path: 'switch-tester',
    redirectTo: 'keycap-switch-tester-maker',
    pathMatch: 'full',
  },
  {
    path: 'cappuccino-stencil-maker',
    title: 'Cappuccino Stencil & Airbrush Template Maker — PrivKnife',
    data: {
      description:
        'Turn coffee art motifs, pet silhouettes, and custom text into food-safe 3D printable stencils and laser-cut vector templates with automatic island bridging. 100% in-browser.',
      keywords: [
        'cappuccino stencil generator 3d print stl svg coffee template',
        'latte art stencil 3d print',
        'food safe coffee stencil stl',
        'laser cut stencil svg',
        'airbrush template generator',
        'cappuccino duster stencil maker',
      ],
      url: '/tools/cappuccino-stencil-maker',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/cappuccino-stencil-maker').then((m) => m.CappuccinoStencilMakerComponent),
      'cappuccinoStencilMaker',
    ),
  },
  {
    path: 'coffee-stencil',
    redirectTo: 'cappuccino-stencil-maker',
    pathMatch: 'full',
  },
  {
    path: 'airbrush-stencil',
    redirectTo: 'cappuccino-stencil-maker',
    pathMatch: 'full',
  },
  {
    path: 'pet-id-tag-generator',
    title: 'Pet ID Tag & Collar Slide-On Generator — PrivKnife',
    data: {
      description:
        'Generate stylish, rattle-free 3D printable pet tags in traditional hanging charm shapes or curved silent collar slide-on bands with high-contrast dual-color typography. 100% in-browser.',
      keywords: [
        'pet id tag 3d print stl dog tag generator collar slide on',
        'custom dog tag 3d print',
        'collar slide on pet tag stl',
        'silent pet id tag 3mf',
        'dual color pet tag 3d model',
        'cat id tag 3d print',
      ],
      url: '/tools/pet-id-tag-generator',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/pet-id-tag-generator').then((m) => m.PetIdTagGeneratorComponent),
      'petIdTagGenerator',
    ),
  },
  {
    path: 'pet-tag',
    redirectTo: 'pet-id-tag-generator',
    pathMatch: 'full',
  },
  {
    path: 'dog-tag',
    redirectTo: 'pet-id-tag-generator',
    pathMatch: 'full',
  },
  {
    path: 'collar-tag',
    redirectTo: 'pet-id-tag-generator',
    pathMatch: 'full',
  },
  {
    path: 'hsw-insert-adapter',
    title: 'Honeycomb Storage Wall (HSW) Insert & Adapter — PrivKnife',
    data: {
      description:
        'Generate dimensionally accurate snap-fit inserts, captive nut pockets (M3/M4/M5), neodymium magnet holders, utility hooks, and can loops for the open-source Honeycomb Storage Wall standard. 100% in-browser.',
      keywords: [
        'honeycomb storage wall insert generator stl 3d print hsw adapter',
        'hsw insert 3d print',
        'honeycomb storage wall hook stl',
        'hsw magnet insert',
        'hsw nut pocket 3d print',
        'hsw parametric adapter',
      ],
      url: '/tools/hsw-insert-adapter',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./3d/hsw-insert-adapter').then((m) => m.HswInsertAdapterComponent),
      'hswInsertAdapter',
    ),
  },
  {
    path: 'hsw-insert',
    redirectTo: 'hsw-insert-adapter',
    pathMatch: 'full',
  },
  {
    path: 'hsw-adapter',
    redirectTo: 'hsw-insert-adapter',
    pathMatch: 'full',
  },
  {
    path: 'honeycomb-wall',
    redirectTo: 'hsw-insert-adapter',
    pathMatch: 'full',
  },
  {
    path: 'passport-biometric-photo',
    title: 'Passport, Visa & ID Biometric Photo Maker — PrivKnife',
    data: {
      description:
        'Convert any portrait into official biometric passport, visa, and ID photos with standard ICAO guidelines and print-ready tiled photo sheets. 100% client-side.',
      keywords: [
        'passport photo maker 2x2 35x45 printable sheet 4x6 100 client side',
        'passport photo generator free printable',
        'us passport photo online 2x2',
        'schengen visa photo 35x45 mm print sheet',
        'id photo maker 4x6 photo paper',
        'biometric passport photo cutter',
      ],
      url: '/tools/passport-biometric-photo',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./media/passport-biometric-photo').then((m) => m.PassportBiometricPhotoComponent),
      'passportBiometricPhoto',
    ),
  },
  {
    path: 'passport-photo',
    redirectTo: 'passport-biometric-photo',
    pathMatch: 'full',
  },
  {
    path: 'visa-photo',
    redirectTo: 'passport-biometric-photo',
    pathMatch: 'full',
  },
  {
    path: 'id-photo',
    redirectTo: 'passport-biometric-photo',
    pathMatch: 'full',
  },
  {
    path: 'heic-avif-converter',
    title: 'HEIC & AVIF to JPG/PNG Batch Converter — PrivKnife',
    data: {
      description:
        'Convert Apple HEIC/HEIF photos and modern AVIF files into universal JPEG, PNG, or WebP formats locally in browser memory. Up to 100 images in parallel with zero server uploads.',
      keywords: [
        'convert heic to jpg online batch free avif to png no upload',
        'heic to jpg batch converter',
        'heic to png converter free',
        'avif to jpg converter',
        'avif to png client side',
        'apple heic converter private',
      ],
      url: '/tools/heic-avif-converter',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./media/heic-avif-converter').then((m) => m.HeicAvifConverterComponent),
      'heicAvifConverter',
    ),
  },
  {
    path: 'heic-to-jpg',
    redirectTo: 'heic-avif-converter',
    pathMatch: 'full',
  },
  {
    path: 'avif-to-png',
    redirectTo: 'heic-avif-converter',
    pathMatch: 'full',
  },
  {
    path: 'heic-converter',
    redirectTo: 'heic-avif-converter',
    pathMatch: 'full',
  },
  {
    path: 'pdf-signer-stamper',
    title: 'Client-Side PDF Signer, Date Stamper & Initials — PrivKnife',
    data: {
      description:
        'Sign contracts, NDAs, and forms privately in your browser. Draw pressure-smoothed signatures, place date stamps and initials, and permanently flatten annotations. 100% client-side.',
      keywords: [
        'sign pdf online free client side date stamp initials contract',
        'sign pdf online free no upload',
        'private pdf signer',
        'pdf date stamper free',
        'pdf initials tool client side',
        'flatten pdf signature',
      ],
      url: '/tools/pdf-signer-stamper',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./documents/pdf-signer-stamper').then((m) => m.PdfSignerStamperComponent),
      'pdfSignerStamper',
    ),
  },
  {
    path: 'sign-pdf',
    redirectTo: 'pdf-signer-stamper',
    pathMatch: 'full',
  },
  {
    path: 'pdf-signer',
    redirectTo: 'pdf-signer-stamper',
    pathMatch: 'full',
  },
  {
    path: 'pdf-stamper',
    redirectTo: 'pdf-signer-stamper',
    pathMatch: 'full',
  },
  {
    path: 'face-plate-blur',
    title: 'Face & License Plate Privacy Blur Tool — PrivKnife',
    data: {
      description:
        'Permanently pixelate or blackout faces, street signs, and vehicle license plates before publishing. Irreversible canvas censoring with 100% EXIF/GPS metadata stripping.',
      keywords: [
        'blur face license plate online free privacy censor photo',
        'face blur online',
        'license plate censor',
        'privacy photo pixelate',
        'censor photo without upload',
        'strip exif metadata',
      ],
      url: '/tools/face-plate-blur',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./privacy/face-plate-blur').then((m) => m.FacePlateBlurComponent),
      'facePlateBlur',
    ),
  },
  {
    path: 'privacy-blur',
    redirectTo: 'face-plate-blur',
    pathMatch: 'full',
  },
  {
    path: 'censor-photo',
    redirectTo: 'face-plate-blur',
    pathMatch: 'full',
  },
  {
    path: 'face-blur',
    redirectTo: 'face-plate-blur',
    pathMatch: 'full',
  },
  {
    path: 'local-ocr-text-extractor',
    title: 'Local OCR Image & Scanned PDF to Text & Word — PrivKnife',
    data: {
      description:
        'Extract editable text, tables, and paragraphs from photos, invoices, and scanned multi-page PDFs locally in your browser with zero server uploads.',
      keywords: [
        'ocr image to text free offline client side scanned pdf to word',
        'ocr pdf to text',
        'image to text converter',
        'offline ocr',
        'scanned pdf to docx',
        'extract text from photo',
        'private ocr',
      ],
      url: '/tools/local-ocr-text-extractor',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./documents/local-ocr-text-extractor').then((m) => m.LocalOcrTextExtractorComponent),
      'localOcrTextExtractor',
    ),
  },
  {
    path: 'local-ocr',
    redirectTo: 'local-ocr-text-extractor',
    pathMatch: 'full',
  },
  {
    path: 'ocr-text-extractor',
    redirectTo: 'local-ocr-text-extractor',
    pathMatch: 'full',
  },
  {
    path: 'image-to-text',
    redirectTo: 'local-ocr-text-extractor',
    pathMatch: 'full',
  },
  {
    path: 'file-encryptor-vault',
    title: 'Zero-Knowledge File Encryptor & Vault — PrivKnife',
    data: {
      description:
        'Military-grade client-side file encryption and decryption using AES-256-GCM and PBKDF2 with zero server knowledge.',
      keywords: [
        'file encryptor online zero knowledge aes 256 gcm password protect client side',
        'encrypt file browser',
        'zero knowledge vault',
        'aes 256 file encryption',
        'decrypt priv file',
        'client side file locker',
        'password protect file offline',
      ],
      url: '/tools/file-encryptor-vault',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./privacy/file-encryptor-vault').then((m) => m.FileEncryptorVaultComponent),
      'fileEncryptorVault',
    ),
  },
  {
    path: 'file-encryptor',
    redirectTo: 'file-encryptor-vault',
    pathMatch: 'full',
  },
  {
    path: 'file-vault',
    redirectTo: 'file-encryptor-vault',
    pathMatch: 'full',
  },
  {
    path: 'encrypt-file',
    redirectTo: 'file-encryptor-vault',
    pathMatch: 'full',
  },
  {
    path: 'pii-scrubber-anonymizer',
    title: 'PII Log & CSV Scrubber & Data Anonymizer — PrivKnife',
    data: {
      description:
        'Detect and redact Personally Identifiable Information (emails, phone numbers, IP addresses, credit cards, SSNs, API tokens) from logs and CSVs 100% locally in your browser.',
      keywords: [
        'pii scrubber online sanitize logs anonymize csv gdpr hipaa compliance',
        'pii anonymizer',
        'sanitize logs',
        'anonymize csv data',
        'remove pii from text',
        'mask sensitive data',
        'gdpr pii scrubber',
      ],
      url: '/tools/pii-scrubber-anonymizer',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./privacy/pii-scrubber-anonymizer').then((m) => m.PiiScrubberAnonymizerComponent),
      'piiScrubberAnonymizer',
    ),
  },
  {
    path: 'pii-scrubber',
    redirectTo: 'pii-scrubber-anonymizer',
    pathMatch: 'full',
  },
  {
    path: 'data-anonymizer',
    redirectTo: 'pii-scrubber-anonymizer',
    pathMatch: 'full',
  },
  {
    path: 'log-scrubber',
    redirectTo: 'pii-scrubber-anonymizer',
    pathMatch: 'full',
  },
  {
    path: 'bank-statement-converter',
    title: 'Bank Statement CSV & OFX to Excel & QIF Converter — PrivKnife',
    data: {
      description:
        'Convert bank statements from messy CSV, OFX, and QFX into standardized Excel, clean CSV, and QIF formats 100% locally in your browser.',
      keywords: [
        'bank statement converter ofx qfx to excel csv qif format private accounting',
        'convert bank statement to excel',
        'ofx to excel converter',
        'qfx to csv converter',
        'bank statement to qif',
        'clean bank csv',
        'client side financial converter',
      ],
      url: '/tools/bank-statement-converter',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/bank-statement-converter').then((m) => m.BankStatementConverterComponent),
      'bankStatementConverter',
    ),
  },
  {
    path: 'bank-statement',
    redirectTo: 'bank-statement-converter',
    pathMatch: 'full',
  },
  {
    path: 'ofx-converter',
    redirectTo: 'bank-statement-converter',
    pathMatch: 'full',
  },
  {
    path: 'qif-converter',
    redirectTo: 'bank-statement-converter',
    pathMatch: 'full',
  },
  {
    path: 'audio-trimmer-booster',
    title: 'Audio Trimmer, Volume Booster & Ringtone Maker — PrivKnife',
    data: {
      description:
        'Trim audio with millisecond precision, boost volume up to 400% with soft-knee limiting, apply fade in/out curves, and export to MP3, WAV, or iPhone M4R ringtone format 100% locally in your browser.',
      keywords: [
        'audio trimmer online free volume booster mp3 ringtone maker m4r',
        'audio trimmer',
        'volume booster online',
        'mp3 cutter',
        'ringtone maker m4r',
        'boost audio volume',
        'cut wav file',
        'client side audio editor',
      ],
      url: '/tools/audio-trimmer-booster',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./audio-video/audio-trimmer-booster').then((m) => m.AudioTrimmerBoosterComponent),
      'audioTrimmerBooster',
    ),
  },
  {
    path: 'audio-trimmer',
    redirectTo: 'audio-trimmer-booster',
    pathMatch: 'full',
  },
  {
    path: 'volume-booster',
    redirectTo: 'audio-trimmer-booster',
    pathMatch: 'full',
  },
  {
    path: 'ringtone-maker',
    redirectTo: 'audio-trimmer-booster',
    pathMatch: 'full',
  },
  {
    path: 'video-compressor-resizer',
    title: 'Client-Side Video Compressor & Social Resizer — PrivKnife',
    data: {
      description:
        'Compress MP4 and WebM videos to fit Discord 8MB/25MB/50MB, WhatsApp, and email size limits with automatic social cropping for TikTok (9:16), Instagram (1:1, 4:5), and YouTube (16:9) 100% locally in your browser.',
      keywords: [
        'compress video online free no upload discord video resize reels tiktok',
        'discord video compressor 8mb',
        'compress video client side',
        'resize video for tiktok',
        'instagram video resizer',
        'reduce mp4 file size',
        'video compressor no watermark',
        'webm compressor',
      ],
      url: '/tools/video-compressor-resizer',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./audio-video/video-compressor-resizer').then((m) => m.VideoCompressorResizerComponent),
      'videoCompressorResizer',
    ),
  },
  {
    path: 'video-compressor',
    redirectTo: 'video-compressor-resizer',
    pathMatch: 'full',
  },
  {
    path: 'discord-video-compressor',
    redirectTo: 'video-compressor-resizer',
    pathMatch: 'full',
  },
  {
    path: 'video-resizer',
    redirectTo: 'video-compressor-resizer',
    pathMatch: 'full',
  },
  {
    path: 'nutrition-label-maker',
    title: 'FDA & EU Nutrition Facts & Supplement Label Maker — PrivKnife',
    data: {
      description:
        'Generate FDA 2016, EU Regulation 1169/2011, and Supplement Facts nutrition panels with real-time Daily Value % calculations, exporting pixel-perfect vector SVG and PDF files 100% locally in your browser.',
      keywords: [
        'nutrition facts label maker fda eu compliant free svg pdf supplement label',
        'fda nutrition facts generator',
        'nutrition label maker free',
        'eu nutrition table generator',
        'supplement facts maker',
        'nutrition facts vector svg',
        'nutrition facts to pdf',
        'client side nutrition label',
      ],
      url: '/tools/nutrition-label-maker',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./documents/nutrition-label-maker').then((m) => m.NutritionLabelMakerComponent),
      'nutritionLabelMaker',
    ),
  },
  {
    path: 'nutrition-facts-maker',
    redirectTo: 'nutrition-label-maker',
    pathMatch: 'full',
  },
  {
    path: 'fda-label-maker',
    redirectTo: 'nutrition-label-maker',
    pathMatch: 'full',
  },
  {
    path: 'supplement-facts-maker',
    redirectTo: 'nutrition-label-maker',
    pathMatch: 'full',
  },
  {
    path: 'svg-optimizer-cleaner',
    title: 'SVG Optimizer, Path Cleaner & React/Vue Exporter — PrivKnife',
    data: {
      description:
        'Minify bloated vector SVGs, strip metadata and editor attributes, round coordinates, and convert to clean React JSX/TSX or Vue 3 SFC components locally in your browser.',
      keywords: [
        'svg optimizer online path cleaner convert svg to react vue jsx component',
        'svg optimizer',
        'svg minifier',
        'svg to react',
        'svg to jsx',
        'svg to vue',
        'clean svg path',
        'svgo online',
      ],
      url: '/tools/svg-optimizer-cleaner',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/svg-optimizer-cleaner').then((m) => m.SvgOptimizerCleanerComponent),
      'svgOptimizerCleaner',
    ),
  },
  {
    path: 'svg-optimizer',
    redirectTo: 'svg-optimizer-cleaner',
    pathMatch: 'full',
  },
  {
    path: 'svg-cleaner',
    redirectTo: 'svg-optimizer-cleaner',
    pathMatch: 'full',
  },
  {
    path: 'svg-to-react',
    redirectTo: 'svg-optimizer-cleaner',
    pathMatch: 'full',
  },
  {
    path: 'diff-checker',
    title: 'Side-by-Side Code & Contract Diff Checker — PrivKnife',
    data: {
      description:
        'Private, high-speed code, text, and contract comparison with word-level differences and unified patch export 100% locally in your browser.',
      keywords: [
        'side by side diff checker online code compare contract difference text compare',
        'diff checker',
        'code diff',
        'text compare',
        'contract diff checker',
        'online diff checker',
        'unified diff',
        'file comparison',
      ],
      url: '/tools/diff-checker',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/diff-checker').then((m) => m.DiffCheckerComponent),
      'diffChecker',
    ),
  },
  {
    path: 'code-diff',
    redirectTo: 'diff-checker',
    pathMatch: 'full',
  },
  {
    path: 'text-compare',
    redirectTo: 'diff-checker',
    pathMatch: 'full',
  },
  {
    path: 'contract-diff',
    redirectTo: 'diff-checker',
    pathMatch: 'full',
  },
  {
    path: 'font-subsetter-converter',
    title: 'Web Font Subsetter & TTF/OTF to WOFF2 Converter — PrivKnife',
    data: {
      description:
        'Compress heavy desktop typography into ultra-compact WOFF2 web fonts by stripping unused glyphs and layout tables, cutting payloads by up to 95% locally in your browser.',
      keywords: [
        'font subsetter online convert ttf to woff2 compress webfont reduce font size',
        'font subsetter',
        'ttf to woff2',
        'otf to woff2',
        'compress web font',
        'reduce font size',
        'woff2 converter',
        'glyph stripper',
      ],
      url: '/tools/font-subsetter-converter',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/font-subsetter-converter').then((m) => m.FontSubsetterConverterComponent),
      'fontSubsetterConverter',
    ),
  },
  {
    path: 'font-subsetter',
    redirectTo: 'font-subsetter-converter',
    pathMatch: 'full',
  },
  {
    path: 'ttf-to-woff2',
    redirectTo: 'font-subsetter-converter',
    pathMatch: 'full',
  },
  {
    path: 'otf-to-woff2',
    redirectTo: 'font-subsetter-converter',
    pathMatch: 'full',
  },
  {
    path: 'webfont-generator',
    redirectTo: 'font-subsetter-converter',
    pathMatch: 'full',
  },
  {
    path: 'seamless-texture-generator',
    title: 'Seamless Tileable Texture & Pattern Generator — PrivKnife',
    data: {
      description:
        'Transform ordinary photos into seamless repeating 3D textures with edge crossfading, Sobel normal map generation, and live tiled viewport preview directly in your browser.',
      keywords: [
        'seamless texture generator online tileable pattern normal map 3d texture',
        'seamless texture',
        'tileable texture',
        'texture generator',
        'normal map generator',
        'pattern maker',
        '3d texture maker',
        'seamless pattern',
      ],
      url: '/tools/seamless-texture-generator',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./media/seamless-texture-generator').then((m) => m.SeamlessTextureGeneratorComponent),
      'seamlessTextureGenerator',
    ),
  },
  {
    path: 'seamless-texture',
    redirectTo: 'seamless-texture-generator',
    pathMatch: 'full',
  },
  {
    path: 'texture-generator',
    redirectTo: 'seamless-texture-generator',
    pathMatch: 'full',
  },
  {
    path: 'normal-map-generator',
    redirectTo: 'seamless-texture-generator',
    pathMatch: 'full',
  },
  {
    path: 'floor-plan-furniture-scaler',
    title: 'Interactive 2D Floor Plan & Room Furniture Scaler — PrivKnife',
    data: {
      description:
        'Draft scaled architectural walls, position real-dimension furniture items, verify clearance zones, and export print-ready blueprints or vector SVGs directly in your browser.',
      keywords: [
        '2d floor plan maker free online room layout furniture scale blueprint pdf',
        'floor plan maker',
        'room furniture scaler',
        'blueprint creator',
        'floor plan scaler',
        'architectural blueprint',
        'room layout planner',
      ],
      url: '/tools/floor-plan-furniture-scaler',
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./documents/floor-plan-furniture-scaler').then((m) => m.FloorPlanFurnitureScalerComponent),
      'floorPlanFurnitureScaler',
    ),
  },
  {
    path: 'floor-plan-scaler',
    redirectTo: 'floor-plan-furniture-scaler',
    pathMatch: 'full',
  },
  {
    path: 'floor-plan-maker',
    redirectTo: 'floor-plan-furniture-scaler',
    pathMatch: 'full',
  },
  {
    path: 'room-furniture-scaler',
    redirectTo: 'floor-plan-furniture-scaler',
    pathMatch: 'full',
  },
  {
    path: 'blueprint-scaler',
    redirectTo: 'floor-plan-furniture-scaler',
    pathMatch: 'full',
  },
  {
    path: 'emergency-recovery-kit',
    title: 'Printable Emergency Recovery & Password Kit Sheet — PrivKnife',
    data: {
      description:
        'Generate tamper-evident physical paper vaults for master passwords, 2FA backup codes, 12/24-word cryptocurrency seeds, and emergency directives with offline SHA-256 verification.',
      keywords: [
        'emergency password sheet printable recovery kit digital legacy pdf safe deposit box',
        'emergency recovery kit',
        'emergency password sheet',
        'recovery kit',
        'crypto seed sheet',
        'paper vault',
        '2fa recovery codes sheet',
        'digital legacy kit',
      ],
      url: '/tools/emergency-recovery-kit',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./privacy/emergency-recovery-kit').then((m) => m.EmergencyRecoveryKitComponent),
      'emergencyRecoveryKit',
    ),
  },
  {
    path: 'emergency-password-sheet',
    redirectTo: 'emergency-recovery-kit',
    pathMatch: 'full',
  },
  {
    path: 'recovery-kit',
    redirectTo: 'emergency-recovery-kit',
    pathMatch: 'full',
  },
  {
    path: 'crypto-seed-sheet',
    redirectTo: 'emergency-recovery-kit',
    pathMatch: 'full',
  },
  {
    path: 'paper-vault',
    redirectTo: 'emergency-recovery-kit',
    pathMatch: 'full',
  },
  {
    path: 'csv-vector-chart-builder',
    title: 'CSV / Paste to Vector Chart & Infographic Builder — PrivKnife',
    data: {
      description:
        'Convert copied spreadsheet tables or CSV files into publication-grade vector charts (bar, line, stacked area, donut) with designer palettes and instant SVG/PNG/PDF downloads.',
      keywords: [
        'csv to vector chart maker free infographic generator svg pdf presentation chart',
        'csv to chart',
        'vector chart builder',
        'infographic generator',
        'svg chart maker',
        'bar chart maker',
        'donut chart generator',
        'spreadsheet to chart',
      ],
      url: '/tools/csv-vector-chart-builder',
    },
    loadComponent: withEnglishToolCatalog(
      () => import('./dev/csv-vector-chart-builder').then((m) => m.CsvVectorChartBuilderComponent),
      'csvVectorChartBuilder',
    ),
  },
  {
    path: 'csv-to-chart',
    redirectTo: 'csv-vector-chart-builder',
    pathMatch: 'full',
  },
  {
    path: 'vector-chart-builder',
    redirectTo: 'csv-vector-chart-builder',
    pathMatch: 'full',
  },
  {
    path: 'infographic-generator',
    redirectTo: 'csv-vector-chart-builder',
    pathMatch: 'full',
  },
  {
    path: 'svg-chart-maker',
    redirectTo: 'csv-vector-chart-builder',
    pathMatch: 'full',
  },
  {
    path: 'json-sql-formatter',
    title: 'JSON, SQL & YAML Formatter, Validator & Type Generator - PrivKnife',
    data: {
      seo: {
        title: 'JSON Formatter, SQL Beautifier, YAML & TypeScript/Zod Generator | PrivKnife',
        description:
          'Format, minify, and validate JSON, SQL, and YAML 100% locally in your browser with JSONPath queries and instant TypeScript & Zod schema inference.',
        keywords:
          'json formatter validator, sql beautifier client side, yaml converter, json to typescript, json to zod, jsonpath evaluator',
      },
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./dev/json-sql-formatter/json-sql-formatter.component').then(
          (m) => m.JsonSqlFormatterComponent,
        ),
      'jsonSqlFormatter',
    ),
  },
  {
    path: 'regex-tester-debugger',
    title: 'Interactive Regex Tester, Debugger & Explainer - PrivKnife',
    data: {
      seo: {
        title: 'ReDoS-Safe Regex Tester, Debugger, AST Explainer & Codegen | PrivKnife',
        description:
          'Test, debug, and explain regular expressions locally inside a timeout-protected Web Worker with capture groups, live substitution, and 5-language export.',
        keywords:
          'regex tester debugger, regex explainer ast, redos safe regexp worker, regex replace, javascript python go java regex',
      },
    },
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./dev/regex-tester-debugger/regex-tester-debugger.component').then(
          (m) => m.RegexTesterDebuggerComponent,
        ),
      'regexTesterDebugger',
    ),
  },
  {
    path: 'jwt-debugger-studio',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./dev/jwt-debugger-studio/jwt-debugger-studio.component').then(
          (m) => m.JwtDebuggerStudioComponent,
        ),
      'jwtDebuggerStudio',
    ),
  },
  {
    path: 'encoder-decoder-workbench',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./dev/encoder-decoder-workbench/encoder-decoder-workbench.component').then(
          (m) => m.EncoderDecoderWorkbenchComponent,
        ),
      'encoderDecoderWorkbench',
    ),
  },
  {
    path: 'cron-expression-studio',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./dev/cron-expression-studio/cron-expression-studio.component').then(
          (m) => m.CronExpressionStudioComponent,
        ),
      'cronExpressionStudio',
    ),
  },
  {
    path: 'timestamp-timezone-converter',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./dev/timestamp-timezone-converter/timestamp-timezone-converter.component').then(
          (m) => m.TimestampTimezoneConverterComponent,
        ),
      'timestampTimezoneConverter',
    ),
  },
  {
    path: 'password-passphrase-generator',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./dev/password-passphrase-generator/password-passphrase-generator.component').then(
          (m) => m.PasswordPassphraseGeneratorComponent,
        ),
      'passwordPassphraseGenerator',
    ),
  },
  {
    path: 'case-unicode-text-studio',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./dev/case-unicode-text-studio/case-unicode-text-studio.component').then(
          (m) => m.CaseUnicodeTextStudioComponent,
        ),
      'caseUnicodeTextStudio',
    ),
  },
  {
    path: 'ascii-art-qr-studio',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./dev/ascii-art-qr-studio/ascii-art-qr-studio.component').then(
          (m) => m.AsciiArtQrStudioComponent,
        ),
      'asciiArtQrStudio',
    ),
  },
  {
    path: 'battery-sdcard-case-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/battery-sdcard-case-maker/battery-sdcard-case-maker.component').then(
          (m) => m.BatterySdcardCaseMakerComponent,
        ),
      'batterySdcardCaseMaker',
    ),
  },
  {
    path: 'rugged-hinged-box-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/rugged-hinged-box-maker/rugged-hinged-box-maker.component').then(
          (m) => m.RuggedHingedBoxMakerComponent,
        ),
      'ruggedHingedBoxMaker',
    ),
  },
  {
    path: 'drawer-divider-grid-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/drawer-divider-grid-maker/drawer-divider-grid-maker.component').then(
          (m) => m.DrawerDividerGridMakerComponent,
        ),
      'drawerDividerGridMaker',
    ),
  },
  {
    path: 'tool-bit-holder-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/tool-bit-holder-maker/tool-bit-holder-maker.component').then(
          (m) => m.ToolBitHolderMakerComponent,
        ),
      'toolBitHolderMaker',
    ),
  },
  {
    path: 'washer-spacer-shim-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/washer-spacer-shim-maker/washer-spacer-shim-maker.component').then(
          (m) => m.WasherSpacerShimMakerComponent,
        ),
      'washerSpacerShimMaker',
    ),
  },
  {
    path: 'knob-dial-handwheel-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/knob-dial-handwheel-maker/knob-dial-handwheel-maker.component').then(
          (m) => m.KnobDialHandwheelMakerComponent,
        ),
      'knobDialHandwheelMaker',
    ),
  },
  {
    path: 'device-wall-cradle-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/device-wall-cradle-maker/device-wall-cradle-maker.component').then(
          (m) => m.DeviceWallCradleMakerComponent,
        ),
      'deviceWallCradleMaker',
    ),
  },
  {
    path: 'cable-comb-clip-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/cable-comb-clip-maker/cable-comb-clip-maker.component').then(
          (m) => m.CableCombClipMakerComponent,
        ),
      'cableCombClipMaker',
    ),
  },
  {
    path: 'funnel-scoop-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/funnel-scoop-maker/funnel-scoop-maker.component').then(
          (m) => m.FunnelScoopMakerComponent,
        ),
      'funnelScoopMaker',
    ),
  },
  {
    path: 'threaded-tube-pill-organizer',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/threaded-tube-pill-organizer/threaded-tube-pill-organizer.component').then(
          (m) => m.ThreadedTubePillOrganizerComponent,
        ),
      'threadedTubePillOrganizer',
    ),
  },
  {
    path: 'jar-bottle-rack-maker',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/jar-bottle-rack-maker/jar-bottle-rack-maker.component').then(
          (m) => m.JarBottleRackMakerComponent,
        ),
      'jarBottleRackMaker',
    ),
  },
  {
    path: 'calibration-tolerance-suite',
    loadComponent: withEnglishToolCatalog(
      () =>
        import('./3d/calibration-tolerance-suite/calibration-tolerance-suite.component').then(
          (m) => m.CalibrationToleranceSuiteComponent,
        ),
      'calibrationToleranceSuite',
    ),
  },
];
