import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfWatermarkNumberingComponent } from './pdf-watermark-numbering.component';
import {
  createCorruptPdfBytes,
  createSyntheticPdf,
  MINIMAL_VALID_PNG,
} from './test-fixtures';

describe('PdfWatermarkNumberingComponent (Seam 3: Angular UI, Privacy & Resource Safety)', () => {
  let component: PdfWatermarkNumberingComponent;
  let fixture: ComponentFixture<PdfWatermarkNumberingComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PdfWatermarkNumberingComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.loadEnglishTools('pdfWatermarkNumbering');
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfWatermarkNumberingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with standard defaults for watermark and page numbering', () => {
    expect(component).toBeTruthy();
    expect(component.watermarkEnabled()).toBe(true);
    expect(component.watermarkText()).toBe('CONFIDENTIAL');
    expect(component.watermarkKind()).toBe('text');
    expect(component.watermarkLayout()).toBe('single');
    expect(component.watermarkLayer()).toBe('over');
    expect(component.numberingEnabled()).toBe(true);
    expect(component.numberingTemplate()).toBe('Page {n} of {total}');
    expect(component.pageRange()).toBe('all');
    expect(component.isProcessing()).toBe(false);
  });

  it('updates watermark, Bates numbering, anchors, and clamps numeric boundaries', () => {
    component.setWatermarkKind('image');
    expect(component.watermarkKind()).toBe('image');
    component.setWatermarkKind('text');
    component.setWatermarkLayout('tiled');
    component.setWatermarkLayer('under');
    component.setWatermarkAnchor('top-right');
    expect(component.watermarkLayout()).toBe('tiled');
    expect(component.watermarkLayer()).toBe('under');
    expect(component.watermarkAnchor()).toBe('top-right');

    component.setWatermarkOpacity(0.01);
    expect(component.watermarkOpacity()).toBe(0.05);
    component.setWatermarkOpacity(2);
    expect(component.watermarkOpacity()).toBe(1);

    component.setWatermarkRotation(-300);
    expect(component.watermarkRotationDeg()).toBe(-180);
    component.setWatermarkRotation(300);
    expect(component.watermarkRotationDeg()).toBe(180);

    component.setWatermarkFontSize(2);
    expect(component.watermarkFontSizePt()).toBe(6);
    component.setWatermarkFontSize(500);
    expect(component.watermarkFontSizePt()).toBe(200);

    component.applyBatesPreset();
    expect(component.numberingMode()).toBe('bates');
    expect(component.numberingTemplate()).toContain('{bates:');
    component.setMirrorFacingPages(true);
    expect(component.mirrorFacingPages()).toBe(true);
  });

  it('loads sample PDF, navigates pages, previews live numbering labels, and exports stamped PDF', async () => {
    await component.loadSamplePdf();
    expect(component.documentLoaded()).toBe(true);
    expect(component.totalPages()).toBe(3);
    expect(component.currentPreviewPage()).toBe(1);
    expect(component.previewNumberingLabel()).toBe('Page 1 of 3');

    component.setSkipFirstPages(1);
    expect(component.previewNumberingLabel()).toBe('');

    component.nextPage();
    expect(component.currentPreviewPage()).toBe(2);
    expect(component.previewNumberingLabel()).toBe('Page 1 of 3');

    component.prevPage();
    expect(component.currentPreviewPage()).toBe(1);

    await component.applyAndExport();
    expect(component.errorMessage()).toBeNull();
    expect(component.lastResult()).not.toBeNull();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.blob).toBeInstanceOf(Blob);
  });

  it('surfaces inline error for invalid page ranges or corrupt PDFs and resets cleanly', async () => {
    const validBytes = await createSyntheticPdf(2);
    const validFile = new File([validBytes.buffer as ArrayBuffer], 'doc.pdf', {
      type: 'application/pdf',
    });
    await component.onPdfDropped([validFile]);
    component.setPageRange('5-8');
    await component.applyAndExport();
    expect(component.errorMessage()).toBeTruthy();

    const badFile = new File([createCorruptPdfBytes().buffer as ArrayBuffer], 'bad.pdf', {
      type: 'application/pdf',
    });
    await component.onPdfDropped([badFile]);
    expect(component.errorMessage()).toBeTruthy();

    component.reset();
    expect(component.errorMessage()).toBeNull();
    expect(component.documentLoaded()).toBe(false);
    expect(component.lastResult()).toBeNull();
  });

  it('accepts valid PNG watermark logo uploads and rejects unsupported image files', async () => {
    const badImg = new File([new Uint8Array([1, 2, 3])], 'logo.bmp', {
      type: 'image/bmp',
    });
    await component.onLogoImageDropped([badImg]);
    expect(component.errorMessage()).toBeTruthy();

    const goodPng = new File([MINIMAL_VALID_PNG.buffer as ArrayBuffer], 'logo.png', {
      type: 'image/png',
    });
    await component.onLogoImageDropped([goodPng]);
    expect(component.errorMessage()).toBeNull();
    expect(component.logoFileName()).toBe('logo.png');
    expect(component.logoImageBytes()?.byteLength).toBe(MINIMAL_VALID_PNG.byteLength);
  });

  it('updates UI copy reactively between English and Spanish', async () => {
    await i18nService.setLanguage('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('PDF Watermark');

    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Marca de Agua');
  });

  it('guarantees zero network exfiltration and revokes ObjectURLs and workers on teardown', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:wm-mock');
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
      await component.loadSamplePdf();
      await component.applyAndExport();
      component.downloadResult();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
      expect(createUrlSpy).toHaveBeenCalledTimes(1);

      component.reset();
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:wm-mock');
      expect(terminateSpy).toHaveBeenCalled();
    } finally {
      createUrlSpy.mockRestore();
      revokeUrlSpy.mockRestore();
    }
  });
});
