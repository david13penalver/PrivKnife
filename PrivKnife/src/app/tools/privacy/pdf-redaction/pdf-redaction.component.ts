import { TranslatePipe } from '../../../core/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import {
  loadPdfForRedaction,
  renderPagePreview,
} from './engine';
import {
  PageRedaction,
  RedactionWorkerResponse,
  RedactionBox,
  RedactionColor,
  RedactionDocument,
} from './types';

@Component({
  selector: 'app-pdf-redaction',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone, TranslatePipe],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1050px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1>{{ 'tools.pdfRedaction.name' | translate }}</h1>
        <p class="g--margin-top-2" style="color: var(--color-text-muted); font-size: 1.125rem;">
          {{ 'tools.pdfRedaction.description' | translate }}
        </p>
      </div>

      <!-- Error Alert -->
      @if (errorMessage()) {
        <div class="l-columns__area g--margin-bottom-4">
          <div role="alert" class="g--padding-3" style="background-color: var(--color-danger-subtle, #fee2e2); border: 1px solid var(--color-danger); border-radius: var(--radius-sm); color: var(--color-danger);">
            <strong>Error:</strong> {{ errorMessage() }}
          </div>
        </div>
      }

      <!-- Dropzone (if no document loaded) -->
      @if (!loadedDocument()) {
        <div class="l-columns__area">
          <app-dropzone
            title="Drop your PDF here, or browse"
            subtitle="Securely redact legal agreements, tax forms, medical records, or invoices"
            accept=".pdf,application/pdf"
            (filesSelected)="onFilesSelected($event)" />
        </div>
      } @else {
        <!-- Redaction Workspace -->
        <div class="l-columns__area">
          <app-card>
            <!-- Top Controls Bar -->
            <div
              class="l-extremo g--margin-bottom-4 g--padding-bottom-3"
              style="border-bottom: 1px solid var(--color-border-default); align-items: center; flex-wrap: wrap; gap: 12px;">
              
              <!-- Document Info & Page Navigation -->
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span style="font-weight: 600; font-size: 0.9375rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  📄 {{ loadedDocument()?.name }}
                </span>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    class="c-button c-button--ghost c-button--small"
                    [disabled]="currentPageIndex() === 0"
                    (click)="goToPage(currentPageIndex() - 1)">
                    ◀ Prev
                  </button>
                  <span style="font-size: 0.875rem; color: var(--color-text-muted); white-space: nowrap;">
                    Page {{ currentPageIndex() + 1 }} of {{ loadedDocument()?.pageCount }}
                  </span>
                  <button
                    type="button"
                    class="c-button c-button--ghost c-button--small"
                    [disabled]="currentPageIndex() >= (loadedDocument()?.pageCount || 1) - 1"
                    (click)="goToPage(currentPageIndex() + 1)">
                    Next ▶
                  </button>
                </div>

                <!-- Zoom Controls -->
                <div style="display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); padding: 2px 6px;">
                  <button
                    type="button"
                    class="c-button c-button--ghost c-button--small"
                    style="padding: 2px 6px; min-height: 24px;"
                    title="Zoom out"
                    [disabled]="zoomLevel() <= 0.5"
                    (click)="zoomOut()">
                    -
                  </button>
                  <span style="font-size: 0.8125rem; font-family: monospace; min-width: 42px; text-align: center;">
                    {{ Math.round(zoomLevel() * 100) }}%
                  </span>
                  <button
                    type="button"
                    class="c-button c-button--ghost c-button--small"
                    style="padding: 2px 6px; min-height: 24px;"
                    title="Zoom in"
                    [disabled]="zoomLevel() >= 2.0"
                    (click)="zoomIn()">
                    +
                  </button>
                </div>
              </div>

              <!-- Tools & Actions -->
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <!-- Blackout / Whiteout Toggle -->
                <div style="display: inline-flex; border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); overflow: hidden;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="activeTool() === 'black'"
                    [class.c-button--ghost]="activeTool() !== 'black'"
                    (click)="setActiveTool('black')"
                    title="Opaque black box">
                    ⬛ Blackout
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="activeTool() === 'white'"
                    [class.c-button--ghost]="activeTool() !== 'white'"
                    (click)="setActiveTool('white')"
                    title="Opaque white box">
                    ⬜ Whiteout
                  </button>
                </div>

                <app-button
                  variant="ghost"
                  size="small"
                  [disabled]="currentPageRedactions().length === 0"
                  (clicked)="undoRedaction()">
                  ↩ Undo
                </app-button>

                <app-button
                  variant="ghost"
                  size="small"
                  [disabled]="currentPageRedactions().length === 0"
                  (clicked)="clearCurrentPageRedactions()">
                  🗑️ Clear Page
                </app-button>

                <app-button
                  variant="outline"
                  size="small"
                  (clicked)="resetDocument()">
                  ✕ Close
                </app-button>

                <app-button
                  variant="primary"
                  [loading]="isProcessing()"
                  (clicked)="downloadSanitizedPdf()">
                  🔒 Burn &amp; Export ({{ totalRedactionCount() }})
                </app-button>
              </div>
            </div>

            <!-- Redaction Options Toolbar -->
            <div
              class="g--margin-bottom-3"
              style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 0.875rem;">
              <span>Export renders each page with the redactions applied.</span>

              @if (isRenderingPreview()) {
                <span style="color: var(--color-text-muted); font-size: 0.8125rem;">
                  ⏳ Rendering crisp page preview...
                </span>
              }
            </div>

            <!-- Redaction Canvas Stage -->
            <div
              style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--color-bg-subtle); padding: 24px; border-radius: var(--radius-md); min-height: 480px; overflow: auto; user-select: none;">
              
              <div
                #canvasContainer
                style="position: relative; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.12); cursor: crosshair; touch-action: none; display: inline-block; overflow: hidden;"
                [style.width.px]="currentPageDimensions().displayWidth"
                [style.height.px]="currentPageDimensions().displayHeight"
                (pointerdown)="onPointerDown($event)">
                
                <!-- Rendered PDF Page Preview Image (if available) -->
                @if (currentPagePreview()) {
                  <img
                    [src]="currentPagePreview()"
                    alt="PDF Page Preview"
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; user-select: none;" />
                } @else {
                  <!-- Fallback / Page Simulation Indicator -->
                  <div
                    style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #475569; pointer-events: none; padding: 24px; text-align: center;">
                    <span style="font-size: 2.5rem; margin-bottom: 8px;">📑</span>
                    <strong style="font-size: 1.125rem; color: #1e293b;">
                      {{ loadedDocument()?.name }}
                    </strong>
                    <span style="font-size: 0.875rem; color: #64748b; margin-top: 4px;">
                      Page {{ currentPageIndex() + 1 }} &bull; Click and drag anywhere to draw a {{ activeTool() === 'black' ? 'blackout' : 'whiteout' }} redaction
                    </span>
                  </div>
                }

                <!-- Active Dragging Rectangle Preview -->
                @if (activeDragBox(); as drag) {
                  <div
                    style="position: absolute; pointer-events: none; border: 2px dashed #3b82f6; z-index: 10;"
                    [style.left.px]="drag.x"
                    [style.top.px]="drag.y"
                    [style.width.px]="drag.width"
                    [style.height.px]="drag.height"
                    [style.background]="activeTool() === 'white' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'">
                  </div>
                }

                <!-- Rendered Redactions for Current Page -->
                @for (box of currentPageRedactions(); track box.id) {
                  <div
                    style="position: absolute; border-radius: 1px; pointer-events: none; z-index: 5;"
                    [style.left.px]="box.x * displayScale()"
                    [style.top.px]="(currentPageDimensions().pdfHeight - box.y - box.height) * verticalScale()"
                    [style.width.px]="box.width * displayScale()"
                    [style.height.px]="box.height * verticalScale()"
                    [style.background]="box.color === 'white' ? '#ffffff' : '#000000'"
                    [style.border]="box.color === 'white' ? '1px dashed #cbd5e1' : 'none'">
                  </div>
                }
              </div>
            </div>

            <!-- Instructions Bar -->
            <div class="g--margin-top-4 g--text-center" style="font-size: 0.8125rem; color: var(--color-text-muted);">
              Redaction boxes are applied to the page pixels. The export contains newly rendered pages and strips source metadata.
            </div>
          </app-card>
        </div>
      }

      <!-- Educational Privacy Card -->
      <div class="l-columns__area g--margin-top-6">
        <app-card title="Zero-Server Permanent Redaction Guarantee">
          <p style="color: var(--color-text-muted); font-size: 0.9375rem; line-height: 1.6;">
            Typical online PDF editors upload your sensitive files to cloud servers where redactions are sometimes only cosmetic highlights that can easily be removed. PrivKnife applies the boxes to rendered pages and builds a new PDF locally.
          </p>
        </app-card>
      </div>
    </div>
  `,
})
export class PdfRedactionComponent implements OnDestroy {
  readonly Math = Math;
  readonly canvasContainer = viewChild<ElementRef<HTMLDivElement>>('canvasContainer');

  readonly loadedDocument = signal<RedactionDocument | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly currentPageIndex = signal<number>(0);
  readonly redactionsByPage = signal<Map<number, RedactionBox[]>>(new Map());
  readonly activeTool = signal<RedactionColor>('black');
  readonly zoomLevel = signal<number>(1.0);
  readonly isProcessing = signal<boolean>(false);
  readonly isRenderingPreview = signal<boolean>(false);
  private readonly preview = signal<Awaited<ReturnType<typeof renderPagePreview>>>(undefined);
  readonly currentPagePreview = computed(() => this.preview()?.url ?? null);
  readonly activeDragBox = signal<{ x: number; y: number; width: number; height: number } | null>(null);

  private activeBlobUrls: string[] = [];
  private cancelExport?: () => void;
  private cancelSelection?: () => void;
  private previewRequest = 0;
  private documentRequest = 0;

  readonly currentPageRedactions = computed<RedactionBox[]>(() => {
    const pageIdx = this.currentPageIndex();
    const map = this.redactionsByPage();
    return map.get(pageIdx) || [];
  });

  readonly totalRedactionCount = computed<number>(() => {
    let total = 0;
    for (const boxes of this.redactionsByPage().values()) {
      total += boxes.length;
    }
    return total;
  });

  readonly currentPageDimensions = computed(() => {
    const doc = this.loadedDocument();
    const idx = this.currentPageIndex();
    const zoom = this.zoomLevel();
    if (!doc || !doc.pages[idx]) {
      return { pdfWidth: 600, pdfHeight: 800, displayWidth: 500 * zoom, displayHeight: 666 * zoom };
    }
    const page = this.preview() ?? doc.pages[idx];
    const maxDisplayWidth = 560 * zoom;
    const scale = Math.min(zoom * 1.5, maxDisplayWidth / page.width);
    return {
      pdfWidth: page.width,
      pdfHeight: page.height,
      displayWidth: Math.round(page.width * scale),
      displayHeight: Math.round(page.height * scale),
    };
  });

  readonly verticalScale = computed(() => {
    const dims = this.currentPageDimensions();
    return dims.displayHeight / dims.pdfHeight;
  });

  readonly displayScale = computed(() => {
    const dims = this.currentPageDimensions();
    return dims.displayWidth / dims.pdfWidth;
  });

  async onFilesSelected(files: File[]): Promise<void> {
    if (files && files.length > 0) {
      await this.onFileDropped(files[0]);
    }
  }

  async onFileDropped(file: File): Promise<void> {
    const request = ++this.documentRequest;
    this.cancelExport?.();
    this.cancelSelection?.();
    this.previewRequest++;
    this.preview.set(undefined);
    this.loadedDocument.set(null);
    this.isProcessing.set(true);
    this.errorMessage.set(null);
    try {
      const buffer = await file.arrayBuffer();
      const doc = await loadPdfForRedaction(buffer, file.name);
      if (request !== this.documentRequest) return;
      this.loadedDocument.set(doc);
      this.currentPageIndex.set(0);
      this.redactionsByPage.set(new Map());
      this.zoomLevel.set(1.0);
      await this.loadActivePagePreview();
    } catch (error: unknown) {
      if (request === this.documentRequest) {
        this.errorMessage.set(error instanceof Error ? error.message : 'The selected file is not a valid PDF.');
      }
    } finally {
      if (request === this.documentRequest) this.isProcessing.set(false);
    }
  }

  setActiveTool(tool: RedactionColor): void {
    this.activeTool.set(tool);
  }

  zoomIn(): void {
    this.zoomLevel.update((z) => Math.min(2.0, +(z + 0.25).toFixed(2)));
  }

  zoomOut(): void {
    this.zoomLevel.update((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  }

  async goToPage(index: number): Promise<void> {
    const doc = this.loadedDocument();
    if (doc && index >= 0 && index < doc.pageCount) {
      this.currentPageIndex.set(index);
      await this.loadActivePagePreview();
    }
  }

  private async loadActivePagePreview(): Promise<void> {
    const doc = this.loadedDocument();
    if (!doc) {
      this.preview.set(undefined);
      return;
    }
    this.cancelSelection?.();
    const request = ++this.previewRequest;
    this.preview.set(undefined);
    this.isRenderingPreview.set(true);
    try {
      const preview = await renderPagePreview(doc.buffer, this.currentPageIndex(), 700);
      if (request === this.previewRequest) this.preview.set(preview);
    } catch {
      if (request === this.previewRequest) this.preview.set(undefined);
    } finally {
      if (request === this.previewRequest) this.isRenderingPreview.set(false);
    }
  }

  addRedactionBox(box: Omit<RedactionBox, 'id'>): void {
    const pageIdx = this.currentPageIndex();
    const newBox: RedactionBox = {
      ...box,
      id: `box-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    const currentMap = new Map(this.redactionsByPage());
    const pageBoxes = [...(currentMap.get(pageIdx) || []), newBox];
    currentMap.set(pageIdx, pageBoxes);
    this.redactionsByPage.set(currentMap);
  }

  undoRedaction(): void {
    const pageIdx = this.currentPageIndex();
    const currentMap = new Map(this.redactionsByPage());
    const pageBoxes = [...(currentMap.get(pageIdx) || [])];
    if (pageBoxes.length > 0) {
      pageBoxes.pop();
      currentMap.set(pageIdx, pageBoxes);
      this.redactionsByPage.set(currentMap);
    }
  }

  clearCurrentPageRedactions(): void {
    const pageIdx = this.currentPageIndex();
    const currentMap = new Map(this.redactionsByPage());
    currentMap.set(pageIdx, []);
    this.redactionsByPage.set(currentMap);
  }

  resetDocument(): void {
    this.cancelExport?.();
    this.cancelSelection?.();
    this.previewRequest++;
    this.documentRequest++;
    this.isProcessing.set(false);
    this.isRenderingPreview.set(false);
    this.loadedDocument.set(null);
    this.errorMessage.set(null);
    this.currentPageIndex.set(0);
    this.redactionsByPage.set(new Map());
    this.preview.set(undefined);
    this.zoomLevel.set(1.0);
    this.activeDragBox.set(null);
    this.cleanBlobUrls();
  }

  onPointerDown(event: PointerEvent): void {
    const container = this.canvasContainer()?.nativeElement;
    if (!container || !this.currentPagePreview() || !event.isPrimary || event.button !== 0) return;

    this.cancelSelection?.();
    const rect = container.getBoundingClientRect();
    const { clientX: startX, clientY: startY, pointerId } = event;
    const bounds = ({ clientX, clientY }: PointerEvent) => {
      const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
      const x = clamp(Math.min(startX, clientX) - rect.left, rect.width);
      const y = clamp(Math.min(startY, clientY) - rect.top, rect.height);
      return {
        x, y,
        width: clamp(Math.max(startX, clientX) - rect.left, rect.width) - x,
        height: clamp(Math.max(startY, clientY) - rect.top, rect.height) - y,
      };
    };
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId === pointerId) this.activeDragBox.set(bounds(moveEvent));
    };
    const finish = () => {
      this.activeDragBox.set(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', commit);
      window.removeEventListener('pointercancel', abort);
      this.cancelSelection = undefined;
    };
    const commit = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      const box = bounds(upEvent);
      finish();
      if (box.width <= 5 || box.height <= 5) return;
      const { pdfWidth, pdfHeight } = this.currentPageDimensions();
      const xScale = pdfWidth / rect.width;
      const yScale = pdfHeight / rect.height;
      this.addRedactionBox({
        x: box.x * xScale,
        y: pdfHeight - (box.y + box.height) * yScale,
        width: box.width * xScale,
        height: box.height * yScale,
        color: this.activeTool(),
      });
    };
    const abort = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) finish();
    };
    this.cancelSelection = finish;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', commit);
    window.addEventListener('pointercancel', abort);
  }

  async downloadSanitizedPdf(): Promise<void> {
    const doc = this.loadedDocument();
    if (!doc || this.isProcessing()) return;

    this.errorMessage.set(null);
    this.isProcessing.set(true);
    try {
      const pageRedactions: PageRedaction[] = [];
      for (let i = 0; i < doc.pageCount; i++) {
        const boxes = this.redactionsByPage().get(i) || [];
        pageRedactions.push({
          pageIndex: i,
          boxes,
        });
      }

      const sanitizedBytes = await this.renderExport(doc.buffer, pageRedactions);
      if (!sanitizedBytes || this.loadedDocument() !== doc) return;
      const blob = new Blob([sanitizedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      this.activeBlobUrls.push(url);

      const a = document.createElement('a');
      a.href = url;
      const baseName = doc.name.replace(/\.pdf$/i, '');
      a.download = `${baseName}-redacted.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      const idx = this.activeBlobUrls.indexOf(url);
      if (idx !== -1) {
        this.activeBlobUrls.splice(idx, 1);
      }
    } catch {
      if (this.loadedDocument() === doc) {
        this.errorMessage.set('PDF rendering failed. No redacted PDF was created.');
      }
    } finally {
      if (this.loadedDocument() === doc) this.isProcessing.set(false);
    }
  }

  private renderExport(source: ArrayBuffer, redactions: PageRedaction[]): Promise<Uint8Array<ArrayBuffer> | undefined> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      const finish = () => {
        worker.terminate();
        this.cancelExport = undefined;
      };
      const fail = () => {
        finish();
        reject(new Error('PDF rendering failed.'));
      };
      this.cancelExport = () => {
        finish();
        this.isProcessing.set(false);
        resolve(undefined);
      };
      worker.onmessage = ({ data }: MessageEvent<RedactionWorkerResponse>) => {
        if ('error' in data) {
          fail();
          return;
        }
        finish();
        resolve(data.bytes);
      };
      worker.onerror = fail;
      worker.onmessageerror = fail;
      try {
        const buffer = source.slice(0);
        worker.postMessage({ buffer, redactions }, [buffer]);
      } catch {
        fail();
      }
    });
  }

  ngOnDestroy(): void {
    this.cancelExport?.();
    this.cancelSelection?.();
    this.previewRequest++;
    this.documentRequest++;
    this.cleanBlobUrls();
  }

  private cleanBlobUrls(): void {
    for (const url of this.activeBlobUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeBlobUrls = [];
  }
}
