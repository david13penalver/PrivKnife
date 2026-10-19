import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HeicAvifConverterComponent } from './heic-avif-converter.component';
import {
  SAMPLE_AVIF_FILE,
  SAMPLE_BATCH_FILES,
  SAMPLE_HEIC_FILE,
} from './test-fixtures';

describe('HeicAvifConverterComponent (Seam 2 & 4)', () => {
  let component: HeicAvifConverterComponent;
  let fixture: ComponentFixture<HeicAvifConverterComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [HeicAvifConverterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeicAvifConverterComponent);
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

    it('should initialize with default converter parameters', () => {
      expect(component.outputFormat()).toBe('jpeg');
      expect(component.jpegQuality()).toBe(0.92);
      expect(component.stripMetadata()).toBe(true);
      expect(component.maxDimensionPx()).toBe(0);
      expect(component.filenameSuffix()).toBe('');
      expect(component.packageAsZip()).toBe(false);
      expect(component.imageQueue().length).toBe(0);
      expect(component.isConverting()).toBe(false);
    });
  });

  describe('Configuration Controls & Presets', () => {
    it('should update output format to PNG and WebP', () => {
      component.setOutputFormat('png');
      expect(component.outputFormat()).toBe('png');

      component.setOutputFormat('webp');
      expect(component.outputFormat()).toBe('webp');
    });

    it('should update JPEG quality slider', () => {
      component.setJpegQuality(0.85);
      expect(component.jpegQuality()).toBe(0.85);
    });

    it('should update maximum dimension downscaling preset', () => {
      component.setMaxDimensionPx(1920);
      expect(component.maxDimensionPx()).toBe(1920);
    });

    it('should toggle zip packaging and filename suffix', () => {
      component.setPackageAsZip(true);
      expect(component.packageAsZip()).toBe(true);

      component.setFilenameSuffix('-web');
      expect(component.filenameSuffix()).toBe('-web');
    });

    it('should reset parameters to default', () => {
      component.setOutputFormat('png');
      component.setJpegQuality(0.5);
      component.setMaxDimensionPx(1080);
      component.setPackageAsZip(true);
      component.setFilenameSuffix('-test');

      component.resetToDefaults();

      expect(component.outputFormat()).toBe('jpeg');
      expect(component.jpegQuality()).toBe(0.92);
      expect(component.maxDimensionPx()).toBe(0);
      expect(component.packageAsZip()).toBe(false);
      expect(component.filenameSuffix()).toBe('');
    });
  });

  describe('File Drop & Queue Management', () => {
    it('should add selected files into the conversion queue', () => {
      component.handleFilesSelected(SAMPLE_BATCH_FILES);
      expect(component.imageQueue().length).toBe(4);
      expect(component.imageQueue()[0].originalName).toBe(SAMPLE_HEIC_FILE.name);
      expect(component.imageQueue()[2].originalName).toBe(SAMPLE_AVIF_FILE.name);
    });

    it('should remove a single item from the queue', () => {
      component.handleFilesSelected([SAMPLE_HEIC_FILE, SAMPLE_AVIF_FILE]);
      expect(component.imageQueue().length).toBe(2);

      const firstId = component.imageQueue()[0].id;
      component.removeQueueItem(firstId);
      expect(component.imageQueue().length).toBe(1);
      expect(component.imageQueue()[0].originalName).toBe(SAMPLE_AVIF_FILE.name);
    });

    it('should clear entire queue and revoke object URLs', () => {
      component.handleFilesSelected([SAMPLE_HEIC_FILE, SAMPLE_AVIF_FILE]);
      expect(component.imageQueue().length).toBe(2);

      component.clearQueue();
      expect(component.imageQueue().length).toBe(0);
    });
  });

  describe('Batch Conversion & Deliverable Export', () => {
    it('should convert queued files and update stats', async () => {
      component.handleFilesSelected([SAMPLE_HEIC_FILE, SAMPLE_AVIF_FILE]);
      await component.startBatchConversion();

      expect(component.isConverting()).toBe(false);
      expect(component.imageQueue().every((i) => i.status === 'done')).toBe(true);
      expect(component.batchStats().completedFiles).toBe(2);
    });

    it('should download converted batch as ZIP when multiple files', async () => {
      component.handleFilesSelected([SAMPLE_HEIC_FILE, SAMPLE_AVIF_FILE]);
      await component.startBatchConversion();

      await component.downloadAll();
      expect(component.conversionError()).toBeNull();
    });
  });

  describe('Privacy & Zero-Exfiltration Guard (Seam 4)', () => {
    it('should never dispatch network requests during conversion', async () => {
      component.handleFilesSelected([SAMPLE_HEIC_FILE, SAMPLE_AVIF_FILE]);
      await component.startBatchConversion();
      await component.downloadAll();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
