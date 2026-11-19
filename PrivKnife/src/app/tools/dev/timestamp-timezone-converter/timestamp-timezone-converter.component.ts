import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge, Button, Card } from '../../../components';
import { I18nService, TranslatePipe } from '../../../core/i18n';
import {
  applyTimestampOffset,
  computeTimestampDelta,
  convertBatchTimestamps,
  exportBatchToCsv,
  exportBatchToJson,
  getSupportedIanaTimezones,
  parseTimestampInput,
} from './engine';
import { MIXED_BATCH_SAMPLE, NANOSECOND_VECTOR } from './test-fixtures';
import {
  BatchTimestampRow,
  DEFAULT_PINNED_TIMEZONES,
  DISCORD_TAG_STYLES,
  EpochUnit,
  ParsedTimestampOutput,
  TimestampDeltaResult,
} from './types';

export type TimestampStudioTab = 'converter' | 'delta' | 'batch';

@Component({
  selector: 'app-timestamp-timezone-converter',
  standalone: true,
  imports: [FormsModule, Badge, Button, Card, TranslatePipe],
  templateUrl: './timestamp-timezone-converter.component.html',
  styleUrl: './timestamp-timezone-converter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimestampTimezoneConverterComponent implements OnDestroy {
  private readonly i18n = inject(I18nService);

  readonly supportedTimezones = getSupportedIanaTimezones();
  readonly discordTagStyles = DISCORD_TAG_STYLES;

  readonly activeTab = signal<TimestampStudioTab>('converter');
  readonly nowMs = signal<number>(Date.now());
  readonly isClockPaused = signal<boolean>(false);

  readonly nowEpochSeconds = computed<number>(() =>
    Math.floor(this.nowMs() / 1000)
  );
  readonly nowEpochMilliseconds = computed<number>(() => this.nowMs());

  readonly inputText = signal<string>(NANOSECOND_VECTOR);
  readonly unitOverride = signal<EpochUnit>('auto');
  readonly pinnedTimezones = signal<string[]>([...DEFAULT_PINNED_TIMEZONES]);
  readonly zoneToAdd = signal<string>('Europe/Berlin');

  readonly parsedResult = computed<ParsedTimestampOutput>(() => {
    const lang = this.i18n.currentLang()?.code === 'es' ? 'es' : 'en';
    return parseTimestampInput(
      this.inputText(),
      this.unitOverride(),
      this.pinnedTimezones(),
      this.nowMs(),
      lang
    );
  });

  readonly deltaStartInput = signal<string>('2026-01-05T00:00:00Z');
  readonly deltaEndInput = signal<string>('2026-01-07T14:32:10Z');
  readonly offsetDays = signal<number>(0);
  readonly offsetHours = signal<number>(2);
  readonly offsetMinutes = signal<number>(0);
  readonly offsetSeconds = signal<number>(0);

  readonly deltaStartParsed = computed<ParsedTimestampOutput>(() =>
    parseTimestampInput(this.deltaStartInput(), 'auto', ['UTC'], this.nowMs())
  );
  readonly deltaEndParsed = computed<ParsedTimestampOutput>(() =>
    parseTimestampInput(this.deltaEndInput(), 'auto', ['UTC'], this.nowMs())
  );

  readonly deltaResult = computed<TimestampDeltaResult | null>(() => {
    const s = this.deltaStartParsed();
    const e = this.deltaEndParsed();
    if (!s.valid || !e.valid) {
      return null;
    }
    return computeTimestampDelta(s.epochMsNumber, e.epochMsNumber);
  });

  readonly batchInput = signal<string>(MIXED_BATCH_SAMPLE);
  readonly batchTimezone = signal<string>('UTC');
  readonly batchRows = computed<BatchTimestampRow[]>(() =>
    convertBatchTimestamps(this.batchInput(), this.batchTimezone(), 'auto')
  );

  readonly copyFeedback = signal<string | null>(null);

  private clockIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly createdObjectUrls: string[] = [];
  private readonly pendingRevokeTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.clockIntervalId = setInterval(() => {
        if (!this.isClockPaused()) {
          this.nowMs.set(Date.now());
        }
      }, 1000);
    }
  }

  setActiveTab(tab: TimestampStudioTab): void {
    this.activeTab.set(tab);
  }

  toggleClockPause(): void {
    this.isClockPaused.update((paused) => !paused);
  }

  useNowInConverter(): void {
    const current = Date.now();
    this.nowMs.set(current);
    this.unitOverride.set('auto');
    this.inputText.set(String(Math.floor(current / 1000)));
  }

  pinTimezone(tz: string): void {
    if (!tz || this.pinnedTimezones().includes(tz)) {
      return;
    }
    this.pinnedTimezones.update((list) => [...list, tz]);
  }

  unpinTimezone(tz: string): void {
    this.pinnedTimezones.update((list) => list.filter((item) => item !== tz));
  }

  applyOffsetToEnd(): void {
    const start = this.deltaStartParsed();
    if (!start.valid) {
      return;
    }
    const nextMs = applyTimestampOffset(start.epochMsNumber, {
      days: this.offsetDays(),
      hours: this.offsetHours(),
      minutes: this.offsetMinutes(),
      seconds: this.offsetSeconds(),
    });
    this.deltaEndInput.set(new Date(nextMs).toISOString());
  }

  async copyText(value: string, label: string): Promise<void> {
    if (!value) {
      return;
    }
    try {
      await globalThis.navigator?.clipboard?.writeText?.(value);
      this.copyFeedback.set(label);
    } catch {
      this.copyFeedback.set(null);
    }
  }

  exportBatchCsv(): void {
    const csv = exportBatchToCsv(this.batchRows());
    this.triggerBlobDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      'privknife-batch-timestamps.csv'
    );
  }

  exportBatchJson(): void {
    const json = exportBatchToJson(this.batchRows());
    this.triggerBlobDownload(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
      'privknife-batch-timestamps.json'
    );
  }

  reset(): void {
    this.inputText.set(NANOSECOND_VECTOR);
    this.unitOverride.set('auto');
    this.pinnedTimezones.set([...DEFAULT_PINNED_TIMEZONES]);
    this.deltaStartInput.set('2026-01-05T00:00:00Z');
    this.deltaEndInput.set('2026-01-07T14:32:10Z');
    this.batchInput.set(MIXED_BATCH_SAMPLE);
    this.batchTimezone.set('UTC');
    this.copyFeedback.set(null);
    this.revokeAllObjectUrls();
  }

  ngOnDestroy(): void {
    if (this.clockIntervalId !== null) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }
    this.revokeAllObjectUrls();
  }

  private triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.push(url);

    if (typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
    }

    const timerId = setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = this.createdObjectUrls.indexOf(url);
      if (idx !== -1) {
        this.createdObjectUrls.splice(idx, 1);
      }
      this.pendingRevokeTimers.delete(timerId);
    }, 150);
    this.pendingRevokeTimers.add(timerId);
  }

  private revokeAllObjectUrls(): void {
    for (const timerId of this.pendingRevokeTimers) {
      clearTimeout(timerId);
    }
    this.pendingRevokeTimers.clear();

    while (this.createdObjectUrls.length > 0) {
      const url = this.createdObjectUrls.pop();
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }
}
