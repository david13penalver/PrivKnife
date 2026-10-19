import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PdfSignerStamperComponent } from './pdf-signer-stamper.component';
import {
  DUMMY_SIGNATURE_PNG_DATA_URL,
  createSyntheticPdfBytes,
} from './test-fixtures';

describe('PdfSignerStamperComponent (Seam 2 & 4)', () => {
  let component: PdfSignerStamperComponent;
  let fixture: ComponentFixture<PdfSignerStamperComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let samplePdfBytes: Uint8Array;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    samplePdfBytes = await createSyntheticPdfBytes(1, 'Sample Lease Agreement');

    await TestBed.configureTestingModule({
      imports: [PdfSignerStamperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PdfSignerStamperComponent);
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

    it('should initialize with standard default signing options', () => {
      expect(component.signatureInkColor()).toBe('black');
      expect(component.signaturePenWidth()).toBe(2);
      expect(component.dateFormat()).toBe('YYYY-MM-DD');
      expect(component.flattenAnnotations()).toBe(true);
      expect(component.placedStamps().length).toBe(0);
      expect(component.isProcessing()).toBe(false);
    });
  });

  describe('Controls & Reactive State Updates', () => {
    it('should update ink color to dark blue', () => {
      component.setSignatureInkColor('dark_blue');
      expect(component.signatureInkColor()).toBe('dark_blue');
    });

    it('should update signature pen width', () => {
      component.setSignaturePenWidth(4);
      expect(component.signaturePenWidth()).toBe(4);
    });

    it('should update date format and initials', () => {
      component.setDateFormat('MMM D, YYYY');
      expect(component.dateFormat()).toBe('MMM D, YYYY');

      component.setInitialsText('AB');
      expect(component.initialsText()).toBe('AB');
    });

    it('should reset parameters to default', () => {
      component.setSignatureInkColor('dark_blue');
      component.setSignaturePenWidth(5);
      component.setDateFormat('DD/MM/YYYY');
      component.setInitialsText('ZZ');

      component.resetToDefaults();

      expect(component.signatureInkColor()).toBe('black');
      expect(component.signaturePenWidth()).toBe(2);
      expect(component.dateFormat()).toBe('YYYY-MM-DD');
    });
  });

  describe('Document Loading & Stamp Management', () => {
    it('should load a synthetic or uploaded PDF file', async () => {
      const file = new File([samplePdfBytes.buffer as ArrayBuffer], 'contract.pdf', {
        type: 'application/pdf',
      });
      await component.handleFileSelected(file);

      expect(component.documentLoaded()).toBe(true);
      expect(component.fileName()).toBe('contract.pdf');
      expect(component.pageCount()).toBe(1);
    });

    it('should place signature stamp on document', async () => {
      const file = new File([samplePdfBytes.buffer as ArrayBuffer], 'lease.pdf', {
        type: 'application/pdf',
      });
      await component.handleFileSelected(file);

      component.addSignatureStamp(DUMMY_SIGNATURE_PNG_DATA_URL, 100, 150);
      expect(component.placedStamps().length).toBe(1);
      expect(component.placedStamps()[0].type).toBe('signature');
      expect(component.placedStamps()[0].x).toBe(100);
      expect(component.placedStamps()[0].y).toBe(150);
    });

    it('should place date and initials stamps', async () => {
      const file = new File([samplePdfBytes.buffer as ArrayBuffer], 'lease.pdf', {
        type: 'application/pdf',
      });
      await component.handleFileSelected(file);

      component.addDateStamp(300, 150);
      component.addInitialsStamp(450, 150);

      expect(component.placedStamps().length).toBe(2);
      expect(component.placedStamps()[0].type).toBe('date');
      expect(component.placedStamps()[1].type).toBe('initials');
    });

    it('should remove a placed stamp by id', async () => {
      const file = new File([samplePdfBytes.buffer as ArrayBuffer], 'lease.pdf', {
        type: 'application/pdf',
      });
      await component.handleFileSelected(file);

      component.addDateStamp(300, 150);
      const stampId = component.placedStamps()[0].id;

      component.removeStamp(stampId);
      expect(component.placedStamps().length).toBe(0);
    });

    it('should clear all placed stamps', async () => {
      const file = new File([samplePdfBytes.buffer as ArrayBuffer], 'lease.pdf', {
        type: 'application/pdf',
      });
      await component.handleFileSelected(file);

      component.addDateStamp(300, 150);
      component.addInitialsStamp(450, 150);
      expect(component.placedStamps().length).toBe(2);

      component.clearAllStamps();
      expect(component.placedStamps().length).toBe(0);
    });
  });

  describe('Deliverable Export & Zero-Exfiltration Guard (Seam 4)', () => {
    it('should export signed PDF without throwing', async () => {
      const file = new File([samplePdfBytes.buffer as ArrayBuffer], 'contract.pdf', {
        type: 'application/pdf',
      });
      await component.handleFileSelected(file);
      component.addDateStamp(100, 100);

      await component.exportSignedPdf();

      expect(component.isProcessing()).toBe(false);
      expect(component.processingError()).toBeNull();
    });

    it('should enforce zero network requests throughout full signing workflow', async () => {
      const file = new File([samplePdfBytes.buffer as ArrayBuffer], 'nda.pdf', {
        type: 'application/pdf',
      });
      await component.handleFileSelected(file);
      component.addSignatureStamp(DUMMY_SIGNATURE_PNG_DATA_URL, 50, 50);
      component.addDateStamp(200, 50);
      await component.exportSignedPdf();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
