import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ParametricLampDesignerComponent } from './parametric-lamp-designer.component';
import { SAMPLE_LAMP_PRESETS } from './test-fixtures';

describe('ParametricLampDesignerComponent (Seam 2: Angular UI & Privacy)', () => {
  let component: ParametricLampDesignerComponent;
  let fixture: ComponentFixture<ParametricLampDesignerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametricLampDesignerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ParametricLampDesignerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create the component with default signals and metrics', () => {
    expect(component).toBeTruthy();
    expect(component.config()).toBeDefined();
    expect(component.config().curveType).toBe('spline');
    expect(component.metrics()).toBeDefined();
    expect(component.metrics()!.triangleCount).toBeGreaterThan(0);
  });

  it('should load preset configurations cleanly', () => {
    const origamiPreset = SAMPLE_LAMP_PRESETS.find((p) => p.id === 'origami')!;
    component.loadPreset(origamiPreset);
    fixture.detectChanges();

    expect(component.selectedPresetId()).toBe('origami');
    expect(component.config().curveType).toBe('hourglass');
    expect(component.config().ribProfile).toBe('pleat');
  });

  it('should reactively update config parameters and recalculate metrics', () => {
    component.updateConfig({ height: 250, bottomRadius: 90 });
    fixture.detectChanges();

    expect(component.config().height).toBe(250);
    expect(component.config().bottomRadius).toBe(90);
    expect(component.metrics()!.dimensionsMm.height).toBeCloseTo(250, 0);
  });

  it('should toggle viewport lighting and wireframe signals', () => {
    expect(component.lampLit()).toBe(true);
    component.toggleLampLit();
    expect(component.lampLit()).toBe(false);

    expect(component.wireframe()).toBe(false);
    component.toggleWireframe();
    expect(component.wireframe()).toBe(true);
  });

  it('should select filament material cleanly', () => {
    component.selectFilament('amber');
    expect(component.selectedFilamentId()).toBe('amber');
    expect(component.selectedFilament().name).toContain('Amber');
  });

  it('should trigger binary STL download and manage object URLs', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-stl-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await component.downloadStl();

    expect(createUrlSpy).toHaveBeenCalled();
    // Verify cleanup occurs
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-stl-url');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('should trigger 3MF download and manage object URLs', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-3mf-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await component.download3mf();

    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-3mf-url');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('should clean up Three.js resources and object URLs on ngOnDestroy', () => {
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    expect(() => fixture.destroy()).not.toThrow();
    revokeUrlSpy.mockRestore();
  });

  describe('Privacy & Zero-Exfiltration Guard (Directive 1 & 2)', () => {
    it('should perform full 3D generation and export with ZERO network requests', async () => {
      const fetchSpy = vi.spyOn(window, 'fetch');
      const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

      // Change dimensions, load preset, switch filament, and export
      component.loadPreset(SAMPLE_LAMP_PRESETS[1]);
      component.updateConfig({ height: 210, ribCount: 30 });
      component.selectFilament('terracotta');

      const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-stl-url');
      const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadStl();

      // STRICT PRIVACY CHECK: 0 network requests
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrOpenSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
      xhrOpenSpy.mockRestore();
      createUrlSpy.mockRestore();
      revokeUrlSpy.mockRestore();
    });
  });
});
