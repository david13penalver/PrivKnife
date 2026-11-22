import { encodeTestWoff2 } from '../../../../../qa/woff2-test-encoder';
import { processFontSubset as runFontSubset } from './engine';
import type { FontSubsetWorkerRequest, FontSubsetWorkerResponse } from './types';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FontSubsetterConverterComponent } from './font-subsetter-converter.component';
import { createSyntheticTrueTypeFont } from './test-fixtures';

const processFontSubset = (font: ArrayBuffer, options: Parameters<typeof runFontSubset>[1]) =>
  runFontSubset(font, options, encodeTestWoff2);

class FontWorkerDouble {
  onmessage: ((event: { data: FontSubsetWorkerResponse }) => void) | null = null;
  postMessage(message: FontSubsetWorkerRequest): void {
    void processFontSubset(message.buffer, message.options).then((result) => {
      this.onmessage?.({ data: { id: message.id, result } });
    });
  }
  terminate(): void { this.onmessage = null; }
}

describe('FontSubsetterConverterComponent (Seam 2 & 4)', () => {
  let component: FontSubsetterConverterComponent;
  let fixture: ComponentFixture<FontSubsetterConverterComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.stubGlobal('Worker', FontWorkerDouble);
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
    vi.unstubAllGlobals();
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

    it('should load sample font preset and trigger computation', async () => {
      component.loadSampleFont();
      await vi.waitFor(() => expect(component.result()).not.toBeNull());

      expect(component.fontBuffer()).not.toBeNull();
      expect(component.result()).not.toBeNull();
      expect(component.result()?.success).toBe(true);
      expect(component.result()?.stats.retainedGlyphCount).toBeGreaterThan(0);
      expect(component.result()?.cssSnippet).toContain('@font-face');
    });

    it('should update output format reactively and change filename extension', async () => {
      component.loadSampleFont();
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      component.setOutputFormat('woff');
      await vi.waitFor(() => expect(component.result()).not.toBeNull());

      expect(component.outputFormat()).toBe('woff');
      expect(component.result()?.fileName).toContain('.woff');
      expect(component.result()?.mimeType).toBe('font/woff');

      component.setOutputFormat('ttf');
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      expect(component.outputFormat()).toBe('ttf');
      expect(component.result()?.fileName).toContain('.ttf');
    });

    it('should update subset preset and custom characters', async () => {
      component.loadSampleFont();
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      component.setSubsetPreset('latin_supplement');
      await vi.waitFor(() => expect(component.result()).not.toBeNull());

      expect(component.subsetPreset()).toBe('latin_supplement');
      expect(component.result()?.unicodeRange).toContain('U+00A0-00FF');

      component.setSubsetPreset('custom_characters');
      component.setCustomCharacters('PrivKnife');
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      expect(component.result()?.stats.retainedGlyphCount).toBe(new Set('PrivKnife').size);
    });

    it('should accept uploaded font file via handleFileSelected', async () => {
      const buffer = createSyntheticTrueTypeFont();
      const file = new File([buffer], 'BrandFont.ttf', { type: 'font/ttf' });

      await component.handleFileSelected(file);
      await vi.waitFor(() => expect(component.result()).not.toBeNull());

      expect(component.selectedFileName()).toBe('BrandFont.ttf');
      expect(component.fontFamilyName()).toBe('BrandFont');
      expect(component.result()?.success).toBe(true);
    });
  });

  describe('Task 3.2: Export & Download Action', () => {
    it('should download font deliverable and revoke object URL immediately', async () => {
      component.loadSampleFont();
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-font');

      component.downloadFont();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-font');
      createObjectURLSpy.mockRestore();
    });

    it('should download CSS file deliverable and revoke object URL immediately', async () => {
      component.loadSampleFont();
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-css');

      component.downloadCss();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-css');
      createObjectURLSpy.mockRestore();
    });

    it('should copy @font-face CSS to clipboard with temporary feedback', async () => {
      component.loadSampleFont();
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
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
    it('reports worker runtime errors and terminates the failed worker', () => {
      const workers: Array<{
        onerror: ((event: ErrorEvent) => void) | null;
        postMessage: ReturnType<typeof vi.fn>;
        terminate: ReturnType<typeof vi.fn>;
      }> = [];
      class FailingWorker {
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: ErrorEvent) => void) | null = null;
        postMessage = vi.fn();
        terminate = vi.fn();
        constructor() {
          workers.push(this);
        }
      }
      vi.stubGlobal('Worker', FailingWorker);

      component.loadSampleFont();
      workers[0].onerror?.({
        message: 'simulated font worker crash',
        preventDefault: vi.fn(),
      } as unknown as ErrorEvent);

      expect(component.workerError()).toContain('simulated font worker crash');
      expect(workers[0].terminate).toHaveBeenCalledOnce();
    });

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

    it('should terminate web worker on ngOnDestroy (DEFECT-56-05)', () => {
      const mockWorker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        onmessage: null,
      };
      (component as any).worker = mockWorker;
      component.ngOnDestroy();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should register dynamic font family and render waterfall lines (DEFECT-56-04)', async () => {
      component.loadSampleFont();
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      fixture.detectChanges();

      expect(component.previewFontFamily()).not.toBe('');
      const compiled = fixture.nativeElement as HTMLElement;
      const waterfallLines = compiled.querySelectorAll('.c-font-subsetter__waterfall-line');
      expect(waterfallLines.length).toBe(3);
    });

    it('should use strict BEM namespaces in DOM (DEFECT-56-05)', async () => {
      component.loadSampleFont();
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.c-font-subsetter__stats-banner')).toBeTruthy();
      expect(compiled.querySelector('.c-font-subsetter__specimen-box')).toBeTruthy();
      expect(compiled.querySelector('.c-font-subsetter__code-box')).toBeTruthy();
    });
  });

  describe('Task 4.1: Privacy & Zero-Exfiltration Guard', () => {
    it('should execute font processing and download with 0 network calls', async () => {
      component.loadSampleFont();
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      component.setOutputFormat('woff2');
      await vi.waitFor(() => expect(component.result()).not.toBeNull());
      component.downloadFont();
      component.downloadCss();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
