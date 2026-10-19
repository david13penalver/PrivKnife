import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BlurRegion,
  CensorMode,
  ExportImageFormat,
  FacePlateBlurOptions,
  FacePlateBlurResult,
  SelectionMode,
} from './types';
import { processPrivacyBlur } from './engine';

@Component({
  selector: 'app-face-plate-blur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <header class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Face & License Plate Privacy Blur Tool</h1>
          <p class="c-header__subtitle">
            Permanently pixelate or blackout faces, street signs, and vehicle license plates before publishing.
            Irreversible canvas censoring with 100% EXIF/GPS metadata stripping.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </header>

      <!-- Main Layout -->
      <div class="l-columns l-columns--2">
        <!-- Configuration Controls Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Censor Controls & Options</h2>
          </div>

          <div class="c-card__body">
            <!-- Upload Dropzone -->
            <div
              class="c-dropzone g--margin-bottom-4"
              (dragover)="$event.preventDefault()"
              (drop)="onFileDrop($event)"
              (click)="fileInput.click()"
            >
              <input
                #fileInput
                type="file"
                class="c-dropzone__input"
                accept="image/jpeg,image/png,image/webp"
                (change)="onFileInputChange($event)"
              />
              <div class="c-dropzone__content">
                <span class="c-dropzone__icon">📷</span>
                <p class="c-dropzone__text">
                  @if (originalImage()) {
                    Selected: <strong>{{ originalImage()?.name }}</strong> ({{ formatBytes(originalImage()?.size || 0) }})
                  } @else {
                    Drop photo here or <strong>browse</strong>
                  }
                </p>
                <span class="c-dropzone__hint">Supports JPG, PNG, WebP</span>
              </div>
            </div>

            <!-- Censor Mode Selector -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Censoring Style</label>
              <div class="c-button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="censorMode() === 'mosaic_pixelate'"
                  [class.c-button--outline]="censorMode() !== 'mosaic_pixelate'"
                  (click)="setCensorMode('mosaic_pixelate')"
                >
                  Mosaic Pixelate
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="censorMode() === 'blackout_box'"
                  [class.c-button--outline]="censorMode() !== 'blackout_box'"
                  (click)="setCensorMode('blackout_box')"
                >
                  Blackout Box
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="censorMode() === 'gaussian_blur'"
                  [class.c-button--outline]="censorMode() !== 'gaussian_blur'"
                  (click)="setCensorMode('gaussian_blur')"
                >
                  Soft Blur
                </button>
              </div>
            </div>

            <!-- Mosaic Block Size (conditional) -->
            @if (censorMode() === 'mosaic_pixelate') {
              <div class="c-input g--margin-bottom-4">
                <label class="c-input__label">
                  Mosaic Block Size: <strong>{{ mosaicBlockSize() }}px</strong>
                </label>
                <input
                  type="range"
                  class="c-input__range"
                  min="4"
                  max="50"
                  step="2"
                  [ngModel]="mosaicBlockSize()"
                  (ngModelChange)="setMosaicBlockSize($event)"
                />
              </div>
            }

            <!-- Blur Radius (conditional) -->
            @if (censorMode() === 'gaussian_blur') {
              <div class="c-input g--margin-bottom-4">
                <label class="c-input__label">
                  Blur Strength: <strong>{{ blurRadiusPx() }}px</strong>
                </label>
                <input
                  type="range"
                  class="c-input__range"
                  min="2"
                  max="30"
                  step="1"
                  [ngModel]="blurRadiusPx()"
                  (ngModelChange)="setBlurRadius($event)"
                />
              </div>
            }

            <!-- Quick Add Preset Censor Boxes -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Censor Targets ({{ regions().length }})</label>
              <div class="l-extremo g--margin-bottom-2">
                <div class="l-extremo__area-izquierda">
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small"
                    (click)="addPresetRegion('face')"
                  >
                    + Add Face Box
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small g--margin-left-2"
                    (click)="addPresetRegion('plate')"
                  >
                    + Add License Plate Box
                  </button>
                </div>
                <div class="l-extremo__area-derecha">
                  @if (regions().length > 0) {
                    <button
                      type="button"
                      class="c-button c-button--danger c-button--small"
                      (click)="clearAllRegions()"
                    >
                      Clear All
                    </button>
                  }
                </div>
              </div>

              <!-- List of active regions -->
              @if (regions().length > 0) {
                <div class="c-region-list">
                  @for (r of regions(); track r.id; let i = $index) {
                    <div class="c-region-item l-extremo">
                      <div class="l-extremo__area-izquierda">
                        <span class="c-region-item__badge">#{{ i + 1 }}</span>
                        <span class="c-region-item__mode">{{ r.mode }}</span>
                        <small class="c-region-item__coords">({{ r.width }}x{{ r.height }} at {{ r.x }},{{ r.y }})</small>
                      </div>
                      <div class="l-extremo__area-derecha">
                        <button
                          type="button"
                          class="c-button c-button--outline c-button--small"
                          (click)="removeRegion(r.id)"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Export Format & Quality -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Export Format</label>
              <div class="c-button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'jpeg'"
                  [class.c-button--outline]="exportFormat() !== 'jpeg'"
                  (click)="setExportFormat('jpeg')"
                >
                  JPEG (Stripped EXIF)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'png'"
                  [class.c-button--outline]="exportFormat() !== 'png'"
                  (click)="setExportFormat('png')"
                >
                  PNG (Lossless)
                </button>
              </div>
            </div>

            <!-- Privacy Guarantee Badge -->
            <div class="c-privacy-notice g--margin-bottom-4">
              <span>🔒 <strong>Zero Server Upload:</strong> All pixelation and metadata stripping executes strictly on your local browser canvas.</span>
            </div>
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="resetToDefaults()"
              >
                Reset
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="isProcessing() || !originalImage()"
                (click)="processImage()"
              >
                {{ isProcessing() ? 'Processing...' : 'Apply Privacy Censors' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Preview & Deliverable Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Preview & Download</h2>
          </div>

          <div class="c-card__body">
            <div class="c-preview">
              @if (previewUrl()) {
                <div class="c-preview__container">
                  <img
                    [src]="previewUrl()"
                    alt="Sanitized Privacy Preview"
                    class="c-preview__image"
                  />
                </div>
              } @else if (originalImage()) {
                <div class="c-preview__container">
                  <img
                    [src]="originalImage()?.url"
                    alt="Original Photo"
                    class="c-preview__image"
                  />
                  <div class="c-preview__watermark">
                    Press 'Apply Privacy Censors' to preview sanitized output
                  </div>
                </div>
              } @else {
                <div class="c-preview__empty">
                  <span>No image selected</span>
                  <small>Upload an image or photo to configure privacy censors</small>
                </div>
              }
            </div>

            <!-- Result stats -->
            @if (lastResult()) {
              <div class="c-result-meta g--margin-top-4">
                <div class="c-badge c-badge--success">
                  ✓ Ready for download ({{ formatBytes(lastResult()?.fileSize || 0) }})
                </div>
                <p class="g--margin-top-2 g--text-small">
                  Censored Regions: <strong>{{ lastResult()?.metadata?.regionsCensored || 0 }}</strong> |
                  Dimensions: <strong>{{ lastResult()?.metadata?.width }} x {{ lastResult()?.metadata?.height }}</strong> |
                  EXIF: <strong>Stripped</strong>
                </p>
              </div>
            }
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="!lastResult()"
                (click)="downloadDeliverable()"
              >
                Download Sanitized Image
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .c-button-group {
      display: flex;
      gap: 0.5rem;
    }
    .c-region-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 180px;
      overflow-y: auto;
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.03);
      border-radius: 4px;
    }
    .c-region-item {
      align-items: center;
      padding: 0.25rem 0.5rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .c-region-item__badge {
      font-weight: 700;
      margin-right: 0.5rem;
    }
    .c-region-item__mode {
      text-transform: capitalize;
      margin-right: 0.5rem;
      font-size: 0.85rem;
    }
    .c-region-item__coords {
      color: #64748b;
      font-size: 0.75rem;
    }
    .c-privacy-notice {
      padding: 0.75rem;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 4px;
      font-size: 0.85rem;
      color: #065f46;
    }
    .c-preview__container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #0f172a;
      border-radius: 8px;
      overflow: hidden;
      min-height: 280px;
    }
    .c-preview__image {
      max-width: 100%;
      max-height: 480px;
      object-fit: contain;
    }
    .c-preview__watermark {
      position: absolute;
      bottom: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 4px 8px;
      font-size: 0.75rem;
      border-radius: 4px;
    }
    .c-preview__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      color: #94a3b8;
    }
    .g--text-small {
      font-size: 0.85rem;
      color: #64748b;
    }
  `],
})
export class FacePlateBlurComponent implements OnDestroy {
  // Signals for state
  readonly censorMode = signal<CensorMode>('mosaic_pixelate');
  readonly mosaicBlockSize = signal<number>(16);
  readonly blurRadiusPx = signal<number>(12);
  readonly selectionMode = signal<SelectionMode>('manual_rect');
  readonly brushRadiusPx = signal<number>(20);
  readonly exportQuality = signal<number>(0.92);
  readonly exportFormat = signal<ExportImageFormat>('jpeg');
  readonly stripExif = signal<boolean>(true);
  readonly regions = signal<BlurRegion[]>([]);
  readonly isProcessing = signal<boolean>(false);
  readonly previewUrl = signal<string | null>(null);
  readonly originalImage = signal<{
    file: File | Blob;
    name: string;
    url: string;
    size: number;
  } | null>(null);
  readonly lastResult = signal<FacePlateBlurResult | null>(null);

  private createdBlobUrls: string[] = [];

  ngOnDestroy(): void {
    this.cleanUpUrls();
  }

  setCensorMode(mode: CensorMode): void {
    this.censorMode.set(mode);
  }

  setMosaicBlockSize(size: number): void {
    const clamped = Math.max(2, Math.min(100, Number(size) || 16));
    this.mosaicBlockSize.set(clamped);
  }

  setBlurRadius(radius: number): void {
    const clamped = Math.max(1, Math.min(100, Number(radius) || 12));
    this.blurRadiusPx.set(clamped);
  }

  setExportFormat(format: ExportImageFormat): void {
    this.exportFormat.set(format);
  }

  addRegion(region: Omit<BlurRegion, 'id'> & { id?: string }): string {
    const id = region.id || 'reg-' + Math.random().toString(36).substring(2, 9);
    const newRegion: BlurRegion = {
      ...region,
      id,
      mode: region.mode || this.censorMode(),
      blockSize: region.blockSize || this.mosaicBlockSize(),
      blurRadius: region.blurRadius || this.blurRadiusPx(),
    };
    this.regions.update((list) => [...list, newRegion]);
    return id;
  }

  addPresetRegion(type: 'face' | 'plate'): void {
    if (type === 'face') {
      this.addRegion({
        x: 120,
        y: 80,
        width: 140,
        height: 160,
        mode: this.censorMode(),
      });
    } else {
      this.addRegion({
        x: 100,
        y: 250,
        width: 200,
        height: 70,
        mode: this.censorMode(),
      });
    }
  }

  removeRegion(id: string): void {
    this.regions.update((list) => list.filter((r) => r.id !== id));
  }

  clearAllRegions(): void {
    this.regions.set([]);
  }

  async handleFileSelected(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    this.createdBlobUrls.push(url);

    this.originalImage.set({
      file,
      name: file.name,
      url,
      size: file.size,
    });
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelected(input.files[0]);
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFileSelected(event.dataTransfer.files[0]);
    }
  }

  async processImage(): Promise<void> {
    const original = this.originalImage();
    if (!original) return;

    this.isProcessing.set(true);

    try {
      const options: FacePlateBlurOptions = {
        censorMode: this.censorMode(),
        mosaicBlockSize: this.mosaicBlockSize(),
        blurRadiusPx: this.blurRadiusPx(),
        selectionMode: this.selectionMode(),
        brushRadiusPx: this.brushRadiusPx(),
        exportQuality: this.exportQuality(),
        exportFormat: this.exportFormat(),
        stripExif: this.stripExif(),
        regions: this.regions(),
      };

      const result = await processPrivacyBlur(
        original.file,
        options,
        original.name
      );

      this.lastResult.set(result);

      const previewBlobUrl = URL.createObjectURL(result.blob);
      this.createdBlobUrls.push(previewBlobUrl);

      // If there was an earlier preview URL, revoke it
      const currentPreview = this.previewUrl();
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }

      this.previewUrl.set(previewBlobUrl);
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadDeliverable(): void {
    const result = this.lastResult();
    if (!result) return;

    const downloadUrl = URL.createObjectURL(result.blob);
    this.createdBlobUrls.push(downloadUrl);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 100);
  }

  resetToDefaults(): void {
    this.cleanUpUrls();
    this.censorMode.set('mosaic_pixelate');
    this.mosaicBlockSize.set(16);
    this.blurRadiusPx.set(12);
    this.selectionMode.set('manual_rect');
    this.brushRadiusPx.set(20);
    this.exportQuality.set(0.92);
    this.exportFormat.set('jpeg');
    this.stripExif.set(true);
    this.regions.set([]);
    this.previewUrl.set(null);
    this.originalImage.set(null);
    this.lastResult.set(null);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private cleanUpUrls(): void {
    for (const url of this.createdBlobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore errors
      }
    }
    this.createdBlobUrls = [];
  }
}
