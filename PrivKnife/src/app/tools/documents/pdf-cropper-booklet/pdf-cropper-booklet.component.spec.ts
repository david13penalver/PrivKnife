import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfCropperBookletComponent } from './pdf-cropper-booklet.component';
import { createMixedSizePdf, createSyntheticPdf } from './test-fixtures';

describe('PdfCropperBookletComponent (Seam 3: Angular UI, Geometry & Resource Hygiene)', () => {
  let component: PdfCropperBookletComponent;
  let fixture: ComponentFixture<PdfCropperBookletComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PdfCropperBookletComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfCropperBookletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with default crop/resize/nup settings and no loaded PDF', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe('crop');
    expect(component.unit()).toBe('pt');
    expect(component.insetTopPt()).toBe(0);
    expect(component.insetRightPt()).toBe(0);
    expect(component.insetBottomPt()).toBe(0);
    expect(component.insetLeftPt()).toBe(0);
    expect(component.cropScope()).toBe('all');
    expect(component.targetPaper()).toBe('a4');
    expect(component.pagesPerSheet()).toBe(4);
    expect(component.isProcessing()).toBe(false);
    expect(component.pdfBytes()).toBeNull();
    expect(component.canProcess()).toBe(false);
  });

  it('converts display insets across pt/mm/in, handles keyboard nudging, and flags invalid over-cropping', async () => {
    const srcBytes = await createSyntheticPdf(2, { width: 400, height: 600 });
    await component.onFileDropped([
      new File([srcBytes.buffer as ArrayBuffer], 'sample.pdf', { type: 'application/pdf' }),
    ]);

    expect(component.pageCount()).toBe(2);
    expect(component.currentPageWidthPt()).toBeCloseTo(400, 1);
    expect(component.currentPageHeightPt()).toBeCloseTo(600, 1);

    component.setInsetFromDisplay('left', 72);
    expect(component.insetLeftPt()).toBeCloseTo(72, 2);

    component.setUnit('in');
    expect(component.displayInsets().left).toBeCloseTo(1, 2);

    component.setUnit('mm');
    expect(component.displayInsets().left).toBeCloseTo(25.4, 1);

    component.setUnit('pt');
    component.nudgeCropInset('top', 10);
    expect(component.insetTopPt()).toBeCloseTo(10, 2);

    // Push left + right >= pageWidth (400)
    component.insetLeftPt.set(200);
    component.insetRightPt.set(200);
    expect(component.hasInvalidCropInsets()).toBe(true);
    expect(component.canProcess()).toBe(false);
  });

  it('rejects non-PDF files cleanly and flags files > 100 MB with a non-blocking warning', async () => {
    const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'img.png', {
      type: 'image/png',
    });
    await component.onFileDropped([pngFile]);
    expect(component.errorMessage()).toBeTruthy();
    expect(component.pdfBytes()).toBeNull();

    const smallPdf = await createSyntheticPdf(1);
    const hugePdf = new File([smallPdf.buffer as ArrayBuffer], 'massive.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(hugePdf, 'size', { value: 112 * 1024 * 1024 });

    await component.onFileDropped([hugePdf]);
    expect(component.largeFileWarning()).toBe(true);
    expect(component.pdfBytes()).not.toBeNull();
  });

  it('processes Crop, Resize, N-Up, and Booklet modes with reactive booklet signature preview', async () => {
    const sixPages = await createSyntheticPdf(6, { width: 595, height: 842 });
    await component.onFileDropped([
      new File([sixPages.buffer as ArrayBuffer], 'zine.pdf', { type: 'application/pdf' }),
    ]);

    expect(component.bookletPreviewMap()).toEqual([
      { sheet: 1, side: 'front', pages: [null, 1] },
      { sheet: 1, side: 'back', pages: [2, null] },
      { sheet: 2, side: 'front', pages: [6, 3] },
      { sheet: 2, side: 'back', pages: [4, 5] },
    ]);

    // Crop mode
    component.insetTopPt.set(24);
    component.insetBottomPt.set(24);
    await component.processDocument();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.fileName).toBe('zine-cropped.pdf');
    expect(component.lastResult()?.outputPageCount).toBe(6);

    // Resize mode
    const mixed = await createMixedSizePdf();
    await component.onFileDropped([
      new File([mixed.buffer as ArrayBuffer], 'mixed.pdf', { type: 'application/pdf' }),
    ]);
    component.setMode('resize');
    component.targetPaper.set('letter');
    await component.processDocument();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.outputPageCount).toBe(3);

    // N-Up mode
    await component.onFileDropped([
      new File([sixPages.buffer as ArrayBuffer], 'zine.pdf', { type: 'application/pdf' }),
    ]);
    component.setMode('nup');
    component.pagesPerSheet.set(4);
    await component.processDocument();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.outputPageCount).toBe(2);

    // Booklet mode
    component.setMode('booklet');
    await component.processDocument();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.outputPageCount).toBe(4);
    expect(component.lastResult()?.impositionMap).toEqual(component.bookletPreviewMap());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('updates localized UI text EN <-> ES and cleans up ObjectURLs & workers on reset/destroy', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-cropper');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const sampleBytes = await createSyntheticPdf(2);
    await component.onFileDropped([
      new File([sampleBytes.buffer as ArrayBuffer], 'doc.pdf', { type: 'application/pdf' }),
    ]);
    component.setMode('booklet');
    await component.processDocument();

    component.downloadResult();
    expect(createUrlSpy).toHaveBeenCalledTimes(1);

    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Recortador');

    component.reset();
    expect(component.pdfBytes()).toBeNull();
    expect(component.pageCount()).toBe(0);
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-cropper');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });
});
