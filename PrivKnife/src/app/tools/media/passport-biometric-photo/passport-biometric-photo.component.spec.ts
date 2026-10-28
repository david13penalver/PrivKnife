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

    it('should update panX and panY individually', () => {
      component.setPanX(45);
      expect(component.panX()).toBe(45);

      component.setPanY(-30);
      expect(component.panY()).toBe(-30);

      // Clamp limits [-200, 200]
      component.setPanX(300);
      expect(component.panX()).toBe(200);

      component.setPanY(-250);
      expect(component.panY()).toBe(-200);
    });

    it('should update pan coordinates via pointer drag events', () => {
      component.setPan(0, 0);
      const canvasEl = fixture.nativeElement.querySelector('canvas');
      expect(canvasEl).toBeTruthy();

      component.onPointerDown({ clientX: 100, clientY: 100, pointerId: 1 } as any);
      expect(component.isDragging()).toBe(true);

      component.onPointerMove({ clientX: 125, clientY: 85, pointerId: 1 } as any);
      expect(component.panX()).toBe(25);
      expect(component.panY()).toBe(-15);

      component.onPointerUp({ pointerId: 1 } as any);
      expect(component.isDragging()).toBe(false);
    });
  });

  describe('Biometric Crop Guide & Preview Mode Toggle (DEFECT-43-02)', () => {
    it('should initialize in crop_guide preview mode', () => {
      expect(component.previewMode()).toBe('crop_guide');
    });

    it('should toggle between crop_guide and print_sheet mode', () => {
      component.setPreviewMode('print_sheet');
      expect(component.previewMode()).toBe('print_sheet');
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.c-passport__biometric-overlay');
      expect(overlay).toBeNull();

      component.setPreviewMode('crop_guide');
      expect(component.previewMode()).toBe('crop_guide');
      fixture.detectChanges();

      const overlayAfter = fixture.nativeElement.querySelector('.c-passport__biometric-overlay');
      expect(overlayAfter).not.toBeNull();
    });

    it('should compute guidePercentages for active specification', () => {
      const guide = component.guidePercentages();
      expect(guide.chinTopPct).toBeCloseTo(82, 0);
      expect(guide.crownMaxTopPct).toBeGreaterThan(0);
      expect(guide.crownMinTopPct).toBeGreaterThan(guide.crownMaxTopPct);
    });
  });

  describe('BEM Architecture & Form Layout (DEFECT-43-05)', () => {
    it('should use .l-columns__area instead of .l-columns__column', () => {
      const columns = fixture.nativeElement.querySelectorAll('.l-columns__column');
      expect(columns.length).toBe(0);

      const areas = fixture.nativeElement.querySelectorAll('.l-columns__area');
      expect(areas.length).toBeGreaterThanOrEqual(2);
    });

    it('should wrap .l-extremo children with .l-extremo__area-izquierda and __area-derecha', () => {
      const extremos = fixture.nativeElement.querySelectorAll('.l-extremo');
      expect(extremos.length).toBeGreaterThan(0);

      const izq = fixture.nativeElement.querySelectorAll('.l-extremo__area-izquierda');
      const der = fixture.nativeElement.querySelectorAll('.l-extremo__area-derecha');
      expect(izq.length).toBeGreaterThanOrEqual(extremos.length);
      expect(der.length).toBeGreaterThanOrEqual(extremos.length);
    });

    it('should use .c-input__slider and .c-input__switch classes', () => {
      const sliders = fixture.nativeElement.querySelectorAll('.c-input__slider');
      expect(sliders.length).toBeGreaterThanOrEqual(4); // zoom, tilt, panX, panY, bright, contrast

      const switchEl = fixture.nativeElement.querySelector('.c-input__switch');
      expect(switchEl).not.toBeNull();
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
