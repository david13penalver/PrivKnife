import {
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Card, Dropzone, ProgressBar } from '../../../components';

import {
  ConvertedImageItem,
  HeicAvifBatchStats,
  HeicAvifConverterOptions,
  OutputFormat,
} from './types';
import { DEFAULT_CONVERTER_OPTIONS } from './test-fixtures';
import {
  calculateBatchStats,
  convertSingleImage,
  packageBatchAsZip,
  processBatch,
} from './engine';

@Component({
  selector: 'app-heic-avif-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone, ProgressBar],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">HEIC & AVIF to JPG/PNG Batch Converter</h1>
          <p class="c-header__subtitle">
            Convert Apple HEIC/HEIF photos and modern AVIF files into universal JPEG, PNG, or WebP formats locally in browser memory. Up to 100 images in parallel with zero server uploads.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <!-- Main Layout Columns -->
      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__column">
          <!-- File Dropzone Card -->
          <app-card title="1. Select or Drop Images" class="g--margin-bottom-4">
            <app-dropzone
              title="Drop HEIC, HEIF, or AVIF files here"
              subtitle="or click to browse from iPhone, camera roll, or device (up to 100 files)"
              accept=".heic,.heif,.avif,.webp,.png,.jpg,.jpeg,image/*"
              [multiple]="true"
              [maxSizeMb]="100"
              (filesSelected)="handleFilesSelected($event)"
            />

            <div class="quick-hints g--margin-top-3">
              <span class="g--text-muted text-xs">
                💡 <em>Supports Apple Live Photos, burst shots, high-efficiency iPhone HEIC, and web-standard AVIF.</em>
              </span>
            </div>
          </app-card>

          <!-- Conversion Parameters Card -->
          <app-card title="2. Output Settings" class="g--margin-bottom-4">
            <!-- Format Selector -->
            <div class="c-form-group g--margin-bottom-3">
              <label class="c-form-label">Target Format</label>
              <div class="format-pills">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="outputFormat() === 'jpeg'"
                  [class.c-button--outline]="outputFormat() !== 'jpeg'"
                  (click)="setOutputFormat('jpeg')"
                >
                  JPG (Universal)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="outputFormat() === 'png'"
                  [class.c-button--outline]="outputFormat() !== 'png'"
                  (click)="setOutputFormat('png')"
                >
                  PNG (Lossless)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="outputFormat() === 'webp'"
                  [class.c-button--outline]="outputFormat() !== 'webp'"
                  (click)="setOutputFormat('webp')"
                >
                  WebP (Ultra Compact)
                </button>
              </div>
            </div>

            <!-- Quality Slider (JPEG / WebP) -->
            @if (outputFormat() !== 'png') {
              <div class="c-form-group g--margin-bottom-3">
                <div class="l-extremo">
                  <label class="c-form-label">Compression Quality</label>
                  <span class="c-form-value">{{ Math.round(jpegQuality() * 100) }}%</span>
                </div>
                <input
                  type="range"
                  class="c-range"
                  [min]="0.2"
                  [max]="1.0"
                  [step]="0.02"
                  [ngModel]="jpegQuality()"
                  (ngModelChange)="setJpegQuality($event)"
                />
              </div>
            }

            <!-- Max Dimension Downscaling -->
            <div class="c-form-group g--margin-bottom-3">
              <label class="c-form-label">Resolution / Downscale Limit</label>
              <div class="dim-pills">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="maxDimensionPx() === 0"
                  [class.c-button--outline]="maxDimensionPx() !== 0"
                  (click)="setMaxDimensionPx(0)"
                >
                  Original Size
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="maxDimensionPx() === 3840"
                  [class.c-button--outline]="maxDimensionPx() !== 3840"
                  (click)="setMaxDimensionPx(3840)"
                >
                  4K (3840px)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="maxDimensionPx() === 1920"
                  [class.c-button--outline]="maxDimensionPx() !== 1920"
                  (click)="setMaxDimensionPx(1920)"
                >
                  1080p (1920px)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="maxDimensionPx() === 1280"
                  [class.c-button--outline]="maxDimensionPx() !== 1280"
                  (click)="setMaxDimensionPx(1280)"
                >
                  720p (1280px)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="maxDimensionPx() === 800"
                  [class.c-button--outline]="maxDimensionPx() !== 800"
                  (click)="setMaxDimensionPx(800)"
                >
                  Web (800px)
                </button>
              </div>
            </div>

            <!-- Filename Suffix -->
            <div class="c-form-group g--margin-bottom-3">
              <label class="c-form-label">Filename Suffix (Optional)</label>
              <input
                type="text"
                class="c-input"
                placeholder="e.g. -converted or _web"
                [ngModel]="filenameSuffix()"
                (ngModelChange)="setFilenameSuffix($event)"
              />
            </div>

            <!-- Options & Reset -->
            <div class="l-extremo g--align-center">
              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="packageAsZip()"
                  (change)="setPackageAsZip(!packageAsZip())"
                />
                Always package download as single .ZIP
              </label>

              <button
                type="button"
                class="c-button c-button--small c-button--outline"
                (click)="resetToDefaults()"
              >
                Reset Defaults
              </button>
            </div>
          </app-card>
        </div>

        <!-- Queue & Deliverables Column -->
        <div class="l-columns__column">
          <!-- Queue Summary Card -->
          <app-card title="Batch Queue & Statistics" class="g--margin-bottom-4">
            <div class="stats-grid g--margin-bottom-3">
              <div class="stat-card">
                <span class="stat-label">Files Queued</span>
                <span class="stat-value">{{ batchStats().totalFiles }}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Completed</span>
                <span class="stat-value text-success">{{ batchStats().completedFiles }} / {{ batchStats().totalFiles }}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Original Total</span>
                <span class="stat-value">{{ formatFileSize(batchStats().totalOriginalSize) }}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Converted Total</span>
                <span class="stat-value">{{ formatFileSize(batchStats().totalConvertedSize) }}</span>
              </div>
            </div>

            @if (isConverting()) {
              <div class="progress-wrap g--margin-bottom-3">
                <app-progress-bar [value]="conversionProgress()" label="Converting batch..." />
              </div>
            }

            @if (conversionError()) {
              <div class="c-alert c-alert--danger g--margin-bottom-3">
                {{ conversionError() }}
              </div>
            }

            <!-- Action buttons -->
            <div class="queue-actions l-extremo g--margin-bottom-3">
              <div class="l-extremo__left">
                <button
                  type="button"
                  class="c-button c-button--primary"
                  [disabled]="imageQueue().length === 0 || isConverting()"
                  (click)="startBatchConversion()"
                >
                  Convert All ({{ imageQueue().length }})
                </button>
              </div>

              <div class="l-extremo__right action-button-group">
                @if (hasConvertedFiles()) {
                  <button
                    type="button"
                    class="c-button c-button--secondary"
                    [disabled]="isConverting()"
                    (click)="downloadAll()"
                  >
                    Download All ({{ batchStats().completedFiles }})
                  </button>
                }

                <button
                  type="button"
                  class="c-button c-button--outline"
                  [disabled]="imageQueue().length === 0 || isConverting()"
                  (click)="clearQueue()"
                >
                  Clear Queue
                </button>
              </div>
            </div>

            <!-- Image Queue Table/List -->
            @if (imageQueue().length > 0) {
              <div class="queue-list-container">
                <div class="queue-list">
                  @for (item of imageQueue(); track item.id) {
                    <div class="queue-item">
                      <div class="item-info">
                        <span class="item-name" [title]="item.originalName">{{ item.originalName }}</span>
                        <span class="item-meta">
                          {{ formatFileSize(item.originalSize) }}
                          @if (item.convertedSize) {
                            &rarr; <strong>{{ formatFileSize(item.convertedSize) }}</strong>
                          }
                        </span>
                      </div>

                      <div class="item-status">
                        @if (item.status === 'pending') {
                          <span class="c-badge c-badge--neutral">Ready</span>
                        } @else if (item.status === 'processing') {
                          <span class="c-badge c-badge--info">Converting...</span>
                        } @else if (item.status === 'done') {
                          <span class="c-badge c-badge--success">Done</span>
                        } @else {
                          <span class="c-badge c-badge--danger" [title]="item.errorMessage || 'Failed'">Error</span>
                        }
                      </div>

                      <div class="item-actions">
                        @if (item.status === 'done' && item.convertedBlob) {
                          <button
                            type="button"
                            class="c-button c-button--small c-button--primary"
                            (click)="downloadSingleItem(item)"
                            title="Download this file"
                          >
                            ⬇️
                          </button>
                        }
                        <button
                          type="button"
                          class="c-button c-button--small c-button--outline"
                          (click)="removeQueueItem(item.id)"
                          title="Remove from queue"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="empty-state g--text-center g--margin-top-4 g--margin-bottom-4">
                <span class="empty-icon">🖼️</span>
                <p class="g--text-muted">No images queued. Drop HEIC or AVIF photos on the left to begin.</p>
              </div>
            }
          </app-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .format-pills,
      .dim-pills,
      .action-button-group {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
      .stat-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 0.75rem;
      }
      .stat-label {
        display: block;
        font-size: 0.75rem;
        color: #64748b;
        margin-bottom: 0.25rem;
      }
      .stat-value {
        font-size: 1.125rem;
        font-weight: 700;
        color: #1e293b;
      }
      .text-success {
        color: #16a34a;
      }
      .text-xs {
        font-size: 0.75rem;
      }
      .queue-list-container {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
      }
      .queue-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.6rem 0.75rem;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.85rem;
      }
      .queue-item:last-child {
        border-bottom: none;
      }
      .item-info {
        flex: 1;
        min-width: 0;
        margin-right: 0.75rem;
      }
      .item-name {
        display: block;
        font-weight: 500;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item-meta {
        font-size: 0.75rem;
        color: #64748b;
      }
      .item-status {
        margin-right: 0.75rem;
      }
      .item-actions {
        display: flex;
        gap: 0.35rem;
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
export class HeicAvifConverterComponent implements OnDestroy {
  readonly Math = Math;

  // Configuration Signals
  readonly outputFormat = signal<OutputFormat>('jpeg');
  readonly jpegQuality = signal<number>(0.92);
  readonly stripMetadata = signal<boolean>(true);
  readonly maxDimensionPx = signal<number>(0);
  readonly filenameSuffix = signal<string>('');
  readonly packageAsZip = signal<boolean>(false);

  // Queue & State Signals
  readonly imageQueue = signal<ConvertedImageItem[]>([]);
  readonly isConverting = signal<boolean>(false);
  readonly conversionProgress = signal<number>(0);
  readonly conversionError = signal<string | null>(null);

  private createdObjectUrls: string[] = [];

  readonly currentOptions = computed<HeicAvifConverterOptions>(() => ({
    outputFormat: this.outputFormat(),
    jpegQuality: this.jpegQuality(),
    stripMetadata: this.stripMetadata(),
    maxDimensionPx: this.maxDimensionPx(),
    filenameSuffix: this.filenameSuffix(),
    packageAsZip: this.packageAsZip(),
  }));

  readonly batchStats = computed<HeicAvifBatchStats>(() =>
    calculateBatchStats(this.imageQueue())
  );

  readonly hasConvertedFiles = computed<boolean>(() =>
    this.imageQueue().some((i) => i.status === 'done' && i.convertedBlob)
  );

  ngOnDestroy(): void {
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls = [];
  }

  setOutputFormat(format: OutputFormat): void {
    this.outputFormat.set(format);
  }

  setJpegQuality(quality: number): void {
    this.jpegQuality.set(Math.min(1.0, Math.max(0.1, quality)));
  }

  setMaxDimensionPx(px: number): void {
    this.maxDimensionPx.set(Math.max(0, px));
  }

  setFilenameSuffix(suffix: string): void {
    this.filenameSuffix.set(suffix);
  }

  setPackageAsZip(zip: boolean): void {
    this.packageAsZip.set(zip);
  }

  resetToDefaults(): void {
    this.outputFormat.set(DEFAULT_CONVERTER_OPTIONS.outputFormat);
    this.jpegQuality.set(DEFAULT_CONVERTER_OPTIONS.jpegQuality);
    this.stripMetadata.set(DEFAULT_CONVERTER_OPTIONS.stripMetadata);
    this.maxDimensionPx.set(DEFAULT_CONVERTER_OPTIONS.maxDimensionPx);
    this.filenameSuffix.set(DEFAULT_CONVERTER_OPTIONS.filenameSuffix);
    this.packageAsZip.set(DEFAULT_CONVERTER_OPTIONS.packageAsZip);
  }

  handleFilesSelected(files: File[]): void {
    if (!files || files.length === 0) return;

    const newItems: ConvertedImageItem[] = files.map((file, idx) => ({
      id: `file-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      originalFile: file,
      originalName: file.name,
      originalSize: file.size,
      originalMimeType: file.type || 'image/heic',
      status: 'pending',
    }));

    this.imageQueue.update((q) => [...q, ...newItems]);
  }

  removeQueueItem(id: string): void {
    this.imageQueue.update((q) => q.filter((i) => i.id !== id));
  }

  clearQueue(): void {
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls = [];
    this.imageQueue.set([]);
    this.conversionProgress.set(0);
    this.conversionError.set(null);
  }

  async startBatchConversion(): Promise<void> {
    const queue = this.imageQueue();
    if (queue.length === 0) return;

    this.isConverting.set(true);
    this.conversionError.set(null);
    this.conversionProgress.set(0);

    const options = this.currentOptions();

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'done') continue;

      // Update status to processing
      this.updateItemInQueue(item.id, { status: 'processing' });

      try {
        const converted = await convertSingleImage(item.originalFile, options, item.id);
        this.updateItemInQueue(item.id, converted);
      } catch (err: any) {
        this.updateItemInQueue(item.id, {
          status: 'error',
          errorMessage: err?.message || 'Conversion failed',
        });
      }

      this.conversionProgress.set(Math.round(((i + 1) / queue.length) * 100));
    }

    this.isConverting.set(false);
  }

  private updateItemInQueue(id: string, partial: Partial<ConvertedImageItem>): void {
    this.imageQueue.update((q) =>
      q.map((i) => (i.id === id ? { ...i, ...partial } : i))
    );
  }

  downloadSingleItem(item: ConvertedImageItem): void {
    if (!item.convertedBlob || !item.convertedName) return;
    this.triggerDownload(item.convertedBlob, item.convertedName);
  }

  async downloadAll(): Promise<void> {
    const doneItems = this.imageQueue().filter(
      (i) => i.status === 'done' && i.convertedBlob
    );

    if (doneItems.length === 0) return;

    if (doneItems.length === 1 && !this.packageAsZip()) {
      this.downloadSingleItem(doneItems[0]);
      return;
    }

    try {
      const zipBlob = await packageBatchAsZip(doneItems);
      const timeStamp = new Date().toISOString().slice(0, 10);
      const fileName = `converted-photos-${this.outputFormat()}-${timeStamp}.zip`;
      this.triggerDownload(zipBlob, fileName);
    } catch (err: any) {
      this.conversionError.set(err?.message || 'Failed to create zip archive');
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

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i] || 'B'}`;
  }
}
