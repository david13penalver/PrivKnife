import { MetronomeSoundType } from './types';

/**
 * Web Audio API synthesized metronome with high-precision lookahead scheduling.
 * Operates 100% in-browser with zero external audio samples or network requests.
 */
export class MetronomeSynthesizer {
  private audioCtx: AudioContext | null = null;
  private timerId: any = null;
  private isRunning = false;
  private nextBeatTime = 0;
  private currentBeat = 0; // 0 to 3 for 4/4
  private _bpm = 120;
  private _soundType: MetronomeSoundType = 'woodblock';
  private _volume = 0.8;
  private onBeatCallback?: (beat: number) => void;

  constructor(customAudioContext?: AudioContext | null) {
    if (customAudioContext) {
      this.audioCtx = customAudioContext;
    }
  }

  get bpm(): number {
    return this._bpm;
  }

  set bpm(val: number) {
    this._bpm = Math.max(20, Math.min(320, Math.round(val)));
  }

  get soundType(): MetronomeSoundType {
    return this._soundType;
  }

  set soundType(val: MetronomeSoundType) {
    this._soundType = val;
  }

  get volume(): number {
    return this._volume;
  }

  set volume(val: number) {
    this._volume = Math.max(0, Math.min(1, val));
  }

  get isPlaying(): boolean {
    return this.isRunning;
  }

  setOnBeat(callback: (beat: number) => void): void {
    this.onBeatCallback = callback;
  }

  start(): void {
    if (this.isRunning) return;
    this.ensureAudioContext();

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        this.audioCtx.resume();
      } catch {
        // Safe context resume
      }
    }

    this.isRunning = true;
    this.currentBeat = 0;
    this.nextBeatTime = (this.audioCtx?.currentTime ?? 0) + 0.05;

    this.timerId = setInterval(() => this.scheduler(), 25);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  private scheduler(): void {
    if (!this.isRunning) return;

    const currentAudioTime = this.audioCtx?.currentTime ?? 0;
    const lookAheadTime = 0.1; // 100ms lookahead
    while (this.nextBeatTime < currentAudioTime + lookAheadTime) {
      this.scheduleClick(this.nextBeatTime, this.currentBeat);
      this.advanceBeat();
    }
  }

  private advanceBeat(): void {
    const secondsPerBeat = 60.0 / this._bpm;
    this.nextBeatTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat + 1) % 4;
  }

  private scheduleClick(time: number, beat: number): void {
    if (!this.audioCtx) return;

    if (this.onBeatCallback) {
      const delayMs = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
      setTimeout(() => {
        if (this.isRunning && this.onBeatCallback) {
          this.onBeatCallback(beat);
        }
      }, delayMs);
    }

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const isAccent = beat === 0;

      if (this._soundType === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1200 : 880, time);
        gain.gain.setValueAtTime(this._volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        osc.start(time);
        osc.stop(time + 0.045);
      } else if (this._soundType === 'hihat') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isAccent ? 3500 : 2500, time);
        gain.gain.setValueAtTime(this._volume * 0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
        osc.start(time);
        osc.stop(time + 0.03);
      } else {
        // Woodblock click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1000 : 700, time);
        osc.frequency.exponentialRampToValueAtTime(
          isAccent ? 600 : 400,
          time + 0.03
        );
        gain.gain.setValueAtTime(this._volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        osc.start(time);
        osc.stop(time + 0.04);
      }
    } catch {
      // Audio node scheduling guard
    }
  }

  private ensureAudioContext(): void {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  dispose(): void {
    this.stop();
    if (this.audioCtx && typeof this.audioCtx.close === 'function') {
      try {
        this.audioCtx.close();
      } catch {
        // Safe disposal
      }
      this.audioCtx = null;
    }
  }
}
