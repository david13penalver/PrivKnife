import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfRedactionComponent } from './pdf-redaction.component';
import { createSensitiveTestPdfBuffer } from './test-fixtures';

describe('PdfRedactionComponent (Seam 2: UI, Signals, Redactions & Privacy Boundary)', () => {
  let fixture: ComponentFixture<PdfRedactionComponent>;
  let component: PdfRedactionComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    let counter = 0;
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:http://localhost/pdf-redacted-${++counter}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [PdfRedactionComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PdfRedactionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display initial empty dropzone state with privacy badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.loadedDocument()).toBeNull();
    expect(compiled.textContent).toContain('PDF Redaction & Anonymizer');
    expect(compiled.textContent).toContain('100% In-Browser');
    expect(compiled.querySelector('app-dropzone')).toBeTruthy();
  });

  it('should load a dropped PDF and initialize viewer on page 1', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    const mockFile = new File([buffer], 'tax-form.pdf', { type: 'application/pdf' });

    await component.onFileDropped(mockFile);
    fixture.detectChanges();

    expect(component.loadedDocument()).not.toBeNull();
    expect(component.loadedDocument()?.name).toBe('tax-form.pdf');
    expect(component.loadedDocument()?.pageCount).toBe(1);
    expect(component.currentPageIndex()).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('tax-form.pdf');
    expect(compiled.textContent).toContain('Page 1 of 1');
  });

  it('should toggle between blackout and whiteout tools', () => {
    expect(component.activeTool()).toBe('black');
    component.setActiveTool('white');
    expect(component.activeTool()).toBe('white');
    component.setActiveTool('black');
    expect(component.activeTool()).toBe('black');
  });

  it('should add redaction boxes to current page', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    const mockFile = new File([buffer], 'tax-form.pdf', { type: 'application/pdf' });
    await component.onFileDropped(mockFile);

    // Add blackout box on page 0
    component.addRedactionBox({
      x: 50,
      y: 700,
      width: 200,
      height: 30,
      color: 'black',
    });

    const currentPageBoxes = component.currentPageRedactions();
    expect(currentPageBoxes).toHaveLength(1);
    expect(currentPageBoxes[0].color).toBe('black');
    expect(currentPageBoxes[0].width).toBe(200);
    expect(component.totalRedactionCount()).toBe(1);
  });

  it('should undo last redaction on the current page', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    const mockFile = new File([buffer], 'tax-form.pdf', { type: 'application/pdf' });
    await component.onFileDropped(mockFile);

    component.addRedactionBox({ x: 50, y: 700, width: 200, height: 30, color: 'black' });
    component.addRedactionBox({ x: 50, y: 650, width: 150, height: 25, color: 'white' });
    expect(component.currentPageRedactions()).toHaveLength(2);

    component.undoRedaction();
    expect(component.currentPageRedactions()).toHaveLength(1);
    expect(component.currentPageRedactions()[0].color).toBe('black');
  });

  it('should clear all redaction boxes on the current page', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    const mockFile = new File([buffer], 'tax-form.pdf', { type: 'application/pdf' });
    await component.onFileDropped(mockFile);

    component.addRedactionBox({ x: 50, y: 700, width: 200, height: 30, color: 'black' });
    component.addRedactionBox({ x: 50, y: 650, width: 150, height: 25, color: 'white' });
    expect(component.currentPageRedactions()).toHaveLength(2);

    component.clearCurrentPageRedactions();
    expect(component.currentPageRedactions()).toHaveLength(0);
  });

  it('should reset document to null and clear state', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    const mockFile = new File([buffer], 'tax-form.pdf', { type: 'application/pdf' });
    await component.onFileDropped(mockFile);
    component.addRedactionBox({ x: 50, y: 700, width: 200, height: 30, color: 'black' });

    component.resetDocument();
    expect(component.loadedDocument()).toBeNull();
    expect(component.totalRedactionCount()).toBe(0);
  });

  it('should download sanitized PDF and revoke object URL immediately', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    const mockFile = new File([buffer], 'tax-form.pdf', { type: 'application/pdf' });
    await component.onFileDropped(mockFile);

    component.addRedactionBox({ x: 50, y: 700, width: 200, height: 30, color: 'black' });

    await component.downloadSanitizedPdf();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should adjust zoom levels within boundaries', () => {
    expect(component.zoomLevel()).toBe(1.0);
    component.zoomIn();
    expect(component.zoomLevel()).toBe(1.25);
    component.zoomIn();
    expect(component.zoomLevel()).toBe(1.5);
    component.zoomOut();
    expect(component.zoomLevel()).toBe(1.25);
  });

  it('should toggle raster flattening mode', () => {
    expect(component.flattenRaster()).toBe(true);
    component.toggleFlattenRaster();
    expect(component.flattenRaster()).toBe(false);
    component.toggleFlattenRaster();
    expect(component.flattenRaster()).toBe(true);
  });

  it('should navigate between document pages safely', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    const mockFile = new File([buffer], 'tax-form.pdf', { type: 'application/pdf' });
    await component.onFileDropped(mockFile);

    expect(component.currentPageIndex()).toBe(0);
    await component.goToPage(1); // Page 1 is out of bounds for 1-page doc
    expect(component.currentPageIndex()).toBe(0);
  });

  it('should execute processing with ZERO network calls (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    const buffer = await createSensitiveTestPdfBuffer();
    const mockFile = new File([buffer], 'secret.pdf', { type: 'application/pdf' });

    await component.onFilesSelected([mockFile]);
    component.addRedactionBox({ x: 10, y: 10, width: 100, height: 50, color: 'black' });
    await component.downloadSanitizedPdf();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('should catch corrupt non-PDF upload, prevent unhandled rejection, and display error banner', async () => {
    const corruptFile = new File([new Uint8Array([1, 2, 3, 4, 5])], 'invalid.pdf', { type: 'application/pdf' });

    await component.onFileDropped(corruptFile);
    fixture.detectChanges();

    expect(component.isProcessing()).toBe(false);
    expect(component.loadedDocument()).toBeNull();
    expect((component as any).errorMessage()).not.toBeNull();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain((component as any).errorMessage()!);
  });
});
