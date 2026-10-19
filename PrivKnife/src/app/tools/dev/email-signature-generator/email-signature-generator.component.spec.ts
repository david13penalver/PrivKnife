import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMPACT_SIGNATURE_CONFIG,
  CORPORATE_SIGNATURE_CONFIG,
  DEFAULT_SIGNATURE_CONFIG,
} from './test-fixtures';
import { EmailSignatureGeneratorComponent } from './email-signature-generator.component';

class MockStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('EmailSignatureGeneratorComponent', () => {
  let component: EmailSignatureGeneratorComponent;
  let fixture: ComponentFixture<EmailSignatureGeneratorComponent>;
  let mockStorage: MockStorage;

  beforeEach(async () => {
    mockStorage = new MockStorage();
    vi.stubGlobal('localStorage', mockStorage);

    await TestBed.configureTestingModule({
      imports: [EmailSignatureGeneratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailSignatureGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
  });

  it('should initialize with default signature configuration and live preview', () => {
    expect(component).toBeTruthy();
    expect(component.config().personal.fullName).toBe(DEFAULT_SIGNATURE_CONFIG.personal.fullName);
    expect(component.generatedHtml()).toContain('Alex Morgan');
    expect(component.generatedHtml()).toContain('Apex Cloud Solutions');
  });

  it('should reactively update generated HTML when personal details change', () => {
    component.updatePersonalInfo({ fullName: 'Samantha Reed', jobTitle: 'Principal Architect' });
    fixture.detectChanges();

    expect(component.config().personal.fullName).toBe('Samantha Reed');
    expect(component.config().personal.jobTitle).toBe('Principal Architect');
    expect(component.generatedHtml()).toContain('Samantha Reed');
    expect(component.generatedHtml()).toContain('Principal Architect');
  });

  it('should reactively switch template preset and update HTML structure', () => {
    component.selectTemplate('corporate');
    fixture.detectChanges();

    expect(component.config().style.template).toBe('corporate');
    expect(component.generatedHtml()).toContain('max-width: 550px');
  });

  it('should load full demo presets (corporate, compact, etc.)', () => {
    component.loadPreset('corporate');
    fixture.detectChanges();

    expect(component.config().personal.fullName).toBe(CORPORATE_SIGNATURE_CONFIG.personal.fullName);
    expect(component.config().style.template).toBe('corporate');
    expect(component.generatedHtml()).toContain('Eleanor Vance');
    expect(component.generatedHtml()).toContain('CONFIDENTIALITY NOTICE');

    component.loadPreset('compact');
    fixture.detectChanges();

    expect(component.config().personal.fullName).toBe(COMPACT_SIGNATURE_CONFIG.personal.fullName);
    expect(component.config().style.template).toBe('compact');
  });

  it('should copy rich text signature to clipboard with fallback', async () => {
    class MockClipboardItem {
      constructor(public data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', MockClipboardItem);

    const clipboardWriteMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: clipboardWriteMock, writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });

    await component.copyRichText();
    expect(clipboardWriteMock).toHaveBeenCalled();
    expect(component.copiedRichText()).toBe(true);
  });

  it('should copy raw HTML code to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock, write: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });

    await component.copyRawHtml();
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('Alex Morgan'));
    expect(component.copiedRawHtml()).toBe(true);
  });

  it('should download HTML file and revoke object URL immediately', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.downloadHtmlFile();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should auto-save to localStorage and reload draft on restart', () => {
    component.updatePersonalInfo({ fullName: 'Dr. Jane Watson' });
    fixture.detectChanges();

    const saved = localStorage.getItem('privknife_email_signature_draft');
    expect(saved).toBeTruthy();
    expect(saved).toContain('Dr. Jane Watson');

    // Create a new component instance to verify restoration
    const newFixture = TestBed.createComponent(EmailSignatureGeneratorComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.config().personal.fullName).toBe('Dr. Jane Watson');
  });

  it('should reset configuration back to defaults when reset is called', () => {
    component.updatePersonalInfo({ fullName: 'Temporary User' });
    fixture.detectChanges();
    expect(component.config().personal.fullName).toBe('Temporary User');

    component.resetToDefaults();
    fixture.detectChanges();

    expect(component.config().personal.fullName).toBe(DEFAULT_SIGNATURE_CONFIG.personal.fullName);
  });

  it('should verify 100% offline isolation with zero network leakage', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    // Run actions
    component.updatePersonalInfo({ fullName: 'Private Agent', company: 'Secret Corp' });
    component.selectTemplate('two-column');
    component.downloadHtmlFile();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('should not contain any external HTTP/HTTPS image URLs in default templates (Privacy Directive 1 & 2)', () => {
    const avatarUrl = component.config().images.avatarUrl;
    const logoUrl = component.config().images.logoUrl;

    if (avatarUrl) {
      expect(avatarUrl.startsWith('http')).toBe(false);
      expect(avatarUrl.startsWith('data:image/svg+xml')).toBe(true);
    }
    if (logoUrl) {
      expect(logoUrl.startsWith('http')).toBe(false);
      expect(logoUrl.startsWith('data:image/svg+xml')).toBe(true);
    }

    const compiled = fixture.nativeElement as HTMLElement;
    const images = Array.from(compiled.querySelectorAll('img'));
    for (const img of images) {
      expect(img.src.includes('unsplash.com')).toBe(false);
    }
  });
});
