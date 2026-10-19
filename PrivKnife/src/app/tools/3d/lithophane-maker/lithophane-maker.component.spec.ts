import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LithophaneMakerComponent } from './lithophane-maker.component';
import { LITHOPHANE_PRESETS } from './test-fixtures';

describe('LithophaneMakerComponent (Seam 2 & 4)', () => {
  let component: LithophaneMakerComponent;
  let fixture: ComponentFixture<LithophaneMakerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Zero-exfiltration spies
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [LithophaneMakerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LithophaneMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    fixture.destroy();
  });

  describe('Initialization & Reactive State', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default lithophane options', () => {
      expect(component.geometryType()).toBe('flat');
      expect(component.widthMm()).toBe(100);
      expect(component.minThicknessMm()).toBe(0.8);
      expect(component.maxThicknessMm()).toBe(2.8);
      expect(component.backlightOn()).toBe(true);
    });

    it('should apply preset and update configuration signals', () => {
      const preset = LITHOPHANE_PRESETS.find((p) => p.id === 'curved_desk')!;
      component.applyPreset(preset);

      expect(component.geometryType()).toBe('curve_arc');
      expect(component.arcDegrees()).toBe(120);
      expect(component.baseStandSlot()).toBe(true);
    });

    it('should update contrast factor and invert luminance reactively', () => {
      component.updateContrast(1.5);
      expect(component.contrastFactor()).toBe(1.5);

      component.toggleInvert();
      expect(component.invertLuminance()).toBe(true);
    });

    it('should toggle backlight simulator state', () => {
      expect(component.backlightOn()).toBe(true);
      component.toggleBacklight();
      expect(component.backlightOn()).toBe(false);
      component.toggleBacklight();
      expect(component.backlightOn()).toBe(true);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-lithophane-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-lithophane-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.geometryType.set('cylinder');
      component.widthMm.set(180);
      component.resetToDefaults();

      expect(component.geometryType()).toBe('flat');
      expect(component.widthMm()).toBe(100);
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-litho-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-litho-url');
      revokeSpy.mockRestore();
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      // Exercise core interactions
      component.applyPreset(LITHOPHANE_PRESETS[0]);
      component.updateContrast(1.3);
      component.toggleBacklight();
      await component.downloadFormat('stl');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
