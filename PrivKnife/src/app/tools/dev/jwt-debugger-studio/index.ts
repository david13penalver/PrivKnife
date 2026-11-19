import { ToolDefinition } from '../../../core/models/tool.model';

export const jwtDebuggerStudioTool: ToolDefinition = {
  id: 'jwt-debugger-studio',
  name: 'JWT Debugger, Signature Verifier & Token Minting Studio',
  category: 'dev',
  description:
    'Decode, inspect RFC 7519 claims, verify HS256/RS256/PS256/ES256 signatures, and mint local dev JWTs with Web Crypto — zero secrets leave your browser.',
  keywords: [
    'jwt decoder',
    'jwt verifier',
    'jwt debugger',
    'hs256',
    'rs256',
    'es256',
    'jwk',
    'pem',
    'offline jwt',
  ],
  icon: '🔑',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./jwt-debugger-studio.component').then(
      (m) => m.JwtDebuggerStudioComponent
    ),
};
