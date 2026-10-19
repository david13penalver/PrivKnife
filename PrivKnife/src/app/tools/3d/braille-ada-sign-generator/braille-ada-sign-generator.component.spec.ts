import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrailleAdaSignGeneratorComponent } from './braille-ada-sign-generator.component';
import { SIGN_PRESETS } from './test-fixtures';

describe('BrailleAdaSignGeneratorComponent (Seam 2 & 4)', () => {
  let component: BrailleAdaSignGeneratorComponent;
  let fixture: ComponentFixture<BrailleAdaSignGeneratorComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [BrailleAdaSignGeneratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BrailleAdaSignGeneratorComponent);
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

    it('should initialize with default sign options', () => {
      expect(component.roomTitle()).toBe('RESTROOM');
      expect(component.subText()).toBe('ALL GENDER');
      expect(component.pictogram()).toBe('restroom_unisex');
      expect(component.plaqueWidthMm()).toBe(152);
      expect(component.plaqueHeightMm()).toBe(203);
      expect(component.brailleStandard()).toBe('ada_compliant');
    });

    it('should apply preset and update configuration signals', () => {
      const preset = SIGN_PRESETS.find((p) => p.id === 'emergency_exit')!;
      component.applyPreset(preset);

      expect(component.roomTitle()).toBe('EXIT');
      expect(component.pictogram()).toBe('exit');
      expect(component.plaqueHeightMm()).toBe(127);
    });

    it('should update pictogram and braille standard', () => {
      component.setPictogram('accessible_wheelchair');
      expect(component.pictogram()).toBe('accessible_wheelchair');

      component.setBrailleStandard('california_title24');
      expect(component.brailleStandard()).toBe('california_title24');
    });

    it('should calculate live unicode braille representation', () => {
      expect(component.unicodeBraille().length).toBeGreaterThan(0);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-sign-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf_multicolor');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-sign-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl_unified');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.roomTitle.set('LABORATORY');
      component.setPictogram('none');
      component.resetToDefaults();

      expect(component.roomTitle()).toBe('RESTROOM');
      expect(component.pictogram()).toBe('restroom_unisex');
      expect(component.plaqueWidthMm()).toBe(152);
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-sign-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-sign-url');
      revokeSpy.mockRestore();
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      component.applyPreset(SIGN_PRESETS[1]);
      await component.downloadFormat('3mf_multicolor');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
