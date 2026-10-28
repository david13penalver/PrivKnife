import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CsvVectorChartBuilderComponent } from './csv-vector-chart-builder.component';

describe('CsvVectorChartBuilderComponent', () => {
  let component: CsvVectorChartBuilderComponent;
  let fixture: ComponentFixture<CsvVectorChartBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CsvVectorChartBuilderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CsvVectorChartBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the privacy indicator badge', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('100% In-Browser');
    expect(el.textContent).toContain('Never Leaves Your Device');
  });

  it('should load preset sample datasets', () => {
    component.loadSampleData('market_share');
    fixture.detectChanges();

    expect(component.chartData().categories).toContain('Chrome');
    expect(component.options().chartType).toBe('donut_pie');

    component.loadSampleData('revenue');
    fixture.detectChanges();
    expect(component.chartData().categories).toContain('Q1');
  });

  it('should update chart type, palette, and aspect ratio reactively', () => {
    component.updateChartType('smooth_line');
    expect(component.options().chartType).toBe('smooth_line');

    component.updatePalette('emerald_growth');
    expect(component.options().colorPalette).toBe('emerald_growth');

    component.updateAspectRatio('1:1');
    expect(component.options().aspectRatio).toBe('1:1');
  });

  it('should toggle legend, labels, and gridlines', () => {
    component.toggleOption('showGridLines');
    expect(component.options().showGridLines).toBe(false);

    component.toggleOption('showDataLabels');
    expect(component.options().showDataLabels).toBe(false);
  });

  it('should update raw CSV input and re-parse data', () => {
    const customCsv = `Region,Sales\nNorth,500\nSouth,750`;
    component.onCsvTextChange(customCsv);
    fixture.detectChanges();

    expect(component.chartData().categories).toEqual(['North', 'South']);
    expect(component.chartData().series[0].values).toEqual([500, 750]);
  });

  it('should trigger SVG download and revoke Object URL', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-chart-svg');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.downloadSvg();

    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-chart-svg');
  });

  it('should trigger PNG download and revoke Object URL', async () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-chart-png');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await component.downloadPng();

    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-chart-png');
  });

  it('should trigger PDF download and revoke Object URL', async () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-chart-pdf');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await component.downloadPdf();

    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-chart-pdf');
  });

  it('should revoke active object URLs in ngOnDestroy', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-chart-url');

    component.downloadSvg();
    component.ngOnDestroy();

    expect(revokeSpy).toHaveBeenCalled();
  });

  // DEFECT-60-01: DOM Security & Sanitization
  it('should sanitize SVG to prevent DOM XSS injection via malicious CSV', () => {
    const maliciousCsv = `Category,Val\nTest</text><img src=x onerror="window.__xss60=true"><text>,100`;
    component.onCsvTextChange(maliciousCsv);
    fixture.detectChanges();

    const hostEl: HTMLElement = fixture.nativeElement;
    const previewEl = hostEl.querySelector('.c-chart-builder__preview-stage');
    expect(previewEl).toBeTruthy();

    const injectedImg = previewEl?.querySelector('img');
    expect(injectedImg).toBeNull();
    expect(previewEl?.querySelectorAll('img').length).toBe(0);

    const rawHtml = previewEl?.innerHTML || '';
    expect(rawHtml).toContain('&lt;img');
    expect((window as unknown as { __xss60?: boolean }).__xss60).toBeUndefined();
  });

  // DEFECT-60-04: BEM layout, area separation & controls
  it('should adhere to BEM structure with l-extremo area separation in headers', () => {
    const hostEl: HTMLElement = fixture.nativeElement;
    const previewHeader = hostEl.querySelector('.c-chart-builder__preview-card .c-card__header');
    expect(previewHeader).toBeTruthy();

    const leftArea = previewHeader?.querySelector('.l-extremo__area-izquierda');
    const rightArea = previewHeader?.querySelector('.l-extremo__area-derecha');
    expect(leftArea).toBeTruthy();
    expect(rightArea).toBeTruthy();

    const previewStage = hostEl.querySelector('.c-chart-builder__preview-stage');
    expect(previewStage).toBeTruthy();
  });

  // Prime Directive: Zero Network Exfiltration
  it('should never make any network calls during CSV parsing, SVG rendering, and downloads', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(window, 'XMLHttpRequest');

    component.onCsvTextChange('Region,Units\nWest,300\nEast,450');
    fixture.detectChanges();
    await fixture.whenStable();

    component.downloadSvg();
    await component.downloadPng();
    await component.downloadPdf();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
