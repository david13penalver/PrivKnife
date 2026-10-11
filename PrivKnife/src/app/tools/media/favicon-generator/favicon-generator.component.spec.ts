import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FaviconGeneratorComponent } from './favicon-generator.component';
import { createMockImageFile } from './test-fixtures';

describe('FaviconGeneratorComponent (Seam 2: UI, Signals, Multi-Platform Previews & Privacy Boundary)', () => {
  let fixture: ComponentFixture<FaviconGeneratorComponent>;
  let component: FaviconGeneratorComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((blob: any) => `blob:https://privknife.com/mock-favicon-blob-${Math.random()}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [FaviconGeneratorComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FaviconGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default site name, theme color, and empty source file', () => {
    expect(component).toBeTruthy();
    expect(component.config().siteName).toBe('My Web Application');
    expect(component.config().themeColor).toBe('#0f172a');
    expect(component.sourceFile()).toBeNull();
  });

  it('should ingest source image and trigger suite generation', async () => {
    const file = createMockImageFile('my-logo.png', 'image/png', 5000);

    await component.onFilesSelected([file]);

    expect(component.sourceFile()).toBe(file);
    expect(component.sourcePreviewUrl()).toBeTruthy();
    expect(component.suiteResult()).toBeDefined();
    expect(component.suiteResult()?.assets.length).toBeGreaterThanOrEqual(6);
  });

  it('should update site name, short name, theme color, and padding reactively', () => {
    component.updateConfig('siteName', 'FinTech Portal');
    expect(component.config().siteName).toBe('FinTech Portal');

    component.updateConfig('themeColor', '#2563eb');
    expect(component.config().themeColor).toBe('#2563eb');

    component.updateConfig('paddingPercent', 15);
    expect(component.config().paddingPercent).toBe(15);

    expect(component.htmlSnippet()).toContain('content="#2563eb"');
  });

  it('should copy HTML snippet to clipboard with feedback state', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    await component.copyHtmlSnippet();

    expect(writeTextSpy).toHaveBeenCalledWith(component.htmlSnippet());
    expect(component.copiedSnippet()).toBe(true);
  });

  it('should compile and download ZIP archive and immediately revoke object URL', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const file = createMockImageFile('app-icon.png', 'image/png', 4000);
    await component.onFilesSelected([file]);

    await component.downloadZip();

    expect(anchorClickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.showDownloadModal()).toBe(true);

    component.closeDownloadModal();
    expect(component.showDownloadModal()).toBe(false);
  });

  it('should revoke object URLs on component destroy', async () => {
    const file = createMockImageFile('app-icon.png', 'image/png', 4000);
    await component.onFilesSelected([file]);

    fixture.destroy();

    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should execute generation and download with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    const file = createMockImageFile('secure-logo.png', 'image/png', 5000);
    await component.onFilesSelected([file]);
    await component.downloadZip();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
