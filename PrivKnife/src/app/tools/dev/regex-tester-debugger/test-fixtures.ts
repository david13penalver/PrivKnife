import { DEFAULT_REGEX_FLAGS, RegexPreset } from './types';

export const XSS_CORPUS_SAMPLE =
  '<script>alert(1)</script><img src=x onerror=alert(2)> Dates: 2026-11-19 and 2027-01-05';

export const REGEX_PATTERN_PRESETS: RegexPreset[] = [
  {
    id: 'iso-date',
    title: 'ISO-8601 Date (Named Groups)',
    description: 'Extracts year, month, and day into named groups.',
    pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',
    flags: { ...DEFAULT_REGEX_FLAGS },
    sampleText: 'Dates: 2026-11-19 and 2027-01-05 (deadline 2027-06-30)',
    sampleReplacement: '$<day>/$<month>/$<year>',
  },
  {
    id: 'email-rfc',
    title: 'Email Address',
    description: 'Captures local-part and domain from email tokens.',
    pattern: '(?<local>[a-zA-Z0-9._%+-]+)@(?<domain>[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
    flags: { ...DEFAULT_REGEX_FLAGS, ignoreCase: true },
    sampleText: 'Contacts: security@privknife.local, alice.ops+dev@example.org',
    sampleReplacement: '$<local> [at] $<domain>',
  },
  {
    id: 'ipv4-address',
    title: 'IPv4 Address',
    description: 'Matches bounded 0-255 octets inside server logs.',
    pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\b',
    flags: { ...DEFAULT_REGEX_FLAGS },
    sampleText: 'Allow 192.168.1.42; block 999.0.0.1 and 10.0.8.254',
    sampleReplacement: '[IP-REDACTED]',
  },
  {
    id: 'semver',
    title: 'Semantic Version (SemVer)',
    description: 'Captures major, minor, patch, and optional prerelease tag.',
    pattern: 'v?(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<pre>[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?',
    flags: { ...DEFAULT_REGEX_FLAGS },
    sampleText: 'Releases: v2.4.18, 1.0.0-rc.2, and v14.22.0',
    sampleReplacement: 'major=$<major> minor=$<minor>',
  },
  {
    id: 'jwt-token',
    title: 'JWT Compact String',
    description: 'Matches header.payload.signature Base64URL segments.',
    pattern: '(?<header>eyJ[A-Za-z0-9_-]+)\\.(?<payload>[A-Za-z0-9_-]+)\\.(?<sig>[A-Za-z0-9_-]*)',
    flags: { ...DEFAULT_REGEX_FLAGS },
    sampleText: 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123_sig',
    sampleReplacement: '[JWT_REDACTED]',
  },
  {
    id: 'hex-color',
    title: 'CSS Hex Color',
    description: 'Matches 3, 6, or 8 digit hexadecimal color literals.',
    pattern: '#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b',
    flags: { ...DEFAULT_REGEX_FLAGS },
    sampleText: 'Palette: #0f172a, #3b82f680, #fff, invalid #12345',
    sampleReplacement: 'var(--color)',
  },
  {
    id: 'card-format',
    title: 'Payment Card Pan Format',
    description: 'Matches grouped 13-19 digit card numbers for PII redaction.',
    pattern: '\\b(?:\\d[ -]*?){13,16}\\b',
    flags: { ...DEFAULT_REGEX_FLAGS },
    sampleText: 'Masked log: card 4111-1111-1111-1234 approved',
    sampleReplacement: '****-****-****-REDACTED',
  },
  {
    id: 'http-url',
    title: 'HTTP/HTTPS URL',
    description: 'Captures scheme and host of web URLs.',
    pattern: '(?<scheme>https?)://(?<host>[^\\s/$.?#].[^\\s]*)',
    flags: { ...DEFAULT_REGEX_FLAGS, ignoreCase: true },
    sampleText: 'Docs at https://example.test/docs?v=1 and http://localhost:4200/tools',
    sampleReplacement: '$<scheme>://REDACTED',
  },
];
