import { DnsCheckerConfig, DohProvider } from './types';

export const GLOBAL_DOH_PROVIDERS: DohProvider[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare DNS',
    region: 'Public resolver',
    city: 'cloudflare-dns.com',
    ip: '1.1.1.1',
    endpointUrl: 'https://cloudflare-dns.com/dns-query',
    format: 'ietf-doh',
  },
  {
    id: 'google',
    name: 'Google Public DNS',
    region: 'Public resolver',
    city: 'dns.google',
    ip: '8.8.8.8',
    endpointUrl: 'https://dns.google/resolve',
    format: 'google-json',
  },
  {
    id: 'quad9',
    name: 'Quad9 Anycast',
    region: 'Public resolver',
    city: 'dns.quad9.net:5053',
    ip: '9.9.9.9',
    endpointUrl: 'https://dns.quad9.net:5053/dns-query',
    format: 'ietf-doh',
  },
  {
    id: 'adguard',
    name: 'AdGuard DNS',
    region: 'Public resolver',
    city: 'dns.adguard-dns.com',
    ip: '94.140.14.14',
    endpointUrl: 'https://dns.adguard-dns.com/resolve',
    format: 'google-json',
  },
];

export const DEFAULT_DNS_CONFIG: DnsCheckerConfig = {
  domain: 'example.com',
  recordType: 'A',
  expectedValue: '93.184.215.14',
};

export const PRESET_TEST_DOMAINS = [
  { name: 'example.com', type: 'A' as const, expected: '93.184.215.14' },
  { name: 'github.com', type: 'A' as const, expected: '140.82.121.4' },
  { name: 'cloudflare.com', type: 'A' as const, expected: '104.16.132.229' },
  { name: 'wikipedia.org', type: 'MX' as const, expected: 'mx1001.wikimedia.org' },
  { name: 'google.com', type: 'TXT' as const, expected: 'v=spf1' },
];

export const MOCK_DOH_GOOGLE_RESPONSE = {
  Status: 0,
  TC: false,
  RD: true,
  RA: true,
  AD: true,
  CD: false,
  Question: [{ name: 'example.com.', type: 1 }],
  Answer: [
    {
      name: 'example.com.',
      type: 1,
      TTL: 3600,
      data: '93.184.215.14',
    },
  ],
};
