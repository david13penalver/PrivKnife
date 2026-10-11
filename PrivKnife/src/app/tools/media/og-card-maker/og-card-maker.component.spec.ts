import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OgCardMakerComponent } from './og-card-maker.component';
import { createMockImageFile } from './test-fixtures';

describe('OgCardMakerComponent (Seam 2: Studio UI, Previews, Exports & Privacy Guard)', () => {
  let fixture: ComponentFixture<OgCardMakerComponent>;
  let component: OgCardMakerComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:https://privknife.com/mock-og-card-${Math.random()}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [OgCardMakerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OgCardMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default config, modern-tech template, and generated meta snippet', () => {
    expect(component).toBeTruthy();
    expect(component.config().title).toContain('Building Privacy-First Web Apps');
    expect(component.config().template).toBe('modern-tech');
    expect(component.htmlMetaSnippet()).toContain('<meta property="og:title"');
  });

  it('should reactively update config fields and re-compute meta snippet', () => {
    component.updateConfig('title', 'Next-Gen Local-First Client Apps');
    expect(component.config().title).toBe('Next-Gen Local-First Client Apps');
    expect(component.htmlMetaSnippet()).toContain('Next-Gen Local-First Client Apps');

    component.updateConfig('domain', 'mytool.dev');
    expect(component.config().domain).toBe('mytool.dev');
    expect(component.htmlMetaSnippet()).toContain('https://mytool.dev/');

    component.updateConfig('primaryColor', '#10b981');
    expect(component.config().primaryColor).toBe('#10b981');
  });

  it('should switch card templates between modern-tech, blog, product-hunt, and code-snippet', () => {
    component.setTemplate('article-blog');
    expect(component.config().template).toBe('article-blog');

    component.setTemplate('product-hunt');
    expect(component.config().template).toBe('product-hunt');

    component.setTemplate('code-snippet');
    expect(component.config().template).toBe('code-snippet');
  });

  it('should copy HTML meta tags to clipboard with feedback state', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    await component.copyMetaSnippet();

    expect(writeTextSpy).toHaveBeenCalledWith(component.htmlMetaSnippet());
    expect(component.copiedSnippet()).toBe(true);
  });

  it('should export 1200x630 PNG and immediately revoke object URL', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadCard('png');

    expect(anchorClickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.showExportModal()).toBe(true);

    component.closeExportModal();
    expect(component.showExportModal()).toBe(false);
  });

  it('should export 1200x630 WebP and immediately revoke object URL', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadCard('webp');

    expect(anchorClickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should handle custom avatar and background images and revoke URLs on destroy', async () => {
    const avatarFile = createMockImageFile('my-avatar.png', 'image/png', 3000);
    component.onAvatarSelected([avatarFile]);

    expect(component.avatarFile()).toBe(avatarFile);
    expect(createObjectURLSpy).toHaveBeenCalled();

    fixture.destroy();

    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('should render and export with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    component.updateConfig('title', 'Confidential Internal Launch');
    await component.downloadCard('png');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
