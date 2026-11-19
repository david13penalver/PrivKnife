import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Badge,
  Button,
  Card,
  Dropzone,
  ProgressBar,
} from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  buildDataUri,
  buildMorseTimeline,
  encodeBytesToBase64,
  parseUrlComponents,
  rebuildUrlFromParams,
  runCodecTransform,
  synthesizeMorseWav,
  toArrayBuffer,
} from './engine';
import { UTF8_SAMPLE_TEXT } from './test-fixtures';
import {
  CodecDirection,
  CodecMode,
  DEFAULT_WORKBENCH_OPTIONS,
  DetectedBinaryInfo,
  EncoderWorkbenchOptions,
  EncoderWorkbenchResult,
  MAX_PREVIEW_CHARS,
  ParsedUrlSummary,
  UrlParamEntry,
  WORKER_FILE_THRESHOLD_BYTES,
} from './types';
import { EncoderWorkerClient } from './worker';

const SAFE_RASTER_PREVIEW_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

@Component({
  selector: 'app-encoder-decoder-workbench',
  standalone: true,
  imports: [
    FormsModule,
    Badge,
    Button,
    Card,
    Dropzone,
    ProgressBar,
    TranslatePipe,
  ],
  templateUrl: './encoder-decoder-workbench.component.html',
  styleUrl: './encoder-decoder-workbench.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncoderDecoderWorkbenchComponent implements OnDestroy {
  readonly codecModes: ReadonlyArray<{ id: CodecMode; labelKey: string }> = [
    { id: 'base64', labelKey: 'tools.encoderDecoderWorkbench.modeBase64' },
    { id: 'url', labelKey: 'tools.encoderDecoderWorkbench.modeUrl' },
    { id: 'html_unicode', labelKey: 'tools.encoderDecoderWorkbench.modeHtmlUnicode' },
    { id: 'hex', labelKey: 'tools.encoderDecoderWorkbench.modeHex' },
    { id: 'binary', labelKey: 'tools.encoderDecoderWorkbench.modeBinary' },
    { id: 'morse', labelKey: 'tools.encoderDecoderWorkbench.modeMorse' },
  ];

  readonly options = signal<EncoderWorkbenchOptions>({ ...DEFAULT_WORKBENCH_OPTIONS });
  readonly inputText = signal<string>(UTF8_SAMPLE_TEXT);
  readonly outputText = signal<string>('');
  readonly inputBytes = signal<number>(0);
  readonly outputBytes = signal<number>(0);
  readonly detectedBinary = signal<DetectedBinaryInfo | null>(null);
  readonly decodedBytes = signal<Uint8Array | null>(null);
  readonly binaryPreviewUrl = signal<string | null>(null);
  readonly parsedUrl = signal<ParsedUrlSummary | null>(null);
  readonly urlParams = signal<UrlParamEntry[]>([]);
  readonly encodeAsDataUri = signal<boolean>(true);
  readonly workerBusy = signal<boolean>(false);
  readonly workerProgress = signal<number>(0);
  readonly errorMessage = signal<string | null>(null);
  readonly copyFeedback = signal<string | null>(null);
  readonly isPlayingMorse = signal<boolean>(false);
  readonly morseProgress = signal<number>(0);

  readonly outputTruncated = computed(
    () => this.outputText().length > MAX_PREVIEW_CHARS
  );
  readonly outputPreviewText = computed(() => {
    const full = this.outputText();
    return full.length > MAX_PREVIEW_CHARS ? full.slice(0, MAX_PREVIEW_CHARS) : full;
  });

  private readonly workerClient = new EncoderWorkerClient();
  private readonly createdObjectUrls: string[] = [];
  private readonly pendingRevokeTimers = new Set<ReturnType<typeof setTimeout>>();
  private audioContext: AudioContext | null = null;
  private activeOscillator: OscillatorNode | null = null;
  private morseProgressTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.runTransform();
  }

  setMode(mode: CodecMode): void {
    this.stopMorsePlayback();
    this.options.update((prev) => ({ ...prev, mode }));
    this.runTransform();
  }

  setDirection(direction: CodecDirection): void {
    this.stopMorsePlayback();
    this.options.update((prev) => ({ ...prev, direction }));
    this.runTransform();
  }

  updateInput(raw: string): void {
    this.inputText.set(raw);
    this.copyFeedback.set(null);
    this.runTransform();
  }

  updateOption<K extends keyof EncoderWorkbenchOptions>(
    key: K,
    value: EncoderWorkbenchOptions[K]
  ): void {
    this.options.update((prev) => ({ ...prev, [key]: value }));
    this.runTransform();
  }

  swapInputOutput(): void {
    const nextInput = this.outputText();
    if (!nextInput || this.detectedBinary()) {
      return;
    }
    this.stopMorsePlayback();
    const nextDir: CodecDirection =
      this.options().direction === 'encode' ? 'decode' : 'encode';
    this.options.update((prev) => ({ ...prev, direction: nextDir }));
    this.inputText.set(nextInput);
    this.runTransform();
  }

  runTransform(): void {
    const result = runCodecTransform(this.inputText(), this.options());
    this.applyResult(result);
  }

  addUrlParam(key = 'param', value = ''): void {
    const updated = [...this.urlParams(), { key, value }];
    this.syncUrlParamsToInput(updated);
  }

  updateUrlParam(index: number, field: 'key' | 'value', value: string): void {
    const updated = this.urlParams().map((entry, idx) =>
      idx === index ? { ...entry, [field]: value } : entry
    );
    this.syncUrlParamsToInput(updated);
  }

  removeUrlParam(index: number): void {
    const updated = this.urlParams().filter((_, idx) => idx !== index);
    this.syncUrlParamsToInput(updated);
  }

  async onFilesSelected(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) {
      return;
    }

    this.errorMessage.set(null);
    this.copyFeedback.set(null);
    this.options.update((prev) => ({ ...prev, mode: 'base64', direction: 'encode' }));

    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const mimeType = file.type || 'application/octet-stream';
      const opts = this.options();
      const asDataUri = this.encodeAsDataUri();

      if (file.size > WORKER_FILE_THRESHOLD_BYTES) {
        this.workerBusy.set(true);
        this.workerProgress.set(0);
        try {
          const result = await this.workerClient.run(
            {
              id: `file-${Date.now()}`,
              action: 'encode_file',
              bytes,
              mimeType,
              urlSafe: opts.base64UrlSafe,
              omitPadding: opts.base64OmitPadding,
              wrap76: opts.base64Wrap76,
              asDataUri,
            },
            (percent) => this.workerProgress.set(percent)
          );
          this.applyResult(result);
        } finally {
          this.workerBusy.set(false);
        }
        return;
      }

      const encoded = asDataUri
        ? buildDataUri(bytes, mimeType)
        : encodeBytesToBase64(bytes, {
            urlSafe: opts.base64UrlSafe,
            omitPadding: opts.base64OmitPadding,
            wrap76: opts.base64Wrap76,
          });
      this.applyResult({
        success: true,
        outputText: encoded,
        inputBytes: bytes.byteLength,
        outputBytes: new TextEncoder().encode(encoded).byteLength,
      });
    } catch (err) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Failed to encode dropped file.'
      );
    }
  }

  downloadDecodedBinary(): void {
    const bytes = this.decodedBytes();
    const info = this.detectedBinary();
    if (!bytes || !info) {
      return;
    }
    this.triggerBlobDownload(
      new Blob([toArrayBuffer(bytes)], { type: info.mimeType }),
      `decoded-payload.${info.extension}`
    );
  }

  downloadOutputText(): void {
    const content = this.outputText();
    if (!content) {
      return;
    }
    this.triggerBlobDownload(
      new Blob([content], { type: 'text/plain;charset=utf-8' }),
      `encoded-${this.options().mode}.txt`
    );
  }

  async copyOutput(): Promise<void> {
    const content = this.outputText();
    if (!content) {
      return;
    }
    try {
      await globalThis.navigator?.clipboard?.writeText?.(content);
      this.copyFeedback.set('Copied');
    } catch {
      this.copyFeedback.set(null);
    }
  }

  playMorseAudio(): void {
    this.stopMorsePlayback();
    this.errorMessage.set(null);

    const morseStr =
      this.options().direction === 'encode' ? this.outputText() : this.inputText();
    const timeline = buildMorseTimeline(morseStr, this.options().morseWpm);
    if (timeline.events.length === 0 || timeline.totalDurationSec <= 0) {
      return;
    }

    const AudioCtx =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      this.errorMessage.set('Web Audio API is unavailable in this environment.');
      return;
    }

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = Math.min(900, Math.max(400, this.options().morseFrequencyHz || 650));

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const startTime = ctx.currentTime + 0.01;
    gain.gain.setValueAtTime(0, ctx.currentTime);

    for (const event of timeline.events) {
      if (event.type !== 'tone') {
        continue;
      }
      const t0 = startTime + event.startSec;
      const t1 = t0 + event.durationSec;
      const ramp = Math.min(0.005, event.durationSec / 2);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.35, t0 + ramp);
      gain.gain.setValueAtTime(0.35, t1 - ramp);
      gain.gain.linearRampToValueAtTime(0, t1);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + timeline.totalDurationSec + 0.02);

    this.audioContext = ctx;
    this.activeOscillator = osc;
    this.isPlayingMorse.set(true);
    this.morseProgress.set(0);

    const startedMs = Date.now();
    const totalMs = Math.max(100, timeline.totalDurationSec * 1000);
    this.morseProgressTimer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startedMs) / totalMs) * 100);
      this.morseProgress.set(Math.round(pct));
      if (pct >= 100) {
        this.stopMorsePlayback();
      }
    }, 50);
  }

  stopMorsePlayback(): void {
    if (this.morseProgressTimer !== null) {
      clearInterval(this.morseProgressTimer);
      this.morseProgressTimer = null;
    }

    if (this.activeOscillator) {
      try {
        this.activeOscillator.stop();
        this.activeOscillator.disconnect();
      } catch {
        // Ignore already-stopped oscillator nodes
      }
      this.activeOscillator = null;
    }

    if (this.audioContext) {
      const ctx = this.audioContext;
      this.audioContext = null;
      void ctx.close();
    }

    this.isPlayingMorse.set(false);
    this.morseProgress.set(0);
  }

  downloadMorseWav(): void {
    const morseStr =
      this.options().direction === 'encode' ? this.outputText() : this.inputText();
    const { wavBytes } = synthesizeMorseWav(
      morseStr,
      this.options().morseWpm,
      this.options().morseFrequencyHz
    );
    this.triggerBlobDownload(
      new Blob([toArrayBuffer(wavBytes)], { type: 'audio/wav' }),
      'privknife-morse-cw.wav'
    );
  }

  reset(): void {
    this.stopMorsePlayback();
    this.revokeAllObjectUrls();
    this.inputText.set('');
    this.outputText.set('');
    this.inputBytes.set(0);
    this.outputBytes.set(0);
    this.detectedBinary.set(null);
    this.decodedBytes.set(null);
    this.parsedUrl.set(null);
    this.urlParams.set([]);
    this.errorMessage.set(null);
    this.copyFeedback.set(null);
    this.workerBusy.set(false);
    this.workerProgress.set(0);
  }

  ngOnDestroy(): void {
    this.reset();
    this.workerClient.dispose();
  }

  private applyResult(result: EncoderWorkbenchResult): void {
    this.revokeBinaryPreviewUrl();
    this.inputBytes.set(result.inputBytes);
    this.outputBytes.set(result.outputBytes);
    this.detectedBinary.set(result.detectedBinary ?? null);
    this.decodedBytes.set(result.decodedBytes ?? null);

    if (result.parsedUrl?.validUrl) {
      this.parsedUrl.set(result.parsedUrl);
      this.urlParams.set(result.parsedUrl.params);
    } else if (this.options().mode === 'url') {
      const candidate = parseUrlComponents(this.inputText());
      this.parsedUrl.set(candidate.validUrl ? candidate : null);
      this.urlParams.set(candidate.validUrl ? candidate.params : []);
    } else {
      this.parsedUrl.set(null);
      this.urlParams.set([]);
    }

    if (!result.success) {
      this.errorMessage.set(result.error ?? 'Conversion error.');
      this.outputText.set('');
      return;
    }

    this.errorMessage.set(null);
    this.outputText.set(result.outputText);

    if (
      result.decodedBytes &&
      result.detectedBinary &&
      SAFE_RASTER_PREVIEW_MIMES.has(result.detectedBinary.mimeType)
    ) {
      const url = URL.createObjectURL(
        new Blob([toArrayBuffer(result.decodedBytes)], {
          type: result.detectedBinary.mimeType,
        })
      );
      this.binaryPreviewUrl.set(url);
    }
  }

  private syncUrlParamsToInput(updatedParams: UrlParamEntry[]): void {
    const parsed = this.parsedUrl();
    this.urlParams.set(updatedParams);
    if (!parsed) {
      return;
    }
    const rebuilt = rebuildUrlFromParams(parsed, updatedParams);
    this.inputText.set(rebuilt);
    this.runTransform();
  }

  private triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.push(url);

    if (typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
    }

    const timerId = setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = this.createdObjectUrls.indexOf(url);
      if (idx !== -1) {
        this.createdObjectUrls.splice(idx, 1);
      }
      this.pendingRevokeTimers.delete(timerId);
    }, 150);
    this.pendingRevokeTimers.add(timerId);
  }

  private revokeBinaryPreviewUrl(): void {
    const current = this.binaryPreviewUrl();
    if (current) {
      URL.revokeObjectURL(current);
      this.binaryPreviewUrl.set(null);
    }
  }

  private revokeAllObjectUrls(): void {
    this.revokeBinaryPreviewUrl();
    for (const timerId of this.pendingRevokeTimers) {
      clearTimeout(timerId);
    }
    this.pendingRevokeTimers.clear();

    while (this.createdObjectUrls.length > 0) {
      const url = this.createdObjectUrls.pop();
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }
}
