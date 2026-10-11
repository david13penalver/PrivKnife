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
import { burnRedactions, loadPdfForRedaction } from './engine';
import {
  PageRedaction,
  RedactionBox,
  RedactionColor,
  RedactionDocument,
} from './types';

@Component({
  selector: 'app-pdf-redaction',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1050px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1>PDF Redaction &amp; Anonymizer</h1>
        <p class="g--margin-top-2" style="color: var(--color-text-muted); font-size: 1.125rem;">
          Permanently blackout or whiteout sensitive data, names, SSNs, and numbers while stripping confidential metadata.
        </p>
      </div>

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

            <!-- Redaction Canvas Stage -->
            <div
              style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--color-bg-subtle); padding: 24px; border-radius: var(--radius-md); min-height: 480px; overflow: auto; user-select: none;">
              
              <div
                #canvasContainer
                style="position: relative; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.12); cursor: crosshair; display: inline-block;"
                [style.width.px]="currentPageDimensions().displayWidth"
                [style.height.px]="currentPageDimensions().displayHeight"
                (mousedown)="onMouseDown($event)">
                
                <!-- Page Content Simulation / Indicator -->
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

                <!-- Rendered Redactions for Current Page -->
                @for (box of currentPageRedactions(); track box.id) {
                  <div
                    style="position: absolute; border-radius: 1px; pointer-events: none;"
                    [style.left.px]="box.x * displayScale()"
                    [style.top.px]="(currentPageDimensions().pdfHeight - box.y - box.height) * displayScale()"
                    [style.width.px]="box.width * displayScale()"
                    [style.height.px]="box.height * displayScale()"
                    [style.background]="box.color === 'white' ? '#ffffff' : '#000000'"
                    [style.border]="box.color === 'white' ? '1px dashed #cbd5e1' : 'none'">
                  </div>
                }
              </div>
            </div>

            <!-- Instructions Bar -->
            <div class="g--margin-top-4 g--text-center" style="font-size: 0.8125rem; color: var(--color-text-muted);">
              💡 Redaction boxes permanently burn opaque vector shapes directly into the output document and permanently purge PDF metadata tags.
            </div>
          </app-card>
        </div>
      }

      <!-- Educational Privacy Card -->
      <div class="l-columns__area g--margin-top-6">
        <app-card title="Zero-Server Permanent Redaction Guarantee">
          <p style="color: var(--color-text-muted); font-size: 0.9375rem; line-height: 1.6;">
            Typical online PDF editors upload your sensitive files to cloud servers where redactions are sometimes only cosmetic highlights that can easily be removed. PrivKnife burns true opaque vector rectangles into the document content stream and purges author, title, and generator metadata entirely in your browser using <strong>pdf-lib</strong>.
          </p>
        </app-card>
      </div>
    </div>
  `,
})
export class PdfRedactionComponent implements OnDestroy {
  readonly canvasContainer = viewChild<ElementRef<HTMLDivElement>>('canvasContainer');

  readonly loadedDocument = signal<RedactionDocument | null>(null);
  readonly currentPageIndex = signal<number>(0);
  readonly redactionsByPage = signal<Map<number, RedactionBox[]>>(new Map());
  readonly activeTool = signal<RedactionColor>('black');
  readonly isProcessing = signal<boolean>(false);

  private activeBlobUrls: string[] = [];
  private isDrawing = false;
  private startX = 0;
  private startY = 0;

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
    if (!doc || !doc.pages[idx]) {
      return { pdfWidth: 600, pdfHeight: 800, displayWidth: 500, displayHeight: 666 };
    }
    const page = doc.pages[idx];
    const maxDisplayWidth = 560;
    const scale = Math.min(1, maxDisplayWidth / page.width);
    return {
      pdfWidth: page.width,
      pdfHeight: page.height,
      displayWidth: Math.round(page.width * scale),
      displayHeight: Math.round(page.height * scale),
    };
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
    this.isProcessing.set(true);
    try {
      const buffer = await file.arrayBuffer();
      const doc = await loadPdfForRedaction(buffer, file.name);
      this.loadedDocument.set(doc);
      this.currentPageIndex.set(0);
      this.redactionsByPage.set(new Map());
    } finally {
      this.isProcessing.set(false);
    }
  }

  setActiveTool(tool: RedactionColor): void {
    this.activeTool.set(tool);
  }

  goToPage(index: number): void {
    const doc = this.loadedDocument();
    if (doc && index >= 0 && index < doc.pageCount) {
      this.currentPageIndex.set(index);
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
    this.loadedDocument.set(null);
    this.currentPageIndex.set(0);
    this.redactionsByPage.set(new Map());
    this.cleanBlobUrls();
  }

  onMouseDown(event: MouseEvent): void {
    const container = this.canvasContainer()?.nativeElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.isDrawing = true;
    this.startX = event.clientX - rect.left;
    this.startY = event.clientY - rect.top;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDrawing) return;
      // In interactive drawing, updates could be previewed
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const endX = upEvent.clientX - rect.left;
      const endY = upEvent.clientY - rect.top;

      const scale = this.displayScale();
      const dims = this.currentPageDimensions();

      const minX = Math.max(0, Math.min(this.startX, endX));
      const maxX = Math.min(dims.displayWidth, Math.max(this.startX, endX));
      const minY = Math.max(0, Math.min(this.startY, endY));
      const maxY = Math.min(dims.displayHeight, Math.max(this.startY, endY));

      const w = maxX - minX;
      const h = maxY - minY;

      // Only add if box has a minimum size
      if (w > 5 && h > 5) {
        // Convert canvas coordinates to PDF coordinates
        // Canvas (0, 0) is top-left, PDF (0, 0) is bottom-left
        const pdfX = minX / scale;
        const pdfY = (dims.displayHeight - maxY) / scale;
        const pdfW = w / scale;
        const pdfH = h / scale;

        this.addRedactionBox({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          color: this.activeTool() === 'white' ? 'white' : 'black',
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  async downloadSanitizedPdf(): Promise<void> {
    const doc = this.loadedDocument();
    if (!doc) return;

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

      const sanitizedBytes = await burnRedactions(doc.buffer, pageRedactions, {
        stripMetadata: true,
      });

      const blob = new Blob([sanitizedBytes as BlobPart], { type: 'application/pdf' });
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
    } finally {
      this.isProcessing.set(false);
    }
  }

  ngOnDestroy(): void {
    this.cleanBlobUrls();
  }

  private cleanBlobUrls(): void {
    for (const url of this.activeBlobUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeBlobUrls = [];
  }
}
