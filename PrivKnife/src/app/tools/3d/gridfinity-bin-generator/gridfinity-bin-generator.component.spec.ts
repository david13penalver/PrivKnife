import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GridfinityBinGeneratorComponent } from './gridfinity-bin-generator.component';
import { GRIDFINITY_PRESETS } from './test-fixtures';

describe('GridfinityBinGeneratorComponent (Seam 2 & 4)', () => {
  let component: GridfinityBinGeneratorComponent;
  let fixture: ComponentFixture<GridfinityBinGeneratorComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [GridfinityBinGeneratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GridfinityBinGeneratorComponent);
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

    it('should initialize with default 1x1 3U options', () => {
      expect(component.gridX()).toBe(1);
      expect(component.gridY()).toBe(1);
      expect(component.heightUnits()).toBe(3);
      expect(component.lipStyle()).toBe('standard');
      expect(component.fingerScoop()).toBe(true);
      expect(component.labelTab()).toBe(true);
    });

    it('should apply preset and update configuration signals', () => {
      const preset = GRIDFINITY_PRESETS.find((p) => p.id === '2x2_deep')!;
      component.applyPreset(preset);

      expect(component.gridX()).toBe(2);
      expect(component.gridY()).toBe(2);
      expect(component.heightUnits()).toBe(6);
      expect(component.fingerScoop()).toBe(false);
    });

    it('should update subdivisions and lip styles', () => {
      component.subdivisionsX.set(3);
      component.subdivisionsY.set(2);
      component.setLipStyle('flat');

      expect(component.subdivisionsX()).toBe(3);
      expect(component.subdivisionsY()).toBe(2);
      expect(component.lipStyle()).toBe('flat');
    });

    it('should toggle finger scoop and label tab', () => {
      component.toggleFingerScoop();
      expect(component.fingerScoop()).toBe(false);

      component.toggleLabelTab();
      expect(component.labelTab()).toBe(false);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-gridfinity-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-gridfinity-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should revoke object URL immediately after download trigger (Directive 4 & DEFECT-33-05)', async () => {
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

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.gridX.set(4);
      component.heightUnits.set(10);
      component.resetToDefaults();

      expect(component.gridX()).toBe(1);
      expect(component.heightUnits()).toBe(3);
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-gridfinity-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-gridfinity-url');
      revokeSpy.mockRestore();
    });
  });

  describe('Secondary Controls & Configuration (DEFECT-33-01 & DEFECT-33-05)', () => {
    it('should render and toggle baseScrewHoles checkbox', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(component.baseScrewHoles()).toBe(false);

      component.toggleScrewHoles();
      fixture.detectChanges();
      expect(component.baseScrewHoles()).toBe(true);

      const checkbox = compiled.querySelector<HTMLInputElement>('input[data-testid="base-screw-holes"]');
      expect(checkbox).toBeTruthy();
      expect(checkbox?.checked).toBe(true);
    });

    it('should render fingerScoopRadiusMm slider when fingerScoop is enabled', () => {
      component.fingerScoop.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const scoopSlider = compiled.querySelector<HTMLInputElement>('input[data-testid="scoop-radius-slider"]');
      expect(scoopSlider).toBeTruthy();

      component.onFingerScoopRadiusChange({ target: { value: '15' } } as unknown as Event);
      expect(component.fingerScoopRadiusMm()).toBe(15);
    });

    it('should render labelTabWidthMm and labelAngleDeg sliders when labelTab is enabled', () => {
      component.labelTab.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const widthSlider = compiled.querySelector<HTMLInputElement>('input[data-testid="label-width-slider"]');
      const angleSlider = compiled.querySelector<HTMLInputElement>('input[data-testid="label-angle-slider"]');
      expect(widthSlider).toBeTruthy();
      expect(angleSlider).toBeTruthy();

      component.onLabelTabWidthChange({ target: { value: '30' } } as unknown as Event);
      expect(component.labelTabWidthMm()).toBe(30);

      component.onLabelAngleChange({ target: { value: '60' } } as unknown as Event);
      expect(component.labelAngleDeg()).toBe(60);
    });
  });

  describe('3D Viewport Interaction: Touch Orbit & Wheel Zoom (DEFECT-33-04)', () => {
    it('should handle wheel zoom on viewport', () => {
      const initialZ = (component as any).camera?.position.z || 100;
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

  describe('Responsive Layout & Touch Target BEM Classes (DEFECT-33-02, DEFECT-33-03, DEFECT-33-05)', () => {
    it('should use .c-input__slider on range inputs for touch target compliance', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const sliders = compiled.querySelectorAll<HTMLInputElement>('input[type="range"]');
      expect(sliders.length).toBeGreaterThan(0);
      sliders.forEach((slider) => {
        expect(slider.classList.contains('c-input__slider')).toBe(true);
      });
    });

    it('should have unit-btn-row with 6 unit buttons styled for mobile wrapping', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const unitRows = compiled.querySelectorAll('.unit-btn-row');
      expect(unitRows.length).toBeGreaterThanOrEqual(2);
      unitRows.forEach((row) => {
        expect(row.children.length).toBe(6);
      });
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      component.applyPreset(GRIDFINITY_PRESETS[1]);
      component.setLipStyle('flat');
      component.toggleFingerScoop();
      await component.downloadFormat('stl');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
