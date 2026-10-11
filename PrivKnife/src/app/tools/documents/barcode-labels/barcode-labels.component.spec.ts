import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarcodeLabelsComponent } from './barcode-labels.component';
import { AVERY_5163 } from './test-fixtures';

describe('BarcodeLabelsComponent (Seam 2: UI, Signals, Layout & Privacy Boundary)', () => {
  let fixture: ComponentFixture<BarcodeLabelsComponent>;
  let component: BarcodeLabelsComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:https://privknife.com/mock-barcode-label-pdf');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [BarcodeLabelsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BarcodeLabelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default Avery 5160 template and Code128 symbology', () => {
    expect(component).toBeTruthy();
    expect(component.selectedTemplate().id).toBe('avery-5160');
    expect(component.config().symbology).toBe('CODE128');
    expect(component.config().dataMode).toBe('single');
    expect(component.positions().length).toBe(30);
  });

  it('should update template preset reactively', () => {
    component.selectTemplate(AVERY_5163.id);
    expect(component.selectedTemplate().id).toBe('avery-5163');
    expect(component.positions().length).toBe(10);
  });

  it('should update symbology reactively', () => {
    component.setSymbology('QR');
    expect(component.config().symbology).toBe('QR');

    component.setSymbology('EAN13');
    expect(component.config().symbology).toBe('EAN13');
  });

  it('should update single label data fields', () => {
    component.updateSingleItem('value', 'NEW-BARCODE-99');
    component.updateSingleItem('title', 'Special Gizmo');
    component.updateSingleItem('subtext', '$99.00 - Clearance');

    expect(component.config().singleItem.value).toBe('NEW-BARCODE-99');
    expect(component.config().singleItem.title).toBe('Special Gizmo');
    expect(component.config().singleItem.subtext).toBe('$99.00 - Clearance');
  });

  it('should update starting offset index', () => {
    component.setStartOffsetIndex(5);
    expect(component.config().startOffsetIndex).toBe(5);
  });

  it('should switch data modes and generate sequence items', () => {
    component.setDataMode('sequence');
    expect(component.config().dataMode).toBe('sequence');

    component.updateSequenceConfig({
      prefix: 'BATCH-',
      startNumber: 50,
      count: 20,
      digits: 3,
      suffix: '-X',
    });

    const items = component.computedItems();
    expect(items.length).toBeGreaterThanOrEqual(10);
    expect(items[0].value).toBe('BATCH-050-X');
    expect(items[1].value).toBe('BATCH-051-X');
  });

  it('should parse CSV input when switching to CSV mode', () => {
    component.setDataMode('csv');
    const testCsv = 'Product,Barcode,Price\nWidget A,SKU-A-100,$10\nWidget B,SKU-B-200,$20';
    component.setCsvText(testCsv);

    const items = component.computedItems();
    expect(items.length).toBe(2);
    expect(items[0].title).toBe('Widget A');
    expect(items[0].value).toBe('SKU-A-100');
    expect(items[0].subtext).toBe('$10');
  });

  it('should load sample CSV data when clicking load sample', () => {
    component.setDataMode('csv');
    component.loadSampleCsv();

    const items = component.computedItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it('should handle CSV file upload via dropzone', async () => {
    component.setDataMode('csv');
    const file = new File(['Item 1,CODE-111,Cat A\nItem 2,CODE-222,Cat B'], 'items.csv', {
      type: 'text/csv',
    });

    await component.onFilesSelected([file]);
    expect(component.computedItems().length).toBe(2);
    expect(component.csvFileName()).toBe('items.csv');
  });

  it('should toggle guideline borders and human-readable text', () => {
    component.toggleGuideLines();
    expect(component.config().showGuideLines).toBe(false);

    component.toggleHumanReadable();
    expect(component.config().showHumanReadableBarcode).toBe(false);
  });

  it('should download PDF, revoke object URL, and show confirmation modal', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadPdf();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:https://privknife.com/mock-barcode-label-pdf');
    expect(component.showDownloadModal()).toBe(true);

    component.closeDownloadModal();
    expect(component.showDownloadModal()).toBe(false);
  });

  it('should reset configuration to default settings', () => {
    component.selectTemplate(AVERY_5163.id);
    component.setSymbology('QR');
    component.setStartOffsetIndex(7);

    component.resetToDefaults();

    expect(component.selectedTemplate().id).toBe('avery-5160');
    expect(component.config().symbology).toBe('CODE128');
    expect(component.config().startOffsetIndex).toBe(0);
  });

  it('should execute processing with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await component.downloadPdf();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
