import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Badge } from '../../../components/badge/badge';
import { Dropzone } from '../../../components/dropzone/dropzone';
import { Card } from '../../../components/card/card';
import {
  generateSoundwavePdfBlob,
  generateSoundwaveStlBlob,
  generateSoundwaveSvg,
  samplePcmWaveform,
} from './engine';
import {
  ART_THEMES,
  DEFAULT_3D_PRINT_CONFIG,
  DEFAULT_SOUNDWAVE_CONFIG,
  SAMPLE_NORMALIZED_BARS,
  createSyntheticVoiceMemoPcm,
} from './test-fixtures';
import {
  ArtThemePreset,
  SoundwaveConfig,
  ThreeDPrintConfig,
  WaveformStyle,
} from './types';

const STORAGE_KEY = 'privknife_soundwave_config';

@Component({
  selector: 'app-soundwave-art-maker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Dropzone, Card],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1140px;">
      <!-- Tool Header & Privacy Badge -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            🛡️ 100% In-Browser Audio Processing &bull; Zero Server Ingestion &bull; Zero Telemetry
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">
          Spotify Code &amp; Soundwave Art Maker
        </h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 720px; color: var(--color-text-secondary); font-size: 1.1rem;">
          Transform memorable songs, wedding vows, or voice notes into physical art. Export clean vectors (.svg)
          for laser cutting, high-DPI posters (.pdf) for framing, and dual-color 3D models (.stl) ready to 3D print.
        </p>
      </div>

      <!-- Main Layout: Editor Controls & Live Art Preview Pane -->
      <div class="l-columns l-columns--12 soundwave-workspace" style="gap: 24px; align-items: start;">
        <!-- Left Column: Audio Inputs & Customization Controls (7 cols) -->
        <div class="l-columns__area l-columns__area--span-7">
          <div class="l-columns l-columns--1" style="gap: 20px;">
            <!-- Audio Input Panel -->
            <app-card title="1. Audio Source & Voice Recording">
              <div class="l-columns l-columns--1" style="gap: 16px;">
                <app-dropzone
                  label="Drop audio track here or click to browse"
                  hint="Supports .mp3, .wav, .m4a, .flac, .ogg — processed 100% offline in browser memory"
                  accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
                  [multiple]="false"
                  (filesSelected)="onAudioFilesSelected($event)">
                </app-dropzone>

                <!-- Voice Recording & Sample Presets -->
                <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                  <button
                    type="button"
                    class="c-button"
                    [class.c-button--danger]="isRecording()"
                    [class.c-button--outline]="!isRecording()"
                    (click)="toggleVoiceRecording()">
                    {{ isRecording() ? '⏹ Stop Recording' : '🎤 Record Voice Note' }}
                  </button>

                  <div class="g--flex-center" style="gap: 6px; flex-wrap: wrap;">
                    <span class="g--text-muted" style="font-size: 0.8rem;">Presets:</span>
                    <button
                      type="button"
                      class="c-button c-button--small c-button--outline"
                      (click)="loadSamplePreset('wedding-song')">
                      Song
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small c-button--outline"
                      (click)="loadSamplePreset('voice-memo')">
                      Voice
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small c-button--outline"
                      (click)="loadSamplePreset('heartbeat')">
                      Heartbeat
                    </button>
                  </div>
                </div>

                @if (isDecodingAudio()) {
                  <div class="g--text-center" style="color: var(--color-primary); font-size: 0.9rem; font-weight: 600;">
                    ⏳ Decoding audio samples &amp; extracting waveform peaks...
                  </div>
                }
              </div>
            </app-card>

            <!-- Soundwave Styling Panel -->
            <app-card title="2. Waveform & Design Customization">
              <div class="l-columns l-columns--1" style="gap: 16px;">
                <!-- Waveform Style Selector -->
                <div>
                  <label class="g--text-muted" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                    Waveform Symmetry Style
                  </label>
                  <div class="g--flex-center" style="gap: 8px;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().style === 'mirrored'"
                      [class.c-button--outline]="config().style !== 'mirrored'"
                      (click)="setStyle('mirrored')">
                      Center Mirrored
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().style === 'bottom'"
                      [class.c-button--outline]="config().style !== 'bottom'"
                      (click)="setStyle('bottom')">
                      Bottom Aligned
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().style === 'radial'"
                      [class.c-button--outline]="config().style !== 'radial'"
                      (click)="setStyle('radial')">
                      Radial Circular
                    </button>
                  </div>
                </div>

                <!-- Theme Presets -->
                <div>
                  <label class="g--text-muted" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                    Color Palette Preset
                  </label>
                  <div class="g--flex-center" style="gap: 6px; flex-wrap: wrap;">
                    @for (theme of themeList; track theme.id) {
                      <button
                        type="button"
                        class="c-button c-button--small"
                        [class.c-button--primary]="config().themePreset === theme.id"
                        [class.c-button--outline]="config().themePreset !== theme.id"
                        (click)="setThemePreset(theme.id)">
                        {{ theme.name }}
                      </button>
                    }
                  </div>
                </div>

                <!-- Sliders Grid -->
                <div class="l-columns l-columns--2" style="gap: 16px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span class="g--text-muted">Bar Count:</span>
                      <strong>{{ config().barCount }}</strong>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="2"
                      [ngModel]="config().barCount"
                      (ngModelChange)="setBarCount($event)"
                      style="width: 100%; accent-color: var(--color-primary); margin-top: 4px;" />
                  </div>

                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span class="g--text-muted">Bar Width:</span>
                      <strong>{{ config().barWidth }} px</strong>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="12"
                      step="1"
                      [ngModel]="config().barWidth"
                      (ngModelChange)="updateParam('barWidth', $event)"
                      style="width: 100%; accent-color: var(--color-primary); margin-top: 4px;" />
                  </div>

                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span class="g--text-muted">Bar Spacing:</span>
                      <strong>{{ config().barSpacing }} px</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      [ngModel]="config().barSpacing"
                      (ngModelChange)="updateParam('barSpacing', $event)"
                      style="width: 100%; accent-color: var(--color-primary); margin-top: 4px;" />
                  </div>

                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span class="g--text-muted">Corner Radius:</span>
                      <strong>{{ config().cornerRadius }} px</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="1"
                      [ngModel]="config().cornerRadius"
                      (ngModelChange)="updateParam('cornerRadius', $event)"
                      style="width: 100%; accent-color: var(--color-primary); margin-top: 4px;" />
                  </div>
                </div>
              </div>
            </app-card>

            <!-- Typography & Spotify Code Panel -->
            <app-card title="3. Typography & Spotify Code">
              <div class="l-columns l-columns--1" style="gap: 14px;">
                <div>
                  <label class="g--text-muted" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                    Title (e.g. Song Name or Custom Message)
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="e.g. Can’t Help Falling in Love"
                    [ngModel]="config().title"
                    (ngModelChange)="setTitle($event)"
                    style="width: 100%; padding: 8px 12px;" />
                </div>

                <div>
                  <label class="g--text-muted" style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                    Subtitle (e.g. Artist, Date, or Dedication)
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="e.g. Elvis Presley • June 15, 2024"
                    [ngModel]="config().subtitle"
                    (ngModelChange)="updateParam('subtitle', $event)"
                    style="width: 100%; padding: 8px 12px;" />
                </div>

                <div>
                  <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 4px;">
                    <label class="g--text-muted" style="font-size: 0.85rem; font-weight: 600;">
                      Spotify Track Link / URI (Optional)
                    </label>
                    <label style="font-size: 0.85rem; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                      <input
                        type="checkbox"
                        [ngModel]="config().showSpotifyCode"
                        (ngModelChange)="updateParam('showSpotifyCode', $event)"
                        style="accent-color: var(--color-primary);" />
                      Show Scannable Code
                    </label>
                  </div>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="e.g. https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
                    [ngModel]="config().spotifyLinkOrUri"
                    (ngModelChange)="updateParam('spotifyLinkOrUri', $event)"
                    style="width: 100%; padding: 8px 12px;" />
                </div>
              </div>
            </app-card>

            <!-- 3D Print Settings (Accordion) -->
            <app-card title="4. 3D Print Settings (Dual-Color Plaque / Keychain)">
              <div class="l-columns l-columns--2" style="gap: 16px;">
                <div>
                  <span class="g--text-muted" style="font-size: 0.85rem;">Base Width:</span>
                  <input
                    type="number"
                    class="c-input"
                    [ngModel]="threeDConfig().baseWidthMm"
                    (ngModelChange)="update3DParam('baseWidthMm', $event)"
                    style="width: 100%; padding: 6px 10px; margin-top: 4px;" />
                </div>

                <div>
                  <span class="g--text-muted" style="font-size: 0.85rem;">Base Height:</span>
                  <input
                    type="number"
                    class="c-input"
                    [ngModel]="threeDConfig().baseHeightMm"
                    (ngModelChange)="update3DParam('baseHeightMm', $event)"
                    style="width: 100%; padding: 6px 10px; margin-top: 4px;" />
                </div>

                <div>
                  <span class="g--text-muted" style="font-size: 0.85rem;">Baseplate Layer:</span>
                  <div style="font-size: 0.85rem; font-weight: 600; margin-top: 4px;">
                    {{ threeDConfig().baseThicknessMm }} mm
                  </div>
                </div>

                <div>
                  <span class="g--text-muted" style="font-size: 0.85rem;">Wave Extrusion:</span>
                  <div style="font-size: 0.85rem; font-weight: 600; margin-top: 4px;">
                    +{{ threeDConfig().waveThicknessMm }} mm (Total: {{ threeDConfig().baseThicknessMm + threeDConfig().waveThicknessMm }} mm)
                  </div>
                </div>

                <div style="grid-column: span 2;">
                  <label style="font-size: 0.85rem; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input
                      type="checkbox"
                      [ngModel]="threeDConfig().hasKeychainHole"
                      (ngModelChange)="update3DParam('hasKeychainHole', $event)"
                      style="accent-color: var(--color-primary);" />
                    Include 4mm Keychain Ring Hole at Left Edge
                  </label>
                </div>
              </div>
            </app-card>
          </div>
        </div>

        <!-- Right Column: Live Art Preview & Multi-Format Export Bar (5 cols, Sticky) -->
        <div class="l-columns__area l-columns__area--span-5" style="position: sticky; top: 24px;">
          <app-card title="Live Artwork Preview">
            <div class="l-columns l-columns--1" style="gap: 16px;">
              <!-- Simulated Framed Art Mockup Frame -->
              <div
                class="c-art-frame"
                style="padding: 12px; background: #000000; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid var(--color-border); overflow: hidden;">
                <div
                  [innerHTML]="safeSvgPreview()"
                  style="width: 100%; display: block; line-height: 0;">
                </div>
              </div>

              <!-- Export Actions Deck -->
              <div class="l-columns l-columns--1" style="gap: 10px;">
                <button
                  type="button"
                  class="c-button c-button--primary"
                  (click)="downloadSvg()"
                  style="width: 100%; justify-content: center;">
                  ✂️ Download Vector SVG (Laser / Cricut)
                </button>

                <button
                  type="button"
                  class="c-button c-button--outline"
                  (click)="downloadPdf()"
                  style="width: 100%; justify-content: center;">
                  📄 Download High-DPI PDF (Print / Frame)
                </button>

                <button
                  type="button"
                  class="c-button c-button--outline"
                  (click)="downloadStl()"
                  style="width: 100%; justify-content: center;">
                  🧊 Download 3D STL (Bambu / Prusa Multi-Color)
                </button>
              </div>

              <!-- Feature Highlights / Specs -->
              <div class="g--text-muted" style="font-size: 0.8rem; line-height: 1.6; padding-top: 8px; border-top: 1px solid var(--color-border);">
                &bull; <strong>SVG:</strong> Parametric paths with millimeter dimensions.<br />
                &bull; <strong>PDF:</strong> Clean vector poster formatted for A4 &amp; Letter.<br />
                &bull; <strong>3D STL:</strong> Manifold dual-layer height swap ready for slicing.
              </div>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .c-art-frame svg {
        width: 100% !important;
        height: auto !important;
        border-radius: 8px;
      }

      @media (max-width: 1024px) {
        .soundwave-workspace {
          grid-template-columns: 1fr !important;
        }

        .soundwave-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class SoundwaveArtMakerComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);

  readonly themeList = Object.values(ART_THEMES);

  // Reactive State Signals
  readonly config = signal<SoundwaveConfig>(DEFAULT_SOUNDWAVE_CONFIG);
  readonly threeDConfig = signal<ThreeDPrintConfig>(DEFAULT_3D_PRINT_CONFIG);
  readonly bars = signal<number[]>(SAMPLE_NORMALIZED_BARS);
  readonly isRecording = signal<boolean>(false);
  readonly isDecodingAudio = signal<boolean>(false);

  // Computed live SVG
  readonly svgPreview = computed(() =>
    generateSoundwaveSvg(this.bars(), this.config())
  );

  readonly safeSvgPreview = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.svgPreview())
  );

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  ngOnInit(): void {
    this.loadFromStorage();
  }

  // Update Handlers
  setStyle(style: WaveformStyle): void {
    this.config.update((c) => ({ ...c, style }));
    this.saveToStorage();
  }

  setTitle(title: string): void {
    this.config.update((c) => ({ ...c, title }));
    this.saveToStorage();
  }

  setThemePreset(themePreset: ArtThemePreset): void {
    this.config.update((c) => ({ ...c, themePreset }));
    this.saveToStorage();
  }

  setBarCount(barCount: number): void {
    this.config.update((c) => ({ ...c, barCount }));
    // Resample bars to new count
    this.bars.update((current) => {
      if (current.length === barCount) return current;
      // Resample
      const resampled: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * current.length);
        resampled.push(current[idx] || 0.5);
      }
      return resampled;
    });
    this.saveToStorage();
  }

  updateParam<K extends keyof SoundwaveConfig>(
    key: K,
    val: SoundwaveConfig[K]
  ): void {
    this.config.update((c) => ({ ...c, [key]: val }));
    this.saveToStorage();
  }

  update3DParam<K extends keyof ThreeDPrintConfig>(
    key: K,
    val: ThreeDPrintConfig[K]
  ): void {
    this.threeDConfig.update((c) => ({ ...c, [key]: val }));
  }

  // Sample Presets
  loadSamplePreset(preset: 'wedding-song' | 'voice-memo' | 'heartbeat'): void {
    if (preset === 'voice-memo') {
      const pcm = createSyntheticVoiceMemoPcm();
      const sampled = samplePcmWaveform(pcm, this.config().barCount);
      this.bars.set(sampled);
      this.config.update((c) => ({
        ...c,
        title: 'Voice Memo: “I Love You”',
        subtitle: 'Recorded with Love • January 1, 2025',
        showSpotifyCode: false,
      }));
    } else if (preset === 'heartbeat') {
      const beatBars: number[] = [];
      const n = this.config().barCount;
      for (let i = 0; i < n; i++) {
        const phase = (i % 8) / 8;
        const val =
          phase === 0.25 || phase === 0.375
            ? 0.95
            : 0.12 + 0.05 * Math.sin((i / n) * Math.PI);
        beatBars.push(Math.round(val * 100) / 100);
      }
      this.bars.set(beatBars);
      this.config.update((c) => ({
        ...c,
        title: 'Baby’s Heartbeat • 140 BPM',
        subtitle: 'First Ultrasound • Our Miracle',
        showSpotifyCode: false,
      }));
    } else {
      // Default acoustic wedding song
      this.bars.set(SAMPLE_NORMALIZED_BARS.slice(0, this.config().barCount));
      this.config.update((c) => ({
        ...c,
        title: 'Can’t Help Falling in Love',
        subtitle: 'Elvis Presley • Our Anniversary • June 15, 2024',
        spotifyLinkOrUri: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        showSpotifyCode: true,
      }));
    }
    this.saveToStorage();
  }

  // Audio File Decoding
  async onAudioFilesSelected(files: File[]): Promise<void> {
    if (files.length === 0) return;
    const file = files[0];
    this.isDecodingAudio.set(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio not supported');
      const ctx = new AudioCtx();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      const channel = decoded.getChannelData(0);

      const sampled = samplePcmWaveform(channel, this.config().barCount);
      this.bars.set(sampled);

      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      this.config.update((c) => ({
        ...c,
        title: c.title === DEFAULT_SOUNDWAVE_CONFIG.title ? cleanName : c.title,
      }));
      ctx.close();
    } catch {
      // Audio parsing error
    } finally {
      this.isDecodingAudio.set(false);
    }
  }

  // Microphone Voice Recording
  async toggleVoiceRecording(): Promise<void> {
    if (this.isRecording()) {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.isRecording.set(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          try {
            const decoded = await ctx.decodeAudioData(arrayBuffer);
            const channel = decoded.getChannelData(0);
            const sampled = samplePcmWaveform(channel, this.config().barCount);
            this.bars.set(sampled);
            this.config.update((c) => ({
              ...c,
              title: 'Voice Note Recording',
              subtitle: new Date().toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }),
            }));
          } finally {
            ctx.close();
          }
        }
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
    } catch {
      this.isRecording.set(false);
    }
  }

  // Export Actions
  downloadSvg(): void {
    const svgStr = this.svgPreview();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    this.triggerDownload(blob, `${this.getSanitizedFileName()}.svg`);
  }

  async downloadPdf(): Promise<void> {
    const blob = await generateSoundwavePdfBlob(this.bars(), this.config());
    this.triggerDownload(blob, `${this.getSanitizedFileName()}.pdf`);
  }

  downloadStl(): void {
    const blob = generateSoundwaveStlBlob(this.bars(), this.threeDConfig());
    this.triggerDownload(blob, `${this.getSanitizedFileName()}-3d.stl`);
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private getSanitizedFileName(): string {
    const base = this.config().title || 'soundwave-art';
    return base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config()));
      } catch {
        // Storage quota guard
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.config.set({ ...DEFAULT_SOUNDWAVE_CONFIG, ...parsed });
        }
      } catch {
        // Safe parse
      }
    }
  }
}
