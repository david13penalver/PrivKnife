import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfImageConverterComponent } from './pdf-image-converter.component';
import {
  createCorruptPdfBytes,
  createSyntheticPdf,
  LANDSCAPE_PNG_BYTES,
  PORTRAIT_PNG_BYTES,
} from './test-fixtures';

describe('PdfImageConverterComponent (Seam 3: Angular UI, Privacy & Resource Safety)', () => {
  let component: PdfImageConverterComponent;
  let fixture: ComponentFixture<PdfImageConverterComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PdfImageConverterComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.loadEnglishTools('pdfImageConverter');
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfImageConverterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with default bidirectional settings', () => {
    expect(component.direction()).toBe('pdf_to_images');
    expect(component.outputFormat()).toBe('image/png');
    expect(component.dpi()).toBe(150);
    expect(component.pageSize()).toBe('a4');
    expect(component.orientation()).toBe('auto');
    expect(component.isProcessing()).toBe(false);
  });

  it('switches directions preserving independent state and manages PDF page selections', async () => {
    const pdfBytes = await createSyntheticPdf(4);
    const pdfFile = new File([pdfBytes.buffer as ArrayBuffer], 'slides.pdf', {
      type: 'application/pdf',
    });
    await component.onPdfDropped([pdfFile]);
    expect(component.pdfTotalPages()).toBe(4);
    expect(component.selectedPages()).toEqual([1, 2, 3, 4]);

    component.deselectAllPages();
    expect(component.selectedPages()).toEqual([]);

    component.togglePageSelection(2);
    component.togglePageSelection(4);
    expect(component.selectedPages()).toEqual([2, 4]);

    component.selectAllPages();
    expect(component.selectedPages()).toEqual([1, 2, 3, 4]);

    component.applyRangeSelection('1, 3-4');
    expect(component.selectedPages()).toEqual([1, 3, 4]);

    // Switching tabs preserves PDF queue
    component.setDirection('images_to_pdf');
    expect(component.direction()).toBe('images_to_pdf');
    component.setDirection('pdf_to_images');
    expect(component.pdfTotalPages()).toBe(4);
  });

  it('handles corrupt/non-PDF uploads cleanly without crashing', async () => {
    const badFile = new File([createCorruptPdfBytes().buffer as ArrayBuffer], 'broken.pdf', {
      type: 'application/pdf',
    });
    await component.onPdfDropped([badFile]);
    expect(component.errorMessage()).toBeTruthy();
    expect(component.pdfTotalPages()).toBe(0);
  });

  it('reorders, rotates, filters, removes images, and compiles valid multi-page PDF', async () => {
    component.setDirection('images_to_pdf');
    const f1 = new File([LANDSCAPE_PNG_BYTES.buffer as ArrayBuffer], 'wide.png', {
      type: 'image/png',
    });
    const f2 = new File([PORTRAIT_PNG_BYTES.buffer as ArrayBuffer], 'tall.png', {
      type: 'image/png',
    });
    await component.onImagesDropped([f1, f2]);
    expect(component.imageQueue()).toHaveLength(2);

    // Boundary safety checks
    component.moveImageUp(0);
    expect(component.imageQueue().map((i) => i.fileName)).toEqual(['wide.png', 'tall.png']);
    component.moveImageDown(1);
    expect(component.imageQueue().map((i) => i.fileName)).toEqual(['wide.png', 'tall.png']);

    component.moveImageDown(0);
    expect(component.imageQueue().map((i) => i.fileName)).toEqual(['tall.png', 'wide.png']);
    component.moveImageUp(1);
    expect(component.imageQueue().map((i) => i.fileName)).toEqual(['wide.png', 'tall.png']);

    component.rotateImage(0);
    expect(component.imageQueue()[0].rotationDeg).toBe(90);
    component.setImageScanFilter(0, 'bw_document');
    expect(component.imageQueue()[0].scanFilter).toBe('bw_document');

    await component.compileImagesToPdf();
    expect(component.errorMessage()).toBeNull();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.mimeType).toBe('application/pdf');
    expect(component.lastResult()?.blob).toBeInstanceOf(Blob);

    component.removeImage(0);
    expect(component.imageQueue()).toHaveLength(1);
  });

  it('loads sample images and updates UI reactively between English and Spanish', async () => {
    component.setDirection('images_to_pdf');
    await component.loadSampleImages();
    expect(component.imageQueue()).toHaveLength(2);

    await i18nService.setLanguage('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('PDF to Images');

    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('PDF a Imágenes');
  });

  it('guarantees zero network exfiltration and revokes all ObjectURLs and workers on teardown', async () => {
    let urlSeq = 0;
    const createUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:img-conv-${++urlSeq}`);
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const terminateSpy = vi.fn();

    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage(): void {
        this.onerror?.(new ErrorEvent('error'));
      }
      terminate = terminateSpy;
    }
    vi.stubGlobal('Worker', MockWorker);

    try {
      component.setDirection('images_to_pdf');
      await component.loadSampleImages();
      await component.compileImagesToPdf();
      component.downloadResult();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
      expect(createUrlSpy.mock.calls.length).toBeGreaterThanOrEqual(3); // 2 thumbnails + 1 download

      component.removeImage(0);
      expect(revokeUrlSpy).toHaveBeenCalled();

      component.reset();
      expect(terminateSpy).toHaveBeenCalled();
      expect(revokeUrlSpy.mock.calls.length).toBeGreaterThanOrEqual(
        createUrlSpy.mock.calls.length - 1
      );
    } finally {
      createUrlSpy.mockRestore();
      revokeUrlSpy.mockRestore();
    }
  });
});
