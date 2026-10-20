import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DiffCheckerOptions,
  DiffCheckerResult,
  DiffGranularity,
  DiffViewMode,
  SyntaxLanguage,
} from './types';
import { computeDiff } from './engine';
import {
  SAMPLE_CODE_ORIGINAL,
  SAMPLE_CODE_MODIFIED,
  SAMPLE_CONTRACT_ORIGINAL,
  SAMPLE_CONTRACT_MODIFIED,
} from './test-fixtures';

@Component({
  selector: 'app-diff-checker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <header class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Side-by-Side Code & Contract Diff Checker</h1>
          <p class="c-header__subtitle">
            Private, high-speed text, code, and contract comparison with word-level character differences,
            whitespace toggles, and unified patch export.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </header>

      <!-- Main Controls & Presets Bar -->
      <section class="c-card g--margin-bottom-4">
        <div class="c-card__body">
          <div class="toolbar-grid">
            <!-- Sample Presets -->
            <div class="toolbar-group">
              <span class="toolbar-label">Sample Data:</span>
              <div class="button-group">
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="loadSampleCode()"
                >
                  Code Refactor
                </button>
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="loadSampleContract()"
                >
                  Legal Contract
                </button>
              </div>
            </div>

            <!-- View Mode -->
            <div class="toolbar-group">
              <span class="toolbar-label">View Layout:</span>
              <div class="button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="viewMode() === 'side_by_side'"
                  [class.c-button--outline]="viewMode() !== 'side_by_side'"
                  (click)="setViewMode('side_by_side')"
                >
                  Side-by-Side
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="viewMode() === 'unified_inline'"
                  [class.c-button--outline]="viewMode() !== 'unified_inline'"
                  (click)="setViewMode('unified_inline')"
                >
                  Unified Inline
                </button>
              </div>
            </div>

            <!-- Granularity -->
            <div class="toolbar-group">
              <span class="toolbar-label">Granularity:</span>
              <div class="button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="diffGranularity() === 'word'"
                  [class.c-button--outline]="diffGranularity() !== 'word'"
                  (click)="setGranularity('word')"
                >
                  Word
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="diffGranularity() === 'character'"
                  [class.c-button--outline]="diffGranularity() !== 'character'"
                  (click)="setGranularity('character')"
                >
                  Char
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="diffGranularity() === 'line'"
                  [class.c-button--outline]="diffGranularity() !== 'line'"
                  (click)="setGranularity('line')"
                >
                  Line
                </button>
              </div>
            </div>

            <!-- Toggles -->
            <div class="toolbar-group toolbar-group--toggles">
              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="ignoreWhitespace()"
                  (change)="toggleIgnoreWhitespace()"
                />
                Ignore Whitespace
              </label>
              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="ignoreCase()"
                  (change)="toggleIgnoreCase()"
                />
                Ignore Case
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- Input Textareas Grid -->
      <div class="l-columns l-columns--2 g--margin-bottom-4">
        <!-- Original Input -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <h2 class="c-card__title l-extremo__area-izquierda">Original (Before)</h2>
            <div class="l-extremo__area-derecha">
              <input
                #origFileInput
                type="file"
                style="display: none"
                (change)="onOriginalFileInputChange($event)"
              />
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="origFileInput.click()"
              >
                Upload File
              </button>
            </div>
          </div>
          <div class="c-card__body">
            <textarea
              class="diff-input-textarea"
              rows="6"
              placeholder="Paste original text or code here..."
              [ngModel]="originalText()"
              (ngModelChange)="setOriginalText($event)"
            ></textarea>
          </div>
        </section>

        <!-- Modified Input -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <h2 class="c-card__title l-extremo__area-izquierda">Modified (After)</h2>
            <div class="l-extremo__area-derecha">
              <input
                #modFileInput
                type="file"
                style="display: none"
                (change)="onModifiedFileInputChange($event)"
              />
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="modFileInput.click()"
              >
                Upload File
              </button>
            </div>
          </div>
          <div class="c-card__body">
            <textarea
              class="diff-input-textarea"
              rows="6"
              placeholder="Paste modified text or code here..."
              [ngModel]="modifiedText()"
              (ngModelChange)="setModifiedText($event)"
            ></textarea>
          </div>
        </section>
      </div>

      <!-- Stats Summary Banner -->
      <section class="c-card g--margin-bottom-4">
        <div class="c-card__body">
          <div class="stats-bar">
            <div class="stat-pill stat-pill--left">
              <span class="stat-pill__label">Original Lines</span>
              <span class="stat-pill__value">{{ result().stats.leftTotalLines }}</span>
            </div>
            <div class="stat-pill stat-pill--right">
              <span class="stat-pill__label">Modified Lines</span>
              <span class="stat-pill__value">{{ result().stats.rightTotalLines }}</span>
            </div>
            <div class="stat-pill stat-pill--add">
              <span class="stat-pill__label">Additions</span>
              <span class="stat-pill__value">+{{ result().stats.addedLines }}</span>
            </div>
            <div class="stat-pill stat-pill--del">
              <span class="stat-pill__label">Deletions</span>
              <span class="stat-pill__value">-{{ result().stats.removedLines }}</span>
            </div>
            <div class="stat-pill stat-pill--mod">
              <span class="stat-pill__label">Modifications</span>
              <span class="stat-pill__value">~{{ result().stats.modifiedLines }}</span>
            </div>
            <div class="stat-pill stat-pill--same">
              <span class="stat-pill__label">Unchanged</span>
              <span class="stat-pill__value">{{ result().stats.unchangedLines }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Diff Viewer Card -->
      <section class="c-card g--margin-bottom-4">
        <div class="c-card__header l-extremo">
          <h2 class="c-card__title l-extremo__area-izquierda">Visual Comparison</h2>
          <div class="l-extremo__area-derecha">
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="copyPatch()"
            >
              {{ copiedFeedback() ? '✓ Copied Patch!' : 'Copy .patch' }}
            </button>
          </div>
        </div>

        <div class="c-card__body diff-viewer-wrapper">
          @if (result().lines.length === 0) {
            <div class="empty-diff">
              <span class="empty-diff__icon">🔍</span>
              <p>Enter text in both boxes above or click a sample to generate comparison.</p>
            </div>
          } @else if (viewMode() === 'side_by_side') {
            <!-- Side by Side Viewer -->
            <div class="diff-table-container">
              <table class="diff-table">
                <tbody>
                  @for (line of result().lines; track $index) {
                    <tr class="diff-row diff-row--{{ line.type }}">
                      <!-- Left Line -->
                      <td class="diff-num">{{ line.leftLineNumber || '' }}</td>
                      <td class="diff-code diff-code--left">
                        @if (line.type === 'modified' && line.leftTokens) {
                          @for (t of line.leftTokens; track $index) {
                            @if (t.type === 'removed') {
                              <mark class="diff-token diff-token--del">{{ t.value }}</mark>
                            } @else {
                              <span>{{ t.value }}</span>
                            }
                          }
                        } @else if (line.type === 'removed') {
                          <span class="diff-line-del">{{ line.leftText }}</span>
                        } @else if (line.leftText !== undefined) {
                          <span>{{ line.leftText }}</span>
                        }
                      </td>

                      <!-- Right Line -->
                      <td class="diff-num">{{ line.rightLineNumber || '' }}</td>
                      <td class="diff-code diff-code--right">
                        @if (line.type === 'modified' && line.rightTokens) {
                          @for (t of line.rightTokens; track $index) {
                            @if (t.type === 'added') {
                              <mark class="diff-token diff-token--ins">{{ t.value }}</mark>
                            } @else {
                              <span>{{ t.value }}</span>
                            }
                          }
                        } @else if (line.type === 'added') {
                          <span class="diff-line-ins">{{ line.rightText }}</span>
                        } @else if (line.rightText !== undefined) {
                          <span>{{ line.rightText }}</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <!-- Unified Inline Viewer -->
            <div class="diff-table-container">
              <table class="diff-table diff-table--unified">
                <tbody>
                  @for (line of result().lines; track $index) {
                    @if (line.type === 'unchanged') {
                      <tr class="diff-row diff-row--unchanged">
                        <td class="diff-num">{{ line.leftLineNumber }}</td>
                        <td class="diff-num">{{ line.rightLineNumber }}</td>
                        <td class="diff-prefix">&nbsp;</td>
                        <td class="diff-code">
                          <span>{{ line.leftText }}</span>
                        </td>
                      </tr>
                    } @else if (line.type === 'modified') {
                      <!-- Removed part -->
                      <tr class="diff-row diff-row--removed">
                        <td class="diff-num">{{ line.leftLineNumber }}</td>
                        <td class="diff-num">&nbsp;</td>
                        <td class="diff-prefix">-</td>
                        <td class="diff-code">
                          @if (line.leftTokens) {
                            @for (t of line.leftTokens; track $index) {
                              @if (t.type === 'removed') {
                                <mark class="diff-token diff-token--del">{{ t.value }}</mark>
                              } @else {
                                <span>{{ t.value }}</span>
                              }
                            }
                          } @else {
                            <span>{{ line.leftText }}</span>
                          }
                        </td>
                      </tr>
                      <!-- Added part -->
                      <tr class="diff-row diff-row--added">
                        <td class="diff-num">&nbsp;</td>
                        <td class="diff-num">{{ line.rightLineNumber }}</td>
                        <td class="diff-prefix">+</td>
                        <td class="diff-code">
                          @if (line.rightTokens) {
                            @for (t of line.rightTokens; track $index) {
                              @if (t.type === 'added') {
                                <mark class="diff-token diff-token--ins">{{ t.value }}</mark>
                              } @else {
                                <span>{{ t.value }}</span>
                              }
                            }
                          } @else {
                            <span>{{ line.rightText }}</span>
                          }
                        </td>
                      </tr>
                    } @else if (line.type === 'removed') {
                      <tr class="diff-row diff-row--removed">
                        <td class="diff-num">{{ line.leftLineNumber }}</td>
                        <td class="diff-num">&nbsp;</td>
                        <td class="diff-prefix">-</td>
                        <td class="diff-code">
                          <span>{{ line.leftText }}</span>
                        </td>
                      </tr>
                    } @else if (line.type === 'added') {
                      <tr class="diff-row diff-row--added">
                        <td class="diff-num">&nbsp;</td>
                        <td class="diff-num">{{ line.rightLineNumber }}</td>
                        <td class="diff-prefix">+</td>
                        <td class="diff-code">
                          <span>{{ line.rightText }}</span>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Footer Actions -->
        <div class="c-card__footer l-extremo">
          <div class="l-extremo__area-izquierda">
            <button
              type="button"
              class="c-button c-button--outline"
              (click)="reset()"
            >
              Reset / Clear
            </button>
          </div>
          <div class="l-extremo__area-derecha export-actions">
            <button
              type="button"
              class="c-button c-button--outline"
              [disabled]="result().lines.length === 0"
              (click)="downloadExport('patch')"
            >
              Download .patch
            </button>
            <button
              type="button"
              class="c-button c-button--primary"
              [disabled]="result().lines.length === 0"
              (click)="downloadExport('html')"
            >
              Export HTML Report
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .toolbar-grid {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.25rem;
    }
    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .toolbar-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-muted, #64748b);
    }
    .button-group {
      display: inline-flex;
      gap: 0.25rem;
    }
    .toolbar-group--toggles {
      display: flex;
      gap: 1rem;
      margin-left: auto;
    }
    .c-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .diff-input-textarea {
      width: 100%;
      font-family: 'Fira Code', Consolas, monospace;
      font-size: 0.8125rem;
      line-height: 1.4;
      padding: 0.75rem;
      border: 1px solid var(--color-border, #cbd5e1);
      border-radius: 0.375rem;
      resize: vertical;
      background: var(--color-surface, #ffffff);
      box-sizing: border-box;
    }
    .stats-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: space-around;
    }
    .stat-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      background: var(--color-surface-variant, #f1f5f9);
      min-width: 90px;
    }
    .stat-pill__label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--color-text-muted, #64748b);
    }
    .stat-pill__value {
      font-size: 1.125rem;
      font-weight: 700;
    }
    .stat-pill--add .stat-pill__value { color: #16a34a; }
    .stat-pill--del .stat-pill__value { color: #dc2626; }
    .stat-pill--mod .stat-pill__value { color: #d97706; }
    .diff-viewer-wrapper {
      padding: 0;
      max-height: 500px;
      overflow: auto;
    }
    .empty-diff {
      padding: 3rem 1rem;
      text-align: center;
      color: var(--color-text-muted, #64748b);
    }
    .empty-diff__icon {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 0.5rem;
    }
    .diff-table-container {
      width: 100%;
      overflow-x: auto;
    }
    .diff-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Fira Code', Consolas, monospace;
      font-size: 0.75rem;
      line-height: 1.35;
    }
    .diff-row {
      border-bottom: 1px solid #f1f5f9;
    }
    .diff-num {
      width: 40px;
      text-align: right;
      padding: 2px 6px;
      color: #94a3b8;
      background: #f8fafc;
      border-right: 1px solid #e2e8f0;
      user-select: none;
      vertical-align: top;
    }
    .diff-prefix {
      width: 20px;
      text-align: center;
      font-weight: bold;
      user-select: none;
    }
    .diff-code {
      padding: 2px 8px;
      white-space: pre-wrap;
      word-break: break-all;
      vertical-align: top;
      width: calc(50% - 40px);
    }
    .diff-code--left {
      border-right: 1px solid #cbd5e1;
    }
    .diff-row--added {
      background: #f0fdf4;
    }
    .diff-row--removed {
      background: #fef2f2;
    }
    .diff-row--modified {
      background: #fffbeb;
    }
    .diff-token--del {
      background: #fca5a5;
      color: #7f1d1d;
      border-radius: 2px;
    }
    .diff-token--ins {
      background: #86efac;
      color: #14532d;
      border-radius: 2px;
    }
    .diff-line-del {
      background: #fee2e2;
      color: #991b1b;
    }
    .diff-line-ins {
      background: #dcfce7;
      color: #166534;
    }
    .export-actions {
      display: flex;
      gap: 0.5rem;
    }
  `],
})
export class DiffCheckerComponent implements OnDestroy {
  private activeObjectUrls = new Set<string>();

  // State Signals
  readonly originalText = signal<string>('');
  readonly modifiedText = signal<string>('');
  readonly viewMode = signal<DiffViewMode>('side_by_side');
  readonly diffGranularity = signal<DiffGranularity>('word');
  readonly ignoreWhitespace = signal<boolean>(false);
  readonly ignoreCase = signal<boolean>(false);
  readonly syntaxLanguage = signal<SyntaxLanguage>('javascript');
  readonly syncScroll = signal<boolean>(true);
  readonly copiedFeedback = signal<boolean>(false);

  // Computed Diff Result
  readonly result = computed<DiffCheckerResult>(() => {
    const orig = this.originalText();
    const mod = this.modifiedText();

    const options: DiffCheckerOptions = {
      viewMode: this.viewMode(),
      diffGranularity: this.diffGranularity(),
      ignoreWhitespace: this.ignoreWhitespace(),
      ignoreCase: this.ignoreCase(),
      syntaxLanguage: this.syntaxLanguage(),
      syncScroll: this.syncScroll(),
    };

    return computeDiff(orig, mod, options);
  });

  setOriginalText(text: string) {
    this.originalText.set(text);
  }

  setModifiedText(text: string) {
    this.modifiedText.set(text);
  }

  setViewMode(mode: DiffViewMode) {
    this.viewMode.set(mode);
  }

  setGranularity(granularity: DiffGranularity) {
    this.diffGranularity.set(granularity);
  }

  toggleIgnoreWhitespace() {
    this.ignoreWhitespace.update((v) => !v);
  }

  toggleIgnoreCase() {
    this.ignoreCase.update((v) => !v);
  }

  loadSampleCode() {
    this.setOriginalText(SAMPLE_CODE_ORIGINAL);
    this.setModifiedText(SAMPLE_CODE_MODIFIED);
    this.syntaxLanguage.set('javascript');
  }

  loadSampleContract() {
    this.setOriginalText(SAMPLE_CONTRACT_ORIGINAL);
    this.setModifiedText(SAMPLE_CONTRACT_MODIFIED);
    this.syntaxLanguage.set('plaintext');
  }

  async handleOriginalFile(file: File) {
    if (!file) return;
    const text = await file.text();
    this.setOriginalText(text);
  }

  async handleModifiedFile(file: File) {
    if (!file) return;
    const text = await file.text();
    this.setModifiedText(text);
  }

  onOriginalFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleOriginalFile(input.files[0]);
    }
  }

  onModifiedFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleModifiedFile(input.files[0]);
    }
  }

  downloadExport(format: 'patch' | 'html' = 'patch') {
    const res = this.result();
    let content = res.patch;
    let fileName = 'diff_report.patch';
    let mimeType = 'text/x-diff';

    if (format === 'html') {
      content = res.htmlReport;
      fileName = 'diff_report.html';
      mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    this.activeObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    this.activeObjectUrls.delete(url);
  }

  async copyPatch() {
    const patch = this.result().patch;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(patch);
        this.copiedFeedback.set(true);
        setTimeout(() => this.copiedFeedback.set(false), 2000);
      }
    } catch {
      // Ignore clipboard error
    }
  }

  reset() {
    this.originalText.set('');
    this.modifiedText.set('');
    this.viewMode.set('side_by_side');
    this.diffGranularity.set('word');
    this.ignoreWhitespace.set(false);
    this.ignoreCase.set(false);
    this.copiedFeedback.set(false);

    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }

  ngOnDestroy() {
    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }
}
