import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  AspectRatio,
  ChartType,
  ColorPalette,
  CsvVectorChartBuilderOptions,
  ParsedChartData,
  ValueFormat,
} from './types';
import {
  DEFAULT_CHART_OPTIONS,
  SAMPLE_MARKET_SHARE_CSV,
  SAMPLE_REVENUE_CSV,
  SAMPLE_TRAFFIC_CSV,
} from './test-fixtures';
import {
  generateChartPdf,
  generateChartPngBlob,
  generateChartSvg,
  parseCsvToChartData,
} from './engine';

@Component({
  selector: 'app-csv-vector-chart-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">CSV / Paste to Vector Chart &amp; Infographic Builder</h1>
          <p class="c-header__subtitle">
            Convert copied spreadsheet tables or CSV files into publication-grade vector charts (bar, line, stacked area, donut)
            with designer color palettes, custom labels, and instant SVG/PNG/PDF downloads.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <!-- Main Layout -->
      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Data Input &amp; Chart Configuration</h2>
          </div>

          <div class="c-card__body">
            <!-- Sample Data Presets -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Sample Datasets</label>
              <div class="l-extremo g--margin-top-1" style="gap: 8px; flex-wrap: wrap;">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activeSample() === 'revenue'"
                  [class.c-button--outline]="activeSample() !== 'revenue'"
                  (click)="loadSampleData('revenue')"
                >
                  Quarterly Revenue
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activeSample() === 'market_share'"
                  [class.c-button--outline]="activeSample() !== 'market_share'"
                  (click)="loadSampleData('market_share')"
                >
                  Market Share (Donut)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activeSample() === 'traffic'"
                  [class.c-button--outline]="activeSample() !== 'traffic'"
                  (click)="loadSampleData('traffic')"
                >
                  Website Traffic (Line)
                </button>
              </div>
            </div>

            <!-- CSV / Spreadsheet Paste Textarea -->
            <div class="g--margin-bottom-4">
              <div class="l-extremo" style="align-items: center; margin-bottom: 4px;">
                <label class="c-input__label" style="margin: 0;">CSV Data / Paste Spreadsheet</label>
                <label class="c-button c-button--outline c-button--small" style="font-size: 11px; padding: 2px 6px; cursor: pointer;">
                  Upload .csv
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    style="display: none;"
                    (change)="onCsvFileSelected($event)"
                  />
                </label>
              </div>
              <textarea
                class="c-input"
                rows="5"
                [ngModel]="rawCsvText()"
                (ngModelChange)="onCsvTextChange($event)"
                placeholder="Paste CSV rows or tab-separated spreadsheet cells here..."
                style="font-family: monospace; font-size: 11px; resize: vertical;"
              ></textarea>
            </div>

            <!-- Titles -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Chart Title</label>
              <input
                type="text"
                class="c-input"
                [ngModel]="options().chartTitle"
                (ngModelChange)="updateTitle($event)"
              />
            </div>

            <div class="g--margin-bottom-4">
              <label class="c-input__label">Chart Subtitle / Legend Note</label>
              <input
                type="text"
                class="c-input"
                [ngModel]="options().chartSubtitle"
                (ngModelChange)="updateSubtitle($event)"
              />
            </div>

            <!-- Chart Type & Palette -->
            <div class="l-columns l-columns--2 g--margin-bottom-4" style="gap: 12px;">
              <div class="l-columns__area">
                <label class="c-input__label">Chart Type</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="options().chartType"
                  (ngModelChange)="updateChartType($event)"
                >
                  <option value="vertical_bar">Vertical Bar (Columns)</option>
                  <option value="horizontal_bar">Horizontal Bar</option>
                  <option value="smooth_line">Smooth Line Curve</option>
                  <option value="stacked_area">Stacked Area</option>
                  <option value="donut_pie">Donut / Pie Chart</option>
                </select>
              </div>

              <div class="l-columns__area">
                <label class="c-input__label">Color Palette</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="options().colorPalette"
                  (ngModelChange)="updatePalette($event)"
                >
                  <option value="electric_indigo">Electric Indigo &amp; Violet</option>
                  <option value="emerald_growth">Emerald Growth</option>
                  <option value="sunset_gradient">Sunset Gradient</option>
                  <option value="corporate_slate">Corporate Slate</option>
                  <option value="monochrome">Monochrome Minimal</option>
                </select>
              </div>
            </div>

            <!-- Aspect Ratio & Value Format -->
            <div class="l-columns l-columns--2 g--margin-bottom-4" style="gap: 12px;">
              <div class="l-columns__area">
                <label class="c-input__label">Canvas Aspect Ratio</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="options().aspectRatio"
                  (ngModelChange)="updateAspectRatio($event)"
                >
                  <option value="16:9">16:9 Widescreen (960×540)</option>
                  <option value="4:3">4:3 Standard (800×600)</option>
                  <option value="1:1">1:1 Square (700×700)</option>
                </select>
              </div>

              <div class="l-columns__area">
                <label class="c-input__label">Value Formatting</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="options().valueFormat"
                  (ngModelChange)="updateValueFormat($event)"
                >
                  <option value="currency">Currency ($150,000)</option>
                  <option value="percentage">Percentage (65.2%)</option>
                  <option value="number">Standard Number (150,000)</option>
                </select>
              </div>
            </div>

            <!-- Toggles -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Display Elements</label>
              <div class="l-extremo g--margin-top-1" style="gap: 12px; flex-wrap: wrap;">
                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().showLegend"
                    (change)="toggleOption('showLegend')"
                  />
                  <span>Legend</span>
                </label>
                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().showDataLabels"
                    (change)="toggleOption('showDataLabels')"
                  />
                  <span>Data Labels</span>
                </label>
                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().showGridLines"
                    (change)="toggleOption('showGridLines')"
                  />
                  <span>Gridlines</span>
                </label>
              </div>
            </div>
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="resetToDefaults()"
              >
                Reset to Defaults
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="copySvgCode()"
              >
                {{ copiedFeedback() ? '✓ SVG Copied!' : 'Copy SVG Code' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Preview Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header l-extremo" style="align-items: center;">
            <h2 class="c-card__title">Real-Time Vector Preview</h2>
            <div style="font-size: 11px; opacity: 0.8;">
              {{ chartData().categories.length }} Categories • {{ chartData().series.length }} Series
            </div>
          </div>

          <div class="c-card__body">
            <!-- Scaled SVG Viewport -->
            <div
              class="c-preview"
              style="min-height: 440px; display: flex; align-items: center; justify-content: center; overflow: auto; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;"
            >
              <div
                [innerHTML]="sanitizedSvg()"
                style="width: 100%; max-height: 520px; display: flex; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.06);"
              ></div>
            </div>
          </div>

          <!-- Download Action Bar -->
          <div class="c-card__footer l-extremo" style="gap: 8px; flex-wrap: wrap;">
            <div class="l-extremo__area-izquierda" style="display: flex; gap: 8px;">
              <button
                type="button"
                class="c-button c-button--secondary"
                (click)="downloadSvg()"
              >
                Download Vector SVG
              </button>
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="downloadPng()"
              >
                Download 300 DPI PNG
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                (click)="downloadPdf()"
              >
                Download Executive PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CsvVectorChartBuilderComponent implements OnDestroy {
  readonly options = signal<CsvVectorChartBuilderOptions>(
    JSON.parse(JSON.stringify(DEFAULT_CHART_OPTIONS))
  );

  readonly activeSample = signal<'revenue' | 'market_share' | 'traffic'>('revenue');
  readonly rawCsvText = signal<string>(SAMPLE_REVENUE_CSV);
  readonly copiedFeedback = signal<boolean>(false);

  readonly chartData = computed<ParsedChartData>(() => {
    return parseCsvToChartData(this.rawCsvText());
  });

  readonly svgPreview = computed<string>(() => {
    return generateChartSvg(this.chartData(), this.options());
  });

  readonly sanitizedSvg = computed<SafeHtml>(() => {
    return this.sanitizer.bypassSecurityTrustHtml(this.svgPreview());
  });

  private readonly activeObjectUrls: string[] = [];

  constructor(private readonly sanitizer: DomSanitizer) {}

  loadSampleData(sample: 'revenue' | 'market_share' | 'traffic'): void {
    this.activeSample.set(sample);
    if (sample === 'market_share') {
      this.rawCsvText.set(SAMPLE_MARKET_SHARE_CSV);
      this.options.update((o) => ({
        ...o,
        chartType: 'donut_pie',
        chartTitle: 'Global Browser Market Share',
        chartSubtitle: 'Desktop & Mobile Distribution',
        valueFormat: 'percentage',
      }));
    } else if (sample === 'traffic') {
      this.rawCsvText.set(SAMPLE_TRAFFIC_CSV);
      this.options.update((o) => ({
        ...o,
        chartType: 'smooth_line',
        chartTitle: 'Monthly Visitor Growth & Signups',
        chartSubtitle: 'H1 SaaS Traffic Trajectory',
        valueFormat: 'number',
      }));
    } else {
      this.rawCsvText.set(SAMPLE_REVENUE_CSV);
      this.options.update((o) => ({
        ...o,
        chartType: 'vertical_bar',
        chartTitle: 'Quarterly Revenue Performance ($)',
        chartSubtitle: 'Comparative analysis of 2024 Actual vs 2025 Projected',
        valueFormat: 'currency',
      }));
    }
  }

  onCsvTextChange(text: string): void {
    this.rawCsvText.set(text);
  }

  updateTitle(title: string): void {
    this.options.update((o) => ({ ...o, chartTitle: title }));
  }

  updateSubtitle(subtitle: string): void {
    this.options.update((o) => ({ ...o, chartSubtitle: subtitle }));
  }

  updateChartType(type: ChartType): void {
    this.options.update((o) => ({ ...o, chartType: type }));
  }

  updatePalette(palette: ColorPalette): void {
    this.options.update((o) => ({ ...o, colorPalette: palette }));
  }

  updateAspectRatio(ratio: AspectRatio): void {
    this.options.update((o) => ({ ...o, aspectRatio: ratio }));
  }

  updateValueFormat(format: ValueFormat): void {
    this.options.update((o) => ({ ...o, valueFormat: format }));
  }

  toggleOption(key: 'showLegend' | 'showDataLabels' | 'showGridLines'): void {
    this.options.update((o) => ({ ...o, [key]: !o[key] }));
  }

  resetToDefaults(): void {
    this.loadSampleData('revenue');
    this.options.set(JSON.parse(JSON.stringify(DEFAULT_CHART_OPTIONS)));
  }

  async copySvgCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.svgPreview());
      this.copiedFeedback.set(true);
      setTimeout(() => this.copiedFeedback.set(false), 2000);
    } catch {
      // ignore
    }
  }

  downloadSvg(): void {
    const svgStr = this.svgPreview();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    this.triggerDownload(blob, `${this.getSanitizedFileName()}.svg`);
  }

  async downloadPng(): Promise<void> {
    const blob = await generateChartPngBlob(this.svgPreview(), this.options().exportDpi);
    this.triggerDownload(blob, `${this.getSanitizedFileName()}.png`);
  }

  async downloadPdf(): Promise<void> {
    const blob = await generateChartPdf(this.chartData(), this.options());
    this.triggerDownload(blob, `${this.getSanitizedFileName()}.pdf`);
  }

  async onCsvFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const text = await file.text();
      this.rawCsvText.set(text);
    } catch (err) {
      console.error('Failed to read CSV file:', err);
    } finally {
      input.value = '';
    }
  }

  private getSanitizedFileName(): string {
    const title = this.options().chartTitle || 'vector-chart';
    return title
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-');
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    this.activeObjectUrls.push(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Immediate cleanup as per Directive 4
    URL.revokeObjectURL(url);
    const idx = this.activeObjectUrls.indexOf(url);
    if (idx !== -1) {
      this.activeObjectUrls.splice(idx, 1);
    }
  }

  ngOnDestroy(): void {
    for (const url of this.activeObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeObjectUrls.length = 0;
  }
}
