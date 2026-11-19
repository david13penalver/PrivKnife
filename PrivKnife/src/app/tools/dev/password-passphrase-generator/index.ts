import { ToolDefinition } from '../../../core/models/tool.model';

export const passwordPassphraseGeneratorTool: ToolDefinition = {
  id: 'password-passphrase-generator',
  i18nKey: 'passwordPassphraseGenerator',
  name: 'Password, Passphrase & API Key Generator',
  category: 'dev',
  description:
    'Generate unbiased CSPRNG passwords, EFF Diceware passphrases, and 256-bit .env secrets locally.',
  keywords: ['password', 'diceware', 'api key', 'entropy', 'csprng'],
  icon: '🔐',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./password-passphrase-generator.component').then(
      (m) => m.PasswordPassphraseGeneratorComponent,
    ),
};
