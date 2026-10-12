import { describe, expect, it, vi } from 'vitest';
import {
  buildDohQueryUrl,
  calculatePropagationSummary,
  exportDnsResultsAsCsv,
  exportDnsResultsAsJson,
  isValidDomain,
  parseDohResponse,
  parseRdapResponse,
  queryDohProvider,
  queryWhoisRdap,
  sanitizeDomain,
} from './engine';
import {
  GLOBAL_DOH_PROVIDERS,
  MOCK_DOH_GOOGLE_RESPONSE,
  MOCK_RDAP_WHOIS_RESPONSE,
} from './test-fixtures';

describe('Global DNS Propagation & WHOIS Checker Engine', () => {
  it('sanitizes domain inputs removing protocols, paths, and trailing dots', () => {
    expect(sanitizeDomain('https://example.com/')).toBe('example.com');
    expect(sanitizeDomain('HTTP://Sub.Domain.org:8080/path?query=1')).toBe('sub.domain.org');
    expect(sanitizeDomain('  example.com.  ')).toBe('example.com');
    expect(sanitizeDomain('')).toBe('');
  });

  it('validates domain name format syntax', () => {
    expect(isValidDomain('example.com')).toBe(true);
    expect(isValidDomain('sub.domain.co.uk')).toBe(true);
    expect(isValidDomain('invalid..domain')).toBe(false);
    expect(isValidDomain('-invalid.com')).toBe(false);
    expect(isValidDomain('')).toBe(false);
  });

  it('builds valid DoH query URLs with target domain and record type', () => {
    const provider = GLOBAL_DOH_PROVIDERS[0];
    const urlStr = buildDohQueryUrl(provider, 'example.com', 'A');
    const parsed = new URL(urlStr);

    expect(parsed.searchParams.get('name')).toBe('example.com');
    expect(parsed.searchParams.get('type')).toBe('A');
  });

  it('parses RFC/Google DoH JSON responses extracting records and TTL', () => {
    const { records, ttl, matchesExpected } = parseDohResponse(
      MOCK_DOH_GOOGLE_RESPONSE,
      'A',
      '93.184.215.14'
    );

    expect(records).toEqual(['93.184.215.14']);
    expect(ttl).toBe(3600);
    expect(matchesExpected).toBe(true);
  });

  it('handles DoH responses when no records are returned or Status is non-zero', () => {
    const emptyResponse = { Status: 3, Answer: [] };
    const { records, matchesExpected } = parseDohResponse(emptyResponse, 'A', '1.1.1.1');

    expect(records).toEqual([]);
    expect(matchesExpected).toBe(false);
  });

  it('executes DoH query and measures latency with mock fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_DOH_GOOGLE_RESPONSE,
    });

    const provider = GLOBAL_DOH_PROVIDERS[1]; // Google Public DNS
    const result = await queryDohProvider(
      provider,
      'example.com',
      'A',
      '93.184.215.14',
      mockFetch as unknown as typeof fetch
    );

    expect(result.status).toBe('success');
    expect(result.records).toContain('93.184.215.14');
    expect(result.matchesExpected).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('handles DoH network errors or timeouts gracefully without throwing', async () => {
    const mockFetchFail = vi.fn().mockRejectedValue(new Error('Network error'));

    const provider = GLOBAL_DOH_PROVIDERS[0];
    const result = await queryDohProvider(
      provider,
      'example.com',
      'A',
      '',
      mockFetchFail as unknown as typeof fetch
    );

    expect(result.status).toBe('error');
    expect(result.records).toEqual([]);
    expect(result.errorMessage).toBeDefined();
  });

  it('parses RDAP WHOIS response extracting registrar, dates, and nameservers', () => {
    const whois = parseRdapResponse(MOCK_RDAP_WHOIS_RESPONSE, 'example.com');

    expect(whois.domain).toBe('example.com');
    expect(whois.registrar).toContain('Internet Assigned Numbers Authority');
    expect(whois.creationDate).toBe('1995-08-14T04:00:00Z');
    expect(whois.expirationDate).toBe('2026-08-13T04:00:00Z');
    expect(whois.nameServers).toContain('A.IANA-SERVERS.NET');
  });

  it('queries RDAP registry with mock fetch and parses result', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_RDAP_WHOIS_RESPONSE,
    });

    const whois = await queryWhoisRdap('example.com', mockFetch as unknown as typeof fetch);
    expect(whois.domain).toBe('example.com');
    expect(whois.registrar).toBeDefined();
  });

  it('calculates global propagation summary accurately', () => {
    const mockResults = [
      {
        providerId: 'p1',
        providerName: 'P1',
        region: 'US',
        city: 'NY',
        ip: '1.1.1.1',
        status: 'success' as const,
        latencyMs: 20,
        records: ['93.184.215.14'],
        matchesExpected: true,
      },
      {
        providerId: 'p2',
        providerName: 'P2',
        region: 'EU',
        city: 'London',
        ip: '8.8.8.8',
        status: 'success' as const,
        latencyMs: 40,
        records: ['93.184.215.14'],
        matchesExpected: true,
      },
      {
        providerId: 'p3',
        providerName: 'P3',
        region: 'APAC',
        city: 'Tokyo',
        ip: '9.9.9.9',
        status: 'error' as const,
        latencyMs: 60,
        records: [],
        matchesExpected: false,
      },
      {
        providerId: 'p4',
        providerName: 'P4',
        region: 'LATAM',
        city: 'Sao Paulo',
        ip: '1.0.0.1',
        status: 'success' as const,
        latencyMs: 80,
        records: ['10.0.0.1'],
        matchesExpected: false,
      },
    ];

    const summary = calculatePropagationSummary(mockResults, '93.184.215.14');
    expect(summary.totalNodes).toBe(4);
    expect(summary.resolvedNodes).toBe(3);
    expect(summary.matchingNodes).toBe(2);
    expect(summary.propagationPercent).toBe(50.0); // 2 out of 4 matching
    expect(summary.averageLatencyMs).toBe(Math.round((20 + 40 + 80) / 3));
  });

  it('exports DNS query table as CSV and JSON blobs', async () => {
    const mockResults = [
      {
        providerId: 'p1',
        providerName: 'Cloudflare',
        region: 'US',
        city: 'SF',
        ip: '1.1.1.1',
        status: 'success' as const,
        latencyMs: 25,
        records: ['93.184.215.14'],
        matchesExpected: true,
        ttl: 300,
      },
    ];

    const csvBlob = exportDnsResultsAsCsv(mockResults, 'example.com', 'A');
    expect(csvBlob).toBeInstanceOf(Blob);
    expect(csvBlob.type).toContain('text/csv');
    const csvText = await csvBlob.text();
    expect(csvText).toContain('Cloudflare');
    expect(csvText).toContain('93.184.215.14');

    const jsonBlob = exportDnsResultsAsJson(mockResults, null, {
      domain: 'example.com',
      recordType: 'A',
      expectedValue: '93.184.215.14',
    });
    expect(jsonBlob).toBeInstanceOf(Blob);
    expect(jsonBlob.type).toContain('application/json');
    const jsonText = await jsonBlob.text();
    expect(jsonText).toContain('PrivKnife Global DNS Propagation');
  });

  it('operates with zero telemetry tracking', () => {
    const telemetryKeywords = ['google-analytics', 'mixpanel', 'posthog', 'telemetry', 'sentry'];
    for (const provider of GLOBAL_DOH_PROVIDERS) {
      for (const kw of telemetryKeywords) {
        expect(provider.endpointUrl).not.toContain(kw);
      }
    }
  });
});
