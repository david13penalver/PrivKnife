import { describe, it, expect } from 'vitest';
import {
  parseCsvToChartData,
  getColorPaletteValues,
  formatChartValue,
  getChartDimensions,
  generateChartSvg,
  generateChartPdf,
  generateChartPngBlob,
  escapeXml,
} from './engine';
import {
  DEFAULT_CHART_OPTIONS,
  SAMPLE_REVENUE_CSV,
  SAMPLE_MARKET_SHARE_CSV,
  SAMPLE_TRAFFIC_CSV,
} from './test-fixtures';

describe('CsvVectorChartBuilder Engine', () => {
  it('should parse tabular CSV text into categories and series data', () => {
    const data = parseCsvToChartData(SAMPLE_REVENUE_CSV);
    expect(data.categories).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(data.series.length).toBe(2);
    expect(data.series[0].name).toBe('2024 Actual');
    expect(data.series[0].values).toEqual([120000, 145000, 180000, 220000]);
    expect(data.series[1].name).toBe('2025 Projected');
    expect(data.series[1].values).toEqual([165000, 190000, 240000, 310000]);
    expect(data.minValue).toBe(120000);
    expect(data.maxValue).toBe(310000);
  });

  it('should handle single-series percentage data for donut/pie charts', () => {
    const data = parseCsvToChartData(SAMPLE_MARKET_SHARE_CSV);
    expect(data.categories).toEqual(['Chrome', 'Safari', 'Edge', 'Firefox', 'Other']);
    expect(data.series.length).toBe(1);
    expect(data.series[0].values[0]).toBeCloseTo(65.2, 1);
  });

  it('should format values according to currency, percentage, and number formats', () => {
    expect(formatChartValue(150000, 'currency')).toBe('$150,000');
    expect(formatChartValue(65.2, 'percentage')).toBe('65.2%');
    expect(formatChartValue(4500, 'number')).toBe('4,500');
  });

  it('should return color palette arrays with at least 5 colors', () => {
    const electric = getColorPaletteValues('electric_indigo');
    const emerald = getColorPaletteValues('emerald_growth');
    const corporate = getColorPaletteValues('corporate_slate');

    expect(electric.length).toBeGreaterThanOrEqual(5);
    expect(emerald.length).toBeGreaterThanOrEqual(5);
    expect(corporate.length).toBeGreaterThanOrEqual(5);
    expect(electric[0]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should return correct pixel dimensions for aspect ratios', () => {
    const r169 = getChartDimensions('16:9');
    expect(r169.width).toBe(960);
    expect(r169.height).toBe(540);

    const r11 = getChartDimensions('1:1');
    expect(r11.width).toBe(700);
    expect(r11.height).toBe(700);

    const r43 = getChartDimensions('4:3');
    expect(r43.width).toBe(800);
    expect(r43.height).toBe(600);
  });

  it('should escape XML entities properly with escapeXml', () => {
    expect(escapeXml('<script>alert("xss & \'fun\'")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss &amp; &apos;fun&apos;&quot;)&lt;/script&gt;'
    );
  });

  // DEFECT-60-01: Escaping in generateChartSvg
  it('should escape XML special characters in titles, categories, and series names', () => {
    const customData = {
      categories: ['R&D', 'Sales <East>'],
      series: [{ name: 'Projected & Actual "Total"', values: [100, 200] }],
      minValue: 100,
      maxValue: 200,
    };
    const svg = generateChartSvg(customData, {
      ...DEFAULT_CHART_OPTIONS,
      chartTitle: 'Title & Analysis <2024>',
      chartSubtitle: 'Notes "Draft" & Review',
    });

    expect(svg).toContain('Title &amp; Analysis &lt;2024&gt;');
    expect(svg).toContain('Notes &quot;Draft&quot; &amp; Review');
    expect(svg).toContain('R&amp;D');
    expect(svg).toContain('Sales &lt;East&gt;');
    expect(svg).toContain('Projected &amp; Actual &quot;Total&quot;');
  });

  it('should generate valid vector SVG for vertical bar chart', () => {
    const data = parseCsvToChartData(SAMPLE_REVENUE_CSV);
    const svg = generateChartSvg(data, {
      ...DEFAULT_CHART_OPTIONS,
      chartType: 'vertical_bar',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('Quarterly Revenue Performance');
    expect(svg).toContain('2024 Actual');
    expect(svg).toContain('2025 Projected');
    expect(svg).toContain('id="bars"');
    expect(svg).toContain('</svg>');
  });

  it('should generate valid vector SVG for horizontal bar chart', () => {
    const data = parseCsvToChartData(SAMPLE_REVENUE_CSV);
    const svg = generateChartSvg(data, {
      ...DEFAULT_CHART_OPTIONS,
      chartType: 'horizontal_bar',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('id="horizontal-bars"');
    expect(svg).toContain('Q1');
  });

  it('should generate valid vector SVG for smooth line chart', () => {
    const data = parseCsvToChartData(SAMPLE_TRAFFIC_CSV);
    const svg = generateChartSvg(data, {
      ...DEFAULT_CHART_OPTIONS,
      chartType: 'smooth_line',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('id="lines"');
    expect(svg).toContain('<path');
  });

  // DEFECT-60-03: Stacked area cumulative math
  it('should generate valid vector SVG for stacked area chart with cumulative polygons', () => {
    const data = parseCsvToChartData(SAMPLE_TRAFFIC_CSV);
    const svg = generateChartSvg(data, {
      ...DEFAULT_CHART_OPTIONS,
      chartType: 'stacked_area',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('id="areas"');
    expect(svg).toContain('<path');
    expect(svg).toContain('fill-opacity="0.38"');
  });

  // DEFECT-60-03: Donut pie with single slice & valueFormat
  it('should generate non-degenerate arc for single 100% slice in donut chart', () => {
    const singleData = {
      categories: ['Monopoly'],
      series: [{ name: 'Market', values: [100] }],
      minValue: 100,
      maxValue: 100,
    };
    const svg = generateChartSvg(singleData, {
      ...DEFAULT_CHART_OPTIONS,
      chartType: 'donut_pie',
      valueFormat: 'currency',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('id="donut"');
    expect(svg).toContain('Monopoly');
    expect(svg).toContain('$100');
  });

  // DEFECT-60-02: Multi-chart PDF generation
  it('should generate valid PDF blobs for all chart types', async () => {
    const data = parseCsvToChartData(SAMPLE_REVENUE_CSV);
    const chartTypes = [
      'vertical_bar',
      'horizontal_bar',
      'smooth_line',
      'stacked_area',
      'donut_pie',
    ] as const;

    for (const chartType of chartTypes) {
      const blob = await generateChartPdf(data, {
        ...DEFAULT_CHART_OPTIONS,
        chartType,
      });

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(1000);
      expect(blob.type).toBe('application/pdf');
    }
  });

  // DEFECT-60-03: Aspect-ratio preserving PNG generation
  it('should generate PNG blob preserving aspect ratio dimensions', async () => {
    const data = parseCsvToChartData(SAMPLE_REVENUE_CSV);
    const svg11 = generateChartSvg(data, {
      ...DEFAULT_CHART_OPTIONS,
      aspectRatio: '1:1',
    });
    const blob11 = await generateChartPngBlob(svg11, 300);

    expect(blob11).toBeDefined();
    expect(blob11.size).toBeGreaterThan(50);
    expect(blob11.type).toBe('image/png');
  });
});
