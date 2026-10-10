import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ExifStripperComponent } from './exif-stripper.component';
import { createMockJpegWithExif, createMockJpegClean } from './test-fixtures';

describe('ExifStripperComponent (Seam 2: UI & Privacy Boundary)', () => {
  let fixture: ComponentFixture<ExifStripperComponent>;
  let component: ExifStripperComponent;
  let revokeObjectURLSpy: any;
  let createObjectURLSpy: any;

  beforeEach(async () => {
    // Stub URL.createObjectURL and URL.revokeObjectURL for tests
    let objectUrlCounter = 0;
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:http://localhost/mock-${++objectUrlCounter}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ExifStripperComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ExifStripperComponent);
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
    expect(compiled.textContent).toContain('EXIF & Privacy Metadata Stripper');
    expect(compiled.textContent).toContain('100% In-Browser');
    expect(compiled.querySelector('.c-dropzone')).toBeTruthy();
  });

  it('should inspect metadata when a file with EXIF is selected', async () => {
    const rawJpeg = createMockJpegWithExif();
    const mockFile = new File([rawJpeg as BlobPart], 'photo-with-exif.jpg', { type: 'image/jpeg' });

    await component.onFileSelected(mockFile);
    fixture.detectChanges();

    expect(component.selectedFile()).toBe(mockFile);
    expect(component.metadata()).toBeTruthy();
    expect(component.metadata()?.tagCount).toBeGreaterThanOrEqual(3);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('photo-with-exif.jpg');
    expect(compiled.textContent).toContain('Before:');
    expect(compiled.textContent).toContain('PrivKnife'); // Make
    expect(compiled.textContent).toContain('PK-100'); // Model
  });

  it('should strip metadata and create a sanitized download when button is clicked', async () => {
    const rawJpeg = createMockJpegWithExif();
    const mockFile = new File([rawJpeg as BlobPart], 'vacation.jpg', { type: 'image/jpeg' });

    await component.onFileSelected(mockFile);
    fixture.detectChanges();

    // Trigger Strip & Download
    await component.stripAndDownload();
    fixture.detectChanges();

    expect(component.strippedResult()).toBeTruthy();
    expect(component.strippedResult()?.tagsRemovedCount).toBeGreaterThanOrEqual(3);
    expect(component.cleanedDownloadUrl()).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('0 EXIF Tags Remaining');
    expect(compiled.textContent).toContain('Cleaned');
  });

  it('should revoke object URLs on reset and on destroy (Memory Hygiene)', async () => {
    const rawJpeg = createMockJpegWithExif();
    const mockFile = new File([rawJpeg as BlobPart], 'test.jpg', { type: 'image/jpeg' });

    await component.onFileSelected(mockFile);
    await component.stripAndDownload();

    expect(createObjectURLSpy).toHaveBeenCalled();

    // Reset component
    component.reset();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.selectedFile()).toBeNull();
    expect(component.metadata()).toBeNull();
    expect(component.cleanedDownloadUrl()).toBeNull();

    // Destroy component
    fixture.destroy();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should execute processing with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    const rawJpeg = createMockJpegWithExif();
    const mockFile = new File([rawJpeg as BlobPart], 'private-doc.jpg', { type: 'image/jpeg' });

    await component.onFileSelected(mockFile);
    await component.stripAndDownload();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
