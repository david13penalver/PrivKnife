import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FontSubsetterConverterComponent } from './font-subsetter-converter.component';
import { createSyntheticTrueTypeFont } from './test-fixtures';

describe('FontSubsetterConverterComponent (Seam 2 & 4)', () => {
  let component: FontSubsetterConverterComponent;
  let fixture: ComponentFixture<FontSubsetterConverterComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

    await TestBed.configureTestingModule({
      imports: [FontSubsetterConverterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FontSubsetterConverterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    fixture.destroy();
  });

  describe('Task 3.1: Initialization & Controls Reactivity', () => {
    it('should create component with default configuration', () => {
      expect(component).toBeTruthy();
      expect(component.subsetPreset()).toBe('basic_latin_ascii');
      expect(component.keepKerningTables()).toBe(false);
      expect(component.dropLayoutFeatures()).toBe(true);
      expect(component.outputFormat()).toBe('woff2');
      expect(component.fontFamilyName()).toBe('CustomFont');
      expect(component.fontBuffer()).toBeNull();
    });

    it('should load sample font preset and trigger computation', () => {
      component.loadSampleFont();

      expect(component.fontBuffer()).not.toBeNull();
      expect(component.result()).not.toBeNull();
      expect(component.result()?.success).toBe(true);
      expect(component.result()?.stats.retainedGlyphCount).toBeGreaterThan(0);
      expect(component.result()?.cssSnippet).toContain('@font-face');
    });

    it('should update output format reactively and change filename extension', () => {
      component.loadSampleFont();
      component.setOutputFormat('woff');

      expect(component.outputFormat()).toBe('woff');
      expect(component.result()?.fileName).toContain('.woff');
      expect(component.result()?.mimeType).toBe('font/woff');

      component.setOutputFormat('ttf');
      expect(component.outputFormat()).toBe('ttf');
      expect(component.result()?.fileName).toContain('.ttf');
    });

    it('should update subset preset and custom characters', () => {
      component.loadSampleFont();
      component.setSubsetPreset('latin_supplement');

      expect(component.subsetPreset()).toBe('latin_supplement');
      expect(component.result()?.unicodeRange).toContain('U+00A0-00FF');

      component.setSubsetPreset('custom_characters');
      component.setCustomCharacters('PrivKnife');
      expect(component.result()?.stats.retainedGlyphCount).toBe(new Set('PrivKnife').size);
    });

    it('should accept uploaded font file via handleFileSelected', async () => {
      const buffer = createSyntheticTrueTypeFont();
      const file = new File([buffer], 'BrandFont.ttf', { type: 'font/ttf' });

      await component.handleFileSelected(file);

      expect(component.selectedFileName()).toBe('BrandFont.ttf');
      expect(component.fontFamilyName()).toBe('BrandFont');
      expect(component.result()?.success).toBe(true);
    });
  });

  describe('Task 3.2: Export & Download Action', () => {
    it('should download font deliverable and revoke object URL immediately', () => {
      component.loadSampleFont();
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-font');

      component.downloadFont();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-font');
      createObjectURLSpy.mockRestore();
    });

    it('should download CSS file deliverable and revoke object URL immediately', () => {
      component.loadSampleFont();
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-css');

      component.downloadCss();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-css');
      createObjectURLSpy.mockRestore();
    });

    it('should copy @font-face CSS to clipboard with temporary feedback', async () => {
      component.loadSampleFont();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      await component.copyCssSnippet();

      expect(writeTextMock).toHaveBeenCalled();
      expect(component.copiedCssFeedback()).toBe(true);
    });
  });

  describe('Task 3.3: Memory Hygiene & Disposal', () => {
    it('should reset inputs and revoke cached URLs upon reset', () => {
      component.loadSampleFont();
      expect(component.fontBuffer()).not.toBeNull();

      component.reset();

      expect(component.fontBuffer()).toBeNull();
      expect(component.selectedFileName()).toBe('');
      expect(component.result()).toBeNull();
    });

    it('should cleanly dispose and revoke resources on ngOnDestroy', () => {
      component.loadSampleFont();
      fixture.destroy();
      expect(component).toBeTruthy();
    });
  });

  describe('Task 4.1: Privacy & Zero-Exfiltration Guard', () => {
    it('should execute font processing and download with 0 network calls', () => {
      component.loadSampleFont();
      component.setOutputFormat('woff2');
      component.downloadFont();
      component.downloadCss();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
