import { PiiScrubberAnonymizerOptions } from './types';

export const DEFAULT_SCRUBBER_OPTIONS: PiiScrubberAnonymizerOptions = {
  scrubEmails: true,
  scrubPhoneNumbers: true,
  scrubIpAddresses: true,
  scrubCreditCards: true,
  scrubSsnNationalIds: true,
  scrubApiTokens: true,
  redactionMode: 'replacement_tag',
  customSalt: 'privknife_salt_2026',
  outputFormat: 'txt',
};

export const MASK_SCRUBBER_OPTIONS: PiiScrubberAnonymizerOptions = {
  scrubEmails: true,
  scrubPhoneNumbers: true,
  scrubIpAddresses: true,
  scrubCreditCards: true,
  scrubSsnNationalIds: true,
  scrubApiTokens: true,
  redactionMode: 'mask_characters',
  customSalt: 'privknife_salt_2026',
  outputFormat: 'csv',
};

export const PSEUDONYM_SCRUBBER_OPTIONS: PiiScrubberAnonymizerOptions = {
  scrubEmails: true,
  scrubPhoneNumbers: true,
  scrubIpAddresses: true,
  scrubCreditCards: true,
  scrubSsnNationalIds: true,
  scrubApiTokens: true,
  redactionMode: 'salted_hash_pseudonym',
  customSalt: 'prod_secure_salt_8871',
  outputFormat: 'json',
};

export const SAMPLE_SERVER_LOG = `[2026-10-14 10:14:22] INFO auth: User alice@acme.corp logged in from IP 192.168.1.45.
[2026-10-14 10:14:25] DEBUG billing: Customer phone +1 (555) 234-5678 provided SSN 123-45-6789.
[2026-10-14 10:14:28] WARN payment: Transaction attempted with card 4532-1234-5678-9014.
[2026-10-14 10:14:30] ERROR api: Unauthorized request using token sk_live_51M0abcdef1234567890.
[2026-10-14 10:14:32] INFO contact: Second contact bob.smith@gmail.com verified from 10.0.0.12.`;

export const SAMPLE_CSV_DATA = `id,name,email,ip,phone
1,Alice Johnson,alice@acme.corp,192.168.1.45,(555) 234-5678
2,Bob Smith,bob.smith@gmail.com,10.0.0.12,+1-555-876-5432`;

export function createSyntheticLogFile(
  name: string = 'access.log',
  content: string = SAMPLE_SERVER_LOG
): File {
  return new File([content], name, { type: 'text/plain' });
}

export function createSyntheticCsvFile(
  name: string = 'customers.csv',
  content: string = SAMPLE_CSV_DATA
): File {
  return new File([content], name, { type: 'text/csv' });
}
