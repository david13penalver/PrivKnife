import { Component, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AudioBufferLike,
  AudioExportFormat,
  AudioTrimmerBoosterOptions,
  AudioTrimmerBoosterResult,
  AudioTrimmerWorkerRequest,
  AudioTrimmerWorkerResponse,
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
  templateUrl: './audio-trimmer-booster.component.html',
  styleUrl: './audio-trimmer-booster.component.scss',
})
export class AudioTrimmerBoosterComponent implements OnDestroy {
  // Signals
  readonly originalFileName = signal<string>('');
  readonly totalDurationSec = signal<number>(30);
  readonly startTimeSec = signal<number>(0);
  readonly endTimeSec = signal<number>(30);
  readonly volumeGainMultiplier = signal<number>(1.0);
  readonly fadeInSec = signal<number>(0);
  readonly fadeOutSec = signal<number>(0);
  readonly exportFormat = signal<AudioExportFormat>('wav');
  readonly mp3BitrateKbps = signal<number>(192);
  readonly normalizeAudio = signal<boolean>(false);

  readonly waveformBars = signal<number[]>([]);
  readonly isProcessing = signal<boolean>(false);
  readonly result = signal<AudioTrimmerBoosterResult | null>(null);
  readonly downloadUrl = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  private readonly cachedAudioBuffer = signal<AudioBufferLike | null>(null);
  private audioContext: AudioContext | null = null;
  private activeWorker: Worker | null = null;
  private workerRequestId = 0;

  // Computed signals
  readonly hasAudioData = computed(() => this.cachedAudioBuffer() !== null);

  readonly volumePercentage = computed(() => `${Math.round(this.volumeGainMultiplier() * 100)}%`);

  readonly trimmedDurationFormatted = computed(() => {
    const diff = Math.max(0, this.endTimeSec() - this.startTimeSec());
    return `${diff.toFixed(2)}s`;
  });

  readonly totalDurationFormatted = computed(() => {
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
    this.terminateWorker();
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
    this.cachedAudioBuffer.set(buffer);
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.decodeAndLoadFile(input.files[0]);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.decodeAndLoadFile(event.dataTransfer.files[0]);
    }
  }

  private async decodeAndLoadFile(file: File): Promise<void> {
    this.originalFileName.set(file.name);

    try {
      this.isProcessing.set(true);
      const arrayBuffer = await file.arrayBuffer();

      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      const decoded = await this.audioContext.decodeAudioData(arrayBuffer);
      this.loadSyntheticSample(decoded, file.name);
    } catch {
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
    const buffer = this.cachedAudioBuffer();
    if (!buffer) {
      this.errorMessage.set('Please select or load an audio file first.');
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    // Prepare channels for transferable worker or engine
    const channelData: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channelData.push(buffer.getChannelData(i));
    }

    const options: AudioTrimmerBoosterOptions = {
      channelData,
      sampleRate: buffer.sampleRate,
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

    try {
      let res: AudioTrimmerBoosterResult;
      if (typeof Worker !== 'undefined') {
        res = await this.processWithWorker(options);
      } else {
        res = await processAudioTrimmer(options);
      }

      if (res.success) {
        this.revokeDownloadUrl();
        this.result.set(res);
        this.downloadUrl.set(URL.createObjectURL(res.blob));
      } else {
        this.errorMessage.set(res.error || 'Failed to process audio');
      }
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.isProcessing.set(false);
    }
  }

  private processWithWorker(options: AudioTrimmerBoosterOptions): Promise<AudioTrimmerBoosterResult> {
    return new Promise((resolve, reject) => {
      try {
        this.terminateWorker();
        this.activeWorker = new Worker(new URL('./worker.ts', import.meta.url), {
          type: 'module',
        });

        const id = ++this.workerRequestId;

        this.activeWorker.onmessage = (event: MessageEvent<AudioTrimmerWorkerResponse>) => {
          const data = event.data;
          if (data.id !== id) return;

          if (data.result) {
            resolve(data.result);
            this.terminateWorker();
          } else if (data.error) {
            reject(new Error(data.error));
            this.terminateWorker();
          }
        };

        this.activeWorker.onerror = (err) => {
          reject(new Error(err.message || 'Worker processing error'));
          this.terminateWorker();
        };

        const request: AudioTrimmerWorkerRequest = {
          id,
          options,
        };

        this.activeWorker.postMessage(request);
      } catch {
        // Fallback to direct synchronous execution in unit test environments
        processAudioTrimmer(options).then(resolve, reject);
      }
    });
  }

  private terminateWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
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
    this.terminateWorker();
    this.cachedAudioBuffer.set(null);
    this.originalFileName.set('');
    this.totalDurationSec.set(30);
    this.startTimeSec.set(0);
    this.endTimeSec.set(30);
    this.volumeGainMultiplier.set(1.0);
    this.fadeInSec.set(0);
    this.fadeOutSec.set(0);
    this.normalizeAudio.set(false);
    this.exportFormat.set('wav');
    this.mp3BitrateKbps.set(192);
    this.result.set(null);
    this.errorMessage.set(null);
    this.resetWaveform();
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
