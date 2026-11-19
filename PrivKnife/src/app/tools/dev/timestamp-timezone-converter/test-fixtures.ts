export const NANOSECOND_VECTOR = '1763551200123456789';

export const NEGATIVE_EPOCH_VECTOR = '-86400';

export const OUT_OF_BOUNDS_EPOCH = '999999999999999999999999999';

export const FIXED_REF_MS = Date.UTC(2025, 10, 19, 12, 20, 0);

export const MIXED_BATCH_SAMPLE = [
  '1763551200',
  '1763551200500',
  '2026-01-15T09:30:00Z',
  '2026-03-01 INFO request_id=abc ts=1763551200000 status=200',
  'not-a-valid-timestamp-line',
  '1763551200123456789',
].join('\n');
