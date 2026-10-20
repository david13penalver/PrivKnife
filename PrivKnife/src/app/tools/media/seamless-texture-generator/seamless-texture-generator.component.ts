import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SeamlessTextureGeneratorOptions,
  SeamlessTextureGeneratorResult,
  TextureBlendMode,
  TextureImageData,
} from './types';
import {
  generateCssBackgroundSnippet,
  generateNormalMap,
  makeSeamlessTexture,
  processTexture,
} from './engine';
import { createSyntheticSurface } from './test-fixtures';

@Component({
  selector: 'app-seamless-texture-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <header class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Seamless Tileable Texture & Pattern Generator</h1>
          <p class="c-header__subtitle">
            Transform ordinary surfaces and photos into seamless, repeating 3D textures with edge blending,
            normal map generation, and live interactive tiling preview.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </header>

      <!-- Main Layout Columns -->
      <div class="l-columns l-columns--2">
        <!-- Configuration & Upload Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <h2 class="c-card__title l-extremo__area-izquierda">Texture Settings</h2>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="loadSampleSurface()"
              >
                Load Sample Surface
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
                accept="image/png,image/jpeg,image/webp"
                style="display: none"
                (change)="onFileInputChange($event)"
              />
              <div class="c-dropzone__content">
                <span class="c-dropzone__icon">🧱</span>
                <span class="c-dropzone__prompt">
                  @if (selectedFileName()) {
                    <strong>{{ selectedFileName() }}</strong>
                  } @else {
                    <strong>Click to upload texture</strong> or drag & drop PNG/JPG image
                  }
                </span>
                <span class="c-dropzone__hint">Processed strictly on your local device</span>
              </div>
            </div>

            <!-- Blend Mode Selection -->
            <h3 class="c-card__subtitle g--margin-bottom-2">Seamless Blending Algorithm</h3>
            <div class="preset-buttons g--margin-bottom-3">
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="blendMode() === 'linear_crossfade'"
                [class.c-button--outline]="blendMode() !== 'linear_crossfade'"
                (click)="setBlendMode('linear_crossfade')"
              >
                Linear Crossfade
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="blendMode() === 'mirror_repeat'"
                [class.c-button--outline]="blendMode() !== 'mirror_repeat'"
                (click)="setBlendMode('mirror_repeat')"
              >
                Mirror Repeat
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="blendMode() === 'poisson_blend'"
                [class.c-button--outline]="blendMode() !== 'poisson_blend'"
                (click)="setBlendMode('poisson_blend')"
              >
                Poisson Hermite
              </button>
            </div>

            <!-- Edge Overlap Percentage -->
            @if (blendMode() !== 'mirror_repeat') {
              <div class="c-input g--margin-bottom-3">
                <div class="l-extremo g--margin-bottom-1">
                  <label class="c-input__label l-extremo__area-izquierda" for="overlapRange">
                    Edge Overlap: {{ edgeOverlapPercentage() }}%
                  </label>
                </div>
                <input
                  id="overlapRange"
                  type="range"
                  min="5"
                  max="45"
                  step="1"
                  class="c-input__range"
                  [ngModel]="edgeOverlapPercentage()"
                  (ngModelChange)="setEdgeOverlap(+$event)"
                />
              </div>
            }

            <!-- Normal Map Toggles -->
            <h3 class="c-card__subtitle g--margin-bottom-2">3D Normal Map</h3>
            <div class="options-grid g--margin-bottom-3">
              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="generateNormalMap()"
                  (change)="toggleGenerateNormalMap()"
                />
                Generate Sobel Normal Map
              </label>

              @if (generateNormalMap()) {
                <label class="c-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="invertNormalY()"
                    (change)="toggleInvertNormalY()"
                  />
                  Invert Normal Y (DirectX standard)
                </label>
              }
            </div>

            @if (generateNormalMap()) {
              <div class="c-input g--margin-bottom-3">
                <div class="l-extremo g--margin-bottom-1">
                  <label class="c-input__label l-extremo__area-izquierda" for="strengthRange">
                    Normal Depth Strength: {{ normalMapStrength() }}
                  </label>
                </div>
                <input
                  id="strengthRange"
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  class="c-input__range"
                  [ngModel]="normalMapStrength()"
                  (ngModelChange)="setNormalStrength(+$event)"
                />
              </div>
            }

            <!-- Tiling Multiplier for Preview -->
            <h3 class="c-card__subtitle g--margin-bottom-2">Preview Tiling Repeat</h3>
            <div class="preset-buttons g--margin-bottom-3">
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="previewTilingMultiplier() === 2"
                [class.c-button--outline]="previewTilingMultiplier() !== 2"
                (click)="setTiling(2)"
              >
                2x2 Grid
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="previewTilingMultiplier() === 3"
                [class.c-button--outline]="previewTilingMultiplier() !== 3"
                (click)="setTiling(3)"
              >
                3x3 Grid
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="previewTilingMultiplier() === 4"
                [class.c-button--outline]="previewTilingMultiplier() !== 4"
                (click)="setTiling(4)"
              >
                4x4 Grid
              </button>
            </div>
          </div>

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
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="!result() || !result()?.success"
                (click)="downloadZip()"
              >
                Download Texture Pack (.zip)
              </button>
            </div>
          </div>
        </section>

        <!-- Preview & Deliverable Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <h2 class="c-card__title l-extremo__area-izquierda">Texture Viewport</h2>
            <div class="l-extremo__area-derecha tab-buttons">
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="activePreviewTab() === 'tiled'"
                [class.c-button--outline]="activePreviewTab() !== 'tiled'"
                (click)="setActivePreviewTab('tiled')"
              >
                Tiled Repeat
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="activePreviewTab() === 'diffuse'"
                [class.c-button--outline]="activePreviewTab() !== 'diffuse'"
                (click)="setActivePreviewTab('diffuse')"
              >
                Diffuse Map
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="activePreviewTab() === 'normal'"
                [class.c-button--outline]="activePreviewTab() !== 'normal'"
                (click)="setActivePreviewTab('normal')"
              >
                Normal Map
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="activePreviewTab() === 'css'"
                [class.c-button--outline]="activePreviewTab() !== 'css'"
                (click)="setActivePreviewTab('css')"
              >
                CSS Snippet
              </button>
            </div>
          </div>

          <div class="c-card__body">
            @if (result() && result()?.success) {
              @if (activePreviewTab() === 'css') {
                <div class="css-container">
                  <div class="code-header l-extremo">
                    <span class="code-title l-extremo__area-izquierda">CSS background-repeat</span>
                    <button
                      type="button"
                      class="c-button c-button--outline c-button--small l-extremo__area-derecha"
                      (click)="copyCssSnippet()"
                    >
                      {{ copiedCssFeedback() ? '✓ Copied!' : 'Copy CSS' }}
                    </button>
                  </div>
                  <pre class="code-block"><code>{{ result()?.cssSnippet }}</code></pre>
                </div>
              } @else {
                <div class="canvas-viewport">
                  <canvas #previewCanvas class="preview-canvas-element"></canvas>
                </div>
              }
            } @else if (result() && !result()?.success) {
              <div class="c-alert c-alert--danger">
                <strong>Error:</strong> {{ result()?.error }}
              </div>
            } @else {
              <div class="empty-state">
                <span class="empty-state__icon">🖼️</span>
                <p>Upload a texture or load the sample surface to generate seamless repeating textures.</p>
              </div>
            }
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                [disabled]="!result() || !result()?.success"
                (click)="downloadDiffuse()"
              >
                Download Diffuse PNG
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                [disabled]="!result() || !result()?.success || !result()?.normalMapBlob"
                (click)="downloadNormal()"
              >
                Download Normal PNG
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .preset-buttons, .tab-buttons {
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
    .canvas-viewport {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      border: 1px solid var(--color-border, #cbd5e1);
      border-radius: 0.375rem;
      padding: 0.5rem;
      min-height: 280px;
      max-height: 380px;
      overflow: auto;
    }
    .preview-canvas-element {
      max-width: 100%;
      height: auto;
      image-rendering: pixelated;
      border-radius: 2px;
    }
    .css-container {
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
      max-height: 240px;
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
export class SeamlessTextureGeneratorComponent implements OnDestroy {
  @ViewChild('previewCanvas') previewCanvasRef?: ElementRef<HTMLCanvasElement>;
  private activeObjectUrls = new Set<string>();

  // State Signals
  readonly sourceImageData = signal<TextureImageData | null>(null);
  readonly selectedFileName = signal<string>('');
  readonly blendMode = signal<TextureBlendMode>('linear_crossfade');
  readonly edgeOverlapPercentage = signal<number>(20);
  readonly generateNormalMap = signal<boolean>(true);
  readonly normalMapStrength = signal<number>(2.5);
  readonly invertNormalY = signal<boolean>(false);
  readonly previewTilingMultiplier = signal<number>(3);
  readonly outputResolutionPx = signal<number>(256);
  readonly activePreviewTab = signal<'diffuse' | 'normal' | 'tiled' | 'css'>('tiled');
  readonly copiedCssFeedback = signal<boolean>(false);

  // Result signal
  readonly result = signal<SeamlessTextureGeneratorResult | null>(null);

  setBlendMode(mode: TextureBlendMode) {
    this.blendMode.set(mode);
    this.recomputeTexture();
  }

  setEdgeOverlap(percent: number) {
    this.edgeOverlapPercentage.set(percent);
    this.recomputeTexture();
  }

  toggleGenerateNormalMap() {
    this.generateNormalMap.update((v) => !v);
    this.recomputeTexture();
  }

  toggleInvertNormalY() {
    this.invertNormalY.update((v) => !v);
    this.recomputeTexture();
  }

  setNormalStrength(strength: number) {
    this.normalMapStrength.set(strength);
    this.recomputeTexture();
  }

  setTiling(tiling: number) {
    this.previewTilingMultiplier.set(tiling);
    this.renderCanvas();
  }

  setActivePreviewTab(tab: 'diffuse' | 'normal' | 'tiled' | 'css') {
    this.activePreviewTab.set(tab);
    setTimeout(() => this.renderCanvas(), 10);
  }

  async loadSampleSurface() {
    const surface = createSyntheticSurface(64, 64);
    this.sourceImageData.set(surface);
    this.selectedFileName.set('sample_brick_surface.png');
    await this.recomputeTexture();
  }

  async handleFileSelected(file: File) {
    if (!file) return;
    this.selectedFileName.set(file.name);

    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(512, bitmap.width);
        canvas.height = Math.min(512, bitmap.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          this.sourceImageData.set({
            width: canvas.width,
            height: canvas.height,
            data: imgData.data,
          });
          await this.recomputeTexture();
          return;
        }
      } catch {
        // Fallback below
      }
    }

    // Fallback using synthetic surface
    const surface = createSyntheticSurface(64, 64);
    this.sourceImageData.set(surface);
    await this.recomputeTexture();
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

  async recomputeTexture() {
    const src = this.sourceImageData();
    if (!src) {
      this.result.set(null);
      return;
    }

    const options: SeamlessTextureGeneratorOptions = {
      blendMode: this.blendMode(),
      edgeOverlapPercentage: this.edgeOverlapPercentage(),
      generateNormalMap: this.generateNormalMap(),
      normalMapStrength: this.normalMapStrength(),
      invertNormalY: this.invertNormalY(),
      previewTilingMultiplier: this.previewTilingMultiplier(),
      outputResolutionPx: this.outputResolutionPx(),
    };

    const res = await processTexture(src, options);
    this.result.set(res);
    setTimeout(() => this.renderCanvas(), 10);
  }

  renderCanvas() {
    if (!this.previewCanvasRef?.nativeElement) return;
    const canvas = this.previewCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const src = this.sourceImageData();
    if (!src) return;

    const options: SeamlessTextureGeneratorOptions = {
      blendMode: this.blendMode(),
      edgeOverlapPercentage: this.edgeOverlapPercentage(),
      generateNormalMap: this.generateNormalMap(),
      normalMapStrength: this.normalMapStrength(),
      invertNormalY: this.invertNormalY(),
      previewTilingMultiplier: this.previewTilingMultiplier(),
      outputResolutionPx: this.outputResolutionPx(),
    };

    const seamless = makeSeamlessTexture(src, options);
    const tab = this.activePreviewTab();

    if (tab === 'diffuse') {
      canvas.width = seamless.width;
      canvas.height = seamless.height;
      const imgData = ctx.createImageData(seamless.width, seamless.height);
      imgData.data.set(seamless.data);
      ctx.putImageData(imgData, 0, 0);
    } else if (tab === 'normal') {
      const normalMap = generateNormalMap(
        seamless,
        options.normalMapStrength,
        options.invertNormalY
      );
      canvas.width = normalMap.width;
      canvas.height = normalMap.height;
      const imgData = ctx.createImageData(normalMap.width, normalMap.height);
      imgData.data.set(normalMap.data);
      ctx.putImageData(imgData, 0, 0);
    } else {
      // Tiled repeat
      const tiles = this.previewTilingMultiplier();
      canvas.width = seamless.width * tiles;
      canvas.height = seamless.height * tiles;

      const singleCanvas = document.createElement('canvas');
      singleCanvas.width = seamless.width;
      singleCanvas.height = seamless.height;
      const sCtx = singleCanvas.getContext('2d');
      if (sCtx) {
        const imgData = sCtx.createImageData(seamless.width, seamless.height);
        imgData.data.set(seamless.data);
        sCtx.putImageData(imgData, 0, 0);

        for (let y = 0; y < tiles; y++) {
          for (let x = 0; x < tiles; x++) {
            ctx.drawImage(singleCanvas, x * seamless.width, y * seamless.height);
          }
        }
      }
    }
  }

  downloadZip() {
    const res = this.result();
    if (!res || !res.success || !res.zipBlob) return;

    const url = URL.createObjectURL(res.zipBlob);
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

  downloadDiffuse() {
    const res = this.result();
    if (!res || !res.success || !res.diffuseBlob) return;

    const url = URL.createObjectURL(res.diffuseBlob);
    this.activeObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'diffuse_seamless.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    this.activeObjectUrls.delete(url);
  }

  downloadNormal() {
    const res = this.result();
    if (!res || !res.success || !res.normalMapBlob) return;

    const url = URL.createObjectURL(res.normalMapBlob);
    this.activeObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'normal_map.png';
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

  reset() {
    this.sourceImageData.set(null);
    this.selectedFileName.set('');
    this.blendMode.set('linear_crossfade');
    this.edgeOverlapPercentage.set(20);
    this.generateNormalMap.set(true);
    this.normalMapStrength.set(2.5);
    this.invertNormalY.set(false);
    this.previewTilingMultiplier.set(3);
    this.activePreviewTab.set('tiled');
    this.copiedCssFeedback.set(false);
    this.result.set(null);

    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }

  ngOnDestroy() {
    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }
}
