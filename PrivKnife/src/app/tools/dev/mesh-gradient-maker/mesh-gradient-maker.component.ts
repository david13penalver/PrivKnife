import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import {
  exportMeshPngBlob,
  generatePureCss,
  generateTailwindCss,
  randomizeMeshPoints,
} from './engine';
import { DEFAULT_GLASS_CONFIG, DEFAULT_MESH_CONFIG, GRADIENT_PRESETS } from './test-fixtures';
import {
  GlassmorphismConfig,
  GradientPreset,
  MeshGradientConfig,
  MeshPoint,
} from './types';

@Component({
  selector: 'app-mesh-gradient-maker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, FormsModule],
  template: `
    <div
      class="l-columns l-columns--1 g--margin-x-auto"
      style="max-width: 1300px; padding: 0 16px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.025em;">
          CSS Mesh Gradient &amp; Glassmorphism Maker
        </h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 800px; margin: 0 auto; line-height: 1.6;">
          Generate multi-point fluid mesh gradients and frosted glassmorphism UI cards in real-time.
          Instant export to Pure CSS, Tailwind CSS utility classes, and 1200&times;800 High-Res PNG.
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

      <!-- Main Workspace: Split Studio -->
      <div class="l-columns__area">
        <div class="mesh-studio-grid">
          <!-- Left Column: Controls & Presets -->
          <div class="mesh-controls-col">
            <!-- Presets & Actions Card -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Palette Presets</h3>
                <app-button
                  variant="outline"
                  size="small"
                  (clicked)="randomize()">
                  🎲 Randomize
                </app-button>
              </div>

              <div class="presets-grid g--margin-top-3">
                @for (preset of presets; track preset.id) {
                  <button
                    type="button"
                    class="preset-badge-btn"
                    [class.is-active]="preset.baseColor === meshConfig().baseColor"
                    (click)="applyPreset(preset)">
                    <span
                      class="preset-preview-dot"
                      [style.background-color]="preset.points[0]?.color || preset.baseColor"></span>
                    {{ preset.name }}
                  </button>
                }
              </div>
            </app-card>

            <!-- Mesh Gradient Controls -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Mesh Color Points</h3>
                <app-button
                  variant="outline"
                  size="small"
                  [disabled]="meshConfig().points.length >= 6"
                  (clicked)="addPoint()">
                  + Add Point
                </app-button>
              </div>

              <!-- Base Background & Noise -->
              <div class="control-group g--margin-bottom-3 g--margin-top-3">
                <div class="l-extremo">
                  <span class="l-extremo__area-izquierda control-label">Base Canvas Color</span>
                  <div class="l-extremo__area-derecha color-input-wrapper">
                    <input
                      type="color"
                      [value]="meshConfig().baseColor"
                      (input)="updateBaseColor($any($event.target).value)"
                      class="color-picker-input" />
                    <span style="font-family: monospace; font-size: 0.8125rem; color: var(--color-text-muted);">{{ meshConfig().baseColor }}</span>
                  </div>
                </div>
              </div>

              <div class="control-group g--margin-bottom-4">
                <label class="toggle-label">
                  <input
                    type="checkbox"
                    [checked]="meshConfig().noise"
                    (change)="toggleNoise()" />
                  <span>Simulate Analog Film Grain (PNG Export)</span>
                </label>
              </div>

              <!-- Points List -->
              <div class="points-list">
                @for (point of meshConfig().points; track point.id; let idx = $index) {
                  <div class="point-item-card">
                    <div class="l-extremo g--margin-bottom-2">
                      <div class="l-extremo__area-izquierda g--flex-center" style="gap: 8px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted);">#{{ idx + 1 }}</span>
                        <input
                          type="color"
                          [value]="point.color"
                          (input)="updatePoint(point.id, { color: $any($event.target).value })"
                          class="color-picker-input-sm" />
                        <span style="font-family: monospace; font-size: 0.8125rem; color: var(--color-text-muted);">{{ point.color }}</span>
                      </div>
                      <div class="l-extremo__area-derecha">
                        @if (meshConfig().points.length > 2) {
                          <button
                            type="button"
                            class="delete-point-btn"
                            title="Remove Point"
                            (click)="removePoint(point.id)">
                            &times;
                          </button>
                        }
                      </div>
                    </div>

                    <div class="point-sliders-grid">
                      <div>
                        <div class="slider-header">
                          <span>X Pos</span>
                          <span>{{ point.x }}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          [value]="point.x"
                          (input)="updatePoint(point.id, { x: +$any($event.target).value })"
                          class="c-input--range" />
                      </div>
                      <div>
                        <div class="slider-header">
                          <span>Y Pos</span>
                          <span>{{ point.y }}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          [value]="point.y"
                          (input)="updatePoint(point.id, { y: +$any($event.target).value })"
                          class="c-input--range" />
                      </div>
                      <div>
                        <div class="slider-header">
                          <span>Spread</span>
                          <span>{{ point.radius }}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          [value]="point.radius"
                          (input)="updatePoint(point.id, { radius: +$any($event.target).value })"
                          class="c-input--range" />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </app-card>

            <!-- Glassmorphism Card Properties -->
            <app-card class="g--margin-bottom-4">
              <div card-header>
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Glassmorphism Properties</h3>
              </div>

              <div class="control-group g--margin-top-3 g--margin-bottom-3">
                <div class="slider-header">
                  <span>Backdrop Blur</span>
                  <span>{{ glassConfig().blur }}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  [value]="glassConfig().blur"
                  (input)="updateGlass('blur', +$any($event.target).value)"
                  class="c-input--range" />
              </div>

              <div class="control-group g--margin-bottom-3">
                <div class="slider-header">
                  <span>Surface Opacity</span>
                  <span>{{ glassConfig().opacity }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  [value]="glassConfig().opacity"
                  (input)="updateGlass('opacity', +$any($event.target).value)"
                  class="c-input--range" />
              </div>

              <div class="control-group g--margin-bottom-3">
                <div class="slider-header">
                  <span>Border Opacity</span>
                  <span>{{ glassConfig().borderOpacity }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  [value]="glassConfig().borderOpacity"
                  (input)="updateGlass('borderOpacity', +$any($event.target).value)"
                  class="c-input--range" />
              </div>

              <div class="control-group g--margin-bottom-3">
                <div class="slider-header">
                  <span>Border Width</span>
                  <span>{{ glassConfig().borderWidth }}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  [value]="glassConfig().borderWidth"
                  (input)="updateGlass('borderWidth', +$any($event.target).value)"
                  class="c-input--range" />
              </div>

              <div class="control-group g--margin-bottom-3">
                <div class="slider-header">
                  <span>Border Radius</span>
                  <span>{{ glassConfig().borderRadius }}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="36"
                  [value]="glassConfig().borderRadius"
                  (input)="updateGlass('borderRadius', +$any($event.target).value)"
                  class="c-input--range" />
              </div>

              <div class="control-group g--margin-bottom-3">
                <div class="l-extremo">
                  <span class="l-extremo__area-izquierda control-label">Card Tint Theme</span>
                  <div class="l-extremo__area-derecha">
                    <select
                      class="c-select"
                      [value]="glassConfig().tint"
                      (change)="updateGlass('tint', $any($event.target).value)">
                      <option value="light">Light Tint (White Glass)</option>
                      <option value="dark">Dark Tint (Slate Glass)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="control-group">
                <label class="toggle-label">
                  <input
                    type="checkbox"
                    [checked]="glassConfig().reflection"
                    (change)="updateGlass('reflection', $any($event.target).checked)" />
                  <span>Surface Reflection Gradient Shine</span>
                </label>
              </div>
            </app-card>

            <!-- Sidebar Ad Slot (300x250) -->
            <div class="g--margin-bottom-4 g--text-center print-hidden">
              <div
                class="ad-slot ad-slot--sidebar"
                style="max-width: 300px; height: 250px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
                <span>SPONSOR (300&times;250)</span>
              </div>
            </div>
          </div>

          <!-- Right Column: Visual Preview & Code Output -->
          <div class="mesh-preview-col">
            <!-- Live Preview Canvas Stage -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Live Interactive Preview</h3>
                <app-button
                  variant="primary"
                  size="small"
                  [disabled]="isExporting()"
                  (clicked)="downloadPng()">
                  {{ isExporting() ? 'Rendering...' : '⬇ Download PNG (1200×800)' }}
                </app-button>
              </div>

              <div
                class="mesh-preview-viewport"
                [style.background-color]="meshBackgroundStyle().backgroundColor"
                [style.background-image]="meshBackgroundStyle().backgroundImage"
                [style.background-size]="meshBackgroundStyle().backgroundSize">
                
                <!-- Positionable Node Markers -->
                @for (p of meshConfig().points; track p.id) {
                  <div
                    class="mesh-point-marker"
                    [style.left.%]="p.x"
                    [style.top.%]="p.y"
                    [style.border-color]="p.color"
                    [title]="'Point at ' + p.x + '%, ' + p.y + '%'">
                  </div>
                }

                <!-- Floating Glassmorphism Showcase Card -->
                <div
                  class="glass-preview-card"
                  [style.background-color]="glassCardStyle().backgroundColor"
                  [style.backdrop-filter]="glassCardStyle().backdropFilter"
                  [style.-webkit-backdrop-filter]="glassCardStyle().WebkitBackdropFilter"
                  [style.border-radius]="glassCardStyle().borderRadius"
                  [style.border]="glassCardStyle().border"
                  [style.box-shadow]="glassCardStyle().boxShadow"
                  [style.background-image]="glassCardStyle().backgroundImage">
                  <div class="glass-card-content" [class.is-dark]="glassConfig().tint === 'dark'">
                    <span class="glass-card-tag">Frosted Glass</span>
                    <h4 class="glass-card-title">Modern Glassmorphism</h4>
                    <p class="glass-card-desc">
                      Client-side computed radial mesh backdrop with real-time blur and border refraction.
                    </p>
                    <div class="glass-card-footer">
                      <span class="glass-card-metric">100% In-Browser</span>
                      <button type="button" class="glass-card-action">Action</button>
                    </div>
                  </div>
                </div>
              </div>
            </app-card>

            <!-- Code Output & Clipboard Exporter -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <!-- Code Tabs -->
                <div class="code-tabs-nav">
                  <button
                    type="button"
                    class="code-tab-btn"
                    [class.is-active]="activeCodeTab() === 'css'"
                    (click)="setActiveCodeTab('css')">
                    Pure CSS (Cross-Browser)
                  </button>
                  <button
                    type="button"
                    class="code-tab-btn"
                    [class.is-active]="activeCodeTab() === 'tailwind'"
                    (click)="setActiveCodeTab('tailwind')">
                    Tailwind CSS (v3 / v4)
                  </button>
                </div>

                <app-button
                  [variant]="copiedCode() ? 'secondary' : 'outline'"
                  size="small"
                  (clicked)="copyCode()">
                  {{ copiedCode() ? '✓ Copied to Clipboard!' : '📋 Copy Code' }}
                </app-button>
              </div>

              <!-- Code Snippet Area -->
              <div class="code-snippet-box">
                <pre class="code-snippet-pre"><code>{{ activeCodeSnippet() }}</code></pre>
              </div>
            </app-card>
          </div>
        </div>
      </div>

      <!-- Export Success Ad Modal -->
      @if (showExportModal()) {
        <div class="c-modal" (click)="closeExportModal()">
          <div class="c-modal__backdrop"></div>
          <div class="c-modal__dialog" (click)="$event.stopPropagation()">
            <div class="c-modal__header">
              <h3 class="c-modal__title">
                Mesh Gradient PNG Ready! 🎉
              </h3>
              <button
                type="button"
                style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-muted);"
                (click)="closeExportModal()">
                &times;
              </button>
            </div>
            <div class="c-modal__body g--text-center">
              <p style="color: var(--color-text-muted); font-size: 0.9375rem; margin-bottom: 16px;">
                Your high-resolution 1200&times;800 PNG file was rendered completely in-browser and downloaded to your device.
              </p>

              <!-- Modal Ad Slot (300x250) -->
              <div
                class="ad-slot ad-slot--modal"
                style="max-width: 300px; height: 250px; margin: 0 auto 16px; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
                <span>SPONSOR (300&times;250)</span>
              </div>

              <app-button
                variant="primary"
                (clicked)="closeExportModal()">
                Done
              </app-button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .mesh-studio-grid {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .mesh-studio-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .point-sliders-grid {
        grid-template-columns: 1fr !important;
      }
      .c-card__header-flex {
        flex-direction: column;
        align-items: flex-start;
      }
    }
    .c-card__header-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .presets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .preset-badge-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text);
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover { border-color: var(--color-primary); background: var(--color-surface); }
      &.is-active {
        border-color: var(--color-primary);
        background: rgba(59, 130, 246, 0.1);
        color: var(--color-primary);
      }
    }
    .preset-preview-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .color-input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .color-picker-input {
      width: 36px;
      height: 36px;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      cursor: pointer;
      background: none;
    }
    .color-picker-input-sm {
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      cursor: pointer;
      background: none;
    }
    .point-item-card {
      padding: 12px;
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }
    .delete-point-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      line-height: 1;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 0 4px;
      &:hover { color: #ef4444; }
    }
    .point-sliders-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .slider-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-bottom: 4px;
    }
    .c-input--range {
      width: 100%;
      height: 4px;
      border-radius: 2px;
      accent-color: var(--color-primary);
      cursor: pointer;
    }
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--color-text);
      cursor: pointer;
    }
    .c-select {
      padding: 6px 10px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.8125rem;
    }
    .mesh-preview-viewport {
      position: relative;
      width: 100%;
      height: 440px;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
      transition: background 0.3s ease;
    }
    .mesh-point-marker {
      position: absolute;
      width: 14px;
      height: 14px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      opacity: 0.7;
    }
    .glass-preview-card {
      width: 85%;
      max-width: 420px;
      padding: 28px;
      z-index: 2;
      transition: all 0.2s ease;
    }
    .glass-card-content {
      color: #0f172a;
      &.is-dark { color: #f8fafc; }
    }
    .glass-card-tag {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.75;
      margin-bottom: 6px;
    }
    .glass-card-title {
      margin: 0 0 8px 0;
      font-size: 1.375rem;
      font-weight: 800;
      line-height: 1.25;
    }
    .glass-card-desc {
      margin: 0 0 20px 0;
      font-size: 0.875rem;
      line-height: 1.5;
      opacity: 0.85;
    }
    .glass-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .glass-card-metric {
      font-size: 0.75rem;
      font-weight: 600;
      opacity: 0.7;
    }
    .glass-card-action {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: inherit;
      cursor: pointer;
    }
    .code-tabs-nav { display: flex; gap: 6px; }
    .code-tab-btn {
      padding: 6px 12px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
      &.is-active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
      }
    }
    .code-snippet-box {
      background: #0f172a;
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      max-height: 260px;
    }
    .code-snippet-pre {
      margin: 0;
      font-family: 'Fira Code', monospace;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: #e2e8f0;
      white-space: pre;
    }
  `],
})
export class MeshGradientMakerComponent implements OnDestroy {
  readonly presets = GRADIENT_PRESETS;

  readonly meshConfig = signal<MeshGradientConfig>({
    ...DEFAULT_MESH_CONFIG,
    points: DEFAULT_MESH_CONFIG.points.map((p) => ({ ...p })),
  });

  readonly glassConfig = signal<GlassmorphismConfig>({
    ...DEFAULT_GLASS_CONFIG,
  });

  readonly activeCodeTab = signal<'css' | 'tailwind'>('css');
  readonly copiedCode = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly showExportModal = signal<boolean>(false);

  private copyTimeout: any = null;

  readonly generatedCss = computed(() =>
    generatePureCss(this.meshConfig(), this.glassConfig())
  );

  readonly generatedTailwind = computed(() =>
    generateTailwindCss(this.meshConfig(), this.glassConfig())
  );

  readonly activeCodeSnippet = computed(() =>
    this.activeCodeTab() === 'css'
      ? this.generatedCss()
      : this.generatedTailwind()
  );

  readonly meshBackgroundStyle = computed(() => {
    const m = this.meshConfig();
    const gradientLayers = m.points
      .map(
        (p) =>
          `radial-gradient(at ${p.x}% ${p.y}%, ${p.color} 0px, transparent ${p.radius}%)`
      )
      .join(', ');

    return {
      backgroundColor: m.baseColor,
      backgroundImage: gradientLayers,
      backgroundSize: '100% 100%',
    };
  });

  readonly glassCardStyle = computed(() => {
    const g = this.glassConfig();
    const isLight = g.tint !== 'dark';
    const rgb = isLight ? '255, 255, 255' : '15, 23, 42';
    const bgOpacity = (g.opacity / 100).toFixed(2);
    const borderOpacity = (g.borderOpacity / 100).toFixed(2);

    return {
      backgroundColor: `rgba(${rgb}, ${bgOpacity})`,
      backdropFilter: `blur(${g.blur}px)`,
      WebkitBackdropFilter: `blur(${g.blur}px)`,
      borderRadius: `${g.borderRadius}px`,
      border: `${g.borderWidth}px solid rgba(${rgb}, ${borderOpacity})`,
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      backgroundImage: g.reflection
        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 60%)'
        : 'none',
    };
  });

  updateBaseColor(color: string): void {
    this.meshConfig.update((c) => ({ ...c, baseColor: color }));
  }

  toggleNoise(): void {
    this.meshConfig.update((c) => ({ ...c, noise: !c.noise }));
  }

  addPoint(): void {
    this.meshConfig.update((c) => {
      if (c.points.length >= 6) return c;
      const hues = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
      const randomColor = hues[Math.floor(Math.random() * hues.length)];
      const newPoint: MeshPoint = {
        id: `pt-${Math.random().toString(36).substring(2, 7)}`,
        x: Math.round(20 + Math.random() * 60),
        y: Math.round(20 + Math.random() * 60),
        color: randomColor,
        radius: 50,
      };
      return { ...c, points: [...c.points, newPoint] };
    });
  }

  removePoint(id: string): void {
    this.meshConfig.update((c) => {
      if (c.points.length <= 2) return c;
      return { ...c, points: c.points.filter((p) => p.id !== id) };
    });
  }

  updatePoint(id: string, patch: Partial<MeshPoint>): void {
    this.meshConfig.update((c) => ({
      ...c,
      points: c.points.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }

  updateGlass<K extends keyof GlassmorphismConfig>(
    key: K,
    value: GlassmorphismConfig[K]
  ): void {
    this.glassConfig.update((g) => ({ ...g, [key]: value }));
  }

  applyPreset(preset: GradientPreset): void {
    this.meshConfig.update((c) => ({
      ...c,
      baseColor: preset.baseColor,
      points: preset.points.map((p) => ({ ...p })),
    }));
  }

  randomize(): void {
    const randomized = randomizeMeshPoints();
    this.meshConfig.update((c) => ({ ...c, points: randomized }));
  }

  setActiveCodeTab(tab: 'css' | 'tailwind'): void {
    this.activeCodeTab.set(tab);
  }

  async copyCode(): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(this.activeCodeSnippet());
        this.copiedCode.set(true);
        if (this.copyTimeout) clearTimeout(this.copyTimeout);
        this.copyTimeout = setTimeout(() => this.copiedCode.set(false), 2500);
      }
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  }

  async downloadPng(): Promise<void> {
    try {
      this.isExporting.set(true);
      const blob = await exportMeshPngBlob(this.meshConfig(), 1200, 800);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mesh-gradient-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      this.showExportModal.set(true);
    } finally {
      this.isExporting.set(false);
    }
  }

  closeExportModal(): void {
    this.showExportModal.set(false);
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }
}
