import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BankStatementConverterComponent } from './bank-statement-converter.component';
import {
  createSyntheticBankCsvFile,
  createSyntheticOfxFile,
  SAMPLE_BANK_CSV,
} from './test-fixtures';

describe('BankStatementConverterComponent (Seam 2 & 4)', () => {
  let component: BankStatementConverterComponent;
  let fixture: ComponentFixture<BankStatementConverterComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [BankStatementConverterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BankStatementConverterComponent);
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

    it('should initialize with default converter options', () => {
      expect(component.dateFormatOutput()).toBe('YYYY-MM-DD');
      expect(component.exportFormat()).toBe('csv');
      expect(component.autoDetectColumns()).toBe(true);
      expect(component.cleanMerchantDescriptions()).toBe(true);
      expect(component.stripPosCodes()).toBe(true);
      expect(component.invertAmountSigns()).toBe(false);
      expect(component.selectedFile()).toBeNull();
      expect(component.lastResult()).toBeNull();
    });
  });

  describe('Controls & Options Updates', () => {
    it('should update output date format', () => {
      component.setDateFormat('MM/DD/YYYY');
      expect(component.dateFormatOutput()).toBe('MM/DD/YYYY');

      component.setDateFormat('DD/MM/YYYY');
      expect(component.dateFormatOutput()).toBe('DD/MM/YYYY');
    });

    it('should update export format between csv, xlsx, and qif', () => {
      component.setExportFormat('xlsx');
      expect(component.exportFormat()).toBe('xlsx');

      component.setExportFormat('qif');
      expect(component.exportFormat()).toBe('qif');
    });

    it('should toggle merchant cleaning and sign inversion flags', () => {
      component.toggleCleanDescriptions();
      expect(component.cleanMerchantDescriptions()).toBe(false);

      component.toggleInvertSigns();
      expect(component.invertAmountSigns()).toBe(true);
    });
  });

  describe('Sample Data & File Handling', () => {
    it('should populate input with sample statement CSV', () => {
      component.loadSampleData();
      expect(component.inputContent()).toContain('WHOLEFDS');
      expect(component.inputContent()).toContain('PAYROLL');
    });

    it('should accept uploaded bank CSV file', async () => {
      const file = createSyntheticBankCsvFile('statement.csv');
      await component.handleFileSelected(file);

      expect(component.selectedFile()).toBeTruthy();
      expect(component.selectedFile()?.name).toBe('statement.csv');
      expect(component.inputContent()).toContain('WHOLEFDS');
    });

    it('should accept uploaded OFX file and switch default export to QIF', async () => {
      const file = createSyntheticOfxFile('export.ofx');
      await component.handleFileSelected(file);

      expect(component.selectedFile()).toBeTruthy();
      expect(component.selectedFile()?.name).toBe('export.ofx');
      expect(component.exportFormat()).toBe('qif');
    });
  });

  describe('Statement Normalization & Deliverable Export', () => {
    it('should convert CSV statement into structured transactions and summary', async () => {
      component.inputContent.set(SAMPLE_BANK_CSV);
      await component.convertStatement();

      expect(component.lastResult()).toBeTruthy();
      expect(component.lastResult()?.success).toBe(true);
      expect(component.lastResult()?.transactions.length).toBe(4);
      expect(component.lastResult()?.summary.totalIncome).toBe(2500);
      expect(component.lastResult()?.summary.totalExpense).toBeGreaterThan(0);
    });

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

      component.inputContent.set(SAMPLE_BANK_CSV);
      await component.convertStatement();

      component.downloadDeliverable();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should copy normalized CSV to clipboard', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy,
        },
      });

      component.inputContent.set(SAMPLE_BANK_CSV);
      await component.convertStatement();

      await component.copyToClipboard();
      expect(writeTextSpy).toHaveBeenCalled();
    });

    it('should copy formatted text in xlsx mode without silent failure (DEFECT-50-03)', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy,
        },
      });

      component.setExportFormat('xlsx');
      component.inputContent.set(SAMPLE_BANK_CSV);
      await component.convertStatement();

      await component.copyToClipboard();
      expect(component.copySuccess()).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('Date,Description,Amount'));
    });
  });

  describe('Memory Hygiene & Disposal', () => {
    it('should not call URL.createObjectURL during handleFileSelected (DEFECT-50-05)', async () => {
      const createSpy = vi.spyOn(URL, 'createObjectURL');
      const file = createSyntheticBankCsvFile();
      await component.handleFileSelected(file);

      expect(createSpy).not.toHaveBeenCalled();
      createSpy.mockRestore();
    });

    it('should revoke created object URLs upon reset and destroy', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const file = createSyntheticBankCsvFile();
      await component.handleFileSelected(file);
      await component.convertStatement();

      component.downloadDeliverable();
      component.resetToDefaults();
      expect(revokeSpy).toHaveBeenCalled();
    });
  });

  describe('Privacy & Zero-Exfiltration Guard', () => {
    it('should normalize statement and export without dispatching any network requests', async () => {
      component.inputContent.set(SAMPLE_BANK_CSV);
      await component.convertStatement();
      component.downloadDeliverable();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
