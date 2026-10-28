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
  VideoCompressorWorkerRequest,
  VideoCompressorWorkerResponse,
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
  templateUrl: './video-compressor-resizer.component.html',
  styleUrl: './video-compressor-resizer.component.scss',
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
  private worker: Worker | null = null;

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
      default: {
        const w = this.sourceWidth() || 1920;
        const h = this.sourceHeight() || 1080;
        return `${w} / ${h}`;
      }
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
    this.terminateWorker();
    this.revokeUrls();
  }

  formatSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
    height = 1080,
    explicitSizeBytes?: number
  ): void {
    this.revokeUrls();
    this.cachedVideoBlob.set(blob);
    this.originalFileName.set(fileName);
    this.videoDurationSec.set(duration);
    this.sourceWidth.set(width);
    this.sourceHeight.set(height);
    this.sourceSizeBytes.set(explicitSizeBytes || blob.size || 45 * 1024 * 1024);
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
      1080,
      45 * 1024 * 1024
    );
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    // Immediately set basic file metadata so component signals update synchronously
    this.loadSampleVideo(file, file.name, 30, 1920, 1080, file.size);

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      try {
        const tempUrl = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
          if (video.duration) {
            this.videoDurationSec.set(Math.max(1, Math.round(video.duration)));
          }
          if (video.videoWidth) {
            this.sourceWidth.set(video.videoWidth);
          }
          if (video.videoHeight) {
            this.sourceHeight.set(video.videoHeight);
          }
          URL.revokeObjectURL(tempUrl);
        };

        video.onerror = () => {
          URL.revokeObjectURL(tempUrl);
        };

        video.src = tempUrl;
      } catch {
        // Ignored in test environment
      }
    }
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

    try {
      if (typeof Worker !== 'undefined') {
        const res = await new Promise<VideoCompressorResizerResult>((resolve) => {
          this.terminateWorker();
          this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
          this.worker.onmessage = (e: MessageEvent<VideoCompressorWorkerResponse>) => {
            resolve(e.data.result);
          };
          this.worker.onerror = async () => {
            const fallback = await processVideoCompressor(options);
            resolve(fallback);
          };
          this.worker.postMessage({ id: 1, options } satisfies VideoCompressorWorkerRequest);
        });
        this.handleResult(res);
      } else {
        const res = await processVideoCompressor(options);
        this.handleResult(res);
      }
    } catch (err: unknown) {
      this.isProcessing.set(false);
      this.errorMessage.set(err instanceof Error ? err.message : String(err));
    }
  }

  private handleResult(res: VideoCompressorResizerResult): void {
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
    this.terminateWorker();
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

  private terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
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
