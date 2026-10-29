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
  KeycapExportFormat,
  KeycapItemType,
  KeycapMetrics,
  KeycapPreset,
  KeycapProfile,
  KeycapSwitchTesterMakerOptions,
  KeyUnitSize,
  LegendStyle,
  KeycapWorkerRequest,
  KeycapWorkerResponse,
} from './types';
import {
  DEFAULT_KEYCAP_OPTIONS,
  KEYCAP_PRESETS,
} from './test-fixtures';
import {
  generateKeycapMesh,
  generateSwitchTesterMesh,
  processKeycap,
  validateKeycapOptions,
} from './engine';

@Component({
  selector: 'app-keycap-switch-tester-maker',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, TranslatePipe],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">{{ 'tools.keycapSwitchTesterMaker.name' | translate }}</h1>
          <p class="c-header__subtitle">
            {{ 'tools.keycapSwitchTesterMaker.description' | translate }}
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          {{ 'common.privacyBadge' | translate }}
        </div>
      </div>

      <!-- Presets Strip -->
      <div class="preset-strip g--margin-bottom-4">
        <span class="preset-label">Quick Presets:</span>
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

      <!-- Mode Selector Tabs -->
      <div class="mode-tabs g--margin-bottom-4">
        <button
          type="button"
          class="mode-tab"
          [class.mode-tab--active]="itemType() === 'keycap'"
          (click)="setItemType('keycap')"
        >
          ⌨️ Mechanical Keycap Maker
        </button>
        <button
          type="button"
          class="mode-tab"
          [class.mode-tab--active]="itemType() === 'switch_tester_tray'"
          (click)="setItemType('switch_tester_tray')"
        >
          🧪 Switch Tester Desk Tray
        </button>
      </div>

      <!-- Main Columns -->
      <div class="l-columns l-columns--2">
        <!-- Controls Area -->
        <div class="l-columns__area">
          @if (itemType() === 'keycap') {
            <!-- Keycap Configuration -->
            <app-card>
              <div class="c-card__header">
                <h2 class="c-card__title">{{ 'tools.keycapSwitchTesterMaker.stemTitle' | translate }}</h2>
              </div>
              <div class="c-card__body">
                <!-- Profile -->
                <div class="control-group">
                  <label class="c-input__label">Keycap Ergonomic Profile</label>
                  <div class="btn-grid-3">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keycapProfile() === 'cherry'"
                      [class.c-button--outline]="keycapProfile() !== 'cherry'"
                      (click)="setKeycapProfile('cherry')"
                    >
                      Cherry (9.4mm)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keycapProfile() === 'oem'"
                      [class.c-button--outline]="keycapProfile() !== 'oem'"
                      (click)="setKeycapProfile('oem')"
                    >
                      OEM (11.5mm)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keycapProfile() === 'dsa'"
                      [class.c-button--outline]="keycapProfile() !== 'dsa'"
                      (click)="setKeycapProfile('dsa')"
                    >
                      DSA (7.4mm)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keycapProfile() === 'xda'"
                      [class.c-button--outline]="keycapProfile() !== 'xda'"
                      (click)="setKeycapProfile('xda')"
                    >
                      XDA (9.1mm)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keycapProfile() === 'sa'"
                      [class.c-button--outline]="keycapProfile() !== 'sa'"
                      (click)="setKeycapProfile('sa')"
                    >
                      SA Retro (13.0mm)
                    </button>
                  </div>
                </div>

                <!-- Unit Size -->
                <div class="control-group">
                  <label class="c-input__label">Unit Size (Width)</label>
                  <div class="btn-grid-3">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keyUnitSize() === '1u'"
                      [class.c-button--outline]="keyUnitSize() !== '1u'"
                      (click)="setKeyUnitSize('1u')"
                    >
                      1U (18mm)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keyUnitSize() === '1.25u'"
                      [class.c-button--outline]="keyUnitSize() !== '1.25u'"
                      (click)="setKeyUnitSize('1.25u')"
                    >
                      1.25U (Ctrl/Alt)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keyUnitSize() === '1.75u'"
                      [class.c-button--outline]="keyUnitSize() !== '1.75u'"
                      (click)="setKeyUnitSize('1.75u')"
                    >
                      1.75U (Caps)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keyUnitSize() === '2u'"
                      [class.c-button--outline]="keyUnitSize() !== '2u'"
                      (click)="setKeyUnitSize('2u')"
                    >
                      2U (Backspace)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keyUnitSize() === '2.25u'"
                      [class.c-button--outline]="keyUnitSize() !== '2.25u'"
                      (click)="setKeyUnitSize('2.25u')"
                    >
                      2.25U (Shift/Enter)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="keyUnitSize() === '6.25u'"
                      [class.c-button--outline]="keyUnitSize() !== '6.25u'"
                      (click)="setKeyUnitSize('6.25u')"
                    >
                      6.25U (Spacebar)
                    </button>
                  </div>
                </div>

                <!-- Legend & Custom Text -->
                <div class="control-group">
                  <label class="c-input__label" for="legendText">Legend Character / Word</label>
                  <input
                    id="legendText"
                    type="text"
                    class="c-input"
                    [ngModel]="legendText()"
                    (ngModelChange)="onLegendTextChange($event)"
                    placeholder="e.g. ESC, FN, WIN, Ctrl"
                    maxlength="15"
                  />
                </div>

                <!-- Legend Style -->
                <div class="control-group">
                  <label class="c-input__label">Legend Style</label>
                  <div class="btn-grid-3">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="legendStyle() === 'embossed'"
                      [class.c-button--outline]="legendStyle() !== 'embossed'"
                      (click)="setLegendStyle('embossed')"
                    >
                      Embossed (+0.4mm)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="legendStyle() === 'inlaid_multicolor'"
                      [class.c-button--outline]="legendStyle() !== 'inlaid_multicolor'"
                      (click)="setLegendStyle('inlaid_multicolor')"
                    >
                      Multi-Color 3MF
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="legendStyle() === 'blank'"
                      [class.c-button--outline]="legendStyle() !== 'blank'"
                      (click)="setLegendStyle('blank')"
                    >
                      Blank Top
                    </button>
                  </div>
                </div>

                <!-- Stem Tolerance -->
                <div class="control-group">
                  <label class="c-input__label" for="stemTolerance">
                    MX Cross Stem Tolerance: +{{ stemToleranceOffsetMm().toFixed(2) }} mm
                  </label>
                  <input
                    id="stemTolerance"
                    type="range"
                    class="c-input c-input__slider"
                    min="0.0"
                    max="0.4"
                    step="0.05"
                    [ngModel]="stemToleranceOffsetMm()"
                    (ngModelChange)="stemToleranceOffsetMm.set($event); updatePreviewMesh()"
                  />
                  <span class="input-hint">
                    Increase if the keycap fits too tightly on your switches (typical FDM: +0.10mm to +0.15mm, Resin: +0.05mm).
                  </span>
                </div>
              </div>
            </app-card>
          } @else {
            <!-- Switch Tester Tray Configuration -->
            <app-card>
              <div class="c-card__header">
                <h2 class="c-card__title">{{ 'tools.keycapSwitchTesterMaker.matrixTitle' | translate }}</h2>
              </div>
              <div class="c-card__body">
                <div class="grid-2-col">
                  <div class="control-group">
                    <label class="c-input__label" for="trayRows">Grid Rows: {{ trayRows() }}</label>
                    <input
                      id="trayRows"
                      type="range"
                      class="c-input c-input__slider"
                      min="1"
                      max="6"
                      step="1"
                      [ngModel]="trayRows()"
                      (ngModelChange)="trayRows.set($event); updatePreviewMesh()"
                    />
                  </div>
                  <div class="control-group">
                    <label class="c-input__label" for="trayCols">Grid Columns: {{ trayCols() }}</label>
                    <input
                      id="trayCols"
                      type="range"
                      class="c-input c-input__slider"
                      min="1"
                      max="6"
                      step="1"
                      [ngModel]="trayCols()"
                      (ngModelChange)="trayCols.set($event); updatePreviewMesh()"
                    />
                  </div>
                </div>

                <div class="control-group">
                  <label class="c-input__label" for="trayTilt">
                    Desktop Incline Tilt: {{ trayTiltAngleDeg() }}°
                  </label>
                  <input
                    id="trayTilt"
                    type="range"
                    class="c-input c-input__slider"
                    min="0"
                    max="18"
                    step="2"
                    [ngModel]="trayTiltAngleDeg()"
                    (ngModelChange)="trayTiltAngleDeg.set($event); updatePreviewMesh()"
                  />
                  <span class="input-hint">Ergonomic angled viewing wedge for desktop switch testing and artisan displays.</span>
                </div>
              </div>
            </app-card>
          }

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
                    {{ metrics.widthMm }} × {{ metrics.depthMm }} × {{ metrics.heightMm }} mm
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
                <span class="drag-hint">🖱️ Left-drag to rotate • Scroll to zoom</span>
              </div>

              <!-- Production Metrics -->
              @if (currentMetrics(); as metrics) {
                <div class="metrics-panel g--margin-top-4">
                  <div class="metric-row">
                    <span class="metric-key">Est. Weight:</span>
                    <span class="metric-val">~{{ metrics.estimatedGrams }} g</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-key">Print Time:</span>
                    <span class="metric-val">~{{ metrics.estimatedPrintTimeHours }} hrs</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-key">3D Triangles:</span>
                    <span class="metric-val">{{ metrics.totalTriangles | number }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-key">Stem / Cutouts:</span>
                    <span class="metric-val">
                      {{ itemType() === 'keycap' ? 'Cherry MX Cross' : (trayRows() * trayCols()) + ' MX Slots' }}
                    </span>
                  </div>
                </div>

                <!-- Slicer Tips -->
                <div class="slicer-notes-card g--margin-top-3">
                  <div class="slicer-notes-title">💡 3D Printing & Slicing Recommendations:</div>
                  <ul class="slicer-notes-list">
                    @for (tip of metrics.slicerTips; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>
              }

              <!-- Export Buttons -->
              <div class="export-actions g--margin-top-4">
                <div class="export-buttons-grid">
                  <button
                    type="button"
                    class="c-button c-button--primary c-button--block download-btn-3mf"
                    [disabled]="isGenerating()"
                    (click)="downloadFormat('3mf_multicolor')"
                  >
                    📥 Download Multi-Color 3MF
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--block download-btn-stl"
                    [disabled]="isGenerating()"
                    (click)="downloadFormat('stl_unified')"
                  >
                    📦 Download Unified STL
                  </button>
                </div>
              </div>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styleUrl: './keycap-switch-tester-maker.component.scss',
})
export class KeycapSwitchTesterMakerComponent implements OnInit, OnDestroy {
  @ViewChild('previewCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('canvasWrapper', { static: true })
  wrapperRef!: ElementRef<HTMLDivElement>;

  readonly presets = KEYCAP_PRESETS;
  readonly activePresetId = signal<string>('cherry_esc_artisan');

  // Reactive state signals
  readonly itemType = signal<KeycapItemType>(DEFAULT_KEYCAP_OPTIONS.itemType);
  readonly keycapProfile = signal<KeycapProfile>(DEFAULT_KEYCAP_OPTIONS.keycapProfile);
  readonly keyUnitSize = signal<KeyUnitSize>(DEFAULT_KEYCAP_OPTIONS.keyUnitSize);
  readonly legendText = signal<string>(DEFAULT_KEYCAP_OPTIONS.legendText);
  readonly legendStyle = signal<LegendStyle>(DEFAULT_KEYCAP_OPTIONS.legendStyle);
  readonly stemToleranceOffsetMm = signal<number>(DEFAULT_KEYCAP_OPTIONS.stemToleranceOffsetMm);
  readonly dishDepthMm = signal<number>(DEFAULT_KEYCAP_OPTIONS.dishDepthMm);
  readonly wallThicknessMm = signal<number>(DEFAULT_KEYCAP_OPTIONS.wallThicknessMm);
  readonly trayRows = signal<number>(DEFAULT_KEYCAP_OPTIONS.trayRows);
  readonly trayCols = signal<number>(DEFAULT_KEYCAP_OPTIONS.trayCols);
  readonly trayTiltAngleDeg = signal<number>(DEFAULT_KEYCAP_OPTIONS.trayTiltAngleDeg);
  readonly trayWallThicknessMm = signal<number>(DEFAULT_KEYCAP_OPTIONS.trayWallThicknessMm);
  readonly isGenerating = signal<boolean>(false);

  // Active metrics
  readonly currentMetrics = signal<KeycapMetrics | null>(null);

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

  setItemType(type: KeycapItemType): void {
    this.itemType.set(type);
    this.updatePreviewMesh();
  }

  setKeycapProfile(p: KeycapProfile): void {
    this.keycapProfile.set(p);
    this.updatePreviewMesh();
  }

  setKeyUnitSize(u: KeyUnitSize): void {
    this.keyUnitSize.set(u);
    this.updatePreviewMesh();
  }

  setLegendStyle(s: LegendStyle): void {
    this.legendStyle.set(s);
    this.updatePreviewMesh();
  }

  onLegendTextChange(newVal: string): void {
    this.legendText.set(newVal.toUpperCase());
    this.updatePreviewMesh();
  }

  applyPreset(preset: KeycapPreset): void {
    this.activePresetId.set(preset.id);
    const opt = preset.options;
    if (opt.itemType !== undefined) this.itemType.set(opt.itemType);
    if (opt.keycapProfile !== undefined) this.keycapProfile.set(opt.keycapProfile);
    if (opt.keyUnitSize !== undefined) this.keyUnitSize.set(opt.keyUnitSize);
    if (opt.legendText !== undefined) this.legendText.set(opt.legendText);
    if (opt.legendStyle !== undefined) this.legendStyle.set(opt.legendStyle);
    if (opt.trayRows !== undefined) this.trayRows.set(opt.trayRows);
    if (opt.trayCols !== undefined) this.trayCols.set(opt.trayCols);
    if (opt.trayTiltAngleDeg !== undefined) this.trayTiltAngleDeg.set(opt.trayTiltAngleDeg);

    this.updatePreviewMesh();
  }

  resetToDefaults(): void {
    this.applyPreset(this.presets[0]);
    this.stemToleranceOffsetMm.set(DEFAULT_KEYCAP_OPTIONS.stemToleranceOffsetMm);
    this.dishDepthMm.set(DEFAULT_KEYCAP_OPTIONS.dishDepthMm);
    this.wallThicknessMm.set(DEFAULT_KEYCAP_OPTIONS.wallThicknessMm);
    this.trayRows.set(DEFAULT_KEYCAP_OPTIONS.trayRows);
    this.trayCols.set(DEFAULT_KEYCAP_OPTIONS.trayCols);
    this.trayTiltAngleDeg.set(DEFAULT_KEYCAP_OPTIONS.trayTiltAngleDeg);
    this.updatePreviewMesh();
  }

  resetCameraView(): void {
    if (!this.camera || !this.objectGroup) return;
    this.objectGroup.rotation.set(-0.55, 0.45, 0.25);
    this.fitCameraToObject();
  }

  async downloadFormat(format: KeycapExportFormat): Promise<void> {
    this.isGenerating.set(true);
    try {
      const options = this.getCurrentOptions();
      let blob: Blob;
      let fileName: string;

      if (this.worker) {
        const id = ++this.workerRequestId;
        const result = await new Promise<{ blob: Blob; fileName: string }>((resolve, reject) => {
          const handler = (e: MessageEvent<KeycapWorkerResponse>) => {
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
                } else {
                  reject(new Error('Invalid worker response payload'));
                }
              }
            }
          };
          this.worker?.addEventListener('message', handler);
          const request: KeycapWorkerRequest = {
            id,
            options,
            format,
          };
          this.worker?.postMessage(request);
        });
        blob = result.blob;
        fileName = result.fileName;
      } else {
        const result = await processKeycap(options, format);
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

  private getCurrentOptions(): KeycapSwitchTesterMakerOptions {
    return {
      itemType: this.itemType(),
      keycapProfile: this.keycapProfile(),
      keyUnitSize: this.keyUnitSize(),
      legendText: this.legendText(),
      legendStyle: this.legendStyle(),
      stemToleranceOffsetMm: this.stemToleranceOffsetMm(),
      dishDepthMm: this.dishDepthMm(),
      wallThicknessMm: this.wallThicknessMm(),
      trayRows: this.trayRows(),
      trayCols: this.trayCols(),
      trayTiltAngleDeg: this.trayTiltAngleDeg(),
      trayWallThicknessMm: this.trayWallThicknessMm(),
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
      this.camera.position.set(0, -30, 80);

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(100, 150, 200);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
      fillLight.position.set(-100, -80, 120);
      this.scene.add(fillLight);

      this.objectGroup = new THREE.Group();
      this.objectGroup.rotation.set(-0.55, 0.45, 0.25);
      this.scene.add(this.objectGroup);

      this.setupCanvasInteractions(canvas);

      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          const h = entry.contentRect.height;
          if (w > 0 && h > 0 && this.renderer && this.camera) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
          }
        }
      });
      this.resizeObserver.observe(wrapper);

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate();
    } catch {
      // In headless / test environment, WebGL might not be supported.
    }
  }

  private setupCanvasInteractions(canvas: HTMLCanvasElement): void {
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
      'wheel',
      (e) => {
        if (!this.camera) return;
        e.preventDefault();
        this.camera.position.z += e.deltaY * 0.15;
        this.camera.position.z = Math.max(30, Math.min(500, this.camera.position.z));
      },
      { passive: false }
    );

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

  private updatePreviewMesh(): void {
    const options = this.getCurrentOptions();
    const validation = validateKeycapOptions(options);
    if (!validation.valid) return;

    if (options.itemType === 'switch_tester_tray') {
      const { trayGeometry, metrics } = generateSwitchTesterMesh(options);
      this.currentMetrics.set(metrics);

      if (!this.objectGroup) return;
      this.disposeThreeObjects();

      const trayMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.4,
        metalness: 0.2,
      });
      const trayMesh = new THREE.Mesh(trayGeometry, trayMat);
      this.objectGroup.add(trayMesh);
    } else {
      const { shellGeometry, stemGeometry, legendGeometry, metrics } =
        generateKeycapMesh(options);
      this.currentMetrics.set(metrics);

      if (!this.objectGroup) return;
      this.disposeThreeObjects();

      // Shell Material (Slate Gray)
      const shellMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.1,
      });
      const shellMesh = new THREE.Mesh(shellGeometry, shellMat);
      this.objectGroup.add(shellMesh);

      // Stem Material (Orange / accent)
      if (stemGeometry.getAttribute('position')) {
        const stemMat = new THREE.MeshStandardMaterial({
          color: 0xf97316,
          roughness: 0.4,
          metalness: 0.1,
        });
        const stemMesh = new THREE.Mesh(stemGeometry, stemMat);
        this.objectGroup.add(stemMesh);
      }

      // Legend Material (Cyan highlight)
      if (legendGeometry.getAttribute('position')) {
        const legendMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.2,
          metalness: 0.0,
        });
        const legendMesh = new THREE.Mesh(legendGeometry, legendMat);
        this.objectGroup.add(legendMesh);
      }
    }

    this.fitCameraToObject();
  }

  private fitCameraToObject(): void {
    if (!this.camera || !this.objectGroup) return;
    const box = new THREE.Box3().setFromObject(this.objectGroup);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    this.camera.position.set(0, -maxDim * 0.3, Math.max(35, maxDim * 2.2));
    this.camera.lookAt(0, 0, 0);
  }

  private disposeThreeObjects(): void {
    if (!this.objectGroup) return;

    while (this.objectGroup.children.length > 0) {
      const child = this.objectGroup.children[0] as THREE.Mesh;
      this.objectGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
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
