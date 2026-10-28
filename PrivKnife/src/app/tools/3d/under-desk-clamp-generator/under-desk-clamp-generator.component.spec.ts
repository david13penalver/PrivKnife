import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import * as engine from './engine';
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

    it('should update metrics and scene meshes during single-pass rebuildMesh', () => {
      component.deskThicknessMm.set(40);
      component['rebuildMesh']();

      expect(component.metrics().totalTriangles).toBeGreaterThan(0);
      if (component['clampMeshGroup']) {
        expect(component['clampMeshGroup'].children.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should dispose deskPreviewMesh geometry and material on destroy', () => {
      const dummyGeom = new THREE.BoxGeometry(10, 10, 10);
      const dummyMat = new THREE.MeshBasicMaterial();
      const geomSpy = vi.spyOn(dummyGeom, 'dispose');
      const matSpy = vi.spyOn(dummyMat, 'dispose');

      component['deskPreviewMesh'] = new THREE.Mesh(dummyGeom, dummyMat);
      component.ngOnDestroy();

      expect(geomSpy).toHaveBeenCalled();
      expect(matSpy).toHaveBeenCalled();
    });
  });

  describe('Touch Viewport Navigation (DEFECT-35-05)', () => {
    it('should orbit camera on touchstart and touchmove events', () => {
      const initialRotX = component['meshRotationX'];
      const initialRotY = component['meshRotationY'];

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
      expect(component['meshRotationY']).not.toBe(initialRotY);
      expect(component['meshRotationX']).not.toBe(initialRotX);

      (component as any).onTouchEnd();
      expect(component['isDragging']).toBe(false);
    });
  });

  describe('Mobile Responsive & BEM Styling (DEFECT-35-03, DEFECT-35-04, DEFECT-35-05)', () => {
    it('should use .c-input__slider on all range slider inputs', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const rangeInputs = compiled.querySelectorAll('input[type="range"]');
      expect(rangeInputs.length).toBeGreaterThan(0);

      rangeInputs.forEach((input) => {
        expect(input.classList.contains('c-input__slider')).toBe(true);
      });
    });

    it('should not contain hardcoded #f3f4f6 or #cbd5e1 in styles', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const html = compiled.innerHTML;
      expect(html).not.toContain('#f3f4f6');
      expect(html).not.toContain('#cbd5e1');
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
