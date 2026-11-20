import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { AsciiArtQrStudioComponent } from './ascii-art-qr-studio.component';
import { VALID_TINY_LOGO_DATA_URL, createSolidPixelPatch } from './test-fixtures';

describe('AsciiArtQrStudioComponent (Spec 122 — Seam 2)', () => {
  let component: AsciiArtQrStudioComponent;
  let fixture: ComponentFixture<AsciiArtQrStudioComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let storageSpy: ReturnType<typeof vi.spyOn>;
  let mathSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    mathSpy = vi.spyOn(Math, 'random');

    await TestBed.configureTestingModule({
      imports: [AsciiArtQrStudioComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(AsciiArtQrStudioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    fetchSpy.mockRestore();
    storageSpy.mockRestore();
    mathSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders privacy badge and updates live ASCII banner across font and hash comment options', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
    expect(component.bannerOutput().length).toBeGreaterThan(0);

    component.bannerText.set('OK');
    component.bannerWrapper.set('hash');
    component.bannerFont.set('block');
    fixture.detectChanges();

    const lines = component.bannerOutput().split('\n');
    expect(lines.length).toBe(5);
    expect(lines.every((l) => l.startsWith('# '))).toBe(true);
  });

  it('converts loaded PixelGridInput into Unicode Braille art on the Image-to-ASCII tab', () => {
    component.activeTab.set('image_ascii');
    component.imageColumns.set(2);
    component.imageDitherBraille.set(false);
    component.imagePixels.set(createSolidPixelPatch(4, 8, 0, 0, 0));
    fixture.detectChanges();

    expect(component.imageAsciiOutput()).toBe('⣿⣿\n⣿⣿');
  });

  it('renders static 2D QR via safe img data URI, checks contrast warnings, and bumps EC for logos', () => {
    component.activeTab.set('qr_studio');
    component.qrPayloadType.set('wifi');
    component.wifiSsid.set('Home;Net');
    component.wifiPassword.set('p:a\\s,s');
    component.qrErrorCorrection.set('L');
    component.qrForeground.set('#EEEEEE');
    component.qrBackground.set('#FFFFFF');
    fixture.detectChanges();

    const res = component.qrResult();
    expect(res.success).toBe(true);
    expect(res.payload).toBe('WIFI:T:WPA;S:Home\\;Net;P:p\\:a\\\\s\\,s;H:false;;');
    expect(res.contrast.isScannable).toBe(false);
    expect(res.contrast.warningKey).toBe('low_contrast');
    expect(component.qrPreviewDataUri()).toMatch(/^data:image\/svg\+xml;base64,/);

    component.qrForeground.set('#0f172a');
    component.qrLogoDataUrl.set(VALID_TINY_LOGO_DATA_URL);
    fixture.detectChanges();
    expect(component.qrResult().effectiveErrorCorrection).toBe('H');
  });

  it('renders 1D barcodes and shows graceful error for malformed EAN13 input', () => {
    component.activeTab.set('barcode_1d');
    fixture.detectChanges();
    expect(component.barcodeResult().success).toBe(true);
    expect(component.barcodePreviewDataUri()).toMatch(/^data:image\/svg\+xml;base64,/);

    component.barcodeFormat.set('EAN13');
    component.barcodeValue.set('bad-ean');
    fixture.detectChanges();
    expect(component.barcodeResult().success).toBe(false);
    expect(component.barcodeResult().error).toBeTruthy();
  });

  it('exports .txt and .svg and revokes every created ObjectURL on reset and ngOnDestroy with zero network/storage calls', () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:ascii-qr-identical');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);

    component.exportTextFile('banner output', 'banner.txt');
    component.exportSvgFile('<svg xmlns="http://www.w3.org/2000/svg"/>', 'qr.svg');
    expect(createSpy).toHaveBeenCalledTimes(2);

    component.imagePixels.set(createSolidPixelPatch(2, 4, 0, 0, 0));
    component.qrLogoDataUrl.set(VALID_TINY_LOGO_DATA_URL);
    component.reset();
    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(component.imagePixels()).toBeNull();
    expect(component.qrLogoDataUrl()).toBe('');

    component.exportTextFile('more', 'more.txt');
    component.ngOnDestroy();
    expect(revokeSpy).toHaveBeenCalledTimes(3);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(mathSpy).not.toHaveBeenCalled();
  });
});
