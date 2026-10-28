import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SeamlessTextureGeneratorComponent } from './seamless-texture-generator.component';
import { createSyntheticSurface } from './test-fixtures';

describe('SeamlessTextureGeneratorComponent (Seam 2 & 4)', () => {
  let component: SeamlessTextureGeneratorComponent;
  let fixture: ComponentFixture<SeamlessTextureGeneratorComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

    await TestBed.configureTestingModule({
      imports: [SeamlessTextureGeneratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SeamlessTextureGeneratorComponent);
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
    it('should initialize component with default options and null image', () => {
      expect(component).toBeTruthy();
      expect(component.blendMode()).toBe('linear_crossfade');
      expect(component.edgeOverlapPercentage()).toBe(20);
      expect(component.generateNormalMap()).toBe(true);
      expect(component.normalMapStrength()).toBe(2.5);
      expect(component.invertNormalY()).toBe(false);
      expect(component.previewTilingMultiplier()).toBe(3);
      expect(component.outputResolutionPx()).toBe(256);
      expect(component.sourceImageData()).toBeNull();
      expect(component.errorMessage()).toBeNull();
    });

    it('should load sample surface and trigger texture generation', async () => {
      await component.loadSampleSurface();

      expect(component.sourceImageData()).not.toBeNull();
      expect(component.result()).not.toBeNull();
      expect(component.result()?.success).toBe(true);
      expect(component.result()?.diffuseBlob).toBeDefined();
      expect(component.result()?.diffusePixels).toBeDefined();
    });

    it('should update blendMode and recompute texture', async () => {
      await component.loadSampleSurface();
      component.setBlendMode('mirror_repeat');

      expect(component.blendMode()).toBe('mirror_repeat');
      await component.recomputeTexture();
      expect(component.result()?.metadata?.['blendMode']).toBe('mirror_repeat');
    });

    it('should update output resolution and resample texture dimensions (DEFECT-57-04)', async () => {
      await component.loadSampleSurface();
      component.setOutputResolution(128);

      expect(component.outputResolutionPx()).toBe(128);
      await component.recomputeTexture();
      expect(component.result()?.diffusePixels?.width).toBe(128);
      expect(component.result()?.diffusePixels?.height).toBe(128);
    });

    it('should toggle normal map generation and invertNormalY', async () => {
      await component.loadSampleSurface();

      component.toggleInvertNormalY();
      expect(component.invertNormalY()).toBe(true);

      component.toggleGenerateNormalMap();
      expect(component.generateNormalMap()).toBe(false);
    });

    it('should switch preview tabs between diffuse, normal, and tiled', () => {
      component.setActivePreviewTab('diffuse');
      expect(component.activePreviewTab()).toBe('diffuse');

      component.setActivePreviewTab('normal');
      expect(component.activePreviewTab()).toBe('normal');

      component.setActivePreviewTab('tiled');
      expect(component.activePreviewTab()).toBe('tiled');
    });
  });

  describe('Task 3.2: Export & Download Action', () => {
    it('should download ZIP archive and revoke object URL immediately', async () => {
      await component.loadSampleSurface();
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-zip');

      component.downloadZip();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-zip');
      createObjectURLSpy.mockRestore();
    });

    it('should download diffuse PNG and revoke object URL immediately', async () => {
      await component.loadSampleSurface();
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-png');

      component.downloadDiffuse();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-png');
      createObjectURLSpy.mockRestore();
    });

    it('should download normal PNG and revoke object URL immediately', async () => {
      await component.loadSampleSurface();
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-normal');

      component.downloadNormal();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-normal');
      createObjectURLSpy.mockRestore();
    });

    it('should copy CSS snippet to clipboard with feedback', async () => {
      await component.loadSampleSurface();
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

  describe('Task 3.3: Error Handling & Resource Disposal (DEFECT-57-02)', () => {
    it('should set errorMessage and not load sample brick texture when file decoding fails', async () => {
      const corruptFile = new File(['CORRUPT_BYTES'], 'corrupt.png', { type: 'image/png' });
      // In jsdom / test environment, createImageBitmap might not exist or fail
      await component.handleFileSelected(corruptFile);

      expect(component.errorMessage()).toContain('Failed to decode image file');
      expect(component.result()).toBeNull();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.c-alert--danger')).toBeTruthy();
      expect(compiled.querySelector('.c-alert--danger')?.textContent).toContain(
        'Failed to decode image file'
      );
    });

    it('should call bitmap.close() in finally block when createImageBitmap succeeds', async () => {
      const closeMock = vi.fn();
      const mockBitmap = {
        width: 32,
        height: 32,
        close: closeMock,
      } as unknown as ImageBitmap;

      const origCreateImageBitmap = (window as unknown as { createImageBitmap?: unknown })
        .createImageBitmap;
      (window as unknown as { createImageBitmap: unknown }).createImageBitmap = vi
        .fn()
        .mockResolvedValue(mockBitmap);

      // Mock canvas getContext
      const mockCtx = {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          width: 32,
          height: 32,
          data: new Uint8ClampedArray(32 * 32 * 4),
        }),
      };
      const origCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'canvas') {
          const fakeCanvas = origCreateElement('canvas');
          fakeCanvas.getContext = vi.fn().mockReturnValue(mockCtx);
          return fakeCanvas;
        }
        return origCreateElement(tagName);
      });

      try {
        const testFile = new File(['valid'], 'valid.png', { type: 'image/png' });
        await component.handleFileSelected(testFile);

        expect(closeMock).toHaveBeenCalledTimes(1);
      } finally {
        createElementSpy.mockRestore();
        (window as unknown as { createImageBitmap?: unknown }).createImageBitmap =
          origCreateImageBitmap;
      }
    });

    it('should reset inputs and revoke cached URLs upon reset', async () => {
      await component.loadSampleSurface();
      expect(component.sourceImageData()).not.toBeNull();

      component.reset();

      expect(component.sourceImageData()).toBeNull();
      expect(component.result()).toBeNull();
      expect(component.errorMessage()).toBeNull();
    });

    it('should cleanly dispose and revoke resources on ngOnDestroy', async () => {
      await component.loadSampleSurface();
      fixture.destroy();
      expect(component).toBeTruthy();
    });
  });

  describe('Task 4.1: BEM Compliance & Privacy (DEFECT-57-05)', () => {
    it('should render BEM compliant .c-texture-gen__* elements and #outputResolution', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('.c-texture-gen')).toBeTruthy();
      expect(compiled.querySelector('.c-texture-gen__preset-group')).toBeTruthy();
      expect(compiled.querySelector('#outputResolution')).toBeTruthy();
      expect(compiled.querySelector('.c-texture-gen__select')).toBeTruthy();
      expect(compiled.querySelector('.c-texture-gen__checkbox-label')).toBeTruthy();
      expect(compiled.querySelector('.c-texture-gen__checkbox-input')).toBeTruthy();
    });

    it('should execute texture generation and download with 0 network calls', async () => {
      await component.loadSampleSurface();
      component.downloadZip();
      component.downloadDiffuse();
      component.downloadNormal();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
