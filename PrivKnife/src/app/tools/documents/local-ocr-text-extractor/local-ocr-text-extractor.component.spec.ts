import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalOcrTextExtractorComponent } from './local-ocr-text-extractor.component';
import {
  createSyntheticImageFile,
  createSyntheticPdfFile,
} from './test-fixtures';

describe('LocalOcrTextExtractorComponent (Seam 2 & 4)', () => {
  let component: LocalOcrTextExtractorComponent;
  let fixture: ComponentFixture<LocalOcrTextExtractorComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [LocalOcrTextExtractorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalOcrTextExtractorComponent);
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

    it('should initialize with default OCR options', () => {
      expect(component.ocrLanguage()).toBe('eng');
      expect(component.pageSegmentationMode()).toBe('auto');
      expect(component.cleanIrregularLinebreaks()).toBe(true);
      expect(component.preserveTableSpacing()).toBe(true);
      expect(component.exportFormat()).toBe('txt');
      expect(component.binarizeThreshold()).toBe(128);
      expect(component.enhanceContrast()).toBe(true);
      expect(component.selectedFile()).toBeNull();
      expect(component.extractedResult()).toBeNull();
    });
  });

  describe('Controls & Reactive State Updates', () => {
    it('should update OCR language', () => {
      component.setLanguage('spa');
      expect(component.ocrLanguage()).toBe('spa');

      component.setLanguage('deu');
      expect(component.ocrLanguage()).toBe('deu');
    });

    it('should update page segmentation mode', () => {
      component.setSegmentation('single_block');
      expect(component.pageSegmentationMode()).toBe('single_block');
    });

    it('should update export format between txt, markdown, and docx', () => {
      component.setExportFormat('markdown');
      expect(component.exportFormat()).toBe('markdown');

      component.setExportFormat('docx');
      expect(component.exportFormat()).toBe('docx');
    });

    it('should update preprocessing signals (enhanceContrast, binarizeThreshold)', () => {
      component.setEnhanceContrast(false);
      expect(component.enhanceContrast()).toBe(false);

      component.setBinarizeThreshold(160);
      expect(component.binarizeThreshold()).toBe(160);
    });

    it('should toggle clean linebreaks and table preservation flags', () => {
      component.setCleanLinebreaks(false);
      expect(component.cleanIrregularLinebreaks()).toBe(false);

      component.setPreserveTables(false);
      expect(component.preserveTableSpacing()).toBe(false);
    });
  });

  describe('File Handling & Text Extraction', () => {
    it('should accept uploaded image without creating unused blob URLs', async () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
      const file = createSyntheticImageFile('scanned-doc.png', 2048);
      await component.handleFileSelected(file);

      expect(component.selectedFile()).toBeTruthy();
      expect(component.selectedFile()?.name).toBe('scanned-doc.png');
      expect(component.selectedFile()?.isPdf).toBe(false);
      // DEFECT-47-03: Must NOT call createObjectURL for unused preview URL
      expect(createObjectURLSpy).not.toHaveBeenCalled();
      createObjectURLSpy.mockRestore();
    });

    it('should reset stale extractedResult and previewText on new file selection', async () => {
      const file1 = createSyntheticImageFile('first-doc.png', 2048);
      await component.handleFileSelected(file1);
      await component.extractText();

      expect(component.extractedResult()).toBeTruthy();
      expect(component.previewText().length).toBeGreaterThan(0);

      const file2 = createSyntheticImageFile('second-doc.png', 2048);
      await component.handleFileSelected(file2);

      expect(component.selectedFile()?.name).toBe('second-doc.png');
      expect(component.extractedResult()).toBeNull();
      expect(component.previewText()).toBe('');
    });

    it('should load sample receipt when loadSampleReceipt is called', async () => {
      await component.loadSampleReceipt();

      expect(component.selectedFile()).toBeTruthy();
      expect(component.selectedFile()?.name).toBe('sample-invoice.png');
    });

    it('should accept uploaded PDF and configure state', async () => {
      const file = createSyntheticPdfFile('scanned-contract.pdf', 4096);
      await component.handleFileSelected(file);

      expect(component.selectedFile()).toBeTruthy();
      expect(component.selectedFile()?.name).toBe('scanned-contract.pdf');
      expect(component.selectedFile()?.isPdf).toBe(true);
    });

    it('should run OCR extraction and populate results', async () => {
      const file = createSyntheticImageFile('receipt.jpg', 2048);
      await component.handleFileSelected(file);
      await component.extractText();

      expect(component.extractedResult()).toBeTruthy();
      expect(component.extractedResult()?.success).toBe(true);
      expect(component.previewText().length).toBeGreaterThan(0);
      expect(component.extractedResult()?.metadata?.pageCount).toBeGreaterThanOrEqual(1);
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

      const file = createSyntheticImageFile('invoice.png', 1024);
      await component.handleFileSelected(file);
      await component.extractText();

      component.downloadDeliverable();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should copy extracted text to clipboard', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy,
        },
      });

      const file = createSyntheticImageFile('invoice.png', 1024);
      await component.handleFileSelected(file);
      await component.extractText();

      await component.copyToClipboard();
      expect(writeTextSpy).toHaveBeenCalled();
    });
  });

  describe('Memory Hygiene & Disposal', () => {
    it('should revoke created object URLs upon reset and destroy', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const file = createSyntheticImageFile('memo.png', 1024);
      await component.handleFileSelected(file);
      await component.extractText();
      component.downloadDeliverable();

      component.resetToDefaults();
      expect(revokeSpy).toHaveBeenCalled();
    });
  });

  describe('Privacy & Zero-Exfiltration Guard', () => {
    it('should process OCR workflow without dispatching any network requests', async () => {
      const file = createSyntheticPdfFile('private-tax-return.pdf', 3000);
      await component.handleFileSelected(file);
      component.setLanguage('eng');
      component.setExportFormat('docx');
      await component.extractText();
      component.downloadDeliverable();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
