import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SkadisPegboardMakerComponent } from './skadis-pegboard-maker.component';
import { SKADIS_PRESETS } from './test-fixtures';

describe('SkadisPegboardMakerComponent (Seam 2 & 4)', () => {
  let component: SkadisPegboardMakerComponent;
  let fixture: ComponentFixture<SkadisPegboardMakerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [SkadisPegboardMakerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkadisPegboardMakerComponent);
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

    it('should initialize with default skadis options', () => {
      expect(component.pegboardSystem()).toBe('ikea_skadis');
      expect(component.holderStyle()).toBe('single_hook');
      expect(component.hookLengthMm()).toBe(50);
      expect(component.hookAngleDeg()).toBe(10);
      expect(component.lockingWedge()).toBe(true);
    });

    it('should apply preset and update configuration signals', () => {
      const preset = SKADIS_PRESETS.find((p) => p.id === 'skadis_dual_prong')!;
      component.applyPreset(preset);

      expect(component.holderStyle()).toBe('dual_prong');
      expect(component.hookLengthMm()).toBe(60);
      expect(component.bracketWidthMm()).toBe(45);
    });

    it('should toggle pegboard system and holder style', () => {
      component.setPegboardSystem('standard_pegboard_1_inch');
      expect(component.pegboardSystem()).toBe('standard_pegboard_1_inch');

      component.setHolderStyle('shelf_bracket');
      expect(component.holderStyle()).toBe('shelf_bracket');
    });

    it('should toggle locking wedge and reinforce rib', () => {
      component.toggleLockingWedge();
      expect(component.lockingWedge()).toBe(false);

      component.toggleReinforceRib();
      expect(component.reinforceRib()).toBe(false);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-skadis-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-skadis-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.hookLengthMm.set(120);
      component.setHolderStyle('cylinder_cup');
      component.resetToDefaults();

      expect(component.hookLengthMm()).toBe(50);
      expect(component.holderStyle()).toBe('single_hook');
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-skadis-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-skadis-url');
      revokeSpy.mockRestore();
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      component.applyPreset(SKADIS_PRESETS[1]);
      await component.downloadFormat('stl');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
