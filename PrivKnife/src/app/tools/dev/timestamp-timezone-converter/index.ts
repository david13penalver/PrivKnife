import { ToolDefinition } from '../../../core/models/tool.model';

export const timestampTimezoneConverterTool: ToolDefinition = {
  id: 'timestamp-timezone-converter',
  name: 'Unix Epoch, ISO-8601 & Multi-Timezone Timestamp Converter',
  category: 'dev',
  description:
    'Auto-detect and convert Unix seconds, milliseconds, microseconds, BigInt nanoseconds, ISO-8601, Discord tags, multi-timezone views, and batch log files locally.',
  keywords: [
    'unix timestamp',
    'epoch converter',
    'iso 8601',
    'nanosecond bigint',
    'timezone converter',
    'discord timestamp',
  ],
  icon: '🕒',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./timestamp-timezone-converter.component').then(
      (m) => m.TimestampTimezoneConverterComponent
    ),
};
