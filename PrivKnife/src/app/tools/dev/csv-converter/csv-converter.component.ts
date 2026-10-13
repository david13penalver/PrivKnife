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
      <div class="l-columns l-columns--2 csv-workspace" style="gap: 24px; align-items: start;">
        <!-- Left Column: Input & Options -->
        <div class="l-columns__area">
          <app-card title="Input Data">
            @if (errorMessage()) {
              <div
                class="g--margin-bottom-4"
                style="padding: 10px 14px; background: var(--color-danger-subtle); color: var(--color-danger); border-radius: var(--radius-sm); font-size: 0.8125rem; font-weight: 500;">
                ⚠️ {{ errorMessage() }}
              </div>
            }

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
                <div class="c-input g--margin-top-3">
                  <label class="c-input__label">Batch Size (INSERT Chunking)</label>
                  <select
                    class="c-input__control"
                    [value]="sqlBatchSize()"
                    (change)="onSqlBatchSizeChange($any($event.target).value)">
                    <option value="0">All rows in 1 query</option>
                    <option value="50">50 rows / query</option>
                    <option value="100">100 rows / query</option>
                    <option value="500">500 rows / query</option>
                  </select>
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

      <!-- Live Data Grid Preview Card -->
      <div class="l-columns__area g--margin-top-6">
        <app-card title="Interactive Data Grid Preview">
          @if (parsedTable() && parsedTable()!.headers.length > 0) {
            <!-- Grid Toolbar -->
            <div
              class="l-extremo g--margin-bottom-3 g--padding-bottom-2"
              style="border-bottom: 1px solid var(--color-border-default); align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 0.8125rem; color: var(--color-text-secondary);">
                Showing rows <strong>{{ startRowIndex() }}</strong> – <strong>{{ endRowIndex() }}</strong> of <strong>{{ totalRows() }}</strong>
                ({{ parsedTable()!.columnCount }} columns)
              </div>

              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <label style="font-size: 0.75rem; color: var(--color-text-muted);">Rows per page:</label>
                  <select
                    class="c-input__control"
                    style="padding: 2px 8px; font-size: 0.75rem; width: auto;"
                    [value]="gridPageSize()"
                    (change)="setGridPageSize(+$any($event.target).value)">
                    <option [value]="5">5</option>
                    <option [value]="10">10</option>
                    <option [value]="25">25</option>
                    <option [value]="50">50</option>
                  </select>
                </div>

                <div style="display: flex; gap: 4px; align-items: center;">
                  <button
                    type="button"
                    class="c-button c-button--ghost c-button--small"
                    style="padding: 4px 8px;"
                    [disabled]="gridPage() <= 1"
                    (click)="setGridPage(1)"
                    title="First Page">
                    ⏮
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--ghost c-button--small"
                    style="padding: 4px 8px;"
                    [disabled]="gridPage() <= 1"
                    (click)="setGridPage(gridPage() - 1)"
                    title="Previous Page">
                    ◀ Prev
                  </button>
                  <span style="font-size: 0.75rem; padding: 0 4px; font-weight: 600;">
                    {{ gridPage() }} / {{ totalPages() }}
                  </span>
                  <button
                    type="button"
                    class="c-button c-button--ghost c-button--small"
                    style="padding: 4px 8px;"
                    [disabled]="gridPage() >= totalPages()"
                    (click)="setGridPage(gridPage() + 1)"
                    title="Next Page">
                    Next ▶
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--ghost c-button--small"
                    style="padding: 4px 8px;"
                    [disabled]="gridPage() >= totalPages()"
                    (click)="setGridPage(totalPages())"
                    title="Last Page">
                    ⏭
                  </button>
                </div>
              </div>
            </div>

            <!-- Table Scroll Area -->
            <div style="overflow-x: auto; border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); max-height: 380px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem; text-align: left;">
                <thead>
                  <tr style="background: var(--color-bg-subtle); border-bottom: 2px solid var(--color-border-default);">
                    <th style="padding: 8px 12px; font-weight: 600; color: var(--color-text-muted); width: 48px; border-right: 1px solid var(--color-border-default);">#</th>
                    @for (header of parsedTable()!.headers; track $index) {
                      <th style="padding: 8px 12px; font-weight: 600; color: var(--color-text-primary); border-right: 1px solid var(--color-border-default); white-space: nowrap;">
                        {{ header }}
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of paginatedRows(); track $index; let rowIdx = $index) {
                    <tr style="border-bottom: 1px solid var(--color-border-subtle); transition: background 0.15s ease;"
                        [style.background]="rowIdx % 2 === 0 ? 'var(--color-bg-surface)' : 'var(--color-bg-subtle)'">
                      <td style="padding: 6px 12px; color: var(--color-text-muted); border-right: 1px solid var(--color-border-default); font-family: var(--font-code, monospace); font-size: 0.75rem;">
                        {{ (gridPage() - 1) * gridPageSize() + rowIdx + 1 }}
                      </td>
                      @for (cell of row; track $index) {
                        <td style="padding: 6px 12px; border-right: 1px solid var(--color-border-default); white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis;"
                            [title]="cell">
                          {{ cell }}
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p style="color: var(--color-text-muted); font-size: 0.875rem; text-align: center; padding: 24px 0; margin: 0;">
              No tabular rows loaded yet. Paste CSV text or drop a spreadsheet file to preview rows.
            </p>
          }
        </app-card>
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
  styles: [
    `
      @media (max-width: 1024px) {
        .csv-workspace {
          grid-template-columns: 1fr !important;
        }

        .csv-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
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
  readonly sqlBatchSize = signal<number>(0);

  // Markdown Options
  readonly markdownAlignment = signal<MarkdownAlignment>('left');

  // UI state & pagination
  readonly copied = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly gridPage = signal<number>(1);
  readonly gridPageSize = signal<number>(10);

  readonly totalRows = computed(() => this.parsedTable()?.rows.length || 0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalRows() / this.gridPageSize())));
  readonly paginatedRows = computed(() => {
    const table = this.parsedTable();
    if (!table || table.rows.length === 0) return [];
    const start = (this.gridPage() - 1) * this.gridPageSize();
    return table.rows.slice(start, start + this.gridPageSize());
  });
  readonly startRowIndex = computed(() => {
    if (this.totalRows() === 0) return 0;
    return (this.gridPage() - 1) * this.gridPageSize() + 1;
  });
  readonly endRowIndex = computed(() => {
    return Math.min(this.gridPage() * this.gridPageSize(), this.totalRows());
  });

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
        batchSize: this.sqlBatchSize() > 0 ? this.sqlBatchSize() : undefined,
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
    this.errorMessage.set(null);
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

  onSqlBatchSizeChange(val: string): void {
    this.sqlBatchSize.set(+val || 0);
  }

  setGridPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.gridPage.set(page);
    }
  }

  setGridPageSize(size: number): void {
    this.gridPageSize.set(size);
    this.gridPage.set(1);
  }

  onTextInputChange(text: string): void {
    this.rawTextInput.set(text);
    this.gridPage.set(1);
    this.parseCurrentText();
  }

  private parseCurrentText(): void {
    try {
      this.errorMessage.set(null);
      const text = this.rawTextInput();
      const table = parseCsv(text);
      this.parsedTable.set(table);
    } catch (err: any) {
      this.errorMessage.set('Failed to parse CSV text: ' + (err?.message || 'Invalid format'));
    }
  }

  async onFilesDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    this.errorMessage.set(null);
    this.gridPage.set(1);

    try {
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
    } catch (err: any) {
      this.errorMessage.set('Failed to parse file: ' + (err?.message || 'Unsupported format'));
    }
  }

  onSheetChange(sheetName: string): void {
    if (this.currentWorkbookBuffer && this.parsedTable()?.sheetNames) {
      const idx = this.parsedTable()!.sheetNames!.indexOf(sheetName);
      if (idx !== -1) {
        try {
          this.errorMessage.set(null);
          this.gridPage.set(1);
          const table = parseExcel(this.currentWorkbookBuffer, idx);
          this.parsedTable.set(table);
        } catch (err: any) {
          this.errorMessage.set('Failed to load sheet: ' + (err?.message || 'Error reading sheet'));
        }
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
