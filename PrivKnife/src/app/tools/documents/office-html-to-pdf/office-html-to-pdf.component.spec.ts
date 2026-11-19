import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { OfficeHtmlToPdfComponent } from './office-html-to-pdf.component';
import {
  createMultiSheetXlsxBytes,
  createSampleDocxBytes,
  MALICIOUS_EXFIL_HTML,
  SAMPLE_MARKDOWN_DOC,
} from './test-fixtures';

describe('OfficeHtmlToPdfComponent (Seam 3: UI, Zero-Network Sandbox & Resource Hygiene)', () => {
  let component: OfficeHtmlToPdfComponent;
  let fixture: ComponentFixture<OfficeHtmlToPdfComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [OfficeHtmlToPdfComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(OfficeHtmlToPdfComponent);
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

  it('initializes with default paper/margin settings, privacy badge, and empty state', () => {
    expect(component).toBeTruthy();
    expect(component.inputMode()).toBe('file');
    expect(component.paperSize()).toBe('a4');
    expect(component.orientation()).toBe('portrait');
    expect(component.marginMm()).toBe(18);
    expect(component.baseFontSizePt()).toBe(11);
    expect(component.includePageNumbers()).toBe(true);
    expect(component.canDownload()).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
  });

  it('sanitizes pasted malicious HTML in zero-network sandbox and renders zero script/remote elements in DOM', async () => {
    component.setInputMode('paste');
    component.setPasteFormat('html');
    component.updatePasteText(MALICIOUS_EXFIL_HTML);
    await component.convert();
    fixture.detectChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(component.canDownload()).toBe(true);
    expect(component.blockedRemoteUrls()).toBeGreaterThanOrEqual(3);
    expect(component.previewPages().length).toBeGreaterThanOrEqual(1);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('link[href*="evil.test"]')).toBeNull();
    expect(el.querySelector('img[src*="evil.test"]')).toBeNull();
    expect(el.textContent).toContain('Privacy Containment Report');
    expect(el.textContent).toContain('Safe Link Text');
  });

  it('uploads multi-sheet .xlsx, detects landscape recommendation, filters sheets, and regenerates PDF', async () => {
    const xlsxBytes = createMultiSheetXlsxBytes(30, 8);
    const file = new File([xlsxBytes.buffer as ArrayBuffer], 'q4-ledger.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await component.onFilesDropped([file]);
    fixture.detectChanges();

    expect(component.sourceFormat()).toBe('xlsx');
    expect(component.sheetNames()).toEqual(['Ledger', 'WideMatrix']);
    expect(component.recommendedOrientation()).toBe('landscape');
    expect(component.showLandscapeBanner()).toBe(true);
    expect(component.result()?.diagnostics.tableCount).toBe(2);

    // Exclude WideMatrix sheet -> regenerates with 1 table
    await component.toggleSheet('WideMatrix');
    fixture.detectChanges();

    expect(component.selectedSheets()).toEqual(['Ledger']);
    expect(component.result()?.diagnostics.tableCount).toBe(1);
    expect(component.result()?.fileName).toBe('q4-ledger.pdf');
  });

  it('creates and revokes ObjectURL on PDF download, reset(), and ngOnDestroy() with Worker termination', async () => {
    const terminateMock = vi.fn();
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: ErrorEvent) => void) | null = null;
      terminate = terminateMock;
      postMessage = () => {};
    }

    const docxBytes = await createSampleDocxBytes();
    component.setInputMode('paste');
    component.setPasteFormat('md');
    component.updatePasteText(SAMPLE_MARKDOWN_DOC);
    await component.convert();
    fixture.detectChanges();

    vi.useFakeTimers();
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-office-pdf');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    expect(component.canDownload()).toBe(true);
    component.downloadPdf();
    expect(createSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-office-pdf');

    // Attach active worker reference & test termination on reset/destroy
    (component as unknown as { activeWorker: Worker | null }).activeWorker =
      new MockWorker() as unknown as Worker;
    component.reset();
    expect(terminateMock).toHaveBeenCalledTimes(1);
    expect(component.canDownload()).toBe(false);

    (component as unknown as { activeWorker: Worker | null }).activeWorker =
      new MockWorker() as unknown as Worker;
    component.ngOnDestroy();
    expect(terminateMock).toHaveBeenCalledTimes(2);

    expect(docxBytes.byteLength).toBeGreaterThan(100);
  });

  it('displays user-friendly errors for oversized (>50 MB) or legacy binary .doc OLE2 files without crashing', async () => {
    const hugeFakeFile = new File([new Uint8Array([0x50, 0x4b])], 'massive.docx');
    Object.defineProperty(hugeFakeFile, 'size', { value: 55 * 1024 * 1024 });

    await component.onFilesDropped([hugeFakeFile]);
    fixture.detectChanges();
    expect(component.errorMessage()).toMatch(/50\s*MB/i);

    const legacyOle2 = new File(
      [new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
      'legacy-contract.doc'
    );
    await component.onFilesDropped([legacyOle2]);
    fixture.detectChanges();
    expect(component.errorMessage()).toMatch(/legacy|\.doc|\.docx/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
