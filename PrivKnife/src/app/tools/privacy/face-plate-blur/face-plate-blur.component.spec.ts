import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FacePlateBlurComponent } from './face-plate-blur.component';
import { createSyntheticImageFile, SAMPLE_BLUR_REGIONS } from './test-fixtures';

describe('FacePlateBlurComponent (Seam 2 & 4)', () => {
  let component: FacePlateBlurComponent;
  let fixture: ComponentFixture<FacePlateBlurComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [FacePlateBlurComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FacePlateBlurComponent);
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

    it('should initialize with default privacy blur options', () => {
      expect(component.censorMode()).toBe('mosaic_pixelate');
      expect(component.mosaicBlockSize()).toBe(16);
      expect(component.blurRadiusPx()).toBe(12);
      expect(component.selectionMode()).toBe('manual_rect');
      expect(component.brushRadiusPx()).toBe(20);
      expect(component.exportFormat()).toBe('jpeg');
      expect(component.exportQuality()).toBe(0.92);
      expect(component.stripExif()).toBe(true);
      expect(component.regions().length).toBe(0);
    });
  });

  describe('Censor Mode & Parameter Modifications', () => {
    it('should update censor mode', () => {
      component.setCensorMode('blackout_box');
      expect(component.censorMode()).toBe('blackout_box');

      component.setCensorMode('gaussian_blur');
      expect(component.censorMode()).toBe('gaussian_blur');
    });

    it('should update selection mode', () => {
      component.setSelectionMode('brush_stroke');
      expect(component.selectionMode()).toBe('brush_stroke');

      component.setSelectionMode('auto_detect_faces');
      expect(component.selectionMode()).toBe('auto_detect_faces');
    });

    it('should update mosaic block size within range', () => {
      component.setMosaicBlockSize(24);
      expect(component.mosaicBlockSize()).toBe(24);
    });

    it('should update blur radius within range', () => {
      component.setBlurRadius(18);
      expect(component.blurRadiusPx()).toBe(18);
    });

    it('should update brush radius within range', () => {
      component.setBrushRadius(35);
      expect(component.brushRadiusPx()).toBe(35);
    });

    it('should update export format between jpeg and png', () => {
      component.setExportFormat('png');
      expect(component.exportFormat()).toBe('png');
    });
  });

  describe('Region Management & Coordinate Editing', () => {
    it('should add a censor region', () => {
      const regionId = component.addRegion({
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        mode: 'mosaic_pixelate',
      });

      expect(regionId).toBeTruthy();
      expect(component.regions().length).toBe(1);
      expect(component.regions()[0].x).toBe(100);
    });

    it('should edit region coordinates and mode dynamically', () => {
      const regionId = component.addRegion({
        x: 50,
        y: 50,
        width: 80,
        height: 80,
        mode: 'mosaic_pixelate',
      });

      component.updateRegionCoord(regionId, 'x', 75);
      component.updateRegionCoord(regionId, 'width', 120);
      component.updateRegionMode(regionId, 'gaussian_blur');

      const updated = component.regions().find((r) => r.id === regionId);
      expect(updated?.x).toBe(75);
      expect(updated?.width).toBe(120);
      expect(updated?.mode).toBe('gaussian_blur');
    });

    it('should remove a region by id', () => {
      const r1 = component.addRegion({
        x: 50,
        y: 50,
        width: 80,
        height: 80,
        mode: 'mosaic_pixelate',
      });
      const r2 = component.addRegion({
        x: 150,
        y: 150,
        width: 100,
        height: 100,
        mode: 'blackout_box',
      });

      expect(component.regions().length).toBe(2);
      component.removeRegion(r1);
      expect(component.regions().length).toBe(1);
      expect(component.regions()[0].id).toBe(r2);
    });

    it('should clear all regions', () => {
      component.addRegion({
        x: 10,
        y: 10,
        width: 40,
        height: 40,
        mode: 'mosaic_pixelate',
      });
      component.addRegion({
        x: 80,
        y: 80,
        width: 50,
        height: 50,
        mode: 'blackout_box',
      });
      expect(component.regions().length).toBe(2);

      component.clearAllRegions();
      expect(component.regions().length).toBe(0);
    });
  });

  describe('Canvas Pointer Drawing & Auto-Detect', () => {
    it('should add a rectangular region from canvas pointer events', () => {
      // Mock canvas element
      const canvasEl = document.createElement('canvas');
      canvasEl.width = 400;
      canvasEl.height = 300;
      vi.spyOn(canvasEl, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      component.previewCanvasRef = { nativeElement: canvasEl };
      component.originalImage.set({
        file: new Blob(),
        name: 'test.jpg',
        url: 'blob:test',
        size: 1000,
      });

      component.setSelectionMode('manual_rect');
      component.onCanvasPointerDown({ clientX: 50, clientY: 50, pointerId: 1 } as any);
      component.onCanvasPointerMove({ clientX: 150, clientY: 120, pointerId: 1 } as any);
      component.onCanvasPointerUp({ clientX: 150, clientY: 120, pointerId: 1 } as any);

      expect(component.regions().length).toBe(1);
      const reg = component.regions()[0];
      expect(reg.x).toBe(50);
      expect(reg.y).toBe(50);
      expect(reg.width).toBe(100);
      expect(reg.height).toBe(70);
    });

    it('should add a brush stroke region from canvas pointer events', () => {
      const canvasEl = document.createElement('canvas');
      canvasEl.width = 400;
      canvasEl.height = 300;
      vi.spyOn(canvasEl, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      component.previewCanvasRef = { nativeElement: canvasEl };
      component.originalImage.set({
        file: new Blob(),
        name: 'test.jpg',
        url: 'blob:test',
        size: 1000,
      });

      component.setSelectionMode('brush_stroke');
      component.setBrushRadius(25);
      component.onCanvasPointerDown({ clientX: 100, clientY: 100, pointerId: 1 } as any);
      component.onCanvasPointerMove({ clientX: 110, clientY: 110, pointerId: 1 } as any);
      component.onCanvasPointerUp({ clientX: 120, clientY: 120, pointerId: 1 } as any);

      expect(component.regions().length).toBe(1);
      const reg = component.regions()[0];
      expect(reg.points?.length).toBeGreaterThan(0);
      expect(reg.brushRadius).toBe(25);
    });
  });

  describe('File Selection & State Reset', () => {
    it('should accept image file and configure preview', async () => {
      const file = createSyntheticImageFile('vehicle.jpg', 4096);
      await component.handleFileSelected(file);

      expect(component.originalImage()).toBeTruthy();
      expect(component.originalImage()?.name).toBe('vehicle.jpg');
    });

    it('should reset stale previewUrl, lastResult, and regions on new file selection', async () => {
      const file1 = createSyntheticImageFile('first.jpg', 2048);
      await component.handleFileSelected(file1);
      component.addRegion(SAMPLE_BLUR_REGIONS[0]);
      await component.processImage();

      expect(component.previewUrl()).toBeTruthy();
      expect(component.lastResult()).toBeTruthy();
      expect(component.regions().length).toBe(1);

      // Upload second file
      const file2 = createSyntheticImageFile('second.jpg', 4096);
      await component.handleFileSelected(file2);

      expect(component.originalImage()?.name).toBe('second.jpg');
      expect(component.previewUrl()).toBeNull();
      expect(component.lastResult()).toBeNull();
      expect(component.regions().length).toBe(0);
    });

    it('should load sample photo and populate default regions', async () => {
      await component.loadSamplePhoto();

      expect(component.originalImage()).toBeTruthy();
      expect(component.originalImage()?.name).toBe('car-sale-sample.png');
      expect(component.regions().length).toBe(2);
    });

    it('should process image with regions and produce deliverable result', async () => {
      const file = createSyntheticImageFile('face.jpg', 3000);
      await component.handleFileSelected(file);

      component.addRegion(SAMPLE_BLUR_REGIONS[0]);
      await component.processImage();

      expect(component.lastResult()).toBeTruthy();
      expect(component.lastResult()?.success).toBe(true);
      expect(component.lastResult()?.fileName).toContain('-sanitized');
    });
  });

  describe('Export & Download Action', () => {
    it('should trigger browser download on valid result', async () => {
      const clickSpy = vi.fn();
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreateElement(tag);
        if (tag === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      const file = createSyntheticImageFile('id-card.jpg', 2048);
      await component.handleFileSelected(file);
      await component.processImage();

      component.downloadDeliverable();
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Memory Hygiene & Disposal', () => {
    it('should revoke created object URLs upon reset and destroy', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const file = createSyntheticImageFile('test-photo.jpg', 1024);
      await component.handleFileSelected(file);
      await component.processImage();

      component.resetToDefaults();
      expect(revokeSpy).toHaveBeenCalled();
    });
  });

  describe('Privacy & Zero-Exfiltration Guard', () => {
    it('should execute full blur and export without invoking fetch or XHR', async () => {
      const file = createSyntheticImageFile('sensitive-license-plate.jpg', 2048);
      await component.handleFileSelected(file);

      component.setCensorMode('blackout_box');
      component.addRegion({
        x: 100,
        y: 200,
        width: 150,
        height: 60,
        mode: 'blackout_box',
      });

      await component.processImage();
      component.downloadDeliverable();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
