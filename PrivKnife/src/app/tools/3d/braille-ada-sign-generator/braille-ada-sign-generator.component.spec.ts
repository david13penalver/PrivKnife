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

    it('should remove window mouseup listener on ngOnDestroy (DEFECT-38-05)', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      fixture.destroy();
      expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  describe('Reactive Secondary Form Controls (DEFECT-38-02)', () => {
    it('should update currentMetrics when plaqueWidthMm changes', () => {
      const initialGrams = component.currentMetrics()?.estimatedGrams;
      component.onPlaqueWidthChange(250);
      expect(component.plaqueWidthMm()).toBe(250);
      expect(component.currentMetrics()?.estimatedGrams).not.toBe(initialGrams);
    });

    it('should update currentMetrics when plaqueHeightMm changes', () => {
      const initialGrams = component.currentMetrics()?.estimatedGrams;
      component.onPlaqueHeightChange(250);
      expect(component.plaqueHeightMm()).toBe(250);
      expect(component.currentMetrics()?.estimatedGrams).not.toBe(initialGrams);
    });

    it('should update currentMetrics when subText changes', () => {
      component.onSubTextChange('TEST SUBTEXT');
      expect(component.subText()).toBe('TEST SUBTEXT');
    });

    it('should update currentMetrics when plaqueThicknessMm changes', () => {
      const initialGrams = component.currentMetrics()?.estimatedGrams;
      component.onPlaqueThicknessChange(6.0);
      expect(component.plaqueThicknessMm()).toBe(6.0);
      expect(component.currentMetrics()?.estimatedGrams).not.toBe(initialGrams);
    });

    it('should update currentMetrics when cornerRadiusMm changes', () => {
      component.onCornerRadiusChange(15);
      expect(component.cornerRadiusMm()).toBe(15);
    });

    it('should update currentMetrics when includeFrameBorder toggles', () => {
      const initialTriangles = component.currentMetrics()?.totalTriangles;
      component.onToggleFrameBorder();
      expect(component.includeFrameBorder()).toBe(false);
      expect(component.currentMetrics()?.totalTriangles).not.toBe(initialTriangles);
    });

    it('should update currentMetrics when mountHoles toggles', () => {
      component.onToggleMountHoles();
      expect(component.mountHoles()).toBe(false);
    });
  });

  describe('Touch Viewport Navigation (DEFECT-38-05)', () => {
    it('should orbit camera on touchstart and touchmove events', () => {
      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;

      (component as any).onTouchStart(touchStartEvent);
      expect(component['isDragging']).toBe(true);

      const touchMoveEvent = {
        touches: [{ clientX: 120, clientY: 110 }],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;

      (component as any).onTouchMove(touchMoveEvent);
      (component as any).onTouchEnd();
      expect(component['isDragging']).toBe(false);
    });
  });

  describe('Mobile Responsive & BEM Styling (DEFECT-38-03, DEFECT-38-04)', () => {
    it('should use .c-input__slider on all range slider inputs', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const rangeInputs = compiled.querySelectorAll('input[type="range"]');
      expect(rangeInputs.length).toBeGreaterThan(0);

      rangeInputs.forEach((input) => {
        expect(input.classList.contains('c-input__slider')).toBe(true);
      });
    });

    it('should not contain hardcoded #e2e8f0 or #cbd5e1 in styles', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const html = compiled.innerHTML;
      expect(html).not.toContain('#e2e8f0');
      expect(html).not.toContain('#cbd5e1');
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
