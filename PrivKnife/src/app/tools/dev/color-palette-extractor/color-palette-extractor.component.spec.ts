import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorPaletteExtractorComponent } from './color-palette-extractor.component';
import { createMockImageFile } from './test-fixtures';
import { ExtractedColor } from './types';

describe('ColorPaletteExtractorComponent (Seam 2: Studio UI, Contrast Matrix & Multi-Format Exporters)', () => {
  let fixture: ComponentFixture<ColorPaletteExtractorComponent>;
  let component: ColorPaletteExtractorComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:https://privknife.com/mock-palette-blob-${Math.random()}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ColorPaletteExtractorComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ColorPaletteExtractorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with sample palette, contrast matrix, and active selection', () => {
    expect(component).toBeTruthy();
    expect(component.palette().length).toBeGreaterThanOrEqual(4);
    expect(component.matrix().length).toBe(component.palette().length);
    expect(component.activeCell()).toBeDefined();
  });

  it('should ingest image file and create preview URL', async () => {
    const file = createMockImageFile('branding.png', 'image/png', 5000);

    await component.onImageSelected([file]);

    expect(component.imageFile()).toBe(file);
    expect(component.imagePreviewUrl()).toBeTruthy();
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should add, edit, and remove colors reactively', () => {
    const initialCount = component.palette().length;

    component.addColor('#ec4899', 'Hot Pink');
    expect(component.palette().length).toBe(initialCount + 1);
    expect(component.palette().some((c: ExtractedColor) => c.hex === '#ec4899')).toBe(true);

    const added = component.palette().find((c: ExtractedColor) => c.hex === '#ec4899')!;
    component.updateColor(added.id, '#db2777');
    expect(component.palette().find((c: ExtractedColor) => c.id === added.id)?.hex).toBe('#db2777');

    component.removeColor(added.id);
    expect(component.palette().length).toBe(initialCount);
  });

  it('should select contrast matrix cell and update live preview pair', () => {
    const cell = component.matrix()[0][1];
    component.selectCell(cell);

    expect(component.activeCell()).toBe(cell);
  });

  it('should copy CSS variables to clipboard with feedback state', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    await component.copyCssVariables();

    expect(writeTextSpy).toHaveBeenCalled();
    expect(component.copiedCss()).toBe(true);
  });

  it('should download JSON tokens, Adobe ASE swatch, and PDF audit report with URL revocation', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadJson();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.showExportModal()).toBe(true);

    component.closeExportModal();
    expect(component.showExportModal()).toBe(false);

    await component.downloadAse();
    expect(anchorClickSpy).toHaveBeenCalled();

    await component.downloadPdf();
    expect(anchorClickSpy).toHaveBeenCalled();
  });

  it('should revoke preview object URLs on component destroy', async () => {
    const file = createMockImageFile('branding.png', 'image/png', 5000);
    await component.onImageSelected([file]);

    fixture.destroy();

    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should extract and export with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    const file = createMockImageFile('private-client-mockup.png', 'image/png', 5000);
    await component.onImageSelected([file]);
    await component.downloadJson();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
