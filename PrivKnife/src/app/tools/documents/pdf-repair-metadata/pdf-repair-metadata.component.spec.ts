import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PDFDocument, PDFName } from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfRepairMetadataComponent } from './pdf-repair-metadata.component';
import {
  createCombinedDiagnosticSamplePdf,
  createFakePngBytes,
} from './test-fixtures';

describe('PdfRepairMetadataComponent (Seam 3: Health Strip, Scrub, PDF/A Checklist & Hygiene)', () => {
  let component: PdfRepairMetadataComponent;
  let fixture: ComponentFixture<PdfRepairMetadataComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [PdfRepairMetadataComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfRepairMetadataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with empty state, privacy badge, and default repair mode options', () => {
    expect(component).toBeTruthy();
    expect(component.activeMode()).toBe('repair');
    expect(component.linearizeFastWebView()).toBe(true);
    expect(component.stripJavaScriptAndActions()).toBe(true);
    expect(component.healthReport()).toBeNull();
    expect(component.canDownload()).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
  });

  it('inspects damaged/JS sample PDF, populates diagnostic strip & metadata fields, and repairs cleanly', async () => {
    const sampleBytes = await createCombinedDiagnosticSamplePdf();
    const file = new File([sampleBytes.buffer as ArrayBuffer], 'damaged-js.pdf', {
      type: 'application/pdf',
    });

    await component.onFilesDropped([file]);
    fixture.detectChanges();

    const report = component.healthReport();
    expect(report).not.toBeNull();
    expect(report?.leadingGarbageBytes).toBe(32);
    expect(report?.hasJavaScriptOrActions).toBe(true);
    expect(report?.metadata.author).toBe('John Doe');
    expect(component.metadataAuthor()).toBe('John Doe');
    expect(component.metadataCreator()).toBe('Microsoft Word');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('32');

    await component.runAction();
    fixture.detectChanges();
    expect(component.result()?.success).toBe(true);
    expect(component.result()?.fileName).toBe('damaged-js_repaired.pdf');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('scrubs all hidden Author/Creator/XMP metadata in one click on Metadata tab', async () => {
    const sampleBytes = await createCombinedDiagnosticSamplePdf();
    await component.onFilesDropped([
      new File([sampleBytes.buffer as ArrayBuffer], 'sensitive.pdf', {
        type: 'application/pdf',
      }),
    ]);

    component.setMode('metadata');
    await component.scrubAllHiddenMetadata();
    fixture.detectChanges();

    const res = component.result();
    expect(res?.success).toBe(true);
    expect(res?.pdfBytes).toBeDefined();
    expect(res?.fileName).toBe('sensitive_scrubbed.pdf');

    const reloaded = await PDFDocument.load(res!.pdfBytes!, {
      updateMetadata: false,
    });
    expect(reloaded.getAuthor() ?? '').toBe('');
    expect(reloaded.getCreator() ?? '').toBe('');
    expect(reloaded.catalog.get(PDFName.of('Metadata'))).toBeUndefined();
  });

  it('packages PDF/A-2b archival document and renders Archival Compliance Checklist in DOM', async () => {
    await component.loadCorruptedSample();
    component.setMode('pdfa');
    await component.runAction();
    fixture.detectChanges();

    const res = component.result();
    expect(res?.success).toBe(true);
    expect(res?.archivalChecklist?.length).toBeGreaterThanOrEqual(4);
    expect(component.canDownload()).toBe(true);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('GTS_PDFA1');
    expect(el.textContent).toContain('Passed');
  });

  it('revokes ObjectURL after download, terminates active Worker on reset/ngOnDestroy, and handles PNG/oversized errors', async () => {
    await component.loadCorruptedSample();
    await component.runAction();
    fixture.detectChanges();

    vi.useFakeTimers();
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-repaired-pdf');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.downloadPdf();
    expect(createSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-repaired-pdf');

    const terminateMock = vi.fn();
    (component as unknown as { activeWorker: Worker | null }).activeWorker = {
      terminate: terminateMock,
    } as unknown as Worker;
    component.reset();
    expect(terminateMock).toHaveBeenCalledTimes(1);
    expect(component.healthReport()).toBeNull();

    // Non-PDF PNG file error
    await component.onFilesDropped([
      new File([createFakePngBytes().buffer as ArrayBuffer], 'not-a-pdf.pdf', {
        type: 'application/pdf',
      }),
    ]);
    fixture.detectChanges();
    expect(component.errorMessage()).toMatch(/PNG/i);

    // Oversized file (> 150 MB)
    const huge = new File([new Uint8Array([0x25, 0x50])], 'huge.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(huge, 'size', { value: 160 * 1024 * 1024 });
    await component.onFilesDropped([huge]);
    fixture.detectChanges();
    expect(component.errorMessage()).toMatch(/150\s*MB/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
