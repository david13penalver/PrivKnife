import { TranslatePipe } from '../../../core/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import { SplitPreview } from '../../../components/split-preview/split-preview';
import {
  calculateBatchStats,
  createBatchZip,
  formatBytes,
  processBatchImages,
} from './engine';
import { DEFAULT_COMPRESSION_OPTIONS } from './test-fixtures';
import {
  BatchCompressionStats,
  CompressionOptions,
  ImageQueueItem,
  OutputFormat,
  ResizePreset,
} from './types';

@Component({
  selector: 'app-batch-compressor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone, FormsModule, SplitPreview, TranslatePipe],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1300px; padding: 0 16px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 8px;">{{ 'tools.batchCompressor.name' | translate }}</h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 800px; margin: 0 auto;">
          {{ 'tools.batchCompressor.description' | translate }}
        </p>
      </div>

      <!-- Top Leaderboard Ad Slot (728x90) -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center print-hidden">
        <div
          class="ad-slot ad-slot--leaderboard"
          style="max-width: 728px; height: 90px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
          <span>Responsive Ad Placement (728x90 Top Leaderboard)</span>
        </div>
      </div>

      <!-- Main Ingestion & Controls Section -->
      <div class="g--margin-bottom-6">
        <app-card title="1. Select or Drop Images">
          <app-dropzone
            accept="image/*"
            [multiple]="true"
            title="Drop images here to compress (PNG, JPG, WebP, GIF, SVG)"
            subtitle="Batch process dozens of photos instantly in your browser"
            (filesSelected)="onFilesSelected($event)" />
        </app-card>
      </div>

      <!-- Global Compression Settings Bar -->
      <div class="g--margin-bottom-6">
        <app-card title="2. Compression &amp; Format Settings">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; align-items: start;">
            
            <!-- Output Format -->
            <div>
              <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                Target Format
              </label>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="options().format === 'webp'"
                  [class.c-button--outline]="options().format !== 'webp'"
                  (click)="setFormat('webp')">
                  WebP (Recommended)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="options().format === 'jpeg'"
                  [class.c-button--outline]="options().format !== 'jpeg'"
                  (click)="setFormat('jpeg')">
                  JPEG
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="options().format === 'png'"
                  [class.c-button--outline]="options().format !== 'png'"
                  (click)="setFormat('png')">
                  PNG
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="options().format === 'original'"
                  [class.c-button--outline]="options().format !== 'original'"
                  (click)="setFormat('original')">
                  Keep Original
                </button>
              </div>
            </div>

            <!-- Quality Slider -->
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                  Compression Quality
                </label>
                <span style="font-size: 0.8125rem; font-weight: 700; color: var(--color-primary);">
                  {{ options().quality }}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                [value]="options().quality"
                (input)="setQuality(+$any($event.target).value)"
                style="width: 100%; accent-color: var(--color-primary);" />
              <div style="display: flex; justify-content: space-between; font-size: 0.6875rem; color: var(--color-text-muted);">
                <span>Smaller Size (High Compression)</span>
                <span>Best Visual Quality</span>
              </div>
            </div>

            <!-- Max Dimension Resize Preset -->
            <div>
              <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                Resize Maximum Dimension
              </label>
              <select
                class="c-input"
                [value]="options().resizePreset"
                (change)="setResizePreset($any($event.target).value)"
                style="width: 100%; font-size: 0.875rem;">
                <option value="none">Original Resolution (No downscaling)</option>
                <option value="3840">4K Ultra HD (Max 3840px)</option>
                <option value="1920">Full HD (Max 1920px - Web standard)</option>
                <option value="1280">HD (Max 1280px)</option>
                <option value="800">Web Compact (Max 800px)</option>
              </select>
            </div>
          </div>

          <!-- Actions Row -->
          <div style="margin-top: 20px; display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <div style="display: flex; gap: 10px;">
              <app-button
                variant="primary"
                size="normal"
                [loading]="isProcessing()"
                [disabled]="queue().length === 0 || isProcessing()"
                (clicked)="compressAll()">
                ⚡ Compress All ({{ queue().length }} Images)
              </app-button>
              @if (queue().length > 0) {
                <app-button
                  variant="outline"
                  size="normal"
                  [disabled]="isProcessing()"
                  (clicked)="clearAll()">
                  Clear Queue
                </app-button>
              }
            </div>

            @if (hasFinishedItems()) {
              <app-button
                variant="secondary"
                size="normal"
                [loading]="isZipping()"
                (clicked)="downloadAllZip()">
                📦 Download All as ZIP (.zip)
              </app-button>
            }
          </div>
        </app-card>
      </div>

      <!-- Batch Summary Banner (if files processed) -->
      @if (stats().processedFiles > 0) {
        <div
          class="g--margin-bottom-6"
          style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-md); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <span style="font-size: 1.125rem; font-weight: 700; color: #065f46;">
              🎉 Saved {{ formatBytes(stats().totalSavedBytes) }} ({{ stats().totalSavingsPercent }}% reduction)!
            </span>
            <p style="margin: 4px 0 0 0; font-size: 0.8125rem; color: #047857;">
              Original: {{ formatBytes(stats().totalOriginalBytes) }} &rarr; Compressed: {{ formatBytes(stats().totalCompressedBytes) }} across {{ stats().processedFiles }} files.
            </p>
          </div>
          <app-button
            variant="primary"
            size="normal"
            [loading]="isZipping()"
            (clicked)="downloadAllZip()">
            Download ZIP
          </app-button>
        </div>
      }

      <!-- Interactive Queue List -->
      @if (queue().length > 0) {
        <div class="g--margin-bottom-6">
          <app-card [title]="'Image Queue (' + queue().length + ' items)'">
            <div style="display: flex; flex-direction: column; gap: 10px;">
              @for (item of queue(); track item.id) {
                <div
                  style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--color-bg-subtle, #f8fafc); border: 1px solid var(--color-border-subtle, #e2e8f0); border-radius: var(--radius-sm); gap: 14px; flex-wrap: wrap;">
                  
                  <!-- Left: Thumbnail & Name -->
                  <div style="display: flex; align-items: center; gap: 12px; min-width: 220px; flex: 1;">
                    <img
                      [src]="item.compressedPreviewUrl || item.originalPreviewUrl"
                      alt="Thumbnail"
                      style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; background: #cbd5e1;" />
                    <div style="overflow: hidden;">
                      <div style="font-weight: 600; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">
                        {{ item.name }}
                      </div>
                      <div style="font-size: 0.75rem; color: var(--color-text-muted);">
                        Original: {{ formatBytes(item.originalSize) }}
                      </div>
                    </div>
                  </div>

                  <!-- Middle: Status & Reduction -->
                  <div style="display: flex; align-items: center; gap: 12px;">
                    @if (item.status === 'done') {
                      <div style="text-align: right;">
                        <span style="font-weight: 700; font-size: 0.875rem; color: #059669;">
                          {{ formatBytes(item.compressedSize || 0) }}
                        </span>
                        <span
                          style="background: #d1fae5; color: #065f46; font-size: 0.6875rem; font-weight: 700; border-radius: 4px; padding: 2px 6px; margin-left: 6px;">
                          -{{ item.savingsPercent || 0 }}%
                        </span>
                      </div>
                    } @else if (item.status === 'processing') {
                      <span style="font-size: 0.8125rem; color: var(--color-primary); font-weight: 600;">
                        Processing...
                      </span>
                    } @else if (item.status === 'error') {
                      <span style="font-size: 0.8125rem; color: #dc2626; font-weight: 600;">
                        Error
                      </span>
                    } @else {
                      <span style="font-size: 0.8125rem; color: var(--color-text-muted);">
                        Queued
                      </span>
                    }
                  </div>

                  <!-- Right: Actions -->
                  <div style="display: flex; gap: 6px; align-items: center;">
                    @if (item.status === 'done') {
                      <button
                        type="button"
                        class="c-button c-button--outline c-button--small"
                        (click)="selectPreviewItem(item.id)">
                        👁️ Compare
                      </button>
                      <button
                        type="button"
                        class="c-button c-button--primary c-button--small"
                        (click)="downloadSingleItem(item)">
                        📥 Save
                      </button>
                    }
                    <button
                      type="button"
                      class="c-button c-button--ghost c-button--small"
                      title="Remove from queue"
                      (click)="removeItem(item.id)">
                      ✕
                    </button>
                  </div>
                </div>
              }
            </div>
          </app-card>
        </div>
      }

      <!-- Before / After Split Preview Modal -->
      @if (selectedPreviewItem()) {
        <div
          class="modal-backdrop"
          style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
          <div
            class="modal-card"
            style="background: #ffffff; border-radius: var(--radius-lg, 12px); max-width: 820px; width: 100%; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700;">
                  Before vs. After Comparison
                </h3>
                <p style="margin: 0; font-size: 0.8125rem; color: var(--color-text-muted);">
                  {{ selectedPreviewItem()?.name }} &bull; Saved {{ selectedPreviewItem()?.savingsPercent }}%
                </p>
              </div>
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="closeSplitPreview()">
                ✕ Close
              </button>
            </div>

            <!-- Split Preview Canvas -->
            <div style="margin-bottom: 16px; border-radius: 8px; overflow: hidden; background: #0f172a;">
              <app-split-preview
                [beforeLabel]="'Original (' + formatBytes(selectedPreviewItem()?.originalSize || 0) + ')'"
                [afterLabel]="'Compressed (' + formatBytes(selectedPreviewItem()?.compressedSize || 0) + ')'">
                
                <img
                  before
                  [src]="selectedPreviewItem()?.originalPreviewUrl"
                  alt="Original Image"
                  style="max-height: 480px; width: 100%; object-fit: contain;" />
                
                <img
                  after
                  [src]="selectedPreviewItem()?.compressedPreviewUrl || selectedPreviewItem()?.originalPreviewUrl"
                  alt="Compressed Image"
                  style="max-height: 480px; width: 100%; object-fit: contain;" />
              </app-split-preview>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px;">
              <app-button
                variant="primary"
                (click)="downloadSingleItem(selectedPreviewItem()!)">
                📥 Download Compressed File
              </app-button>
            </div>
          </div>
        </div>
      }

      <!-- Bottom / Sidebar Ad Slot (300x250) -->
      <div class="g--margin-bottom-6 g--text-center">
        <div
          class="ad-slot ad-slot--sidebar"
          style="width: 300px; height: 250px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
          <span>Responsive Ad Placement (300x250 Medium Rectangle)</span>
        </div>
      </div>
    </div>

    <!-- Post-Download Confirmation Modal -->
    @if (showDownloadModal()) {
      <div
        class="modal-backdrop"
        style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;">
        <div
          class="modal-card"
          style="background: #ffffff; border-radius: var(--radius-lg, 12px); max-width: 480px; width: 100%; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
          
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="font-size: 2rem;">📦</div>
            <div>
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700;">ZIP Archive Downloaded!</h3>
              <p style="margin: 0; font-size: 0.875rem; color: var(--color-text-muted);">
                All {{ stats().processedFiles }} optimized images were packed in-browser.
              </p>
            </div>
          </div>

          <!-- Modal Ad Slot -->
          <div
            class="ad-slot ad-slot--modal"
            style="width: 100%; height: 120px; background: var(--color-bg-subtle, #f8fafc); border: 1px dashed var(--color-border-subtle, #cbd5e1); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--color-text-muted, #94a3b8); font-size: 0.75rem; margin-bottom: 16px;">
            <span>Responsive Ad Placement</span>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <app-button variant="primary" (clicked)="closeDownloadModal()">
              Done
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class BatchCompressorComponent implements OnDestroy {
  readonly queue = signal<ImageQueueItem[]>([]);
  readonly options = signal<CompressionOptions>({ ...DEFAULT_COMPRESSION_OPTIONS });
  readonly isProcessing = signal<boolean>(false);
  readonly isZipping = signal<boolean>(false);
  readonly selectedPreviewItem = signal<ImageQueueItem | null>(null);
  readonly showDownloadModal = signal<boolean>(false);

  // Track active object URLs for strict memory disposal
  private activeObjectUrls: string[] = [];

  readonly stats = computed<BatchCompressionStats>(() =>
    calculateBatchStats(this.queue())
  );

  readonly hasFinishedItems = computed<boolean>(() =>
    this.queue().some((i) => i.status === 'done')
  );

  readonly formatBytes = formatBytes;

  ngOnDestroy(): void {
    this.revokeAllActiveUrls();
  }

  onFilesSelected(files: File[]): void {
    if (!files || files.length === 0) return;

    const newItems: ImageQueueItem[] = files.map((file) => {
      const url = URL.createObjectURL(file);
      this.activeObjectUrls.push(url);

      return {
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        originalSize: file.size,
        originalWidth: 0,
        originalHeight: 0,
        originalMimeType: file.type,
        originalPreviewUrl: url,
        status: 'queued',
        progress: 0,
      };
    });

    this.queue.update((current) => [...current, ...newItems]);
  }

  setFormat(format: OutputFormat): void {
    this.options.update((o) => ({ ...o, format }));
  }

  setQuality(quality: number): void {
    this.options.update((o) => ({ ...o, quality }));
  }

  setResizePreset(preset: ResizePreset): void {
    this.options.update((o) => ({ ...o, resizePreset: preset }));
  }

  async compressAll(): Promise<void> {
    if (this.queue().length === 0 || this.isProcessing()) return;

    this.isProcessing.set(true);
    try {
      const updated = await processBatchImages(
        this.queue(),
        this.options(),
        (processed, total, currentItem) => {
          if (currentItem.compressedBlob) {
            const url = URL.createObjectURL(currentItem.compressedBlob);
            this.activeObjectUrls.push(url);
            currentItem.compressedPreviewUrl = url;
          }
          this.queue.update((items) =>
            items.map((it) => (it.id === currentItem.id ? { ...currentItem } : it))
          );
        }
      );

      this.queue.set(updated);
    } finally {
      this.isProcessing.set(false);
    }
  }

  selectPreviewItem(id: string): void {
    const found = this.queue().find((i) => i.id === id);
    if (found) {
      this.selectedPreviewItem.set(found);
    }
  }

  closeSplitPreview(): void {
    this.selectedPreviewItem.set(null);
  }

  downloadSingleItem(item: ImageQueueItem): void {
    if (!item.compressedBlob) return;

    const url = URL.createObjectURL(item.compressedBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = item.compressedFileName || `compressed-${item.name}`;
    anchor.click();

    // Memory hygiene
    URL.revokeObjectURL(url);
  }

  async downloadAllZip(): Promise<void> {
    const doneItems = this.queue().filter((i) => i.status === 'done' && i.compressedBlob);
    if (doneItems.length === 0) return;

    this.isZipping.set(true);
    try {
      const zipEntries = doneItems.map((i) => ({
        name: i.compressedFileName || i.name,
        blob: i.compressedBlob!,
      }));

      const zipBlob = await createBatchZip(zipEntries);
      const url = URL.createObjectURL(zipBlob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'images-compressed.zip';
      anchor.click();

      // Memory hygiene
      URL.revokeObjectURL(url);

      this.showDownloadModal.set(true);
    } finally {
      this.isZipping.set(false);
    }
  }

  closeDownloadModal(): void {
    this.showDownloadModal.set(false);
  }

  removeItem(id: string): void {
    const item = this.queue().find((i) => i.id === id);
    if (item) {
      if (item.originalPreviewUrl) {
        URL.revokeObjectURL(item.originalPreviewUrl);
        this.activeObjectUrls = this.activeObjectUrls.filter((u) => u !== item.originalPreviewUrl);
      }
      if (item.compressedPreviewUrl) {
        URL.revokeObjectURL(item.compressedPreviewUrl);
        this.activeObjectUrls = this.activeObjectUrls.filter((u) => u !== item.compressedPreviewUrl);
      }
    }

    this.queue.update((items) => items.filter((i) => i.id !== id));
  }

  clearAll(): void {
    this.revokeAllActiveUrls();
    this.queue.set([]);
    this.selectedPreviewItem.set(null);
  }

  private revokeAllActiveUrls(): void {
    for (const url of this.activeObjectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
    this.activeObjectUrls = [];
  }
}
