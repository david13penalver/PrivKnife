import {
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AudioBufferLike,
  AudioExportFormat,
  AudioTrimmerBoosterOptions,
  AudioTrimmerBoosterResult,
} from './types';
import {
  generateWaveformPreview,
  processAudioTrimmer,
} from './engine';
import { SYNTHETIC_AUDIO_BUFFER } from './test-fixtures';

@Component({
  selector: 'app-audio-trimmer-booster',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Audio Trimmer, Volume Booster & Ringtone Maker</h1>
          <p class="c-header__subtitle">
            Trim audio with millisecond precision, boost volume up to 400% with soft-knee limiting, apply fade in/out, and export to MP3, WAV, or iPhone M4R ringtone format entirely client-side.
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
            <h2 class="c-card__title">Audio Controls & Parameters</h2>
          </div>
          <div class="c-card__body">
            <!-- File Input / Dropzone -->
            <div class="c-dropzone g--margin-bottom-4">
              <input
                type="file"
                id="audioFileInput"
                class="c-dropzone__input"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.m4r"
                (change)="onFileSelected($event)"
              />
              <label for="audioFileInput" class="c-dropzone__label">
                <span class="c-dropzone__icon">🎵</span>
                <span class="c-dropzone__text">
                  {{ originalFileName() || 'Drop audio file here or click to browse' }}
                </span>
                <span class="c-dropzone__hint">Supports MP3, WAV, AAC, M4A, OGG, FLAC</span>
              </label>
            </div>

            <div class="g--margin-bottom-4">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="loadDemoTrack()"
              >
                Load Sample Audio Track
              </button>
            </div>

            <!-- Trimming Range Controls -->
            <div class="g--margin-bottom-4">
              <div class="l-extremo">
                <label class="c-input__label l-extremo__area-izquierda">Trim Range (Seconds)</label>
                <span class="c-badge l-extremo__area-derecha">
                  Duration: {{ trimmedDurationFormatted() }}
                </span>
              </div>
              <div class="l-columns l-columns--2 g--margin-top-2">
                <div class="l-columns__area">
                  <label class="c-input__sublabel" for="startTimeInput">Start (s)</label>
                  <input
                    id="startTimeInput"
                    type="number"
                    step="0.05"
                    min="0"
                    [max]="endTimeSec()"
                    class="c-input c-input--number"
                    [ngModel]="startTimeSec()"
                    (ngModelChange)="updateStartTime($event)"
                  />
                </div>
                <div class="l-columns__area">
                  <label class="c-input__sublabel" for="endTimeInput">End (s)</label>
                  <input
                    id="endTimeInput"
                    type="number"
                    step="0.05"
                    [min]="startTimeSec()"
                    [max]="totalDurationSec()"
                    class="c-input c-input--number"
                    [ngModel]="endTimeSec()"
                    (ngModelChange)="updateEndTime($event)"
                  />
                </div>
              </div>
              <input
                type="range"
                min="0"
                [max]="totalDurationSec()"
                step="0.05"
                class="c-input--range g--margin-top-2"
                [ngModel]="startTimeSec()"
                (ngModelChange)="updateStartTime($event)"
              />
              <input
                type="range"
                min="0"
                [max]="totalDurationSec()"
                step="0.05"
                class="c-input--range g--margin-top-1"
                [ngModel]="endTimeSec()"
                (ngModelChange)="updateEndTime($event)"
              />
            </div>

            <!-- Volume Booster Slider -->
            <div class="g--margin-bottom-4">
              <div class="l-extremo">
                <label class="c-input__label l-extremo__area-izquierda" for="volumeGainInput">
                  Volume Booster & Gain
                </label>
                <span class="c-badge l-extremo__area-derecha">
                  {{ volumePercentage() }}
                </span>
              </div>
              <input
                id="volumeGainInput"
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                class="c-input--range g--margin-top-2"
                [ngModel]="volumeGainMultiplier()"
                (ngModelChange)="updateVolumeGain($event)"
              />
              <p class="c-input__hint">
                Soft-knee saturation automatically protects against harsh clipping and distortion above 100%.
              </p>
            </div>

            <!-- Fade In / Fade Out -->
            <div class="l-columns l-columns--2 g--margin-bottom-4">
              <div class="l-columns__area">
                <label class="c-input__label" for="fadeInInput">Fade In (s)</label>
                <input
                  id="fadeInInput"
                  type="number"
                  step="0.05"
                  min="0"
                  max="5"
                  class="c-input c-input--number"
                  [ngModel]="fadeInSec()"
                  (ngModelChange)="updateFadeIn($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__label" for="fadeOutInput">Fade Out (s)</label>
                <input
                  id="fadeOutInput"
                  type="number"
                  step="0.05"
                  min="0"
                  max="5"
                  class="c-input c-input--number"
                  [ngModel]="fadeOutSec()"
                  (ngModelChange)="updateFadeOut($event)"
                />
              </div>
            </div>

            <!-- Peak Normalization Toggle -->
            <div class="g--margin-bottom-4">
              <label class="c-input__checkbox-label">
                <input
                  type="checkbox"
                  [checked]="normalizeAudio()"
                  (change)="toggleNormalize($any($event.target).checked)"
                />
                <span>Peak Audio Normalization (Maximize loudness to 0.98 peak)</span>
              </label>
            </div>

            <!-- Export Format & Bitrate -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label" for="exportFormatSelect">Export Format</label>
              <select
                id="exportFormatSelect"
                class="c-input c-input--select"
                [ngModel]="exportFormat()"
                (ngModelChange)="updateExportFormat($event)"
              >
                <option value="wav">WAV (Lossless 16-bit PCM)</option>
                <option value="mp3">MP3 (Universal compressed audio)</option>
                <option value="m4r_ringtone">M4R (iPhone Ringtone - max 40s)</option>
              </select>
            </div>

            @if (exportFormat() === 'mp3' || exportFormat() === 'm4r_ringtone') {
              <div class="g--margin-bottom-4">
                <label class="c-input__label" for="mp3BitrateSelect">MP3 / Audio Bitrate</label>
                <select
                  id="mp3BitrateSelect"
                  class="c-input c-input--select"
                  [ngModel]="mp3BitrateKbps()"
                  (ngModelChange)="updateMp3Bitrate($event)"
                >
                  <option [ngValue]="128">128 kbps (Compact)</option>
                  <option [ngValue]="192">192 kbps (Standard High Quality)</option>
                  <option [ngValue]="256">256 kbps (Premium)</option>
                  <option [ngValue]="320">320 kbps (Maximum Fidelity)</option>
                </select>
              </div>
            }
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
                (click)="processAudio()"
                [disabled]="isProcessing() || !hasAudioData()"
              >
                {{ isProcessing() ? 'Processing Audio...' : 'Trim & Export Audio' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Preview & Output Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Interactive Preview & Export</h2>
          </div>
          <div class="c-card__body">
            <!-- Visual Waveform Display -->
            <div class="c-preview g--margin-bottom-4">
              <div class="c-preview__waveform-container">
                <div class="c-preview__waveform">
                  @for (bar of waveformBars(); track $index) {
                    <div
                      class="c-preview__bar"
                      [class.c-preview__bar--active]="isBarInSelection($index)"
                      [style.height.%]="bar * 100"
                    ></div>
                  }
                </div>
              </div>
              <div class="l-extremo g--margin-top-1">
                <span class="c-preview__timestamp">0:00</span>
                <span class="c-preview__timestamp">{{ totalDurationFormatted() }}</span>
              </div>
            </div>

            <!-- Audio Player Preview -->
            @if (downloadUrl()) {
              <div class="c-preview__player g--margin-bottom-4">
                <label class="c-input__label g--margin-bottom-2">Processed Audio Player</label>
                <audio controls class="c-preview__audio-element" [src]="downloadUrl()"></audio>
              </div>
            }

            <!-- Metadata Details -->
            @if (result()?.metadata; as meta) {
              <div class="c-preview__stats g--margin-bottom-4">
                <div class="c-preview__stat-row">
                  <span class="c-preview__stat-label">Output Format:</span>
                  <span class="c-preview__stat-value">{{ meta.format.toUpperCase() }}</span>
                </div>
                <div class="c-preview__stat-row">
                  <span class="c-preview__stat-label">Duration:</span>
                  <span class="c-preview__stat-value">{{ meta.trimmedDurationSec.toFixed(2) }}s</span>
                </div>
                <div class="c-preview__stat-row">
                  <span class="c-preview__stat-label">Channels & Rate:</span>
                  <span class="c-preview__stat-value">{{ meta.channels }} ch @ {{ meta.sampleRate }} Hz</span>
                </div>
                <div class="c-preview__stat-row">
                  <span class="c-preview__stat-label">Gain Applied:</span>
                  <span class="c-preview__stat-value">{{ (meta.gainApplied * 100).toFixed(0) }}%</span>
                </div>
                @if (meta.clippedPrevented) {
                  <div class="c-preview__stat-row">
                    <span class="c-preview__stat-label">Soft-Knee Protection:</span>
                    <span class="c-preview__stat-value c-badge--success">Active</span>
                  </div>
                }
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
                Download {{ result()?.fileName || 'Audio File' }}
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
      .c-preview__waveform-container {
        background-color: #0f172a;
        border-radius: 8px;
        padding: 16px;
        min-height: 120px;
        display: flex;
        align-items: center;
      }
      .c-preview__waveform {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 90px;
        gap: 2px;
      }
      .c-preview__bar {
        flex: 1;
        background-color: #475569;
        border-radius: 2px;
        min-height: 4px;
        transition: background-color 0.15s ease;
      }
      .c-preview__bar--active {
        background-color: #38bdf8;
      }
      .c-preview__timestamp {
        font-size: 0.75rem;
        color: var(--color-text-muted, #64748b);
      }
      .c-preview__audio-element {
        width: 100%;
      }
      .c-preview__stat-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 0.875rem;
        border-bottom: 1px solid var(--color-border-subtle, #e2e8f0);
      }
      .c-preview__stat-label {
        color: var(--color-text-muted, #64748b);
      }
      .c-preview__stat-value {
        font-weight: 600;
      }
      .c-input--range {
        width: 100%;
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
      .c-input__hint {
        font-size: 0.75rem;
        color: var(--color-text-muted, #64748b);
        margin-top: 4px;
      }
    `,
  ],
})
export class AudioTrimmerBoosterComponent implements OnDestroy {
  // Signals
  originalFileName = signal<string>('');
  totalDurationSec = signal<number>(30);
  startTimeSec = signal<number>(0);
  endTimeSec = signal<number>(30);
  volumeGainMultiplier = signal<number>(1.0);
  fadeInSec = signal<number>(0);
  fadeOutSec = signal<number>(0);
  exportFormat = signal<AudioExportFormat>('wav');
  mp3BitrateKbps = signal<number>(192);
  normalizeAudio = signal<boolean>(false);

  waveformBars = signal<number[]>([]);
  isProcessing = signal<boolean>(false);
  result = signal<AudioTrimmerBoosterResult | null>(null);
  downloadUrl = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  private cachedAudioBuffer: AudioBufferLike | null = null;
  private audioContext: AudioContext | null = null;

  // Computed signals
  hasAudioData = computed(() => this.cachedAudioBuffer !== null);

  volumePercentage = computed(() => `${Math.round(this.volumeGainMultiplier() * 100)}%`);

  trimmedDurationFormatted = computed(() => {
    const diff = Math.max(0, this.endTimeSec() - this.startTimeSec());
    return `${diff.toFixed(2)}s`;
  });

  totalDurationFormatted = computed(() => {
    const total = this.totalDurationSec();
    const mins = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  });

  constructor() {
    this.resetWaveform();
  }

  ngOnDestroy(): void {
    this.revokeDownloadUrl();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // no-op
      }
    }
  }

  updateStartTime(val: number): void {
    const num = Number(val) || 0;
    this.startTimeSec.set(Math.max(0, Math.min(this.endTimeSec() - 0.01, num)));
  }

  updateEndTime(val: number): void {
    const num = Number(val) || 0;
    this.endTimeSec.set(
      Math.min(this.totalDurationSec(), Math.max(this.startTimeSec() + 0.01, num))
    );
  }

  updateVolumeGain(val: number): void {
    this.volumeGainMultiplier.set(Number(val) || 1.0);
  }

  updateFadeIn(val: number): void {
    this.fadeInSec.set(Math.max(0, Number(val) || 0));
  }

  updateFadeOut(val: number): void {
    this.fadeOutSec.set(Math.max(0, Number(val) || 0));
  }

  updateExportFormat(format: AudioExportFormat): void {
    this.exportFormat.set(format);
  }

  updateMp3Bitrate(bitrate: number): void {
    this.mp3BitrateKbps.set(Number(bitrate) || 192);
  }

  toggleNormalize(val: boolean): void {
    this.normalizeAudio.set(Boolean(val));
  }

  loadSyntheticSample(buffer: AudioBufferLike, filename = 'sample_track.wav'): void {
    this.cachedAudioBuffer = buffer;
    this.originalFileName.set(filename);
    this.totalDurationSec.set(buffer.duration);
    this.startTimeSec.set(0);
    this.endTimeSec.set(buffer.duration);
    const channel0 = buffer.getChannelData(0);
    this.waveformBars.set(generateWaveformPreview(channel0, 80));
    this.revokeDownloadUrl();
    this.result.set(null);
    this.errorMessage.set(null);
  }

  loadDemoTrack(): void {
    this.loadSyntheticSample(SYNTHETIC_AUDIO_BUFFER, 'privknife_demo_synth.wav');
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.originalFileName.set(file.name);

    try {
      this.isProcessing.set(true);
      const arrayBuffer = await file.arrayBuffer();

      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      const decoded = await this.audioContext.decodeAudioData(arrayBuffer);
      this.loadSyntheticSample(decoded, file.name);
    } catch (err: unknown) {
      this.errorMessage.set(
        'Failed to decode audio file. Please ensure it is a valid audio format.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  isBarInSelection(barIndex: number): boolean {
    const bars = this.waveformBars();
    if (bars.length === 0) return false;
    const barTime = (barIndex / bars.length) * this.totalDurationSec();
    return barTime >= this.startTimeSec() && barTime <= this.endTimeSec();
  }

  async processAudio(): Promise<void> {
    if (!this.cachedAudioBuffer) {
      this.errorMessage.set('Please select or load an audio file first.');
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    const options: AudioTrimmerBoosterOptions = {
      audioBuffer: this.cachedAudioBuffer,
      startTimeSec: this.startTimeSec(),
      endTimeSec: this.endTimeSec(),
      volumeGainMultiplier: this.volumeGainMultiplier(),
      fadeInSec: this.fadeInSec(),
      fadeOutSec: this.fadeOutSec(),
      exportFormat: this.exportFormat(),
      mp3BitrateKbps: this.mp3BitrateKbps(),
      normalizeAudio: this.normalizeAudio(),
      originalFileName: this.originalFileName(),
    };

    const res = await processAudioTrimmer(options);
    this.isProcessing.set(false);

    if (res.success) {
      this.revokeDownloadUrl();
      this.result.set(res);
      this.downloadUrl.set(URL.createObjectURL(res.blob));
    } else {
      this.errorMessage.set(res.error || 'Failed to process audio');
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
    this.revokeDownloadUrl();
    this.result.set(null);
    this.errorMessage.set(null);
    this.volumeGainMultiplier.set(1.0);
    this.fadeInSec.set(0);
    this.fadeOutSec.set(0);
    this.normalizeAudio.set(false);
    this.exportFormat.set('wav');
    this.mp3BitrateKbps.set(192);

    if (this.cachedAudioBuffer) {
      this.startTimeSec.set(0);
      this.endTimeSec.set(this.cachedAudioBuffer.duration);
    } else {
      this.startTimeSec.set(0);
      this.endTimeSec.set(30);
      this.totalDurationSec.set(30);
      this.originalFileName.set('');
      this.resetWaveform();
    }
  }

  private resetWaveform(): void {
    const bars: number[] = [];
    for (let i = 0; i < 80; i++) {
      bars.push(0.08);
    }
    this.waveformBars.set(bars);
  }

  private revokeDownloadUrl(): void {
    const url = this.downloadUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.downloadUrl.set(null);
    }
  }
}
