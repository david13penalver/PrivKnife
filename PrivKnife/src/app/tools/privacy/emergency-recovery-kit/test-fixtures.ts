import { EmergencyRecoveryKitOptions } from './types';

export const DEFAULT_EMERGENCY_KIT_OPTIONS: EmergencyRecoveryKitOptions = {
  paperFormat: 'a4',
  kitTitle: 'CONFIDENTIAL EMERGENCY SUCCESSION & RECOVERY KIT',
  vaultCustodian: 'Designated Digital Vault Custodian',
  includeMasterVaultSection: true,
  includeTwoFaCodesSection: true,
  includeSeedPhraseSection: true,
  seedPhraseWordCount: 24,
  includeEmergencyContacts: true,
  includeTamperFoldSeals: true,
  includeOfflineChecksumQr: true,
  highContrastMonochrome: false,
  additionalInstructions:
    'Store strictly in a fireproof safe, bank deposit box, or with legal counsel. Never photograph, scan, or upload this physical document.',
};

export const SAMPLE_CRYPTO_VAULT_OPTIONS: EmergencyRecoveryKitOptions = {
  paperFormat: 'a4',
  kitTitle: 'COLD STORAGE CRYPTOGRAPHIC RECOVERY SHEET',
  vaultCustodian: 'Keyholder Primary',
  includeMasterVaultSection: false,
  includeTwoFaCodesSection: false,
  includeSeedPhraseSection: true,
  seedPhraseWordCount: 12,
  includeEmergencyContacts: true,
  includeTamperFoldSeals: true,
  includeOfflineChecksumQr: true,
  highContrastMonochrome: true,
  additionalInstructions:
    'Requires physical tamper seal verification prior to opening.',
};
