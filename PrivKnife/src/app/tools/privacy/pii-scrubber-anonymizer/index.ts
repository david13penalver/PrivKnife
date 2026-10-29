import { ToolDefinition } from '../../../core/models/tool.model';

export const piiScrubberAnonymizerTool: ToolDefinition = {
  id: 'pii-scrubber-anonymizer',
  name: 'PII Log & CSV Scrubber & Data Anonymizer',
  i18nKey: 'piiScrubberAnonymizer',
  category: 'privacy',
  description:
    'Detect and redact Personally Identifiable Information (emails, phone numbers, IP addresses, credit cards, SSNs, API tokens) from logs and CSVs 100% locally in your browser.',
  keywords: [
    'pii scrubber online sanitize logs anonymize csv gdpr hipaa compliance',
    'pii anonymizer',
    'sanitize logs',
    'anonymize csv data',
    'remove pii from text',
    'mask sensitive data',
    'gdpr pii scrubber',
  ],
  icon: 'file-check',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pii-scrubber-anonymizer.component').then(
      (m) => m.PiiScrubberAnonymizerComponent
    ),
};

export * from './types';
export * from './engine';
export * from './pii-scrubber-anonymizer.component';
