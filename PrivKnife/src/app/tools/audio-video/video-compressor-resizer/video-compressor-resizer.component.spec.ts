import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VideoCompressorResizerComponent } from './video-compressor-resizer.component';
import { SYNTHETIC_VIDEO_BLOB } from './test-fixtures';

describe('VideoCompressorResizerComponent (Seam 2 UI & Privacy)', () => {
  let component: VideoCompressorResizerComponent;
  let fixture: ComponentFixture<VideoCompressorResizerComponent>;
  let fetchSpy: any;
  let xhrOpenSpy: any;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [VideoCompressorResizerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoCompressorResizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrOpenSpy.mockRestore();
  });

  it('should create component with default signals and empty state', () => {
    expect(component).toBeTruthy();
    expect(component.compressionPreset()).toBe('target_size_8mb');
    expect(component.aspectRatio()).toBe('original');
    expect(component.maxResolution()).toBe('720p');
    expect(component.outputFormat()).toBe('mp4');
    expect(component.audioMute()).toBe(false);
    expect(component.isProcessing()).toBe(false);
    expect(component.result()).toBeNull();
  });

  it('should render privacy trust badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.c-badge--privacy');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('100% In-Browser • Never Leaves Your Device');
  });

  it('should update reactive options and recompute compression plan', () => {
    component.updatePreset('target_size_25mb');
    component.updateAspectRatio('9:16_vertical');
    component.updateResolution('1080p');
    component.toggleAudioMute(true);
    component.updateFormat('mp4');

    expect(component.compressionPreset()).toBe('target_size_25mb');
    expect(component.aspectRatio()).toBe('9:16_vertical');
    expect(component.maxResolution()).toBe('1080p');
    expect(component.audioMute()).toBe(true);

    const plan = component.compressionPlan();
    expect(plan.targetSizeBytes).toBe(25 * 1024 * 1024);
    expect(plan.audioBitrateBps).toBe(0);
    expect(plan.targetHeight).toBe(1080);
  });

  it('should load sample video preset and update file metadata', () => {
    component.loadSampleVideo(SYNTHETIC_VIDEO_BLOB, 'demo_action.mp4', 35, 1920, 1080);
    fixture.detectChanges();

    expect(component.originalFileName()).toBe('demo_action.mp4');
    expect(component.videoDurationSec()).toBe(35);
    expect(component.sourceWidth()).toBe(1920);
    expect(component.sourceHeight()).toBe(1080);
    expect(component.hasVideoData()).toBe(true);
  });

  it('should process video and generate downloadable deliverable', async () => {
    component.loadSampleVideo(SYNTHETIC_VIDEO_BLOB, 'epic_moment.mp4', 20, 1920, 1080);
    component.updatePreset('target_size_8mb');
    component.updateAspectRatio('1:1_square');

    await component.compressVideo();
    fixture.detectChanges();

    const res = component.result();
    expect(res).not.toBeNull();
    expect(res?.success).toBe(true);
    expect(res?.fileName).toContain('.mp4');
    expect(component.downloadUrl()).toBeTruthy();
  });

  it('should export WebM video when webm format is selected', async () => {
    component.loadSampleVideo(SYNTHETIC_VIDEO_BLOB, 'clip.webm', 15, 1280, 720);
    component.updateFormat('webm');

    await component.compressVideo();
    fixture.detectChanges();

    const res = component.result();
    expect(res?.success).toBe(true);
    expect(res?.mimeType).toBe('video/webm');
    expect(res?.fileName).toContain('.webm');
  });

  it('should revoke object URL when resetting component state', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    component.loadSampleVideo(SYNTHETIC_VIDEO_BLOB, 'cleanup.mp4', 10, 1920, 1080);
    await component.compressVideo();
    const url = component.downloadUrl();
    expect(url).toBeTruthy();

    component.resetToDefaults();
    expect(revokeSpy).toHaveBeenCalledWith(url);
    expect(component.downloadUrl()).toBeNull();
    expect(component.result()).toBeNull();

    revokeSpy.mockRestore();
  });

  it('should revoke active object URL on ngOnDestroy', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    component.loadSampleVideo(SYNTHETIC_VIDEO_BLOB, 'destroy.mp4', 10, 1920, 1080);
    await component.compressVideo();
    const url = component.downloadUrl();
    expect(url).toBeTruthy();

    fixture.destroy();
    expect(revokeSpy).toHaveBeenCalledWith(url);

    revokeSpy.mockRestore();
  });

  it('should trigger download anchor click', async () => {
    component.loadSampleVideo(SYNTHETIC_VIDEO_BLOB, 'test.mp4', 10, 1920, 1080);
    await component.compressVideo();

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

  it('should maintain ZERO network exfiltration during entire workflow', async () => {
    component.loadSampleVideo(SYNTHETIC_VIDEO_BLOB, 'classified_stream.mp4', 25, 1920, 1080);
    component.updatePreset('target_size_8mb');
    component.updateAspectRatio('9:16_vertical');

    await component.compressVideo();
    fixture.detectChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
  });
});
