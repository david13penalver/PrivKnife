import { JwtPreset } from './types';

function encodeBase64UrlText(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export const FIXED_NOW_SECONDS = 1_750_000_000;

export const RFC_HS256_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

export const RFC_HS256_SECRET = 'your-256-bit-secret';
export const RFC_HS256_SECRET_BASE64URL = 'eW91ci0yNTYtYml0LXNlY3JldA';
export const RFC_HS256_SECRET_BASE64_PADDED = 'eW91ci0yNTYtYml0LXNlY3JldA==';

export const UTF8_HS256_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfNDIiLCJuYW1lIjoiU29mw61hIE3DvGxsZXIg8J-agCIsImNpdHkiOiLmnbHkuqwiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.0JR8Y3-1dhaDWLwbnckwHX-cehzUPwgHhauZ-igJRb8';

export const UTF8_HS256_SECRET = 'privknife-local-dev-secret-2026';

export const ALG_NONE_TOKEN = `${encodeBase64UrlText(
  JSON.stringify({ alg: 'none', typ: 'JWT' })
)}.${encodeBase64UrlText(JSON.stringify({ sub: 'admin', role: 'superuser' }))}.`;

export const ALG_NONE_MIXED_CASE_TOKEN = `${encodeBase64UrlText(
  JSON.stringify({ alg: 'NoNe', typ: 'JWT' })
)}.${encodeBase64UrlText(JSON.stringify({ sub: 'admin' }))}.fakesig`;

export const EXPIRED_NBF_SKEW_TOKEN = `${encodeBase64UrlText(
  JSON.stringify({
    alg: 'HS256',
    typ: 'JWT',
    jku: 'https://evil.example/jwks.json',
    crit: ['exp'],
  })
)}.${encodeBase64UrlText(
  JSON.stringify({
    sub: 'usr_skew',
    iss: 'https://auth.example.local',
    aud: ['api-a', 'api-b'],
    jti: 'tok-001',
    exp: FIXED_NOW_SECONDS - 3600,
    nbf: FIXED_NOW_SECONDS + 1800,
    iat: FIXED_NOW_SECONDS + 900,
  })
)}.c2ln`;

export const JWE_FIVE_PART_TOKEN = 'a.b.c.d.e';

export const MALFORMED_PKCS1_PEM =
  '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEA\n-----END RSA PUBLIC KEY-----';

export const JWT_DEMO_PRESETS: readonly JwtPreset[] = [
  {
    id: 'hs256_sample',
    labelKey: 'tools.jwtDebuggerStudio.presetHs256',
    token: RFC_HS256_TOKEN,
    keyInput: RFC_HS256_SECRET,
    keyFormat: 'hmac_utf8',
  },
  {
    id: 'utf8_sample',
    labelKey: 'tools.jwtDebuggerStudio.presetUtf8',
    token: UTF8_HS256_TOKEN,
    keyInput: UTF8_HS256_SECRET,
    keyFormat: 'hmac_utf8',
  },
  {
    id: 'alg_none_demo',
    labelKey: 'tools.jwtDebuggerStudio.presetAlgNone',
    token: ALG_NONE_TOKEN,
    keyInput: '',
    keyFormat: 'hmac_utf8',
  },
];
