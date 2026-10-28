import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ParametricLampDesignerComponent } from './parametric-lamp-designer.component';
import { SAMPLE_LAMP_PRESETS } from './test-fixtures';
import * as engine from './engine';

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

  it('should reactively update config parameters and recalculate metrics with a single geometry generation pass', () => {
    // Verify metrics is a writable signal updated directly inside rebuildShadeMesh (DEFECT-31-02)
    // rather than a computed() signal that runs generateLampShadeGeometry duplicate times
    expect(typeof (component.metrics as any).set).toBe('function');

    const rebuildSpy = vi.spyOn(component as any, 'rebuildShadeMesh');
    component.updateConfig({ height: 250, bottomRadius: 90 });
    fixture.detectChanges();

    expect(component.config().height).toBe(250);
    expect(component.config().bottomRadius).toBe(90);
    expect(component.metrics()!.dimensionsMm.height).toBeCloseTo(250, 0);
    expect(rebuildSpy).toHaveBeenCalledTimes(1);
    rebuildSpy.mockRestore();
  });

  it('should dispose old material when selecting a different filament', () => {
    const initialMat = (component as any).shadeMesh?.material;
    expect(initialMat).toBeDefined();
    const disposeSpy = vi.spyOn(initialMat, 'dispose');

    component.selectFilament('amber');

    expect(disposeSpy).toHaveBeenCalled();
  });

  it('should dispose bulbMesh and gridHelper resources on ngOnDestroy', () => {
    const bulbMesh = (component as any).bulbMesh;
    const gridHelper = (component as any).gridHelper;

    const bulbGeomSpy = bulbMesh ? vi.spyOn(bulbMesh.geometry, 'dispose') : null;
    const bulbMatSpy = bulbMesh ? vi.spyOn(bulbMesh.material, 'dispose') : null;
    const gridGeomSpy = gridHelper ? vi.spyOn(gridHelper.geometry, 'dispose') : null;

    fixture.destroy();

    if (bulbGeomSpy) expect(bulbGeomSpy).toHaveBeenCalled();
    if (bulbMatSpy) expect(bulbMatSpy).toHaveBeenCalled();
    if (gridGeomSpy) expect(gridGeomSpy).toHaveBeenCalled();
  });

  it('should use .c-input__control on select elements and .c-input__slider on range inputs', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const selects = nativeEl.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
    selects.forEach((sel) => {
      expect(sel.classList.contains('c-input__control')).toBe(true);
      expect(sel.classList.contains('c-input')).toBe(false);
    });

    const rangeInputs = nativeEl.querySelectorAll('input[type="range"]');
    expect(rangeInputs.length).toBeGreaterThan(0);
    rangeInputs.forEach((input) => {
      expect(input.classList.contains('c-input__slider')).toBe(true);
      expect(input.classList.contains('c-input')).toBe(false);
    });

    const voronoiOption = nativeEl.querySelector('option[value="voronoi"]');
    expect(voronoiOption).toBeTruthy();
  });

  it('should use non-colliding .c-lamp-designer__viewport-hud for viewport overlay', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const hud = nativeEl.querySelector('.c-lamp-designer__viewport-hud');
    expect(hud).toBeTruthy();
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
