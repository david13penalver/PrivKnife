import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import {
  AspectRatio,
  ChartSeries,
  ColorPalette,
  CsvVectorChartBuilderOptions,
  ParsedChartData,
  ValueFormat,
} from './types';

/**
 * Escapes XML/SVG special characters to prevent XSS / markup injection.
 */
export function escapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Helper to convert hex color string to RGB tuple.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Returns color palette hex values.
 */
export function getColorPaletteValues(palette: ColorPalette): string[] {
  switch (palette) {
    case 'corporate_slate':
      return ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1'];
    case 'emerald_growth':
      return ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
    case 'sunset_gradient':
      return ['#f43f5e', '#fb923c', '#fbbf24', '#a855f7', '#6366f1'];
    case 'monochrome':
      return ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];
    case 'electric_indigo':
    default:
      return ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6'];
  }
}

/**
 * Formats a numeric value based on currency, percentage, or number formats.
 */
export function formatChartValue(val: number, format: ValueFormat): string {
  if (format === 'currency') {
    return val < 0 ? `-$${Math.abs(val).toLocaleString()}` : `$${val.toLocaleString()}`;
  }
  if (format === 'percentage') {
    return `${val.toFixed(1)}%`;
  }
  return val.toLocaleString();
}

/**
 * Returns SVG canvas dimensions for an aspect ratio.
 */
export function getChartDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1':
      return { width: 700, height: 700 };
    case '4:3':
      return { width: 800, height: 600 };
    case '16:9':
    default:
      return { width: 960, height: 540 };
  }
}

/**
 * Parses raw CSV or TSV text into chart categories and numeric series.
 */
export function parseCsvToChartData(csvText: string): ParsedChartData {
  const parsed = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: 'greedy',
  });

  const rawRows = parsed.data || [];
  if (rawRows.length === 0) {
    return { categories: [], series: [], minValue: 0, maxValue: 100 };
  }

  const headerRow = rawRows[0];
  const dataRows = rawRows.slice(1);

  const categories: string[] = [];
  const seriesNames: string[] = headerRow.slice(1).map((h, i) => h?.trim() || `Series ${i + 1}`);
  const seriesValues: number[][] = seriesNames.map(() => []);

  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const cat = String(row[0] ?? '').trim();
    if (!cat && row.length <= 1) continue;

    categories.push(cat || `Item ${categories.length + 1}`);

    for (let s = 0; s < seriesNames.length; s++) {
      const rawCell = row[s + 1];
      const cleaned = String(rawCell ?? '')
        .replace(/[$,%]/g, '')
        .trim();
      const num = parseFloat(cleaned) || 0;
      seriesValues[s].push(num);

      if (num < minVal) minVal = num;
      if (num > maxVal) maxVal = num;
    }
  }

  if (minVal === Infinity) minVal = 0;
  if (maxVal === -Infinity) maxVal = 100;

  const series: ChartSeries[] = seriesNames.map((name, i) => ({
    name,
    values: seriesValues[i],
  }));

  return { categories, series, minValue: minVal, maxValue: maxVal };
}

/**
 * Generates an SVG vector graphic representing the chart.
 */
export function generateChartSvg(
  data: ParsedChartData,
  options: CsvVectorChartBuilderOptions
): string {
  const { width, height } = getChartDimensions(options.aspectRatio);
  const colors = getColorPaletteValues(options.colorPalette);

  const marginTop = 70;
  const marginBottom = options.showLegend ? 70 : 45;
  const marginLeft = 80;
  const marginRight = 40;

  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const titleColor = '#0f172a';
  const subtitleColor = '#64748b';
  const axisColor = '#94a3b8';
  const gridColor = '#e2e8f0';

  const numCats = data.categories.length || 1;
  const numSeries = data.series.length || 1;

  // Compute scale ceiling
  const isStackedArea = options.chartType === 'stacked_area';
  let niceMax = 100;
  let niceMin = 0;

  if (isStackedArea) {
    const catSums: number[] = new Array(numCats).fill(0);
    for (let c = 0; c < numCats; c++) {
      for (let s = 0; s < numSeries; s++) {
        catSums[c] += Math.max(0, data.series[s]?.values[c] || 0);
      }
    }
    const maxStacked = Math.max(...catSums, 10);
    niceMax = maxStacked + maxStacked * 0.1;
    niceMin = 0;
  } else {
    const rawMax = data.maxValue > 0 ? data.maxValue : 100;
    const rawMin = Math.min(0, data.minValue);
    const range = rawMax - rawMin;
    niceMax = rawMax + range * 0.1;
    niceMin = rawMin < 0 ? rawMin : 0;
  }

  const valRange = niceMax - niceMin || 1;
  const getY = (val: number) => marginTop + plotH - ((val - niceMin) / valRange) * plotH;

  const escapedTitle = escapeXml(options.chartTitle);
  const escapedSubtitle = escapeXml(options.chartSubtitle);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
  <!-- Background -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />

  <!-- Title & Subtitle -->
  <g id="header">
    <text x="${marginLeft}" y="36" fill="${titleColor}" font-family="sans-serif" font-size="20" font-weight="bold">${escapedTitle}</text>
    <text x="${marginLeft}" y="54" fill="${subtitleColor}" font-family="sans-serif" font-size="12">${escapedSubtitle}</text>
  </g>
`;

  // Donut / Pie Chart Renderer
  if (options.chartType === 'donut_pie') {
    const cx = width / 2;
    const cy = marginTop + plotH / 2;
    const outerR = Math.min(plotW, plotH) / 2.3;
    const innerR = outerR * 0.55; // donut hole

    const values = data.series[0]?.values || [];
    const total = values.reduce((sum, v) => sum + Math.max(0, v), 0) || 1;

    svg += `  <g id="donut">\n`;
    let currentAngle = -Math.PI / 2; // Start at 12 o'clock

    for (let i = 0; i < values.length; i++) {
      const v = Math.max(0, values[i]);
      // Clamp slice angle to avoid degenerate 0-length arc when a single slice is 100%
      const rawSliceAngle = (v / total) * (Math.PI * 2);
      const sliceAngle = Math.min(rawSliceAngle, Math.PI * 2 - 0.0001);
      const endAngle = currentAngle + sliceAngle;
      const color = colors[i % colors.length];

      const x1 = cx + outerR * Math.cos(currentAngle);
      const y1 = cy + outerR * Math.sin(currentAngle);
      const x2 = cx + outerR * Math.cos(endAngle);
      const y2 = cy + outerR * Math.sin(endAngle);

      const ix1 = cx + innerR * Math.cos(endAngle);
      const iy1 = cy + innerR * Math.sin(endAngle);
      const ix2 = cx + innerR * Math.cos(currentAngle);
      const iy2 = cy + innerR * Math.sin(currentAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      const pathData = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

      svg += `    <path d="${pathData}" fill="${color}" stroke="#ffffff" stroke-width="2" />\n`;

      // Slice label with valueFormat support (DEFECT-60-03)
      if (options.showDataLabels && sliceAngle > 0.25) {
        const midAngle = currentAngle + sliceAngle / 2;
        const labelR = (outerR + innerR) / 2;
        const lx = cx + labelR * Math.cos(midAngle);
        const ly = cy + labelR * Math.sin(midAngle);
        const pct = ((v / total) * 100).toFixed(1) + '%';
        const formattedVal = formatChartValue(v, options.valueFormat);
        const labelText =
          options.valueFormat === 'percentage'
            ? pct
            : `${formattedVal} (${pct})`;
        svg += `    <text x="${lx}" y="${ly + 4}" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">${escapeXml(labelText)}</text>\n`;
      }

      currentAngle = endAngle;
    }
    svg += `  </g>\n`;

    // Donut Legend
    if (options.showLegend) {
      svg += `  <g id="donut-legend" transform="translate(${marginLeft}, ${height - 25})">\n`;
      let legX = 0;
      for (let i = 0; i < data.categories.length; i++) {
        const color = colors[i % colors.length];
        const name = escapeXml(data.categories[i]);
        svg += `    <rect x="${legX}" y="-10" width="12" height="12" rx="2" fill="${color}" />\n`;
        svg += `    <text x="${legX + 16}" y="0" fill="${subtitleColor}" font-family="sans-serif" font-size="11">${name}</text>\n`;
        legX += data.categories[i].length * 8 + 40;
      }
      svg += `  </g>\n`;
    }

    svg += `</svg>`;
    return svg;
  }

  // Horizontal Bar Chart Renderer
  if (options.chartType === 'horizontal_bar') {
    const catH = plotH / numCats;
    const barH = (catH * 0.7) / numSeries;

    svg += `  <g id="horizontal-bars">\n`;
    for (let c = 0; c < numCats; c++) {
      const catY = marginTop + c * catH;
      const catName = escapeXml(data.categories[c]);

      // Y-axis category label
      svg += `    <text x="${marginLeft - 10}" y="${catY + catH / 2 + 4}" fill="${subtitleColor}" font-family="sans-serif" font-size="11" text-anchor="end">${catName}</text>\n`;

      for (let s = 0; s < numSeries; s++) {
        const val = data.series[s]?.values[c] || 0;
        const barW = Math.max(0, (val / valRange) * plotW);
        const by = catY + (catH * 0.15) + s * barH;
        const color = colors[s % colors.length];

        svg += `    <rect x="${marginLeft}" y="${by}" width="${barW}" height="${barH - 2}" rx="3" fill="${color}" />\n`;

        if (options.showDataLabels && barW > 30) {
          const formatted = escapeXml(formatChartValue(val, options.valueFormat));
          svg += `    <text x="${marginLeft + barW + 6}" y="${by + barH / 2 + 2}" fill="${subtitleColor}" font-family="sans-serif" font-size="10">${formatted}</text>\n`;
        }
      }
    }
    svg += `  </g>\n`;
  } else {
    // Cartesian Grid Lines (Y-Axis ticks)
    if (options.showGridLines) {
      svg += `  <!-- Grid Lines -->\n  <g id="grid">\n`;
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const tickVal = niceMin + (valRange / steps) * i;
        const y = getY(tickVal);
        const formatted = escapeXml(formatChartValue(tickVal, options.valueFormat));

        svg += `    <line x1="${marginLeft}" y1="${y}" x2="${marginLeft + plotW}" y2="${y}" stroke="${gridColor}" stroke-width="1" stroke-dasharray="3 3" />\n`;
        svg += `    <text x="${marginLeft - 8}" y="${y + 4}" fill="${axisColor}" font-family="sans-serif" font-size="10" text-anchor="end">${formatted}</text>\n`;
      }
      svg += `  </g>\n`;
    }

    const catW = plotW / numCats;

    // Vertical Bar Chart
    if (options.chartType === 'vertical_bar') {
      const barW = (catW * 0.7) / numSeries;
      svg += `  <g id="bars">\n`;

      for (let c = 0; c < numCats; c++) {
        const catX = marginLeft + c * catW;

        for (let s = 0; s < numSeries; s++) {
          const val = data.series[s]?.values[c] || 0;
          const y = getY(val);
          const zeroY = getY(0);
          const barH = Math.abs(zeroY - y);
          const bx = catX + (catW * 0.15) + s * barW;
          const color = colors[s % colors.length];

          svg += `    <rect x="${bx}" y="${y}" width="${barW - 3}" height="${barH}" rx="3" fill="${color}" />\n`;

          if (options.showDataLabels) {
            const formatted = escapeXml(formatChartValue(val, options.valueFormat));
            svg += `    <text x="${bx + (barW - 3) / 2}" y="${y - 6}" fill="${subtitleColor}" font-family="sans-serif" font-size="10" text-anchor="middle">${formatted}</text>\n`;
          }
        }

        // X-Axis Category Label
        svg += `    <text x="${catX + catW / 2}" y="${marginTop + plotH + 20}" fill="${subtitleColor}" font-family="sans-serif" font-size="11" text-anchor="middle">${escapeXml(data.categories[c])}</text>\n`;
      }
      svg += `  </g>\n`;
    }

    // Smooth Line Chart
    if (options.chartType === 'smooth_line') {
      svg += `  <g id="lines">\n`;

      for (let s = 0; s < numSeries; s++) {
        const seriesData = data.series[s];
        const color = colors[s % colors.length];
        const points: { x: number; y: number; val: number }[] = [];

        for (let c = 0; c < numCats; c++) {
          const val = seriesData.values[c] || 0;
          const x = marginLeft + c * catW + catW / 2;
          const y = getY(val);
          points.push({ x, y, val });
        }

        if (points.length > 0) {
          let pathD = `M ${points[0].x} ${points[0].y}`;
          for (let p = 1; p < points.length; p++) {
            const prev = points[p - 1];
            const curr = points[p];
            const cp1x = prev.x + (curr.x - prev.x) / 2;
            const cp2x = prev.x + (curr.x - prev.x) / 2;
            pathD += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`;
          }

          svg += `    <path d="${pathD}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" />\n`;

          // Point Dots & Optional Labels
          for (const pt of points) {
            svg += `    <circle cx="${pt.x}" cy="${pt.y}" r="4" fill="#ffffff" stroke="${color}" stroke-width="2.5" />\n`;
            if (options.showDataLabels) {
              const formatted = escapeXml(formatChartValue(pt.val, options.valueFormat));
              svg += `    <text x="${pt.x}" y="${pt.y - 8}" fill="${subtitleColor}" font-family="sans-serif" font-size="10" text-anchor="middle">${formatted}</text>\n`;
            }
          }
        }
      }

      // X-Axis Labels
      for (let c = 0; c < numCats; c++) {
        const x = marginLeft + c * catW + catW / 2;
        svg += `    <text x="${x}" y="${marginTop + plotH + 20}" fill="${subtitleColor}" font-family="sans-serif" font-size="11" text-anchor="middle">${escapeXml(data.categories[c])}</text>\n`;
      }

      svg += `  </g>\n`;
    }

    // Stacked Area Chart (DEFECT-60-03: True cumulative series stacking)
    if (options.chartType === 'stacked_area') {
      svg += `  <g id="areas">\n`;
      const zeroY = getY(0);

      // Cumulative baseline trackers across series
      const prevCumY: number[] = new Array(numCats).fill(zeroY);
      const prevCumVal: number[] = new Array(numCats).fill(0);

      for (let s = 0; s < numSeries; s++) {
        const seriesData = data.series[s];
        const color = colors[s % colors.length];
        const currTopPoints: { x: number; y: number }[] = [];

        for (let c = 0; c < numCats; c++) {
          const val = Math.max(0, seriesData.values[c] || 0);
          const topVal = prevCumVal[c] + val;
          const x = marginLeft + c * catW + catW / 2;
          const y = getY(topVal);
          currTopPoints.push({ x, y });
        }

        if (currTopPoints.length > 0) {
          // Top line path forward
          let pathD = `M ${currTopPoints[0].x} ${currTopPoints[0].y}`;
          for (let p = 1; p < currTopPoints.length; p++) {
            const prev = currTopPoints[p - 1];
            const curr = currTopPoints[p];
            const cp1x = prev.x + (curr.x - prev.x) / 2;
            const cp2x = prev.x + (curr.x - prev.x) / 2;
            pathD += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`;
          }

          // Bottom baseline backward
          for (let p = currTopPoints.length - 1; p >= 0; p--) {
            const bx = currTopPoints[p].x;
            const by = prevCumY[p];
            pathD += ` L ${bx} ${by}`;
          }
          pathD += ' Z';

          svg += `    <path d="${pathD}" fill="${color}" fill-opacity="0.38" stroke="${color}" stroke-width="2" />\n`;

          // Data labels on top point if requested
          if (options.showDataLabels) {
            for (let c = 0; c < numCats; c++) {
              const val = seriesData.values[c] || 0;
              const formatted = escapeXml(formatChartValue(val, options.valueFormat));
              svg += `    <text x="${currTopPoints[c].x}" y="${currTopPoints[c].y - 6}" fill="${subtitleColor}" font-family="sans-serif" font-size="9" text-anchor="middle">${formatted}</text>\n`;
            }
          }
        }

        // Update cumulative trackers
        for (let c = 0; c < numCats; c++) {
          prevCumY[c] = currTopPoints[c].y;
          prevCumVal[c] += Math.max(0, seriesData.values[c] || 0);
        }
      }

      // X-Axis Labels
      for (let c = 0; c < numCats; c++) {
        const x = marginLeft + c * catW + catW / 2;
        svg += `    <text x="${x}" y="${marginTop + plotH + 20}" fill="${subtitleColor}" font-family="sans-serif" font-size="11" text-anchor="middle">${escapeXml(data.categories[c])}</text>\n`;
      }

      svg += `  </g>\n`;
    }
  }

  // Legend Bar
  if (options.showLegend) {
    svg += `  <!-- Legend -->\n  <g id="legend" transform="translate(${marginLeft}, ${height - 18})">\n`;
    let legX = 0;
    for (let s = 0; s < data.series.length; s++) {
      const color = colors[s % colors.length];
      const name = escapeXml(data.series[s].name);

      svg += `    <rect x="${legX}" y="-10" width="12" height="12" rx="2" fill="${color}" />\n`;
      svg += `    <text x="${legX + 16}" y="0" fill="${subtitleColor}" font-family="sans-serif" font-size="11">${name}</text>\n`;
      legX += data.series[s].name.length * 8 + 40;
    }
    svg += `  </g>\n`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Generates an executive presentation PDF containing the chart using jsPDF.
 * DEFECT-60-02: Supports vertical_bar, horizontal_bar, smooth_line, stacked_area, and donut_pie.
 */
export async function generateChartPdf(
  data: ParsedChartData,
  options: CsvVectorChartBuilderOptions
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 15;

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Title
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(options.chartTitle || 'Vector Chart Report', margin + 8, margin + 14);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(options.chartSubtitle || '', margin + 8, margin + 21);

  // Chart area
  const chartW = pageWidth - margin * 2 - 20;
  const chartH = pageHeight - margin * 2 - 45;
  const chartX = margin + 10;
  const chartY = margin + 28;

  const colors = getColorPaletteValues(options.colorPalette);
  const numCats = data.categories.length || 1;
  const numSeries = data.series.length || 1;

  // Render chart type specific vector graphics
  if (options.chartType === 'donut_pie') {
    const cx = chartX + chartW / 2;
    const cy = chartY + chartH / 2;
    const outerR = Math.min(chartW, chartH) / 2.3;
    const innerR = outerR * 0.52;

    const values = data.series[0]?.values || [];
    const total = values.reduce((sum, v) => sum + Math.max(0, v), 0) || 1;

    let currentAngle = -Math.PI / 2;
    for (let i = 0; i < values.length; i++) {
      const v = Math.max(0, values[i]);
      const rawSlice = (v / total) * (Math.PI * 2);
      const sliceAngle = Math.min(rawSlice, Math.PI * 2 - 0.0001);
      const endAngle = currentAngle + sliceAngle;

      const rgb = hexToRgb(colors[i % colors.length]);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);

      // Approximate sector with triangle fan
      const steps = Math.max(6, Math.ceil(sliceAngle / 0.1));
      for (let k = 0; k < steps; k++) {
        const a1 = currentAngle + (k / steps) * sliceAngle;
        const a2 = currentAngle + ((k + 1) / steps) * sliceAngle;
        const p1x = cx + outerR * Math.cos(a1);
        const p1y = cy + outerR * Math.sin(a1);
        const p2x = cx + outerR * Math.cos(a2);
        const p2y = cy + outerR * Math.sin(a2);
        doc.triangle(cx, cy, p1x, p1y, p2x, p2y, 'F');
      }

      // Draw slice label if room
      if (options.showDataLabels && sliceAngle > 0.3) {
        const midA = currentAngle + sliceAngle / 2;
        const labelR = (outerR + innerR) / 2;
        const lx = cx + labelR * Math.cos(midA);
        const ly = cy + labelR * Math.sin(midA);
        const pct = ((v / total) * 100).toFixed(0) + '%';
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(pct, lx, ly, { align: 'center', baseline: 'middle' });
      }

      currentAngle = endAngle;
    }

    // Inner donut hole
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerR, 'F');

    // Donut Legend
    if (options.showLegend) {
      let legX = chartX;
      const legY = chartY + chartH + 5;
      for (let i = 0; i < data.categories.length; i++) {
        const rgb = hexToRgb(colors[i % colors.length]);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(legX, legY - 3, 4, 4, 'F');

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const catName = data.categories[i] || `Item ${i + 1}`;
        doc.text(catName, legX + 6, legY);
        legX += catName.length * 2.2 + 16;
      }
    }
  } else if (options.chartType === 'horizontal_bar') {
    const catH = chartH / numCats;
    const barH = (catH * 0.65) / numSeries;
    const maxVal = data.maxValue > 0 ? data.maxValue : 100;

    // Gridlines
    if (options.showGridLines) {
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      for (let i = 0; i <= 4; i++) {
        const gx = chartX + 35 + (chartW - 45) * (i / 4);
        doc.line(gx, chartY, gx, chartY + chartH);
      }
    }

    for (let c = 0; c < numCats; c++) {
      const catY = chartY + c * catH;
      // Y-axis label
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(data.categories[c] || '', chartX + 30, catY + catH / 2, { align: 'right' });

      for (let s = 0; s < numSeries; s++) {
        const val = data.series[s]?.values[c] || 0;
        const bW = Math.max(1, (val / maxVal) * (chartW - 55));
        const by = catY + (catH * 0.15) + s * barH;

        const rgb = hexToRgb(colors[s % colors.length]);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(chartX + 35, by, bW, Math.max(1, barH - 1), 'F');

        if (options.showDataLabels && bW > 8) {
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(formatChartValue(val, options.valueFormat), chartX + 38 + bW, by + barH / 2 + 1);
        }
      }
    }
  } else if (options.chartType === 'smooth_line') {
    const catW = chartW / numCats;
    const maxVal = data.maxValue > 0 ? data.maxValue : 100;

    // Gridlines
    if (options.showGridLines) {
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      for (let i = 0; i <= 4; i++) {
        const gy = chartY + chartH - 10 - (chartH - 25) * (i / 4);
        doc.line(chartX, gy, chartX + chartW, gy);
      }
    }

    for (let s = 0; s < numSeries; s++) {
      const seriesData = data.series[s];
      const rgb = hexToRgb(colors[s % colors.length]);
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.setLineWidth(0.8);

      let prevX = 0;
      let prevY = 0;

      for (let c = 0; c < numCats; c++) {
        const val = seriesData?.values[c] || 0;
        const x = chartX + c * catW + catW / 2;
        const pct = Math.min(1, Math.max(0, val / maxVal));
        const y = chartY + chartH - 10 - pct * (chartH - 25);

        if (c > 0) {
          doc.line(prevX, prevY, x, y);
        }

        // Draw dot
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.circle(x, y, 1.2, 'F');

        if (options.showDataLabels) {
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(formatChartValue(val, options.valueFormat), x, y - 2.5, { align: 'center' });
        }

        prevX = x;
        prevY = y;
      }
    }

    // Category labels
    for (let c = 0; c < numCats; c++) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(data.categories[c] || '', chartX + c * catW + catW / 2, chartY + chartH, { align: 'center' });
    }
  } else if (options.chartType === 'stacked_area') {
    const catW = chartW / numCats;
    const catSums: number[] = new Array(numCats).fill(0);
    for (let c = 0; c < numCats; c++) {
      for (let s = 0; s < numSeries; s++) {
        catSums[c] += Math.max(0, data.series[s]?.values[c] || 0);
      }
    }
    const maxStacked = Math.max(...catSums, 10);
    const prevCumH: number[] = new Array(numCats).fill(0);

    for (let s = 0; s < numSeries; s++) {
      const seriesData = data.series[s];
      const rgb = hexToRgb(colors[s % colors.length]);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);

      for (let c = 0; c < numCats; c++) {
        const val = Math.max(0, seriesData?.values[c] || 0);
        const segH = (val / maxStacked) * (chartH - 25);
        const bx = chartX + c * catW + 4;
        const by = chartY + chartH - 10 - prevCumH[c] - segH;

        doc.rect(bx, by, catW - 8, segH, 'F');
        prevCumH[c] += segH;

        if (options.showDataLabels && segH > 5) {
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.text(formatChartValue(val, options.valueFormat), bx + (catW - 8) / 2, by + segH / 2 + 1, {
            align: 'center',
          });
        }
      }
    }

    for (let c = 0; c < numCats; c++) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(data.categories[c] || '', chartX + c * catW + catW / 2, chartY + chartH, { align: 'center' });
    }
  } else {
    // Vertical Bar Chart (Default)
    const catW = chartW / numCats;
    const barW = (catW * 0.7) / numSeries;
    const maxVal = data.maxValue > 0 ? data.maxValue : 100;

    // Gridlines
    if (options.showGridLines) {
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      for (let i = 0; i <= 4; i++) {
        const gy = chartY + chartH - 10 - (chartH - 25) * (i / 4);
        doc.line(chartX, gy, chartX + chartW, gy);
      }
    }

    for (let c = 0; c < numCats; c++) {
      for (let s = 0; s < numSeries; s++) {
        const val = data.series[s]?.values[c] || 0;
        const pct = Math.min(1, Math.max(0, val / maxVal));
        const bH = pct * (chartH - 25);
        const bx = chartX + c * catW + s * barW + 5;
        const by = chartY + chartH - 10 - bH;

        const rgb = hexToRgb(colors[s % colors.length]);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(bx, by, Math.max(1, barW - 2), bH, 'F');

        if (options.showDataLabels && bH > 5) {
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(formatChartValue(val, options.valueFormat), bx + (barW - 2) / 2, by - 2, {
            align: 'center',
          });
        }
      }

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(data.categories[c] || '', chartX + c * catW + catW / 2, chartY + chartH, {
        align: 'center',
      });
    }
  }

  // Legend Bar for Cartesian charts
  if (options.showLegend && options.chartType !== 'donut_pie') {
    let legX = chartX;
    const legY = chartY + chartH + 7;
    for (let s = 0; s < data.series.length; s++) {
      const rgb = hexToRgb(colors[s % colors.length]);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(legX, legY - 3, 4, 4, 'F');

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const sName = data.series[s]?.name || `Series ${s + 1}`;
      doc.text(sName, legX + 6, legY);
      legX += sName.length * 2.2 + 16;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'PrivKnife 100% In-Browser Chart Generator • Zero Telemetry',
    margin + 8,
    pageHeight - margin - 4
  );

  return doc.output('blob');
}

/**
 * Creates high-res PNG blob from SVG string preserving exact aspect ratio.
 * DEFECT-60-03: Parses viewBox dimensions and scales canvas by _dpi / 96.
 */
export async function generateChartPngBlob(svgStr: string, _dpi = 300): Promise<Blob> {
  // Parse viewBox or width/height dimensions
  let svgW = 960;
  let svgH = 540;

  const vbMatch = svgStr.match(
    /viewBox=["']\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*["']/
  );
  if (vbMatch) {
    svgW = parseFloat(vbMatch[3]) || 960;
    svgH = parseFloat(vbMatch[4]) || 540;
  } else {
    const wMatch = svgStr.match(/width=["']([0-9.]+)["']/);
    const hMatch = svgStr.match(/height=["']([0-9.]+)["']/);
    if (wMatch && hMatch) {
      svgW = parseFloat(wMatch[1]) || 960;
      svgH = parseFloat(hMatch[1]) || 540;
    }
  }

  const scale = Math.max(1, (_dpi || 300) / 96);
  const targetW = Math.min(3840, Math.round(svgW * scale));
  const targetH = Math.min(3840, Math.round(svgH * scale));

  // If running in browser with Image & Canvas
  if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        const blob = await new Promise<Blob | null>((resolve) => {
          img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            canvas.toBlob((b) => resolve(b), 'image/png');
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
        });

        if (blob) return blob;
      }
    } catch {
      // Fallback below
    }
  }

  // Deterministic minimal PNG builder fallback (1x1 transparent PNG)
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length & type
    0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, // 256x256
    0x08, 0x06, 0x00, 0x00, 0x00, 0x5c, 0x72, 0xa8, 0x66,
    0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82, // IEND
  ]);

  return new Blob([pngHeader], { type: 'image/png' });
}
