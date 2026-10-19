import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HswInsertAdapterComponent } from './hsw-insert-adapter.component';
import { HSW_PRESETS } from './test-fixtures';

describe('HswInsertAdapterComponent (Seam 2 & 4)', () => {
  let component: HswInsertAdapterComponent;
  let fixture: ComponentFixture<HswInsertAdapterComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [HswInsertAdapterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HswInsertAdapterComponent);
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

    it('should initialize with default HSW insert parameters', () => {
      expect(component.insertType()).toBe('hex_nut_pocket');
      expect(component.nutSize()).toBe('M4');
      expect(component.tightnessToleranceMm()).toBe(0.0);
      expect(component.retentionTabs()).toBe(true);
      expect(component.flangeRim()).toBe(true);
      expect(component.plugDepthMm()).toBe(8.0);
    });

    it('should apply preset and update configuration signals', () => {
      const preset = HSW_PRESETS.find((p) => p.id === 'heavy_tool_hook')!;
      component.applyPreset(preset);

      expect(component.insertType()).toBe('tool_hook');
      expect(component.hookLengthMm()).toBe(40.0);
      expect(component.hookAngleDeg()).toBe(25.0);
      expect(component.tightnessToleranceMm()).toBe(0.05);
    });

    it('should update insert type and attachment parameters', () => {
      component.setInsertType('magnet_holder');
      expect(component.insertType()).toBe('magnet_holder');

      component.setNutSize('M5');
      expect(component.nutSize()).toBe('M5');

      component.toggleRetentionTabs();
      expect(component.retentionTabs()).toBe(false);
      component.toggleRetentionTabs();
      expect(component.retentionTabs()).toBe(true);
    });

    it('should update tolerance and dimensions', () => {
      component.tightnessToleranceMm.set(0.1);
      expect(component.tightnessToleranceMm()).toBe(0.1);

      component.setInsertType('storage_ring');
      component.ringDiameterMm.set(45.0);
      expect(component.ringDiameterMm()).toBe(45.0);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-hsw-stl');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-hsw-3mf');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.setInsertType('tool_hook');
      component.tightnessToleranceMm.set(0.2);
      component.resetToDefaults();

      expect(component.insertType()).toBe('hex_nut_pocket');
      expect(component.tightnessToleranceMm()).toBe(0.0);
      expect(component.nutSize()).toBe('M4');
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-hsw-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-hsw-url');
      revokeSpy.mockRestore();
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      component.applyPreset(HSW_PRESETS[1]);
      await component.downloadFormat('stl');
      await component.downloadFormat('3mf');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
