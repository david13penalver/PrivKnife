import { describe, it, expect } from 'vitest';
import {
  parseCsvToChartData,
  getColorPaletteValues,
  formatChartValue,
  getChartDimensions,
  generateChartSvg,
  generateChartPdf,
  generateChartPngBlob,
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

  it('should generate valid vector SVG for stacked area chart', () => {
    const data = parseCsvToChartData(SAMPLE_TRAFFIC_CSV);
    const svg = generateChartSvg(data, {
      ...DEFAULT_CHART_OPTIONS,
      chartType: 'stacked_area',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('id="areas"');
  });

  it('should generate valid vector SVG for donut / pie chart', () => {
    const data = parseCsvToChartData(SAMPLE_MARKET_SHARE_CSV);
    const svg = generateChartSvg(data, {
      ...DEFAULT_CHART_OPTIONS,
      chartType: 'donut_pie',
      valueFormat: 'percentage',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('id="donut"');
    expect(svg).toContain('Chrome');
    expect(svg).toContain('Safari');
  });

  it('should generate presentation-ready PDF blob via jsPDF', async () => {
    const data = parseCsvToChartData(SAMPLE_REVENUE_CSV);
    const blob = await generateChartPdf(data, DEFAULT_CHART_OPTIONS);

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toBe('application/pdf');
  });

  it('should generate high-res PNG blob from SVG', async () => {
    const data = parseCsvToChartData(SAMPLE_REVENUE_CSV);
    const svg = generateChartSvg(data, DEFAULT_CHART_OPTIONS);
    const blob = await generateChartPngBlob(svg, 300);

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(50);
    expect(blob.type).toBe('image/png');
  });
});
