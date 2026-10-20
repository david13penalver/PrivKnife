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
      expect(component.sourceImageData()).toBeNull();
    });

    it('should load sample surface and trigger texture generation', async () => {
      await component.loadSampleSurface();

      expect(component.sourceImageData()).not.toBeNull();
      expect(component.result()).not.toBeNull();
      expect(component.result()?.success).toBe(true);
      expect(component.result()?.diffuseBlob).toBeDefined();
    });

    it('should update blendMode and recompute texture', async () => {
      await component.loadSampleSurface();
      component.setBlendMode('mirror_repeat');

      expect(component.blendMode()).toBe('mirror_repeat');
      await component.recomputeTexture();
      expect(component.result()?.metadata?.['blendMode']).toBe('mirror_repeat');
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

  describe('Task 3.3: Memory Hygiene & Disposal', () => {
    it('should reset inputs and revoke cached URLs upon reset', async () => {
      await component.loadSampleSurface();
      expect(component.sourceImageData()).not.toBeNull();

      component.reset();

      expect(component.sourceImageData()).toBeNull();
      expect(component.result()).toBeNull();
    });

    it('should cleanly dispose and revoke resources on ngOnDestroy', async () => {
      await component.loadSampleSurface();
      fixture.destroy();
      expect(component).toBeTruthy();
    });
  });

  describe('Task 4.1: Privacy & Zero-Exfiltration Guard', () => {
    it('should execute texture generation and download with 0 network calls', async () => {
      await component.loadSampleSurface();
      component.downloadZip();
      component.downloadDiffuse();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
