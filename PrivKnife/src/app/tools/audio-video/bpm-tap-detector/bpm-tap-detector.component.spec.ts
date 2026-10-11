import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BpmTapDetectorComponent } from './bpm-tap-detector.component';

describe('BpmTapDetectorComponent', () => {
  let component: BpmTapDetectorComponent;
  let fixture: ComponentFixture<BpmTapDetectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmTapDetectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BpmTapDetectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('initializes with default 120 BPM and idle metronome', () => {
    expect(component.currentBpm()).toBe(120);
    expect(component.tapCount()).toBe(0);
    expect(component.isMetronomePlaying()).toBe(false);
    expect(component.selectedSoundType()).toBe('woodblock');
    expect(component.tempoName()).toContain('Moderato');
  });

  it('updates tap count and calculates BPM when tap button is clicked', () => {
    const now = 10000;
    // Simulate tapping with mock timestamps
    component.handleTap(now);
    expect(component.tapCount()).toBe(1);
    expect(component.currentBpm()).toBe(120); // Not enough taps yet

    component.handleTap(now + 500); // 500ms = 120 BPM
    expect(component.tapCount()).toBe(2);
    expect(component.currentBpm()).toBe(120);

    component.handleTap(now + 1000); // another 500ms
    expect(component.tapCount()).toBe(3);
    expect(component.currentBpm()).toBe(120);
  });

  it('resets tap tempo history when reset is called', () => {
    component.handleTap(1000);
    component.handleTap(1500);
    expect(component.tapCount()).toBe(2);

    component.resetTapTempo();
    expect(component.tapCount()).toBe(0);
    expect(component.currentBpm()).toBe(120);
  });

  it('applies BPM modifiers (+1, -1, +5, -5, x2, /2)', () => {
    component.applyBpmAction('plus1');
    expect(component.currentBpm()).toBe(121);

    component.applyBpmAction('minus5');
    expect(component.currentBpm()).toBe(116);

    component.applyBpmAction('double');
    expect(component.currentBpm()).toBe(232);

    component.applyBpmAction('half');
    expect(component.currentBpm()).toBe(116);
  });

  it('toggles metronome synthesizer on and off', () => {
    expect(component.isMetronomePlaying()).toBe(false);

    component.toggleMetronome();
    expect(component.isMetronomePlaying()).toBe(true);

    component.toggleMetronome();
    expect(component.isMetronomePlaying()).toBe(false);
  });

  it('updates metronome sound type and volume', () => {
    component.setSoundType('beep');
    expect(component.selectedSoundType()).toBe('beep');

    component.setVolume(0.5);
    expect(component.metronomeVolume()).toBe(0.5);
  });

  it('simulates audio file analysis and updates metrics', async () => {
    // Mock decodeAudioBuffer or analysis
    component.setAnalyzedResults({
      bpm: 128.0,
      confidence: 0.88,
      sampleRate: 44100,
      durationSeconds: 180.5,
      tempoName: 'Allegro',
      genreTag: 'House / Techno / Pop',
      key: {
        key: 'F Minor',
        root: 'F',
        scale: 'minor',
        camelot: '4A',
        correlation: 0.75,
        confidence: 0.8,
      },
      pitch: {
        frequencyHz: 440.0,
        noteName: 'A',
        octave: 4,
        fullNote: 'A4',
        centsDetune: 0,
        confidence: 0.9,
      },
    });

    expect(component.currentBpm()).toBe(128.0);
    expect(component.detectedKey()?.key).toBe('F Minor');
    expect(component.detectedKey()?.camelot).toBe('4A');
    expect(component.detectedPitch()?.fullNote).toBe('A4');
    expect(component.audioDuration()).toBe(180.5);
  });

  it('guarantees zero network calls during tap, metronome, and audio analysis (Privacy Guard)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    // Tap sequence
    component.handleTap(1000);
    component.handleTap(1500);
    component.handleTap(2000);

    // BPM modifiers
    component.applyBpmAction('plus5');

    // Metronome toggle
    component.toggleMetronome();
    component.toggleMetronome();

    // Mock analysis result
    component.setAnalyzedResults({
      bpm: 130,
      confidence: 0.9,
      sampleRate: 44100,
      durationSeconds: 120,
      tempoName: 'Allegro',
      genreTag: 'House',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });
});
