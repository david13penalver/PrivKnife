import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Card, Dropzone } from '../../../components';

import {
  DateFormat,
  PdfDocumentSummary,
  PdfSignerStamperOptions,
  PlacedStamp,
  SignatureInkColor,
} from './types';
import {
  DEFAULT_SIGNER_OPTIONS,
  DUMMY_SIGNATURE_PNG_DATA_URL,
  createSyntheticPdfBytes,
} from './test-fixtures';
import {
  formatDateString,
  inspectPdfDocument,
  processSignedPdf,
} from './engine';

@Component({
  selector: 'app-pdf-signer-stamper',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Client-Side PDF Signer, Date Stamper & Initials</h1>
          <p class="c-header__subtitle">
            Sign contracts, NDAs, and forms 100% privately in your browser. Draw pressure-smoothed signatures, place date stamps and initials, and permanently flatten annotations.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <!-- Quick Document Selector Bar -->
      <div class="preset-strip g--margin-bottom-4">
        <span class="preset-label">Quick Document:</span>
        <div class="preset-buttons">
          <button
            type="button"
            class="c-button c-button--small c-button--outline"
            (click)="loadSampleDocument('Non-Disclosure Agreement (NDA)')"
          >
            Sample NDA Agreement
          </button>
          <button
            type="button"
            class="c-button c-button--small c-button--outline"
            (click)="loadSampleDocument('Consulting Services Contract')"
          >
            Sample Service Contract
          </button>
        </div>
      </div>

      <!-- Main Layout Columns -->
      <div class="l-columns l-columns--2">
        <!-- Controls & Stamping Tools Column -->
        <div class="l-columns__column">
          <!-- Document Upload Card -->
          <app-card title="1. Select or Drop PDF" class="g--margin-bottom-4">
            <app-dropzone
              title="Drop your PDF document here"
              subtitle="or click to browse from your device (zero server upload)"
              accept=".pdf,application/pdf"
              [multiple]="false"
              [maxSizeMb]="50"
              (filesSelected)="onFilesDropped($event)"
            />
            <div class="doc-meta g--margin-top-2">
              <small class="g--text-muted">
                Active Document: <strong>{{ fileName() }}</strong>
                @if (documentLoaded()) {
                  <span> ({{ pageCount() }} {{ pageCount() === 1 ? 'page' : 'pages' }})</span>
                }
              </small>
            </div>
          </app-card>

          <!-- Signature Pad Card -->
          <app-card title="2. Draw or Type Signature" class="g--margin-bottom-4">
            <!-- Drawing Canvas Pad -->
            <div class="signature-pad-container g--margin-bottom-3">
              <canvas
                #signatureCanvas
                class="signature-canvas"
                width="400"
                height="150"
                (mousedown)="startDrawing($event)"
                (mousemove)="draw($event)"
                (mouseup)="stopDrawing()"
                (mouseleave)="stopDrawing()"
              ></canvas>
              <div class="signature-baseline"></div>
              <span class="signature-hint">Sign above the line</span>
            </div>

            <!-- Signature Controls -->
            <div class="l-extremo g--align-center g--margin-bottom-3">
              <div class="ink-color-group">
                <span class="c-form-label g--margin-right-2">Ink Color:</span>
                <button
                  type="button"
                  class="color-dot color-dot--black"
                  [class.is-active]="signatureInkColor() === 'black'"
                  (click)="setSignatureInkColor('black')"
                  title="Black Ink"
                ></button>
                <button
                  type="button"
                  class="color-dot color-dot--blue"
                  [class.is-active]="signatureInkColor() === 'dark_blue'"
                  (click)="setSignatureInkColor('dark_blue')"
                  title="Dark Blue Ink"
                ></button>
              </div>

              <div class="signature-actions">
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  (click)="clearSignaturePad()"
                >
                  Clear Pad
                </button>
                <button
                  type="button"
                  class="c-button c-button--small c-button--primary"
                  [disabled]="!documentLoaded()"
                  (click)="placeCurrentSignature()"
                >
                  + Stamp Signature
                </button>
              </div>
            </div>

            <!-- Pen Width Slider -->
            <div class="c-form-group">
              <div class="l-extremo">
                <label class="c-form-label">Pen Stroke Width</label>
                <span class="c-form-value">{{ signaturePenWidth() }}px</span>
              </div>
              <input
                type="range"
                class="c-range"
                [min]="1"
                [max]="6"
                [step]="1"
                [ngModel]="signaturePenWidth()"
                (ngModelChange)="setSignaturePenWidth($event)"
              />
            </div>
          </app-card>

          <!-- Date Stamper & Initials Card -->
          <app-card title="3. Date Stamps & Initials" class="g--margin-bottom-4">
            <!-- Date Stamper -->
            <div class="c-form-group g--margin-bottom-3">
              <label class="c-form-label">Date Format</label>
              <div class="date-format-buttons g--margin-bottom-2">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="dateFormat() === 'YYYY-MM-DD'"
                  [class.c-button--outline]="dateFormat() !== 'YYYY-MM-DD'"
                  (click)="setDateFormat('YYYY-MM-DD')"
                >
                  YYYY-MM-DD
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="dateFormat() === 'MM/DD/YYYY'"
                  [class.c-button--outline]="dateFormat() !== 'MM/DD/YYYY'"
                  (click)="setDateFormat('MM/DD/YYYY')"
                >
                  MM/DD/YYYY
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="dateFormat() === 'DD/MM/YYYY'"
                  [class.c-button--outline]="dateFormat() !== 'DD/MM/YYYY'"
                  (click)="setDateFormat('DD/MM/YYYY')"
                >
                  DD/MM/YYYY
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="dateFormat() === 'MMM D, YYYY'"
                  [class.c-button--outline]="dateFormat() !== 'MMM D, YYYY'"
                  (click)="setDateFormat('MMM D, YYYY')"
                >
                  MMM D, YYYY
                </button>
              </div>

              <div class="l-extremo g--align-center">
                <span class="current-date-preview">Stamp Text: <strong>{{ computedDateText() }}</strong></span>
                <button
                  type="button"
                  class="c-button c-button--small c-button--primary"
                  [disabled]="!documentLoaded()"
                  (click)="placeCurrentDateStamp()"
                >
                  + Stamp Date
                </button>
              </div>
            </div>

            <!-- Initials Stamper -->
            <div class="c-form-group">
              <label class="c-form-label">Initials Text</label>
              <div class="l-extremo g--align-center">
                <input
                  type="text"
                  class="c-input initials-input"
                  maxlength="5"
                  [ngModel]="initialsText()"
                  (ngModelChange)="setInitialsText($event)"
                />
                <button
                  type="button"
                  class="c-button c-button--small c-button--primary"
                  [disabled]="!documentLoaded()"
                  (click)="placeCurrentInitialsStamp()"
                >
                  + Stamp Initials
                </button>
              </div>
            </div>
          </app-card>
        </div>

        <!-- Preview & Placed Annotations Column -->
        <div class="l-columns__column">
          <!-- Document Stamps List & Action Card -->
          <app-card title="Placed Stamps & Document Overview" class="g--margin-bottom-4">
            <!-- Page Selector if multi-page -->
            @if (pageCount() > 1) {
              <div class="page-selector-bar g--margin-bottom-3 l-extremo g--align-center">
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  [disabled]="currentPageIndex() === 0"
                  (click)="prevPage()"
                >
                  ◀ Previous
                </button>
                <span class="page-indicator">Page {{ currentPageIndex() + 1 }} of {{ pageCount() }}</span>
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  [disabled]="currentPageIndex() === pageCount() - 1"
                  (click)="nextPage()"
                >
                  Next ▶
                </button>
              </div>
            }

            <!-- Stamps List -->
            @if (placedStamps().length > 0) {
              <div class="stamps-list-wrap g--margin-bottom-3">
                <h4 class="stamps-header">Placed Stamps on Document ({{ placedStamps().length }}):</h4>
                <div class="stamps-items">
                  @for (stamp of placedStamps(); track stamp.id) {
                    <div class="stamp-row">
                      <span class="stamp-badge c-badge" [class.c-badge--success]="stamp.type === 'signature'">
                        {{ stamp.type.toUpperCase() }}
                      </span>
                      <span class="stamp-coords">Page {{ stamp.pageIndex + 1 }} @ ({{ Math.round(stamp.x) }}, {{ Math.round(stamp.y) }})</span>
                      <span class="stamp-content">{{ stamp.text || 'Drawn Signature' }}</span>
                      <button
                        type="button"
                        class="c-button c-button--small c-button--outline"
                        (click)="removeStamp(stamp.id)"
                      >
                        ✕
                      </button>
                    </div>
                  }
                </div>
              </div>

              <div class="l-extremo g--margin-bottom-3">
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  (click)="clearAllStamps()"
                >
                  Clear All Stamps
                </button>
              </div>
            } @else {
              <div class="empty-stamps-box g--text-center g--margin-top-3 g--margin-bottom-3">
                <span class="empty-icon">✍️</span>
                <p class="g--text-muted">No stamps placed yet. Draw a signature or click "+ Stamp" on the left.</p>
              </div>
            }

            <!-- Flatten Option -->
            <div class="flatten-option g--margin-bottom-3">
              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="flattenAnnotations()"
                  (change)="toggleFlattenAnnotations()"
                />
                Permanently flatten all annotations & signatures into PDF layers
              </label>
            </div>

            @if (processingError()) {
              <div class="c-alert c-alert--danger g--margin-bottom-3">
                {{ processingError() }}
              </div>
            }

            <!-- Export Primary Action -->
            <div class="action-bar">
              <button
                type="button"
                class="c-button c-button--primary c-button--large g--width-full"
                [disabled]="!documentLoaded() || isProcessing()"
                (click)="exportSignedPdf()"
              >
                @if (isProcessing()) {
                  <span>Embedding & Flattening PDF...</span>
                } @else {
                  <span>Download Signed PDF ({{ placedStamps().length }} Stamps)</span>
                }
              </button>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .preset-strip {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      .preset-label {
        font-weight: 600;
        font-size: 0.875rem;
        color: #475569;
      }
      .preset-buttons,
      .date-format-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .signature-pad-container {
        position: relative;
        background: #ffffff;
        border: 2px dashed #cbd5e1;
        border-radius: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
      }
      .signature-canvas {
        display: block;
        cursor: crosshair;
        background: transparent;
      }
      .signature-baseline {
        position: absolute;
        bottom: 35px;
        left: 20px;
        right: 20px;
        border-bottom: 1px dashed #e2e8f0;
        pointer-events: none;
      }
      .signature-hint {
        position: absolute;
        bottom: 10px;
        right: 15px;
        font-size: 0.7rem;
        color: #94a3b8;
        pointer-events: none;
      }
      .ink-color-group {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .color-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
      }
      .color-dot--black {
        background: #0f172a;
      }
      .color-dot--blue {
        background: #1e3a8a;
      }
      .color-dot.is-active {
        border-color: #38bdf8;
        transform: scale(1.15);
      }
      .signature-actions {
        display: flex;
        gap: 0.5rem;
      }
      .initials-input {
        width: 100px;
        text-transform: uppercase;
        font-weight: 700;
        text-align: center;
      }
      .current-date-preview {
        font-size: 0.85rem;
        color: #334155;
      }
      .page-selector-bar {
        background: #f1f5f9;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
      }
      .page-indicator {
        font-weight: 600;
        font-size: 0.85rem;
        color: #334155;
      }
      .stamps-list-wrap {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 0.75rem;
        background: #f8fafc;
      }
      .stamps-header {
        font-size: 0.85rem;
        font-weight: 600;
        margin-top: 0;
        margin-bottom: 0.5rem;
        color: #334155;
      }
      .stamp-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.4rem 0;
        border-bottom: 1px solid #e2e8f0;
        font-size: 0.8rem;
      }
      .stamp-row:last-child {
        border-bottom: none;
      }
      .stamp-coords {
        color: #64748b;
      }
      .stamp-content {
        font-weight: 500;
        color: #1e293b;
      }
      .empty-icon {
        font-size: 2.5rem;
        display: block;
        margin-bottom: 0.5rem;
      }
      .c-alert--danger {
        padding: 0.75rem;
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
        border-radius: 6px;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class PdfSignerStamperComponent implements OnInit, OnDestroy {
  @ViewChild('signatureCanvas') signatureCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly Math = Math;

  // Options Signals
  readonly signatureInkColor = signal<SignatureInkColor>('black');
  readonly signaturePenWidth = signal<number>(2);
  readonly dateFormat = signal<DateFormat>('YYYY-MM-DD');
  readonly customDateString = signal<string>(formatDateString('YYYY-MM-DD'));
  readonly initialsText = signal<string>('PK');
  readonly flattenAnnotations = signal<boolean>(true);

  // Document & Stamps Signals
  readonly pdfBuffer = signal<ArrayBuffer | null>(null);
  readonly fileName = signal<string>('document.pdf');
  readonly documentLoaded = signal<boolean>(false);
  readonly pageCount = signal<number>(1);
  readonly currentPageIndex = signal<number>(0);
  readonly placedStamps = signal<PlacedStamp[]>([]);

  readonly isProcessing = signal<boolean>(false);
  readonly processingError = signal<string | null>(null);

  // Canvas drawing state
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private createdObjectUrls: string[] = [];

  readonly computedDateText = computed<string>(() =>
    formatDateString(this.dateFormat())
  );

  readonly currentOptions = computed<PdfSignerStamperOptions>(() => ({
    signatureInkColor: this.signatureInkColor(),
    signaturePenWidth: this.signaturePenWidth(),
    dateFormat: this.dateFormat(),
    customDateString: this.customDateString(),
    initialsText: this.initialsText(),
    flattenAnnotations: this.flattenAnnotations(),
    stamps: this.placedStamps(),
  }));

  async ngOnInit(): Promise<void> {
    // Only load sample document if no user document has been loaded yet
    if (!this.documentLoaded()) {
      await this.loadSampleDocument('Sample Contract Agreement');
    }
  }

  ngOnDestroy(): void {
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls = [];
  }

  setSignatureInkColor(color: SignatureInkColor): void {
    this.signatureInkColor.set(color);
  }

  setSignaturePenWidth(width: number): void {
    this.signaturePenWidth.set(Math.min(10, Math.max(1, width)));
  }

  setDateFormat(format: DateFormat): void {
    this.dateFormat.set(format);
    this.customDateString.set(formatDateString(format));
  }

  setInitialsText(text: string): void {
    this.initialsText.set(text.toUpperCase());
  }

  toggleFlattenAnnotations(): void {
    this.flattenAnnotations.set(!this.flattenAnnotations());
  }

  resetToDefaults(): void {
    this.signatureInkColor.set(DEFAULT_SIGNER_OPTIONS.signatureInkColor);
    this.signaturePenWidth.set(DEFAULT_SIGNER_OPTIONS.signaturePenWidth);
    this.dateFormat.set(DEFAULT_SIGNER_OPTIONS.dateFormat);
    this.customDateString.set(formatDateString(DEFAULT_SIGNER_OPTIONS.dateFormat));
    this.initialsText.set(DEFAULT_SIGNER_OPTIONS.initialsText);
    this.flattenAnnotations.set(DEFAULT_SIGNER_OPTIONS.flattenAnnotations);
  }

  onFilesDropped(files: File[]): void {
    if (files && files.length > 0) {
      this.handleFileSelected(files[0]);
    }
  }

  private lastLoadId = 0;

  async handleFileSelected(file: File): Promise<void> {
    const loadId = ++this.lastLoadId;
    this.processingError.set(null);
    try {
      const buffer = await file.arrayBuffer();
      if (loadId !== this.lastLoadId) return;
      this.pdfBuffer.set(buffer);
      this.fileName.set(file.name);

      const summary = await inspectPdfDocument(buffer, file.name);
      if (loadId !== this.lastLoadId) return;
      this.pageCount.set(summary.pageCount);
      this.currentPageIndex.set(0);
      this.documentLoaded.set(true);
      this.placedStamps.set([]);
    } catch (err: any) {
      if (loadId !== this.lastLoadId) return;
      this.processingError.set(err?.message || 'Failed to read PDF file');
    }
  }

  async loadSampleDocument(title: string): Promise<void> {
    const loadId = ++this.lastLoadId;
    try {
      const bytes = await createSyntheticPdfBytes(2, title);
      const buffer = bytes.buffer as ArrayBuffer;
      if (loadId !== this.lastLoadId) return;
      this.pdfBuffer.set(buffer);
      this.fileName.set(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);

      const summary = await inspectPdfDocument(buffer, this.fileName());
      if (loadId !== this.lastLoadId) return;
      this.pageCount.set(summary.pageCount);
      this.currentPageIndex.set(0);
      this.documentLoaded.set(true);
      this.placedStamps.set([]);
    } catch (err: any) {
      if (loadId !== this.lastLoadId) return;
      this.processingError.set(err?.message || 'Failed to load sample document');
    }
  }

  // Stamp Management
  addSignatureStamp(
    dataUrl: string,
    x: number = 100,
    y: number = 150,
    width: number = 150,
    height: number = 50
  ): void {
    const stamp: PlacedStamp = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'signature',
      pageIndex: this.currentPageIndex(),
      x,
      y,
      width,
      height,
      imageDataUrl: dataUrl,
    };
    this.placedStamps.update((stamps) => [...stamps, stamp]);
  }

  addDateStamp(x: number = 280, y: number = 150): void {
    const stamp: PlacedStamp = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'date',
      pageIndex: this.currentPageIndex(),
      x,
      y,
      width: 120,
      height: 25,
      text: this.computedDateText(),
      fontSize: 11,
    };
    this.placedStamps.update((stamps) => [...stamps, stamp]);
  }

  addInitialsStamp(x: number = 420, y: number = 150): void {
    const stamp: PlacedStamp = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'initials',
      pageIndex: this.currentPageIndex(),
      x,
      y,
      width: 32,
      height: 32,
      text: this.initialsText(),
      fontSize: 12,
    };
    this.placedStamps.update((stamps) => [...stamps, stamp]);
  }

  placeCurrentSignature(): void {
    const canvas = this.signatureCanvasRef?.nativeElement;
    const dataUrl = canvas ? canvas.toDataURL('image/png') : DUMMY_SIGNATURE_PNG_DATA_URL;
    this.addSignatureStamp(dataUrl);
  }

  placeCurrentDateStamp(): void {
    this.addDateStamp();
  }

  placeCurrentInitialsStamp(): void {
    this.addInitialsStamp();
  }

  removeStamp(id: string): void {
    this.placedStamps.update((stamps) => stamps.filter((s) => s.id !== id));
  }

  clearAllStamps(): void {
    this.placedStamps.set([]);
  }

  prevPage(): void {
    if (this.currentPageIndex() > 0) {
      this.currentPageIndex.update((i) => i - 1);
    }
  }

  nextPage(): void {
    if (this.currentPageIndex() < this.pageCount() - 1) {
      this.currentPageIndex.update((i) => i + 1);
    }
  }

  // Drawing Pad Handlers
  startDrawing(e: MouseEvent): void {
    const canvas = this.signatureCanvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this.isDrawing = true;
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
  }

  draw(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const canvas = this.signatureCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.strokeStyle = this.signatureInkColor() === 'dark_blue' ? '#1e3a8a' : '#0f172a';
    ctx.lineWidth = this.signaturePenWidth();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    this.lastX = currentX;
    this.lastY = currentY;
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }

  clearSignaturePad(): void {
    const canvas = this.signatureCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Export & Download
  async exportSignedPdf(): Promise<void> {
    const buffer = this.pdfBuffer();
    if (!buffer) {
      this.processingError.set('No PDF document loaded');
      return;
    }

    this.isProcessing.set(true);
    this.processingError.set(null);

    try {
      const result = await processSignedPdf(
        buffer,
        this.currentOptions(),
        this.fileName()
      );

      if (result.success && result.blob) {
        this.triggerDownload(result.blob, result.fileName);
      }
    } catch (err: any) {
      this.processingError.set(err?.message || 'Failed to sign and export PDF');
    } finally {
      this.isProcessing.set(false);
    }
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.push(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
