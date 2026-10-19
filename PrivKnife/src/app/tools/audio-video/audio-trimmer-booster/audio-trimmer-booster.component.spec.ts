import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioTrimmerBoosterComponent } from './audio-trimmer-booster.component';
import { SYNTHETIC_AUDIO_BUFFER } from './test-fixtures';

describe('AudioTrimmerBoosterComponent (Seam 2 UI & Privacy)', () => {
  let component: AudioTrimmerBoosterComponent;
  let fixture: ComponentFixture<AudioTrimmerBoosterComponent>;
  let fetchSpy: any;
  let xhrOpenSpy: any;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [AudioTrimmerBoosterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AudioTrimmerBoosterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrOpenSpy.mockRestore();
  });

  it('should create component with initial default signals', () => {
    expect(component).toBeTruthy();
    expect(component.startTimeSec()).toBe(0);
    expect(component.endTimeSec()).toBe(30);
    expect(component.volumeGainMultiplier()).toBe(1.0);
    expect(component.exportFormat()).toBe('wav');
    expect(component.normalizeAudio()).toBe(false);
    expect(component.isProcessing()).toBe(false);
    expect(component.result()).toBeNull();
  });

  it('should render privacy badge with strict in-browser message', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.c-badge--privacy');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('100% In-Browser • Never Leaves Your Device');
  });

  it('should load synthetic sample audio and initialize duration and waveform', () => {
    component.loadSyntheticSample(SYNTHETIC_AUDIO_BUFFER, 'sample_tune.wav');
    fixture.detectChanges();

    expect(component.originalFileName()).toBe('sample_tune.wav');
    expect(component.totalDurationSec()).toBe(2.0);
    expect(component.startTimeSec()).toBe(0);
    expect(component.endTimeSec()).toBe(2.0);
    expect(component.waveformBars().length).toBeGreaterThan(0);
  });

  it('should update reactive signals when parameters change', () => {
    component.updateStartTime(0.2);
    component.updateEndTime(1.5);
    component.updateVolumeGain(2.5);
    component.updateFadeIn(0.25);
    component.updateFadeOut(0.3);
    component.updateExportFormat('mp3');
    component.toggleNormalize(true);

    expect(component.startTimeSec()).toBe(0.2);
    expect(component.endTimeSec()).toBe(1.5);
    expect(component.volumeGainMultiplier()).toBe(2.5);
    expect(component.fadeInSec()).toBe(0.25);
    expect(component.fadeOutSec()).toBe(0.3);
    expect(component.exportFormat()).toBe('mp3');
    expect(component.normalizeAudio()).toBe(true);
  });

  it('should process audio locally and produce a downloadable result', async () => {
    component.loadSyntheticSample(SYNTHETIC_AUDIO_BUFFER, 'rock_loop.wav');
    component.updateStartTime(0.2);
    component.updateEndTime(1.2);
    component.updateExportFormat('wav');

    await component.processAudio();
    fixture.detectChanges();

    const result = component.result();
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
    expect(result?.mimeType).toBe('audio/wav');
    expect(result?.fileName).toContain('.wav');
    expect(component.downloadUrl()).toBeTruthy();
  });

  it('should process audio to MP3 format when selected', async () => {
    component.loadSyntheticSample(SYNTHETIC_AUDIO_BUFFER, 'rock_loop.wav');
    component.updateStartTime(0.1);
    component.updateEndTime(0.8);
    component.updateExportFormat('mp3');
    component.updateMp3Bitrate(256);

    await component.processAudio();
    fixture.detectChanges();

    const result = component.result();
    expect(result?.success).toBe(true);
    expect(result?.mimeType).toBe('audio/mpeg');
    expect(result?.fileName).toContain('.mp3');
  });

  it('should process audio to iPhone M4R ringtone format when selected', async () => {
    component.loadSyntheticSample(SYNTHETIC_AUDIO_BUFFER, 'chime.wav');
    component.updateStartTime(0);
    component.updateEndTime(1.0);
    component.updateExportFormat('m4r_ringtone');

    await component.processAudio();
    fixture.detectChanges();

    const result = component.result();
    expect(result?.success).toBe(true);
    expect(result?.mimeType).toBe('audio/x-m4r');
    expect(result?.fileName).toContain('.m4r');
  });

  it('should revoke previous object URLs upon reset to prevent memory leaks', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    component.loadSyntheticSample(SYNTHETIC_AUDIO_BUFFER, 'memory_test.wav');
    await component.processAudio();
    const url = component.downloadUrl();
    expect(url).toBeTruthy();

    component.resetToDefaults();
    expect(revokeSpy).toHaveBeenCalledWith(url);
    expect(component.downloadUrl()).toBeNull();
    expect(component.result()).toBeNull();

    revokeSpy.mockRestore();
  });

  it('should revoke active object URLs on component destruction (ngOnDestroy)', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    component.loadSyntheticSample(SYNTHETIC_AUDIO_BUFFER, 'destroy_test.wav');
    await component.processAudio();
    const url = component.downloadUrl();
    expect(url).toBeTruthy();

    fixture.destroy();
    expect(revokeSpy).toHaveBeenCalledWith(url);

    revokeSpy.mockRestore();
  });

  it('should trigger browser download using anchor element', async () => {
    component.loadSyntheticSample(SYNTHETIC_AUDIO_BUFFER, 'download_test.wav');
    await component.processAudio();

    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      set href(val: string) {},
      set download(val: string) {},
      click: clickSpy,
    } as any);

    component.downloadResult();
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it('should maintain ZERO network exfiltration during full workflow', async () => {
    component.loadSyntheticSample(SYNTHETIC_AUDIO_BUFFER, 'confidential_call.wav');
    component.updateStartTime(0.2);
    component.updateEndTime(1.0);
    component.updateVolumeGain(2.0);
    component.updateExportFormat('wav');

    await component.processAudio();
    fixture.detectChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
  });
});
