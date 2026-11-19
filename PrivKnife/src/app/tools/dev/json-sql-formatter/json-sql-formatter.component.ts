import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Badge,
  Button,
  Card,
  ProgressBar,
} from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import { buildJsonTreeRows, processFormatterInput } from './engine';
import {
  SAMPLE_JSON_DOC,
  SAMPLE_SQL_QUERY,
  SAMPLE_YAML_DOC,
} from './test-fixtures';
import {
  DEFAULT_JSON_SQL_OPTIONS,
  FormatterLanguage,
  FormatterWorkerRequest,
  FormatterWorkerResponse,
  JsonOutputView,
  JsonSqlFormatterOptions,
  JsonSqlFormatterResult,
  SqlDialect,
} from './types';

const WORKER_THRESHOLD_BYTES = 250 * 1024;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

@Component({
  selector: 'app-json-sql-formatter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Badge,
    Button,
    Card,
    ProgressBar,
    TranslatePipe,
  ],
  templateUrl: './json-sql-formatter.component.html',
  styleUrl: './json-sql-formatter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonSqlFormatterComponent implements OnDestroy {
  readonly language = signal<FormatterLanguage>(DEFAULT_JSON_SQL_OPTIONS.language);
  readonly inputText = signal<string>('');
  readonly indentType = signal<'2spaces' | '4spaces' | 'tab'>(
    DEFAULT_JSON_SQL_OPTIONS.indentType
  );
  readonly sortJsonKeys = signal<boolean>(DEFAULT_JSON_SQL_OPTIONS.sortJsonKeys);
  readonly jsonOutputView = signal<JsonOutputView>(
    DEFAULT_JSON_SQL_OPTIONS.jsonOutputView
  );
  readonly jsonPathQuery = signal<string>(DEFAULT_JSON_SQL_OPTIONS.jsonPathQuery);
  readonly rootTypeName = signal<string>(DEFAULT_JSON_SQL_OPTIONS.rootTypeName);
  readonly sqlDialect = signal<SqlDialect>(DEFAULT_JSON_SQL_OPTIONS.sqlDialect);
  readonly sqlKeywordCase = signal<'upper' | 'lower' | 'preserve'>(
    DEFAULT_JSON_SQL_OPTIONS.sqlKeywordCase
  );
  readonly sqlMinify = signal<boolean>(DEFAULT_JSON_SQL_OPTIONS.sqlMinify);
  readonly yamlOutputMode = signal<'yaml' | 'json'>(
    DEFAULT_JSON_SQL_OPTIONS.yamlOutputMode
  );

  readonly result = signal<JsonSqlFormatterResult | null>(null);
  readonly treeExpandedPaths = signal<Set<string>>(new Set());
  readonly treeArrayLimits = signal<Map<string, number>>(new Map());

  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly copiedOutput = signal<boolean>(false);

  private activeWorker: Worker | null = null;
  private readonly createdObjectUrls = new Set<string>();

  readonly treeRows = computed(() => {
    const res = this.result();
    if (
      !res?.success ||
      this.language() !== 'json' ||
      res.parsedValue === undefined
    ) {
      return [];
    }
    return buildJsonTreeRows(
      res.parsedValue,
      this.treeExpandedPaths(),
      this.treeArrayLimits(),
      100
    );
  });

  readonly formattedInputBytes = computed(() =>
    formatByteSize(this.result()?.stats.inputBytes ?? this.inputText().length)
  );
  readonly formattedOutputBytes = computed(() =>
    formatByteSize(this.result()?.stats.outputBytes ?? 0)
  );
  readonly hasValidOutput = computed(() =>
    Boolean(this.result()?.success && this.result()?.outputText.length)
  );

  ngOnDestroy(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.inputText.set('');
    this.result.set(null);
  }

  async setLanguage(lang: FormatterLanguage): Promise<void> {
    this.language.set(lang);
    this.errorMessage.set(null);
    this.copiedOutput.set(false);
    if (this.inputText().trim().length > 0) {
      await this.format();
    } else {
      this.result.set(null);
    }
  }

  updateInput(text: string): void {
    this.inputText.set(text);
    this.errorMessage.set(null);
    this.copiedOutput.set(false);
  }

  async setJsonOutputView(view: JsonOutputView): Promise<void> {
    this.jsonOutputView.set(view);
    this.copiedOutput.set(false);
    if (this.inputText().trim().length > 0) {
      await this.format();
    }
  }

  async updateJsonPath(query: string): Promise<void> {
    this.jsonPathQuery.set(query);
    if (this.inputText().trim().length > 0 && this.language() === 'json') {
      await this.format();
    }
  }

  async loadSample(): Promise<void> {
    const lang = this.language();
    const sample =
      lang === 'sql'
        ? SAMPLE_SQL_QUERY
        : lang === 'yaml'
          ? SAMPLE_YAML_DOC
          : SAMPLE_JSON_DOC;
    this.inputText.set(sample);
    this.treeExpandedPaths.set(new Set());
    this.treeArrayLimits.set(new Map());
    await this.format();
  }

  toggleTreeNode(path: string): void {
    const current = new Set(this.treeExpandedPaths());
    if (current.has(path)) {
      current.delete(path);
    } else {
      current.add(path);
    }
    this.treeExpandedPaths.set(current);
  }

  showMoreArrayItems(path: string): void {
    const next = new Map(this.treeArrayLimits());
    const currentLimit = next.get(path) ?? 100;
    next.set(path, currentLimit + 100);
    this.treeArrayLimits.set(next);
  }

  async onFileInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files;
    if (!files || files.length === 0) return;
    await this.loadFile(files[0]);
    if (input) input.value = '';
  }

  async loadFile(file: File): Promise<void> {
    this.errorMessage.set(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      this.errorMessage.set(
        'File exceeds the 25 MB in-browser text workbench limit.'
      );
      return;
    }

    const lower = file.name.toLowerCase();
    if (lower.endsWith('.sql')) this.language.set('sql');
    else if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
      this.language.set('yaml');
    } else if (lower.endsWith('.json')) {
      this.language.set('json');
    }

    const content = await file.text();
    this.inputText.set(content);
    await this.format();
  }

  async format(): Promise<void> {
    const source = this.inputText();
    this.errorMessage.set(null);
    this.copiedOutput.set(false);
    this.isProcessing.set(true);
    this.progressPercent.set(15);
    this.progressStage.set('Validating & formatting locally');

    const options = this.buildOptions();
    try {
      const byteSize = new TextEncoder().encode(source).byteLength;
      const res =
        byteSize > WORKER_THRESHOLD_BYTES
          ? await this.runInWorker(source, options)
          : await processFormatterInput(source, options, {
              onProgress: (percent, stage) => {
                this.progressPercent.set(percent);
                this.progressStage.set(stage);
              },
            });

      this.result.set(res);
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Formatting failed locally.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  async minifyQuick(): Promise<void> {
    if (this.language() === 'json') {
      this.jsonOutputView.set('minified');
    } else if (this.language() === 'sql') {
      this.sqlMinify.set(true);
    }
    if (this.inputText().trim().length > 0) {
      await this.format();
    }
  }

  async copyOutput(): Promise<void> {
    const text = this.result()?.outputText ?? '';
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    this.copiedOutput.set(true);
  }

  downloadOutput(): void {
    const res = this.result();
    if (!res?.success || !res.outputText) return;

    const blob = new Blob([res.outputText], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = this.resolveOutputFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      this.createdObjectUrls.delete(url);
    }, 150);
  }

  reset(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.inputText.set('');
    this.result.set(null);
    this.errorMessage.set(null);
    this.copiedOutput.set(false);
    this.treeExpandedPaths.set(new Set());
    this.treeArrayLimits.set(new Map());
    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.jsonPathQuery.set('');
    this.sortJsonKeys.set(DEFAULT_JSON_SQL_OPTIONS.sortJsonKeys);
    this.jsonOutputView.set(DEFAULT_JSON_SQL_OPTIONS.jsonOutputView);
    this.sqlMinify.set(DEFAULT_JSON_SQL_OPTIONS.sqlMinify);
    this.yamlOutputMode.set(DEFAULT_JSON_SQL_OPTIONS.yamlOutputMode);
  }

  private buildOptions(): JsonSqlFormatterOptions {
    return {
      language: this.language(),
      indentType: this.indentType(),
      sortJsonKeys: this.sortJsonKeys(),
      jsonOutputView: this.jsonOutputView(),
      jsonPathQuery: this.jsonPathQuery(),
      rootTypeName: this.rootTypeName(),
      sqlDialect: this.sqlDialect(),
      sqlKeywordCase: this.sqlKeywordCase(),
      sqlMinify: this.sqlMinify(),
      yamlOutputMode: this.yamlOutputMode(),
    };
  }

  private resolveOutputFileName(): string {
    const lang = this.language();
    if (lang === 'sql') {
      return this.sqlMinify() ? 'query.min.sql' : 'query.formatted.sql';
    }
    if (lang === 'yaml') {
      return this.yamlOutputMode() === 'json' ? 'converted.json' : 'config.yaml';
    }
    const view = this.jsonOutputView();
    const base = (this.rootTypeName() || 'schema')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    if (view === 'typescript') return `${base}.types.ts`;
    if (view === 'zod') return `${base}.schema.ts`;
    if (view === 'yaml') return 'converted.yaml';
    if (view === 'minified') return 'payload.min.json';
    return 'payload.formatted.json';
  }

  private async runInWorker(
    inputText: string,
    options: JsonSqlFormatterOptions
  ): Promise<JsonSqlFormatterResult> {
    this.terminateWorker();

    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<JsonSqlFormatterResult>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (
              event: MessageEvent<FormatterWorkerResponse>
            ) => {
              const msg = event.data;
              if (msg.type === 'progress') {
                this.progressPercent.set(msg.percent);
                this.progressStage.set(msg.stage);
                return;
              }
              if (msg.type === 'done') {
                this.terminateWorker();
                resolve(msg.result);
                return;
              }
              if (msg.type === 'error') {
                this.terminateWorker();
                reject(new Error(msg.error));
              }
            };

            worker.onerror = (err) => {
              this.terminateWorker();
              reject(err);
            };

            const req: FormatterWorkerRequest = {
              type: 'format',
              inputText,
              options,
            };
            worker.postMessage(req);
          } catch (err) {
            this.terminateWorker();
            reject(err);
          }
        });
      } catch {
        // Fall through to in-thread execution cleanly
      }
    }

    return processFormatterInput(inputText, options, {
      onProgress: (percent, stage) => {
        this.progressPercent.set(percent);
        this.progressStage.set(stage);
      },
    });
  }

  private terminateWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  private revokeAllObjectUrls(): void {
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls.clear();
  }
}
