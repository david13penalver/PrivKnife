import { Component, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FontOutputFormat,
  FontSubsetPreset,
  FontSubsetterConverterOptions,
  FontSubsetterConverterResult,
} from './types';
import { processFontSubset } from './engine';
import { createSyntheticTrueTypeFont } from './test-fixtures';

@Component({
  selector: 'app-font-subsetter-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <header class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Web Font Subsetter & TTF/OTF to WOFF2 Converter</h1>
          <p class="c-header__subtitle">
            Compress heavy desktop typography into ultra-compact WOFF2 web fonts by stripping unused glyphs,
            cutting payloads by up to 95% with zero server uploads.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </header>

      <!-- Main Columns -->
      <div class="l-columns l-columns--2">
        <!-- Configuration & Upload Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <h2 class="c-card__title l-extremo__area-izquierda">Font File & Subsetting</h2>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="loadSampleFont()"
              >
                Load Sample Font
              </button>
            </div>
          </div>

          <div class="c-card__body">
            <!-- Dropzone -->
            <div
              class="c-dropzone g--margin-bottom-4"
              (dragover)="$event.preventDefault()"
              (drop)="onFileDrop($event)"
              (click)="fileInput.click()"
            >
              <input
                #fileInput
                type="file"
                accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                style="display: none"
                (change)="onFileInputChange($event)"
              />
              <div class="c-dropzone__content">
                <span class="c-dropzone__icon">🔤</span>
                <span class="c-dropzone__prompt">
                  @if (selectedFileName()) {
                    <strong>{{ selectedFileName() }}</strong>
                  } @else {
                    <strong>Click to upload font</strong> or drag & drop TTF, OTF, WOFF here
                  }
                </span>
                <span class="c-dropzone__hint">Processed strictly on your local device</span>
              </div>
            </div>

            <!-- Subsetting Preset -->
            <h3 class="c-card__subtitle g--margin-bottom-2">Glyph Subsetting Preset</h3>
            <div class="preset-buttons g--margin-bottom-3">
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="subsetPreset() === 'basic_latin_ascii'"
                [class.c-button--outline]="subsetPreset() !== 'basic_latin_ascii'"
                (click)="setSubsetPreset('basic_latin_ascii')"
              >
                Basic Latin (ASCII)
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="subsetPreset() === 'latin_supplement'"
                [class.c-button--outline]="subsetPreset() !== 'latin_supplement'"
                (click)="setSubsetPreset('latin_supplement')"
              >
                Latin Supplement (á, ñ, ü)
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="subsetPreset() === 'numbers_punctuation_only'"
                [class.c-button--outline]="subsetPreset() !== 'numbers_punctuation_only'"
                (click)="setSubsetPreset('numbers_punctuation_only')"
              >
                Numbers & Punctuation
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="subsetPreset() === 'custom_characters'"
                [class.c-button--outline]="subsetPreset() !== 'custom_characters'"
                (click)="setSubsetPreset('custom_characters')"
              >
                Custom Characters
              </button>
            </div>

            <!-- Custom Characters Textarea -->
            @if (subsetPreset() === 'custom_characters') {
              <div class="c-input g--margin-bottom-3">
                <label class="c-input__label" for="customCharsInput">Custom Characters to Retain</label>
                <textarea
                  id="customCharsInput"
                  class="c-input__textarea"
                  rows="3"
                  placeholder="Paste only the exact characters needed..."
                  [ngModel]="customCharacters()"
                  (ngModelChange)="setCustomCharacters($event)"
                ></textarea>
              </div>
            }

            <!-- Table Stripping Options -->
            <h3 class="c-card__subtitle g--margin-bottom-2">Optimization Toggles</h3>
            <div class="options-grid g--margin-bottom-4">
              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="dropLayoutFeatures()"
                  (change)="toggleDropLayoutFeatures()"
                />
                Drop OpenType Layout Features (GSUB, GPOS, GDEF)
              </label>

              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="keepKerningTables()"
                  (change)="toggleKeepKerningTables()"
                />
                Preserve Kerning Tables (kern)
              </label>
            </div>

            <!-- Output Format & Family Name -->
            <h3 class="c-card__subtitle g--margin-bottom-2">Output Format</h3>
            <div class="preset-buttons g--margin-bottom-3">
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="outputFormat() === 'woff2'"
                [class.c-button--outline]="outputFormat() !== 'woff2'"
                (click)="setOutputFormat('woff2')"
              >
                WOFF2 (Modern Web)
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="outputFormat() === 'woff'"
                [class.c-button--outline]="outputFormat() !== 'woff'"
                (click)="setOutputFormat('woff')"
              >
                WOFF 1.0 (Legacy)
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="outputFormat() === 'ttf'"
                [class.c-button--outline]="outputFormat() !== 'ttf'"
                (click)="setOutputFormat('ttf')"
              >
                TrueType (.ttf)
              </button>
            </div>

            <div class="c-input g--margin-bottom-2">
              <label class="c-input__label" for="fontFamilyName">Font Family Name</label>
              <input
                id="fontFamilyName"
                type="text"
                class="c-input__field"
                [ngModel]="fontFamilyName()"
                (ngModelChange)="setFontFamilyName($event)"
                placeholder="CustomFont"
              />
            </div>
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="reset()"
              >
                Reset to Defaults
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="!result() || !result()?.success"
                (click)="downloadFont()"
              >
                Download {{ result()?.fileName || 'Font' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Preview & Deliverable Column -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <h2 class="c-card__title l-extremo__area-izquierda">Live Specimen & CSS</h2>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                [disabled]="!result() || !result()?.success"
                (click)="downloadCss()"
              >
                Download .css
              </button>
            </div>
          </div>

          <div class="c-card__body">
            @if (result() && result()?.success) {
              <!-- Stats Banner -->
              <div class="stats-banner g--margin-bottom-4">
                <div class="stat-item">
                  <span class="stat-label">Original</span>
                  <span class="stat-value">{{ formatBytes(result()!.stats.originalBytes) }}</span>
                </div>
                <div class="stat-arrow">➔</div>
                <div class="stat-item">
                  <span class="stat-label">Subset</span>
                  <span class="stat-value stat-value--highlight">
                    {{ formatBytes(result()!.stats.subsetBytes) }}
                  </span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Savings</span>
                  <span class="stat-value stat-value--positive">
                    -{{ result()!.stats.savingsPercent }}%
                  </span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Glyphs</span>
                  <span class="stat-value">{{ result()!.stats.retainedGlyphCount }}</span>
                </div>
              </div>

              <!-- Specimen Controls -->
              <div class="specimen-controls g--margin-bottom-2 l-extremo">
                <label class="c-input__label l-extremo__area-izquierda" for="fontSizeRange">
                  Specimen Size: {{ specimenFontSize() }}px
                </label>
                <input
                  id="fontSizeRange"
                  type="range"
                  min="14"
                  max="48"
                  class="c-input__range l-extremo__area-derecha"
                  [ngModel]="specimenFontSize()"
                  (ngModelChange)="specimenFontSize.set(+$event)"
                />
              </div>

              <!-- Specimen Preview Area -->
              <div class="specimen-box g--margin-bottom-4">
                <textarea
                  class="specimen-textarea"
                  [style.font-size.px]="specimenFontSize()"
                  [ngModel]="specimenText()"
                  (ngModelChange)="specimenText.set($event)"
                  rows="3"
                ></textarea>
              </div>

              <!-- @font-face Code Snippet -->
              <div class="css-snippet-box">
                <div class="code-header l-extremo">
                  <span class="code-title l-extremo__area-izquierda">@font-face CSS snippet</span>
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small l-extremo__area-derecha"
                    (click)="copyCssSnippet()"
                  >
                    {{ copiedCssFeedback() ? '✓ Copied CSS!' : 'Copy CSS' }}
                  </button>
                </div>
                <pre class="code-block"><code>{{ result()?.cssSnippet }}</code></pre>
              </div>
            } @else if (result() && !result()?.success) {
              <div class="c-alert c-alert--danger">
                <strong>Error:</strong> {{ result()?.error }}
              </div>
            } @else {
              <div class="empty-state">
                <span class="empty-state__icon">🔤</span>
                <p>Upload a font or load the sample preset to inspect glyph subsetting and @font-face rules.</p>
              </div>
            }
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="!result() || !result()?.success"
                (click)="copyCssSnippet()"
              >
                {{ copiedCssFeedback() ? '✓ Copied to Clipboard!' : 'Copy @font-face CSS' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .preset-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    .c-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .stats-banner {
      display: flex;
      align-items: center;
      justify-content: space-around;
      background: var(--color-surface-variant, #f1f5f9);
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--color-border, #cbd5e1);
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .stat-label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--color-text-muted, #64748b);
    }
    .stat-value {
      font-size: 1.125rem;
      font-weight: 700;
    }
    .stat-value--highlight {
      color: var(--color-primary, #2563eb);
    }
    .stat-value--positive {
      color: #16a34a;
    }
    .stat-arrow {
      font-size: 1.25rem;
      color: var(--color-text-muted, #94a3b8);
    }
    .specimen-controls {
      display: flex;
      align-items: center;
    }
    .specimen-box {
      border: 1px solid var(--color-border, #cbd5e1);
      border-radius: 0.375rem;
      background: #ffffff;
      padding: 0.5rem;
    }
    .specimen-textarea {
      width: 100%;
      border: none;
      outline: none;
      resize: vertical;
      font-family: inherit;
      line-height: 1.4;
      background: transparent;
      box-sizing: border-box;
    }
    .css-snippet-box {
      border: 1px solid var(--color-border, #cbd5e1);
      border-radius: 0.375rem;
      overflow: hidden;
    }
    .code-header {
      background: #e2e8f0;
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      font-family: monospace;
    }
    .code-block {
      max-height: 220px;
      overflow: auto;
      padding: 0.75rem;
      margin: 0;
      background: #0f172a;
      color: #f8fafc;
      font-size: 0.8125rem;
      line-height: 1.4;
      font-family: 'Fira Code', Consolas, monospace;
    }
    .empty-state {
      padding: 3rem 1rem;
      text-align: center;
      color: var(--color-text-muted, #64748b);
    }
    .empty-state__icon {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 0.5rem;
    }
    .c-alert {
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    .c-alert--danger {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
    }
  `],
})
export class FontSubsetterConverterComponent implements OnDestroy {
  private activeObjectUrls = new Set<string>();

  // State Signals
  readonly fontBuffer = signal<ArrayBuffer | null>(null);
  readonly selectedFileName = signal<string>('');
  readonly subsetPreset = signal<FontSubsetPreset>('basic_latin_ascii');
  readonly customCharacters = signal<string>('');
  readonly keepKerningTables = signal<boolean>(false);
  readonly dropLayoutFeatures = signal<boolean>(true);
  readonly outputFormat = signal<FontOutputFormat>('woff2');
  readonly fontFamilyName = signal<string>('CustomFont');
  readonly specimenText = signal<string>(
    'The quick brown fox jumps over the lazy dog 1234567890'
  );
  readonly specimenFontSize = signal<number>(24);
  readonly copiedCssFeedback = signal<boolean>(false);

  // Computed Subsetting Result
  readonly result = computed<FontSubsetterConverterResult | null>(() => {
    const buffer = this.fontBuffer();
    if (!buffer) return null;

    const options: FontSubsetterConverterOptions = {
      subsetPreset: this.subsetPreset(),
      customCharacters: this.customCharacters(),
      keepKerningTables: this.keepKerningTables(),
      dropLayoutFeatures: this.dropLayoutFeatures(),
      outputFormat: this.outputFormat(),
      fontFamilyName: this.fontFamilyName() || 'CustomFont',
    };

    return processFontSubset(buffer, options);
  });

  setSubsetPreset(preset: FontSubsetPreset) {
    this.subsetPreset.set(preset);
  }

  setCustomCharacters(chars: string) {
    this.customCharacters.set(chars);
  }

  setOutputFormat(format: FontOutputFormat) {
    this.outputFormat.set(format);
  }

  setFontFamilyName(name: string) {
    this.fontFamilyName.set(name);
  }

  toggleDropLayoutFeatures() {
    this.dropLayoutFeatures.update((v) => !v);
  }

  toggleKeepKerningTables() {
    this.keepKerningTables.update((v) => !v);
  }

  loadSampleFont() {
    const buffer = createSyntheticTrueTypeFont();
    this.fontBuffer.set(buffer);
    this.selectedFileName.set('sample_font.ttf');
    this.setFontFamilyName('SampleFont');
  }

  async handleFileSelected(file: File) {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    this.fontBuffer.set(buffer);
    this.selectedFileName.set(file.name);

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    if (baseName) {
      this.setFontFamilyName(baseName.replace(/[^a-zA-Z0-9_-]/g, ''));
    }
  }

  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFileSelected(input.files[0]);
    }
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.handleFileSelected(event.dataTransfer.files[0]);
    }
  }

  downloadFont() {
    const res = this.result();
    if (!res || !res.success) return;

    const url = URL.createObjectURL(res.blob);
    this.activeObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = res.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    this.activeObjectUrls.delete(url);
  }

  downloadCss() {
    const res = this.result();
    if (!res || !res.success) return;

    const blob = new Blob([res.cssSnippet], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    this.activeObjectUrls.add(url);

    const safeName = (this.fontFamilyName() || 'font').toLowerCase();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.css`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    this.activeObjectUrls.delete(url);
  }

  async copyCssSnippet() {
    const res = this.result();
    if (!res || !res.success) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(res.cssSnippet);
        this.copiedCssFeedback.set(true);
        setTimeout(() => this.copiedCssFeedback.set(false), 2000);
      }
    } catch {
      // Ignore
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  reset() {
    this.fontBuffer.set(null);
    this.selectedFileName.set('');
    this.subsetPreset.set('basic_latin_ascii');
    this.customCharacters.set('');
    this.keepKerningTables.set(false);
    this.dropLayoutFeatures.set(true);
    this.outputFormat.set('woff2');
    this.fontFamilyName.set('CustomFont');
    this.copiedCssFeedback.set(false);

    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }

  ngOnDestroy() {
    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }
}
