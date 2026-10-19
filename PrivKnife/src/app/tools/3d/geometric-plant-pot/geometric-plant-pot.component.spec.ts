import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeometricPlantPotComponent } from './geometric-plant-pot.component';
import { PLANTER_PRESETS } from './test-fixtures';

describe('GeometricPlantPotComponent (Seam 2 & 4)', () => {
  let component: GeometricPlantPotComponent;
  let fixture: ComponentFixture<GeometricPlantPotComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [GeometricPlantPotComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GeometricPlantPotComponent);
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

    it('should initialize with default planter options', () => {
      expect(component.aestheticStyle()).toBe('twisted_polygon');
      expect(component.polygonSides()).toBe(6);
      expect(component.topDiameterMm()).toBe(90);
      expect(component.heightMm()).toBe(85);
      expect(component.planterType()).toBe('self_watering_insert');
    });

    it('should apply preset and update configuration signals', () => {
      const preset = PLANTER_PRESETS.find((p) => p.id === 'low_poly_gem_saucer')!;
      component.applyPreset(preset);

      expect(component.aestheticStyle()).toBe('low_poly_faceted');
      expect(component.polygonSides()).toBe(7);
      expect(component.planterType()).toBe('drainage_with_saucer');
    });

    it('should toggle aesthetic style and planter type', () => {
      component.setAestheticStyle('vertical_flutes');
      expect(component.aestheticStyle()).toBe('vertical_flutes');

      component.setPlanterType('decorative_cover');
      expect(component.planterType()).toBe('decorative_cover');
    });

    it('should toggle exploded view mode', () => {
      expect(component.explodedView()).toBe(false);
      component.toggleExplodedView();
      expect(component.explodedView()).toBe(true);
      component.toggleExplodedView();
      expect(component.explodedView()).toBe(false);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-planter-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-planter-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.heightMm.set(150);
      component.setAestheticStyle('smooth_minimal');
      component.resetToDefaults();

      expect(component.heightMm()).toBe(85);
      expect(component.aestheticStyle()).toBe('twisted_polygon');
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-planter-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-planter-url');
      revokeSpy.mockRestore();
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      component.applyPreset(PLANTER_PRESETS[1]);
      await component.downloadFormat('stl');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
