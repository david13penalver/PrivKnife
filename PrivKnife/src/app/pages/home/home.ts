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
