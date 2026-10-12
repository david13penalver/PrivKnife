import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieCutterComponent } from './cookie-cutter.component';
import { DEFAULT_COOKIE_CUTTER_CONFIG, SAMPLE_COOKIE_PRESETS } from './test-fixtures';

describe('CookieCutterComponent (UI & Privacy Boundary)', () => {
  let component: CookieCutterComponent;
  let fixture: ComponentFixture<CookieCutterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CookieCutterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CookieCutterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('initializes with default cookie cutter configuration and signals', () => {
    expect(component.config().targetSizeMm).toBe(DEFAULT_COOKIE_CUTTER_CONFIG.targetSizeMm);
    expect(component.config().bladeHeightMm).toBe(DEFAULT_COOKIE_CUTTER_CONFIG.bladeHeightMm);
    expect(component.selectedPresetId()).toBe('gingerbread-man');
    expect(component.viewMode()).toBe('assembly');
    expect(component.metrics().cutterDimensionsMm.width).toBeGreaterThan(30);
  });

  it('loads sample shape presets and updates active model signals', () => {
    const starPreset = SAMPLE_COOKIE_PRESETS[1]; // Festive Star
    component.loadPreset(starPreset);

    expect(component.selectedPresetId()).toBe('five-star');
    expect(component.metrics().outerVertexCount).toBe(starPreset.outerContour.length);

    const heartPreset = SAMPLE_COOKIE_PRESETS[2]; // Heart
    component.loadPreset(heartPreset);
    expect(component.selectedPresetId()).toBe('sweet-heart');
  });

  it('updates dimensional sliders and toggles', () => {
    component.updateTargetSize(90);
    expect(component.config().targetSizeMm).toBe(90);

    component.updateBladeHeight(18);
    expect(component.config().bladeHeightMm).toBe(18);

    component.updateBladeWall(1.2);
    expect(component.config().bladeWallMm).toBe(1.2);

    component.updateFlangeWidth(6.0);
    expect(component.config().flangeWidthMm).toBe(6.0);

    component.updateClearance(1.4);
    expect(component.config().stampClearanceMm).toBe(1.4);

    const fakeCheckboxEvent = { target: { checked: false } } as unknown as Event;
    component.toggleHandle(fakeCheckboxEvent);
    expect(component.config().stampHandleEnabled).toBe(false);
  });

  it('updates PLA material colors', () => {
    component.updateCutterColor('#059669');
    expect(component.config().cutterColor).toBe('#059669');

    component.updateStampColor('#38bdf8');
    expect(component.config().stampColor).toBe('#38bdf8');
  });

  it('switches view modes and toggles auto-spin', () => {
    component.setViewMode('side-by-side');
    expect(component.viewMode()).toBe('side-by-side');

    component.setViewMode('cutter-only');
    expect(component.viewMode()).toBe('cutter-only');

    component.setViewMode('stamp-only');
    expect(component.viewMode()).toBe('stamp-only');

    component.toggleAutoRotate();
    expect(component.autoRotate()).toBe(true);
  });

  it('resets studio back to default state', () => {
    component.loadPreset(SAMPLE_COOKIE_PRESETS[3]);
    component.setViewMode('cutter-only');
    expect(component.selectedPresetId()).toBe('playful-cat');

    component.resetToDefaults();
    expect(component.selectedPresetId()).toBe('gingerbread-man');
    expect(component.viewMode()).toBe('assembly');
    expect(component.config().targetSizeMm).toBe(DEFAULT_COOKIE_CUTTER_CONFIG.targetSizeMm);
  });

  it('triggers download and ensures prompt URL revocation (Memory Hygiene)', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-cutter-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const mockBlob = new Blob(['mock-3mf-data'], { type: 'model/3mf' });
    component.triggerDownload(mockBlob, 'cutter.3mf');

    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-cutter-url');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('exports 3MF, STL, and Zip bundle without throwing errors', async () => {
    const triggerSpy = vi.spyOn(component, 'triggerDownload').mockImplementation(() => {});

    await component.export3mf();
    expect(triggerSpy).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining('.3mf'));

    component.exportCutterStl();
    expect(triggerSpy).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining('.stl'));

    component.exportStampStl();
    expect(triggerSpy).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining('.stl'));

    await component.exportBundleZip();
    expect(triggerSpy).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining('.zip'));

    triggerSpy.mockRestore();
  });

  it('guarantees zero network calls during preset loading, tweaking, and exporting (Privacy Guard)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    // 1. Preset change
    component.loadPreset(SAMPLE_COOKIE_PRESETS[1]);

    // 2. Tweak settings
    component.updateTargetSize(85);
    component.updateBladeHeight(16);
    component.setViewMode('side-by-side');

    // 3. Export
    const triggerSpy = vi.spyOn(component, 'triggerDownload').mockImplementation(() => {});
    await component.export3mf();
    component.exportCutterStl();
    await component.exportBundleZip();

    // Strict privacy assertion: 0 network requests
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    triggerSpy.mockRestore();
  });
});
