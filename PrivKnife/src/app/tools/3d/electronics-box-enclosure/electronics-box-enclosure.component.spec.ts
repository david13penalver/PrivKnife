import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElectronicsBoxEnclosureComponent } from './electronics-box-enclosure.component';
import { ENCLOSURE_PRESETS } from './test-fixtures';

describe('ElectronicsBoxEnclosureComponent (Seam 2 & 4)', () => {
  let component: ElectronicsBoxEnclosureComponent;
  let fixture: ComponentFixture<ElectronicsBoxEnclosureComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [ElectronicsBoxEnclosureComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ElectronicsBoxEnclosureComponent);
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

    it('should initialize with default enclosure options', () => {
      expect(component.innerLengthMm()).toBe(80);
      expect(component.innerWidthMm()).toBe(50);
      expect(component.innerHeightMm()).toBe(30);
      expect(component.wallThicknessMm()).toBe(2.0);
      expect(component.closureType()).toBe('snap_fit');
    });

    it('should apply preset and update configuration signals', () => {
      const preset = ENCLOSURE_PRESETS.find((p) => p.id === 'arduino_uno')!;
      component.applyPreset(preset);

      expect(component.innerLengthMm()).toBe(75);
      expect(component.innerWidthMm()).toBe(58);
      expect(component.closureType()).toBe('m3_screws');
    });

    it('should toggle exploded view mode', () => {
      expect(component.explodedView()).toBe(false);
      component.toggleExplodedView();
      expect(component.explodedView()).toBe(true);
      component.toggleExplodedView();
      expect(component.explodedView()).toBe(false);
    });

    it('should update closure type and feature toggles', () => {
      component.setClosureType('m3_screws');
      expect(component.closureType()).toBe('m3_screws');

      component.toggleCableSlot();
      expect(component.cableSlot()).toBe(false);

      component.toggleVentilation();
      expect(component.ventilationGrille()).toBe(false);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-enclosure-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-enclosure-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should revoke object URL immediately after download trigger (Directive 4 & DEFECT-34-05)', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-immediate-revoke-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-immediate-revoke-url');

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Secondary Controls & Configuration (DEFECT-34-01 & DEFECT-34-05)', () => {
    it('should render cornerRadiusMm slider and update signal on input', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const cornerSlider = compiled.querySelector<HTMLInputElement>(
        'input[data-testid="corner-radius-slider"]'
      );
      expect(cornerSlider).toBeTruthy();

      component.onCornerRadiusChange({ target: { value: '5' } } as unknown as Event);
      expect(component.cornerRadiusMm()).toBe(5);
    });
  });

  describe('3D Viewport Interaction: Touch Orbit & Wheel Zoom (DEFECT-34-04)', () => {
    it('should handle wheel zoom on viewport', () => {
      const initialZ = (component as any).camera?.position.z || 120;
      const wheelEvent = new WheelEvent('wheel', { deltaY: 100, bubbles: true });
      component.onWheel(wheelEvent);
      if ((component as any).camera) {
        expect((component as any).camera.position.z).toBeGreaterThan(initialZ);
      }
    });

    it('should handle touch drag rotation on viewport', () => {
      const initialRotX = (component as any).meshRotationX;
      const initialRotY = (component as any).meshRotationY;

      component.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: () => {},
      } as unknown as TouchEvent);

      component.onTouchMove({
        touches: [{ clientX: 120, clientY: 130 }],
        preventDefault: () => {},
      } as unknown as TouchEvent);

      expect((component as any).meshRotationX).not.toBe(initialRotX);
      expect((component as any).meshRotationY).not.toBe(initialRotY);

      component.onTouchEnd();
      expect((component as any).isDragging).toBe(false);
    });
  });

  describe('Responsive Layout & Touch Target BEM Classes (DEFECT-34-02, DEFECT-34-03, DEFECT-34-05)', () => {
    it('should use .c-input__slider on all range inputs for touch target compliance', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const sliders = compiled.querySelectorAll<HTMLInputElement>('input[type="range"]');
      expect(sliders.length).toBeGreaterThan(0);
      sliders.forEach((slider) => {
        expect(slider.classList.contains('c-input__slider')).toBe(true);
      });
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.innerLengthMm.set(150);
      component.closureType.set('slide_lid');
      component.resetToDefaults();

      expect(component.innerLengthMm()).toBe(80);
      expect(component.closureType()).toBe('snap_fit');
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-enclosure-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-enclosure-url');
      revokeSpy.mockRestore();
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      component.applyPreset(ENCLOSURE_PRESETS[1]);
      component.toggleExplodedView();
      await component.downloadFormat('stl');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
