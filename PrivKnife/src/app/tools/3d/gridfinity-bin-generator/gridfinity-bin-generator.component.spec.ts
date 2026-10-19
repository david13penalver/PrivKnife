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
