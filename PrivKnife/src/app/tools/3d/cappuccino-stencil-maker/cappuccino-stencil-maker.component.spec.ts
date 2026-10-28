import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CappuccinoStencilMakerComponent } from './cappuccino-stencil-maker.component';
import { STENCIL_PRESETS } from './test-fixtures';

describe('CappuccinoStencilMakerComponent (Seam 2 & 4)', () => {
  let component: CappuccinoStencilMakerComponent;
  let fixture: ComponentFixture<CappuccinoStencilMakerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [CappuccinoStencilMakerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CappuccinoStencilMakerComponent);
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

    it('should initialize with default stencil parameters', () => {
      expect(component.stencilDiameterMm()).toBe(95.0);
      expect(component.stencilThicknessMm()).toBe(1.2);
      expect(component.handleType()).toBe('thumb_tab');
      expect(component.handleHole()).toBe(true);
      expect(component.motif()).toBe('heart');
      expect(component.customText()).toBe('COFFEE');
      expect(component.autoBridgeIslands()).toBe(true);
    });

    it('should apply preset and update configuration signals', () => {
      const preset = STENCIL_PRESETS.find((p) => p.id === 'steaming_cup')!;
      component.applyPreset(preset);

      expect(component.motif()).toBe('coffee_cup');
      expect(component.handleType()).toBe('extended_rod');
      expect(component.stencilDiameterMm()).toBe(100.0);
      expect(component.handleLengthMm()).toBe(50.0);
    });

    it('should update motif and custom text', () => {
      component.setMotif('custom_text');
      expect(component.motif()).toBe('custom_text');

      component.setCustomText('LATTE');
      expect(component.customText()).toBe('LATTE');
    });

    it('should update handle configuration', () => {
      component.setHandleType('dual_ear');
      expect(component.handleType()).toBe('dual_ear');

      component.toggleHandleHole();
      expect(component.handleHole()).toBe(false);

      component.toggleHandleHole();
      expect(component.handleHole()).toBe(true);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-stencil-stl');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger SVG download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-stencil-svg');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('svg');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.stencilDiameterMm.set(130.0);
      component.setMotif('cat_paw');
      component.setHandleType('dual_ear');
      component.resetToDefaults();

      expect(component.stencilDiameterMm()).toBe(95.0);
      expect(component.motif()).toBe('heart');
      expect(component.handleType()).toBe('thumb_tab');
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-stencil-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-stencil-url');
      revokeSpy.mockRestore();
    });

    it('should remove window mouseup listener on ngOnDestroy (DEFECT-40-05)', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      fixture.destroy();
      expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  describe('Touch Viewport Navigation (DEFECT-40-05)', () => {
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

  describe('Mobile Responsive & BEM Styling (DEFECT-40-02, DEFECT-40-04)', () => {
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
      component.applyPreset(STENCIL_PRESETS[0]);
      await component.downloadFormat('stl');
      await component.downloadFormat('svg');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
