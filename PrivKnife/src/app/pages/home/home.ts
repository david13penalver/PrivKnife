import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Badge } from '../../components/badge/badge';
import { Button } from '../../components/button/button';
import { Card } from '../../components/card/card';
import { ToolCategory } from '../../core/models/tool.model';

export interface CatalogTool {
  id: string;
  name: string;
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
    id: 'favicon-app-icon-suite',
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
    id: '3d-qr-stand',
    name: '3D QR Stand & Keychain Generator',
    category: '3d',
    categoryLabel: '3D Fabrication',
    description: 'Generate dual-color 3MF and STL files of functional tabletop QR code stands for 3D printing.',
    keywords: ['3d print', 'stl', '3mf', 'qr code', 'bambu lab', 'keychain'],
    status: 'roadmap',
    techStack: 'Three.js • three-bvh-csg',
    icon: '🧊',
  },
];

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, Badge, Card],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1200px;">
      <!-- Hero Presentation Section -->
      <div class="l-columns__area g--text-center g--margin-bottom-8">
        <div class="g--flex-center g--margin-bottom-4">
          <app-badge variant="privacy" [dot]="true">
            🛡️ 100% In-Browser &bull; Zero Server Ingestion &bull; Zero Telemetry
          </app-badge>
        </div>

        <h1 style="font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.02em;">
          The Private In-Browser<br />
          <span style="color: var(--color-primary);">Swiss Army Knife</span>
        </h1>

        <p class="g--margin-top-4 g--margin-x-auto" style="max-width: 680px; font-size: 1.25rem; color: var(--color-text-secondary); line-height: 1.6;">
          A consolidated suite of fast, everyday web tools running entirely inside your browser.
          No cloud uploads. No telemetry. No cookies.
        </p>

        <!-- Platform Pillars Badge Ribbon -->
        <div class="g--flex-center g--margin-top-6" style="gap: 12px; flex-wrap: wrap;">
          <app-badge variant="neutral">🇨🇭 29+ Everyday Tools</app-badge>
          <app-badge variant="neutral">🔒 0 Bytes Leaves Device</app-badge>
          <app-badge variant="neutral">⚡ Client-Side WebAssembly</app-badge>
          <app-badge variant="neutral">📜 MIT Open Source</app-badge>
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
                placeholder="🔍 Search tools by name or keyword (e.g. EXIF, PDF, Hash, Image, 3D)..."
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
                All ({{ allCount() }})
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === 'privacy'"
                [class.c-button--outline]="selectedCategory() !== 'privacy'"
                (click)="selectedCategory.set('privacy')">
                Privacy
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === 'documents'"
                [class.c-button--outline]="selectedCategory() !== 'documents'"
                (click)="selectedCategory.set('documents')">
                Documents
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === 'media'"
                [class.c-button--outline]="selectedCategory() !== 'media'"
                (click)="selectedCategory.set('media')">
                Media &amp; Images
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === 'dev'"
                [class.c-button--outline]="selectedCategory() !== 'dev'"
                (click)="selectedCategory.set('dev')">
                Developer
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="selectedCategory() === '3d'"
                [class.c-button--outline]="selectedCategory() !== '3d'"
                (click)="selectedCategory.set('3d')">
                3D Fabrication
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tools Grid -->
      <div class="l-columns__area g--margin-bottom-8">
        <div class="l-columns l-columns--3" style="gap: 20px;">
          @for (tool of filteredTools(); track tool.id) {
            <div class="l-columns__area">
              <app-card [interactive]="tool.status === 'ready'" [hasHeader]="true" [hasFooter]="true">
                <!-- Card Header -->
                <div card-header class="l-extremo" style="align-items: center; width: 100%;">
                  <span style="font-size: 1.5rem;" aria-hidden="true">{{ tool.icon }}</span>
                  <div>
                    @if (tool.status === 'ready') {
                      <app-badge variant="success" [dot]="true">Ready to Use</app-badge>
                    } @else {
                      <app-badge variant="neutral">Roadmap</app-badge>
                    }
                  </div>
                </div>

                <!-- Card Body -->
                <div>
                  <h3 style="font-size: 1.125rem; font-weight: 600; line-height: 1.3; margin-bottom: 8px;">
                    {{ tool.name }}
                  </h3>
                  <p style="color: var(--color-text-secondary); font-size: 0.875rem; line-height: 1.5; margin-bottom: 12px;">
                    {{ tool.description }}
                  </p>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">
                    ⚡ {{ tool.techStack }}
                  </div>
                </div>

                <!-- Card Footer Action -->
                <div card-footer class="l-extremo" style="align-items: center; width: 100%;">
                  <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500;">
                    {{ tool.categoryLabel }}
                  </span>
                  <div>
                    @if (tool.status === 'ready' && tool.route) {
                      <a [routerLink]="tool.route" class="c-button c-button--primary c-button--small">
                        Open Tool &rarr;
                      </a>
                    } @else {
                      <span style="font-size: 0.75rem; color: var(--color-text-muted); font-style: italic;">
                        Coming Soon
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
              No tools found matching "{{ searchQuery() }}".
            </p>
            <button
              type="button"
              class="c-button c-button--outline g--margin-top-4"
              (click)="resetFilters()">
              Clear Filters
            </button>
          </div>
        }
      </div>

      <!-- Core Philosophy: "Privacy by Architecture" (3 Pillars) -->
      <div class="l-columns__area g--margin-bottom-8">
        <div class="g--text-center g--margin-bottom-6">
          <app-badge variant="privacy">Guaranteed Client-Side</app-badge>
          <h2 class="g--margin-top-2">Privacy by Architecture, Not by Policy</h2>
          <p style="color: var(--color-text-muted); max-width: 640px; margin: 8px auto 0;">
            Most web tools ask you to trust their legal terms while silently uploading your private documents to remote cloud storage. PrivKnife is fundamentally different.
          </p>
        </div>

        <div class="l-columns l-columns--3" style="gap: 20px;">
          <div class="l-columns__area">
            <app-card title="🛡️ Zero Server Ingestion">
              <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6;">
                PrivKnife has no processing servers or remote storage buckets. All file parsing, binary manipulation, and rendering run on your local machine using WebAssembly and Web Workers.
              </p>
            </app-card>
          </div>

          <div class="l-columns__area">
            <app-card title="🚫 Zero Telemetry & Tracking">
              <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6;">
                No Google Analytics, no tracking pixels, no telemetry beacons, and zero advertising cookies. You operate with complete digital anonymity.
              </p>
            </app-card>
          </div>

          <div class="l-columns__area">
            <app-card title="⚡ Blazing Local Performance">
              <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6;">
                Zero network upload latency. Process gigabyte-scale documents or hundreds of photos directly on your device CPU/GPU at full native speed.
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
              <h3 style="font-size: 1.25rem; font-weight: 700;">Verifiable & Open Source</h3>
              <p style="color: var(--color-text-muted); font-size: 0.875rem; margin-top: 4px;">
                Open your browser DevTools (F12) &rarr; Network tab to verify 0 network requests, or inspect our source code on GitHub.
              </p>
            </div>
            <div class="g--flex-center" style="gap: 12px; flex-wrap: wrap;">
              <a
                href="https://github.com/david13penalver/PrivKnife"
                target="_blank"
                rel="noopener noreferrer"
                class="c-button c-button--outline">
                GitHub Repository &rarr;
              </a>
              <a routerLink="/ui-kit" class="c-button c-button--outline">
                Design System &amp; UI Kit &rarr;
              </a>
            </div>
          </div>
        </app-card>
      </div>
    </div>
  `,
})
export class Home {
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('all');
  readonly allTools = signal<CatalogTool[]>(CATALOG_TOOLS);

  readonly allCount = computed(() => this.allTools().length);

  readonly filteredTools = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();

    return this.allTools().filter((tool) => {
      // Category match
      const matchesCategory = cat === 'all' || tool.category === cat;
      if (!matchesCategory) return false;

      // Search match
      if (!q) return true;
      const inName = tool.name.toLowerCase().includes(q);
      const inDesc = tool.description.toLowerCase().includes(q);
      const inKeywords = tool.keywords.some((k) => k.toLowerCase().includes(q));
      return inName || inDesc || inKeywords;
    });
  });

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
  }
}
