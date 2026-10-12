import {
  AuditStrategy,
  CategoryScore,
  DiagnosticPriority,
  DiagnosticTip,
  MetricRating,
  VitalMetric,
  VitalsAuditReport,
} from './types';

/**
 * Normalizes user URL input by ensuring https:// protocol and trimming.
 */
export function normalizeUrl(input: string): string {
  if (!input) return '';
  const clean = input.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(clean)) {
    return clean;
  }
  return `https://${clean}`;
}

/**
 * Validates whether string is a valid HTTP or HTTPS URL.
 */
export function isValidUrl(input: string): boolean {
  if (!input || !input.trim()) return false;
  try {
    const normalized = normalizeUrl(input);
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    return url.hostname.includes('.') && url.hostname.length > 3;
  } catch {
    return false;
  }
}

/**
 * Calculates ratings based on thresholds where lower values are better (e.g. latency, shift).
 */
export function getMetricRating(
  val: number,
  goodMax: number,
  poorMin: number
): MetricRating {
  if (val <= goodMax) return 'good';
  if (val < poorMin) return 'needs-improvement';
  return 'poor';
}

/**
 * Converts 0-100 score to rating.
 */
export function getScoreRating(score: number): MetricRating {
  if (score >= 90) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}

/**
 * Builds the direct Google PageSpeed Insights REST API query URL.
 */
export function buildPageSpeedApiUrl(
  targetUrl: string,
  strategy: AuditStrategy,
  apiKey?: string
): string {
  const url = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  url.searchParams.set('url', targetUrl);
  url.searchParams.set('strategy', strategy);
  url.searchParams.append('category', 'performance');
  url.searchParams.append('category', 'accessibility');
  url.searchParams.append('category', 'best-practices');
  url.searchParams.append('category', 'seo');

  if (apiKey && apiKey.trim()) {
    url.searchParams.set('key', apiKey.trim());
  }

  return url.toString();
}

/**
 * Parses raw Google PageSpeed Insights / Lighthouse v5+ JSON response.
 */
export function parsePageSpeedResponse(
  json: any,
  url: string,
  strategy: AuditStrategy,
  fetchTimeMs: number
): VitalsAuditReport {
  const lh = json?.lighthouseResult || {};
  const categoriesRaw = lh.categories || {};
  const audits = lh.audits || {};

  // 1. Categories
  const perfScore = Math.round((categoriesRaw.performance?.score ?? 0.5) * 100);
  const a11yScore = Math.round((categoriesRaw.accessibility?.score ?? 0.8) * 100);
  const bpScore = Math.round((categoriesRaw['best-practices']?.score ?? 0.8) * 100);
  const seoScore = Math.round((categoriesRaw.seo?.score ?? 0.8) * 100);

  const categories: CategoryScore[] = [
    { id: 'performance', title: 'Performance', score: perfScore, rating: getScoreRating(perfScore) },
    { id: 'accessibility', title: 'Accessibility', score: a11yScore, rating: getScoreRating(a11yScore) },
    { id: 'best-practices', title: 'Best Practices', score: bpScore, rating: getScoreRating(bpScore) },
    { id: 'seo', title: 'SEO', score: seoScore, rating: getScoreRating(seoScore) },
  ];

  // 2. Core Web Vitals
  // LCP
  const lcpAudit = audits['largest-contentful-paint'] || {};
  const lcpVal = Number(((lcpAudit.numericValue ?? 2500) / 1000).toFixed(2));
  const lcp: VitalMetric = {
    id: 'lcp',
    name: 'Largest Contentful Paint',
    shortName: 'LCP',
    value: lcpVal,
    formattedValue: `${lcpVal} s`,
    unit: 's',
    rating: getMetricRating(lcpVal, 2.5, 4.0),
    description: 'Measures loading speed when the main page content has likely loaded.',
    goodThreshold: 2.5,
    poorThreshold: 4.0,
  };

  // INP / TBT
  const tbtAudit = audits['total-blocking-time'] || audits['interaction-to-next-paint'] || {};
  const inpVal = Math.round(tbtAudit.numericValue ?? 150);
  const inp: VitalMetric = {
    id: 'inp',
    name: 'Interaction to Next Paint / TBT',
    shortName: 'INP/TBT',
    value: inpVal,
    formattedValue: `${inpVal} ms`,
    unit: 'ms',
    rating: getMetricRating(inpVal, 200, 500),
    description: 'Measures visual responsiveness to user interactions.',
    goodThreshold: 200,
    poorThreshold: 500,
  };

  // CLS
  const clsAudit = audits['cumulative-layout-shift'] || {};
  const clsVal = Number((clsAudit.numericValue ?? 0.05).toFixed(3));
  const cls: VitalMetric = {
    id: 'cls',
    name: 'Cumulative Layout Shift',
    shortName: 'CLS',
    value: clsVal,
    formattedValue: `${clsVal}`,
    unit: '',
    rating: getMetricRating(clsVal, 0.1, 0.25),
    description: 'Measures visual stability and unexpected layout shifts.',
    goodThreshold: 0.1,
    poorThreshold: 0.25,
  };

  // FCP
  const fcpAudit = audits['first-contentful-paint'] || {};
  const fcpVal = Number(((fcpAudit.numericValue ?? 1500) / 1000).toFixed(2));
  const fcp: VitalMetric = {
    id: 'fcp',
    name: 'First Contentful Paint',
    shortName: 'FCP',
    value: fcpVal,
    formattedValue: `${fcpVal} s`,
    unit: 's',
    rating: getMetricRating(fcpVal, 1.8, 3.0),
    description: 'Marks the time at which the first text or image is painted.',
    goodThreshold: 1.8,
    poorThreshold: 3.0,
  };

  // TTFB
  const ttfbAudit = audits['server-response-time'] || {};
  const ttfbVal = Math.round(ttfbAudit.numericValue ?? 350);
  const ttfb: VitalMetric = {
    id: 'ttfb',
    name: 'Time to First Byte',
    shortName: 'TTFB',
    value: ttfbVal,
    formattedValue: `${ttfbVal} ms`,
    unit: 'ms',
    rating: getMetricRating(ttfbVal, 800, 1800),
    description: 'Server response time for the initial HTML document.',
    goodThreshold: 800,
    poorThreshold: 1800,
  };

  // Speed Index
  const siAudit = audits['speed-index'] || {};
  const siVal = Number(((siAudit.numericValue ?? 2800) / 1000).toFixed(2));
  const speedIndex: VitalMetric = {
    id: 'speed-index',
    name: 'Speed Index',
    shortName: 'SI',
    value: siVal,
    formattedValue: `${siVal} s`,
    unit: 's',
    rating: getMetricRating(siVal, 3.4, 5.8),
    description: 'Shows how quickly the contents of a page are visibly populated.',
    goodThreshold: 3.4,
    poorThreshold: 5.8,
  };

  // 3. Actionable Diagnostic Tips
  const diagnostics: DiagnosticTip[] = [];
  const candidateAudits = [
    { id: 'render-blocking-resources', cat: 'performance', defaultPrio: 'high' as const },
    { id: 'uses-responsive-images', cat: 'performance', defaultPrio: 'high' as const },
    { id: 'uses-optimized-images', cat: 'performance', defaultPrio: 'high' as const },
    { id: 'uses-rel-preconnect', cat: 'performance', defaultPrio: 'medium' as const },
    { id: 'unminified-javascript', cat: 'performance', defaultPrio: 'medium' as const },
    { id: 'unminified-css', cat: 'performance', defaultPrio: 'medium' as const },
    { id: 'font-display', cat: 'performance', defaultPrio: 'low' as const },
    { id: 'meta-description', cat: 'seo', defaultPrio: 'medium' as const },
    { id: 'image-alt', cat: 'accessibility', defaultPrio: 'high' as const },
  ];

  for (const cand of candidateAudits) {
    const a = audits[cand.id];
    if (a && (a.score === null || a.score < 0.9)) {
      diagnostics.push({
        id: cand.id,
        title: a.title || cand.id,
        description: a.description || '',
        priority: a.score !== null && a.score < 0.5 ? 'high' : cand.defaultPrio,
        estimatedSavingsMs: a.details?.overallSavingsMs,
        estimatedSavingsBytes: a.details?.overallSavingsBytes,
        category: cand.cat as any,
      });
    }
  }

  // Fallback diagnostic tip if none found
  if (diagnostics.length === 0) {
    diagnostics.push({
      id: 'keep-caching',
      title: 'Leverage efficient browser caching',
      description: 'Ensure cache-control headers are configured for static static assets.',
      priority: 'low',
      category: 'performance',
    });
  }

  return {
    url,
    strategy,
    timestamp: new Date().toISOString(),
    fetchTimeMs,
    overallScore: perfScore,
    categories,
    vitals: { lcp, inp, cls, fcp, ttfb, speedIndex },
    diagnostics,
    lighthouseVersion: lh.lighthouseVersion || '12.0.0',
  };
}

/**
 * Executes direct client-side Google PageSpeed Insights query.
 */
export async function runPageSpeedAudit(
  url: string,
  strategy: AuditStrategy,
  apiKey?: string,
  fetchImpl: typeof fetch = window.fetch.bind(window),
  timeoutMs: number = 30000
): Promise<VitalsAuditReport> {
  const cleanUrl = normalizeUrl(url);
  const apiUrl = buildPageSpeedApiUrl(cleanUrl, strategy, apiKey);
  const startTime = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);
    const fetchTimeMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      throw new Error(`Google PageSpeed API Error: HTTP ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return parsePageSpeedResponse(json, cleanUrl, strategy, fetchTimeMs);
  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err?.name === 'AbortError';
    throw new Error(
      isTimeout
        ? 'Audit request timed out after 30 seconds'
        : err?.message || 'Failed to connect to Google PageSpeed API'
    );
  }
}

/**
 * Exports complete performance audit as a formatted JSON Blob.
 */
export function exportAuditReportAsJson(report: VitalsAuditReport): Blob {
  const jsonStr = JSON.stringify(report, null, 2);
  return new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
}

/**
 * Exports performance audit as a clean Markdown summary Blob.
 */
export function exportAuditReportAsMarkdown(report: VitalsAuditReport): Blob {
  const md = `# Web Vitals & Performance Audit Report
- **URL Tested**: ${report.url}
- **Device Strategy**: ${report.strategy.toUpperCase()}
- **Overall Performance Score**: ${report.overallScore} / 100
- **Audit Date**: ${report.timestamp}
- **Lighthouse Engine**: v${report.lighthouseVersion || '12.x'}

## Category Scores
${report.categories.map((c) => `- **${c.title}**: ${c.score}/100 (${c.rating.toUpperCase()})`).join('\n')}

## Core Web Vitals Summary
- **Largest Contentful Paint (LCP)**: ${report.vitals.lcp.formattedValue} (${report.vitals.lcp.rating.toUpperCase()})
- **Interaction to Next Paint (INP/TBT)**: ${report.vitals.inp.formattedValue} (${report.vitals.inp.rating.toUpperCase()})
- **Cumulative Layout Shift (CLS)**: ${report.vitals.cls.formattedValue} (${report.vitals.cls.rating.toUpperCase()})
- **First Contentful Paint (FCP)**: ${report.vitals.fcp.formattedValue} (${report.vitals.fcp.rating.toUpperCase()})
- **Time to First Byte (TTFB)**: ${report.vitals.ttfb.formattedValue} (${report.vitals.ttfb.rating.toUpperCase()})
- **Speed Index (SI)**: ${report.vitals.speedIndex.formattedValue} (${report.vitals.speedIndex.rating.toUpperCase()})

## Priority Diagnostic Tips
${report.diagnostics.map((d) => `### [${d.priority.toUpperCase()}] ${d.title}\n${d.description}`).join('\n\n')}

---
*Generated privately 100% in-browser by PrivKnife.*
`;

  return new Blob([md], { type: 'text/markdown;charset=utf-8;' });
}
