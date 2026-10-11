import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TableTentMakerComponent } from './table-tent-maker.component';

describe('TableTentMakerComponent (Seam 2: UI, Signals, Preview & Privacy Boundary)', () => {
  let fixture: ComponentFixture<TableTentMakerComponent>;
  let component: TableTentMakerComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:https://privknife.com/mock-table-tent-pdf');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [TableTentMakerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TableTentMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default Restaurant QR Menu config and bi-fold geometry', () => {
    expect(component).toBeTruthy();
    expect(component.config().foldType).toBe('bi-fold');
    expect(component.config().paperFormat).toBe('a4');
    expect(component.config().mirrorPanels).toBe(true);
    expect(component.geometry().panels.length).toBe(2);
    expect(component.geometry().foldLines.length).toBe(1);
  });

  it('should apply preset templates correctly', () => {
    component.applyPreset('wedding-reserved');
    expect(component.config().fontFamily).toBe('times');
    expect(component.config().frontPanel.title).toBe('Table Reserved');
    expect(component.config().includeQrCode).toBe(false);

    component.applyPreset('hotel-wifi');
    expect(component.config().foldType).toBe('tri-fold');
    expect(component.config().frontPanel.title).toBe('Complimentary Wi-Fi');
    expect(component.geometry().panels.length).toBe(3);
  });

  it('should update paper format, orientation, and fold type reactively', () => {
    component.setPaperFormat('letter');
    expect(component.config().paperFormat).toBe('letter');
    expect(component.geometry().pageWidthMm).toBeCloseTo(215.9, 1);

    component.setOrientation('landscape');
    expect(component.config().orientation).toBe('landscape');

    component.setFoldType('tri-fold');
    expect(component.config().foldType).toBe('tri-fold');
    expect(component.geometry().panels.length).toBe(3);
    expect(component.geometry().foldLines.length).toBe(2);
  });

  it('should update front panel content and mirror to back panel when mirrorPanels is true', () => {
    component.updateFrontContent('title', 'Chef Tasting Experience');
    component.updateFrontContent('tableNumber', '42');
    component.updateFrontContent('subtitle', 'Wine Pairing Included');

    expect(component.config().frontPanel.title).toBe('Chef Tasting Experience');
    expect(component.config().frontPanel.tableNumber).toBe('42');
    expect(component.config().frontPanel.subtitle).toBe('Wine Pairing Included');
    expect(component.effectiveBackPanel().title).toBe('Chef Tasting Experience');
  });

  it('should support independent back panel content when mirrorPanels is disabled', () => {
    component.toggleMirrorPanels();
    expect(component.config().mirrorPanels).toBe(false);

    component.updateBackContent('title', 'Dessert & Cocktail Menu');
    expect(component.config().backPanel.title).toBe('Dessert & Cocktail Menu');
    expect(component.effectiveBackPanel().title).toBe('Dessert & Cocktail Menu');
    expect(component.config().frontPanel.title).not.toBe('Dessert & Cocktail Menu');
  });

  it('should update color theme and font family', () => {
    component.setTheme('elegant-navy');
    expect(component.config().theme.id).toBe('elegant-navy');

    component.setFontFamily('times');
    expect(component.config().fontFamily).toBe('times');
  });

  it('should toggle guide lines, cut marks, table badge, and QR code', () => {
    component.toggleFoldLines();
    expect(component.config().showFoldLines).toBe(false);

    component.toggleCutMarks();
    expect(component.config().showCutMarks).toBe(false);

    component.toggleTableNumberBadge();
    expect(component.config().showTableNumberBadge).toBe(false);

    component.toggleQrCode();
    expect(component.config().includeQrCode).toBe(false);
  });

  it('should download PDF, revoke object URL, and show confirmation modal', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadPdf();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:https://privknife.com/mock-table-tent-pdf');
    expect(component.showDownloadModal()).toBe(true);

    component.closeDownloadModal();
    expect(component.showDownloadModal()).toBe(false);
  });

  it('should reset configuration to default settings', () => {
    component.applyPreset('hotel-wifi');
    component.setPaperFormat('letter');

    component.resetToDefaults();

    expect(component.config().paperFormat).toBe('a4');
    expect(component.config().foldType).toBe('bi-fold');
    expect(component.config().frontPanel.title).toBe('Scan for Digital Menu');
  });

  it('should execute processing with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await component.downloadPdf();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
