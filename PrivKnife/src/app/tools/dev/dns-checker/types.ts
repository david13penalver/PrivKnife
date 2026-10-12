export type DnsRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'PTR'
  | 'SOA';

export interface DohProvider {
  id: string;
  name: string;
  region: string;
  city: string;
  ip: string;
  endpointUrl: string;
  format: 'google-json' | 'ietf-doh';
}

export interface DnsRecordAnswer {
  name: string;
  type: number;
  data: string;
  TTL: number;
}

export interface DnsQueryResult {
  providerId: string;
  providerName: string;
  region: string;
  city: string;
  ip: string;
  status: 'success' | 'error' | 'pending';
  latencyMs: number;
  records: string[];
  ttl?: number;
  matchesExpected: boolean;
  errorMessage?: string;
}

export interface WhoisResult {
  domain: string;
  registrar?: string;
  creationDate?: string;
  expirationDate?: string;
  updatedDate?: string;
  nameServers: string[];
  status: string[];
  dnssec?: boolean;
  rawJson?: string;
}

export interface DnsCheckerConfig {
  domain: string;
  recordType: DnsRecordType;
  expectedValue: string;
}

export interface PropagationSummary {
  totalNodes: number;
  resolvedNodes: number;
  matchingNodes: number;
  propagationPercent: number;
  averageLatencyMs: number;
}
