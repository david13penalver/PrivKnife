import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenshotMockupComponent } from './screenshot-mockup.component';
import { DEFAULT_MOCKUP_CONFIG, SAMPLE_PRESETS } from './test-fixtures';

describe('ScreenshotMockupComponent (Seam 3 & 4)', () => {
  let component: ScreenshotMockupComponent;
  let fixture: ComponentFixture<ScreenshotMockupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScreenshotMockupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenshotMockupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('initializes with default mockup configuration and dimensions', () => {
    expect(component.config().deviceType).toBe(DEFAULT_MOCKUP_CONFIG.deviceType);
    expect(component.config().anglePreset).toBe(DEFAULT_MOCKUP_CONFIG.anglePreset);
    expect(component.config().backgroundStyle).toBe(DEFAULT_MOCKUP_CONFIG.backgroundStyle);
    expect(component.screenshotImage()).toBeNull();
    expect(component.currentDimensions().width).toBe(1920);
    expect(component.currentDimensions().height).toBe(1080);
  });

  it('updates device archetype and adjusts viewport signals', () => {
    component.setDeviceType('tablet');
    expect(component.config().deviceType).toBe('tablet');

    component.setDeviceType('laptop');
    expect(component.config().deviceType).toBe('laptop');

    component.setDeviceType('browser');
    expect(component.config().deviceType).toBe('browser');
  });

  it('updates 3D perspective angle presets, chassis finish, and image fit', () => {
    component.setAnglePreset('isometric-left');
    expect(component.config().anglePreset).toBe('isometric-left');

    component.setAnglePreset('tilt-dynamic');
    expect(component.config().anglePreset).toBe('tilt-dynamic');

    component.setChassisColor('silver');
    expect(component.config().chassisColor).toBe('silver');

    component.setImageFit('contain');
    expect(component.config().imageFit).toBe('contain');
  });

  it('updates background styles between gradient, solid, and transparent', () => {
    component.setBackgroundStyle('transparent');
    expect(component.config().backgroundStyle).toBe('transparent');

    component.setGradientPreset('cyberpunk');
    expect(component.config().backgroundStyle).toBe('gradient');
    expect(component.config().gradientPreset).toBe('cyberpunk');

    const fakeInputEvent = { target: { value: '#ff0055' } } as unknown as Event;
    component.onCustomColorChange(fakeInputEvent);
    expect(component.config().backgroundStyle).toBe('solid');
    expect(component.config().customBgColor).toBe('#ff0055');
  });

  it('loads sample demo preset and sets synthetic screenshot', () => {
    const preset = SAMPLE_PRESETS[0];
    component.loadSamplePreset(preset);

    expect(component.selectedSampleId()).toBe(preset.id);
    expect(component.config().deviceType).toBe(preset.deviceType);
    expect(component.config().gradientPreset).toBe(preset.gradientPreset);
    expect(component.screenshotDataUrl()).toBeTruthy();
    expect(component.screenshotDataUrl()).toContain('data:image/svg+xml');
  });

  it('triggers download and ensures prompt URL revocation', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-mockup-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
    component.triggerDownload(mockBlob, 'test-mockup.png');

    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-mockup-url');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('resets studio back to default state and clears screenshot', () => {
    component.loadSamplePreset(SAMPLE_PRESETS[1]);
    expect(component.selectedSampleId()).not.toBeNull();

    component.resetToDefaults();
    expect(component.selectedSampleId()).toBeNull();
    expect(component.screenshotImage()).toBeNull();
    expect(component.screenshotDataUrl()).toBeNull();
    expect(component.config().deviceType).toBe('phone');
    expect(component.config().anglePreset).toBe('front');
  });

  it('guarantees zero network calls during preset loading, customizing, and exports (Privacy Guard)', () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    // 1. Load sample preset
    component.loadSamplePreset(SAMPLE_PRESETS[2]);

    // 2. Tweak options
    component.setDeviceType('laptop');
    component.setAnglePreset('isometric-right');
    component.setChassisColor('deep-purple');
    component.setBackgroundStyle('gradient');
    component.setGradientPreset('aurora');

    // 3. Trigger download
    const mockBlob = new Blob(['png'], { type: 'image/png' });
    component.triggerDownload(mockBlob, 'export.png');

    // Strict privacy assertion: 0 network requests
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });
});
