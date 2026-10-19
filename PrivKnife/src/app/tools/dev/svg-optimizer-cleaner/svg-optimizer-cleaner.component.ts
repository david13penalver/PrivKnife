import { Component, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  CodeExportFormat,
  SvgOptimizerCleanerOptions,
  SvgOptimizerCleanerResult,
} from './types';
import { optimizeSvg } from './engine';
import { SAMPLE_BLOATED_SVG } from './test-fixtures';

@Component({
  selector: 'app-svg-optimizer-cleaner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <header class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">SVG Optimizer, Path Cleaner & React/Vue Exporter</h1>
          <p class="c-header__subtitle">
            Minify bloated vector SVGs, strip metadata and editor junk, round coordinates,
            and export ready-to-paste React JSX/TSX or Vue 3 component code with instant visual diffing.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </header>

      <!-- Main Columns -->
      <div class="l-columns l-columns--2">
        <!-- Configuration & Input Column -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <div class="l-extremo__area-izquierda">
              <h2 class="c-card__title">SVG Input & Settings</h2>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="loadSampleSvg()"
              >
                Load Sample SVG
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
                accept=".svg,image/svg+xml"
                style="display: none"
                (change)="onFileInputChange($event)"
              />
              <div class="c-dropzone__content">
                <span class="c-dropzone__icon">📄</span>
                <span class="c-dropzone__prompt">
                  <strong>Click to upload</strong> or drag & drop an SVG file here
                </span>
                <span class="c-dropzone__hint">Processed strictly inside your browser</span>
              </div>
            </div>

            <!-- Paste Raw SVG -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label" for="rawSvgInput">Raw SVG Markup</label>
              <textarea
                id="rawSvgInput"
                class="c-input__textarea"
                rows="5"
                placeholder="Paste <svg>...</svg> markup here..."
                [ngModel]="inputSvg()"
                (ngModelChange)="setInputSvg($event)"
              ></textarea>
            </div>

            <!-- Optimization Parameters -->
            <h3 class="c-card__subtitle g--margin-bottom-2">Optimization Parameters</h3>

            <div class="c-input g--margin-bottom-3">
              <div class="l-extremo g--margin-bottom-1">
                <label class="c-input__label l-extremo__area-izquierda" for="floatPrecision">
                  Coordinate Precision (Decimal Places)
                </label>
                <span class="c-badge l-extremo__area-derecha">{{ floatPrecision() }}</span>
              </div>
              <input
                id="floatPrecision"
                type="range"
                min="0"
                max="5"
                step="1"
                class="c-input__range"
                [ngModel]="floatPrecision()"
                (ngModelChange)="setFloatPrecision(+$event)"
              />
            </div>

            <!-- Checkboxes Grid -->
            <div class="options-grid g--margin-bottom-4">
              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="stripMetadataComments()"
                  (change)="toggleStripMetadata()"
                />
                Strip Metadata, Titles & Comments
              </label>

              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="cleanupIds()"
                  (change)="toggleCleanupIds()"
                />
                Clean Unused Editor IDs
              </label>

              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="collapseUselessGroups()"
                  (change)="toggleCollapseGroups()"
                />
                Collapse Redundant Groups (&lt;g&gt;)
              </label>

              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="convertColorsToHex()"
                  (change)="toggleConvertColors()"
                />
                Compact Colors to Short Hex
              </label>

              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="removeDimensionsForViewBox()"
                  (change)="toggleRemoveDimensions()"
                />
                Make Responsive (Remove width/height for viewBox)
              </label>
            </div>

            <!-- Component Exporter Options -->
            <h3 class="c-card__subtitle g--margin-bottom-2">Target Code Format</h3>
            <div class="format-buttons g--margin-bottom-3">
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="codeExportFormat() === 'svg'"
                [class.c-button--outline]="codeExportFormat() !== 'svg'"
                (click)="setCodeExportFormat('svg')"
              >
                SVG File
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="codeExportFormat() === 'react_tsx'"
                [class.c-button--outline]="codeExportFormat() !== 'react_tsx'"
                (click)="setCodeExportFormat('react_tsx')"
              >
                React TSX
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="codeExportFormat() === 'vue_sfc'"
                [class.c-button--outline]="codeExportFormat() !== 'vue_sfc'"
                (click)="setCodeExportFormat('vue_sfc')"
              >
                Vue 3 SFC
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="codeExportFormat() === 'svelte'"
                [class.c-button--outline]="codeExportFormat() !== 'svelte'"
                (click)="setCodeExportFormat('svelte')"
              >
                Svelte
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="codeExportFormat() === 'data_uri'"
                [class.c-button--outline]="codeExportFormat() !== 'data_uri'"
                (click)="setCodeExportFormat('data_uri')"
              >
                Data URI
              </button>
            </div>

            <div class="c-input g--margin-bottom-2">
              <label class="c-input__label" for="compName">Component Name</label>
              <input
                id="compName"
                type="text"
                class="c-input__field"
                [ngModel]="componentName()"
                (ngModelChange)="setComponentName($event)"
                placeholder="CustomSvgIcon"
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
                (click)="downloadResult()"
              >
                Download {{ result()?.fileName || 'File' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Preview & Deliverable Output Column -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <div class="l-extremo__area-izquierda">
              <h2 class="c-card__title">Optimization Output</h2>
            </div>
            <div class="l-extremo__area-derecha">
              <div class="tab-buttons">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activeTab() === 'preview'"
                  [class.c-button--outline]="activeTab() !== 'preview'"
                  (click)="setActiveTab('preview')"
                >
                  Visual Preview
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activeTab() === 'code'"
                  [class.c-button--outline]="activeTab() !== 'code'"
                  (click)="setActiveTab('code')"
                >
                  Code Inspector
                </button>
              </div>
            </div>
          </div>

          <div class="c-card__body">
            @if (result() && result()?.success) {
              <!-- Savings Stats Banner -->
              <div class="stats-banner g--margin-bottom-3">
                <div class="stat-item">
                  <span class="stat-label">Original</span>
                  <span class="stat-value">{{ formatBytes(result()!.stats.originalBytes) }}</span>
                </div>
                <div class="stat-arrow">➔</div>
                <div class="stat-item">
                  <span class="stat-label">Optimized</span>
                  <span class="stat-value stat-value--highlight">
                    {{ formatBytes(result()!.stats.optimizedBytes) }}
                  </span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Savings</span>
                  <span class="stat-value stat-value--positive">
                    -{{ result()!.stats.savingsPercent }}%
                  </span>
                </div>
              </div>

              @if (activeTab() === 'preview') {
                <div class="preview-split">
                  <div class="preview-box">
                    <span class="preview-tag">Before Optimization</span>
                    <div class="svg-render-area" [innerHTML]="safeOriginalSvg()"></div>
                  </div>
                  <div class="preview-box">
                    <span class="preview-tag preview-tag--optimized">After Optimization</span>
                    <div class="svg-render-area" [innerHTML]="safeOptimizedSvg()"></div>
                  </div>
                </div>
              } @else {
                <div class="code-container">
                  <div class="code-header l-extremo">
                    <span class="code-filename l-extremo__area-izquierda">{{ result()?.fileName }}</span>
                    <button
                      type="button"
                      class="c-button c-button--small c-button--outline l-extremo__area-derecha"
                      (click)="copyCode()"
                    >
                      {{ copiedFeedback() ? '✓ Copied!' : 'Copy Code' }}
                    </button>
                  </div>
                  <pre class="code-block"><code>{{ result()?.code }}</code></pre>
                </div>
              }
            } @else if (result() && !result()?.success) {
              <div class="c-alert c-alert--danger">
                <strong>Error:</strong> {{ result()?.error }}
              </div>
            } @else {
              <div class="empty-state">
                <span class="empty-state__icon">⚡</span>
                <p>Paste or upload an SVG to view real-time optimization and export code.</p>
              </div>
            }
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="!result() || !result()?.success"
                (click)="copyCode()"
              >
                {{ copiedFeedback() ? '✓ Copied to Clipboard!' : 'Copy Code' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .options-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    .c-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .format-buttons, .tab-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
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
      font-size: 0.75rem;
      color: var(--color-text-muted, #64748b);
      text-transform: uppercase;
      font-weight: 600;
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
    .preview-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 640px) {
      .preview-split {
        grid-template-columns: 1fr;
      }
    }
    .preview-box {
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 0.375rem;
      overflow: hidden;
      background: #fafafa;
    }
    .preview-tag {
      display: block;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      background: #e2e8f0;
      color: #475569;
    }
    .preview-tag--optimized {
      background: #dcfce7;
      color: #166534;
    }
    .svg-render-area {
      min-height: 180px;
      max-height: 260px;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    }
    ::ng-deep .svg-render-area svg {
      max-width: 100%;
      max-height: 200px;
      height: auto;
    }
    .code-container {
      border: 1px solid var(--color-border, #cbd5e1);
      border-radius: 0.375rem;
      overflow: hidden;
    }
    .code-header {
      background: #e2e8f0;
      padding: 0.375rem 0.75rem;
      font-family: monospace;
      font-size: 0.8125rem;
    }
    .code-block {
      max-height: 320px;
      overflow: auto;
      padding: 0.75rem;
      margin: 0;
      background: #0f172a;
      color: #f8fafc;
      font-size: 0.8125rem;
      line-height: 1.4;
      font-family: 'Fira Code', monospace;
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
export class SvgOptimizerCleanerComponent implements OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private activeObjectUrls = new Set<string>();

  // State Signals
  readonly inputSvg = signal<string>('');
  readonly floatPrecision = signal<number>(2);
  readonly stripMetadataComments = signal<boolean>(true);
  readonly cleanupIds = signal<boolean>(true);
  readonly collapseUselessGroups = signal<boolean>(true);
  readonly convertColorsToHex = signal<boolean>(true);
  readonly removeDimensionsForViewBox = signal<boolean>(true);
  readonly codeExportFormat = signal<CodeExportFormat>('svg');
  readonly componentName = signal<string>('CustomSvgIcon');
  readonly copiedFeedback = signal<boolean>(false);
  readonly activeTab = signal<'preview' | 'code'>('preview');

  // Computed Optimization
  readonly result = computed<SvgOptimizerCleanerResult | null>(() => {
    const raw = this.inputSvg().trim();
    if (!raw) return null;

    const options: SvgOptimizerCleanerOptions = {
      floatPrecision: this.floatPrecision(),
      stripMetadataComments: this.stripMetadataComments(),
      cleanupIds: this.cleanupIds(),
      collapseUselessGroups: this.collapseUselessGroups(),
      convertColorsToHex: this.convertColorsToHex(),
      removeDimensionsForViewBox: this.removeDimensionsForViewBox(),
      codeExportFormat: this.codeExportFormat(),
      componentName: this.componentName() || 'CustomSvgIcon',
    };

    return optimizeSvg(raw, options);
  });

  // Safe HTML views
  readonly safeOriginalSvg = computed<SafeHtml>(() => {
    return this.sanitizer.bypassSecurityTrustHtml(this.inputSvg());
  });

  readonly safeOptimizedSvg = computed<SafeHtml>(() => {
    const res = this.result();
    return this.sanitizer.bypassSecurityTrustHtml(res?.optimizedSvg || '');
  });

  setInputSvg(svg: string) {
    this.inputSvg.set(svg);
  }

  setFloatPrecision(precision: number) {
    this.floatPrecision.set(Math.max(0, Math.min(5, precision)));
  }

  setCodeExportFormat(format: CodeExportFormat) {
    this.codeExportFormat.set(format);
  }

  setComponentName(name: string) {
    this.componentName.set(name);
  }

  setActiveTab(tab: 'preview' | 'code') {
    this.activeTab.set(tab);
  }

  toggleStripMetadata() {
    this.stripMetadataComments.update((v) => !v);
  }

  toggleCleanupIds() {
    this.cleanupIds.update((v) => !v);
  }

  toggleCollapseGroups() {
    this.collapseUselessGroups.update((v) => !v);
  }

  toggleConvertColors() {
    this.convertColorsToHex.update((v) => !v);
  }

  toggleRemoveDimensions() {
    this.removeDimensionsForViewBox.update((v) => !v);
  }

  loadSampleSvg() {
    this.setInputSvg(SAMPLE_BLOATED_SVG);
  }

  async handleFileSelected(file: File) {
    if (!file) return;
    const text = await file.text();
    this.setInputSvg(text);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    if (baseName) {
      this.setComponentName(baseName.replace(/[^a-zA-Z0-9_]/g, ''));
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

  downloadResult() {
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

  async copyCode() {
    const res = this.result();
    if (!res || !res.success) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(res.code);
        this.copiedFeedback.set(true);
        setTimeout(() => this.copiedFeedback.set(false), 2000);
      }
    } catch {
      // Fallback or ignore
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
    this.inputSvg.set('');
    this.floatPrecision.set(2);
    this.stripMetadataComments.set(true);
    this.cleanupIds.set(true);
    this.collapseUselessGroups.set(true);
    this.convertColorsToHex.set(true);
    this.removeDimensionsForViewBox.set(true);
    this.codeExportFormat.set('svg');
    this.componentName.set('CustomSvgIcon');
    this.copiedFeedback.set(false);
    this.activeTab.set('preview');

    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }

  ngOnDestroy() {
    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }
}
