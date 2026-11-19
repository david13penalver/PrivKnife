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
  buildFlagsString,
  buildHighlightSegments,
  executeRegexMatch,
  explainRegexPattern,
  exportMatchesToCsv,
  exportMatchesToJson,
  generateRegexCode,
} from './engine';
import { REGEX_PATTERN_PRESETS } from './test-fixtures';
import {
  DEFAULT_REGEX_FLAGS,
  DEFAULT_REGEX_TESTER_OPTIONS,
  RegexCodeLanguage,
  RegexFlagsConfig,
  RegexMatchEntry,
  RegexPreset,
  RegexTesterOptions,
  RegexTesterResult,
} from './types';
import { RegexWatchdogRunner, WorkerLike } from './worker';

export type InspectorTab = 'ast' | 'matches' | 'codegen' | 'library';

@Component({
  selector: 'app-regex-tester-debugger',
  standalone: true,
  imports: [FormsModule, Badge, Button, Card, TranslatePipe],
  templateUrl: './regex-tester-debugger.component.html',
  styleUrl: './regex-tester-debugger.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegexTesterDebuggerComponent implements OnDestroy {
  private readonly i18n = inject(I18nService);

  readonly pattern = signal<string>(DEFAULT_REGEX_TESTER_OPTIONS.pattern);
  readonly flags = signal<RegexFlagsConfig>({ ...DEFAULT_REGEX_FLAGS });
  readonly testString = signal<string>(DEFAULT_REGEX_TESTER_OPTIONS.testString);
  readonly replacement = signal<string>(DEFAULT_REGEX_TESTER_OPTIONS.replacement);
  readonly runReplace = signal<boolean>(DEFAULT_REGEX_TESTER_OPTIONS.runReplace);
  readonly timeoutMs = signal<number>(DEFAULT_REGEX_TESTER_OPTIONS.timeoutMs);

  readonly activeInspectorTab = signal<InspectorTab>('ast');
  readonly selectedCodeLanguage = signal<RegexCodeLanguage>('typescript');
  readonly result = signal<RegexTesterResult | null>(null);
  readonly isRunning = signal<boolean>(false);
  readonly copiedCode = signal<boolean>(false);

  readonly presets = REGEX_PATTERN_PRESETS;

  private watchdogRunner: RegexWatchdogRunner | null = null;
  private readonly createdObjectUrls = new Set<string>();
  private readonly spawnedWorkers = new Set<Worker>();

  readonly flagsDisplay = computed(() => buildFlagsString(this.flags()));

  readonly highlightSegments = computed(() => {
    const res = this.result();
    const corpus = this.testString();
    if (!res?.valid) {
      return corpus
        ? [{ text: corpus, matchIndex: null, alternate: false }]
        : [];
    }
    return buildHighlightSegments(corpus, res.matches);
  });

  readonly generatedCode = computed(() =>
    generateRegexCode(
      this.pattern(),
      this.flags(),
      this.selectedCodeLanguage(),
      this.replacement(),
      this.runReplace()
    )
  );

  ngOnDestroy(): void {
    this.disposeWatchdog();
    this.revokeAllObjectUrls();
  }

  updatePattern(val: string): void {
    this.pattern.set(val);
    void this.runTest();
  }

  updateTestString(val: string): void {
    this.testString.set(val);
    void this.runTest();
  }

  updateReplacement(val: string): void {
    this.replacement.set(val);
    if (this.runReplace()) {
      void this.runTest();
    }
  }

  toggleReplaceMode(enabled: boolean): void {
    this.runReplace.set(enabled);
    void this.runTest();
  }

  toggleFlag(flag: keyof RegexFlagsConfig): void {
    const cur = this.flags();
    this.flags.set({ ...cur, [flag]: !cur[flag] });
    void this.runTest();
  }

  setInspectorTab(tab: InspectorTab): void {
    this.activeInspectorTab.set(tab);
    this.copiedCode.set(false);
  }

  setCodeLanguage(lang: RegexCodeLanguage): void {
    this.selectedCodeLanguage.set(lang);
    this.copiedCode.set(false);
  }

  loadPreset(preset: RegexPreset): void {
    this.pattern.set(preset.pattern);
    this.flags.set({ ...preset.flags });
    this.testString.set(preset.sampleText);
    this.replacement.set(preset.sampleReplacement);
    void this.runTest();
  }

  async runTest(): Promise<void> {
    const options: RegexTesterOptions = {
      pattern: this.pattern(),
      flags: this.flags(),
      testString: this.testString(),
      replacement: this.replacement(),
      runReplace: this.runReplace(),
      timeoutMs: this.timeoutMs(),
      maxMatches: DEFAULT_REGEX_TESTER_OPTIONS.maxMatches,
    };

    const lang = this.i18n.currentLang()?.code === 'es' ? 'es' : 'en';
    this.isRunning.set(true);

    try {
      if (typeof Worker !== 'undefined') {
        if (!this.watchdogRunner) {
          this.watchdogRunner = new RegexWatchdogRunner(() =>
            this.createManagedWorker()
          );
        }
        const workerRes = await this.watchdogRunner.run(options, lang);
        this.result.set(workerRes);
      } else {
        const directRes = executeRegexMatch(options, lang);
        this.result.set({
          ...directRes,
          explanation: explainRegexPattern(options.pattern, options.flags, lang),
        });
      }
    } finally {
      this.isRunning.set(false);
    }
  }

  async copyCodeSnippet(): Promise<void> {
    const code = this.generatedCode();
    if (!code) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
    }
    this.copiedCode.set(true);
  }

  exportMatches(format: 'json' | 'csv'): void {
    const matches = this.result()?.matches ?? [];
    const content =
      format === 'csv'
        ? exportMatchesToCsv(matches)
        : exportMatchesToJson(matches);
    const mime =
      format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = `regex-matches.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      this.createdObjectUrls.delete(url);
    }, 150);
  }

  reset(): void {
    this.disposeWatchdog();
    this.revokeAllObjectUrls();
    this.pattern.set(DEFAULT_REGEX_TESTER_OPTIONS.pattern);
    this.flags.set({ ...DEFAULT_REGEX_FLAGS });
    this.testString.set(DEFAULT_REGEX_TESTER_OPTIONS.testString);
    this.replacement.set(DEFAULT_REGEX_TESTER_OPTIONS.replacement);
    this.runReplace.set(false);
    this.copiedCode.set(false);
    this.result.set(null);
  }

  private createManagedWorker(): WorkerLike {
    const worker = new Worker(new URL('./worker', import.meta.url), {
      type: 'module',
    });
    this.spawnedWorkers.add(worker);
    worker.onerror = () => {
      worker.terminate();
      this.spawnedWorkers.delete(worker);
    };
    return worker;
  }

  private disposeWatchdog(): void {
    if (this.watchdogRunner) {
      this.watchdogRunner.dispose();
      this.watchdogRunner = null;
    }
    for (const w of this.spawnedWorkers) {
      w.terminate();
    }
    this.spawnedWorkers.clear();
  }

  getNamedGroupEntries(entry: RegexMatchEntry): Array<[string, string | undefined]> {
    return Object.entries(entry.namedGroups ?? {}).filter(([, value]) => value !== undefined);
  }

  formatGroupList(entry: RegexMatchEntry): string {
    return JSON.stringify(entry.groups);
  }

  private revokeAllObjectUrls(): void {
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls.clear();
  }
}
