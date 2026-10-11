import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetronomeSynthesizer } from './metronome';

describe('MetronomeSynthesizer', () => {
  let mockAudioContext: any;
  let mockOscillator: any;
  let mockGain: any;
  let metronome: MetronomeSynthesizer;

  beforeEach(() => {
    vi.useFakeTimers();

    mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockAudioContext = {
      currentTime: 0,
      state: 'running',
      resume: vi.fn(),
      close: vi.fn(),
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
    };

    metronome = new MetronomeSynthesizer(mockAudioContext);
  });

  afterEach(() => {
    metronome.dispose();
    vi.useRealTimers();
  });

  it('initializes with default values and clamps BPM and volume', () => {
    expect(metronome.bpm).toBe(120);
    expect(metronome.soundType).toBe('woodblock');
    expect(metronome.volume).toBe(0.8);
    expect(metronome.isPlaying).toBe(false);

    metronome.bpm = 400;
    expect(metronome.bpm).toBe(320);

    metronome.bpm = 5;
    expect(metronome.bpm).toBe(20);

    metronome.volume = 1.5;
    expect(metronome.volume).toBe(1);

    metronome.volume = -0.5;
    expect(metronome.volume).toBe(0);
  });

  it('starts metronome, resumes suspended context, and schedules oscillators', () => {
    mockAudioContext.state = 'suspended';
    metronome.start();

    expect(mockAudioContext.resume).toHaveBeenCalled();
    expect(metronome.isPlaying).toBe(true);

    // Advance timer to trigger scheduler tick
    vi.advanceTimersByTime(30);

    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalled();
  });

  it('toggles start and stop state smoothly', () => {
    const started = metronome.toggle();
    expect(started).toBe(true);
    expect(metronome.isPlaying).toBe(true);

    const stopped = metronome.toggle();
    expect(stopped).toBe(false);
    expect(metronome.isPlaying).toBe(false);
  });

  it('notifies onBeat callback when beats are scheduled', () => {
    const beatSpy = vi.fn();
    metronome.setOnBeat(beatSpy);
    metronome.start();

    vi.advanceTimersByTime(100);

    expect(beatSpy).toHaveBeenCalled();
  });

  it('changes sound types and schedules corresponding synthesizer parameters', () => {
    metronome.soundType = 'beep';
    metronome.start();
    vi.advanceTimersByTime(30);

    expect(mockOscillator.type).toBe('sine');

    metronome.stop();
    metronome.soundType = 'hihat';
    metronome.start();
    vi.advanceTimersByTime(30);

    expect(mockOscillator.type).toBe('triangle');
  });

  it('disposes resources and closes audio context safely', () => {
    metronome.start();
    metronome.dispose();

    expect(metronome.isPlaying).toBe(false);
    expect(mockAudioContext.close).toHaveBeenCalled();
  });
});
