import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfToWordMarkdownComponent } from './pdf-to-word-markdown.component';
import {
  createScannedBlankPdf,
  createStructuredSamplePdf,
} from './test-fixtures';

describe('PdfToWordMarkdownComponent (Seam 3: Angular UI, XSS Safety, Scanned Fallback & Hygiene)', () => {
  let component: PdfToWordMarkdownComponent;
  let fixture: ComponentFixture<PdfToWordMarkdownComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PdfToWordMarkdownComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfToWordMarkdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with default document layout options and empty state', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab()).toBe('word');
    expect(component.detectMultiColumn()).toBe(true);
    expect(component.stripHeadersFooters()).toBe(true);
    expect(component.dehyphenateWords()).toBe(true);
    expect(component.preserveInlineStyles()).toBe(true);
    expect(component.includePageBreaks()).toBe(false);
    expect(component.pdfBytes()).toBeNull();
  });

  it('converts structured PDF into blocks/markdown/OOXML and renders XSS text safely in Word preview DOM', async () => {
    const sampleBytes = await createStructuredSamplePdf();
    await component.onFileDropped([
      new File([sampleBytes.buffer as ArrayBuffer], 'privacy-arch.pdf', {
        type: 'application/pdf',
      }),
    ]);
    fixture.detectChanges();

    expect(component.isScannedFallbackNeeded()).toBe(false);
    expect(component.headingCount()).toBeGreaterThanOrEqual(2);
    expect(component.wordCount()).toBeGreaterThan(20);
    expect(component.markdownContent()).toContain('# Annual Privacy Architecture Report');
    expect(component.result()?.docxBlob).toBeInstanceOf(Blob);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');

    // Switch preview tabs cleanly
    component.setActiveTab('markdown');
    fixture.detectChanges();
    component.setActiveTab('plaintext');
    fixture.detectChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('displays Local OCR link banner cleanly for scanned blank PDFs', async () => {
    const scannedBytes = await createScannedBlankPdf();
    await component.onFileDropped([
      new File([scannedBytes.buffer as ArrayBuffer], 'scanned.pdf', {
        type: 'application/pdf',
      }),
    ]);
    fixture.detectChanges();

    expect(component.isScannedFallbackNeeded()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/tools/local-ocr-text-extractor"]')).not.toBeNull();
  });

  it('rejects non-PDF files cleanly and warns on > 100 MB files', async () => {
    const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'img.png', {
      type: 'image/png',
    });
    await component.onFileDropped([pngFile]);
    expect(component.errorMessage()).toBeTruthy();
    expect(component.pdfBytes()).toBeNull();

    const sampleBytes = await createStructuredSamplePdf();
    const huge = new File([sampleBytes.buffer as ArrayBuffer], 'massive-manuscript.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(huge, 'size', { value: 112 * 1024 * 1024 });

    await component.onFileDropped([huge]);
    expect(component.largeFileWarning()).toBe(true);
    expect(component.pdfBytes()).not.toBeNull();
  });

  it('exports .docx/.md/.txt safely, switches EN <-> ES localization, and revokes ObjectURLs on reset', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-word-export');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const sampleBytes = await createStructuredSamplePdf();
    await component.onFileDropped([
      new File([sampleBytes.buffer as ArrayBuffer], 'brief.pdf', { type: 'application/pdf' }),
    ]);

    component.downloadDocx();
    component.downloadMarkdown();
    component.downloadPlainText();
    expect(createUrlSpy).toHaveBeenCalledTimes(3);

    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Word');

    component.reset();
    expect(component.pdfBytes()).toBeNull();
    expect(component.blocks()).toHaveLength(0);
    expect(component.markdownContent()).toBe('');
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-word-export');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });
});
