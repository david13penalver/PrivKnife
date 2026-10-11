import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Badge } from '../../../components/badge/badge';
import { Card } from '../../../components/card/card';
import {
  createDefaultOptions,
  generatePaperPdf,
  generatePaperSvg,
  getPaperDimensionsMm,
} from './engine';
import { POPULAR_PAPER_PRESETS } from './test-fixtures';
import {
  GridPaperOptions,
  GridStyle,
  PAPER_COLOR_PRESETS,
  PaperOrientation,
  PaperPreset,
  PaperSize,
} from './types';

const STORAGE_KEY = 'privknife_grid_paper_settings';

@Component({
  selector: 'app-grid-paper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Card, FormsModule],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1280px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1>Custom Printable Graph &amp; Dot Grid Paper</h1>
        <p class="g--margin-top-1" style="color: var(--color-text-muted); font-size: 1.0625rem;">
          Generate high-precision vector grid, dot, isometric, hexagonal, and ruled paper for notes, bullet journaling, and drafting.
        </p>
      </div>

      <!-- Top Leaderboard Ad Container (728x90) -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center print-hidden">
        <div
          class="ad-slot ad-slot--leaderboard"
          style="max-width: 728px; height: 90px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
          <span>Responsive Ad Placement (728x90 Top Leaderboard)</span>
        </div>
      </div>

      <!-- Mobile Tab Switcher (Visible on small screens) -->
      <div class="l-columns__area mobile-tab-bar g--margin-bottom-4 print-hidden">
        <div class="g--flex-center" style="gap: 8px;">
          <button
            type="button"
            class="c-button c-button--small"
            [class.c-button--primary]="activeMobileTab() === 'controls'"
            [class.c-button--outline]="activeMobileTab() !== 'controls'"
            (click)="setMobileTab('controls')"
            style="flex: 1;">
            ⚙️ Paper Settings
          </button>
          <button
            type="button"
            class="c-button c-button--small"
            [class.c-button--primary]="activeMobileTab() === 'preview'"
            [class.c-button--outline]="activeMobileTab() !== 'preview'"
            (click)="setMobileTab('preview')"
            style="flex: 1;">
            👁️ Page Preview
          </button>
        </div>
      </div>

      <!-- Main Two-Column Split Layout -->
      <div class="l-columns l-columns--2 paper-workspace" style="gap: 28px; align-items: start;">
        
        <!-- LEFT COLUMN: Settings & Control Sidebar -->
        <div
          class="l-columns__area controls-pane print-hidden"
          [class.mobile-hidden]="activeMobileTab() === 'preview'">

          <!-- Quick Presets Carousel -->
          <div class="g--margin-bottom-5">
            <app-card title="Popular Presets">
              <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap; justify-content: flex-start;">
                @for (preset of presets; track preset.id) {
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small"
                    [title]="preset.description"
                    (click)="applyPreset(preset.id)">
                    {{ preset.name }}
                  </button>
                }
              </div>
            </app-card>
          </div>

          <!-- Grid Style & Dimensions -->
          <div class="g--margin-bottom-5">
            <app-card title="Grid Style &amp; Sizing">
              <!-- Grid Style Buttons -->
              <div style="margin-bottom: 16px;">
                <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                  Grid Pattern
                </label>
                <div class="g--flex-center" style="gap: 6px; flex-wrap: wrap; justify-content: flex-start;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="options().gridStyle === 'dot'"
                    [class.c-button--outline]="options().gridStyle !== 'dot'"
                    (click)="setGridStyle('dot')">
                    Dot Grid
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="options().gridStyle === 'square'"
                    [class.c-button--outline]="options().gridStyle !== 'square'"
                    (click)="setGridStyle('square')">
                    Square Graph
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="options().gridStyle === 'isometric'"
                    [class.c-button--outline]="options().gridStyle !== 'isometric'"
                    (click)="setGridStyle('isometric')">
                    Isometric 3D
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="options().gridStyle === 'hexagonal'"
                    [class.c-button--outline]="options().gridStyle !== 'hexagonal'"
                    (click)="setGridStyle('hexagonal')">
                    Hexagonal
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="options().gridStyle === 'ruled'"
                    [class.c-button--outline]="options().gridStyle !== 'ruled'"
                    (click)="setGridStyle('ruled')">
                    Ruled / Lined
                  </button>
                </div>
              </div>

              <!-- Paper Size & Orientation -->
              <div class="l-columns l-columns--2" style="gap: 16px; margin-bottom: 16px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Paper Size
                  </label>
                  <select
                    class="c-input"
                    [ngModel]="options().paperSize"
                    (ngModelChange)="updateOption('paperSize', $event)"
                    style="width: 100%; font-size: 0.875rem;">
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                    <option value="legal">US Legal (8.5 × 14 in)</option>
                    <option value="a3">A3 (297 × 420 mm)</option>
                    <option value="a5">A5 (148 × 210 mm)</option>
                    <option value="custom">Custom Dimensions</option>
                  </select>
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Orientation
                  </label>
                  <div class="g--flex-center" style="gap: 6px; justify-content: flex-start;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="options().orientation === 'portrait'"
                      [class.c-button--outline]="options().orientation !== 'portrait'"
                      (click)="updateOption('orientation', 'portrait')">
                      Portrait
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="options().orientation === 'landscape'"
                      [class.c-button--outline]="options().orientation !== 'landscape'"
                      (click)="updateOption('orientation', 'landscape')">
                      Landscape
                    </button>
                  </div>
                </div>
              </div>

              <!-- Custom Dimensions (if selected) -->
              @if (options().paperSize === 'custom') {
                <div class="l-columns l-columns--2" style="gap: 16px; margin-bottom: 16px;">
                  <div>
                    <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      class="c-input"
                      [ngModel]="options().customWidth"
                      (ngModelChange)="updateOption('customWidth', +$event)"
                      style="width: 100%; font-size: 0.875rem;" />
                  </div>
                  <div>
                    <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      class="c-input"
                      [ngModel]="options().customHeight"
                      (ngModelChange)="updateOption('customHeight', +$event)"
                      style="width: 100%; font-size: 0.875rem;" />
                  </div>
                </div>
              }

              <!-- Grid Spacing (Pitch) Slider -->
              <div>
                <div class="l-extremo" style="margin-bottom: 4px;">
                  <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                    Grid Spacing / Pitch: <strong>{{ options().spacing }} mm</strong>
                  </label>
                  <span style="font-size: 0.75rem; color: var(--color-text-muted);">
                    (~{{ (options().spacing / 25.4).toFixed(3) }} in)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="0.5"
                  class="c-input"
                  [ngModel]="options().spacing"
                  (ngModelChange)="updateOption('spacing', +$event)"
                  style="width: 100%;" />
              </div>
            </app-card>
          </div>

          <!-- Appearance: Stroke, Opacity & Color -->
          <div class="g--margin-bottom-5">
            <app-card title="Line &amp; Dot Appearance">
              <!-- Color Presets -->
              <div style="margin-bottom: 16px;">
                <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                  Color Palette
                </label>
                <div class="g--flex-center" style="gap: 8px; justify-content: flex-start; flex-wrap: wrap;">
                  @for (color of colorPresets; track color.id) {
                    <button
                      type="button"
                      [title]="color.name"
                      [style.background-color]="color.hex"
                      [style.outline]="options().strokeColor === color.hex ? '2px solid var(--color-primary)' : 'none'"
                      [style.outline-offset]="'2px'"
                      style="width: 26px; height: 26px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.15); cursor: pointer;"
                      (click)="updateOption('strokeColor', color.hex)">
                    </button>
                  }
                  <input
                    type="color"
                    [ngModel]="options().strokeColor"
                    (ngModelChange)="updateOption('strokeColor', $event)"
                    title="Custom Color"
                    style="width: 28px; height: 28px; border: none; cursor: pointer; background: transparent;" />
                </div>
              </div>

              <!-- Stroke Opacity & Line/Dot Size -->
              <div class="l-columns l-columns--2" style="gap: 16px; margin-bottom: 16px;">
                <div>
                  <div class="l-extremo" style="margin-bottom: 4px;">
                    <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                      Opacity: <strong>{{ Math.round(options().strokeOpacity * 100) }}%</strong>
                    </label>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    class="c-input"
                    [ngModel]="options().strokeOpacity"
                    (ngModelChange)="updateOption('strokeOpacity', +$event)"
                    style="width: 100%;" />
                </div>

                <div>
                  @if (options().gridStyle === 'dot') {
                    <div class="l-extremo" style="margin-bottom: 4px;">
                      <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                        Dot Radius: <strong>{{ options().dotRadius }} mm</strong>
                      </label>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.5"
                      step="0.05"
                      class="c-input"
                      [ngModel]="options().dotRadius"
                      (ngModelChange)="updateOption('dotRadius', +$event)"
                      style="width: 100%;" />
                  } @else {
                    <div class="l-extremo" style="margin-bottom: 4px;">
                      <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                        Line Width: <strong>{{ options().strokeWidth }} pt</strong>
                      </label>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.5"
                      step="0.1"
                      class="c-input"
                      [ngModel]="options().strokeWidth"
                      (ngModelChange)="updateOption('strokeWidth', +$event)"
                      style="width: 100%;" />
                  }
                </div>
              </div>

              <!-- Major Line Accents (for square graph) -->
              @if (options().gridStyle === 'square') {
                <div style="padding-top: 10px; border-top: 1px solid var(--color-border-subtle);">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; margin-bottom: 8px;">
                    <input
                      type="checkbox"
                      [checked]="options().accentMajorLines"
                      (change)="updateOption('accentMajorLines', $any($event.target).checked)" />
                    Accent Major Lines (Heavier grid lines at intervals)
                  </label>

                  @if (options().accentMajorLines) {
                    <div class="l-columns l-columns--2" style="gap: 12px; margin-top: 8px;">
                      <div>
                        <label class="c-input__label" style="font-size: 0.75rem; display: block; margin-bottom: 2px;">
                          Every N lines
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="20"
                          class="c-input"
                          [ngModel]="options().majorInterval"
                          (ngModelChange)="updateOption('majorInterval', +$event)"
                          style="width: 100%; font-size: 0.8125rem;" />
                      </div>
                      <div>
                        <label class="c-input__label" style="font-size: 0.75rem; display: block; margin-bottom: 2px;">
                          Major Stroke (pt)
                        </label>
                        <input
                          type="number"
                          min="0.4"
                          max="3.0"
                          step="0.1"
                          class="c-input"
                          [ngModel]="options().majorStrokeWidth"
                          (ngModelChange)="updateOption('majorStrokeWidth', +$event)"
                          style="width: 100%; font-size: 0.8125rem;" />
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Ruled Margin Guide Line -->
              @if (options().gridStyle === 'ruled') {
                <div style="padding-top: 10px; border-top: 1px solid var(--color-border-subtle);">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer;">
                    <input
                      type="checkbox"
                      [checked]="options().marginLine"
                      (change)="updateOption('marginLine', $any($event.target).checked)" />
                    Include Red Left Margin Line (Notebook style)
                  </label>
                </div>
              }
            </app-card>
          </div>

          <!-- Margins & Padding Card -->
          <div class="g--margin-bottom-5">
            <app-card title="Page Margins (mm)">
              <div class="l-columns l-columns--4" style="gap: 8px;">
                <div>
                  <label class="c-input__label" style="font-size: 0.75rem; display: block; margin-bottom: 2px;">Top</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    class="c-input"
                    [ngModel]="options().marginTop"
                    (ngModelChange)="updateOption('marginTop', +$event)"
                    style="width: 100%; font-size: 0.8125rem;" />
                </div>
                <div>
                  <label class="c-input__label" style="font-size: 0.75rem; display: block; margin-bottom: 2px;">Bottom</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    class="c-input"
                    [ngModel]="options().marginBottom"
                    (ngModelChange)="updateOption('marginBottom', +$event)"
                    style="width: 100%; font-size: 0.8125rem;" />
                </div>
                <div>
                  <label class="c-input__label" style="font-size: 0.75rem; display: block; margin-bottom: 2px;">Left</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    class="c-input"
                    [ngModel]="options().marginLeft"
                    (ngModelChange)="updateOption('marginLeft', +$event)"
                    style="width: 100%; font-size: 0.8125rem;" />
                </div>
                <div>
                  <label class="c-input__label" style="font-size: 0.75rem; display: block; margin-bottom: 2px;">Right</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    class="c-input"
                    [ngModel]="options().marginRight"
                    (ngModelChange)="updateOption('marginRight', +$event)"
                    style="width: 100%; font-size: 0.8125rem;" />
                </div>
              </div>
            </app-card>
          </div>

          <!-- Storage Controls -->
          <div class="g--flex-center print-hidden" style="gap: 10px; justify-content: flex-start; flex-wrap: wrap;">
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="saveSettingsToStorage()">
              💾 Save Settings
            </button>
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="resetToDefault()"
              style="color: var(--color-danger);">
              🗑️ Reset
            </button>
            @if (saveFeedback()) {
              <span style="font-size: 0.8125rem; color: var(--color-success); font-weight: 500;">
                {{ saveFeedback() }}
              </span>
            }
          </div>

          <!-- Sidebar Sticky Ad Unit (300x250) -->
          <div
            class="ad-slot ad-slot--sidebar g--margin-top-6 print-hidden"
            style="max-width: 300px; height: 250px; margin: 24px auto 0; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem; text-align: center; padding: 12px;">
            <span>Responsive Ad Placement<br />(300x250 Sticky Sidebar Unit)</span>
          </div>
        </div>

        <!-- RIGHT COLUMN: Sticky Real-Time Live Preview & Actions -->
        <div
          class="l-columns__area preview-pane"
          [class.mobile-hidden]="activeMobileTab() === 'controls'">
          
          <div style="position: sticky; top: 20px;">
            <!-- Primary Action Bar -->
            <div class="c-card g--margin-bottom-4 print-hidden" style="padding: 16px;">
              <div class="l-extremo" style="align-items: center; gap: 12px; flex-wrap: wrap;">
                <div>
                  <div style="font-size: 0.8125rem; color: var(--color-text-muted);">
                    {{ paperSummary() }}
                  </div>
                  <div style="font-size: 1.25rem; font-weight: 700; color: var(--color-text-primary);">
                    Ready for 300+ DPI Print
                  </div>
                </div>

                <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small"
                    (click)="downloadSvg()">
                    📐 Download SVG
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--secondary c-button--small"
                    (click)="printSheet()">
                    🖨️ Print
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--primary"
                    [disabled]="isGenerating()"
                    (click)="downloadPdf()">
                    @if (isGenerating()) {
                      <span>Compiling...</span>
                    } @else {
                      <span>⬇️ Download PDF</span>
                    }
                  </button>
                </div>
              </div>
            </div>

            <!-- Simulated Paper Sheet Viewport -->
            <div
              class="paper-sheet-container"
              style="background: #64748b; padding: 24px; border-radius: var(--radius-md); overflow-x: auto; display: flex; justify-content: center; align-items: center; min-height: 540px;">
              
              <div
                class="paper-sheet"
                [style.aspect-ratio]="paperAspectRatio()"
                style="width: 100%; max-width: 460px; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border-radius: 2px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <div
                  [innerHTML]="safePreviewSvg()"
                  style="width: 100%; height: 100%; display: flex;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Post-Download Trigger Modal Container -->
      @if (showDownloadModal()) {
        <div class="c-modal" role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
          <div class="c-modal__backdrop" (click)="closeDownloadModal()"></div>
          <div class="c-modal__dialog">
            <div class="c-modal__header">
              <h2 id="download-modal-title" class="c-modal__title">
                🎉 Vector PDF Generated Successfully!
              </h2>
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="closeDownloadModal()"
                aria-label="Close dialog">
                &times;
              </button>
            </div>
            <div class="c-modal__body g--text-center">
              <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                Your custom vector printable paper was generated 100% inside your browser. No files or personal settings were transmitted to remote servers.
              </p>

              <div class="g--flex-center g--margin-bottom-4">
                <app-badge variant="privacy">
                  🛡️ 100% Client-Side Vector Precision &bull; 0 Bytes Transmitted
                </app-badge>
              </div>

              <!-- Post-Download Modal Ad Unit -->
              <div
                class="ad-slot ad-slot--modal"
                style="max-width: 300px; height: 250px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
                <span>Responsive Ad Placement (300x250 Modal Unit)</span>
              </div>
            </div>
            <div class="c-modal__footer">
              <button
                type="button"
                class="c-button c-button--primary"
                (click)="closeDownloadModal()">
                Done
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .mobile-tab-bar {
        display: none;
      }

      @media (max-width: 900px) {
        .mobile-tab-bar {
          display: block;
        }

        .mobile-hidden {
          display: none !important;
        }

        .paper-workspace {
          grid-template-columns: 1fr !important;
        }
      }

      @media print {
        .print-hidden,
        .ad-slot,
        .c-header,
        .c-footer {
          display: none !important;
        }

        .paper-workspace {
          display: block !important;
        }

        .paper-sheet-container {
          background: transparent !important;
          padding: 0 !important;
        }

        .paper-sheet {
          box-shadow: none !important;
          max-width: 100% !important;
          width: 100% !important;
        }
      }
    `,
  ],
})
export class GridPaperComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly Math = Math;
  readonly presets = POPULAR_PAPER_PRESETS;
  readonly colorPresets = PAPER_COLOR_PRESETS;

  readonly options = signal<GridPaperOptions>(createDefaultOptions());
  readonly isGenerating = signal<boolean>(false);
  readonly showDownloadModal = signal<boolean>(false);
  readonly activeMobileTab = signal<'controls' | 'preview'>('controls');
  readonly saveFeedback = signal<string>('');

  readonly previewSvg = computed<string>(() => generatePaperSvg(this.options()));

  readonly safePreviewSvg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.previewSvg())
  );

  readonly paperDimensions = computed(() => {
    const opt = this.options();
    return getPaperDimensionsMm(opt.paperSize, opt.orientation, {
      width: opt.customWidth,
      height: opt.customHeight,
    });
  });

  readonly paperAspectRatio = computed(() => {
    const dim = this.paperDimensions();
    return `${dim.width} / ${dim.height}`;
  });

  readonly paperSummary = computed(() => {
    const opt = this.options();
    const styleName =
      opt.gridStyle === 'dot'
        ? 'Dot Grid'
        : opt.gridStyle === 'square'
          ? 'Square Graph'
          : opt.gridStyle === 'isometric'
            ? 'Isometric 3D'
            : opt.gridStyle === 'hexagonal'
              ? 'Hexagonal'
              : 'Ruled Lined';
    return `${styleName} • ${opt.paperSize.toUpperCase()} • ${opt.spacing}mm Pitch`;
  });

  ngOnInit(): void {
    this.loadSettingsFromStorage();
  }

  setGridStyle(style: GridStyle): void {
    this.updateOption('gridStyle', style);
  }

  updateOption<K extends keyof GridPaperOptions>(key: K, value: GridPaperOptions[K]): void {
    this.options.update((curr) => ({
      ...curr,
      [key]: value,
    }));
  }

  applyPreset(presetId: string): void {
    const preset = this.presets.find((p) => p.id === presetId);
    if (preset) {
      this.options.update((curr) => ({
        ...curr,
        ...preset.options,
      }));
    }
  }

  saveSettingsToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.options()));
        this.saveFeedback.set('Settings saved locally!');
        setTimeout(() => this.saveFeedback.set(''), 2500);
      } catch {
        // Storage limit or blocked
      }
    }
  }

  loadSettingsFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.options.set({
            ...createDefaultOptions(),
            ...parsed,
          });
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  resetToDefault(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.options.set(createDefaultOptions());
  }

  async downloadPdf(): Promise<void> {
    this.isGenerating.set(true);
    try {
      const { blob } = await generatePaperPdf(this.options());
      const fileName = `grid-paper-${this.options().gridStyle}-${this.options().paperSize}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      this.showDownloadModal.set(true);
    } finally {
      this.isGenerating.set(false);
    }
  }

  downloadSvg(): void {
    const svgStr = generatePaperSvg(this.options());
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grid-paper-${this.options().gridStyle}-${this.options().paperSize}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  printSheet(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  closeDownloadModal(): void {
    this.showDownloadModal.set(false);
  }

  setMobileTab(tab: 'controls' | 'preview'): void {
    this.activeMobileTab.set(tab);
  }
}
