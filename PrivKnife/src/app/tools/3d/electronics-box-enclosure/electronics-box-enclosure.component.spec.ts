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
