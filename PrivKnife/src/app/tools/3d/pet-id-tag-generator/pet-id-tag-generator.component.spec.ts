import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PetIdTagGeneratorComponent } from './pet-id-tag-generator.component';
import { PET_TAG_PRESETS } from './test-fixtures';

describe('PetIdTagGeneratorComponent (Seam 2 & 4)', () => {
  let component: PetIdTagGeneratorComponent;
  let fixture: ComponentFixture<PetIdTagGeneratorComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PetIdTagGeneratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PetIdTagGeneratorComponent);
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

    it('should initialize with default pet tag options', () => {
      expect(component.tagFormat()).toBe('hanging_charm');
      expect(component.charmShape()).toBe('bone');
      expect(component.petName()).toBe('LUNA');
      expect(component.primaryPhone()).toBe('555-0192');
      expect(component.emergencyIcon()).toBe('paw');
      expect(component.tagThicknessMm()).toBe(2.8);
    });

    it('should apply preset and update configuration signals', () => {
      const preset = PET_TAG_PRESETS.find((p) => p.id === 'silent_collar_slide_20mm')!;
      component.applyPreset(preset);

      expect(component.tagFormat()).toBe('collar_slide_on');
      expect(component.collarWidthMm()).toBe(20.0);
      expect(component.petName()).toBe('MAX');
      expect(component.curvedBand()).toBe(true);
    });

    it('should toggle tag format between hanging charm and collar slide-on', () => {
      component.setTagFormat('collar_slide_on');
      expect(component.tagFormat()).toBe('collar_slide_on');

      component.setTagFormat('hanging_charm');
      expect(component.tagFormat()).toBe('hanging_charm');
    });

    it('should update charm shape and emergency icon', () => {
      component.setCharmShape('shield');
      expect(component.charmShape()).toBe('shield');

      component.setEmergencyIcon('medical_cross');
      expect(component.emergencyIcon()).toBe('medical_cross');
    });

    it('should update pet name and phone numbers', () => {
      component.setPetName('rocky');
      expect(component.petName()).toBe('ROCKY');

      component.primaryPhone.set('555-9988');
      expect(component.primaryPhone()).toBe('555-9988');
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-pet-tag-3mf');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf_multicolor');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-pet-tag-stl');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl_unified');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.setPetName('COOPER');
      component.setCharmShape('hexagon');
      component.setTagFormat('collar_slide_on');
      component.resetToDefaults();

      expect(component.petName()).toBe('LUNA');
      expect(component.charmShape()).toBe('bone');
      expect(component.tagFormat()).toBe('hanging_charm');
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-pettag-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-pettag-url');
      revokeSpy.mockRestore();
    });

    it('should remove mouseup listener on window when component is destroyed (DEFECT-41-05)', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      fixture.destroy();
      expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  describe('Touch Orbit Controls & Dual-Sided UI (DEFECT-41-03 & DEFECT-41-05)', () => {
    it('should support touch rotation events on canvas', () => {
      const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toBeTruthy();

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      canvas.dispatchEvent(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 120, clientY: 110 } as Touch],
      });
      canvas.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent('touchend', {
        touches: [],
      });
      canvas.dispatchEvent(touchEnd);
    });

    it('should toggle dualSided signal and update preview', () => {
      expect(component.dualSided()).toBe(false);
      component.dualSided.set(true);
      expect(component.dualSided()).toBe(true);
    });

    it('should render dual-sided checkbox in DOM', () => {
      const dualSidedCheckbox = fixture.nativeElement.querySelector('input[data-testid="dual-sided-checkbox"]') ||
        fixture.nativeElement.querySelector('#dualSided');
      expect(dualSidedCheckbox).toBeTruthy();
    });

    it('should render export buttons with dedicated action classes', () => {
      const btn3mf = fixture.nativeElement.querySelector('.download-btn-3mf');
      const btnStl = fixture.nativeElement.querySelector('.download-btn-stl');
      expect(btn3mf).toBeTruthy();
      expect(btnStl).toBeTruthy();
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      component.applyPreset(PET_TAG_PRESETS[1]);
      await component.downloadFormat('3mf_multicolor');
      await component.downloadFormat('stl_unified');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
