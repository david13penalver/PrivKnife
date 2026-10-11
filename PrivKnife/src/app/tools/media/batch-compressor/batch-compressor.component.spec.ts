import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BatchCompressorComponent } from './batch-compressor.component';
import { createMockImageFile } from './test-fixtures';

describe('BatchCompressorComponent (Seam 2: UI, Signals, Queue & Privacy Boundary)', () => {
  let fixture: ComponentFixture<BatchCompressorComponent>;
  let component: BatchCompressorComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((blob: any) => `blob:https://privknife.com/mock-blob-${Math.random()}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [BatchCompressorComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BatchCompressorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty queue, WebP format, and 80% quality', () => {
    expect(component).toBeTruthy();
    expect(component.queue().length).toBe(0);
    expect(component.options().format).toBe('webp');
    expect(component.options().quality).toBe(80);
    expect(component.options().resizePreset).toBe('none');
    expect(component.stats().totalFiles).toBe(0);
  });

  it('should add files to the queue upon selection and create preview URLs', () => {
    const file1 = createMockImageFile('banner.png', 'image/png', 50000);
    const file2 = createMockImageFile('avatar.jpg', 'image/jpeg', 20000);

    component.onFilesSelected([file1, file2]);

    expect(component.queue().length).toBe(2);
    expect(component.queue()[0].name).toBe('banner.png');
    expect(component.queue()[1].name).toBe('avatar.jpg');
    expect(component.queue()[0].status).toBe('queued');
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should update format, quality, and resize preset reactively', () => {
    component.setFormat('jpeg');
    expect(component.options().format).toBe('jpeg');

    component.setQuality(65);
    expect(component.options().quality).toBe(65);

    component.setResizePreset('1920');
    expect(component.options().resizePreset).toBe('1920');
  });

  it('should compress all items in queue and update stats', async () => {
    const file1 = createMockImageFile('photo1.png', 'image/png', 30000);
    const file2 = createMockImageFile('photo2.png', 'image/png', 40000);

    component.onFilesSelected([file1, file2]);
    await component.compressAll();

    expect(component.queue()[0].status).toBe('done');
    expect(component.queue()[1].status).toBe('done');
    expect(component.queue()[0].compressedBlob).toBeDefined();
    expect(component.stats().processedFiles).toBe(2);
    expect(component.stats().totalSavedBytes).toBeGreaterThan(0);
  });

  it('should select an item for Before/After split comparison', async () => {
    const file = createMockImageFile('compare.png', 'image/png', 25000);
    component.onFilesSelected([file]);
    await component.compressAll();

    component.selectPreviewItem(component.queue()[0].id);
    expect(component.selectedPreviewItem()).toBeDefined();
    expect(component.selectedPreviewItem()?.id).toBe(component.queue()[0].id);

    component.closeSplitPreview();
    expect(component.selectedPreviewItem()).toBeNull();
  });

  it('should download a single processed image and immediately revoke object URL', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const file = createMockImageFile('single.png', 'image/png', 10000);
    component.onFilesSelected([file]);
    await component.compressAll();

    const item = component.queue()[0];
    component.downloadSingleItem(item);

    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should download all processed images as ZIP and immediately revoke object URL', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const file1 = createMockImageFile('img1.png', 'image/png', 10000);
    const file2 = createMockImageFile('img2.png', 'image/png', 15000);
    component.onFilesSelected([file1, file2]);
    await component.compressAll();

    await component.downloadAllZip();

    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.showDownloadModal()).toBe(true);

    component.closeDownloadModal();
    expect(component.showDownloadModal()).toBe(false);
  });

  it('should revoke preview object URLs when items are removed or queue is cleared', () => {
    const file1 = createMockImageFile('one.png', 'image/png', 5000);
    const file2 = createMockImageFile('two.png', 'image/png', 6000);
    component.onFilesSelected([file1, file2]);

    const item1 = component.queue()[0];
    component.removeItem(item1.id);

    expect(component.queue().length).toBe(1);
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    component.clearAll();
    expect(component.queue().length).toBe(0);
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should clean up all active object URLs on component destroy', () => {
    const file = createMockImageFile('cleanup.png', 'image/png', 5000);
    component.onFilesSelected([file]);

    fixture.destroy();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should execute batch compression with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    const file = createMockImageFile('private.png', 'image/png', 10000);
    component.onFilesSelected([file]);
    await component.compressAll();
    await component.downloadAllZip();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
