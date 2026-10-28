import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeycapSwitchTesterMakerComponent } from './keycap-switch-tester-maker.component';
import { KEYCAP_PRESETS } from './test-fixtures';

describe('KeycapSwitchTesterMakerComponent (Seam 2 & 4)', () => {
  let component: KeycapSwitchTesterMakerComponent;
  let fixture: ComponentFixture<KeycapSwitchTesterMakerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [KeycapSwitchTesterMakerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KeycapSwitchTesterMakerComponent);
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

    it('should initialize with default keycap options', () => {
      expect(component.itemType()).toBe('keycap');
      expect(component.keycapProfile()).toBe('cherry');
      expect(component.keyUnitSize()).toBe('1u');
      expect(component.legendText()).toBe('ESC');
      expect(component.legendStyle()).toBe('embossed');
      expect(component.stemToleranceOffsetMm()).toBe(0.1);
    });

    it('should apply preset and update configuration signals', () => {
      const preset = KEYCAP_PRESETS.find((p) => p.id === 'tester_tray_2x2')!;
      component.applyPreset(preset);

      expect(component.itemType()).toBe('switch_tester_tray');
      expect(component.trayRows()).toBe(2);
      expect(component.trayCols()).toBe(2);
    });

    it('should toggle item type between keycap and switch tester tray', () => {
      component.setItemType('switch_tester_tray');
      expect(component.itemType()).toBe('switch_tester_tray');

      component.setItemType('keycap');
      expect(component.itemType()).toBe('keycap');
    });

    it('should update keycap profile, unit size, and legend style', () => {
      component.setKeycapProfile('sa');
      expect(component.keycapProfile()).toBe('sa');

      component.setKeyUnitSize('2.25u');
      expect(component.keyUnitSize()).toBe('2.25u');

      component.setLegendStyle('inlaid_multicolor');
      expect(component.legendStyle()).toBe('inlaid_multicolor');
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-keycap-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf_multicolor');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-keycap-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl_unified');

      expect(createObjectURLSpy).toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.legendText.set('ALT');
      component.setKeycapProfile('dsa');
      component.resetToDefaults();

      expect(component.legendText()).toBe('ESC');
      expect(component.keycapProfile()).toBe('cherry');
      expect(component.keyUnitSize()).toBe('1u');
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-keycap-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-keycap-url');
      revokeSpy.mockRestore();
    });

    it('should remove window mouseup listener on ngOnDestroy (DEFECT-39-06)', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      fixture.destroy();
      expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  describe('Touch Viewport Navigation (DEFECT-39-06)', () => {
    it('should orbit camera on touchstart and touchmove events', () => {
      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;

      (component as any).onTouchStart(touchStartEvent);
      expect(component['isDragging']).toBe(true);

      const touchMoveEvent = {
        touches: [{ clientX: 120, clientY: 110 }],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;

      (component as any).onTouchMove(touchMoveEvent);
      (component as any).onTouchEnd();
      expect(component['isDragging']).toBe(false);
    });
  });

  describe('Mobile Responsive & BEM Styling (DEFECT-39-01, DEFECT-39-05)', () => {
    it('should use .c-input__slider on all range slider inputs', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const rangeInputs = compiled.querySelectorAll('input[type="range"]');
      expect(rangeInputs.length).toBeGreaterThan(0);

      rangeInputs.forEach((input) => {
        expect(input.classList.contains('c-input__slider')).toBe(true);
      });
    });

    it('should not contain hardcoded #e2e8f0 or #cbd5e1 in styles', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const html = compiled.innerHTML;
      expect(html).not.toContain('#e2e8f0');
      expect(html).not.toContain('#cbd5e1');
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      component.applyPreset(KEYCAP_PRESETS[1]);
      await component.downloadFormat('3mf_multicolor');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
