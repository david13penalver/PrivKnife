import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Dropzone } from '../../../components/dropzone/dropzone';
import { Card } from '../../../components/card/card';
import {
  adjustBpm,
  calculateTapBpm,
  detectBpmFromPcm,
  detectKeyFromPcm,
  detectPitchFromPcm,
  extractWaveformPeaks,
  getTempoDescription,
} from './engine';
import { MetronomeSynthesizer } from './metronome';
import {
  BpmAnalysisResult,
  KeyResult,
  MetronomeSoundType,
  PitchResult,
  WaveformPeaks,
} from './types';

@Component({
  selector: 'app-bpm-tap-detector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Dropzone, Card],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1080px;">
      <!-- Tool Header & Privacy Badge -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            🛡️ 100% In-Browser Audio Processing &bull; Zero Server Ingestion &bull; Zero Telemetry
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">
          Audio BPM, Pitch &amp; Key Tap Detector
        </h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 700px; color: var(--color-text-secondary); font-size: 1.1rem;">
          Detect tempo, musical key, and pitch in real time. Drop any audio file for instant client-side analysis,
          or tap along to find the tempo with an audible metronome click track.
        </p>
      </div>

      <!-- Main Interactive Deck: Hero BPM Readout & Tap Tempo Pad -->
      <div class="l-columns__area g--margin-bottom-6">
        <app-card>
          <div class="l-columns l-columns--1" style="gap: 24px;">
            <!-- Big Hero Readout Bar -->
            <div class="g--flex-center" style="justify-content: space-around; flex-wrap: wrap; gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--color-border);">
              <!-- BPM Counter -->
              <div class="g--text-center">
                <div class="g--text-muted" style="font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">
                  Tempo Readout
                </div>
                <div class="g--flex-center" style="gap: 12px;">
                  <span
                    class="c-bpm-number"
                    style="font-size: clamp(3.2rem, 8vw, 4.5rem); font-weight: 900; line-height: 1; font-family: monospace; color: var(--color-primary);"
                    [class.c-bpm-number--pulsing]="beatFlash()">
                    {{ currentBpm() }}
                  </span>
                  <div style="text-align: left;">
                    <div style="font-size: 1.25rem; font-weight: 700; line-height: 1.1;">BPM</div>
                    <div
                      class="c-beat-dot"
                      [class.c-beat-dot--active]="beatFlash()"
                      style="width: 14px; height: 14px; border-radius: 50%; margin-top: 6px; background: var(--color-border); transition: background 0.08s;">
                    </div>
                  </div>
                </div>
                <!-- Tempo & Genre Badges -->
                <div class="g--flex-center g--margin-top-2" style="gap: 8px;">
                  <app-badge variant="neutral">{{ tempoName() }}</app-badge>
                  <app-badge variant="info">{{ genreTag() }}</app-badge>
                </div>
              </div>

              <!-- Secondary Metrics: Key Signature & Pitch -->
              <div class="g--flex-center" style="gap: 20px; flex-wrap: wrap;">
                <!-- Key Signature -->
                <div class="c-metric-tile" style="padding: 12px 18px; background: var(--color-surface-hover); border-radius: 8px; text-align: center; min-width: 130px;">
                  <div class="g--text-muted" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Detected Key</div>
                  <div style="font-size: 1.3rem; font-weight: 800; margin: 4px 0;">
                    {{ detectedKey() ? detectedKey()!.key : '—' }}
                  </div>
                  <div style="font-size: 0.8rem; color: var(--color-primary); font-weight: 600;">
                    {{ detectedKey() ? 'Camelot ' + detectedKey()!.camelot : 'Awaiting audio' }}
                  </div>
                </div>

                <!-- Pitch & Tuning -->
                <div class="c-metric-tile" style="padding: 12px 18px; background: var(--color-surface-hover); border-radius: 8px; text-align: center; min-width: 130px;">
                  <div class="g--text-muted" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Pitch Tuning</div>
                  <div style="font-size: 1.3rem; font-weight: 800; margin: 4px 0;">
                    {{ detectedPitch() ? detectedPitch()!.fullNote : '—' }}
                  </div>
                  <div style="font-size: 0.8rem; color: var(--color-text-secondary);">
                    {{ detectedPitch() ? detectedPitch()!.frequencyHz + ' Hz (' + (detectedPitch()!.centsDetune > 0 ? '+' : '') + detectedPitch()!.centsDetune + 'c)' : 'Standard 440 Hz' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Interactive Tap Tempo Button -->
            <div class="g--text-center">
              <button
                type="button"
                class="c-tap-pad"
                (click)="onTapButtonClick()"
                [class.c-tap-pad--active]="isTapPressed()"
                style="width: 100%; max-width: 500px; height: 110px; border-radius: 16px; border: 2px solid var(--color-primary); background: var(--color-surface); cursor: pointer; transition: transform 0.08s, background 0.15s, box-shadow 0.15s; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);">
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--color-text); letter-spacing: 0.02em;">
                  🥁 TAP TEMPO HERE
                </div>
                <div class="g--text-muted" style="font-size: 0.85rem; margin-top: 4px;">
                  Click or Press <kbd style="padding: 2px 6px; background: var(--color-bg); border-radius: 4px; border: 1px solid var(--color-border); font-family: monospace;">Space</kbd> / <kbd style="padding: 2px 6px; background: var(--color-bg); border-radius: 4px; border: 1px solid var(--color-border); font-family: monospace;">T</kbd>
                  &bull; <strong style="color: var(--color-primary);">{{ tapCount() }}</strong> {{ tapCount() === 1 ? 'tap' : 'taps' }}
                </div>
              </button>

              <!-- Fine-Tune Modifiers & Reset -->
              <div class="g--flex-center g--margin-top-4" style="gap: 8px; flex-wrap: wrap;">
                <button type="button" class="c-button c-button--outline c-button--small" (click)="applyBpmAction('minus5')">-5</button>
                <button type="button" class="c-button c-button--outline c-button--small" (click)="applyBpmAction('minus1')">-1</button>
                <button type="button" class="c-button c-button--outline c-button--small" (click)="applyBpmAction('half')">&frac12;x</button>
                <button type="button" class="c-button c-button--outline c-button--small" (click)="applyBpmAction('double')">2x</button>
                <button type="button" class="c-button c-button--outline c-button--small" (click)="applyBpmAction('plus1')">+1</button>
                <button type="button" class="c-button c-button--outline c-button--small" (click)="applyBpmAction('plus5')">+5</button>
                <button type="button" class="c-button c-button--danger c-button--small" (click)="resetTapTempo()">Reset Taps</button>
              </div>
            </div>

            <!-- Metronome Controls Bar -->
            <div class="c-metronome-bar" style="padding: 16px; background: var(--color-surface-hover); border-radius: 12px;">
              <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                <!-- Play / Stop Metronome -->
                <div class="g--flex-center" style="gap: 12px;">
                  <button
                    type="button"
                    class="c-button c-button--primary"
                    (click)="toggleMetronome()">
                    {{ isMetronomePlaying() ? '⏹ Stop Metronome' : '▶ Play Metronome' }}
                  </button>
                  <span class="g--text-muted" style="font-size: 0.85rem;">
                    Key <kbd style="padding: 2px 6px; background: var(--color-bg); border-radius: 4px; border: 1px solid var(--color-border); font-family: monospace;">M</kbd>
                  </span>
                </div>

                <!-- Sound Style Selector -->
                <div class="g--flex-center" style="gap: 8px;">
                  <span class="g--text-muted" style="font-size: 0.85rem; font-weight: 600;">Sound:</span>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="selectedSoundType() === 'woodblock'"
                    [class.c-button--outline]="selectedSoundType() !== 'woodblock'"
                    (click)="setSoundType('woodblock')">
                    Woodblock
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="selectedSoundType() === 'beep'"
                    [class.c-button--outline]="selectedSoundType() !== 'beep'"
                    (click)="setSoundType('beep')">
                    Beep
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="selectedSoundType() === 'hihat'"
                    [class.c-button--outline]="selectedSoundType() !== 'hihat'"
                    (click)="setSoundType('hihat')">
                    Hi-Hat
                  </button>
                </div>

                <!-- Volume Slider -->
                <div class="g--flex-center" style="gap: 8px;">
                  <span class="g--text-muted" style="font-size: 0.85rem;">Vol:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    [ngModel]="metronomeVolume()"
                    (ngModelChange)="setVolume($event)"
                    style="width: 80px; accent-color: var(--color-primary);" />
                  <span style="font-size: 0.85rem; font-family: monospace; min-width: 35px;">
                    {{ Math.round(metronomeVolume() * 100) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </app-card>
      </div>

      <!-- File Audio Analyzer & Waveform Player Section -->
      <div class="l-columns__area g--margin-bottom-6">
        <app-card title="Audio File Analyzer (MP3, WAV, FLAC, M4A, OGG)">
          <div class="l-columns l-columns--1" style="gap: 20px;">
            <!-- File Dropzone -->
            <app-dropzone
              label="Drop audio track here or click to browse"
              hint="Supports .mp3, .wav, .flac, .m4a, .ogg — Analyzed 100% offline in browser memory"
              accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
              [multiple]="false"
              (filesSelected)="onAudioFilesSelected($event)">
            </app-dropzone>

            <!-- Loading Spinner / Status -->
            @if (isAnalyzing()) {
              <div class="g--text-center g--margin-y-4">
                <div style="font-size: 1.1rem; font-weight: 600; color: var(--color-primary);">
                  ⏳ {{ analysisProgress() || 'Decoding & analyzing audio waveform...' }}
                </div>
                <div class="g--text-muted" style="font-size: 0.85rem; margin-top: 4px;">
                  Running low-pass filter, onset extraction, and Krumhansl-Schmuckler key correlation...
                </div>
              </div>
            }

            <!-- Waveform Canvas & Audio Playback Controls -->
            @if (audioFileName()) {
              <div class="c-waveform-panel" style="padding: 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px;">
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                  <div style="font-weight: 700; font-size: 1rem; color: var(--color-text);">
                    🎵 {{ audioFileName() }}
                  </div>
                  <div class="g--text-muted" style="font-size: 0.85rem;">
                    Duration: <strong>{{ formattedDuration() }}</strong>
                  </div>
                </div>

                <!-- Canvas Waveform Viewport -->
                <div style="position: relative; width: 100%; height: 90px; background: var(--color-bg); border-radius: 8px; overflow: hidden; cursor: pointer;" (click)="onWaveformClick($event)">
                  <canvas #waveformCanvas style="width: 100%; height: 100%; display: block;"></canvas>
                </div>

                <!-- Playback Control Toolbar -->
                <div class="g--flex-center g--margin-top-3" style="justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                  <div class="g--flex-center" style="gap: 8px;">
                    <button
                      type="button"
                      class="c-button c-button--small c-button--primary"
                      (click)="toggleAudioPlayback()">
                      {{ isPlayingAudio() ? '⏸ Pause Track' : '▶ Play Track' }}
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small c-button--outline"
                      (click)="stopAudioPlayback()">
                      ⏹ Stop
                    </button>
                    <span class="g--text-muted" style="font-size: 0.85rem; font-family: monospace;">
                      {{ formatTime(currentPlaybackTime()) }} / {{ formattedDuration() }}
                    </span>
                  </div>

                  <div class="g--flex-center" style="gap: 8px;">
                    <button
                      type="button"
                      class="c-button c-button--small c-button--outline"
                      (click)="copyMetricsToClipboard()">
                      📋 Copy BPM &amp; Key Info
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </app-card>
      </div>

      <!-- SEO Educational & Documentation Block -->
      <div class="l-columns__area g--margin-bottom-8">
        <app-card title="How Client-Side BPM & Key Detection Works">
          <div style="color: var(--color-text-secondary); line-height: 1.7; font-size: 0.95rem;">
            <p>
              Traditional online tempo checkers require sending your private audio files to remote cloud servers.
              <strong>PrivKnife</strong> processes everything directly in your browser using the <strong>Web Audio API</strong>:
            </p>
            <ul style="margin: 12px 0 16px 20px; list-style-type: disc;">
              <li><strong>Zero Uploads:</strong> Audio buffers are decoded entirely in local device memory using <code>AudioContext.decodeAudioData()</code>.</li>
              <li><strong>Percussion Isolation:</strong> An IIR low-pass filter (cutoff &le; 150 Hz) extracts kick drums and bass transients.</li>
              <li><strong>Onset Autocorrelation:</strong> Periodicity analysis determines dominant beat intervals with harmonic ambiguity checks.</li>
              <li><strong>Krumhansl-Schmuckler Key Finding:</strong> 12-class chromagram profile correlation maps notes to both traditional keys and the <strong>Camelot Wheel</strong> for seamless DJ harmonic mixing.</li>
            </ul>
          </div>
        </app-card>
      </div>
    </div>
  `,
  styles: [
    `
      .c-bpm-number--pulsing {
        transform: scale(1.04);
        transition: transform 0.08s ease-out;
      }
      .c-beat-dot--active {
        background: var(--color-primary) !important;
        box-shadow: 0 0 12px var(--color-primary);
      }
      .c-tap-pad:hover {
        background: var(--color-surface-hover) !important;
      }
      .c-tap-pad--active {
        transform: scale(0.97) !important;
        background: var(--color-surface-hover) !important;
      }
    `,
  ],
})
export class BpmTapDetectorComponent implements OnInit, OnDestroy {
  readonly Math = Math;

  @ViewChild('waveformCanvas')
  waveformCanvasRef?: ElementRef<HTMLCanvasElement>;

  // Signals
  readonly currentBpm = signal<number>(120);
  readonly tapCount = signal<number>(0);
  readonly isMetronomePlaying = signal<boolean>(false);
  readonly selectedSoundType = signal<MetronomeSoundType>('woodblock');
  readonly metronomeVolume = signal<number>(0.8);
  readonly detectedKey = signal<KeyResult | null>(null);
  readonly detectedPitch = signal<PitchResult | null>(null);
  readonly audioDuration = signal<number>(0);
  readonly audioFileName = signal<string | null>(null);
  readonly isAnalyzing = signal<boolean>(false);
  readonly analysisProgress = signal<string>('');
  readonly isPlayingAudio = signal<boolean>(false);
  readonly currentPlaybackTime = signal<number>(0);
  readonly beatFlash = signal<boolean>(false);
  readonly isTapPressed = signal<boolean>(false);

  // Computed state
  readonly tempoInfo = computed(() => getTempoDescription(this.currentBpm()));
  readonly tempoName = computed(() => this.tempoInfo().tempoName);
  readonly genreTag = computed(() => this.tempoInfo().genreTag);
  readonly formattedDuration = computed(() =>
    this.formatTime(this.audioDuration())
  );

  // Internal state
  private tapTimestamps: number[] = [];
  private metronome!: MetronomeSynthesizer;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private audioSourceNode: AudioBufferSourceNode | null = null;
  private audioStartTime = 0;
  private audioPauseOffset = 0;
  private playbackTimerId: any = null;
  private waveformPeaks: Float32Array | null = null;

  ngOnInit(): void {
    this.metronome = new MetronomeSynthesizer();
    this.metronome.bpm = this.currentBpm();
    this.metronome.soundType = this.selectedSoundType();
    this.metronome.volume = this.metronomeVolume();

    this.metronome.setOnBeat(() => {
      this.triggerBeatPulse();
    });
  }

  ngOnDestroy(): void {
    this.stopAudioPlayback();
    if (this.metronome) {
      this.metronome.dispose();
    }
    if (this.audioContext && typeof this.audioContext.close === 'function') {
      try {
        this.audioContext.close();
      } catch {
        // Safe disposal
      }
    }
  }

  // Keyboard Shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    if (event.code === 'Space' || event.code === 'KeyT') {
      event.preventDefault();
      this.handleTap(performance.now());
    } else if (event.code === 'KeyM') {
      event.preventDefault();
      this.toggleMetronome();
    }
  }

  onTapButtonClick(): void {
    this.handleTap(performance.now());
  }

  handleTap(timestamp: number): void {
    this.isTapPressed.set(true);
    setTimeout(() => this.isTapPressed.set(false), 90);
    this.triggerBeatPulse();

    this.tapTimestamps.push(timestamp);
    const result = calculateTapBpm(this.tapTimestamps);
    this.tapCount.set(result.tapCount);

    if (result.bpm > 0) {
      this.currentBpm.set(result.bpm);
      if (this.metronome) {
        this.metronome.bpm = result.bpm;
      }
    }
  }

  resetTapTempo(): void {
    this.tapTimestamps = [];
    this.tapCount.set(0);
    this.currentBpm.set(120);
    if (this.metronome) {
      this.metronome.bpm = 120;
    }
  }

  applyBpmAction(
    action: 'plus1' | 'minus1' | 'plus5' | 'minus5' | 'double' | 'half'
  ): void {
    const updated = adjustBpm(this.currentBpm(), action);
    this.currentBpm.set(updated);
    if (this.metronome) {
      this.metronome.bpm = updated;
    }
  }

  toggleMetronome(): void {
    if (!this.metronome) return;
    this.metronome.bpm = this.currentBpm();
    this.metronome.soundType = this.selectedSoundType();
    this.metronome.volume = this.metronomeVolume();
    const playing = this.metronome.toggle();
    this.isMetronomePlaying.set(playing);
  }

  setSoundType(sound: MetronomeSoundType): void {
    this.selectedSoundType.set(sound);
    if (this.metronome) {
      this.metronome.soundType = sound;
    }
  }

  setVolume(volume: number): void {
    this.metronomeVolume.set(volume);
    if (this.metronome) {
      this.metronome.volume = volume;
    }
  }

  private triggerBeatPulse(): void {
    this.beatFlash.set(true);
    setTimeout(() => this.beatFlash.set(false), 80);
  }

  // Audio File Selection & DSP Analysis
  async onAudioFilesSelected(files: File[]): Promise<void> {
    if (files.length === 0) return;
    const file = files[0];
    this.audioFileName.set(file.name);
    this.isAnalyzing.set(true);
    this.analysisProgress.set('Reading audio file...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.analysisProgress.set('Decoding audio PCM samples...');

      if (!this.audioContext && typeof window !== 'undefined') {
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }

      if (!this.audioContext) {
        throw new Error('Web Audio API is not supported in this browser.');
      }

      const decodedBuffer = await this.audioContext.decodeAudioData(
        arrayBuffer
      );
      this.audioBuffer = decodedBuffer;
      const channelData = decodedBuffer.getChannelData(0);
      const sampleRate = decodedBuffer.sampleRate;

      this.analysisProgress.set('Detecting tempo & onset peaks...');
      const bpmResult = detectBpmFromPcm(channelData, sampleRate);

      this.analysisProgress.set('Analyzing pitch & key signatures...');
      const keyResult = detectKeyFromPcm(channelData, sampleRate);
      const pitchResult = detectPitchFromPcm(channelData, sampleRate);

      const waveform = extractWaveformPeaks(channelData, 300);
      this.waveformPeaks = waveform.peaks;

      this.setAnalyzedResults({
        ...bpmResult,
        key: keyResult,
        pitch: pitchResult,
      });

      this.drawWaveform();
    } catch (err: any) {
      this.analysisProgress.set(`Error: ${err?.message || 'Failed to analyze'}`);
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  setAnalyzedResults(results: BpmAnalysisResult): void {
    if (results.bpm > 0) {
      this.currentBpm.set(results.bpm);
      if (this.metronome) {
        this.metronome.bpm = results.bpm;
      }
    }
    if (results.key) {
      this.detectedKey.set(results.key);
    }
    if (results.pitch) {
      this.detectedPitch.set(results.pitch);
    }
    this.audioDuration.set(results.durationSeconds);
  }

  // Audio Playback Preview
  toggleAudioPlayback(): void {
    if (this.isPlayingAudio()) {
      this.pauseAudioPlayback();
    } else {
      this.playAudioPlayback();
    }
  }

  private playAudioPlayback(): void {
    if (!this.audioBuffer || !this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.audioSourceNode = this.audioContext.createBufferSource();
    this.audioSourceNode.buffer = this.audioBuffer;
    this.audioSourceNode.connect(this.audioContext.destination);

    this.audioStartTime =
      this.audioContext.currentTime - this.audioPauseOffset;
    this.audioSourceNode.start(0, this.audioPauseOffset);
    this.isPlayingAudio.set(true);

    this.audioSourceNode.onended = () => {
      if (
        this.currentPlaybackTime() >=
        this.audioBuffer!.duration - 0.2
      ) {
        this.stopAudioPlayback();
      }
    };

    this.playbackTimerId = setInterval(() => {
      if (this.audioContext && this.isPlayingAudio()) {
        const elapsed = this.audioContext.currentTime - this.audioStartTime;
        this.currentPlaybackTime.set(
          Math.min(this.audioDuration(), elapsed)
        );
        this.drawWaveform();
      }
    }, 50);
  }

  private pauseAudioPlayback(): void {
    if (this.audioSourceNode) {
      try {
        this.audioSourceNode.stop();
      } catch {
        // Safe stop
      }
      this.audioSourceNode = null;
    }
    if (this.audioContext) {
      this.audioPauseOffset =
        this.audioContext.currentTime - this.audioStartTime;
    }
    this.isPlayingAudio.set(false);
    if (this.playbackTimerId) {
      clearInterval(this.playbackTimerId);
      this.playbackTimerId = null;
    }
  }

  stopAudioPlayback(): void {
    this.pauseAudioPlayback();
    this.audioPauseOffset = 0;
    this.currentPlaybackTime.set(0);
    this.drawWaveform();
  }

  onWaveformClick(event: MouseEvent): void {
    if (!this.audioBuffer || !this.waveformCanvasRef) return;
    const canvas = this.waveformCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = progress * this.audioDuration();

    const wasPlaying = this.isPlayingAudio();
    this.pauseAudioPlayback();
    this.audioPauseOffset = seekTime;
    this.currentPlaybackTime.set(seekTime);
    this.drawWaveform();

    if (wasPlaying) {
      this.playAudioPlayback();
    }
  }

  private drawWaveform(): void {
    if (!this.waveformCanvasRef || !this.waveformPeaks) return;
    const canvas = this.waveformCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const height = (canvas.height = 90);

    ctx.clearRect(0, 0, width, height);

    const peaks = this.waveformPeaks;
    const barWidth = width / peaks.length;
    const centerY = height / 2;
    const playheadX =
      this.audioDuration() > 0
        ? (this.currentPlaybackTime() / this.audioDuration()) * width
        : 0;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const magnitude = peaks[i] * (height / 2 - 4);
      const isPast = x <= playheadX;

      ctx.fillStyle = isPast ? '#6366F1' : '#475569';
      ctx.fillRect(x, centerY - magnitude, Math.max(1, barWidth - 1), magnitude * 2);
    }

    // Draw playhead line
    if (this.audioDuration() > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(playheadX - 1, 0, 2, height);
    }
  }

  copyMetricsToClipboard(): void {
    const key = this.detectedKey()
      ? `${this.detectedKey()!.key} (Camelot ${this.detectedKey()!.camelot})`
      : 'N/A';
    const pitch = this.detectedPitch()
      ? `${this.detectedPitch()!.fullNote} (${this.detectedPitch()!.frequencyHz} Hz)`
      : 'N/A';
    const info = `BPM: ${this.currentBpm()} (${this.tempoName()})\nKey: ${key}\nPitch: ${pitch}\nTrack: ${this.audioFileName() || 'Tapped'}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(info);
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
