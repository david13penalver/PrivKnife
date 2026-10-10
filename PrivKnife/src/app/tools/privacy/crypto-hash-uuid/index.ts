import { ToolDefinition } from '../../../core/models/tool.model';

export const cryptoHashUuidTool: ToolDefinition = {
  id: 'crypto-hash-uuid',
  name: 'Cryptographic Hash & UUID Batch Generator',
  category: 'privacy',
  description:
    'Generate RFC 4122 UUIDv4 identifiers and calculate SHA-256, SHA-512, SHA-1, or MD5 digests in bulk with zero server roundtrips.',
  keywords: [
    'uuid generator',
    'uuidv4 batch',
    'hash generator',
    'sha256 online',
    'sha512 generator',
    'md5 bulk',
    'client side hashing',
  ],
  icon: 'hash',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./crypto-hash-uuid.component').then((m) => m.CryptoHashUuidComponent),
};

export { CryptoHashUuidComponent } from './crypto-hash-uuid.component';
export * from './types';
export * from './engine';
export * from './md5';
