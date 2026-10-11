import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import {
  exportCheatsheetPdfBlob,
  generateCheatsheetPreviewHtml,
} from './engine';
import {
  DEFAULT_CHEATSHEET_CONFIG,
  GIT_CHEATSHEET_CONFIG,
  JAVASCRIPT_CHEATSHEET_CONFIG,
} from './test-fixtures';
import {
  CheatsheetConfig,
  CheatsheetPresetKey,
  ColumnCount,
  Orientation,
  PaperSize,
} from './types';

@Component({
  selector: 'app-markdown-cheatsheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, FormsModule],
  template: `
    <div
      class="l-columns l-columns--1 g--margin-x-auto"
      style="max-width: 1350px; padding: 0 16px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.025em;">
          Markdown to Academic &amp; Tech PDF Cheatsheet
        </h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 820px; margin: 0 auto; line-height: 1.6;">
          Convert raw Markdown notes into dense, multi-column print-ready reference sheets.
          Vector-sharp PDF generation with code syntax blocks, tables, and customizable columns.
        </p>
      </div>

      <!-- Top Leaderboard Ad Slot (728x90) -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center print-hidden">
        <div
          class="ad-slot ad-slot--leaderboard"
          style="max-width: 728px; height: 90px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
          <span>SPONSOR ADVERTISEMENT (728&times;90 LEADERBOARD)</span>
        </div>
      </div>

      <!-- Main Studio Grid -->
      <div class="l-columns__area">
        <div class="cs-studio-grid">
          <!-- Left Column: Controls & Markdown Editor -->
          <div class="cs-editor-col">
            <!-- Presets & Toolbar Card -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Cheatsheet Presets</h3>
                <app-button variant="outline" size="small" (clicked)="resetToDefaults()">
                  🔄 Reset
                </app-button>
              </div>

              <div class="presets-row g--margin-top-3">
                <button
                  type="button"
                  class="c-button--chip"
                  [class.c-button--chip-active]="activePreset() === 'python'"
                  (click)="loadPreset('python')">
                  🐍 Python 3
                </button>
                <button
                  type="button"
                  class="c-button--chip"
                  [class.c-button--chip-active]="activePreset() === 'git'"
                  (click)="loadPreset('git')">
                  ⚡ Git &amp; CLI
                </button>
                <button
                  type="button"
                  class="c-button--chip"
                  [class.c-button--chip-active]="activePreset() === 'javascript'"
                  (click)="loadPreset('javascript')">
                  📜 TypeScript
                </button>
              </div>
            </app-card>

            <!-- Layout Options Card -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Layout &amp; Typography</h3>
              </div>

              <div class="g--margin-top-3">
                <div class="form-row g--margin-bottom-3">
                  <div class="form-group">
                    <label class="form-label">Columns</label>
                    <div class="columns-selector-buttons">
                      <button
                        type="button"
                        class="col-btn"
                        [class.col-btn--active]="config().columns === 2"
                        (click)="updateColumns(2)">
                        2 Cols
                      </button>
                      <button
                        type="button"
                        class="col-btn"
                        [class.col-btn--active]="config().columns === 3"
                        (click)="updateColumns(3)">
                        3 Cols
                      </button>
                      <button
                        type="button"
                        class="col-btn"
                        [class.col-btn--active]="config().columns === 4"
                        (click)="updateColumns(4)">
                        4 Cols
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Paper Format</label>
                    <select
                      class="c-input--select"
                      [value]="config().paperSize"
                      (change)="updatePaperSize($any($event.target).value)">
                      <option value="a4">A4 (210 &times; 297 mm)</option>
                      <option value="letter">Letter (8.5 &times; 11 in)</option>
                    </select>
                  </div>
                </div>

                <div class="form-row g--margin-bottom-3">
                  <div class="form-group">
                    <label class="form-label">Orientation</label>
                    <select
                      class="c-input--select"
                      [value]="config().orientation"
                      (change)="updateOrientation($any($event.target).value)">
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Base Font Size ({{ config().fontSizePt }}pt)</label>
                    <input
                      type="range"
                      min="8"
                      max="12"
                      step="1"
                      class="c-input--range"
                      [value]="config().fontSizePt"
                      (input)="updateFontSize(+$any($event.target).value)" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Accent Color</label>
                    <div class="color-picker-input">
                      <input
                        type="color"
                        [value]="config().accentColor"
                        (input)="updateAccentColor($any($event.target).value)"
                        class="color-swatch" />
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().accentColor"
                        (input)="updateAccentColor($any($event.target).value)" />
                    </div>
                  </div>

                  <div class="form-group g--flex-center" style="align-items: flex-end; padding-bottom: 8px;">
                    <label class="c-checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="config().includeFooter"
                        (change)="updateIncludeFooter($any($event.target).checked)" />
                      <span>Include footer &amp; page numbers</span>
                    </label>
                  </div>
                </div>
              </div>
            </app-card>

            <!-- Markdown Document Editor Card -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Markdown Editor</h3>
                <!-- Quick Snippets -->
                <div class="snippets-bar">
                  <button type="button" class="snippet-btn" (click)="insertSnippet('table')">+ Table</button>
                  <button type="button" class="snippet-btn" (click)="insertSnippet('code')">+ Code</button>
                  <button type="button" class="snippet-btn" (click)="insertSnippet('callout')">+ Note</button>
                </div>
              </div>

              <div class="g--margin-top-3">
                <div class="form-row g--margin-bottom-2">
                  <div class="form-group" style="flex: 2;">
                    <label class="form-label">Document Title</label>
                    <input
                      type="text"
                      class="c-input--text"
                      [value]="config().title"
                      (input)="updateTitle($any($event.target).value)"
                      placeholder="e.g. Algorithms Quick Reference" />
                  </div>
                  <div class="form-group" style="flex: 2;">
                    <label class="form-label">Subtitle / Description</label>
                    <input
                      type="text"
                      class="c-input--text"
                      [value]="config().subtitle"
                      (input)="updateSubtitle($any($event.target).value)"
                      placeholder="e.g. Asymptotic complexity & syntax" />
                  </div>
                </div>

                <div class="form-group g--margin-top-2">
                  <label class="form-label">Markdown Source Code</label>
                  <textarea
                    class="c-input--textarea markdown-textarea"
                    rows="18"
                    [value]="config().markdownContent"
                    (input)="updateMarkdownContent($any($event.target).value)"
                    placeholder="Type or paste markdown content..."></textarea>
                </div>
              </div>
            </app-card>
          </div>

          <!-- Right Column: Live Sheet Preview & Export Hub -->
          <div class="cs-preview-col">
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <div class="g--flex-center" style="gap: 8px;">
                  <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Live Print Preview</h3>
                  <span class="preview-badge">
                    {{ config().paperSize.toUpperCase() }} {{ config().orientation }} &bull; {{ config().columns }} Cols
                  </span>
                </div>
              </div>

              <!-- Page Simulation Frame -->
              <div class="page-viewport-outer g--margin-top-3">
                <div
                  class="paper-sheet"
                  [class.paper-sheet--landscape]="config().orientation === 'landscape'"
                  [innerHTML]="safePreviewHtml()">
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="action-buttons-grid g--margin-top-4">
                <app-button
                  variant="primary"
                  size="normal"
                  (clicked)="downloadPdf()">
                  💾 Download Cheatsheet PDF
                </app-button>
                <app-button
                  variant="secondary"
                  size="normal"
                  (clicked)="printCheatsheet()">
                  🖨️ Print / Save as PDF
                </app-button>
                <app-button
                  variant="outline"
                  size="normal"
                  (clicked)="copyHtml()">
                  📋 Copy HTML
                </app-button>
              </div>

              @if (copiedHtmlState()) {
                <div class="copy-banner g--margin-top-3">
                  ✨ Rendered HTML copied to clipboard!
                </div>
              }

              <!-- Ad Slot 2 (Medium Rectangle 300x250) -->
              <div class="g--margin-top-4 g--text-center print-hidden">
                <div
                  class="ad-slot ad-slot--rectangle"
                  style="width: 300px; height: 250px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
                  <span>SPONSOR ADVERTISEMENT (300&times;250)</span>
                </div>
              </div>
            </app-card>

            <!-- Guide Card -->
            <app-card>
              <h4 style="margin: 0 0 10px 0; font-size: 1rem; font-weight: 700;">
                High-Density Cheatsheet Tips
              </h4>
              <ul class="cs-tips-list">
                <li>
                  <strong>Break Avoidance</strong>: Section headers and code snippets automatically preserve their internal blocks across columns.
                </li>
                <li>
                  <strong>2-Sided Printing</strong>: Print landscape sheets with 3 columns, flip on short edge, for convenient folding.
                </li>
                <li>
                  <strong>Offline Execution</strong>: Your proprietary code and academic notes never touch external servers or telemetry trackers.
                </li>
              </ul>
            </app-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .cs-studio-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (min-width: 1024px) {
      .cs-studio-grid {
        grid-template-columns: 1fr 1.15fr;
      }
    }

    .presets-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .c-button--chip {
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 9999px;
      padding: 4px 12px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--color-text);
      transition: all 0.15s ease;
    }
    .c-button--chip:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .c-button--chip-active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #ffffff;
    }

    .columns-selector-buttons {
      display: flex;
      gap: 4px;
    }

    .col-btn {
      flex: 1;
      padding: 6px 10px;
      font-size: 0.8125rem;
      font-weight: 600;
      border: 1px solid var(--color-border);
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--color-text-muted);
      transition: all 0.15s ease;
    }
    .col-btn:hover {
      color: var(--color-text);
    }
    .col-btn--active {
      background: var(--color-primary);
      color: #ffffff;
      border-color: var(--color-primary);
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .form-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .color-picker-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .color-swatch {
      width: 38px;
      height: 38px;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      background: none;
    }

    .snippets-bar {
      display: flex;
      gap: 6px;
    }

    .snippet-btn {
      padding: 3px 8px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px dashed var(--color-border);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--color-text-muted);
    }
    .snippet-btn:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .markdown-textarea {
      font-family: monospace;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .page-viewport-outer {
      background: #475569;
      padding: 16px;
      border-radius: var(--radius-md);
      overflow-x: auto;
      display: flex;
      justify-content: center;
    }

    .paper-sheet {
      background: #ffffff;
      color: #1e293b;
      width: 100%;
      max-width: 650px;
      min-height: 850px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
      border-radius: 2px;
    }

    .paper-sheet--landscape {
      max-width: 880px;
      min-height: 620px;
    }

    .preview-badge {
      font-size: 0.75rem;
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      padding: 2px 8px;
      border-radius: 4px;
      color: var(--color-text-muted);
    }

    .action-buttons-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .copy-banner {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid #10b981;
      color: #065f46;
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-size: 0.8125rem;
    }

    .c-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .cs-tips-list {
      margin: 0;
      padding-left: 20px;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      line-height: 1.6;
    }
  `,
})
export class MarkdownCheatsheetComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly STORAGE_KEY = 'privknife_markdown_cheatsheet_draft';

  readonly config = signal<CheatsheetConfig>(this.clone(DEFAULT_CHEATSHEET_CONFIG));
  readonly activePreset = signal<CheatsheetPresetKey>('python');
  readonly copiedHtmlState = signal<boolean>(false);

  readonly renderedHtml = computed(() => generateCheatsheetPreviewHtml(this.config()));
  readonly safePreviewHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.renderedHtml())
  );

  ngOnInit(): void {
    this.loadSavedDraft();
  }

  updateColumns(columns: ColumnCount): void {
    this.config.update((c) => {
      const next = { ...c, columns };
      this.saveDraft(next);
      return next;
    });
  }

  updatePaperSize(paperSize: PaperSize): void {
    this.config.update((c) => {
      const next = { ...c, paperSize };
      this.saveDraft(next);
      return next;
    });
  }

  updateOrientation(orientation: Orientation): void {
    this.config.update((c) => {
      const next = { ...c, orientation };
      this.saveDraft(next);
      return next;
    });
  }

  updateFontSize(fontSizePt: number): void {
    this.config.update((c) => {
      const next = { ...c, fontSizePt };
      this.saveDraft(next);
      return next;
    });
  }

  updateAccentColor(accentColor: string): void {
    this.config.update((c) => {
      const next = { ...c, accentColor };
      this.saveDraft(next);
      return next;
    });
  }

  updateIncludeFooter(includeFooter: boolean): void {
    this.config.update((c) => {
      const next = { ...c, includeFooter };
      this.saveDraft(next);
      return next;
    });
  }

  updateTitle(title: string): void {
    this.config.update((c) => {
      const next = { ...c, title };
      this.saveDraft(next);
      return next;
    });
  }

  updateSubtitle(subtitle: string): void {
    this.config.update((c) => {
      const next = { ...c, subtitle };
      this.saveDraft(next);
      return next;
    });
  }

  updateMarkdownContent(markdownContent: string): void {
    this.config.update((c) => {
      const next = { ...c, markdownContent };
      this.saveDraft(next);
      return next;
    });
  }

  loadPreset(preset: CheatsheetPresetKey): void {
    this.activePreset.set(preset);
    let target: CheatsheetConfig;
    switch (preset) {
      case 'git':
        target = GIT_CHEATSHEET_CONFIG;
        break;
      case 'javascript':
        target = JAVASCRIPT_CHEATSHEET_CONFIG;
        break;
      case 'python':
      default:
        target = DEFAULT_CHEATSHEET_CONFIG;
        break;
    }
    const cloned = this.clone(target);
    this.config.set(cloned);
    this.saveDraft(cloned);
  }

  insertSnippet(type: 'table' | 'code' | 'callout' | 'list'): void {
    let snippet = '';
    switch (type) {
      case 'table':
        snippet = '\n\n| Feature | Details |\n| :--- | :--- |\n| Item 1 | Description 1 |\n| Item 2 | Description 2 |\n';
        break;
      case 'code':
        snippet = '\n\n```python\ndef handler(event):\n    return {"status": "ok"}\n```\n';
        break;
      case 'callout':
        snippet = '\n\n> **Important**: Crucial exam or architecture tip here.\n';
        break;
      case 'list':
        snippet = '\n\n- Parameter A: Description\n- Parameter B: Description\n';
        break;
    }
    this.config.update((c) => {
      const next = { ...c, markdownContent: c.markdownContent + snippet };
      this.saveDraft(next);
      return next;
    });
  }

  resetToDefaults(): void {
    const fresh = this.clone(DEFAULT_CHEATSHEET_CONFIG);
    this.config.set(fresh);
    this.activePreset.set('python');
    this.saveDraft(fresh);
  }

  downloadPdf(): void {
    const blob = exportCheatsheetPdfBlob(this.config());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.config().title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cheatsheet'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  printCheatsheet(): void {
    window.print();
  }

  async copyHtml(): Promise<void> {
    const html = this.renderedHtml();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(html);
      }
      this.copiedHtmlState.set(true);
      setTimeout(() => this.copiedHtmlState.set(false), 3000);
    } catch {
      // Ignore
    }
  }

  private saveDraft(cfg: CheatsheetConfig): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      // Ignore
    }
  }

  private loadSavedDraft(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.title && parsed.markdownContent) {
          this.config.set(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
