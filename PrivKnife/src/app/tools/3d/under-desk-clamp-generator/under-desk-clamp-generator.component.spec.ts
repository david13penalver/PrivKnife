import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnderDeskClampGeneratorComponent } from './under-desk-clamp-generator.component';
import { CLAMP_PRESETS } from './test-fixtures';

describe('UnderDeskClampGeneratorComponent (Seam 2 & 4)', () => {
  let component: UnderDeskClampGeneratorComponent;
  let fixture: ComponentFixture<UnderDeskClampGeneratorComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [UnderDeskClampGeneratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UnderDeskClampGeneratorComponent);
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

    it('should initialize with default clamp options', () => {
      expect(component.deskThicknessMm()).toBe(25);
      expect(component.maxClampGapMm()).toBe(45);
      expect(component.throatDepthMm()).toBe(60);
      expect(component.frameThicknessMm()).toBe(12);
      expect(component.accessoryType()).toBe('headphone_hanger');
      expect(component.swivelFootPad()).toBe(true);
    });

    it('should apply preset and update configuration signals', () => {
      const preset = CLAMP_PRESETS.find((p) => p.id === 'cable_raceway')!;
      component.applyPreset(preset);

      expect(component.deskThicknessMm()).toBe(30);
      expect(component.maxClampGapMm()).toBe(50);
      expect(component.accessoryType()).toBe('cable_raceway');
      expect(component.racewaySlots()).toBe(4);
    });

    it('should toggle exploded view mode', () => {
      expect(component.explodedView()).toBe(false);
      component.toggleExplodedView();
      expect(component.explodedView()).toBe(true);
      component.toggleExplodedView();
      expect(component.explodedView()).toBe(false);
    });

    it('should update accessory type and feature toggles', () => {
      component.setAccessoryType('cup_holder');
      expect(component.accessoryType()).toBe('cup_holder');

      component.toggleSwivelFootPad();
      expect(component.swivelFootPad()).toBe(false);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-clamp-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-clamp-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.deskThicknessMm.set(50);
      component.setAccessoryType('power_strip_holder');
      component.resetToDefaults();

      expect(component.deskThicknessMm()).toBe(25);
      expect(component.accessoryType()).toBe('headphone_hanger');
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-clamp-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-clamp-url');
      revokeSpy.mockRestore();
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      component.applyPreset(CLAMP_PRESETS[1]);
      component.toggleExplodedView();
      await component.downloadFormat('stl');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
