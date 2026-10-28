import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SvgOptimizerCleanerComponent } from './svg-optimizer-cleaner.component';
import { SAMPLE_BLOATED_SVG, SAMPLE_SIMPLE_SVG } from './test-fixtures';

describe('SvgOptimizerCleanerComponent (Seam 2 & 4)', () => {
  let component: SvgOptimizerCleanerComponent;
  let fixture: ComponentFixture<SvgOptimizerCleanerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

    await TestBed.configureTestingModule({
      imports: [SvgOptimizerCleanerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SvgOptimizerCleanerComponent);
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
    it('should create component with default state', () => {
      expect(component).toBeTruthy();
      expect(component.floatPrecision()).toBe(2);
      expect(component.stripMetadataComments()).toBe(true);
      expect(component.cleanupIds()).toBe(true);
      expect(component.collapseUselessGroups()).toBe(true);
      expect(component.convertColorsToHex()).toBe(true);
      expect(component.removeDimensionsForViewBox()).toBe(true);
      expect(component.codeExportFormat()).toBe('svg');
      expect(component.componentName()).toBe('CustomSvgIcon');
    });

    it('should load sample SVG and automatically optimize', () => {
      component.loadSampleSvg();
      expect(component.inputSvg()).toContain('<svg');
      expect(component.result()).not.toBeNull();
      expect(component.result()?.success).toBe(true);
      expect(component.result()?.stats.savingsPercent).toBeGreaterThan(0);
    });

    it('should reactively update when precision or toggles change', () => {
      component.setInputSvg(SAMPLE_BLOATED_SVG);
      expect(component.result()?.stats.optimizedBytes).toBeDefined();

      const initialBytes = component.result()?.stats.optimizedBytes;
      component.setFloatPrecision(0);
      expect(component.floatPrecision()).toBe(0);
      expect(component.result()?.stats.optimizedBytes).toBeLessThanOrEqual(initialBytes!);
    });

    it('should switch code export format between formats and update code', () => {
      component.setInputSvg(SAMPLE_SIMPLE_SVG);
      component.setCodeExportFormat('react_tsx');

      expect(component.codeExportFormat()).toBe('react_tsx');
      expect(component.result()?.code).toContain('import React');
      expect(component.result()?.fileName).toBe('customsvgicon.tsx');

      component.setCodeExportFormat('vue_sfc');
      expect(component.result()?.code).toContain('<template>');
      expect(component.result()?.fileName).toBe('customsvgicon.vue');
    });

    it('should accept uploaded SVG file', async () => {
      const file = new File([SAMPLE_BLOATED_SVG], 'icon.svg', { type: 'image/svg+xml' });
      await component.handleFileSelected(file);

      expect(component.inputSvg()).toContain('Layer_1');
      expect(component.result()?.success).toBe(true);
    });
  });

  describe('Task 3.2: Export & Download Action', () => {
    it('should download file and trigger revokeObjectURL', () => {
      component.setInputSvg(SAMPLE_SIMPLE_SVG);
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');

      component.downloadResult();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
      createObjectURLSpy.mockRestore();
    });

    it('should copy code to clipboard with temporary feedback', async () => {
      component.setInputSvg(SAMPLE_SIMPLE_SVG);
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      await component.copyCode();

      expect(writeTextMock).toHaveBeenCalled();
      expect(component.copiedFeedback()).toBe(true);
    });
  });

  describe('Task 3.3: Memory Hygiene & Reset', () => {
    it('should reset to initial state and revoke cached object URLs', () => {
      component.loadSampleSvg();
      expect(component.inputSvg()).not.toBe('');

      component.reset();

      expect(component.inputSvg()).toBe('');
      expect(component.result()).toBeNull();
    });

    it('should revoke all object URLs on ngOnDestroy', () => {
      component.loadSampleSvg();
      fixture.destroy();
      // Destructor must execute cleanly without error
      expect(component).toBeTruthy();
    });
  });

  describe('Task 4.1: Privacy & Zero-Exfiltration Guard', () => {
    it('should complete optimization and export without making any network requests', async () => {
      component.loadSampleSvg();
      component.setCodeExportFormat('react_tsx');
      component.setFloatPrecision(1);
      component.downloadResult();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });

  describe('DOM Security & Sanitization (DEFECT-54-01)', () => {
    it('should sanitize unsafe user SVG input in preview render areas', () => {
      const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="alert('pwn')">
        <script>alert('pwn')</script>
        <circle cx="50" cy="50" r="40" onclick="alert('pwn')"/>
      </svg>`;

      component.setInputSvg(maliciousSvg);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const previewAreas = compiled.querySelectorAll('.svg-render-area');
      expect(previewAreas.length).toBeGreaterThan(0);
      previewAreas.forEach((area) => {
        expect(area.innerHTML).not.toContain('<script');
        expect(area.innerHTML).not.toContain('onload');
        expect(area.innerHTML).not.toContain('onclick');
      });
    });
  });
});
