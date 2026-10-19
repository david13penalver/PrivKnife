import {
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CompressionPreset,
  MaxResolutionPreset,
  SocialAspectRatio,
  VideoCompressionPlan,
  VideoCompressorResizerOptions,
  VideoCompressorResizerResult,
  VideoOutputFormat,
} from './types';
import {
  generateCompressionPlan,
  processVideoCompressor,
  resolveTargetSizeMb,
} from './engine';
import { SYNTHETIC_VIDEO_BLOB } from './test-fixtures';

@Component({
  selector: 'app-video-compressor-resizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Client-Side Video Compressor & Social Resizer</h1>
          <p class="c-header__subtitle">
            Compress large MP4/MOV videos to fit Discord (8MB/25MB/50MB), WhatsApp, and email limits with intelligent bitrate budgeting and instant social cropping (TikTok 9:16, Instagram 1:1, 4:5) 100% locally in your browser.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Compression & Resize Parameters</h2>
          </div>
          <div class="c-card__body">
            <!-- Dropzone -->
            <div class="c-dropzone g--margin-bottom-4">
              <input
                type="file"
                id="videoFileInput"
                class="c-dropzone__input"
                accept="video/*,.mp4,.webm,.mov,.mkv"
                (change)="onFileSelected($event)"
              />
              <label for="videoFileInput" class="c-dropzone__label">
                <span class="c-dropzone__icon">🎬</span>
                <span class="c-dropzone__text">
                  {{ originalFileName() || 'Drop video file here or click to browse' }}
                </span>
                <span class="c-dropzone__hint">
                  Supports MP4, WebM, MOV &bull; Zero Server Uploads
                </span>
              </label>
            </div>

            <div class="g--margin-bottom-4">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="loadDemoVideo()"
              >
                Load Sample Video Clip
              </button>
            </div>

            <!-- Target Size Preset -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label" for="compressionPresetSelect">Target Size Constraint</label>
              <select
                id="compressionPresetSelect"
                class="c-input c-input--select"
                [ngModel]="compressionPreset()"
                (ngModelChange)="updatePreset($event)"
              >
                <option value="target_size_8mb">Discord Free (8 MB Limit)</option>
                <option value="target_size_25mb">Discord Nitro / WhatsApp (25 MB)</option>
                <option value="target_size_50mb">Email / Slack Attachment (50 MB)</option>
                <option value="custom_mb">Custom Target Size (MB)</option>
              </select>

              @if (compressionPreset() === 'custom_mb') {
                <div class="g--margin-top-2">
                  <label class="c-input__sublabel" for="customSizeInput">Custom Target Size (MB)</label>
                  <input
                    id="customSizeInput"
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    class="c-input c-input--number"
                    [ngModel]="customTargetSizeMb()"
                    (ngModelChange)="updateCustomTargetSize($event)"
                  />
                </div>
              }
            </div>

            <!-- Social Media Aspect Ratio Crop -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label" for="aspectRatioSelect">Social Aspect Ratio & Crop</label>
              <select
                id="aspectRatioSelect"
                class="c-input c-input--select"
                [ngModel]="aspectRatio()"
                (ngModelChange)="updateAspectRatio($event)"
              >
                <option value="original">Original Aspect Ratio (Preserve Source)</option>
                <option value="9:16_vertical">9:16 Vertical (TikTok, Reels, Shorts)</option>
                <option value="1:1_square">1:1 Square (Instagram Feed Post)</option>
                <option value="4:5_portrait">4:5 Portrait (Instagram Portrait Post)</option>
                <option value="16:9_landscape">16:9 Landscape (YouTube Standard)</option>
              </select>
            </div>

            <!-- Maximum Resolution -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label" for="maxResolutionSelect">Maximum Resolution</label>
              <select
                id="maxResolutionSelect"
                class="c-input c-input--select"
                [ngModel]="maxResolution()"
                (ngModelChange)="updateResolution($event)"
              >
                <option value="1080p">1080p Full HD (Sharper, higher bitrate needed)</option>
                <option value="720p">720p HD (Recommended balance)</option>
                <option value="480p">480p SD (Compact, great for small file targets)</option>
                <option value="360p">360p Low (Ultra compact for tiny byte budgets)</option>
              </select>
            </div>

            <!-- Audio Track Muting -->
            <div class="g--margin-bottom-4">
              <label class="c-input__checkbox-label">
                <input
                  type="checkbox"
                  [checked]="audioMute()"
                  (change)="toggleAudioMute($any($event.target).checked)"
                />
                <span>Mute Audio Track (Saves 96 kbps budget for extra video quality)</span>
              </label>
            </div>

            <!-- Output Container Format -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label" for="outputFormatSelect">Output Format</label>
              <select
                id="outputFormatSelect"
                class="c-input c-input--select"
                [ngModel]="outputFormat()"
                (ngModelChange)="updateFormat($event)"
              >
                <option value="mp4">MP4 (Universal mobile & web compatibility)</option>
                <option value="webm">WebM (Open web standard, VP9 compression)</option>
              </select>
            </div>
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="resetToDefaults()"
                [disabled]="isProcessing()"
              >
                Reset
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                (click)="compressVideo()"
                [disabled]="isProcessing() || !hasVideoData()"
              >
                {{ isProcessing() ? 'Compressing Video...' : 'Compress & Resize Video' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Preview & Output Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Bitrate Budget & Preview</h2>
          </div>
          <div class="c-card__body">
            <!-- Compression Plan Diagnostics -->
            <div class="c-preview g--margin-bottom-4">
              <div class="c-preview__plan-grid">
                <div class="c-preview__plan-item">
                  <span class="c-preview__stat-label">Target Size:</span>
                  <span class="c-preview__stat-value">{{ targetSizeFormatted() }}</span>
                </div>
                <div class="c-preview__plan-item">
                  <span class="c-preview__stat-label">Target Video Bitrate:</span>
                  <span class="c-preview__stat-value">
                    {{ (compressionPlan().videoBitrateBps / 1000).toFixed(0) }} kbps
                  </span>
                </div>
                <div class="c-preview__plan-item">
                  <span class="c-preview__stat-label">Output Dimensions:</span>
                  <span class="c-preview__stat-value">
                    {{ compressionPlan().targetWidth }} x {{ compressionPlan().targetHeight }}
                  </span>
                </div>
                <div class="c-preview__plan-item">
                  <span class="c-preview__stat-label">Audio Track:</span>
                  <span class="c-preview__stat-value">
                    {{ audioMute() ? 'Muted (0 kbps)' : 'Stereo (96 kbps)' }}
                  </span>
                </div>
              </div>

              <!-- Visual Aspect Ratio Silhouette -->
              <div class="c-preview__aspect-box-wrapper g--margin-top-3">
                <div
                  class="c-preview__aspect-box"
                  [style.aspect-ratio]="aspectRatioStyle()"
                >
                  <span class="c-preview__aspect-tag">{{ aspectRatioLabel() }}</span>
                </div>
              </div>
            </div>

            <!-- Video Player Preview -->
            @if (videoPreviewUrl()) {
              <div class="c-preview__player g--margin-bottom-4">
                <label class="c-input__label g--margin-bottom-2">Video Preview</label>
                <video
                  controls
                  class="c-preview__video-element"
                  [src]="videoPreviewUrl()"
                ></video>
              </div>
            }

            <!-- Compression Results Details -->
            @if (result()?.metadata; as meta) {
              <div class="c-preview__stats g--margin-bottom-4">
                <div class="c-preview__stat-row">
                  <span class="c-preview__stat-label">Delivered Size:</span>
                  <span class="c-preview__stat-value">
                    {{ (meta.compressedSizeBytes / (1024 * 1024)).toFixed(2) }} MB
                  </span>
                </div>
                <div class="c-preview__stat-row">
                  <span class="c-preview__stat-label">Original Size:</span>
                  <span class="c-preview__stat-value">
                    {{ (meta.originalSizeBytes / (1024 * 1024)).toFixed(2) }} MB
                  </span>
                </div>
                <div class="c-preview__stat-row">
                  <span class="c-preview__stat-label">Space Savings:</span>
                  <span class="c-preview__stat-value c-badge--success">
                    {{ Math.max(0, Math.round((1 - meta.compressionRatio) * 100)) }}% Reduced
                  </span>
                </div>
                <div class="c-preview__stat-row">
                  <span class="c-preview__stat-label">Dimensions:</span>
                  <span class="c-preview__stat-value">{{ meta.dimensions }} ({{ meta.aspectRatio }})</span>
                </div>
              </div>
            }

            @if (errorMessage()) {
              <div class="c-alert c-alert--danger g--margin-bottom-4">
                {{ errorMessage() }}
              </div>
            }
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="!downloadUrl()"
                (click)="downloadResult()"
              >
                Download {{ result()?.fileName || 'Compressed Video' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .c-dropzone {
        border: 2px dashed var(--color-border, #cbd5e1);
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        background-color: var(--color-surface-subtle, #f8fafc);
        cursor: pointer;
        transition: border-color 0.2s ease;
      }
      .c-dropzone__input {
        display: none;
      }
      .c-dropzone__label {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      }
      .c-dropzone__icon {
        font-size: 2rem;
        margin-bottom: 8px;
      }
      .c-dropzone__text {
        font-weight: 600;
        color: var(--color-text, #1e293b);
      }
      .c-dropzone__hint {
        font-size: 0.8rem;
        color: var(--color-text-muted, #64748b);
        margin-top: 4px;
      }
      .c-preview__plan-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        background-color: #0f172a;
        padding: 16px;
        border-radius: 8px;
        color: #f8fafc;
      }
      .c-preview__plan-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .c-preview__aspect-box-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #020617;
        padding: 20px;
        border-radius: 8px;
        min-height: 140px;
      }
      .c-preview__aspect-box {
        max-height: 120px;
        max-width: 160px;
        border: 2px solid #38bdf8;
        background-color: rgba(56, 189, 248, 0.15);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .c-preview__aspect-tag {
        font-size: 0.75rem;
        font-weight: 600;
        color: #38bdf8;
        padding: 2px 6px;
      }
      .c-preview__video-element {
        width: 100%;
        max-height: 240px;
        border-radius: 6px;
        background-color: #000;
      }
      .c-preview__stat-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 0.875rem;
        border-bottom: 1px solid var(--color-border-subtle, #e2e8f0);
      }
      .c-preview__stat-label {
        color: var(--color-text-muted, #64748b);
      }
      .c-preview__stat-value {
        font-weight: 600;
      }
      .c-input__sublabel {
        font-size: 0.75rem;
        color: var(--color-text-muted, #64748b);
        display: block;
        margin-bottom: 2px;
      }
      .c-input__checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
        cursor: pointer;
      }
    `,
  ],
})
export class VideoCompressorResizerComponent implements OnDestroy {
  readonly Math = Math;

  // State Signals
  originalFileName = signal<string>('');
  videoDurationSec = signal<number>(30);
  sourceWidth = signal<number>(1920);
  sourceHeight = signal<number>(1080);
  sourceSizeBytes = signal<number>(45 * 1024 * 1024);

  compressionPreset = signal<CompressionPreset>('target_size_8mb');
  customTargetSizeMb = signal<number>(15);
  aspectRatio = signal<SocialAspectRatio>('original');
  maxResolution = signal<MaxResolutionPreset>('720p');
  audioMute = signal<boolean>(false);
  outputFormat = signal<VideoOutputFormat>('mp4');

  isProcessing = signal<boolean>(false);
  result = signal<VideoCompressorResizerResult | null>(null);
  downloadUrl = signal<string | null>(null);
  videoPreviewUrl = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  private cachedVideoBlob = signal<Blob | null>(null);

  // Computed signals
  hasVideoData = computed(() => this.cachedVideoBlob() !== null);

  targetSizeFormatted = computed(() => {
    const mb = resolveTargetSizeMb({
      compressionPreset: this.compressionPreset(),
      customTargetSizeMb: this.customTargetSizeMb(),
      aspectRatio: this.aspectRatio(),
      maxResolution: this.maxResolution(),
      audioMute: this.audioMute(),
      outputFormat: this.outputFormat(),
    });
    return `${mb} MB`;
  });

  compressionPlan = computed<VideoCompressionPlan>(() => {
    const opts: VideoCompressorResizerOptions = {
      compressionPreset: this.compressionPreset(),
      customTargetSizeMb: this.customTargetSizeMb(),
      aspectRatio: this.aspectRatio(),
      maxResolution: this.maxResolution(),
      audioMute: this.audioMute(),
      outputFormat: this.outputFormat(),
      durationSec: this.videoDurationSec(),
      sourceWidth: this.sourceWidth(),
      sourceHeight: this.sourceHeight(),
    };
    return generateCompressionPlan(opts);
  });

  aspectRatioStyle = computed<string>(() => {
    switch (this.aspectRatio()) {
      case '9:16_vertical':
        return '9 / 16';
      case '1:1_square':
        return '1 / 1';
      case '4:5_portrait':
        return '4 / 5';
      case '16:9_landscape':
        return '16 / 9';
      case 'original':
      default:
        return `${this.sourceWidth()} / ${this.sourceHeight()}`;
    }
  });

  aspectRatioLabel = computed<string>(() => {
    switch (this.aspectRatio()) {
      case '9:16_vertical':
        return '9:16 Vertical';
      case '1:1_square':
        return '1:1 Square';
      case '4:5_portrait':
        return '4:5 Portrait';
      case '16:9_landscape':
        return '16:9 Landscape';
      case 'original':
      default:
        return 'Original Ratio';
    }
  });

  ngOnDestroy(): void {
    this.revokeUrls();
  }

  updatePreset(preset: CompressionPreset): void {
    this.compressionPreset.set(preset);
  }

  updateCustomTargetSize(size: number): void {
    this.customTargetSizeMb.set(Math.max(1, Number(size) || 1));
  }

  updateAspectRatio(ratio: SocialAspectRatio): void {
    this.aspectRatio.set(ratio);
  }

  updateResolution(res: MaxResolutionPreset): void {
    this.maxResolution.set(res);
  }

  toggleAudioMute(val: boolean): void {
    this.audioMute.set(Boolean(val));
  }

  updateFormat(fmt: VideoOutputFormat): void {
    this.outputFormat.set(fmt);
  }

  loadSampleVideo(
    blob: Blob,
    fileName = 'sample_video.mp4',
    duration = 30,
    width = 1920,
    height = 1080
  ): void {
    this.revokeUrls();
    this.cachedVideoBlob.set(blob);
    this.originalFileName.set(fileName);
    this.videoDurationSec.set(duration);
    this.sourceWidth.set(width);
    this.sourceHeight.set(height);
    this.sourceSizeBytes.set(blob.size || 50 * 1024 * 1024);
    this.videoPreviewUrl.set(URL.createObjectURL(blob));
    this.result.set(null);
    this.errorMessage.set(null);
  }

  loadDemoVideo(): void {
    this.loadSampleVideo(
      SYNTHETIC_VIDEO_BLOB,
      'privknife_gaming_highlight.mp4',
      30,
      1920,
      1080
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    // Read metadata via HTML5 video element
    const tempUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      this.loadSampleVideo(
        file,
        file.name,
        Math.max(1, Math.round(video.duration || 30)),
        video.videoWidth || 1920,
        video.videoHeight || 1080
      );
      URL.revokeObjectURL(tempUrl);
    };

    video.onerror = () => {
      // Fallback
      this.loadSampleVideo(file, file.name, 30, 1920, 1080);
      URL.revokeObjectURL(tempUrl);
    };

    video.src = tempUrl;
  }

  async compressVideo(): Promise<void> {
    const blob = this.cachedVideoBlob();
    if (!blob) {
      this.errorMessage.set('Please select or load a video file first.');
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    const options: VideoCompressorResizerOptions = {
      compressionPreset: this.compressionPreset(),
      customTargetSizeMb: this.customTargetSizeMb(),
      aspectRatio: this.aspectRatio(),
      maxResolution: this.maxResolution(),
      audioMute: this.audioMute(),
      outputFormat: this.outputFormat(),
      originalFileName: this.originalFileName(),
      originalSizeBytes: this.sourceSizeBytes(),
      durationSec: this.videoDurationSec(),
      sourceWidth: this.sourceWidth(),
      sourceHeight: this.sourceHeight(),
      videoBlob: blob,
    };

    const res = await processVideoCompressor(options);
    this.isProcessing.set(false);

    if (res.success) {
      if (this.downloadUrl()) {
        URL.revokeObjectURL(this.downloadUrl()!);
      }
      this.result.set(res);
      this.downloadUrl.set(URL.createObjectURL(res.blob));
    } else {
      this.errorMessage.set(res.error || 'Failed to compress video');
    }
  }

  downloadResult(): void {
    const res = this.result();
    const url = this.downloadUrl();
    if (!res || !url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = res.fileName;
    a.click();
  }

  resetToDefaults(): void {
    this.revokeUrls();
    this.result.set(null);
    this.errorMessage.set(null);
    this.compressionPreset.set('target_size_8mb');
    this.customTargetSizeMb.set(15);
    this.aspectRatio.set('original');
    this.maxResolution.set('720p');
    this.audioMute.set(false);
    this.outputFormat.set('mp4');
    this.originalFileName.set('');
    this.cachedVideoBlob.set(null);
    this.videoDurationSec.set(30);
    this.sourceWidth.set(1920);
    this.sourceHeight.set(1080);
  }

  private revokeUrls(): void {
    if (this.downloadUrl()) {
      URL.revokeObjectURL(this.downloadUrl()!);
      this.downloadUrl.set(null);
    }
    if (this.videoPreviewUrl()) {
      URL.revokeObjectURL(this.videoPreviewUrl()!);
      this.videoPreviewUrl.set(null);
    }
  }
}
