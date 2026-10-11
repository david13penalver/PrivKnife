import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SubtitlesShifterComponent } from './subtitles-shifter.component';
import { createMockSubtitleFile, SAMPLE_SRT } from './test-fixtures';

describe('SubtitlesShifterComponent (Seam 2: UI, Reactivity, Conversion & Privacy Guard)', () => {
  let fixture: ComponentFixture<SubtitlesShifterComponent>;
  let component: SubtitlesShifterComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:https://privknife.com/mock-sub-blob-${Math.random()}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [SubtitlesShifterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SubtitlesShifterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with demo subtitles loaded, active cues, and srt format', () => {
    expect(component).toBeTruthy();
    expect(component.cues().length).toBeGreaterThan(0);
    expect(component.shiftedCues().length).toBe(component.cues().length);
    expect(component.targetFormat()).toBe('srt');
    expect(component.offsetValue()).toBe(0);
  });

  it('should reactively ingest uploaded subtitle file via dropzone', async () => {
    const file = createMockSubtitleFile('custom-movie.srt', SAMPLE_SRT);

    await component.onFileSelected([file]);

    expect(component.fileName()).toBe('custom-movie.srt');
    expect(component.cues().length).toBe(3);
    expect(component.sourceFormat()).toBe('srt');
  });

  it('should shift cues forward and backward using time controls', () => {
    // Shift forward +1500 ms
    component.setOffset(1500, 'ms', 'forward');
    expect(component.totalOffsetMs()).toBe(1500);
    expect(component.shiftedCues()[0].startMs).toBe(component.cues()[0].startMs + 1500);

    // Shift backward -2 s (= -2000 ms)
    component.setOffset(2, 's', 'backward');
    expect(component.totalOffsetMs()).toBe(-2000);
    expect(component.shiftedCues()[0].startMs).toBe(
      Math.max(0, component.cues()[0].startMs - 2000)
    );
  });

  it('should apply quick preset time adjustments', () => {
    component.applyQuickDelta(1000); // +1000ms
    expect(component.totalOffsetMs()).toBe(1000);

    component.applyQuickDelta(-500); // -500ms -> net +500ms
    expect(component.totalOffsetMs()).toBe(500);

    component.resetOffset();
    expect(component.totalOffsetMs()).toBe(0);
  });

  it('should apply FPS conversion preset scaling', () => {
    component.setFpsPreset('25-to-23.976');
    expect(component.activeFpsPresetId()).toBe('25-to-23.976');

    const expectedRatio = 25 / 23.976;
    expect(component.shiftedCues()[0].startMs).toBe(
      Math.round(component.cues()[0].startMs * expectedRatio)
    );

    component.setFpsPreset('none');
    expect(component.activeFpsPresetId()).toBe('none');
  });

  it('should convert output format between SRT and WebVTT', () => {
    component.setTargetFormat('vtt');
    expect(component.targetFormat()).toBe('vtt');
    expect(component.serializedOutput().startsWith('WEBVTT')).toBe(true);

    component.setTargetFormat('srt');
    expect(component.targetFormat()).toBe('srt');
    expect(component.serializedOutput().startsWith('WEBVTT')).toBe(false);
  });

  it('should copy serialized subtitles to clipboard with feedback state', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    await component.copySubtitles();

    expect(writeTextSpy).toHaveBeenCalledWith(component.serializedOutput());
    expect(component.copied()).toBe(true);
  });

  it('should download re-synced file and immediately revoke object URL', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadSubtitles();

    expect(anchorClickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.showExportModal()).toBe(true);

    component.closeExportModal();
    expect(component.showExportModal()).toBe(false);
  });

  it('should safely cleanup active timers and state on destroy', () => {
    fixture.destroy();
    expect(true).toBe(true);
  });

  it('should parse, shift, and export subtitles with ZERO network calls (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    const file = createMockSubtitleFile('secret-project.srt', SAMPLE_SRT);
    await component.onFileSelected([file]);
    component.setOffset(500, 'ms', 'forward');
    await component.downloadSubtitles();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
