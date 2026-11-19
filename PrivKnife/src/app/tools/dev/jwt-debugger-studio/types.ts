export type SupportedJwtAlgorithm =
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'PS256'
  | 'ES256'
  | 'ES384';

export type HmacJwtAlgorithm = 'HS256' | 'HS384' | 'HS512';

export type AsymmetricJwtAlgorithm =
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'PS256'
  | 'ES256'
  | 'ES384';

export type KeyInputFormat = 'hmac_utf8' | 'hmac_base64url' | 'pem' | 'jwk';

export interface JwtClaimAnnotation {
  claim: string;
  labelKey: string;
  rawValue: unknown;
  formattedValue: string;
  status?: 'valid' | 'expired' | 'not_yet_valid' | 'warning';
}

export interface DecodedJwtResult {
  validStructure: boolean;
  normalizedToken: string;
  headerRaw: string;
  payloadRaw: string;
  signatureRaw: string;
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  algorithm?: string;
  claims: JwtClaimAnnotation[];
  securityWarnings: string[];
  error?: string;
}

export interface JwtVerificationResult {
  verified: boolean;
  status: 'valid' | 'invalid' | 'missing_key' | 'unsupported_alg' | 'key_error';
  algorithm: string;
  error?: string;
}

export interface MintJwtOptions {
  headerJson: string;
  payloadJson: string;
  algorithm: SupportedJwtAlgorithm;
  keyInput: string;
  keyFormat: KeyInputFormat;
}

export interface MintedJwtResult {
  token: string;
  headerRaw: string;
  payloadRaw: string;
  signatureRaw: string;
  algorithm: SupportedJwtAlgorithm;
}

export interface GeneratedKeyPair {
  algorithm: AsymmetricJwtAlgorithm;
  publicKeyPem: string;
  privateKeyPem: string;
  publicKeyJwk: string;
  privateKeyJwk: string;
}

export interface JwtPreset {
  id: string;
  labelKey: string;
  token: string;
  keyInput: string;
  keyFormat: KeyInputFormat;
}

export const SUPPORTED_JWT_ALGORITHMS: readonly SupportedJwtAlgorithm[] = [
  'HS256',
  'HS384',
  'HS512',
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'ES256',
  'ES384',
];

export const ASYMMETRIC_JWT_ALGORITHMS: readonly AsymmetricJwtAlgorithm[] = [
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'ES256',
  'ES384',
];

export const MAX_JWT_INPUT_LENGTH = 262_144;
