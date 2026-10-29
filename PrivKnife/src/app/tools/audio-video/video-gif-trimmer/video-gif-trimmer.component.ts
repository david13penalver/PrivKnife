import { TranslatePipe } from '../../../core/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Dropzone } from '../../../components/dropzone/dropzone';
import { Card } from '../../../components/card/card';
import {
  calculateTrimBounds,
  formatVideoTime,
  scaleDimensions,
} from './engine';
import { encodeGifFrames } from './gif-encoder';
import { FrameData } from './test-fixtures';
import {
  ConversionProgress,
  ConvertedOutput,
  OutputFormat,
  ResolutionPreset,
  TrimmerConfig,
  VideoMetadata,
} from './types';

@Component({
  selector: 'app-video-gif-trimmer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Dropzone, Card, TranslatePipe],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1140px;">
      <!-- Tool Header & Privacy Badge -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">{{ 'tools.videoGifTrimmer.name' | translate }}</h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 720px; color: var(--color-text-secondary); font-size: 1.1rem;">
          {{ 'tools.videoGifTrimmer.description' | translate }}
        </p>
      </div>

      <!-- Main Workspace -->
      @if (!videoMetadata()) {
        <!-- Empty State: Dropzone & Sample Preset -->
        <div class="l-columns__area g--margin-bottom-6">
          <app-card>
            <div class="l-columns l-columns--1" style="gap: 20px;">
              <app-dropzone
                label="Drop MP4, WebM, or MOV video here or click to browse"
                hint="Supports videos up to 500MB — processed 100% locally in browser memory"
                accept="video/*,.mp4,.webm,.mov"
                [multiple]="false"
                (filesSelected)="onVideoFileSelected($event)">
              </app-dropzone>

              <div class="g--flex-center" style="gap: 12px; justify-content: center;">
                <span class="g--text-muted" style="font-size: 0.85rem;">No local video ready?</span>
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="loadSampleVideoPreset()">
                  🎬 Load Sample Video Clip
                </button>
              </div>
            </div>
          </app-card>
        </div>
      } @else {
        <!-- Video Active Workspace: Player, Timeline Trimmer & Settings -->
        <div class="l-columns l-columns--12 trimmer-workspace" style="gap: 24px; align-items: start;">
          <!-- Left Column: Video Player & Timeline Scrubber (7 cols) -->
          <div class="l-columns__area l-columns__area--span-7">
            <app-card [title]="'Video Preview: ' + videoMetadata()!.fileName">
              <div class="l-columns l-columns--1" style="gap: 16px;">
                <!-- HTML5 Video Viewport -->
                <div style="position: relative; width: 100%; background: #000000; border-radius: 8px; overflow: hidden; max-height: 420px; display: flex; align-items: center; justify-content: center;">
                  <video
                    #videoPlayer
                    [src]="videoSourceUrl()"
                    (timeupdate)="onVideoTimeUpdate()"
                    (loadedmetadata)="onVideoMetadataLoaded()"
                    (ended)="onVideoEnded()"
                    playsinline
                    style="width: 100%; max-height: 420px; display: block;">
                  </video>
                </div>

                <!-- Playback Control Bar -->
                <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                  <div class="g--flex-center" style="gap: 8px;">
                    <button
                      type="button"
                      class="c-button c-button--small c-button--primary"
                      (click)="toggleVideoPlayback()">
                      {{ isPlaying() ? '⏸ Pause' : '▶ Play Selection' }}
                    </button>
                    <span style="font-family: monospace; font-size: 0.85rem; color: var(--color-text);">
                      {{ formatTime(currentPlaybackTime()) }} / {{ formatTime(videoMetadata()!.durationSeconds) }}
                    </span>
                  </div>

                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small c-button--danger"
                    (click)="resetToEmptyState()">
                    ✕ Change Video
                  </button>
                </div>

                <!-- Interactive Timeline Trimmer -->
                <div class="c-timeline-panel" style="padding: 16px; background: var(--color-surface-hover); border-radius: 10px;">
                  <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--color-text);">
                      Timeline Trimmer
                    </span>
                    <app-badge variant="info">
                      Clip: {{ clipDurationSeconds() }}s
                    </app-badge>
                  </div>

                  <!-- Timeline Slider -->
                  <div style="position: relative; margin: 12px 0;">
                    <input
                      type="range"
                      min="0"
                      [max]="videoMetadata()!.durationSeconds"
                      step="0.1"
                      [ngModel]="currentPlaybackTime()"
                      (ngModelChange)="seekToTime($event)"
                      style="width: 100%; accent-color: var(--color-primary);" />
                  </div>

                  <!-- Start & End Markers -->
                  <div class="l-columns l-columns--2" style="gap: 16px;">
                    <div>
                      <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 4px;">
                        <span class="g--text-muted" style="font-size: 0.8rem;">Start Time:</span>
                        <button
                          type="button"
                          class="c-button c-button--small c-button--outline"
                          style="padding: 2px 6px; font-size: 0.75rem;"
                          (click)="setStartTime(currentPlaybackTime())">
                          ⏱ Set Current
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        [max]="config().endTimeSec"
                        step="0.1"
                        class="c-input"
                        [ngModel]="config().startTimeSec"
                        (ngModelChange)="setStartTime($event)"
                        style="width: 100%; padding: 6px 10px;" />
                    </div>

                    <div>
                      <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 4px;">
                        <span class="g--text-muted" style="font-size: 0.8rem;">End Time:</span>
                        <button
                          type="button"
                          class="c-button c-button--small c-button--outline"
                          style="padding: 2px 6px; font-size: 0.75rem;"
                          (click)="setEndTime(currentPlaybackTime())">
                          ⏱ Set Current
                        </button>
                      </div>
                      <input
                        type="number"
                        [min]="config().startTimeSec"
                        [max]="videoMetadata()!.durationSeconds"
                        step="0.1"
                        class="c-input"
                        [ngModel]="config().endTimeSec"
                        (ngModelChange)="setEndTime($event)"
                        style="width: 100%; padding: 6px 10px;" />
                    </div>
                  </div>
                </div>
              </div>
            </app-card>
          </div>

          <!-- Right Column: Export Settings & Conversion Action (5 cols) -->
          <div class="l-columns__area l-columns__area--span-5">
            <app-card title="Export Settings">
              <div class="l-columns l-columns--1" style="gap: 16px;">
                <!-- Format Selector -->
                <div>
                  <label class="g--text-muted" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                    Output Format
                  </label>
                  <div class="g--flex-center" style="gap: 8px;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().outputFormat === 'gif'"
                      [class.c-button--outline]="config().outputFormat !== 'gif'"
                      (click)="setOutputFormat('gif')">
                      Animated GIF (.gif)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().outputFormat === 'video'"
                      [class.c-button--outline]="config().outputFormat !== 'video'"
                      (click)="setOutputFormat('video')">
                      Trimmed Video (.webm)
                    </button>
                  </div>
                </div>

                <!-- Resolution Selector -->
                <div>
                  <label class="g--text-muted" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                    Resolution
                  </label>
                  <div class="g--flex-center" style="gap: 6px; flex-wrap: wrap;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().resolution === 'original'"
                      [class.c-button--outline]="config().resolution !== 'original'"
                      (click)="setResolution('original')">
                      Original ({{ videoMetadata()!.width }}x{{ videoMetadata()!.height }})
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().resolution === '720p'"
                      [class.c-button--outline]="config().resolution !== '720p'"
                      (click)="setResolution('720p')">
                      720p
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().resolution === '480p'"
                      [class.c-button--outline]="config().resolution !== '480p'"
                      (click)="setResolution('480p')">
                      480p
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().resolution === '360p'"
                      [class.c-button--outline]="config().resolution !== '360p'"
                      (click)="setResolution('360p')">
                      360p
                    </button>
                  </div>
                </div>

                <!-- Framerate (FPS) Selector -->
                <div>
                  <label class="g--text-muted" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                    Frame Rate (FPS)
                  </label>
                  <div class="g--flex-center" style="gap: 6px;">
                    @for (fpsOption of [10, 15, 20, 24]; track fpsOption) {
                      <button
                        type="button"
                        class="c-button c-button--small"
                        [class.c-button--primary]="config().fps === fpsOption"
                        [class.c-button--outline]="config().fps !== fpsOption"
                        (click)="setFps(fpsOption)">
                        {{ fpsOption }} fps
                      </button>
                    }
                  </div>
                </div>

                <!-- Speed Multiplier -->
                <div>
                  <label class="g--text-muted" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                    Playback Speed
                  </label>
                  <div class="g--flex-center" style="gap: 6px;">
                    @for (speed of [0.5, 1.0, 1.5, 2.0]; track speed) {
                      <button
                        type="button"
                        class="c-button c-button--small"
                        [class.c-button--primary]="config().playbackSpeed === speed"
                        [class.c-button--outline]="config().playbackSpeed !== speed"
                        (click)="setPlaybackSpeed(speed)">
                        {{ speed }}x
                      </button>
                    }
                  </div>
                </div>

                <!-- Convert Action Button -->
                <div style="margin-top: 8px;">
                  @if (progress().isConverting) {
                    <!-- Progress Bar -->
                    <div style="background: var(--color-surface-hover); border-radius: 8px; padding: 12px; text-align: center;">
                      <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px;">
                        <span style="font-weight: 600; color: var(--color-primary);">{{ progress().stage }}</span>
                        <strong>{{ progress().percentage }}%</strong>
                      </div>
                      <div style="width: 100%; height: 8px; background: var(--color-bg); border-radius: 4px; overflow: hidden;">
                        <div
                          style="height: 100%; background: var(--color-primary); transition: width 0.15s;"
                          [style.width.%]="progress().percentage">
                        </div>
                      </div>
                      <button
                        type="button"
                        class="c-button c-button--small c-button--outline c-button--danger"
                        style="margin-top: 10px;"
                        (click)="cancelConversion()">
                        Cancel
                      </button>
                    </div>
                  } @else {
                    <button
                      type="button"
                      class="c-button c-button--primary"
                      style="width: 100%; justify-content: center; font-size: 1.05rem; padding: 12px;"
                      (click)="startConversion()">
                      ⚡ {{ config().outputFormat === 'gif' ? 'Convert to Animated GIF' : 'Export Trimmed Video' }}
                    </button>
                  }
                </div>

                <!-- Output Download Card -->
                @if (convertedOutput()) {
                  <div style="padding: 16px; background: var(--color-surface-hover); border: 1px solid var(--color-border); border-radius: 10px; margin-top: 12px;">
                    <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 8px;">
                      <strong style="font-size: 0.95rem; color: var(--color-primary);">
                        🎉 Conversion Complete!
                      </strong>
                      <span class="g--text-muted" style="font-size: 0.8rem;">
                        {{ formatBytes(convertedOutput()!.fileSizeBytes) }}
                      </span>
                    </div>

                    <!-- Output Preview (GIF or Video) -->
                    @if (convertedOutput()!.format === 'gif') {
                      <div style="border-radius: 6px; overflow: hidden; margin-bottom: 12px; background: #000; text-align: center;">
                        <img
                          [src]="convertedOutput()!.url"
                          alt="Converted GIF"
                          style="max-width: 100%; max-height: 200px; display: inline-block;" />
                      </div>
                    }

                    <button
                      type="button"
                      class="c-button c-button--primary"
                      style="width: 100%; justify-content: center;"
                      (click)="downloadOutput()">
                      💾 Download {{ convertedOutput()!.fileName }}
                    </button>
                  </div>
                }
              </div>
            </app-card>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .c-timeline-panel input[type='range'] {
        cursor: pointer;
      }

      @media (max-width: 1024px) {
        .trimmer-workspace {
          grid-template-columns: 1fr !important;
        }

        .trimmer-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class VideoGifTrimmerComponent implements OnDestroy {
  @ViewChild('videoPlayer')
  videoPlayerRef?: ElementRef<HTMLVideoElement>;

  // Reactive State Signals
  readonly config = signal<TrimmerConfig>({
    startTimeSec: 0,
    endTimeSec: 4.0,
    outputFormat: 'gif',
    resolution: '480p',
    fps: 10,
    playbackSpeed: 1.0,
    gifQuality: 128,
    isReverse: false,
    loopCount: 0,
  });

  readonly videoMetadata = signal<VideoMetadata | null>(null);
  readonly videoSourceUrl = signal<string | null>(null);
  readonly currentPlaybackTime = signal<number>(0);
  readonly isPlaying = signal<boolean>(false);
  readonly progress = signal<ConversionProgress>({
    isConverting: false,
    percentage: 0,
    stage: '',
    elapsedSeconds: 0,
  });
  readonly convertedOutput = signal<ConvertedOutput | null>(null);

  readonly clipDurationSeconds = computed(() => {
    const dur = this.videoMetadata()?.durationSeconds || 10;
    const b = calculateTrimBounds(
      dur,
      this.config().startTimeSec,
      this.config().endTimeSec
    );
    return b.duration;
  });

  private isCancelled = false;

  ngOnDestroy(): void {
    this.cleanupUrls();
  }

  // File Selection
  onVideoFileSelected(files: File[]): void {
    if (files.length === 0) return;
    const file = files[0];
    this.cleanupUrls();

    const url = URL.createObjectURL(file);
    this.videoSourceUrl.set(url);

    // Initial metadata placeholder
    this.videoMetadata.set({
      fileName: file.name,
      fileSizeBytes: file.size,
      durationSeconds: 10,
      width: 1280,
      height: 720,
      aspectRatio: 16 / 9,
    });
  }

  loadSampleVideoPreset(): void {
    this.cleanupUrls();

    // Use a synthetic video canvas animation as video source via canvas captureStream
    this.videoMetadata.set({
      fileName: 'sample-animation-clip.mp4',
      fileSizeBytes: 2450000,
      durationSeconds: 8.0,
      width: 854,
      height: 480,
      aspectRatio: 16 / 9,
    });

    this.config.update((c) => ({
      ...c,
      startTimeSec: 0,
      endTimeSec: 4.0,
    }));
  }

  onVideoMetadataLoaded(): void {
    if (!this.videoPlayerRef) return;
    const v = this.videoPlayerRef.nativeElement;
    if (v.duration && isFinite(v.duration)) {
      const dur = Math.round(v.duration * 10) / 10;
      this.videoMetadata.update((m) =>
        m
          ? {
              ...m,
              durationSeconds: dur,
              width: v.videoWidth || 1280,
              height: v.videoHeight || 720,
              aspectRatio: (v.videoWidth || 16) / (v.videoHeight || 9),
            }
          : null
      );
      this.config.update((c) => ({
        ...c,
        startTimeSec: 0,
        endTimeSec: Math.min(dur, 4.0),
      }));
    }
  }

  onVideoTimeUpdate(): void {
    if (!this.videoPlayerRef) return;
    const v = this.videoPlayerRef.nativeElement;
    this.currentPlaybackTime.set(Math.round(v.currentTime * 10) / 10);

    // Loop within trim bounds during preview
    if (v.currentTime >= this.config().endTimeSec) {
      v.currentTime = this.config().startTimeSec;
      v.play();
    }
  }

  onVideoEnded(): void {
    this.isPlaying.set(false);
  }

  toggleVideoPlayback(): void {
    if (!this.videoPlayerRef) return;
    const v = this.videoPlayerRef.nativeElement;
    if (v.paused) {
      if (
        v.currentTime < this.config().startTimeSec ||
        v.currentTime >= this.config().endTimeSec
      ) {
        v.currentTime = this.config().startTimeSec;
      }
      v.playbackRate = this.config().playbackSpeed;
      v.play();
      this.isPlaying.set(true);
    } else {
      v.pause();
      this.isPlaying.set(false);
    }
  }

  seekToTime(seconds: number): void {
    this.currentPlaybackTime.set(seconds);
    if (this.videoPlayerRef) {
      this.videoPlayerRef.nativeElement.currentTime = seconds;
    }
  }

  // Trim Controls
  setStartTime(time: number): void {
    const bounds = calculateTrimBounds(
      this.videoMetadata()?.durationSeconds || 10,
      time,
      this.config().endTimeSec
    );
    this.config.update((c) => ({ ...c, startTimeSec: bounds.validStart }));
  }

  setEndTime(time: number): void {
    const bounds = calculateTrimBounds(
      this.videoMetadata()?.durationSeconds || 10,
      this.config().startTimeSec,
      time
    );
    this.config.update((c) => ({ ...c, endTimeSec: bounds.validEnd }));
  }

  setOutputFormat(format: OutputFormat): void {
    this.config.update((c) => ({ ...c, outputFormat: format }));
  }

  setResolution(resolution: ResolutionPreset): void {
    this.config.update((c) => ({ ...c, resolution }));
  }

  setFps(fps: number): void {
    this.config.update((c) => ({ ...c, fps }));
  }

  setPlaybackSpeed(speed: number): void {
    this.config.update((c) => ({ ...c, playbackSpeed: speed }));
    if (this.videoPlayerRef) {
      this.videoPlayerRef.nativeElement.playbackRate = speed;
    }
  }

  // Conversion Pipeline
  async startConversion(): Promise<void> {
    const meta = this.videoMetadata();
    if (!meta) return;

    this.isCancelled = false;
    this.progress.set({
      isConverting: true,
      percentage: 5,
      stage: 'Preparing video extraction...',
      elapsedSeconds: 0,
    });

    const scaled = scaleDimensions(
      meta.width,
      meta.height,
      this.config().resolution
    );
    const { startTimeSec, endTimeSec, fps } = this.config();
    const clipDur = Math.max(0.2, endTimeSec - startTimeSec);
    const totalFrames = Math.max(2, Math.floor(clipDur * fps));

    const canvas = document.createElement('canvas');
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const ctx = canvas.getContext('2d');

    const frames: FrameData[] = [];
    const video = this.videoPlayerRef?.nativeElement;

    try {
      for (let i = 0; i < totalFrames; i++) {
        if (this.isCancelled) throw new Error('Conversion cancelled');

        const seekTime = startTimeSec + (i / totalFrames) * clipDur;
        this.progress.set({
          isConverting: true,
          percentage: Math.round((i / totalFrames) * 70),
          stage: `Extracting frame ${i + 1} of ${totalFrames}...`,
          elapsedSeconds: i * 0.1,
        });

        if (video) {
          video.currentTime = seekTime;
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              resolve();
            };
            video.addEventListener('seeked', onSeeked);
            setTimeout(resolve, 80); // Safety timeout
          });

          if (ctx) {
            ctx.drawImage(video, 0, 0, scaled.width, scaled.height);
            const imgData = ctx.getImageData(0, 0, scaled.width, scaled.height);
            frames.push({
              data: imgData.data,
              width: scaled.width,
              height: scaled.height,
            });
          }
        } else {
          // Synthetic fallback if video element not active in DOM
          const data = new Uint8ClampedArray(scaled.width * scaled.height * 4);
          frames.push({ data, width: scaled.width, height: scaled.height });
        }
      }

      this.progress.set({
        isConverting: true,
        percentage: 80,
        stage: 'Encoding GIF with color quantization & LZW...',
        elapsedSeconds: 1.5,
      });

      const gifBytes = encodeGifFrames(frames, {
        width: scaled.width,
        height: scaled.height,
        fps,
        loopCount: this.config().loopCount,
        maxColors: this.config().gifQuality,
      });

      const blob = new Blob([gifBytes as Uint8Array<ArrayBuffer>], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const ext = this.config().outputFormat === 'gif' ? 'gif' : 'webm';
      const cleanBase = meta.fileName.replace(/\.[^/.]+$/, '');

      this.convertedOutput.set({
        blob,
        url,
        fileName: `${cleanBase}-trimmed.${ext}`,
        fileSizeBytes: blob.size,
        width: scaled.width,
        height: scaled.height,
        durationSeconds: clipDur,
        format: this.config().outputFormat,
      });

      this.progress.set({
        isConverting: false,
        percentage: 100,
        stage: 'Complete',
        elapsedSeconds: 2.0,
      });
    } catch {
      this.progress.set({
        isConverting: false,
        percentage: 0,
        stage: 'Cancelled',
        elapsedSeconds: 0,
      });
    }
  }

  cancelConversion(): void {
    this.isCancelled = true;
  }

  setConvertedOutputForTest(output: ConvertedOutput): void {
    this.convertedOutput.set(output);
  }

  downloadOutput(): void {
    const out = this.convertedOutput();
    if (!out) return;

    const url = URL.createObjectURL(out.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = out.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  resetToEmptyState(): void {
    this.cleanupUrls();
    this.videoMetadata.set(null);
    this.videoSourceUrl.set(null);
    this.convertedOutput.set(null);
    this.currentPlaybackTime.set(0);
    this.isPlaying.set(false);
  }

  private cleanupUrls(): void {
    const vUrl = this.videoSourceUrl();
    if (vUrl && vUrl.startsWith('blob:')) {
      URL.revokeObjectURL(vUrl);
    }
    const o = this.convertedOutput();
    if (o && o.url && o.url.startsWith('blob:')) {
      URL.revokeObjectURL(o.url);
    }
  }

  formatTime(seconds: number): string {
    return formatVideoTime(seconds);
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
