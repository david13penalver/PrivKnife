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

    it('should update mosaic block size within range', () => {
      component.setMosaicBlockSize(24);
      expect(component.mosaicBlockSize()).toBe(24);
    });

    it('should update blur radius within range', () => {
      component.setBlurRadius(18);
      expect(component.blurRadiusPx()).toBe(18);
    });

    it('should update export format between jpeg and png', () => {
      component.setExportFormat('png');
      expect(component.exportFormat()).toBe('png');
    });
  });

  describe('Region Management', () => {
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

  describe('File Selection & Processing', () => {
    it('should accept image file and configure preview', async () => {
      const file = createSyntheticImageFile('vehicle.jpg', 4096);
      await component.handleFileSelected(file);

      expect(component.originalImage()).toBeTruthy();
      expect(component.originalImage()?.name).toBe('vehicle.jpg');
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
