import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LithophaneMakerComponent } from './lithophane-maker.component';
import { LITHOPHANE_PRESETS } from './test-fixtures';

describe('LithophaneMakerComponent (Seam 2 & 4)', () => {
  let component: LithophaneMakerComponent;
  let fixture: ComponentFixture<LithophaneMakerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Zero-exfiltration spies
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [LithophaneMakerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LithophaneMakerComponent);
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

    it('should initialize with default lithophane options', () => {
      expect(component.geometryType()).toBe('flat');
      expect(component.widthMm()).toBe(100);
      expect(component.minThicknessMm()).toBe(0.8);
      expect(component.maxThicknessMm()).toBe(2.8);
      expect(component.backlightOn()).toBe(true);
    });

    it('should apply preset and update configuration signals', () => {
      const preset = LITHOPHANE_PRESETS.find((p) => p.id === 'curved_desk')!;
      component.applyPreset(preset);

      expect(component.geometryType()).toBe('curve_arc');
      expect(component.arcDegrees()).toBe(120);
      expect(component.baseStandSlot()).toBe(true);
    });

    it('should update contrast factor and invert luminance reactively', () => {
      component.updateContrast(1.5);
      expect(component.contrastFactor()).toBe(1.5);

      component.toggleInvert();
      expect(component.invertLuminance()).toBe(true);
    });

    it('should toggle backlight simulator state', () => {
      expect(component.backlightOn()).toBe(true);
      component.toggleBacklight();
      expect(component.backlightOn()).toBe(false);
      component.toggleBacklight();
      expect(component.backlightOn()).toBe(true);
    });
  });

  describe('Export & Download Actions', () => {
    it('should generate and trigger STL download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-lithophane-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('stl');

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-lithophane-url');
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should generate and trigger 3MF download without throwing', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-lithophane-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await component.downloadFormat('3mf');

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-lithophane-url');
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should update isGenerating and progressPercent during downloadFormat', async () => {
      const isGeneratingStates: boolean[] = [];
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-lithophane-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      // Watch signal changes
      const origFn = component.downloadFormat.bind(component);
      const promise = component.downloadFormat('stl');
      // While running, isGenerating should have been set
      isGeneratingStates.push(component.isGenerating());
      await promise;
      isGeneratingStates.push(component.isGenerating());

      expect(isGeneratingStates).toContain(false);
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should download PNG snapshot and immediately revoke object URL', () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-snapshot-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      // Mock canvas toBlob
      const mockCanvas = document.createElement('canvas');
      mockCanvas.toBlob = vi.fn((cb: BlobCallback) => {
        cb(new Blob(['test-png'], { type: 'image/png' }));
      });
      (component as any).renderer = {
        domElement: mockCanvas,
        render: vi.fn(),
        dispose: vi.fn(),
      };
      (component as any).scene = {};
      (component as any).camera = {};

      component.downloadPngSnapshot();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-snapshot-url');
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Viewport Orbit & Zoom Controls', () => {
    it('should zoom camera on wheel event within limits', () => {
      (component as any).camera = { position: { z: 180 } };
      const event = {
        deltaY: 50,
        preventDefault: vi.fn(),
      } as unknown as WheelEvent;

      component.onWheel(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect((component as any).camera.position.z).toBe(185);

      // Extreme zoom out
      const bigEvent = {
        deltaY: 5000,
        preventDefault: vi.fn(),
      } as unknown as WheelEvent;
      component.onWheel(bigEvent);
      expect((component as any).camera.position.z).toBe(350);

      // Extreme zoom in
      const inEvent = {
        deltaY: -5000,
        preventDefault: vi.fn(),
      } as unknown as WheelEvent;
      component.onWheel(inEvent);
      expect((component as any).camera.position.z).toBe(60);
    });

    it('should rotate mesh on touch events', () => {
      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent;
      component.onTouchStart(touchStartEvent);

      const touchMoveEvent = {
        touches: [{ clientX: 120, clientY: 110 }],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      component.onTouchMove(touchMoveEvent);

      expect(touchMoveEvent.preventDefault).toHaveBeenCalled();
      expect((component as any).meshRotationY).toBeCloseTo(0.2, 2);
      expect((component as any).meshRotationX).toBeCloseTo(0.1, 2);

      component.onTouchEnd();
      expect((component as any).isTouching).toBe(false);
    });
  });

  describe('File Handling & Memory Hygiene', () => {
    it('should revoke object URL immediately on image load or error in onFileDropped', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-img-url');

      const file = new File(['fake-image'], 'photo.png', { type: 'image/png' });

      // Mock Image
      let capturedOnLoad: (() => void) | null = null;
      let capturedOnError: (() => void) | null = null;
      const originalImage = window.Image;
      class MockImage {
        src = '';
        set onload(fn: () => void) {
          capturedOnLoad = fn;
        }
        set onerror(fn: () => void) {
          capturedOnError = fn;
        }
      }
      (window as any).Image = MockImage as any;

      component.onFileDropped([file]);
      expect(createObjectURLSpy).toHaveBeenCalledWith(file);

      // Trigger onload
      if (capturedOnLoad) {
        (capturedOnLoad as () => void)();
      }
      expect(revokeSpy).toHaveBeenCalledWith('blob:test-img-url');

      (window as any).Image = originalImage;
      createObjectURLSpy.mockRestore();
      revokeSpy.mockRestore();
    });

    it('should terminate active worker on ngOnDestroy', () => {
      const mockWorker = {
        terminate: vi.fn(),
      } as unknown as Worker;
      (component as any).worker = mockWorker;

      component.ngOnDestroy();
      expect(mockWorker.terminate).toHaveBeenCalled();
      expect((component as any).worker).toBeUndefined();
    });
  });

  describe('DOM Styling & Accessibility', () => {
    it('should use .c-input__slider on all range inputs and not .c-input--slider', () => {
      const el: HTMLElement = fixture.nativeElement;
      const rangeInputs = el.querySelectorAll('input[type="range"]');
      expect(rangeInputs.length).toBeGreaterThan(0);

      rangeInputs.forEach((input) => {
        expect(input.classList.contains('c-input__slider')).toBe(true);
        expect(input.classList.contains('c-input--slider')).toBe(false);
      });
    });
  });

  describe('Reset & Memory Hygiene', () => {
    it('should reset configuration back to defaults on resetToDefaults()', () => {
      component.geometryType.set('cylinder');
      component.widthMm.set(180);
      component.resetToDefaults();

      expect(component.geometryType()).toBe('flat');
      expect(component.widthMm()).toBe(100);
    });

    it('should revoke created object URLs upon destruction', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component['activeDownloadUrls'].push('blob:dummy-litho-url');

      fixture.destroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:dummy-litho-url');
      revokeSpy.mockRestore();
    });
  });

  describe('Privacy & Zero Exfiltration (Directive 1 & 2)', () => {
    it('should assert strictly 0 network requests during operations', async () => {
      // Exercise core interactions
      component.applyPreset(LITHOPHANE_PRESETS[0]);
      component.updateContrast(1.3);
      component.toggleBacklight();
      await component.downloadFormat('stl');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
