import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PDFDocument } from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfFormStudioComponent } from './pdf-form-studio.component';
import { createFlatPdf, createSampleAcroFormPdf } from './test-fixtures';

describe('PdfFormStudioComponent (Seam 3: Angular UI, Zero-Knowledge PII Hygiene & AcroForm Flows)', () => {
  let component: PdfFormStudioComponent;
  let fixture: ComponentFixture<PdfFormStudioComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let localStorageSpy: ReturnType<typeof vi.spyOn>;
  let sessionStorageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    sessionStorageSpy = vi.spyOn(window.sessionStorage, 'setItem');

    await TestBed.configureTestingModule({
      imports: [PdfFormStudioComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfFormStudioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    localStorageSpy.mockRestore();
    sessionStorageSpy.mockRestore();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with Fill mode defaults and zero PII / PDF state', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe('fill');
    expect(component.flattenOutput()).toBe(false);
    expect(component.fontFamily()).toBe('helvetica');
    expect(component.fields()).toHaveLength(0);
    expect(component.pdfBytes()).toBeNull();
    expect(component.canCompile()).toBe(false);
  });

  it('inspects existing AcroForm fields, filters sidebar list, edits values, and exports JSON snapshots securely', async () => {
    const sampleBytes = await createSampleAcroFormPdf();
    await component.onFileDropped([
      new File([sampleBytes.buffer as ArrayBuffer], 'application.pdf', {
        type: 'application/pdf',
      }),
    ]);

    expect(component.pageCount()).toBe(2);
    expect(component.fields()).toHaveLength(7);
    expect(component.filledCount()).toBeGreaterThan(0);

    component.searchQuery.set('country');
    expect(component.filteredFields().map((f) => f.name)).toEqual(['country']);
    component.searchQuery.set('');

    const fullName = component.fields().find((f) => f.name === 'full_name')!;
    component.updateFieldValue(fullName.id, 'Marco Polo');

    const agree = component.fields().find((f) => f.name === 'agree_terms')!;
    component.updateFieldValue(agree.id, true);

    const json = component.exportJsonSnapshot();
    expect(json).toContain('Marco Polo');

    // Mutate and restore via JSON import
    component.updateFieldValue(fullName.id, 'Temporary');
    expect(component.importJsonSnapshot(json)).toBe(true);
    expect(
      component.fields().find((f) => f.name === 'full_name')?.value
    ).toBe('Marco Polo');

    // Invalid JSON rejected gracefully
    expect(component.importJsonSnapshot('{bad json')).toBe(false);
    expect(component.errorMessage()).toBeTruthy();

    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();
  });

  it('supports Creator Mode field placement on flat PDF and Flatten output removal', async () => {
    const flatBytes = await createFlatPdf(1);
    await component.onFileDropped([
      new File([flatBytes.buffer as ArrayBuffer], 'flat.pdf', {
        type: 'application/pdf',
      }),
    ]);

    expect(component.fields()).toHaveLength(0);
    component.setMode('create');

    component.addFieldAt('text', 0, 72, 680);
    component.addFieldAt('checkbox', 0, 72, 640);
    expect(component.fields()).toHaveLength(2);

    const createdText = component.fields()[0];
    const createdCheck = component.fields()[1];
    component.updateFieldValue(createdText.id, 'SSN-PRIVATE-0000');
    component.updateFieldValue(createdCheck.id, true);

    // First export editable
    component.flattenOutput.set(false);
    await component.compileDocument();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.fieldsCreated).toBe(2);
    const editableDoc = await PDFDocument.load(component.lastResult()!.bytes!);
    expect(editableDoc.getForm().getFields()).toHaveLength(2);

    // Now export flattened
    component.flattenOutput.set(true);
    await component.compileDocument();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.flattened).toBe(true);
    const flatDoc = await PDFDocument.load(component.lastResult()!.bytes!);
    expect(flatDoc.getForm().getFields()).toHaveLength(0);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();
  });

  it('rejects non-PDF files cleanly and flags files > 100 MB with a non-blocking warning', async () => {
    const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'bad.png', {
      type: 'image/png',
    });
    await component.onFileDropped([pngFile]);
    expect(component.errorMessage()).toBeTruthy();
    expect(component.pdfBytes()).toBeNull();

    const flatBytes = await createFlatPdf(1);
    const hugePdf = new File([flatBytes.buffer as ArrayBuffer], 'huge.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(hugePdf, 'size', { value: 105 * 1024 * 1024 });

    await component.onFileDropped([hugePdf]);
    expect(component.largeFileWarning()).toBe(true);
    expect(component.pdfBytes()).not.toBeNull();
  });

  it('updates localized UI text EN <-> ES and cleans up PII signals, URLs, and workers on reset', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-form-pdf');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const sampleBytes = await createSampleAcroFormPdf();
    await component.onFileDropped([
      new File([sampleBytes.buffer as ArrayBuffer], 'w9.pdf', {
        type: 'application/pdf',
      }),
    ]);
    await component.compileDocument();
    component.downloadResult();
    expect(createUrlSpy).toHaveBeenCalledTimes(1);

    await i18nService.setLanguage('es');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Formularios');

    component.reset();
    expect(component.fields()).toHaveLength(0);
    expect(component.pdfBytes()).toBeNull();
    expect(component.searchQuery()).toBe('');
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-form-pdf');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });
});
