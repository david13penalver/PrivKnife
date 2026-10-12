import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QrStandKeychainComponent } from './qr-stand-keychain.component';
import { DEFAULT_QR_STAND_CONFIG, SAMPLE_PRESETS, COLOR_PRESETS } from './test-fixtures';

describe('QrStandKeychainComponent (UI & Privacy Boundary)', () => {
  let component: QrStandKeychainComponent;
  let fixture: ComponentFixture<QrStandKeychainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrStandKeychainComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QrStandKeychainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('initializes with default 3D QR stand configuration and signals', () => {
    expect(component.config().text).toBe(DEFAULT_QR_STAND_CONFIG.text);
    expect(component.config().baseShape).toBe('desk-stand');
    expect(component.config().errorCorrection).toBe('M');
    expect(component.config().subtext).toBe('SCAN ME');
    expect(component.scannability().isScannable).toBe(true);
    expect(component.viewOrientation()).toBe('standing');
    expect(component.autoRotate()).toBe(false);
  });

  it('updates text payload and error correction level', () => {
    component.updateText('https://custom-url.org');
    expect(component.config().text).toBe('https://custom-url.org');
    expect(component.selectedPresetId()).toBeNull();

    component.updateErrorCorrection('H');
    expect(component.config().errorCorrection).toBe('H');
  });

  it('toggles and updates subtext extrusion', () => {
    const fakeCheckboxEvent = { target: { checked: false } } as unknown as Event;
    component.toggleSubtext(fakeCheckboxEvent);
    expect(component.config().subtextEnabled).toBe(false);

    component.updateSubtext('TABLE 7');
    expect(component.config().subtext).toBe('TABLE 7');
  });

  it('updates base shape and dimensional sliders', () => {
    component.setBaseShape('keychain');
    expect(component.config().baseShape).toBe('keychain');

    component.setBaseShape('flat-plaque');
    expect(component.config().baseShape).toBe('flat-plaque');

    component.updateModuleSize(2.4);
    expect(component.config().moduleSizeMm).toBe(2.4);

    component.updateBaseThickness(4.0);
    expect(component.config().baseThicknessMm).toBe(4.0);

    component.updateQrRelief(1.6);
    expect(component.config().qrReliefMm).toBe(1.6);

    component.updateStandAngle(65);
    expect(component.config().standAngleDeg).toBe(65);

    component.updateKeychainHole(5.0);
    expect(component.config().keychainHoleDiameterMm).toBe(5.0);
  });

  it('applies color presets and custom color choices', () => {
    component.applyColorPreset(COLOR_PRESETS[1]);
    expect(component.config().baseColor).toBe(COLOR_PRESETS[1].baseColor);
    expect(component.config().qrColor).toBe(COLOR_PRESETS[1].qrColor);

    component.updateBaseColor('#222222');
    expect(component.config().baseColor).toBe('#222222');

    component.updateQrColor('#44ff44');
    expect(component.config().qrColor).toBe('#44ff44');
  });

  it('loads sample presets and updates active model signals', () => {
    const preset = SAMPLE_PRESETS[1]; // Instagram Keychain
    component.loadPreset(preset);

    expect(component.selectedPresetId()).toBe(preset.id);
    expect(component.config().baseShape).toBe('keychain');
    expect(component.config().text).toBe(preset.config.text);
    expect(component.scannability().isScannable).toBe(true);
  });

  it('toggles view orientation and auto-rotation', () => {
    component.setViewOrientation('flat');
    expect(component.viewOrientation()).toBe('flat');

    component.setViewOrientation('standing');
    expect(component.viewOrientation()).toBe('standing');

    component.toggleAutoRotate();
    expect(component.autoRotate()).toBe(true);
  });

  it('resets studio back to default state', () => {
    component.loadPreset(SAMPLE_PRESETS[2]);
    expect(component.selectedPresetId()).not.toBeNull();

    component.resetToDefaults();
    expect(component.selectedPresetId()).toBeNull();
    expect(component.config().baseShape).toBe(DEFAULT_QR_STAND_CONFIG.baseShape);
    expect(component.config().text).toBe(DEFAULT_QR_STAND_CONFIG.text);
  });

  it('triggers download and ensures prompt URL revocation (Memory Hygiene)', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-3d-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const mockBlob = new Blob(['mock-3mf-data'], { type: 'model/3mf' });
    component.triggerDownload(mockBlob, 'test_model.3mf');

    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-3d-url');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('exports 3MF, STL, and Zip without throwing errors', async () => {
    const triggerSpy = vi.spyOn(component, 'triggerDownload').mockImplementation(() => {});

    await component.export3mf();
    expect(triggerSpy).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining('.3mf'));

    component.exportStl();
    expect(triggerSpy).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining('.stl'));

    await component.exportBundleZip();
    expect(triggerSpy).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining('.zip'));

    triggerSpy.mockRestore();
  });

  it('guarantees zero network calls during preset loading, customizing, and exports (Privacy Guard)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    // 1. Load preset
    component.loadPreset(SAMPLE_PRESETS[0]);

    // 2. Tweak options
    component.updateText('https://privknife.dev/verify');
    component.updateModuleSize(2.0);
    component.setBaseShape('desk-stand');
    component.applyColorPreset(COLOR_PRESETS[0]);

    // 3. Export operations
    const triggerSpy = vi.spyOn(component, 'triggerDownload').mockImplementation(() => {});
    await component.export3mf();
    component.exportStl();
    await component.exportBundleZip();

    // Strict privacy assertion: 0 network requests
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    triggerSpy.mockRestore();
  });
});
