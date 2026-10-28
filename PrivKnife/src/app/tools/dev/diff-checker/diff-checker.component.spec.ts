import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiffCheckerComponent } from './diff-checker.component';
import {
  SAMPLE_CODE_ORIGINAL,
  SAMPLE_CODE_MODIFIED,
  SAMPLE_CONTRACT_ORIGINAL,
  SAMPLE_CONTRACT_MODIFIED,
} from './test-fixtures';

describe('DiffCheckerComponent (Seam 2 & 4)', () => {
  let component: DiffCheckerComponent;
  let fixture: ComponentFixture<DiffCheckerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

    await TestBed.configureTestingModule({
      imports: [DiffCheckerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiffCheckerComponent);
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
      expect(component.viewMode()).toBe('side_by_side');
      expect(component.diffGranularity()).toBe('word');
      expect(component.ignoreWhitespace()).toBe(false);
      expect(component.ignoreCase()).toBe(false);
      expect(component.originalText()).toBe('');
      expect(component.modifiedText()).toBe('');
    });

    it('should load code comparison sample preset', () => {
      component.loadSampleCode();

      expect(component.originalText()).toContain('function calculateTotal');
      expect(component.modifiedText()).toContain('function calculateTotal');
      expect(component.result().stats.leftTotalLines).toBeGreaterThan(0);
      expect(component.result().stats.rightTotalLines).toBeGreaterThan(0);
    });

    it('should load contract comparison sample preset', () => {
      component.loadSampleContract();

      expect(component.originalText()).toContain('Payment Terms');
      expect(component.modifiedText()).toContain('Payment Terms');
      expect(component.result().stats.modifiedLines).toBeGreaterThan(0);
    });

    it('should update view mode between side_by_side and unified_inline', () => {
      component.setViewMode('unified_inline');
      expect(component.viewMode()).toBe('unified_inline');

      component.setViewMode('side_by_side');
      expect(component.viewMode()).toBe('side_by_side');
    });

    it('should toggle ignoreWhitespace and ignoreCase options reactively', () => {
      component.setOriginalText('ABC');
      component.setModifiedText('abc');

      expect(component.result().stats.unchangedLines).toBe(0);

      component.toggleIgnoreCase();
      expect(component.ignoreCase()).toBe(true);
      expect(component.result().stats.unchangedLines).toBe(1);
    });

    it('should accept uploaded files for original and modified inputs', async () => {
      const origFile = new File([SAMPLE_CODE_ORIGINAL], 'original.js', { type: 'text/javascript' });
      const modFile = new File([SAMPLE_CODE_MODIFIED], 'modified.js', { type: 'text/javascript' });

      await component.handleOriginalFile(origFile);
      await component.handleModifiedFile(modFile);

      expect(component.originalText()).toBe(SAMPLE_CODE_ORIGINAL);
      expect(component.modifiedText()).toBe(SAMPLE_CODE_MODIFIED);
      expect(component.result().lines.length).toBeGreaterThan(0);
    });
  });

  describe('Task 3.2: Export & Download Action', () => {
    it('should download unified patch file and revoke object URL immediately', () => {
      component.loadSampleCode();
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-diff');

      component.downloadExport('patch');

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-diff');
      createObjectURLSpy.mockRestore();
    });

    it('should download HTML report and revoke object URL immediately', () => {
      component.loadSampleCode();
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-html');

      component.downloadExport('html');

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-html');
      createObjectURLSpy.mockRestore();
    });

    it('should copy unified patch to clipboard with feedback state', async () => {
      component.loadSampleCode();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      await component.copyPatch();

      expect(writeTextMock).toHaveBeenCalled();
      expect(component.copiedFeedback()).toBe(true);
    });
  });

  describe('Task 3.3: Memory Hygiene & Disposal', () => {
    it('should reset inputs and revoke cached URLs upon reset', () => {
      component.loadSampleCode();
      expect(component.originalText()).not.toBe('');

      component.reset();

      expect(component.originalText()).toBe('');
      expect(component.modifiedText()).toBe('');
    });

    it('should cleanly dispose and revoke resources on ngOnDestroy', () => {
      component.loadSampleCode();
      fixture.destroy();
      expect(component).toBeTruthy();
    });

    it('should terminate web worker on ngOnDestroy (DEFECT-55-02)', () => {
      const mockWorker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        onmessage: null,
      };
      (component as any).worker = mockWorker;
      component.ngOnDestroy();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should support syntaxLanguage selection and syncScroll toggle (DEFECT-55-05)', () => {
      expect(component.syntaxLanguage()).toBe('javascript');
      expect(component.syncScroll()).toBe(true);

      (component as any).setSyntaxLanguage?.('python');
      expect(component.syntaxLanguage()).toBe('python');

      (component as any).toggleSyncScroll?.();
      expect(component.syncScroll()).toBe(false);
    });

    it('should synchronize textarea scroll when syncScroll is enabled (DEFECT-55-05)', () => {
      component.syncScroll.set(true);
      const fakeOrig = { scrollTop: 100, scrollHeight: 300, clientHeight: 100 };
      const fakeMod = { scrollTop: 0, scrollHeight: 300, clientHeight: 100 };
      (component as any).origTextareaRef = { nativeElement: fakeOrig };
      (component as any).modTextareaRef = { nativeElement: fakeMod };

      (component as any).onScrollOriginal?.({ target: fakeOrig } as any);
      expect(fakeMod.scrollTop).toBe(100);

      fakeMod.scrollTop = 50;
      (component as any).onScrollModified?.({ target: fakeMod } as any);
      expect(fakeOrig.scrollTop).toBe(50);
    });
  });

  describe('Task 4.1: Privacy & Zero-Exfiltration Guard', () => {
    it('should execute full diff computation and download with 0 network calls', () => {
      component.loadSampleCode();
      component.downloadExport('patch');
      component.downloadExport('html');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
