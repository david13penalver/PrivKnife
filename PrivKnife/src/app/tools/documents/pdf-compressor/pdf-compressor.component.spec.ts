import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfCompressorComponent } from './pdf-compressor.component';
import {
  createCorruptPdfBytes,
  createSyntheticImagePdf,
  createSyntheticTextPdf,
} from './test-fixtures';

describe('PdfCompressorComponent (Seam 3: Angular UI, Privacy & Resource Safety)', () => {
  let component: PdfCompressorComponent;
  let fixture: ComponentFixture<PdfCompressorComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PdfCompressorComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfCompressorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with recommended defaults and zero loaded files', () => {
    expect(component).toBeTruthy();
    expect(component.preset()).toBe('recommended');
    expect(component.mode()).toBe('smart_stream');
    expect(component.targetDpi()).toBe(150);
    expect(component.jpegQuality()).toBe(0.72);
    expect(component.stripMetadata()).toBe(true);
    expect(component.removeThumbnails()).toBe(true);
    expect(component.convertToGrayscale()).toBe(false);
    expect(component.isProcessing()).toBe(false);
    expect(component.queuedFiles()).toHaveLength(0);
    expect(component.results()).toHaveLength(0);
  });

  it('updates preset parameters and clamps custom slider boundaries', () => {
    component.selectPreset('extreme');
    expect(component.targetDpi()).toBe(96);
    expect(component.jpegQuality()).toBe(0.5);
    expect(component.maxImageDimensionPx()).toBe(1200);

    component.selectPreset('high_quality');
    expect(component.targetDpi()).toBe(240);
    expect(component.jpegQuality()).toBe(0.86);
    expect(component.stripMetadata()).toBe(false);

    component.setTargetDpi(10);
    expect(component.preset()).toBe('custom');
    expect(component.targetDpi()).toBe(72);

    component.setTargetDpi(900);
    expect(component.targetDpi()).toBe(300);

    component.setJpegQuality(0.05);
    expect(component.jpegQuality()).toBe(0.25);

    component.setJpegQuality(1.0);
    expect(component.jpegQuality()).toBe(0.95);
  });

  it('flags files exceeding 100 MB with a non-blocking warning and rejects non-PDF files', async () => {
    const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'photo.png', {
      type: 'image/png',
    });
    await component.onFilesDropped([pngFile]);
    expect(component.errorMessage()).toBeTruthy();
    expect(component.queuedFiles()).toHaveLength(0);

    const smallPdf = await createSyntheticTextPdf(1);
    const hugePdf = new File([smallPdf.buffer as ArrayBuffer], 'giant.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(hugePdf, 'size', { value: 110 * 1024 * 1024 });

    await component.onFilesDropped([hugePdf]);
    expect(component.largeFileWarning()).toBe(true);
    expect(component.queuedFiles()).toHaveLength(1);

    component.removeQueuedFile(0);
    expect(component.queuedFiles()).toHaveLength(0);
    expect(component.largeFileWarning()).toBe(false);
  });

  it('treats compressAll with an empty queue as a safe no-op', async () => {
    expect(component.queuedFiles()).toHaveLength(0);
    await component.compressAll();
    expect(component.isProcessing()).toBe(false);
    expect(component.results()).toHaveLength(0);
    expect(component.errorMessage()).toBeNull();
  });

  it('loads sample PDF, compresses single and batch files, and tracks savings metrics', async () => {
    await component.loadSamplePdf();
    expect(component.queuedFiles()).toHaveLength(1);
    expect(component.queuedFiles()[0].fileName).toContain('sample');

    await component.compressAll();
    expect(component.isProcessing()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.results()).toHaveLength(1);
    expect(component.results()[0].metrics.pageCount).toBe(1);

    // Now test multi-PDF batch -> produces ZIP bundle
    const pdfA = await createSyntheticImagePdf({ streamByteSize: 18000 });
    const pdfB = await createSyntheticImagePdf({ streamByteSize: 20000 });
    const fileA = new File([pdfA.buffer as ArrayBuffer], 'alpha.pdf', {
      type: 'application/pdf',
    });
    const fileB = new File([pdfB.buffer as ArrayBuffer], 'beta.pdf', {
      type: 'application/pdf',
    });

    await component.onFilesDropped([fileA, fileB]);
    await component.compressAll();

    expect(component.results()).toHaveLength(2);
    expect(component.bundleZipBlob()).toBeInstanceOf(Blob);
    expect(component.totalOriginalBytes()).toBe(pdfA.byteLength + pdfB.byteLength);
  });

  it('surfaces clean error banner for corrupt PDFs and resets state cleanly', async () => {
    const badFile = new File([createCorruptPdfBytes().buffer as ArrayBuffer], 'broken.pdf', {
      type: 'application/pdf',
    });
    await component.onFilesDropped([badFile]);
    await component.compressAll();

    expect(component.errorMessage()).toBeTruthy();
    expect(component.results()).toHaveLength(0);

    component.reset();
    expect(component.errorMessage()).toBeNull();
    expect(component.queuedFiles()).toHaveLength(0);
    expect(component.results()).toHaveLength(0);
    expect(component.largeFileWarning()).toBe(false);
  });

  it('updates UI copy reactively between English and Spanish', async () => {
    await i18nService.setLanguage('en');
    fixture.detectChanges();
    const enText = fixture.nativeElement.textContent;
    expect(enText).toContain('Client-Side PDF Compressor');

    await i18nService.setLanguage('es');
    fixture.detectChanges();
    const esText = fixture.nativeElement.textContent;
    expect(esText).toContain('Compresor PDF');
  });

  it('guarantees zero network exfiltration and revokes all ObjectURLs and workers on teardown', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const terminateSpy = vi.fn();

    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage(): void {
        // Trigger worker error so fallback runs, ensuring worker wiring is exercised
        this.onerror?.(new ErrorEvent('error'));
      }
      terminate = terminateSpy;
    }
    vi.stubGlobal('Worker', MockWorker);

    try {
      await component.loadSamplePdf();
      await component.compressAll();
      component.downloadFile(0);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
      expect(createUrlSpy).toHaveBeenCalledTimes(1);

      component.reset();
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-url');
      expect(terminateSpy).toHaveBeenCalled();
    } finally {
      createUrlSpy.mockRestore();
      revokeUrlSpy.mockRestore();
    }
  });
});
