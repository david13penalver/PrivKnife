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
