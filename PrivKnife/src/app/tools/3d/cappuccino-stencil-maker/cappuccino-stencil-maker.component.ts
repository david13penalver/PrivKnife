import { TranslatePipe } from '../../../core/i18n';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';

import { Card } from '../../../components';

import {
  CappuccinoStencilMakerOptions,
  StencilExportFormat,
  StencilHandleType,
  StencilMetrics,
  StencilMotif,
  StencilPreset,
  StencilWorkerRequest,
  StencilWorkerResponse,
} from './types';
import {
  DEFAULT_STENCIL_OPTIONS,
  STENCIL_PRESETS,
} from './test-fixtures';
import {
  generateStencilMesh,
  processStencil,
} from './engine';

@Component({
  selector: 'app-cappuccino-stencil-maker',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, TranslatePipe],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">{{ 'tools.cappuccinoStencilMaker.name' | translate }}</h1>
          <p class="c-header__subtitle">
            {{ 'tools.cappuccinoStencilMaker.description' | translate }}
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          {{ 'common.privacyBadge' | translate }}
        </div>
      </div>

      <!-- Presets Strip -->
      <div class="preset-strip g--margin-bottom-4">
        <span class="preset-label">Artisan Presets:</span>
        <div class="preset-buttons">
          @for (preset of presets; track preset.id) {
            <button
              type="button"
              class="c-button c-button--small"
              [class.c-button--primary]="activePresetId() === preset.id"
              [class.c-button--outline]="activePresetId() !== preset.id"
              (click)="applyPreset(preset)"
            >
              {{ preset.name }}
            </button>
          }
        </div>
      </div>

      <!-- Main Columns -->
      <div class="l-columns l-columns--2">
        <!-- Controls Area -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header">
              <h2 class="c-card__title">1. Stencil Dimensions & Rim</h2>
            </div>
            <div class="c-card__body">
              <div class="control-group">
                <label class="c-input__label" for="stencilDiameter">
                  Cup Rim Diameter: {{ stencilDiameterMm() }} mm
                </label>
                <input
                  id="stencilDiameter"
                  type="range"
                  class="c-input c-input__slider"
                  min="60"
                  max="150"
                  step="1"
                  [ngModel]="stencilDiameterMm()"
                  (ngModelChange)="stencilDiameterMm.set($event); updatePreviewMesh()"
                />
                <span class="input-hint">Standard espresso mugs: 70–80mm; Latte/Cappuccino bowls: 90–110mm.</span>
              </div>

              <div class="grid-2-col">
                <div class="control-group">
                  <label class="c-input__label" for="stencilThickness">
                    Thickness: {{ stencilThicknessMm() }} mm
                  </label>
                  <input
                    id="stencilThickness"
                    type="range"
                    class="c-input c-input__slider"
                    min="0.8"
                    max="3.0"
                    step="0.2"
                    [ngModel]="stencilThicknessMm()"
                    (ngModelChange)="stencilThicknessMm.set($event); updatePreviewMesh()"
                  />
                </div>
                <div class="control-group">
                  <label class="c-input__label">Edge Bevel</label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="rimBevel()"
                      (change)="rimBevel.set(!rimBevel()); updatePreviewMesh()"
                    />
                    Smooth Rim Chamfer
                  </label>
                </div>
              </div>
            </div>
          </app-card>

          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">2. Handle & Rest Geometry</h2>
            </div>
            <div class="c-card__body">
              <div class="control-group">
                <label class="c-input__label">Handle Ergonomic Style</label>
                <div class="btn-grid-3">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="handleType() === 'thumb_tab'"
                    [class.c-button--outline]="handleType() !== 'thumb_tab'"
                    (click)="setHandleType('thumb_tab')"
                  >
                    Thumb Tab
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="handleType() === 'extended_rod'"
                    [class.c-button--outline]="handleType() !== 'extended_rod'"
                    (click)="setHandleType('extended_rod')"
                  >
                    Extended Rod
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="handleType() === 'dual_ear'"
                    [class.c-button--outline]="handleType() !== 'dual_ear'"
                    (click)="setHandleType('dual_ear')"
                  >
                    Dual Rim Ears
                  </button>
                </div>
              </div>

              <div class="grid-2-col">
                <div class="control-group">
                  <label class="c-input__label" for="handleLength">
                    Handle Length: {{ handleLengthMm() }} mm
                  </label>
                  <input
                    id="handleLength"
                    type="range"
                    class="c-input c-input__slider"
                    min="15"
                    max="80"
                    step="5"
                    [ngModel]="handleLengthMm()"
                    (ngModelChange)="handleLengthMm.set($event); updatePreviewMesh()"
                  />
                </div>
                <div class="control-group">
                  <label class="c-input__label">Storage Feature</label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="handleHole()"
                      (change)="toggleHandleHole()"
                    />
                    Hanging Peg Hole
                  </label>
                </div>
              </div>
            </div>
          </app-card>

          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">3. Motif & Island Bridging</h2>
            </div>
            <div class="c-card__body">
              <div class="control-group">
                <label class="c-input__label">Motif Design</label>
                <div class="btn-grid-3">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="motif() === 'heart'"
                    [class.c-button--outline]="motif() !== 'heart'"
                    (click)="setMotif('heart')"
                  >
                    ❤️ Heart
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="motif() === 'coffee_bean'"
                    [class.c-button--outline]="motif() !== 'coffee_bean'"
                    (click)="setMotif('coffee_bean')"
                  >
                    ☕ Coffee Bean
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="motif() === 'coffee_cup'"
                    [class.c-button--outline]="motif() !== 'coffee_cup'"
                    (click)="setMotif('coffee_cup')"
                  >
                    🍵 Cup Steam
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="motif() === 'leaf_rosetta'"
                    [class.c-button--outline]="motif() !== 'leaf_rosetta'"
                    (click)="setMotif('leaf_rosetta')"
                  >
                    🌿 Rosetta
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="motif() === 'cat_paw'"
                    [class.c-button--outline]="motif() !== 'cat_paw'"
                    (click)="setMotif('cat_paw')"
                  >
                    🐾 Cat Paw
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="motif() === 'star_burst'"
                    [class.c-button--outline]="motif() !== 'star_burst'"
                    (click)="setMotif('star_burst')"
                  >
                    ✨ Starburst
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="motif() === 'custom_text'"
                    [class.c-button--outline]="motif() !== 'custom_text'"
                    (click)="setMotif('custom_text')"
                  >
                    🔤 Custom Text
                  </button>
                </div>
              </div>

              @if (motif() === 'custom_text') {
                <div class="control-group">
                  <label class="c-input__label" for="customText">Custom Text (1-10 chars)</label>
                  <input
                    id="customText"
                    type="text"
                    maxlength="10"
                    class="c-input c-input--text"
                    [ngModel]="customText()"
                    (ngModelChange)="setCustomText($event)"
                    placeholder="COFFEE"
                  />
                  <span class="input-hint">Letters with closed loops (O, A, B, D, P, R) are automatically bridged.</span>
                </div>
              }

              <div class="grid-2-col">
                <div class="control-group">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="autoBridgeIslands()"
                      (change)="autoBridgeIslands.set(!autoBridgeIslands()); updatePreviewMesh()"
                    />
                    Bridge Floating Islands
                  </label>
                  <span class="input-hint">Inserts tie bars to keep isolated center islands connected.</span>
                </div>

                <div class="control-group">
                  <label class="c-input__label" for="bridgeWidth">
                    Bridge Width: {{ bridgeWidthMm() }} mm
                  </label>
                  <input
                    id="bridgeWidth"
                    type="range"
                    class="c-input c-input__slider"
                    min="1.0"
                    max="4.0"
                    step="0.2"
                    [disabled]="!autoBridgeIslands()"
                    [ngModel]="bridgeWidthMm()"
                    (ngModelChange)="bridgeWidthMm.set($event); updatePreviewMesh()"
                  />
                </div>
              </div>
            </div>
          </app-card>

          <div class="g--margin-top-4">
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="resetToDefaults()"
            >
              🔄 Reset Defaults
            </button>
          </div>
        </div>

        <!-- Preview & Export Area -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header l-extremo">
              <div class="l-extremo__area-izquierda">
                <h2 class="c-card__title">Interactive 3D Viewport</h2>
              </div>
              <div class="l-extremo__area-derecha">
                @if (currentMetrics(); as metrics) {
                  <span class="badge-dim">
                    Ø {{ metrics.diameterMm }} mm • {{ metrics.thicknessMm }} mm thick
                  </span>
                }
              </div>
            </div>
            <div class="c-card__body preview-container">
              <div class="canvas-wrapper" #canvasWrapper>
                <canvas #previewCanvas class="three-canvas"></canvas>
              </div>

              <div class="preview-controls-row">
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  (click)="resetCameraView()"
                >
                  🎯 Reset Camera
                </button>
                <span class="drag-hint">Left-drag to rotate • Scroll to zoom</span>
              </div>
            </div>
          </app-card>

          @if (currentMetrics(); as metrics) {
            <app-card class="g--margin-top-4">
              <div class="c-card__header">
                <h2 class="c-card__title">Manufacturing & Food Safety Specs</h2>
              </div>
              <div class="c-card__body">
                <div class="metrics-panel">
                  <div class="metric-item">
                    <span class="metric-label">Overall Length</span>
                    <span class="metric-value">{{ metrics.totalLengthWithHandleMm.toFixed(1) }} mm</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Cutout Area</span>
                    <span class="metric-value">{{ metrics.cutoutAreaMm2.toFixed(0) }} mm²</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Bridge Tabs</span>
                    <span class="metric-value">{{ metrics.bridgeTabCount }}</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Est. Weight</span>
                    <span class="metric-value">~{{ metrics.estimatedGrams.toFixed(1) }} g</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">3D Print Time</span>
                    <span class="metric-value">~{{ (metrics.estimatedPrintTimeHours * 60).toFixed(0) }} min</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Mesh Faces</span>
                    <span class="metric-value">{{ metrics.totalTriangles.toLocaleString() }} tris</span>
                  </div>
                </div>

                <div class="safety-box g--margin-top-4">
                  <h4 class="safety-title">🥛 Food Safety & Barista Tips</h4>
                  <ul class="safety-list">
                    @for (tip of metrics.foodSafetyTips; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>
              </div>
            </app-card>
          }

          <!-- Export Deliverables -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">Export Deliverables</h2>
            </div>
            <div class="c-card__body">
              <div class="export-buttons-grid">
                <button
                  type="button"
                  class="c-button c-button--primary download-btn-stl"
                  [disabled]="isGenerating()"
                  (click)="downloadFormat('stl')"
                >
                  ☕ Download 3D Printable STL
                </button>
                <button
                  type="button"
                  class="c-button c-button--outline download-btn-svg"
                  [disabled]="isGenerating()"
                  (click)="downloadFormat('svg')"
                >
                  ⚡ Download Laser-Ready SVG
                </button>
              </div>
              <span class="input-hint g--margin-top-2">
                100% processed client-side. Zero telemetry or server exfiltration.
              </span>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styleUrl: './cappuccino-stencil-maker.component.scss',
})
export class CappuccinoStencilMakerComponent implements OnInit, OnDestroy {
  @ViewChild('previewCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('canvasWrapper', { static: true })
  wrapperRef!: ElementRef<HTMLDivElement>;

  readonly presets = STENCIL_PRESETS;
  readonly activePresetId = signal<string>('barista_heart');

  // Reactive state signals
  readonly stencilDiameterMm = signal<number>(DEFAULT_STENCIL_OPTIONS.stencilDiameterMm);
  readonly stencilThicknessMm = signal<number>(DEFAULT_STENCIL_OPTIONS.stencilThicknessMm);
  readonly handleType = signal<StencilHandleType>(DEFAULT_STENCIL_OPTIONS.handleType);
  readonly handleHole = signal<boolean>(DEFAULT_STENCIL_OPTIONS.handleHole);
  readonly handleLengthMm = signal<number>(DEFAULT_STENCIL_OPTIONS.handleLengthMm);
  readonly motif = signal<StencilMotif>(DEFAULT_STENCIL_OPTIONS.motif);
  readonly customText = signal<string>(DEFAULT_STENCIL_OPTIONS.customText);
  readonly contrastThreshold = signal<number>(DEFAULT_STENCIL_OPTIONS.contrastThreshold);
  readonly autoBridgeIslands = signal<boolean>(DEFAULT_STENCIL_OPTIONS.autoBridgeIslands);
  readonly bridgeWidthMm = signal<number>(DEFAULT_STENCIL_OPTIONS.bridgeWidthMm);
  readonly invertCutout = signal<boolean>(DEFAULT_STENCIL_OPTIONS.invertCutout);
  readonly rimBevel = signal<boolean>(DEFAULT_STENCIL_OPTIONS.rimBevel);
  readonly isGenerating = signal<boolean>(false);

  // Active metrics
  readonly currentMetrics = signal<StencilMetrics | null>(null);

  private readonly activeDownloadUrls: string[] = [];
  private worker: Worker | null = null;
  private workerRequestId = 0;

  // Three.js scene instances
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private objectGroup?: THREE.Group;
  private animationFrameId?: number;
  private resizeObserver?: ResizeObserver;

  // Interaction controls
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private readonly onWindowMouseUp = () => {
    this.isDragging = false;
  };

  ngOnInit(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      } catch {}
    }
    this.initThree();
    this.updatePreviewMesh();
  }

  ngOnDestroy(): void {
    window.removeEventListener('mouseup', this.onWindowMouseUp);

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.disposeThreeObjects();

    if (this.renderer) {
      this.renderer.dispose();
    }

    for (const url of this.activeDownloadUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeDownloadUrls.length = 0;
  }

  setHandleType(type: StencilHandleType): void {
    this.handleType.set(type);
    this.updatePreviewMesh();
  }

  toggleHandleHole(): void {
    this.handleHole.set(!this.handleHole());
    this.updatePreviewMesh();
  }

  setMotif(m: StencilMotif): void {
    this.motif.set(m);
    this.updatePreviewMesh();
  }

  setCustomText(text: string): void {
    this.customText.set(text.toUpperCase());
    this.updatePreviewMesh();
  }

  applyPreset(preset: StencilPreset): void {
    this.activePresetId.set(preset.id);
    const opt = preset.options;
    if (opt.stencilDiameterMm !== undefined) this.stencilDiameterMm.set(opt.stencilDiameterMm);
    if (opt.stencilThicknessMm !== undefined) this.stencilThicknessMm.set(opt.stencilThicknessMm);
    if (opt.handleType !== undefined) this.handleType.set(opt.handleType);
    if (opt.handleHole !== undefined) this.handleHole.set(opt.handleHole);
    if (opt.handleLengthMm !== undefined) this.handleLengthMm.set(opt.handleLengthMm);
    if (opt.motif !== undefined) this.motif.set(opt.motif);
    if (opt.customText !== undefined) this.customText.set(opt.customText);
    if (opt.autoBridgeIslands !== undefined) this.autoBridgeIslands.set(opt.autoBridgeIslands);
    if (opt.bridgeWidthMm !== undefined) this.bridgeWidthMm.set(opt.bridgeWidthMm);

    this.updatePreviewMesh();
  }

  resetToDefaults(): void {
    this.applyPreset(this.presets[0]);
    this.stencilDiameterMm.set(DEFAULT_STENCIL_OPTIONS.stencilDiameterMm);
    this.stencilThicknessMm.set(DEFAULT_STENCIL_OPTIONS.stencilThicknessMm);
    this.handleType.set(DEFAULT_STENCIL_OPTIONS.handleType);
    this.handleHole.set(DEFAULT_STENCIL_OPTIONS.handleHole);
    this.handleLengthMm.set(DEFAULT_STENCIL_OPTIONS.handleLengthMm);
    this.motif.set(DEFAULT_STENCIL_OPTIONS.motif);
    this.customText.set(DEFAULT_STENCIL_OPTIONS.customText);
    this.autoBridgeIslands.set(DEFAULT_STENCIL_OPTIONS.autoBridgeIslands);
    this.bridgeWidthMm.set(DEFAULT_STENCIL_OPTIONS.bridgeWidthMm);
    this.invertCutout.set(DEFAULT_STENCIL_OPTIONS.invertCutout);
    this.rimBevel.set(DEFAULT_STENCIL_OPTIONS.rimBevel);
    this.updatePreviewMesh();
  }

  resetCameraView(): void {
    if (!this.camera || !this.objectGroup) return;
    this.objectGroup.rotation.set(-0.35, 0.25, 0.1);
    this.fitCameraToObject();
  }

  async downloadFormat(format: StencilExportFormat): Promise<void> {
    this.isGenerating.set(true);
    try {
      const options = this.getCurrentOptions();
      let blob: Blob;
      let fileName: string;

      if (this.worker) {
        const id = ++this.workerRequestId;
        const result = await new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
          const handler = (e: MessageEvent<StencilWorkerResponse>) => {
            if (e.data.id === id) {
              if (e.data.type === 'error') {
                this.worker?.removeEventListener('message', handler);
                reject(new Error(e.data.error || 'Worker export error'));
              } else if (e.data.type === 'result') {
                this.worker?.removeEventListener('message', handler);
                if (e.data.buffer && e.data.fileName) {
                  const b = new Blob([e.data.buffer], {
                    type: e.data.mimeType || 'application/octet-stream',
                  });
                  resolve({ blob: b, fileName: e.data.fileName });
                } else if (e.data.svgContent && e.data.fileName) {
                  const b = new Blob([e.data.svgContent], { type: 'image/svg+xml' });
                  resolve({ blob: b, fileName: e.data.fileName });
                } else {
                  reject(new Error('Invalid worker response payload'));
                }
              }
            }
          };
          this.worker?.addEventListener('message', handler);
          const request: StencilWorkerRequest = {
            id,
            options,
            format,
          };
          this.worker?.postMessage(request);
        });
        blob = result.blob;
        fileName = result.fileName;
      } else {
        const result = await processStencil(options, format);
        if (!result.blob) {
          throw new Error(result.error || 'Export failed');
        }
        blob = result.blob;
        fileName = result.fileName;
      }

      this.triggerFileDownload(blob, fileName);
    } finally {
      this.isGenerating.set(false);
    }
  }

  private triggerFileDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    this.activeDownloadUrls.push(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = this.activeDownloadUrls.indexOf(url);
      if (idx !== -1) {
        this.activeDownloadUrls.splice(idx, 1);
      }
    }, 100);
  }

  updatePreviewMesh(): void {
    if (!this.scene || !this.objectGroup) return;

    try {
      this.disposeThreeObjects();

      const options = this.getCurrentOptions();
      const { stencilGeometry, metrics } = generateStencilMesh(options);
      this.currentMetrics.set(metrics);

      const material = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.35,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(stencilGeometry, material);
      this.objectGroup.add(mesh);
      this.fitCameraToObject();
    } catch {
      // Graceful fallback for headless tests
    }
  }

  private getCurrentOptions(): CappuccinoStencilMakerOptions {
    return {
      stencilDiameterMm: this.stencilDiameterMm(),
      stencilThicknessMm: this.stencilThicknessMm(),
      handleType: this.handleType(),
      handleHole: this.handleHole(),
      handleLengthMm: this.handleLengthMm(),
      motif: this.motif(),
      customText: this.customText(),
      contrastThreshold: this.contrastThreshold(),
      autoBridgeIslands: this.autoBridgeIslands(),
      bridgeWidthMm: this.bridgeWidthMm(),
      invertCutout: this.invertCutout(),
      rimBevel: this.rimBevel(),
    };
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const wrapper = this.wrapperRef.nativeElement;

    try {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0f172a);

      const width = wrapper.clientWidth || 400;
      const height = wrapper.clientHeight || 380;

      this.camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
      this.camera.position.set(0, -30, 160);

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
      keyLight.position.set(50, 80, 120);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
      fillLight.position.set(-60, -40, 60);
      this.scene.add(fillLight);

      this.objectGroup = new THREE.Group();
      this.objectGroup.rotation.set(-0.35, 0.25, 0.1);
      this.scene.add(this.objectGroup);

      this.setupMouseEvents(canvas);

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate();

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          if (!this.camera || !this.renderer || !wrapper) return;
          const w = wrapper.clientWidth;
          const h = wrapper.clientHeight;
          if (w > 0 && h > 0) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
          }
        });
        this.resizeObserver.observe(wrapper);
      }
    } catch {
      // Fallback in headless environment without WebGL
    }
  }

  private setupMouseEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', this.onWindowMouseUp);

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.objectGroup) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.objectGroup.rotation.z += deltaX * 0.01;
      this.objectGroup.rotation.x += deltaY * 0.01;

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.camera) return;

      const zoomFactor = e.deltaY > 0 ? 1.05 : 0.95;
      this.camera.position.z = Math.min(Math.max(this.camera.position.z * zoomFactor, 30), 500);
    });

    // Touch orbit interaction
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onTouchEnd());
    canvas.addEventListener('touchcancel', () => this.onTouchEnd());
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      event.preventDefault();
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || !this.objectGroup || event.touches.length !== 1) return;
    const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
    const deltaY = event.touches[0].clientY - this.previousMousePosition.y;

    this.objectGroup.rotation.z += deltaX * 0.01;
    this.objectGroup.rotation.x += deltaY * 0.01;

    this.previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
    event.preventDefault();
  }

  onTouchEnd(): void {
    this.isDragging = false;
  }

  private fitCameraToObject(): void {
    if (!this.camera || !this.objectGroup) return;

    const box = new THREE.Box3().setFromObject(this.objectGroup);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    cameraZ = Math.max(cameraZ, 80);

    this.camera.position.set(0, 0, cameraZ);
    this.camera.lookAt(0, 0, 0);
  }

  private disposeThreeObjects(): void {
    if (!this.objectGroup) return;

    while (this.objectGroup.children.length > 0) {
      const child = this.objectGroup.children[0];
      this.objectGroup.remove(child);

      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    }
  }
}
