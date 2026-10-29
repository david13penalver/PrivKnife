import { TranslatePipe } from '../../../core/i18n';
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
import {
  assemblePdf,
  createSplitZip,
  loadPdfDocument,
  renderPageThumbnail,
  rotateAllPages,
  rotatePage,
  splitPdfIntoSinglePages,
} from './engine';
import { DocumentPage, LoadedPdfDocument } from './types';

@Component({
  selector: 'app-pdf-merger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone, TranslatePipe],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1100px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1>{{ 'tools.pdfMerger.name' | translate }}</h1>
        <p class="g--margin-top-2" style="color: var(--color-text-muted); font-size: 1.125rem;">
          {{ 'tools.pdfMerger.description' | translate }}
        </p>
      </div>

      <!-- Dropzone (in empty state) -->
      @if (pages().length === 0) {
        <div class="l-columns__area">
          @if (errorMessage()) {
            <div
              class="g--margin-bottom-4"
              style="padding: 10px 14px; background: var(--color-danger-subtle); color: var(--color-danger); border-radius: var(--radius-sm); font-size: 0.8125rem; font-weight: 500;">
              ⚠️ {{ errorMessage() }}
            </div>
          }

          <app-dropzone
            title="Drop your PDF files here, or browse"
            subtitle="Add one or multiple documents to merge, reorganize, split, or rotate"
            accept=".pdf,application/pdf"
            (filesSelected)="onFilesDropped($event)" />
        </div>
      } @else {
        <!-- Loaded Workspace -->
        <div class="l-columns__area">
          <app-card>
            @if (errorMessage()) {
              <div
                class="g--margin-bottom-4"
                style="padding: 10px 14px; background: var(--color-danger-subtle); color: var(--color-danger); border-radius: var(--radius-sm); font-size: 0.8125rem; font-weight: 500;">
                ⚠️ {{ errorMessage() }}
              </div>
            }

            <!-- Top Controls Bar -->
            <div
              class="l-extremo g--margin-bottom-4 g--padding-bottom-3"
              style="border-bottom: 1px solid var(--color-border-default); align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <app-badge variant="info">
                  {{ pages().length }} Pages Loaded
                </app-badge>
                @if (selectedCount() > 0) {
                  <app-badge variant="success">
                    ✓ {{ selectedCount() }} Selected
                  </app-badge>
                }
                <span style="font-size: 0.8125rem; color: var(--color-text-muted);">
                  Across {{ loadedDocuments().length }} file(s)
                </span>
              </div>

              <!-- Primary Export CTAs -->
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <app-button
                  variant="outline"
                  [loading]="isProcessing()"
                  (clicked)="splitAndDownloadZip()">
                  ✂️ Split to Single Pages (.zip)
                </app-button>
                <app-button
                  variant="primary"
                  [loading]="isProcessing()"
                  (clicked)="mergeAndDownload()">
                  {{ selectedCount() > 0 ? '✨ Merge Selected (' + selectedCount() + ')' : '✨ Merge & Download PDF' }}
                </app-button>
              </div>
            </div>

            <!-- Bulk Selection & Manipulation Toolbar -->
            <div
              class="l-extremo g--margin-bottom-4 g--padding-bottom-2"
              style="border-bottom: 1px solid var(--color-border-subtle); align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                <button
                  type="button"
                  class="c-button c-button--ghost c-button--small"
                  (click)="selectedCount() === pages().length ? deselectAll() : selectAll()">
                  {{ selectedCount() === pages().length ? '☐ Deselect All' : '☑️ Select All' }}
                </button>
                <button
                  type="button"
                  class="c-button c-button--ghost c-button--small"
                  (click)="selectedCount() > 0 ? rotateSelected() : rotateAll()">
                  🔄 {{ selectedCount() > 0 ? 'Rotate Selected' : 'Rotate All' }}
                </button>
                <button
                  type="button"
                  class="c-button c-button--ghost c-button--small"
                  (click)="sortByFile()">
                  🔀 Sort by File
                </button>
                @if (selectedCount() > 0) {
                  <button
                    type="button"
                    class="c-button c-button--ghost c-button--small"
                    style="color: var(--color-danger);"
                    (click)="deleteSelected()">
                    🗑️ Delete Selected ({{ selectedCount() }})
                  </button>
                }
              </div>

              <div>
                <app-button variant="outline" size="small" (clicked)="clearAll()">
                  🗑️ Clear All
                </app-button>
              </div>
            </div>

            <!-- Page Grid View -->
            <div
              style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; max-height: 520px; overflow-y: auto; padding: 4px;">
              @for (page of pages(); track page.id; let idx = $index) {
                <div
                  draggable="true"
                  (dragstart)="onDragStart(idx, $event)"
                  (dragover)="onDragOver(idx, $event)"
                  (drop)="onDrop(idx, $event)"
                  (dragend)="onDragEnd()"
                  style="border-radius: var(--radius-md); padding: 12px; background: var(--color-bg-surface); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; position: relative; cursor: grab; user-select: none; transition: border-color 0.15s ease, box-shadow 0.15s ease;"
                  [style.border]="dragOverIndex() === idx ? '2px dashed var(--color-primary)' : page.selected ? '2px solid var(--color-info)' : '1px solid var(--color-border-default)'">
                  
                  <!-- Top Bar: Selection Checkbox & Drag Handle -->
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 2px;">
                    <label style="display: flex; align-items: center; gap: 4px; font-size: 0.75rem; cursor: pointer; color: var(--color-text-secondary);">
                      <input
                        type="checkbox"
                        [checked]="page.selected"
                        (change)="toggleSelectPage(idx)" />
                      <span>Select</span>
                    </label>

                    <span style="font-size: 0.8125rem; color: var(--color-text-muted); cursor: grab;" title="Drag to reorder">
                      ⋮⋮
                    </span>
                  </div>

                  <!-- Page Thumbnail Box -->
                  <div
                    style="width: 100%; height: 160px; background: var(--color-bg-subtle); border-radius: var(--radius-sm); border: 1px solid var(--color-border-default); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden;"
                    [style.transform]="'rotate(' + page.rotation + 'deg)'">
                    @if (page.thumbnailUrl) {
                      <img
                        [src]="page.thumbnailUrl"
                        alt="Page {{ page.displayPageNumber }}"
                        style="max-width: 100%; max-height: 100%; object-fit: contain; pointer-events: none;" />
                    } @else {
                      <span style="font-size: 2rem;">📄</span>
                      <span style="font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); margin-top: 4px;">
                        Page {{ page.displayPageNumber }}
                      </span>
                    }

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
            PrivKnife uses <strong>pdf-lib</strong> and <strong>PDF.js</strong> to render, assemble, rotate, and reorganize your pages directly in your computer's RAM.
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
  readonly errorMessage = signal<string | null>(null);

  // Drag and drop state
  readonly draggedIndex = signal<number | null>(null);
  readonly dragOverIndex = signal<number | null>(null);

  readonly selectedCount = computed(() => this.pages().filter((p) => p.selected).length);

  private activeBlobUrls: string[] = [];

  async onFilesDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    this.isProcessing.set(true);
    this.errorMessage.set(null);

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

      if (newDocs.length === 0) {
        this.errorMessage.set('No valid PDF files selected. Please provide .pdf files.');
        return;
      }

      this.loadedDocuments.update((docs) => [...docs, ...newDocs]);
      this.pages.update((pgs) => [...pgs, ...newPages]);

      // Generate thumbnails asynchronously with PDF.js in the background
      for (const doc of newDocs) {
        for (const page of doc.pages) {
          renderPageThumbnail(doc.buffer, page.pageIndex)
            .then((thumbUrl) => {
              if (thumbUrl) {
                this.pages.update((pgs) =>
                  pgs.map((p) => (p.id === page.id ? { ...p, thumbnailUrl: thumbUrl } : p))
                );
              }
            })
            .catch(() => {});
        }
      }
    } catch (err: any) {
      this.errorMessage.set(
        'Error reading PDF: ' + (err?.message || 'File may be password-protected or corrupt.')
      );
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

  toggleSelectPage(index: number): void {
    const current = [...this.pages()];
    if (index >= 0 && index < current.length) {
      current[index] = { ...current[index], selected: !current[index].selected };
      this.pages.set(current);
    }
  }

  selectAll(): void {
    this.pages.update((pgs) => pgs.map((p) => ({ ...p, selected: true })));
  }

  deselectAll(): void {
    this.pages.update((pgs) => pgs.map((p) => ({ ...p, selected: false })));
  }

  deleteSelected(): void {
    this.pages.update((pgs) => pgs.filter((p) => !p.selected));
  }

  rotateSelected(): void {
    this.pages.update((pgs) =>
      pgs.map((p) => (p.selected ? rotatePage(p) : p))
    );
  }

  sortByFile(): void {
    const current = [...this.pages()];
    current.sort((a, b) => {
      if (a.documentName === b.documentName) {
        return a.pageIndex - b.pageIndex;
      }
      return a.documentName.localeCompare(b.documentName);
    });
    this.pages.set(current);
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

  onDragStart(index: number, event: DragEvent): void {
    this.draggedIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onDragOver(index: number, event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.dragOverIndex() !== index) {
      this.dragOverIndex.set(index);
    }
  }

  onDrop(targetIndex: number, event: DragEvent): void {
    event.preventDefault();
    const sourceIndex = this.draggedIndex();
    this.draggedIndex.set(null);
    this.dragOverIndex.set(null);

    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const current = [...this.pages()];
    const [removed] = current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, removed);
    this.pages.set(current);
  }

  onDragEnd(): void {
    this.draggedIndex.set(null);
    this.dragOverIndex.set(null);
  }

  clearAll(): void {
    this.pages.set([]);
    this.loadedDocuments.set([]);
    this.errorMessage.set(null);
    this.cleanBlobUrls();
  }

  async mergeAndDownload(): Promise<void> {
    const allPages = this.pages();
    if (allPages.length === 0) return;

    const targetPages = this.selectedCount() > 0
      ? allPages.filter((p) => p.selected)
      : allPages;

    this.isProcessing.set(true);
    try {
      const sourceMap = new Map<string, ArrayBuffer>();
      for (const doc of this.loadedDocuments()) {
        sourceMap.set(doc.id, doc.buffer);
      }

      const mergedBytes = await assemblePdf(targetPages, sourceMap);
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
    } catch (err: any) {
      this.errorMessage.set('Failed to merge PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      this.isProcessing.set(false);
    }
  }

  async splitAndDownloadZip(): Promise<void> {
    const allPages = this.pages();
    if (allPages.length === 0) return;

    const targetPages = this.selectedCount() > 0
      ? allPages.filter((p) => p.selected)
      : allPages;

    this.isProcessing.set(true);
    try {
      const sourceMap = new Map<string, ArrayBuffer>();
      for (const doc of this.loadedDocuments()) {
        sourceMap.set(doc.id, doc.buffer);
      }

      const splitResults = await splitPdfIntoSinglePages(targetPages, sourceMap);
      const zipBlob = await createSplitZip(splitResults);

      const url = URL.createObjectURL(zipBlob);
      this.activeBlobUrls.push(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `split-pages-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      const idx = this.activeBlobUrls.indexOf(url);
      if (idx !== -1) {
        this.activeBlobUrls.splice(idx, 1);
      }
    } catch (err: any) {
      this.errorMessage.set('Failed to split PDF: ' + (err?.message || 'Unknown error'));
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

