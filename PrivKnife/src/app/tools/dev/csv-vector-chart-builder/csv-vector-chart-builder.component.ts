import { TranslatePipe } from '../../../core/i18n';
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
import DOMPurify from 'dompurify';
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
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './csv-vector-chart-builder.component.html',
  styleUrls: ['./csv-vector-chart-builder.component.scss'],
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
    const cleanSvg = DOMPurify.sanitize(this.svgPreview(), {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    return this.sanitizer.bypassSecurityTrustHtml(cleanSvg);
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
