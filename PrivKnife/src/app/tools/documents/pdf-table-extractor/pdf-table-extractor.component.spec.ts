import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfTableExtractorComponent } from './pdf-table-extractor.component';
import {
  createScannedBlankPdf,
  createTwoPageLedgerPdf,
} from './test-fixtures';

describe('PdfTableExtractorComponent (Seam 3: Angular UI, Column Splitters, Scanned Fallback & Hygiene)', () => {
  let component: PdfTableExtractorComponent;
  let fixture: ComponentFixture<PdfTableExtractorComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PdfTableExtractorComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfTableExtractorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with default ledger extraction settings and empty table state', () => {
    expect(component).toBeTruthy();
    expect(component.mergeAllPages()).toBe(true);
    expect(component.stripRepeatedHeaders()).toBe(true);
    expect(component.firstRowAsHeader()).toBe(true);
    expect(component.detectNumericTypes()).toBe(true);
    expect(component.sanitizeCsvFormulas()).toBe(true);
    expect(component.pdfBytes()).toBeNull();
    expect(component.tables()).toHaveLength(0);
  });

  it('extracts multi-page ledger PDF, supports merge toggle and manual column splitter edits without re-parsing', async () => {
    const ledgerBytes = await createTwoPageLedgerPdf();
    await component.onFileDropped([
      new File([ledgerBytes.buffer as ArrayBuffer], 'ledger.pdf', {
        type: 'application/pdf',
      }),
    ]);

    expect(component.isScannedFallbackNeeded()).toBe(false);
    expect(component.tables()).toHaveLength(1);
    expect(component.tables()[0].headers).toEqual(['Date', 'Description', 'Qty', 'Amount']);
    expect(component.tables()[0].rows).toHaveLength(5);

    // Toggle merge off -> reclusters cached tokens into 2 page tables
    await component.setMergeAllPages(false);
    expect(component.tables()).toHaveLength(2);

    // Toggle merge back on & add/remove manual column splits
    await component.setMergeAllPages(true);
    const initialCols = component.activeColumnSplits().length;
    await component.addColumnSplit(250);
    expect(component.activeColumnSplits().length).toBe(initialCols + 1);
    await component.removeColumnSplit(0);
    expect(component.activeColumnSplits().length).toBe(initialCols);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('detects scanned blank PDFs and shows Local OCR tool link cleanly', async () => {
    const scannedBytes = await createScannedBlankPdf();
    await component.onFileDropped([
      new File([scannedBytes.buffer as ArrayBuffer], 'scan.pdf', {
        type: 'application/pdf',
      }),
    ]);
    fixture.detectChanges();

    expect(component.isScannedFallbackNeeded()).toBe(true);
    expect(component.tables()).toHaveLength(0);
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/tools/local-ocr-text-extractor"]');
    expect(link).not.toBeNull();
  });

  it('rejects non-PDF files cleanly and flags files > 100 MB with a non-blocking warning', async () => {
    const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'img.png', {
      type: 'image/png',
    });
    await component.onFileDropped([pngFile]);
    expect(component.errorMessage()).toBeTruthy();
    expect(component.pdfBytes()).toBeNull();

    const ledgerBytes = await createTwoPageLedgerPdf();
    const huge = new File([ledgerBytes.buffer as ArrayBuffer], 'giant-ledger.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(huge, 'size', { value: 115 * 1024 * 1024 });

    await component.onFileDropped([huge]);
    expect(component.largeFileWarning()).toBe(true);
    expect(component.tables().length).toBeGreaterThan(0);
  });

  it('exports .xlsx/.csv/.json safely, updates localized UI EN <-> ES, and revokes ObjectURLs + clears state on reset', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-table-export');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const ledgerBytes = await createTwoPageLedgerPdf();
    await component.onFileDropped([
      new File([ledgerBytes.buffer as ArrayBuffer], 'q1.pdf', { type: 'application/pdf' }),
    ]);

    await component.exportFile('xlsx');
    await component.exportFile('csv');
    await component.exportFile('json');
    expect(createUrlSpy).toHaveBeenCalledTimes(3);

    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tablas');

    component.reset();
    expect(component.pdfBytes()).toBeNull();
    expect(component.tables()).toHaveLength(0);
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-table-export');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });
});
