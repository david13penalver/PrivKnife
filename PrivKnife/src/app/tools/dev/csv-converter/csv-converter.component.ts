import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import {
  parseCsv,
  parseExcel,
  tableToJson,
  tableToMarkdown,
  tableToSql,
} from './engine';
import { SAMPLE_CSV_DATA } from './test-fixtures';
import {
  JsonFormatOptions,
  MarkdownAlignment,
  OutputFormat,
  ParsedTable,
  SqlDialect,
} from './types';

@Component({
  selector: 'app-csv-converter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone, FormsModule],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1100px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1>CSV / Excel to JSON, SQL &amp; Markdown</h1>
        <p class="g--margin-top-2" style="color: var(--color-text-muted); font-size: 1.125rem;">
          Convert spreadsheet data into clean JSON objects, SQL INSERT statements, and GitHub Markdown tables offline.
        </p>
      </div>

      <!-- Main Two-Column Layout -->
      <div class="l-columns l-columns--2" style="gap: 24px; align-items: start;">
        <!-- Left Column: Input & Options -->
        <div class="l-columns__area">
          <app-card title="Input Data">
            <!-- Tabs: Paste vs File Upload -->
            <div class="g--margin-bottom-4" style="display: flex; gap: 8px;">
              <button
                type="button"
                class="c-button"
                [class.c-button--primary]="inputMode() === 'text'"
                [class.c-button--ghost]="inputMode() !== 'text'"
                style="padding: 6px 14px; font-size: 0.8125rem;"
                (click)="setInputMode('text')">
                ✍️ Paste Text
              </button>
              <button
                type="button"
                class="c-button"
                [class.c-button--primary]="inputMode() === 'file'"
                [class.c-button--ghost]="inputMode() !== 'file'"
                style="padding: 6px 14px; font-size: 0.8125rem;"
                (click)="setInputMode('file')">
                📁 Upload CSV / Excel
              </button>
            </div>

            @if (inputMode() === 'text') {
              <div class="c-input">
                <label class="c-input__label" for="raw-csv-input">Raw Tabular Text (CSV, TSV, Semicolon)</label>
                <textarea
                  id="raw-csv-input"
                  class="c-input__control c-input__control--textarea"
                  rows="7"
                  style="font-family: var(--font-code, monospace); font-size: 0.8125rem;"
                  [value]="rawTextInput()"
                  (input)="onTextInputChange($any($event.target).value)"></textarea>
              </div>
            } @else {
              <app-dropzone
                title="Drop spreadsheet file here, or browse"
                subtitle="Supports .csv, .tsv, .xlsx, and .xls"
                accept=".csv,.tsv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                (filesSelected)="onFilesDropped($event)" />
            }

            <!-- Sheet selector if Excel has multiple sheets -->
            @if (parsedTable()?.sheetNames && parsedTable()!.sheetNames!.length > 1) {
              <div class="c-input g--margin-top-3">
                <label class="c-input__label">Excel Worksheet</label>
                <select
                  class="c-input__control"
                  [value]="parsedTable()?.activeSheet"
                  (change)="onSheetChange($any($event.target).value)">
                  @for (sheet of parsedTable()!.sheetNames; track sheet) {
                    <option [value]="sheet">{{ sheet }}</option>
                  }
                </select>
              </div>
            }

            <!-- Format-Specific Options -->
            <div class="g--margin-top-5 g--padding-top-4" style="border-top: 1px solid var(--color-border-default);">
              <h4 style="font-size: 0.9375rem; font-weight: 600; margin-bottom: 12px;">
                Configuration Options
              </h4>

              @if (activeFormat() === 'json') {
                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div class="c-input">
                    <label class="c-input__label">Structure</label>
                    <select
                      class="c-input__control"
                      [value]="jsonStructure()"
                      (change)="jsonStructure.set($any($event.target).value)">
                      <option value="arrayOfObjects">Array of Objects</option>
                      <option value="twoDimensionalArray">2D Array</option>
                      <option value="keyedByFirstColumn">Key-Value (by 1st col)</option>
                    </select>
                  </div>
                  <div class="c-input">
                    <label class="c-input__label">Indentation</label>
                    <select
                      class="c-input__control"
                      [value]="jsonIndent()"
                      (change)="onJsonIndentChange($any($event.target).value)">
                      <option value="2">2 Spaces</option>
                      <option value="4">4 Spaces</option>
                      <option value="0">Minified</option>
                    </select>
                  </div>
                </div>
              } @else if (activeFormat() === 'sql') {
                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div class="c-input">
                    <label class="c-input__label" for="sql-table-name">Table Name</label>
                    <input
                      id="sql-table-name"
                      type="text"
                      class="c-input__control"
                      [value]="sqlTableName()"
                      (input)="sqlTableName.set($any($event.target).value)" />
                  </div>
                  <div class="c-input">
                    <label class="c-input__label">SQL Dialect</label>
                    <select
                      class="c-input__control"
                      [value]="sqlDialect()"
                      (change)="sqlDialect.set($any($event.target).value)">
                      <option value="mysql">MySQL (Backticks \` \`)</option>
                      <option value="postgres">PostgreSQL (Quotes " ")</option>
                      <option value="sqlite">SQLite</option>
                    </select>
                  </div>
                </div>
              } @else if (activeFormat() === 'markdown') {
                <div class="c-input">
                  <label class="c-input__label">Column Alignment</label>
                  <select
                    class="c-input__control"
                    [value]="markdownAlignment()"
                    (change)="markdownAlignment.set($any($event.target).value)">
                    <option value="left">Left Aligned (:---)</option>
                    <option value="center">Centered (:---:)</option>
                    <option value="right">Right Aligned (---:)</option>
                  </select>
                </div>
              }
            </div>
          </app-card>
        </div>

        <!-- Right Column: Code Output Preview & Actions -->
        <div class="l-columns__area">
          <app-card>
            <!-- Format Tabs -->
            <div
              class="l-extremo g--margin-bottom-4 g--padding-bottom-3"
              style="border-bottom: 1px solid var(--color-border-default); align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; gap: 4px;">
                <button
                  type="button"
                  class="c-button"
                  [class.c-button--primary]="activeFormat() === 'json'"
                  [class.c-button--ghost]="activeFormat() !== 'json'"
                  style="padding: 6px 14px; font-size: 0.8125rem;"
                  (click)="setFormat('json')">
                  JSON
                </button>
                <button
                  type="button"
                  class="c-button"
                  [class.c-button--primary]="activeFormat() === 'sql'"
                  [class.c-button--ghost]="activeFormat() !== 'sql'"
                  style="padding: 6px 14px; font-size: 0.8125rem;"
                  (click)="setFormat('sql')">
                  SQL INSERT
                </button>
                <button
                  type="button"
                  class="c-button"
                  [class.c-button--primary]="activeFormat() === 'markdown'"
                  [class.c-button--ghost]="activeFormat() !== 'markdown'"
                  style="padding: 6px 14px; font-size: 0.8125rem;"
                  (click)="setFormat('markdown')">
                  Markdown
                </button>
              </div>

              <div>
                @if (parsedTable()) {
                  <app-badge variant="info">
                    {{ parsedTable()!.rowCount }} rows &bull; {{ parsedTable()!.columnCount }} cols
                  </app-badge>
                }
              </div>
            </div>

            <!-- Output Preview Box -->
            <div
              style="background: var(--color-bg-subtle); border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); padding: 12px; max-height: 400px; overflow-y: auto;">
              <pre
                style="margin: 0; font-family: var(--font-code, monospace); font-size: 0.8125rem; line-height: 1.6; white-space: pre-wrap; word-break: break-all; color: var(--color-text-primary);">{{ outputCode() }}</pre>
            </div>

            <!-- Actions Bar -->
            <div
              class="l-extremo g--margin-top-4 g--padding-top-3"
              style="border-top: 1px solid var(--color-border-default); align-items: center; gap: 8px; flex-wrap: wrap;">
              <div>
                <app-button
                  variant="secondary"
                  (clicked)="copyToClipboard()">
                  {{ copied() ? '✓ Copied!' : '📋 Copy to Clipboard' }}
                </app-button>
              </div>

              <div style="display: flex; gap: 8px; align-items: center;">
                <app-button
                  variant="primary"
                  (clicked)="downloadOutput()">
                  ⬇️ Download .{{ activeFormat() === 'markdown' ? 'md' : activeFormat() }}
                </app-button>
              </div>
            </div>
          </app-card>
        </div>
      </div>

      <!-- Educational Card -->
      <div class="l-columns__area g--margin-top-6">
        <app-card title="Client-Side Tabular Conversion Guarantee">
          <p style="color: var(--color-text-muted); font-size: 0.9375rem; line-height: 1.6;">
            All CSV, TSV, and Excel spreadsheets are parsed completely in browser memory using PapaParse and SheetJS.
            Your corporate spreadsheets, customer lists, and financial figures are never transmitted to any external server or saved in a remote database.
          </p>
        </app-card>
      </div>
    </div>
  `,
})
export class CsvConverterComponent implements OnInit, OnDestroy {
  readonly inputMode = signal<'text' | 'file'>('text');
  readonly activeFormat = signal<OutputFormat>('json');
  readonly rawTextInput = signal<string>(SAMPLE_CSV_DATA);
  readonly parsedTable = signal<ParsedTable | null>(null);

  // JSON Options
  readonly jsonStructure = signal<'arrayOfObjects' | 'twoDimensionalArray' | 'keyedByFirstColumn'>('arrayOfObjects');
  readonly jsonIndent = signal<2 | 4 | 0>(2);

  // SQL Options
  readonly sqlTableName = signal<string>('records');
  readonly sqlDialect = signal<SqlDialect>('mysql');

  // Markdown Options
  readonly markdownAlignment = signal<MarkdownAlignment>('left');

  // UI state
  readonly copied = signal<boolean>(false);
  private copyTimeout: any = null;
  private currentWorkbookBuffer: ArrayBuffer | null = null;
  private activeBlobUrls: string[] = [];

  readonly outputCode = computed(() => {
    const table = this.parsedTable();
    if (!table) return '';

    const format = this.activeFormat();
    if (format === 'json') {
      return tableToJson(table, {
        structure: this.jsonStructure(),
        indent: this.jsonIndent(),
      });
    }
    if (format === 'sql') {
      return tableToSql(table, {
        tableName: this.sqlTableName() || 'records',
        dialect: this.sqlDialect(),
      });
    }
    // Markdown
    return tableToMarkdown(table, {
      alignment: this.markdownAlignment(),
    });
  });

  ngOnInit(): void {
    this.parseCurrentText();
  }

  setInputMode(mode: 'text' | 'file'): void {
    this.inputMode.set(mode);
  }

  setFormat(format: OutputFormat): void {
    this.activeFormat.set(format);
    this.copied.set(false);
  }

  onJsonIndentChange(val: string): void {
    const num = +val;
    if (num === 0 || num === 2 || num === 4) {
      this.jsonIndent.set(num);
    }
  }

  onTextInputChange(text: string): void {
    this.rawTextInput.set(text);
    this.parseCurrentText();
  }

  private parseCurrentText(): void {
    const text = this.rawTextInput();
    const table = parseCsv(text);
    this.parsedTable.set(table);
  }

  async onFilesDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    const name = file.name.toLowerCase();

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      this.currentWorkbookBuffer = buffer;
      const table = parseExcel(buffer);
      this.parsedTable.set(table);
    } else {
      // Text CSV/TSV
      const text = await file.text();
      this.rawTextInput.set(text);
      this.currentWorkbookBuffer = null;
      this.parseCurrentText();
    }
  }

  onSheetChange(sheetName: string): void {
    if (this.currentWorkbookBuffer && this.parsedTable()?.sheetNames) {
      const idx = this.parsedTable()!.sheetNames!.indexOf(sheetName);
      if (idx !== -1) {
        const table = parseExcel(this.currentWorkbookBuffer, idx);
        this.parsedTable.set(table);
      }
    }
  }

  async copyToClipboard(): Promise<void> {
    const code = this.outputCode();
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.copied.set(false), 2000);
    }
  }

  downloadOutput(): void {
    const code = this.outputCode();
    const format = this.activeFormat();
    const ext = format === 'markdown' ? 'md' : format;
    const mime =
      format === 'json'
        ? 'application/json'
        : format === 'sql'
        ? 'application/sql'
        : 'text/markdown';

    const blob = new Blob([code], { type: mime });
    const url = URL.createObjectURL(blob);
    this.activeBlobUrls.push(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    const index = this.activeBlobUrls.indexOf(url);
    if (index !== -1) {
      this.activeBlobUrls.splice(index, 1);
    }
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    for (const url of this.activeBlobUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeBlobUrls = [];
  }
}
