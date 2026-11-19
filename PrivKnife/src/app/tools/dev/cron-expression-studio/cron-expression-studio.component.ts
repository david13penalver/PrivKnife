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
  evaluateCronSchedule,
  exportRunsToCsv,
  exportRunsToJson,
  isValidIanaTimezone,
  updateCronFieldAt,
} from './engine';
import { CRON_PRESETS } from './test-fixtures';
import {
  CURATED_IANA_TIMEZONES,
  CronFieldName,
  CronFormatMode,
  CronSnippetTarget,
  CronStudioResult,
  ParsedCronField,
} from './types';

function detectLocalTimezone(): string {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolved && isValidIanaTimezone(resolved) ? resolved : 'UTC';
  } catch {
    return 'UTC';
  }
}

@Component({
  selector: 'app-cron-expression-studio',
  standalone: true,
  imports: [FormsModule, Badge, Button, Card, TranslatePipe],
  templateUrl: './cron-expression-studio.component.html',
  styleUrl: './cron-expression-studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronExpressionStudioComponent implements OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly detectedLocalTimezone = detectLocalTimezone();

  readonly presets = CRON_PRESETS;
  readonly simulationCounts: ReadonlyArray<10 | 20 | 50> = [10, 20, 50];
  readonly snippetTabs: ReadonlyArray<{ id: CronSnippetTarget; label: string }> = [
    { id: 'crontab', label: 'crontab' },
    { id: 'githubActions', label: 'GitHub Actions' },
    { id: 'kubernetes', label: 'Kubernetes' },
    { id: 'nodeCron', label: 'Node.js' },
  ];

  readonly expression = signal<string>('*/15 9-17 * * MON-FRI');
  readonly format = signal<CronFormatMode>('standard_5');
  readonly timezone = signal<string>(this.detectedLocalTimezone);
  readonly simulationCount = signal<10 | 20 | 50>(10);
  readonly explainerLocale = signal<'en' | 'es'>(
    this.i18n.currentLang()?.code === 'es' ? 'es' : 'en'
  );
  readonly activeBuilderField = signal<CronFieldName>('minutes');
  readonly activeSnippetTab = signal<CronSnippetTarget>('crontab');
  readonly intervalStep = signal<number>(5);
  readonly rangeStart = signal<number>(9);
  readonly rangeEnd = signal<number>(17);
  readonly referenceDateMs = signal<number | undefined>(undefined);
  readonly copyFeedback = signal<string | null>(null);

  readonly availableTimezones = computed<string[]>(() => {
    const local = this.detectedLocalTimezone;
    return CURATED_IANA_TIMEZONES.includes(local)
      ? [...CURATED_IANA_TIMEZONES]
      : [local, ...CURATED_IANA_TIMEZONES];
  });

  readonly builderFields = computed<ReadonlyArray<{ id: CronFieldName; label: string }>>(() => {
    const base: Array<{ id: CronFieldName; label: string }> = [
      { id: 'minutes', label: 'Minute (0-59)' },
      { id: 'hours', label: 'Hour (0-23)' },
      { id: 'daysOfMonth', label: 'Day (1-31)' },
      { id: 'months', label: 'Month (1-12)' },
      { id: 'daysOfWeek', label: 'Weekday (0-6)' },
    ];
    return this.format() === 'extended_6'
      ? [{ id: 'seconds', label: 'Second (0-59)' }, ...base]
      : base;
  });

  readonly result = computed<CronStudioResult>(() =>
    evaluateCronSchedule({
      expression: this.expression(),
      format: this.format(),
      timezone: this.timezone(),
      simulationCount: this.simulationCount(),
      locale: this.explainerLocale(),
      referenceDateMs: this.referenceDateMs(),
    })
  );

  readonly fieldTokens = computed<Array<{ name: CronFieldName; label: string; value: string }>>(() => {
    const raw = this.expression().trim();
    const parts = raw ? raw.split(/\s+/) : [];
    if (this.format() === 'extended_6') {
      return [
        { name: 'seconds', label: 'SEC', value: parts[0] ?? '0' },
        { name: 'minutes', label: 'MIN', value: parts[1] ?? '*' },
        { name: 'hours', label: 'HOUR', value: parts[2] ?? '*' },
        { name: 'daysOfMonth', label: 'DOM', value: parts[3] ?? '*' },
        { name: 'months', label: 'MON', value: parts[4] ?? '*' },
        { name: 'daysOfWeek', label: 'DOW', value: parts[5] ?? '*' },
      ];
    }
    return [
      { name: 'minutes', label: 'MIN', value: parts[0] ?? '*' },
      { name: 'hours', label: 'HOUR', value: parts[1] ?? '*' },
      { name: 'daysOfMonth', label: 'DOM', value: parts[2] ?? '*' },
      { name: 'months', label: 'MON', value: parts[3] ?? '*' },
      { name: 'daysOfWeek', label: 'DOW', value: parts[4] ?? '*' },
    ];
  });

  readonly activeSnippetCode = computed<string>(
    () => this.result().snippets[this.activeSnippetTab()]
  );

  readonly builderChips = computed<number[]>(() => {
    const bounds: Readonly<Record<CronFieldName, [number, number]>> = {
      seconds: [0, 59],
      minutes: [0, 59],
      hours: [0, 23],
      daysOfMonth: [1, 31],
      months: [1, 12],
      daysOfWeek: [0, 6],
    };
    const [min, max] = bounds[this.activeBuilderField()];
    const out: number[] = [];
    for (let v = min; v <= max; v += 1) {
      out.push(v);
    }
    return out;
  });

  readonly selectedFieldValues = computed<Set<number>>(() => {
    const ast = this.result().ast;
    if (!ast) {
      return new Set<number>();
    }
    const field: ParsedCronField = ast[this.activeBuilderField()];
    if (field.isWildcard) {
      return new Set<number>();
    }
    return new Set<number>(field.values);
  });

  private readonly createdObjectUrls: string[] = [];
  private readonly pendingRevokeTimers = new Set<ReturnType<typeof setTimeout>>();

  setFormat(nextFormat: CronFormatMode): void {
    const current = this.format();
    if (current === nextFormat) {
      return;
    }
    const trimmed = this.expression().trim();
    if (!trimmed.startsWith('@')) {
      const tokens = trimmed ? trimmed.split(/\s+/) : [];
      if (nextFormat === 'extended_6' && tokens.length === 5) {
        this.expression.set(`0 ${tokens.join(' ')}`);
      } else if (nextFormat === 'standard_5' && tokens.length === 6) {
        this.expression.set(tokens.slice(1).join(' '));
        if (this.activeBuilderField() === 'seconds') {
          this.activeBuilderField.set('minutes');
        }
      }
    }
    this.format.set(nextFormat);
  }

  setExplainerLocale(locale: 'en' | 'es'): void {
    this.explainerLocale.set(locale);
  }

  setSimulationCount(raw: unknown): void {
    const n = Number(raw);
    this.simulationCount.set(n === 50 ? 50 : n === 20 ? 20 : 10);
  }

  setActiveBuilderField(field: CronFieldName): void {
    this.activeBuilderField.set(field);
  }

  applyPreset(presetId: string): void {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) {
      return;
    }
    this.format.set(preset.format);
    this.expression.set(preset.expression);
  }

  applyFieldEvery(): void {
    this.expression.set(
      updateCronFieldAt(this.expression(), this.format(), this.activeBuilderField(), '*')
    );
  }

  applyFieldInterval(step: number): void {
    const safeStep = Math.max(1, Math.floor(step || 1));
    this.intervalStep.set(safeStep);
    this.expression.set(
      updateCronFieldAt(
        this.expression(),
        this.format(),
        this.activeBuilderField(),
        `*/${safeStep}`
      )
    );
  }

  applyFieldRange(start: number, end: number): void {
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    this.rangeStart.set(lo);
    this.rangeEnd.set(hi);
    this.expression.set(
      updateCronFieldAt(
        this.expression(),
        this.format(),
        this.activeBuilderField(),
        `${lo}-${hi}`
      )
    );
  }

  toggleChipValue(value: number): void {
    const fieldName = this.activeBuilderField();
    const ast = this.result().ast;
    const field = ast?.[fieldName];
    let nextValues: number[];

    if (!field || field.isWildcard) {
      nextValues = [value];
    } else {
      const set = new Set(field.values);
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      nextValues = Array.from(set).sort((a, b) => a - b);
    }

    const token = nextValues.length > 0 ? nextValues.join(',') : '*';
    this.expression.set(
      updateCronFieldAt(this.expression(), this.format(), fieldName, token)
    );
  }

  async copyExpression(): Promise<void> {
    await this.copyText(this.expression().trim(), 'Cron');
  }

  async copySnippet(): Promise<void> {
    await this.copyText(this.activeSnippetCode(), this.activeSnippetTab());
  }

  exportJson(): void {
    const json = exportRunsToJson(this.result());
    this.triggerBlobDownload(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
      'cron-schedule-runs.json'
    );
  }

  exportCsv(): void {
    const csv = exportRunsToCsv(this.result());
    this.triggerBlobDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      'cron-schedule-runs.csv'
    );
  }

  reset(): void {
    this.format.set('standard_5');
    this.expression.set('*/15 9-17 * * MON-FRI');
    this.timezone.set(this.detectedLocalTimezone);
    this.simulationCount.set(10);
    this.copyFeedback.set(null);
    this.revokeAllObjectUrls();
  }

  ngOnDestroy(): void {
    this.revokeAllObjectUrls();
  }

  private async copyText(text: string, label: string): Promise<void> {
    if (!text) {
      return;
    }
    try {
      await globalThis.navigator?.clipboard?.writeText?.(text);
      this.copyFeedback.set(label);
    } catch {
      this.copyFeedback.set(null);
    }
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
