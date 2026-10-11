import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoGifTrimmerComponent } from './video-gif-trimmer.component';

describe('VideoGifTrimmerComponent', () => {
  let component: VideoGifTrimmerComponent;
  let fixture: ComponentFixture<VideoGifTrimmerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoGifTrimmerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoGifTrimmerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('initializes with default trimmer configuration in empty state', () => {
    expect(component.config().outputFormat).toBe('gif');
    expect(component.config().resolution).toBe('480p');
    expect(component.config().fps).toBe(10);
    expect(component.videoMetadata()).toBeNull();
    expect(component.convertedOutput()).toBeNull();
    expect(component.progress().isConverting).toBe(false);
  });

  it('updates timeline trim start and end points and calculates clip duration', () => {
    component.setStartTime(1.5);
    expect(component.config().startTimeSec).toBe(1.5);

    component.setEndTime(6.0);
    expect(component.config().endTimeSec).toBe(6.0);

    expect(component.clipDurationSeconds()).toBe(4.5);
  });

  it('updates conversion output options (format, resolution, FPS, speed)', () => {
    component.setOutputFormat('video');
    expect(component.config().outputFormat).toBe('video');

    component.setResolution('720p');
    expect(component.config().resolution).toBe('720p');

    component.setFps(20);
    expect(component.config().fps).toBe(20);

    component.setPlaybackSpeed(1.5);
    expect(component.config().playbackSpeed).toBe(1.5);
  });

  it('loads sample video preset and initializes metadata', () => {
    component.loadSampleVideoPreset();
    expect(component.videoMetadata()).not.toBeNull();
    expect(component.videoMetadata()?.durationSeconds).toBeGreaterThan(0);
    expect(component.config().endTimeSec).toBeGreaterThan(0);
  });

  it('handles simulated conversion output and triggers download with URL revocation', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-video-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Set simulated output
    component.setConvertedOutputForTest({
      blob: new Blob(['GIF89a...'], { type: 'image/gif' }),
      url: 'blob:mock-video-url',
      fileName: 'trimmed-clip.gif',
      fileSizeBytes: 204800,
      width: 480,
      height: 270,
      durationSeconds: 3.5,
      format: 'gif',
    });

    expect(component.convertedOutput()).not.toBeNull();
    expect(component.convertedOutput()?.fileName).toBe('trimmed-clip.gif');

    component.downloadOutput();
    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalled();

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('resets back to initial state when clear is called', () => {
    component.loadSampleVideoPreset();
    expect(component.videoMetadata()).not.toBeNull();

    component.resetToEmptyState();
    expect(component.videoMetadata()).toBeNull();
    expect(component.convertedOutput()).toBeNull();
  });

  it('guarantees zero network calls during video loading, trimming, and exports (Privacy Guard)', () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    component.loadSampleVideoPreset();
    component.setStartTime(0.5);
    component.setEndTime(3.0);
    component.setOutputFormat('gif');
    component.setResolution('360p');

    component.setConvertedOutputForTest({
      blob: new Blob(['GIF89a'], { type: 'image/gif' }),
      url: 'blob:test',
      fileName: 'test.gif',
      fileSizeBytes: 1024,
      width: 360,
      height: 200,
      durationSeconds: 2.5,
      format: 'gif',
    });

    component.downloadOutput();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });
});
