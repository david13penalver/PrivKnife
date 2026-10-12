import {
  DnsCheckerConfig,
  DnsQueryResult,
  DnsRecordType,
  DohProvider,
  PropagationSummary,
  WhoisResult,
} from './types';

// RFC 1035 / IANA DNS record type numbers
export const DNS_RECORD_TYPE_NUMBERS: Record<DnsRecordType, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  PTR: 12,
  MX: 15,
  TXT: 16,
  AAAA: 28,
};

/**
 * Sanitizes and normalizes domain names by removing protocols, paths, ports, and trailing periods.
 */
export function sanitizeDomain(input: string): string {
  if (!input) return '';
  let clean = input.trim().toLowerCase();

  // Strip protocol
  clean = clean.replace(/^[a-z]+:\/\//, '');

  // Strip path & query parameters
  clean = clean.split('/')[0].split('?')[0].split('#')[0];

  // Strip port
  clean = clean.split(':')[0];

  // Strip trailing period
  clean = clean.replace(/\.+$/, '');

  return clean;
}

/**
 * Validates domain name syntax.
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  const regex = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})+$/;
  return regex.test(domain);
}

/**
 * Constructs DoH request URL for a given provider and record type.
 */
export function buildDohQueryUrl(
  provider: DohProvider,
  domain: string,
  recordType: DnsRecordType
): string {
  const url = new URL(provider.endpointUrl);
  url.searchParams.set('name', domain);
  url.searchParams.set('type', recordType);
  return url.toString();
}

/**
 * Parses DNS JSON response format (RFC 8484 / Google DoH format).
 */
export function parseDohResponse(
  json: any,
  recordType: DnsRecordType,
  expectedValue: string
): { records: string[]; ttl?: number; matchesExpected: boolean } {
  if (!json || json.Status !== 0 || !Array.isArray(json.Answer)) {
    return { records: [], matchesExpected: false };
  }

  const targetTypeNum = DNS_RECORD_TYPE_NUMBERS[recordType];
  const answers = json.Answer.filter((ans: any) => ans.type === targetTypeNum || !targetTypeNum);

  const records: string[] = [];
  let minTtl: number | undefined;

  for (const ans of answers) {
    if (ans.data) {
      let dataStr = String(ans.data).trim();
      // Unquote TXT strings if enclosed in quotes
      if (recordType === 'TXT' && dataStr.startsWith('"') && dataStr.endsWith('"')) {
        dataStr = dataStr.slice(1, -1);
      }
      records.push(dataStr);
    }
    if (typeof ans.TTL === 'number') {
      if (minTtl === undefined || ans.TTL < minTtl) {
        minTtl = ans.TTL;
      }
    }
  }

  const cleanExpected = expectedValue.trim().toLowerCase();
  let matchesExpected = false;

  if (cleanExpected) {
    matchesExpected = records.some((r) => r.toLowerCase().includes(cleanExpected));
  } else {
    // If no expected value specified, true if at least one record returned
    matchesExpected = records.length > 0;
  }

  return { records, ttl: minTtl, matchesExpected };
}

/**
 * Executes a single DoH query against a specific provider with timeout.
 */
export async function queryDohProvider(
  provider: DohProvider,
  domain: string,
  recordType: DnsRecordType,
  expectedValue: string,
  fetchImpl: typeof fetch = window.fetch.bind(window),
  timeoutMs: number = 6000
): Promise<DnsQueryResult> {
  const queryUrl = buildDohQueryUrl(provider, domain, recordType);
  const startTime = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(queryUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/dns-json',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        providerId: provider.id,
        providerName: provider.name,
        region: provider.region,
        city: provider.city,
        ip: provider.ip,
        status: 'error',
        latencyMs,
        records: [],
        matchesExpected: false,
        errorMessage: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const { records, ttl, matchesExpected } = parseDohResponse(data, recordType, expectedValue);

    return {
      providerId: provider.id,
      providerName: provider.name,
      region: provider.region,
      city: provider.city,
      ip: provider.ip,
      status: records.length > 0 ? 'success' : 'error',
      latencyMs,
      records,
      ttl,
      matchesExpected,
      errorMessage: records.length === 0 ? 'No records found' : undefined,
    };
  } catch (err: any) {
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - startTime);
    const isTimeout = err?.name === 'AbortError';

    return {
      providerId: provider.id,
      providerName: provider.name,
      region: provider.region,
      city: provider.city,
      ip: provider.ip,
      status: 'error',
      latencyMs,
      records: [],
      matchesExpected: false,
      errorMessage: isTimeout ? 'Request timed out' : 'Network/CORS error',
    };
  }
}

/**
 * Parses RDAP JSON domain response into structured WHOIS details.
 */
export function parseRdapResponse(data: any, domain: string): WhoisResult {
  const result: WhoisResult = {
    domain,
    nameServers: [],
    status: [],
    dnssec: false,
    rawJson: JSON.stringify(data, null, 2),
  };

  if (!data) return result;

  // Registrar from entities
  if (Array.isArray(data.entities)) {
    const registrarEntity = data.entities.find((e: any) =>
      Array.isArray(e.roles) && e.roles.includes('registrar')
    );
    if (registrarEntity) {
      if (Array.isArray(registrarEntity.vcardArray?.[1])) {
        const fnItem = registrarEntity.vcardArray[1].find((item: any) => item[0] === 'fn');
        if (fnItem && fnItem[3]) {
          result.registrar = String(fnItem[3]);
        }
      }
      if (!result.registrar && registrarEntity.handle) {
        result.registrar = registrarEntity.handle;
      }
    }
  }

  // Dates from events
  if (Array.isArray(data.events)) {
    for (const ev of data.events) {
      if (ev.eventAction === 'registration') {
        result.creationDate = ev.eventDate;
      } else if (ev.eventAction === 'expiration') {
        result.expirationDate = ev.eventDate;
      } else if (ev.eventAction === 'last changed') {
        result.updatedDate = ev.eventDate;
      }
    }
  }

  // Nameservers
  if (Array.isArray(data.nameservers)) {
    result.nameServers = data.nameservers
      .map((ns: any) => ns.ldhName || ns.handle)
      .filter(Boolean);
  }

  // Status flags
  if (Array.isArray(data.status)) {
    result.status = data.status;
  }

  // DNSSEC
  if (data.secureDNS?.delegationSigned) {
    result.dnssec = true;
  }

  return result;
}

/**
 * Queries RDAP registry directly from browser for WHOIS registration data.
 */
export async function queryWhoisRdap(
  domain: string,
  fetchImpl: typeof fetch = window.fetch.bind(window)
): Promise<WhoisResult> {
  const clean = sanitizeDomain(domain);
  const rdapUrl = `https://rdap.org/domain/${clean}`;

  try {
    const response = await fetchImpl(rdapUrl, {
      headers: { Accept: 'application/rdap+json, application/json' },
    });
    if (!response.ok) {
      return {
        domain: clean,
        nameServers: [],
        status: [`HTTP ${response.status}`],
      };
    }
    const data = await response.json();
    return parseRdapResponse(data, clean);
  } catch {
    return {
      domain: clean,
      nameServers: [],
      status: ['Lookup failed / offline'],
    };
  }
}

/**
 * Calculates propagation summary metrics across all query results.
 */
export function calculatePropagationSummary(
  results: DnsQueryResult[],
  expectedValue: string
): PropagationSummary {
  const totalNodes = results.length;
  if (totalNodes === 0) {
    return {
      totalNodes: 0,
      resolvedNodes: 0,
      matchingNodes: 0,
      propagationPercent: 0,
      averageLatencyMs: 0,
    };
  }

  let resolvedNodes = 0;
  let matchingNodes = 0;
  let totalLatency = 0;

  for (const res of results) {
    if (res.status === 'success') {
      resolvedNodes++;
      totalLatency += res.latencyMs;
    }
    if (res.matchesExpected) {
      matchingNodes++;
    }
  }

  const targetCount = expectedValue.trim() ? matchingNodes : resolvedNodes;
  const propagationPercent = Number(((targetCount / totalNodes) * 100).toFixed(1));
  const averageLatencyMs = resolvedNodes > 0 ? Math.round(totalLatency / resolvedNodes) : 0;

  return {
    totalNodes,
    resolvedNodes,
    matchingNodes,
    propagationPercent,
    averageLatencyMs,
  };
}

/**
 * Exports DNS query results table as a downloadable CSV blob.
 */
export function exportDnsResultsAsCsv(
  results: DnsQueryResult[],
  domain: string,
  recordType: DnsRecordType
): Blob {
  const headers = ['Region', 'City', 'Provider', 'IP', 'Status', 'Resolved Records', 'TTL (s)', 'Latency (ms)'];
  const rows = results.map((r) => [
    `"${r.region}"`,
    `"${r.city}"`,
    `"${r.providerName}"`,
    `"${r.ip}"`,
    `"${r.matchesExpected ? 'MATCH' : r.status.toUpperCase()}"`,
    `"${r.records.join(', ')}"`,
    r.ttl ?? '',
    r.latencyMs,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Exports complete DNS and WHOIS audit as a JSON report blob.
 */
export function exportDnsResultsAsJson(
  results: DnsQueryResult[],
  whois: WhoisResult | null,
  config: DnsCheckerConfig
): Blob {
  const payload = {
    tool: 'PrivKnife Global DNS Propagation & WHOIS Checker',
    generatedAt: new Date().toISOString(),
    config,
    summary: calculatePropagationSummary(results, config.expectedValue),
    results,
    whois,
  };

  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
}
