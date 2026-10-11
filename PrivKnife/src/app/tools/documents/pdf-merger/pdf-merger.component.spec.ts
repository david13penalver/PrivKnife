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

  it('should support page selection and bulk selection operations', async () => {
    const buffer = await createTestPdfBuffer(3, 'SelectTest');
    const mockFile = new File([buffer], 'select.pdf', { type: 'application/pdf' });
    await component.onFilesDropped([mockFile]);

    expect(component.selectedCount()).toBe(0);

    // Select page 0
    component.toggleSelectPage(0);
    expect(component.selectedCount()).toBe(1);
    expect(component.pages()[0].selected).toBe(true);

    // Select all
    component.selectAll();
    expect(component.selectedCount()).toBe(3);

    // Rotate selected
    component.rotateSelected();
    expect(component.pages()[0].rotation).toBe(90);
    expect(component.pages()[1].rotation).toBe(90);

    // Deselect all
    component.deselectAll();
    expect(component.selectedCount()).toBe(0);

    // Select page 1 and delete selected
    component.toggleSelectPage(1);
    expect(component.selectedCount()).toBe(1);
    component.deleteSelected();
    expect(component.pages()).toHaveLength(2);
    expect(component.selectedCount()).toBe(0);
  });

  it('should split document into individual pages and download as .zip', async () => {
    const buffer = await createTestPdfBuffer(2, 'SplitDoc');
    const mockFile = new File([buffer], 'split.pdf', { type: 'application/pdf' });
    await component.onFilesDropped([mockFile]);

    await component.splitAndDownloadZip();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should reorder pages via HTML5 drag-and-drop events', async () => {
    const buffer = await createTestPdfBuffer(3, 'DragDoc');
    const mockFile = new File([buffer], 'drag.pdf', { type: 'application/pdf' });
    await component.onFilesDropped([mockFile]);

    const mockDragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        effectAllowed: 'move',
        dropEffect: 'move',
        setData: vi.fn(),
      },
    } as unknown as DragEvent;

    // Drag item at index 0 to index 2
    component.onDragStart(0, mockDragEvent);
    expect(component.draggedIndex()).toBe(0);

    component.onDrop(2, mockDragEvent);
    expect(component.draggedIndex()).toBeNull();
    expect(component.pages()[2].pageIndex).toBe(0); // Moved to index 2
  });

  it('should display error message on invalid or corrupted files', async () => {
    const corruptFile = new File(['not a pdf buffer'], 'corrupt.pdf', { type: 'application/pdf' });
    await component.onFilesDropped([corruptFile]);

    expect(component.errorMessage()).toContain('Error reading PDF');
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
