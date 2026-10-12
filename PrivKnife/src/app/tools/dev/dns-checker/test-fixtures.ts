import {
  DnsCheckerConfig,
  DohProvider,
  WhoisResult,
} from './types';

export const GLOBAL_DOH_PROVIDERS: DohProvider[] = [
  {
    id: 'cloudflare-us',
    name: 'Cloudflare Anycast',
    region: 'North America',
    city: 'San Francisco, US',
    ip: '1.1.1.1',
    endpointUrl: 'https://cloudflare-dns.com/dns-query',
    format: 'ietf-doh',
  },
  {
    id: 'google-us',
    name: 'Google Public DNS',
    region: 'North America',
    city: 'Mountain View, US',
    ip: '8.8.8.8',
    endpointUrl: 'https://dns.google/resolve',
    format: 'google-json',
  },
  {
    id: 'quad9-us',
    name: 'Quad9 Anycast',
    region: 'North America',
    city: 'Berkeley, US',
    ip: '9.9.9.9',
    endpointUrl: 'https://dns.quad9.net:5053/dns-query',
    format: 'ietf-doh',
  },
  {
    id: 'adguard-us',
    name: 'AdGuard DNS',
    region: 'North America',
    city: 'Dallas, US',
    ip: '94.140.14.14',
    endpointUrl: 'https://dns.adguard-dns.com/resolve',
    format: 'google-json',
  },
  {
    id: 'cloudflare-eu',
    name: 'Cloudflare Europe',
    region: 'Europe',
    city: 'London, UK',
    ip: '1.0.0.1',
    endpointUrl: 'https://1.1.1.1/dns-query',
    format: 'ietf-doh',
  },
  {
    id: 'quad9-eu',
    name: 'Quad9 Europe',
    region: 'Europe',
    city: 'Zurich, Switzerland',
    ip: '9.9.9.11',
    endpointUrl: 'https://dns.quad9.net:5053/dns-query',
    format: 'ietf-doh',
  },
  {
    id: 'google-asia',
    name: 'Google Asia-Pacific',
    region: 'Asia-Pacific',
    city: 'Tokyo, Japan',
    ip: '8.8.4.4',
    endpointUrl: 'https://dns.google/resolve',
    format: 'google-json',
  },
  {
    id: 'adguard-eu',
    name: 'AdGuard Europe',
    region: 'Europe',
    city: 'Frankfurt, Germany',
    ip: '94.140.15.15',
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

export const MOCK_RDAP_WHOIS_RESPONSE = {
  handle: '2336799_DOMAIN_COM-VRSN',
  ldhName: 'EXAMPLE.COM',
  status: ['clientDeleteProhibited', 'clientTransferProhibited', 'clientUpdateProhibited'],
  entities: [
    {
      roles: ['registrar'],
      vcardArray: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'RESERVED-Internet Assigned Numbers Authority'],
        ],
      ],
    },
  ],
  events: [
    { eventAction: 'registration', eventDate: '1995-08-14T04:00:00Z' },
    { eventAction: 'expiration', eventDate: '2026-08-13T04:00:00Z' },
    { eventAction: 'last changed', eventDate: '2025-08-14T07:01:38Z' },
  ],
  nameservers: [{ ldhName: 'A.IANA-SERVERS.NET' }, { ldhName: 'B.IANA-SERVERS.NET' }],
};
