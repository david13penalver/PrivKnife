import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  signal,
} from '@angular/core';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import { assemblePdf, loadPdfDocument, rotateAllPages, rotatePage } from './engine';
import { DocumentPage, LoadedPdfDocument } from './types';

@Component({
  selector: 'app-pdf-merger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1100px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1>PDF Merger, Splitter &amp; Page Organizer</h1>
        <p class="g--margin-top-2" style="color: var(--color-text-muted); font-size: 1.125rem;">
          Combine multiple PDFs, reorganize or delete pages, and rotate sheets directly in your browser with zero upload limits.
        </p>
      </div>

      <!-- Dropzone (always visible or in empty state) -->
      @if (pages().length === 0) {
        <div class="l-columns__area">
          <app-dropzone
            title="Drop your PDF files here, or browse"
            subtitle="Add one or multiple documents to merge, reorganize, or rotate"
            accept=".pdf,application/pdf"
            (filesSelected)="onFilesDropped($event)" />
        </div>
      } @else {
        <!-- Loaded Workspace -->
        <div class="l-columns__area">
          <app-card>
            <!-- Top Controls Bar -->
            <div
              class="l-extremo g--margin-bottom-4 g--padding-bottom-3"
              style="border-bottom: 1px solid var(--color-border-default); align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <app-badge variant="info">
                  {{ pages().length }} Pages Loaded
                </app-badge>
                <span style="font-size: 0.8125rem; color: var(--color-text-muted);">
                  Across {{ loadedDocuments().length }} file(s)
                </span>
              </div>

              <!-- Quick Bulk Action Buttons -->
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <app-button variant="ghost" size="small" (clicked)="rotateAll()">
                  🔄 Rotate All
                </app-button>
                <app-button variant="outline" size="small" (clicked)="clearAll()">
                  🗑️ Clear All
                </app-button>
                <app-button
                  variant="primary"
                  [loading]="isProcessing()"
                  (clicked)="mergeAndDownload()">
                  ✨ Merge &amp; Download PDF
                </app-button>
              </div>
            </div>

            <!-- Page Grid View -->
            <div
              style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; max-height: 520px; overflow-y: auto; padding: 4px;">
              @for (page of pages(); track page.id; let idx = $index) {
                <div
                  style="border: 1px solid var(--color-border-default); border-radius: var(--radius-md); padding: 12px; background: var(--color-bg-surface); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; position: relative;">
                  
                  <!-- Page Thumbnail Box -->
                  <div
                    style="width: 100%; height: 160px; background: var(--color-bg-subtle); border-radius: var(--radius-sm); border: 1px solid var(--color-border-default); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden;"
                    [style.transform]="'rotate(' + page.rotation + 'deg)'">
                    <span style="font-size: 2rem;">📄</span>
                    <span style="font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); margin-top: 4px;">
                      Page {{ page.displayPageNumber }}
                    </span>
                    @if (page.rotation !== 0) {
                      <span
                        style="position: absolute; top: 4px; right: 4px; font-size: 0.6875rem; background: var(--color-primary); color: white; padding: 2px 6px; border-radius: var(--radius-full);">
                        {{ page.rotation }}°
                      </span>
                    }
                  </div>

                  <!-- File Label -->
                  <span
                    style="font-size: 0.75rem; color: var(--color-text-muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                    [title]="page.documentName">
                    {{ page.documentName }}
                  </span>

                  <!-- Page Actions -->
                  <div style="display: flex; gap: 4px; align-items: center; width: 100%; justify-content: center;">
                    <button
                      type="button"
                      class="c-button c-button--ghost c-button--small"
                      title="Move Left"
                      [disabled]="idx === 0"
                      (click)="movePage(idx, 'left')">
                      ◀
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--ghost c-button--small"
                      title="Rotate 90°"
                      (click)="rotateSinglePage(idx)">
                      🔄
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--ghost c-button--small"
                      title="Delete Page"
                      style="color: var(--color-danger);"
                      (click)="deletePage(idx)">
                      ❌
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--ghost c-button--small"
                      title="Move Right"
                      [disabled]="idx === pages().length - 1"
                      (click)="movePage(idx, 'right')">
                      ▶
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Add More Files Prompt -->
            <div class="g--margin-top-4 g--padding-top-3" style="border-top: 1px solid var(--color-border-default);">
              <label class="c-button c-button--outline c-button--small" style="cursor: pointer; display: inline-flex;">
                ➕ Add More PDF Files
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  style="display: none;"
                  (change)="onFileInputChange($event)" />
              </label>
            </div>
          </app-card>
        </div>
      }

      <!-- Educational Privacy Card -->
      <div class="l-columns__area g--margin-top-6">
        <app-card title="Private Client-Side PDF Architecture">
          <p style="color: var(--color-text-muted); font-size: 0.9375rem; line-height: 1.6;">
            Most web-based PDF editors upload your sensitive files to remote cloud servers to merge or extract pages.
            PrivKnife uses <strong>pdf-lib</strong> to assemble, rotate, and reorganize your pages directly in your computer's RAM.
            Your legal documents, tax returns, and bank statements never leave your device.
          </p>
        </app-card>
      </div>
    </div>
  `,
})
export class PdfMergerComponent implements OnDestroy {
  readonly loadedDocuments = signal<LoadedPdfDocument[]>([]);
  readonly pages = signal<DocumentPage[]>([]);
  readonly isProcessing = signal<boolean>(false);

  private activeBlobUrls: string[] = [];

  async onFilesDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    this.isProcessing.set(true);

    try {
      const newDocs: LoadedPdfDocument[] = [];
      const newPages: DocumentPage[] = [];

      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
          const buffer = await file.arrayBuffer();
          const doc = await loadPdfDocument(buffer, file.name);
          newDocs.push(doc);
          newPages.push(...doc.pages);
        }
      }

      this.loadedDocuments.update((docs) => [...docs, ...newDocs]);
      this.pages.update((pgs) => [...pgs, ...newPages]);
    } finally {
      this.isProcessing.set(false);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.onFilesDropped(Array.from(input.files));
      input.value = '';
    }
  }

  rotateSinglePage(index: number): void {
    const current = [...this.pages()];
    if (index >= 0 && index < current.length) {
      current[index] = rotatePage(current[index]);
      this.pages.set(current);
    }
  }

  rotateAll(): void {
    this.pages.update((pgs) => rotateAllPages(pgs));
  }

  deletePage(index: number): void {
    const current = [...this.pages()];
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
      this.pages.set(current);
    }
  }

  movePage(index: number, direction: 'left' | 'right'): void {
    const current = [...this.pages()];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx >= 0 && targetIdx < current.length) {
      const temp = current[index];
      current[index] = current[targetIdx];
      current[targetIdx] = temp;
      this.pages.set(current);
    }
  }

  clearAll(): void {
    this.pages.set([]);
    this.loadedDocuments.set([]);
    this.cleanBlobUrls();
  }

  async mergeAndDownload(): Promise<void> {
    const currentPages = this.pages();
    if (currentPages.length === 0) return;

    this.isProcessing.set(true);
    try {
      const sourceMap = new Map<string, ArrayBuffer>();
      for (const doc of this.loadedDocuments()) {
        sourceMap.set(doc.id, doc.buffer);
      }

      const mergedBytes = await assemblePdf(currentPages, sourceMap);
      const blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      this.activeBlobUrls.push(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `merged-${Date.now()}.pdf`;
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
