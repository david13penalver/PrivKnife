import { ToolDefinition } from '../../../core/models/tool.model';

export const fileEncryptorVaultTool: ToolDefinition = {
  id: 'file-encryptor-vault',
  name: 'Zero-Knowledge File Encryptor & Vault',
  i18nKey: 'fileEncryptorVault',
  category: 'privacy',
  description:
    'Military-grade client-side file encryption and decryption using AES-256-GCM and PBKDF2 with zero server knowledge.',
  keywords: [
    'file encryptor online zero knowledge aes 256 gcm password protect client side',
    'encrypt file browser',
    'zero knowledge vault',
    'aes 256 file encryption',
    'decrypt priv file',
    'client side file locker',
    'password protect file offline',
  ],
  icon: 'shield-check',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./file-encryptor-vault.component').then(
      (m) => m.FileEncryptorVaultComponent
    ),
};

export * from './types';
export * from './engine';
export * from './file-encryptor-vault.component';
