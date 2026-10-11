import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CHEATSHEET_CONFIG,
  GIT_CHEATSHEET_CONFIG,
  JAVASCRIPT_CHEATSHEET_CONFIG,
} from './test-fixtures';
import { MarkdownCheatsheetComponent } from './markdown-cheatsheet.component';

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

describe('MarkdownCheatsheetComponent (Seam 2: UI, Signals & Privacy Boundary)', () => {
  let component: MarkdownCheatsheetComponent;
  let fixture: ComponentFixture<MarkdownCheatsheetComponent>;
  let mockStorage: MockStorage;

  beforeEach(async () => {
    mockStorage = new MockStorage();
    vi.stubGlobal('localStorage', mockStorage);

    await TestBed.configureTestingModule({
      imports: [MarkdownCheatsheetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownCheatsheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
  });

  it('should initialize with default cheatsheet configuration and live preview', () => {
    expect(component).toBeTruthy();
    expect(component.config().title).toBe(DEFAULT_CHEATSHEET_CONFIG.title);
    expect(component.renderedHtml()).toContain('Python 3 &amp; Algorithms Quick Reference');
    expect(component.renderedHtml()).toContain('column-count: 2');
  });

  it('should reactively update layout when columns, orientation, or paper size change', () => {
    component.updateColumns(3);
    component.updateOrientation('landscape');
    component.updatePaperSize('letter');
    fixture.detectChanges();

    expect(component.config().columns).toBe(3);
    expect(component.config().orientation).toBe('landscape');
    expect(component.config().paperSize).toBe('letter');
    expect(component.renderedHtml()).toContain('column-count: 3');
  });

  it('should load preset templates (Git, JavaScript, etc.)', () => {
    component.loadPreset('git');
    fixture.detectChanges();

    expect(component.config().title).toBe(GIT_CHEATSHEET_CONFIG.title);
    expect(component.renderedHtml()).toContain('Git &amp; Terminal CLI Cheatsheet');

    component.loadPreset('javascript');
    fixture.detectChanges();

    expect(component.config().title).toBe(JAVASCRIPT_CHEATSHEET_CONFIG.title);
    expect(component.renderedHtml()).toContain('Modern TypeScript &amp; ESNext Reference');
  });

  it('should insert markdown snippets into editor content', () => {
    const initialLen = component.config().markdownContent.length;
    component.insertSnippet('table');
    fixture.detectChanges();

    expect(component.config().markdownContent.length).toBeGreaterThan(initialLen);
    expect(component.config().markdownContent).toContain('| Feature | Details |');
  });

  it('should auto-save to localStorage and restore on init', () => {
    component.updateTitle('Custom Linear Algebra Sheet');
    fixture.detectChanges();

    const stored = mockStorage.getItem('privknife_markdown_cheatsheet_draft');
    expect(stored).toBeTruthy();
    expect(stored).toContain('Custom Linear Algebra Sheet');

    // Create a new instance
    const newFixture = TestBed.createComponent(MarkdownCheatsheetComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.config().title).toBe('Custom Linear Algebra Sheet');
  });

  it('should reset configuration back to defaults', () => {
    component.updateTitle('Draft to be discarded');
    fixture.detectChanges();
    expect(component.config().title).toBe('Draft to be discarded');

    component.resetToDefaults();
    fixture.detectChanges();

    expect(component.config().title).toBe(DEFAULT_CHEATSHEET_CONFIG.title);
  });

  it('should download PDF file and revoke object URL immediately', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-cheatsheet-pdf');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.downloadPdf();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-cheatsheet-pdf');
  });

  it('should copy rendered HTML code to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    await component.copyHtml();
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('Python 3'));
    expect(component.copiedHtmlState()).toBe(true);
  });

  it('should verify 100% offline isolation with zero network leakage', () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    component.updateTitle('Offline Research Sheet');
    component.loadPreset('git');
    component.downloadPdf();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
