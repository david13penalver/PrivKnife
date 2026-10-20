import { ToolDefinition } from '../../../core/models/tool.model';

export const emergencyRecoveryKitTool: ToolDefinition = {
  id: 'emergency-recovery-kit',
  name: 'Printable Emergency Recovery & Password Kit Sheet',
  i18nKey: 'emergencyRecoveryKit',
  category: 'privacy',
  description:
    'Generate tamper-evident physical paper vaults for master passwords, 2FA backup codes, 12/24-word cryptocurrency seeds, and emergency directives with offline SHA-256 verification.',
  keywords: [
    'emergency password sheet printable recovery kit digital legacy pdf safe deposit box',
    'emergency recovery kit',
    'emergency password sheet',
    'recovery kit',
    'crypto seed sheet',
    'paper vault',
    '2fa recovery codes sheet',
    'digital legacy kit',
  ],
  icon: 'shield',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./emergency-recovery-kit.component').then(
      (m) => m.EmergencyRecoveryKitComponent
    ),
};

export * from './types';
export * from './engine';
export * from './emergency-recovery-kit.component';
