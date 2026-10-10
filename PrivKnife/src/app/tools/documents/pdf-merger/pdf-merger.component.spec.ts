import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfMergerComponent } from './pdf-merger.component';
import { createTestPdfBuffer } from './test-fixtures';

describe('PdfMergerComponent (Seam 2: UI, Actions & Privacy Boundary)', () => {
  let fixture: ComponentFixture<PdfMergerComponent>;
  let component: PdfMergerComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    let counter = 0;
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:http://localhost/pdf-${++counter}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [PdfMergerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PdfMergerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display initial empty dropzone state', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.pages()).toHaveLength(0);
    expect(compiled.textContent).toContain('PDF Merger, Splitter & Page Organizer');
    expect(compiled.textContent).toContain('100% In-Browser');
    expect(compiled.querySelector('app-dropzone')).toBeTruthy();
  });

  it('should load dropped PDF files into page cards', async () => {
    const buffer = await createTestPdfBuffer(2, 'Contract');
    const mockFile = new File([buffer], 'contract.pdf', { type: 'application/pdf' });

    await component.onFilesDropped([mockFile]);
    fixture.detectChanges();

    expect(component.loadedDocuments()).toHaveLength(1);
    expect(component.pages()).toHaveLength(2);
    expect(component.pages()[0].documentName).toBe('contract.pdf');
    expect(component.pages()[0].displayPageNumber).toBe(1);
    expect(component.pages()[1].displayPageNumber).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2 Pages Loaded');
  });

  it('should rotate a single page and rotate all pages', async () => {
    const buffer = await createTestPdfBuffer(2, 'Doc');
    const mockFile = new File([buffer], 'doc.pdf', { type: 'application/pdf' });
    await component.onFilesDropped([mockFile]);

    component.rotateSinglePage(0);
    expect(component.pages()[0].rotation).toBe(90);

    component.rotateAll();
    expect(component.pages()[0].rotation).toBe(180);
    expect(component.pages()[1].rotation).toBe(90);
  });

  it('should delete a page and move page positions left/right', async () => {
    const buffer = await createTestPdfBuffer(3, 'Multi');
    const mockFile = new File([buffer], 'multi.pdf', { type: 'application/pdf' });
    await component.onFilesDropped([mockFile]);

    // Move page 0 right
    component.movePage(0, 'right');
    expect(component.pages()[0].pageIndex).toBe(1);
    expect(component.pages()[1].pageIndex).toBe(0);

    // Delete first page
    component.deletePage(0);
    expect(component.pages()).toHaveLength(2);
  });

  it('should assemble and download merged PDF while revoking object URL', async () => {
    const buffer = await createTestPdfBuffer(2, 'MergeDoc');
    const mockFile = new File([buffer], 'mergedoc.pdf', { type: 'application/pdf' });
    await component.onFilesDropped([mockFile]);

    await component.mergeAndDownload();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should execute processing with ZERO network calls (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    const buffer = await createTestPdfBuffer(1, 'Private');
    const mockFile = new File([buffer], 'confidential.pdf', { type: 'application/pdf' });

    await component.onFilesDropped([mockFile]);
    component.rotateSinglePage(0);
    await component.mergeAndDownload();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
