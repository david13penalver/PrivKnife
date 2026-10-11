import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GridPaperComponent } from './grid-paper.component';

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('GridPaperComponent (Seam 2: UI, Signals, LocalStorage & Privacy Boundary)', () => {
  let fixture: ComponentFixture<GridPaperComponent>;
  let component: GridPaperComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;
  let mockStorage: MockStorage;

  beforeEach(async () => {
    mockStorage = new MockStorage();
    vi.stubGlobal('localStorage', mockStorage);

    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:https://privknife.com/mock-grid-paper-blob');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [GridPaperComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GridPaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should create the component with initial options and live SVG preview', () => {
    expect(component).toBeTruthy();
    expect(component.options()).toBeDefined();
    expect(component.options().gridStyle).toBe('dot');
    expect(component.previewSvg()).toContain('<svg');
  });

  it('should change grid style and update SVG preview reactively', () => {
    component.setGridStyle('square');
    expect(component.options().gridStyle).toBe('square');
    expect(component.previewSvg()).toContain('<line');

    component.setGridStyle('isometric');
    expect(component.options().gridStyle).toBe('isometric');

    component.setGridStyle('hexagonal');
    expect(component.options().gridStyle).toBe('hexagonal');
  });

  it('should update spacing, margins, and major line accents', () => {
    component.updateOption('spacing', 7.5);
    expect(component.options().spacing).toBe(7.5);

    component.updateOption('marginTop', 15);
    expect(component.options().marginTop).toBe(15);

    component.updateOption('accentMajorLines', true);
    expect(component.options().accentMajorLines).toBe(true);
  });

  it('should apply preset configuration', () => {
    component.applyPreset('engineering-graph');
    expect(component.options().gridStyle).toBe('square');
    expect(component.options().strokeColor).toBe('#0284c7');
    expect(component.options().accentMajorLines).toBe(true);
  });

  it('should persist settings to localStorage and restore on init', () => {
    component.updateOption('strokeColor', '#334155');
    component.updateOption('spacing', 12);
    component.saveSettingsToStorage();

    const stored = mockStorage.getItem('privknife_grid_paper_settings');
    expect(stored).not.toBeNull();
    expect(stored).toContain('#334155');

    // Create a new component instance to verify restoration
    const newFixture = TestBed.createComponent(GridPaperComponent);
    const newComponent = newFixture.componentInstance as GridPaperComponent;
    newFixture.detectChanges();

    expect(newComponent.options().strokeColor).toBe('#334155');
    expect(newComponent.options().spacing).toBe(12);
  });

  it('should reset settings to default', () => {
    component.updateOption('spacing', 20);
    component.saveSettingsToStorage();

    component.resetToDefault();

    expect(component.options().spacing).toBe(5);
    expect(mockStorage.getItem('privknife_grid_paper_settings')).toBeNull();
  });

  it('should download PDF, revoke object URL, and show post-download modal', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadPdf();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:https://privknife.com/mock-grid-paper-blob');
    expect(component.showDownloadModal()).toBe(true);

    component.closeDownloadModal();
    expect(component.showDownloadModal()).toBe(false);
  });

  it('should download SVG and revoke object URL immediately', () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    component.downloadSvg();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:https://privknife.com/mock-grid-paper-blob');
  });

  it('should execute processing with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await component.downloadPdf();
    component.downloadSvg();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
