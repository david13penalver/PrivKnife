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
  HswCellGrid,
  HswExportFormat,
  HswInsertAdapterOptions,
  HswInsertAdapterResult,
  HswInsertType,
  HswMetrics,
  HswPreset,
  HswWorkerRequest,
  HswWorkerResponse,
  MetricNutSize,
} from './types';
import {
  DEFAULT_HSW_OPTIONS,
  HSW_PRESETS,
} from './test-fixtures';
import {
  generateHswMesh,
  processHsw,
} from './engine';

@Component({
  selector: 'app-hsw-insert-adapter',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, TranslatePipe],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">{{ 'tools.hswInsertAdapter.name' | translate }}</h1>
          <p class="c-header__subtitle">
            {{ 'tools.hswInsertAdapter.description' | translate }}
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          {{ 'common.privacyBadge' | translate }}
        </div>
      </div>

      <!-- Presets Strip -->
      <div class="preset-strip g--margin-bottom-4">
        <span class="preset-label">Standard Presets:</span>
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
              <h2 class="c-card__title">{{ 'tools.hswInsertAdapter.depthTitle' | translate }}</h2>
            </div>
            <div class="c-card__body">
              <div class="control-group">
                <label class="c-input__label" for="tightnessTol">
                  Wall Tightness Tolerance: {{ tightnessToleranceMm() > 0 ? '+' : '' }}{{ tightnessToleranceMm() }} mm
                </label>
                <input
                  id="tightnessTol"
                  type="range"
                  class="c-input c-input--range c-input__slider"
                  min="-0.2"
                  max="0.3"
                  step="0.05"
                  [ngModel]="tightnessToleranceMm()"
                  (ngModelChange)="tightnessToleranceMm.set($event); updatePreviewMesh()"
                />
                <div class="tolerance-labels">
                  <span>-0.2 (Loose)</span>
                  <span>0.0 (Standard HSW 20mm)</span>
                  <span>+0.3 (Firm Press-fit)</span>
                </div>
              </div>

              <div class="grid-2-col">
                <div class="control-group">
                  <label class="c-input__label" for="plugDepth">
                    Plug Depth: {{ plugDepthMm() }} mm
                  </label>
                  <input
                    id="plugDepth"
                    type="range"
                    class="c-input c-input--range c-input__slider"
                    min="6.0"
                    max="12.0"
                    step="1.0"
                    [ngModel]="plugDepthMm()"
                    (ngModelChange)="plugDepthMm.set($event); updatePreviewMesh()"
                  />
                  <span class="input-hint">Standard HSW panel thickness is 8.0mm.</span>
                </div>

                <div class="control-group">
                  <label class="c-input__label">Plug Features</label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="retentionTabs()"
                      (change)="toggleRetentionTabs()"
                    />
                    Spring Click-Tabs
                  </label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="flangeRim()"
                      (change)="flangeRim.set(!flangeRim()); updatePreviewMesh()"
                    />
                    Front Stop Flange
                  </label>
                </div>
              </div>

              <div class="control-group g--margin-top-3 grid-selector-group" data-testid="cell-grid-group">
                <label class="c-input__label">Multi-Cell Ganging</label>
                <div class="btn-grid-3">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="cellGrid() === '1x1'"
                    [class.c-button--outline]="cellGrid() !== '1x1'"
                    (click)="cellGrid.set('1x1'); updatePreviewMesh()"
                  >
                    1×1 Single
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="cellGrid() === '2x1'"
                    [class.c-button--outline]="cellGrid() !== '2x1'"
                    (click)="cellGrid.set('2x1'); updatePreviewMesh()"
                  >
                    2×1 Dual
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="cellGrid() === '2x2'"
                    [class.c-button--outline]="cellGrid() !== '2x2'"
                    (click)="cellGrid.set('2x2'); updatePreviewMesh()"
                  >
                    2×2 Quad
                  </button>
                </div>
              </div>
            </div>
          </app-card>

          <!-- Attachment Selection -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">{{ 'tools.hswInsertAdapter.mountTitle' | translate }}</h2>
            </div>
            <div class="c-card__body">
              <div class="btn-grid-3">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="insertType() === 'hex_nut_pocket'"
                  [class.c-button--outline]="insertType() !== 'hex_nut_pocket'"
                  (click)="setInsertType('hex_nut_pocket')"
                >
                  🔩 Nut Pocket
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="insertType() === 'tool_hook'"
                  [class.c-button--outline]="insertType() !== 'tool_hook'"
                  (click)="setInsertType('tool_hook')"
                >
                  🪝 Utility Hook
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="insertType() === 'magnet_holder'"
                  [class.c-button--outline]="insertType() !== 'magnet_holder'"
                  (click)="setInsertType('magnet_holder')"
                >
                  🧲 Magnet Pocket
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="insertType() === 'storage_ring'"
                  [class.c-button--outline]="insertType() !== 'storage_ring'"
                  (click)="setInsertType('storage_ring')"
                >
                  ⭕ Tool Loop
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="insertType() === 'threaded_post'"
                  [class.c-button--outline]="insertType() !== 'threaded_post'"
                  (click)="setInsertType('threaded_post')"
                >
                  📍 Thread Post
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="insertType() === 'empty_plug'"
                  [class.c-button--outline]="insertType() !== 'empty_plug'"
                  (click)="setInsertType('empty_plug')"
                >
                  ⬛ Blank Plug
                </button>
              </div>

              <!-- Attachment Specific Parameters -->
              <div class="attachment-params g--margin-top-4">
                @if (insertType() === 'hex_nut_pocket' || insertType() === 'threaded_post') {
                  <div class="control-group">
                    <label class="c-input__label">Metric Fastener Size</label>
                    <div class="btn-grid-3">
                      <button
                        type="button"
                        class="c-button c-button--small"
                        [class.c-button--primary]="nutSize() === 'M3'"
                        [class.c-button--outline]="nutSize() !== 'M3'"
                        (click)="setNutSize('M3')"
                      >
                        M3 (5.5mm hex)
                      </button>
                      <button
                        type="button"
                        class="c-button c-button--small"
                        [class.c-button--primary]="nutSize() === 'M4'"
                        [class.c-button--outline]="nutSize() !== 'M4'"
                        (click)="setNutSize('M4')"
                      >
                        M4 (7.0mm hex)
                      </button>
                      <button
                        type="button"
                        class="c-button c-button--small"
                        [class.c-button--primary]="nutSize() === 'M5'"
                        [class.c-button--outline]="nutSize() !== 'M5'"
                        (click)="setNutSize('M5')"
                      >
                        M5 (8.0mm hex)
                      </button>
                    </div>
                  </div>
                }

                @if (insertType() === 'tool_hook') {
                  <div class="grid-2-col">
                    <div class="control-group">
                      <label class="c-input__label" for="hookLength">Hook Length: {{ hookLengthMm() }} mm</label>
                      <input
                        id="hookLength"
                        type="range"
                        class="c-input c-input--range c-input__slider"
                        min="15"
                        max="70"
                        step="5"
                        [ngModel]="hookLengthMm()"
                        (ngModelChange)="hookLengthMm.set($event); updatePreviewMesh()"
                      />
                    </div>
                    <div class="control-group">
                      <label class="c-input__label" for="hookAngle">Upturn Tip Angle: {{ hookAngleDeg() }}°</label>
                      <input
                        id="hookAngle"
                        type="range"
                        class="c-input c-input--range c-input__slider"
                        min="0"
                        max="60"
                        step="5"
                        [ngModel]="hookAngleDeg()"
                        (ngModelChange)="hookAngleDeg.set($event); updatePreviewMesh()"
                      />
                    </div>
                  </div>
                }

                @if (insertType() === 'magnet_holder') {
                  <div class="grid-2-col">
                    <div class="control-group">
                      <label class="c-input__label" for="magnetDia">Magnet Diameter: Ø {{ magnetDiameterMm() }} mm</label>
                      <input
                        id="magnetDia"
                        type="range"
                        class="c-input c-input--range c-input__slider"
                        min="5.0"
                        max="15.0"
                        step="0.5"
                        [ngModel]="magnetDiameterMm()"
                        (ngModelChange)="magnetDiameterMm.set($event); updatePreviewMesh()"
                      />
                    </div>
                    <div class="control-group">
                      <label class="c-input__label" for="magnetDepth">Magnet Thickness: {{ magnetDepthMm() }} mm</label>
                      <input
                        id="magnetDepth"
                        type="range"
                        class="c-input c-input--range c-input__slider"
                        min="1.5"
                        max="5.0"
                        step="0.5"
                        [ngModel]="magnetDepthMm()"
                        (ngModelChange)="magnetDepthMm.set($event); updatePreviewMesh()"
                      />
                    </div>
                  </div>
                }

                @if (insertType() === 'storage_ring') {
                  <div class="control-group">
                    <label class="c-input__label" for="ringDia">Internal Ring Diameter: Ø {{ ringDiameterMm() }} mm</label>
                    <input
                      id="ringDia"
                      type="range"
                      class="c-input c-input--range c-input__slider"
                      min="15"
                      max="60"
                      step="2"
                      [ngModel]="ringDiameterMm()"
                      (ngModelChange)="ringDiameterMm.set($event); updatePreviewMesh()"
                    />
                    <span class="input-hint">Ideal for pliers, screwdrivers, spray lubricant cans, or deburring tools.</span>
                  </div>
                }
              </div>
            </div>
          </app-card>

          <div class="g--margin-top-4">
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="resetToDefaults()"
            >
              🔄 {{ 'common.resetDefaults' | translate }}
            </button>
          </div>
        </div>

        <!-- Preview & Export Area -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header l-extremo">
              <div class="l-extremo__area-izquierda">
                <h2 class="c-card__title">{{ 'common.interactiveViewport' | translate }}</h2>
              </div>
              <div class="l-extremo__area-derecha">
                @if (currentMetrics(); as metrics) {
                  <span class="badge-dim">
                    HSW {{ metrics.acrossFlatsMm }}mm • {{ metrics.plugDepthMm }}mm depth
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
                <h2 class="c-card__title">Manufacturing & HSW Specs</h2>
              </div>
              <div class="c-card__body">
                <div class="metrics-panel">
                  <div class="metric-item">
                    <span class="metric-label">Across Flats</span>
                    <span class="metric-value">{{ metrics.acrossFlatsMm }} mm</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Total Reach</span>
                    <span class="metric-value">{{ metrics.totalLengthMm }} mm</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">{{ 'common.estWeight' | translate }}</span>
                    <span class="metric-value">~{{ metrics.estimatedGrams.toFixed(1) }} g</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Print Time</span>
                    <span class="metric-value">~{{ (metrics.estimatedPrintTimeHours * 60).toFixed(0) }} min</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Mesh Faces</span>
                    <span class="metric-value">{{ metrics.totalTriangles.toLocaleString() }} tris</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Compatibility</span>
                    <span class="metric-value">HSW v1.0</span>
                  </div>
                </div>

                <div class="safety-box g--margin-top-4">
                  <h4 class="safety-title">🛠️ Workshop Slicing Advice</h4>
                  <ul class="safety-list">
                    @for (tip of metrics.hswPrintingTips; track tip) {
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
                  📦 Download 3D Printable STL
                </button>
                <button
                  type="button"
                  class="c-button c-button--outline download-btn-3mf"
                  [disabled]="isGenerating()"
                  (click)="downloadFormat('3mf')"
                >
                  🌈 Download Multi-Part 3MF
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
  styleUrl: './hsw-insert-adapter.component.scss',
})
export class HswInsertAdapterComponent implements OnInit, OnDestroy {
  @ViewChild('previewCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('canvasWrapper', { static: true })
  wrapperRef!: ElementRef<HTMLDivElement>;

  readonly presets = HSW_PRESETS;
  readonly activePresetId = signal<string>('m4_captive_nut');

  // Reactive state signals
  readonly insertType = signal<HswInsertType>(DEFAULT_HSW_OPTIONS.insertType);
  readonly nutSize = signal<MetricNutSize>(DEFAULT_HSW_OPTIONS.nutSize);
  readonly magnetDiameterMm = signal<number>(DEFAULT_HSW_OPTIONS.magnetDiameterMm);
  readonly magnetDepthMm = signal<number>(DEFAULT_HSW_OPTIONS.magnetDepthMm);
  readonly hookLengthMm = signal<number>(DEFAULT_HSW_OPTIONS.hookLengthMm);
  readonly hookAngleDeg = signal<number>(DEFAULT_HSW_OPTIONS.hookAngleDeg);
  readonly ringDiameterMm = signal<number>(DEFAULT_HSW_OPTIONS.ringDiameterMm);
  readonly tightnessToleranceMm = signal<number>(DEFAULT_HSW_OPTIONS.tightnessToleranceMm);
  readonly retentionTabs = signal<boolean>(DEFAULT_HSW_OPTIONS.retentionTabs);
  readonly plugDepthMm = signal<number>(DEFAULT_HSW_OPTIONS.plugDepthMm);
  readonly flangeRim = signal<boolean>(DEFAULT_HSW_OPTIONS.flangeRim);
  readonly cellGrid = signal<HswCellGrid>(DEFAULT_HSW_OPTIONS.cellGrid || '1x1');
  readonly isGenerating = signal<boolean>(false);

  // Active metrics
  readonly currentMetrics = signal<HswMetrics | null>(null);

  private readonly activeDownloadUrls: string[] = [];
  private worker: Worker | null = null;

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
    this.initThree();
    this.updatePreviewMesh();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    window.removeEventListener('mouseup', this.onWindowMouseUp);
    window.removeEventListener('touchend', this.onWindowMouseUp);

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
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

  setInsertType(type: HswInsertType): void {
    this.insertType.set(type);
    this.updatePreviewMesh();
  }

  setNutSize(size: MetricNutSize): void {
    this.nutSize.set(size);
    this.updatePreviewMesh();
  }

  toggleRetentionTabs(): void {
    this.retentionTabs.set(!this.retentionTabs());
    this.updatePreviewMesh();
  }

  applyPreset(preset: HswPreset): void {
    this.activePresetId.set(preset.id);
    const opt = preset.options;
    if (opt.insertType !== undefined) this.insertType.set(opt.insertType);
    if (opt.nutSize !== undefined) this.nutSize.set(opt.nutSize);
    if (opt.magnetDiameterMm !== undefined) this.magnetDiameterMm.set(opt.magnetDiameterMm);
    if (opt.magnetDepthMm !== undefined) this.magnetDepthMm.set(opt.magnetDepthMm);
    if (opt.hookLengthMm !== undefined) this.hookLengthMm.set(opt.hookLengthMm);
    if (opt.hookAngleDeg !== undefined) this.hookAngleDeg.set(opt.hookAngleDeg);
    if (opt.ringDiameterMm !== undefined) this.ringDiameterMm.set(opt.ringDiameterMm);
    if (opt.tightnessToleranceMm !== undefined) this.tightnessToleranceMm.set(opt.tightnessToleranceMm);
    if (opt.retentionTabs !== undefined) this.retentionTabs.set(opt.retentionTabs);
    if (opt.plugDepthMm !== undefined) this.plugDepthMm.set(opt.plugDepthMm);
    if (opt.flangeRim !== undefined) this.flangeRim.set(opt.flangeRim);
    if (opt.cellGrid !== undefined) this.cellGrid.set(opt.cellGrid);

    this.updatePreviewMesh();
  }

  resetToDefaults(): void {
    this.applyPreset(this.presets[0]);
    this.insertType.set(DEFAULT_HSW_OPTIONS.insertType);
    this.nutSize.set(DEFAULT_HSW_OPTIONS.nutSize);
    this.magnetDiameterMm.set(DEFAULT_HSW_OPTIONS.magnetDiameterMm);
    this.magnetDepthMm.set(DEFAULT_HSW_OPTIONS.magnetDepthMm);
    this.hookLengthMm.set(DEFAULT_HSW_OPTIONS.hookLengthMm);
    this.hookAngleDeg.set(DEFAULT_HSW_OPTIONS.hookAngleDeg);
    this.ringDiameterMm.set(DEFAULT_HSW_OPTIONS.ringDiameterMm);
    this.tightnessToleranceMm.set(DEFAULT_HSW_OPTIONS.tightnessToleranceMm);
    this.retentionTabs.set(DEFAULT_HSW_OPTIONS.retentionTabs);
    this.plugDepthMm.set(DEFAULT_HSW_OPTIONS.plugDepthMm);
    this.flangeRim.set(DEFAULT_HSW_OPTIONS.flangeRim);
    this.cellGrid.set(DEFAULT_HSW_OPTIONS.cellGrid || '1x1');
    this.updatePreviewMesh();
  }

  resetCameraView(): void {
    if (!this.camera || !this.objectGroup) return;
    this.objectGroup.rotation.set(-0.4, 0.35, 0.1);
    this.fitCameraToObject();
  }

  async downloadFormat(format: HswExportFormat): Promise<void> {
    this.isGenerating.set(true);
    try {
      const options = this.getCurrentOptions();
      let result: HswInsertAdapterResult;

      if (typeof Worker !== 'undefined') {
        try {
          result = await this.runWorkerProcess(options, format);
        } catch {
          result = await processHsw(options, format);
        }
      } else {
        result = await processHsw(options, format);
      }

      if (!result.success || !result.blob) {
        return;
      }

      const url = URL.createObjectURL(result.blob);
      this.activeDownloadUrls.push(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
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
    } finally {
      this.isGenerating.set(false);
    }
  }

  private runWorkerProcess(
    options: HswInsertAdapterOptions,
    format: HswExportFormat
  ): Promise<HswInsertAdapterResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
        this.worker = worker;
        worker.onmessage = (event: MessageEvent<HswWorkerResponse>) => {
          worker.terminate();
          if (this.worker === worker) {
            this.worker = null;
          }
          if (event.data.success && event.data.blob) {
            resolve({
              success: true,
              blob: event.data.blob,
              fileName:
                event.data.fileName ||
                `hsw-insert.${format === '3mf' ? '3mf' : 'stl'}`,
              fileSize: event.data.fileSize || event.data.blob.size,
              mimeType: event.data.mimeType || 'application/octet-stream',
              metrics: event.data.metrics!,
            });
          } else {
            reject(new Error(event.data.error || 'Worker generation failed'));
          }
        };
        worker.onerror = (err) => {
          worker.terminate();
          if (this.worker === worker) {
            this.worker = null;
          }
          reject(err);
        };
        worker.postMessage({ options, format } as HswWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
  }

  updatePreviewMesh(): void {
    if (!this.scene || !this.objectGroup) return;

    try {
      this.disposeThreeObjects();

      const options = this.getCurrentOptions();
      const { plugGeometry, attachmentGeometry, metrics } = generateHswMesh(options);
      this.currentMetrics.set(metrics);

      // Plug mesh (clean slate gray)
      const plugMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.35,
        metalness: 0.1,
      });
      const plugMesh = new THREE.Mesh(plugGeometry, plugMat);
      this.objectGroup.add(plugMesh);

      // Attachment mesh (vibrant cyan accent)
      if (attachmentGeometry.getAttribute('position') && attachmentGeometry.getAttribute('position').count > 0) {
        const attachMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.3,
          metalness: 0.15,
        });
        const attachMesh = new THREE.Mesh(attachmentGeometry, attachMat);
        this.objectGroup.add(attachMesh);
      }

      this.fitCameraToObject();
    } catch {
      // Graceful fallback for headless tests
    }
  }

  private getCurrentOptions(): HswInsertAdapterOptions {
    return {
      insertType: this.insertType(),
      nutSize: this.nutSize(),
      magnetDiameterMm: this.magnetDiameterMm(),
      magnetDepthMm: this.magnetDepthMm(),
      hookLengthMm: this.hookLengthMm(),
      hookAngleDeg: this.hookAngleDeg(),
      ringDiameterMm: this.ringDiameterMm(),
      tightnessToleranceMm: this.tightnessToleranceMm(),
      retentionTabs: this.retentionTabs(),
      plugDepthMm: this.plugDepthMm(),
      flangeRim: this.flangeRim(),
      cellGrid: this.cellGrid(),
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
      this.camera.position.set(0, -30, 90);

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

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(50, 70, 90);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
      fillLight.position.set(-60, -40, 50);
      this.scene.add(fillLight);

      this.objectGroup = new THREE.Group();
      this.objectGroup.rotation.set(-0.4, 0.35, 0.1);
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
      // Fallback in headless JSDOM environments
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

    canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches && e.touches.length > 0) {
          this.isDragging = true;
          this.previousMousePosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        }
      },
      { passive: true }
    );

    window.addEventListener('touchend', this.onWindowMouseUp);

    canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!this.isDragging || !this.objectGroup || !e.touches || e.touches.length === 0) return;

        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

        this.objectGroup.rotation.z += deltaX * 0.01;
        this.objectGroup.rotation.x += deltaY * 0.01;

        this.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      },
      { passive: true }
    );

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.camera) return;

      const zoomFactor = e.deltaY > 0 ? 1.05 : 0.95;
      this.camera.position.z = Math.min(Math.max(this.camera.position.z * zoomFactor, 20), 400);
    });
  }

  private fitCameraToObject(): void {
    if (!this.camera || !this.objectGroup) return;

    const box = new THREE.Box3().setFromObject(this.objectGroup);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    cameraZ = Math.max(cameraZ, 60);

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
