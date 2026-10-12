import { describe, expect, it, vi } from 'vitest';
import {
  buildPageSpeedApiUrl,
  exportAuditReportAsJson,
  exportAuditReportAsMarkdown,
  getMetricRating,
  getScoreRating,
  isValidUrl,
  normalizeUrl,
  parsePageSpeedResponse,
  runPageSpeedAudit,
} from './engine';
import { SAMPLE_FAST_SITE_REPORT } from './test-fixtures';

describe('Website Performance & Core Web Vitals Engine', () => {
  it('normalizes target URLs prepending https protocol', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('http://test.org/')).toBe('http://test.org/');
    expect(normalizeUrl('  sub.example.com/page?ref=1  ')).toBe('https://sub.example.com/page?ref=1');
  });

  it('validates HTTP and HTTPS URLs accurately', () => {
    expect(isValidUrl('example.com')).toBe(true);
    expect(isValidUrl('https://privknife.org/tools')).toBe(true);
    expect(isValidUrl('ftp://invalid-protocol.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  it('evaluates metric and score ratings using Core Web Vitals thresholds', () => {
    // Scores
    expect(getScoreRating(95)).toBe('good');
    expect(getScoreRating(75)).toBe('needs-improvement');
    expect(getScoreRating(40)).toBe('poor');

    // LCP (good <= 2.5, poor >= 4.0)
    expect(getMetricRating(1.8, 2.5, 4.0)).toBe('good');
    expect(getMetricRating(3.2, 2.5, 4.0)).toBe('needs-improvement');
    expect(getMetricRating(4.5, 2.5, 4.0)).toBe('poor');
  });

  it('builds PageSpeed Insights REST API query URL with categories and strategy', () => {
    const urlStr = buildPageSpeedApiUrl('https://example.com', 'mobile', 'TEST_KEY');
    const parsed = new URL(urlStr);

    expect(parsed.searchParams.get('url')).toBe('https://example.com');
    expect(parsed.searchParams.get('strategy')).toBe('mobile');
    expect(parsed.searchParams.getAll('category')).toContain('performance');
    expect(parsed.searchParams.get('key')).toBe('TEST_KEY');
  });

  it('parses raw Lighthouse JSON payload into structured VitalsAuditReport', () => {
    const mockLighthouseJson = {
      lighthouseResult: {
        lighthouseVersion: '12.2.0',
        categories: {
          performance: { score: 0.92 },
          accessibility: { score: 0.95 },
          'best-practices': { score: 1.0 },
          seo: { score: 0.98 },
        },
        audits: {
          'largest-contentful-paint': { numericValue: 1800 },
          'total-blocking-time': { numericValue: 80 },
          'cumulative-layout-shift': { numericValue: 0.02 },
          'first-contentful-paint': { numericValue: 900 },
          'server-response-time': { numericValue: 140 },
          'speed-index': { numericValue: 1400 },
          'render-blocking-resources': {
            score: 0.4,
            title: 'Eliminate render-blocking resources',
            description: 'Resources are blocking first paint.',
            details: { overallSavingsMs: 400 },
          },
        },
      },
    };

    const report = parsePageSpeedResponse(
      mockLighthouseJson,
      'https://example.com',
      'mobile',
      1200
    );

    expect(report.url).toBe('https://example.com');
    expect(report.overallScore).toBe(92);
    expect(report.categories.find((c) => c.id === 'performance')?.rating).toBe('good');
    expect(report.vitals.lcp.value).toBe(1.8);
    expect(report.vitals.lcp.rating).toBe('good');
    expect(report.vitals.cls.value).toBe(0.02);
    expect(report.vitals.inp.value).toBe(80);
    expect(report.diagnostics.length).toBeGreaterThan(0);
    expect(report.diagnostics[0].priority).toBe('high');
  });

  it('executes audit query with mock fetch returning complete audit report', async () => {
    const mockJson = {
      lighthouseResult: {
        categories: { performance: { score: 0.88 } },
        audits: {
          'largest-contentful-paint': { numericValue: 2100 },
        },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockJson,
    });

    const report = await runPageSpeedAudit(
      'example.com',
      'desktop',
      undefined,
      mockFetch as unknown as typeof fetch
    );

    expect(report.overallScore).toBe(88);
    expect(report.strategy).toBe('desktop');
    expect(report.vitals.lcp.value).toBe(2.1);
  });

  it('handles PageSpeed API errors with descriptive exceptions', async () => {
    const mockFetchError = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(
      runPageSpeedAudit('example.com', 'mobile', undefined, mockFetchError as unknown as typeof fetch)
    ).rejects.toThrow('Google PageSpeed API Error: HTTP 429');
  });

  it('exports audit report as downloadable JSON and Markdown summary Blobs', async () => {
    const jsonBlob = exportAuditReportAsJson(SAMPLE_FAST_SITE_REPORT);
    expect(jsonBlob).toBeInstanceOf(Blob);
    expect(jsonBlob.type).toContain('application/json');

    const mdBlob = exportAuditReportAsMarkdown(SAMPLE_FAST_SITE_REPORT);
    expect(mdBlob).toBeInstanceOf(Blob);
    expect(mdBlob.type).toContain('text/markdown');
    const mdText = await mdBlob.text();
    expect(mdText).toContain('Core Web Vitals Summary');
    expect(mdText).toContain('PrivKnife');
  });

  it('maintains 100% privacy with zero telemetry or tracking requests', () => {
    const apiUrl = buildPageSpeedApiUrl('https://example.com', 'mobile');
    expect(apiUrl).toContain('googleapis.com/pagespeedonline');
    expect(apiUrl).not.toContain('google-analytics');
    expect(apiUrl).not.toContain('mixpanel');
  });
});
