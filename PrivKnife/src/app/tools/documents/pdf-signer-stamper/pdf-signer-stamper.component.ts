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
  PdfSignerStamperResult,
  PdfSignerWorkerRequest,
  PdfSignerWorkerResponse,
  PlacedStamp,
  SignatureInkColor,
} from './types';
import {
  DEFAULT_SIGNER_OPTIONS,
  DUMMY_SIGNATURE_PNG_DATA_URL,
  createSyntheticPdfBytes,
} from './test-fixtures';
import {
  clampStampCoordinates,
  formatDateString,
  inspectPdfDocument,
  processSignedPdf,
} from './engine';

@Component({
  selector: 'app-pdf-signer-stamper',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone],
  templateUrl: './pdf-signer-stamper.component.html',
  styleUrl: './pdf-signer-stamper.component.scss',
})
export class PdfSignerStamperComponent implements OnInit, OnDestroy {
  @ViewChild('signatureCanvas') signatureCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pageSheet') pageSheetRef?: ElementRef<HTMLElement>;

  readonly Math = Math;

  // Options Signals
  readonly signatureInkColor = signal<SignatureInkColor>('black');
  readonly signaturePenWidth = signal<number>(2);
  readonly signatureMode = signal<'draw' | 'type'>('draw');
  readonly typedSignatureText = signal<string>('');
  readonly hasDrawnStrokes = signal<boolean>(false);

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
  readonly pageSummaries = signal<{ width: number; height: number }[]>([]);
  readonly placedStamps = signal<PlacedStamp[]>([]);
  readonly selectedStampId = signal<string | null>(null);

  readonly isProcessing = signal<boolean>(false);
  readonly processingError = signal<string | null>(null);

  // Canvas drawing state
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private createdObjectUrls: string[] = [];
  private worker: Worker | null = null;

  readonly hasSignatureContent = computed<boolean>(() => {
    return this.signatureMode() === 'draw'
      ? this.hasDrawnStrokes()
      : this.typedSignatureText().trim().length > 0;
  });

  readonly computedDateText = computed<string>(() =>
    formatDateString(this.dateFormat())
  );

  readonly activePageWidth = computed<number>(() => {
    const idx = this.currentPageIndex();
    const pages = this.pageSummaries();
    return pages[idx]?.width || 595.28;
  });

  readonly activePageHeight = computed<number>(() => {
    const idx = this.currentPageIndex();
    const pages = this.pageSummaries();
    return pages[idx]?.height || 841.89;
  });

  readonly currentPlacedStamps = computed<PlacedStamp[]>(() => {
    const idx = this.currentPageIndex();
    return this.placedStamps().filter((s) => s.pageIndex === idx);
  });

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
    if (!this.documentLoaded()) {
      await this.loadSampleDocument('Sample Contract Agreement');
    }
  }

  ngOnDestroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
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

  setSignatureMode(mode: 'draw' | 'type'): void {
    this.signatureMode.set(mode);
  }

  setTypedSignatureText(text: string): void {
    this.typedSignatureText.set(text);
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

  selectStamp(id: string | null): void {
    this.selectedStampId.set(id);
  }

  resetToDefaults(): void {
    this.signatureInkColor.set(DEFAULT_SIGNER_OPTIONS.signatureInkColor);
    this.signaturePenWidth.set(DEFAULT_SIGNER_OPTIONS.signaturePenWidth);
    this.signatureMode.set('draw');
    this.typedSignatureText.set('');
    this.dateFormat.set(DEFAULT_SIGNER_OPTIONS.dateFormat);
    this.customDateString.set(formatDateString(DEFAULT_SIGNER_OPTIONS.dateFormat));
    this.initialsText.set(DEFAULT_SIGNER_OPTIONS.initialsText);
    this.flattenAnnotations.set(DEFAULT_SIGNER_OPTIONS.flattenAnnotations);
    this.selectedStampId.set(null);
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
      this.pageSummaries.set(summary.pages);
      this.currentPageIndex.set(0);
      this.documentLoaded.set(true);
      this.placedStamps.set([]);
      this.selectedStampId.set(null);
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
      this.pageSummaries.set(summary.pages);
      this.currentPageIndex.set(0);
      this.documentLoaded.set(true);
      this.placedStamps.set([]);
      this.selectedStampId.set(null);
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
    const clamped = clampStampCoordinates(
      x,
      y,
      width,
      height,
      this.activePageWidth(),
      this.activePageHeight()
    );

    const stamp: PlacedStamp = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'signature',
      pageIndex: this.currentPageIndex(),
      x: clamped.x,
      y: clamped.y,
      width,
      height,
      imageDataUrl: dataUrl,
    };
    this.placedStamps.update((stamps) => [...stamps, stamp]);
    this.selectedStampId.set(stamp.id);
  }

  addDateStamp(x: number = 280, y: number = 150): void {
    const width = 120;
    const height = 25;
    const clamped = clampStampCoordinates(
      x,
      y,
      width,
      height,
      this.activePageWidth(),
      this.activePageHeight()
    );

    const stamp: PlacedStamp = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'date',
      pageIndex: this.currentPageIndex(),
      x: clamped.x,
      y: clamped.y,
      width,
      height,
      text: this.computedDateText(),
      fontSize: 11,
    };
    this.placedStamps.update((stamps) => [...stamps, stamp]);
    this.selectedStampId.set(stamp.id);
  }

  addInitialsStamp(x: number = 420, y: number = 150): void {
    const width = 32;
    const height = 32;
    const clamped = clampStampCoordinates(
      x,
      y,
      width,
      height,
      this.activePageWidth(),
      this.activePageHeight()
    );

    const stamp: PlacedStamp = {
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'initials',
      pageIndex: this.currentPageIndex(),
      x: clamped.x,
      y: clamped.y,
      width,
      height,
      text: this.initialsText(),
      fontSize: 12,
    };
    this.placedStamps.update((stamps) => [...stamps, stamp]);
    this.selectedStampId.set(stamp.id);
  }

  updateStampPosition(id: string, x: number, y: number): void {
    const stamp = this.placedStamps().find((s) => s.id === id);
    if (!stamp) return;

    const clamped = clampStampCoordinates(
      x,
      y,
      stamp.width || 100,
      stamp.height || 40,
      this.activePageWidth(),
      this.activePageHeight()
    );

    this.placedStamps.update((stamps) =>
      stamps.map((s) => (s.id === id ? { ...s, x: clamped.x, y: clamped.y } : s))
    );
  }

  generateSignatureDataUrl(): string {
    if (this.signatureMode() === 'type') {
      if (typeof document === 'undefined') return DUMMY_SIGNATURE_PNG_DATA_URL;

      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = 'italic 44px "Brush Script MT", "Caveat", "Segoe Script", cursive, sans-serif';
        ctx.fillStyle = this.signatureInkColor() === 'dark_blue' ? '#1e3a8a' : '#111827';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = this.typedSignatureText().trim() || 'Jane Doe';
        ctx.fillText(text, 200, 75);
      }
      return canvas.toDataURL('image/png');
    }

    const canvas = this.signatureCanvasRef?.nativeElement;
    return canvas ? canvas.toDataURL('image/png') : DUMMY_SIGNATURE_PNG_DATA_URL;
  }

  placeCurrentSignature(): void {
    if (!this.hasSignatureContent()) return;
    const dataUrl = this.generateSignatureDataUrl();
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
    if (this.selectedStampId() === id) {
      this.selectedStampId.set(null);
    }
  }

  clearAllStamps(): void {
    this.placedStamps.set([]);
    this.selectedStampId.set(null);
  }

  prevPage(): void {
    if (this.currentPageIndex() > 0) {
      this.currentPageIndex.update((i) => i - 1);
      this.selectedStampId.set(null);
    }
  }

  nextPage(): void {
    if (this.currentPageIndex() < this.pageCount() - 1) {
      this.currentPageIndex.update((i) => i + 1);
      this.selectedStampId.set(null);
    }
  }

  // Pointer Handlers for Signature Drawing Canvas
  onPointerDown(e: PointerEvent): void {
    const canvas = this.signatureCanvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || canvas.width);
    const scaleY = canvas.height / (rect.height || canvas.height);
    this.isDrawing = true;
    this.lastX = (e.clientX - rect.left) * scaleX;
    this.lastY = (e.clientY - rect.top) * scaleY;
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;
    const canvas = this.signatureCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || canvas.width);
    const scaleY = canvas.height / (rect.height || canvas.height);
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    ctx.strokeStyle = this.signatureInkColor() === 'dark_blue' ? '#1e3a8a' : '#111827';
    ctx.lineWidth = this.signaturePenWidth();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const midX = (this.lastX + currentX) / 2;
    const midY = (this.lastY + currentY) / 2;
    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.quadraticCurveTo(this.lastX, this.lastY, midX, midY);
    ctx.stroke();

    this.lastX = currentX;
    this.lastY = currentY;
    this.hasDrawnStrokes.set(true);
  }

  onPointerUp(): void {
    this.isDrawing = false;
  }

  clearSignaturePad(): void {
    const canvas = this.signatureCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.hasDrawnStrokes.set(false);
  }

  // Interactive Drag & Click for Page Viewport
  startDragStamp(e: PointerEvent, stampId: string): void {
    e.preventDefault();
    this.selectedStampId.set(stampId);

    const sheet = this.pageSheetRef?.nativeElement;
    if (!sheet) return;

    const sheetRect = sheet.getBoundingClientRect();
    const stamp = this.placedStamps().find((s) => s.id === stampId);
    if (!stamp) return;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const relX = (moveEvent.clientX - sheetRect.left) / sheetRect.width;
      const relY = (sheetRect.bottom - moveEvent.clientY) / sheetRect.height;
      const pdfX = Math.round(relX * this.activePageWidth() - stamp.width / 2);
      const pdfY = Math.round(relY * this.activePageHeight() - stamp.height / 2);
      this.updateStampPosition(stampId, pdfX, pdfY);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  onPageSheetClick(e: MouseEvent): void {
    const stampId = this.selectedStampId();
    if (!stampId) return;

    const sheet = this.pageSheetRef?.nativeElement;
    if (!sheet) return;

    const sheetRect = sheet.getBoundingClientRect();
    const stamp = this.placedStamps().find((s) => s.id === stampId);
    if (!stamp) return;

    const relX = (e.clientX - sheetRect.left) / sheetRect.width;
    const relY = (sheetRect.bottom - e.clientY) / sheetRect.height;
    const pdfX = Math.round(relX * this.activePageWidth() - stamp.width / 2);
    const pdfY = Math.round(relY * this.activePageHeight() - stamp.height / 2);
    this.updateStampPosition(stampId, pdfX, pdfY);
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
      let result: PdfSignerStamperResult;

      if (typeof Worker !== 'undefined') {
        try {
          result = await this.signWithWorker(buffer, this.currentOptions(), this.fileName());
        } catch {
          result = await processSignedPdf(buffer, this.currentOptions(), this.fileName());
        }
      } else {
        result = await processSignedPdf(buffer, this.currentOptions(), this.fileName());
      }

      if (result.success && result.blob) {
        this.triggerDownload(result.blob, result.fileName);
      }
    } catch (err: any) {
      this.processingError.set(err?.message || 'Failed to sign and export PDF');
    } finally {
      this.isProcessing.set(false);
    }
  }

  private signWithWorker(
    pdfBuffer: ArrayBuffer,
    options: PdfSignerStamperOptions,
    originalFileName: string
  ): Promise<PdfSignerStamperResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.worker = worker;

        worker.onmessage = (event: MessageEvent<PdfSignerWorkerResponse>) => {
          worker.terminate();
          if (this.worker === worker) {
            this.worker = null;
          }
          if (event.data.success && event.data.result) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error || 'Worker signing failed'));
          }
        };

        worker.onerror = (err) => {
          worker.terminate();
          if (this.worker === worker) {
            this.worker = null;
          }
          reject(err);
        };

        worker.postMessage({
          type: 'sign',
          pdfBuffer,
          options,
          originalFileName,
        } as PdfSignerWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
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

    setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = this.createdObjectUrls.indexOf(url);
      if (idx !== -1) {
        this.createdObjectUrls.splice(idx, 1);
      }
    }, 100);
  }
}
