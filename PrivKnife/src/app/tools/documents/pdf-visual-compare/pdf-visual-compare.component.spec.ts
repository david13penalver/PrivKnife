import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfVisualCompareComponent } from './pdf-visual-compare.component';
import { createContractPdfPair, createTextPagesPdf } from './test-fixtures';

describe('PdfVisualCompareComponent (Seam 3: Angular UI, Diff Filters, XSS Safety & Resource Cleanup)', () => {
  let component: PdfVisualCompareComponent;
  let fixture: ComponentFixture<PdfVisualCompareComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PdfVisualCompareComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfVisualCompareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with default overlay view, sensitivity, and empty slots', () => {
    expect(component).toBeTruthy();
    expect(component.viewMode()).toBe('overlay');
    expect(component.pixelSensitivity()).toBe(0.15);
    expect(component.ignoreWhitespace()).toBe(true);
    expect(component.ignoreCase()).toBe(false);
    expect(component.pageOffsetB()).toBe(0);
    expect(component.showChangedOnly()).toBe(false);
    expect(component.canCompare()).toBe(false);
  });

  it('reports 0 changed pages for identical PDFs and jumps accurately on contract diffs', async () => {
    const identical = await createTextPagesPdf(['Section 1 ok', 'Section 2 ok']);
    await component.onFileADropped([
      new File([identical.buffer as ArrayBuffer], 'orig.pdf', { type: 'application/pdf' }),
    ]);
    await component.onFileBDropped([
      new File([identical.buffer as ArrayBuffer], 'copy.pdf', { type: 'application/pdf' }),
    ]);
    expect(component.canCompare()).toBe(true);

    await component.compareDocuments();
    expect(component.compareResult()?.success).toBe(true);
    expect(component.compareResult()?.changedPageCount).toBe(0);

    // Load contract diff pair where only page 2 changes
    const { pdfA, pdfB } = await createContractPdfPair();
    await component.onFileADropped([
      new File([pdfA.buffer as ArrayBuffer], 'contract-v1.pdf', { type: 'application/pdf' }),
    ]);
    await component.onFileBDropped([
      new File([pdfB.buffer as ArrayBuffer], 'contract-v2.pdf', { type: 'application/pdf' }),
    ]);
    await component.compareDocuments();

    expect(component.compareResult()?.totalPairs).toBe(3);
    expect(component.compareResult()?.changedPageCount).toBe(1);

    component.showChangedOnly.set(true);
    expect(component.visibleSummaries()).toHaveLength(1);
    expect(component.visibleSummaries()[0].pairIndex).toBe(2);

    component.activePairIndex.set(1);
    component.jumpToNextChangedPage();
    expect(component.activePairIndex()).toBe(2);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('renders XSS text payloads safely in Text Diff view without executing or injecting script nodes', async () => {
    const clean = await createTextPagesPdf(['Hello']);
    const dirty = await createTextPagesPdf(['Hello <script>alert(1)</script>']);

    await component.onFileADropped([
      new File([clean.buffer as ArrayBuffer], 'a.pdf', { type: 'application/pdf' }),
    ]);
    await component.onFileBDropped([
      new File([dirty.buffer as ArrayBuffer], 'b.pdf', { type: 'application/pdf' }),
    ]);
    component.setViewMode('text_diff');
    await component.compareDocuments();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('script')).toBeNull();
    expect(el.textContent).toContain('<script>alert(1)</script>');
  });

  it('rejects non-PDF files and warns cleanly on > 100 MB files', async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'img.png', {
      type: 'image/png',
    });
    await component.onFileADropped([png]);
    expect(component.errorMessage()).toBeTruthy();
    expect(component.pdfBytesA()).toBeNull();

    const smallPdf = await createTextPagesPdf(['OK']);
    const huge = new File([smallPdf.buffer as ArrayBuffer], 'blueprint.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(huge, 'size', { value: 120 * 1024 * 1024 });

    await component.onFileADropped([huge]);
    expect(component.largeFileWarning()).toBe(true);
    expect(component.pdfBytesA()).not.toBeNull();
  });

  it('updates localized UI text EN <-> ES and cleans up ObjectURLs, state & workers on export/reset', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-compare-report');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const { pdfA, pdfB } = await createContractPdfPair();
    await component.onFileADropped([
      new File([pdfA.buffer as ArrayBuffer], 'v1.pdf', { type: 'application/pdf' }),
    ]);
    await component.onFileBDropped([
      new File([pdfB.buffer as ArrayBuffer], 'v2.pdf', { type: 'application/pdf' }),
    ]);
    await component.compareDocuments();

    component.downloadHtmlReport();
    await component.downloadPdfReport();
    expect(createUrlSpy).toHaveBeenCalledTimes(2);

    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Comparador');

    component.reset();
    expect(component.pdfBytesA()).toBeNull();
    expect(component.pdfBytesB()).toBeNull();
    expect(component.compareResult()).toBeNull();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-compare-report');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });
});
