import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PassportBiometricPhotoComponent } from './passport-biometric-photo.component';
import { SAMPLE_PORTRAITS } from './test-fixtures';

describe('PassportBiometricPhotoComponent (Seam 2 & 4)', () => {
  let component: PassportBiometricPhotoComponent;
  let fixture: ComponentFixture<PassportBiometricPhotoComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PassportBiometricPhotoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PassportBiometricPhotoComponent);
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

    it('should initialize with standard default biometric options', () => {
      expect(component.countryPreset()).toBe('us_2x2_inch');
      expect(component.printSheetSize()).toBe('4x6_inches');
      expect(component.backgroundColor()).toBe('pure_white');
      expect(component.zoomLevel()).toBe(1.0);
      expect(component.tiltAngleDeg()).toBe(0);
      expect(component.brightness()).toBe(0);
      expect(component.contrast()).toBe(0);
      expect(component.cutGuideLines()).toBe(true);
      expect(component.exportDpi()).toBe(300);
      expect(component.exportFormat()).toBe('jpg');
    });

    it('should correctly derive biometric metrics for current preset', () => {
      const metrics = component.currentMetrics();
      expect(metrics.photoWidthMm).toBe(50.8);
      expect(metrics.photoHeightMm).toBe(50.8);
      expect(metrics.photosPerSheet).toBe(4);
    });
  });

  describe('Presets & Configuration Selection', () => {
    it('should update country preset to EU Schengen', () => {
      component.setCountryPreset('eu_schengen_35x45mm');
      expect(component.countryPreset()).toBe('eu_schengen_35x45mm');

      const metrics = component.currentMetrics();
      expect(metrics.photoWidthMm).toBe(35);
      expect(metrics.photoHeightMm).toBe(45);
      expect(metrics.photosPerSheet).toBe(6);
    });

    it('should update print sheet size', () => {
      component.setPrintSheetSize('single_digital');
      expect(component.printSheetSize()).toBe('single_digital');
      expect(component.currentMetrics().photosPerSheet).toBe(1);
    });

    it('should update background color selection', () => {
      component.setBackgroundColor('light_grey');
      expect(component.backgroundColor()).toBe('light_grey');
    });

    it('should update zoom and tilt sliders', () => {
      component.setZoomLevel(1.25);
      expect(component.zoomLevel()).toBe(1.25);

      component.setTiltAngle(2.5);
      expect(component.tiltAngleDeg()).toBe(2.5);
    });

    it('should reset adjustments to default', () => {
      component.setZoomLevel(1.5);
      component.setTiltAngle(-4);
      component.setBrightness(15);
      component.setContrast(20);
      component.setPan(10, -15);

      component.resetAdjustments();

      expect(component.zoomLevel()).toBe(1.0);
      expect(component.tiltAngleDeg()).toBe(0);
      expect(component.brightness()).toBe(0);
      expect(component.contrast()).toBe(0);
      expect(component.panX()).toBe(0);
      expect(component.panY()).toBe(0);
    });
  });

  describe('Sample Portraits & Image Uploads', () => {
    it('should load a sample portrait from presets', () => {
      const sample = SAMPLE_PORTRAITS[0];
      component.selectSamplePortrait(sample);

      expect(component.imageSource()).toBe(sample.dataUrl);
      expect(component.fileName()).toBe(sample.name);
    });

    it('should handle custom file upload', () => {
      const file = new File(['fake-image-bytes'], 'user-photo.png', {
        type: 'image/png',
      });
      component.handleFileSelected(file);

      expect(component.fileBlob()).toBe(file);
      expect(component.fileName()).toBe('user-photo.png');
    });
  });

  describe('Export Serialization & Privacy Verification', () => {
    it('should switch export format between jpg, png, and pdf', () => {
      component.setExportFormat('png');
      expect(component.exportFormat()).toBe('png');

      component.setExportFormat('pdf');
      expect(component.exportFormat()).toBe('pdf');
    });

    it('should execute deliverable generation without throwing', async () => {
      component.selectSamplePortrait(SAMPLE_PORTRAITS[0]);
      await component.generateDeliverable();

      expect(component.isGenerating()).toBe(false);
      expect(component.generationError()).toBeNull();
    });

    it('should enforce zero telemetry and never trigger network calls', async () => {
      component.setCountryPreset('uk_35x45mm');
      component.selectSamplePortrait(SAMPLE_PORTRAITS[0]);
      await component.generateDeliverable();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
