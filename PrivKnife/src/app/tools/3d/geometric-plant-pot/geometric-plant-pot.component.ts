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
  AestheticStyle,
  GeometricPlantPotOptions,
  GeometricPlantPotMetrics,
  GeometricPlantPotWorkerRequest,
  GeometricPlantPotWorkerResponse,
  PlanterType,
  PresetPlanter,
} from './types';
import {
  DEFAULT_PLANTER_OPTIONS,
  PLANTER_PRESETS,
} from './test-fixtures';
import {
  calculatePlanterMetrics,
  generatePlanterGeometries,
  processPlanter,
} from './engine';

@Component({
  selector: 'app-geometric-plant-pot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    TranslatePipe,
  ],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">{{ 'tools.geometricPlantPot.name' | translate }}</h1>
          <p class="c-header__subtitle">
            {{ 'tools.geometricPlantPot.description' | translate }}
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

      <!-- Main Columns -->
      <div class="l-columns l-columns--2">
        <!-- Controls Area -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header">
              <h2 class="c-card__title">1. Style & Planter Function</h2>
            </div>
            <div class="c-card__body">
              <!-- Aesthetic Style -->
              <div class="control-group">
                <label class="c-input__label">Aesthetic Geometric Style</label>
                <div class="btn-grid-2">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="aestheticStyle() === 'twisted_polygon'"
                    [class.c-button--outline]="aestheticStyle() !== 'twisted_polygon'"
                    (click)="setAestheticStyle('twisted_polygon')"
                  >
                    🌪️ Twisted Polygon
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="aestheticStyle() === 'low_poly_faceted'"
                    [class.c-button--outline]="aestheticStyle() !== 'low_poly_faceted'"
                    (click)="setAestheticStyle('low_poly_faceted')"
                  >
                    💎 Low-Poly Faceted
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="aestheticStyle() === 'vertical_flutes'"
                    [class.c-button--outline]="aestheticStyle() !== 'vertical_flutes'"
                    (click)="setAestheticStyle('vertical_flutes')"
                  >
                    🏛️ Vertical Flutes
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="aestheticStyle() === 'smooth_minimal'"
                    [class.c-button--outline]="aestheticStyle() !== 'smooth_minimal'"
                    (click)="setAestheticStyle('smooth_minimal')"
                  >
                    ⚪ Smooth Minimal
                  </button>
                </div>
              </div>

              <!-- Planter Function Type -->
              <div class="control-group g--margin-top-4">
                <label class="c-input__label">Drainage & Reservoir System</label>
                <div class="btn-toggle-column">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="planterType() === 'self_watering_insert'"
                    [class.c-button--outline]="planterType() !== 'self_watering_insert'"
                    (click)="setPlanterType('self_watering_insert')"
                  >
                    🌱 Self-Watering Sub-Irrigation Basket (with Wick Hole)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="planterType() === 'drainage_with_saucer'"
                    [class.c-button--outline]="planterType() !== 'drainage_with_saucer'"
                    (click)="setPlanterType('drainage_with_saucer')"
                  >
                    🪴 Bottom Drainage with Matching Drip Saucer
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="planterType() === 'decorative_cover'"
                    [class.c-button--outline]="planterType() !== 'decorative_cover'"
                    (click)="setPlanterType('decorative_cover')"
                  >
                    🪴 Decorative Cover Pot (Cachepot - No Holes)
                  </button>
                </div>
              </div>
            </div>
          </app-card>

          <!-- Parametric Geometry -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">2. Parametric Pot Geometry</h2>
            </div>
            <div class="c-card__body">
              <!-- Diameters -->
              <div class="control-row-2">
                <div class="control-group">
                  <label class="c-input__label">
                    Top Diameter: <strong>{{ topDiameterMm() }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="50"
                    max="200"
                    step="5"
                    [value]="topDiameterMm()"
                    (input)="onTopDiameterChange($event)"
                  />
                </div>
                <div class="control-group">
                  <label class="c-input__label">
                    Base Diameter: <strong>{{ bottomDiameterMm() }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="40"
                    max="180"
                    step="5"
                    [value]="bottomDiameterMm()"
                    (input)="onBottomDiameterChange($event)"
                  />
                </div>
              </div>

              <!-- Height & Sides -->
              <div class="control-row-2 g--margin-top-4">
                <div class="control-group">
                  <label class="c-input__label">
                    Total Height: <strong>{{ heightMm() }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="50"
                    max="200"
                    step="5"
                    [value]="heightMm()"
                    (input)="onHeightChange($event)"
                  />
                </div>
                <div class="control-group">
                  <label class="c-input__label">
                    Polygon Sides: <strong>{{ polygonSides() }}</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="3"
                    max="16"
                    step="1"
                    [value]="polygonSides()"
                    (input)="onSidesChange($event)"
                  />
                </div>
              </div>

              <!-- Twist Angle -->
              @if (aestheticStyle() === 'twisted_polygon') {
                <div class="control-group g--margin-top-4">
                  <label class="c-input__label">
                    Spiral Twist Angle: <strong>{{ twistAngleDeg() }}°</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="-120"
                    max="120"
                    step="5"
                    [value]="twistAngleDeg()"
                    (input)="onTwistChange($event)"
                  />
                </div>
              }

              <!-- Wall Thickness -->
              <div class="control-group g--margin-top-4">
                <label class="c-input__label">
                  Shell Wall Thickness: <strong>{{ wallThicknessMm() }} mm</strong>
                  <span class="control-hint">(≥2.4mm recommended for leakproofing)</span>
                </label>
                <input
                  type="range"
                  class="c-input c-input__slider"
                  min="1.6"
                  max="4.0"
                  step="0.2"
                  [value]="wallThicknessMm()"
                  (input)="onWallChange($event)"
                />
              </div>

              <!-- Self-Watering Specific Controls -->
              @if (planterType() === 'self_watering_insert') {
                <div class="control-row-2 g--margin-top-4">
                  <div class="control-group">
                    <label class="c-input__label">
                      Wick Cord Hole: <strong>{{ wickHoleDiameterMm() }} mm</strong>
                    </label>
                    <input
                      type="range"
                      class="c-input c-input__slider"
                      min="5"
                      max="14"
                      step="1"
                      [value]="wickHoleDiameterMm()"
                      (input)="onWickDiameterChange($event)"
                    />
                  </div>
                  <div class="control-group">
                    <label class="c-input__checkbox-label g--margin-top-4">
                      <input
                        type="checkbox"
                        [checked]="waterSpoutOpening()"
                        (change)="toggleWaterSpout()"
                      />
                      <span>Watering Can Pour Spout</span>
                    </label>
                  </div>
                </div>
              }
            </div>
          </app-card>

          <!-- Reset Button -->
          <div class="g--margin-top-4 l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="resetToDefaults()"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>

        <!-- 3D Preview & Export Column -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header l-extremo">
              <div class="l-extremo__area-izquierda">
                <h2 class="c-card__title">3D Viewport</h2>
              </div>
              <div class="l-extremo__area-derecha">
                @if (planterType() !== 'decorative_cover') {
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="explodedView()"
                    [class.c-button--outline]="!explodedView()"
                    (click)="toggleExplodedView()"
                  >
                    {{ explodedView() ? 'Assemble View' : 'Exploded View' }}
                  </button>
                }
              </div>
            </div>

            <div class="c-card__body">
              <!-- Viewport Container -->
              <div
                #viewportContainer
                class="planter-viewport"
                (mousedown)="onMouseDown($event)"
                (mousemove)="onMouseMove($event)"
                (mouseup)="onMouseUp()"
                (mouseleave)="onMouseUp()"
                (wheel)="onWheel($event)"
                (touchstart)="onTouchStart($event)"
                (touchmove)="onTouchMove($event)"
                (touchend)="onTouchEnd()"
                (touchcancel)="onTouchEnd()"
              >
                <div class="viewport-hints">
                  Left-drag to rotate • Scroll to zoom • Procedural 3D preview
                </div>
              </div>

              <!-- Estimated Metrics Grid -->
              <div class="metrics-grid g--margin-top-4">
                <div class="metric-card">
                  <span class="metric-label">Dimensions (Ø × H)</span>
                  <span class="metric-value">
                    Ø{{ metrics().outerDiameterMm }} × {{ metrics().totalHeightMm }} mm
                  </span>
                </div>
                @if (planterType() === 'self_watering_insert') {
                  <div class="metric-card">
                    <span class="metric-label">Water Reservoir</span>
                    <span class="metric-value">~{{ metrics().reservoirCapacityMl }} ml</span>
                  </div>
                }
                <div class="metric-card">
                  <span class="metric-label">Filament Weight</span>
                  <span class="metric-value">{{ metrics().estimatedGrams }} g (PETG/PLA)</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Est. Print Time</span>
                  <span class="metric-value">~{{ metrics().estimatedPrintTimeHours }} hrs</span>
                </div>
              </div>

              <!-- Slicer Optimization Tips -->
              <div class="slicer-tips-card g--margin-top-4">
                <h4 class="tips-title">💡 Watertight Slicing Recommendations</h4>
                <ul class="tips-list">
                  @for (tip of metrics().slicerTips; track tip) {
                    <li>{{ tip }}</li>
                  }
                </ul>
              </div>

              <!-- Export Bar -->
              <div class="export-box g--margin-top-4">
                <div class="export-format-selector">
                  <label class="c-input__label">Export Format:</label>
                  <div class="format-radios">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="exportFormat() === 'stl'"
                      [class.c-button--outline]="exportFormat() !== 'stl'"
                      (click)="setExportFormat('stl')"
                    >
                      Binary .STL (Print-Bed Assembly)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="exportFormat() === '3mf'"
                      [class.c-button--outline]="exportFormat() !== '3mf'"
                      (click)="setExportFormat('3mf')"
                    >
                      Multi-Part .3MF Package
                    </button>
                  </div>
                </div>

                <div class="download-action-row g--margin-top-4">
                  <button
                    type="button"
                    class="c-button c-button--primary c-button--large download-btn"
                    [disabled]="isGenerating()"
                    (click)="downloadFormat(exportFormat())"
                  >
                    @if (isGenerating()) {
                      <span>Generating Planter Mesh...</span>
                    } @else {
                      <span>Download {{ exportFormat().toUpperCase() }} Model</span>
                    }
                  </button>
                </div>
              </div>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styleUrl: './geometric-plant-pot.component.scss',
})
export class GeometricPlantPotComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer', { static: false })
  viewportContainer!: ElementRef<HTMLDivElement>;

  // --- SIGNALS FOR PARAMETRIC STATE ---
  readonly aestheticStyle = signal<AestheticStyle>(DEFAULT_PLANTER_OPTIONS.aestheticStyle);
  readonly polygonSides = signal<number>(DEFAULT_PLANTER_OPTIONS.polygonSides);
  readonly twistAngleDeg = signal<number>(DEFAULT_PLANTER_OPTIONS.twistAngleDeg);
  readonly topDiameterMm = signal<number>(DEFAULT_PLANTER_OPTIONS.topDiameterMm);
  readonly bottomDiameterMm = signal<number>(DEFAULT_PLANTER_OPTIONS.bottomDiameterMm);
  readonly heightMm = signal<number>(DEFAULT_PLANTER_OPTIONS.heightMm);
  readonly wallThicknessMm = signal<number>(DEFAULT_PLANTER_OPTIONS.wallThicknessMm);
  readonly planterType = signal<PlanterType>(DEFAULT_PLANTER_OPTIONS.planterType);
  readonly wickHoleDiameterMm = signal<number>(DEFAULT_PLANTER_OPTIONS.wickHoleDiameterMm);
  readonly waterSpoutOpening = signal<boolean>(DEFAULT_PLANTER_OPTIONS.waterSpoutOpening);
  readonly explodedView = signal<boolean>(false);
  readonly exportFormat = signal<'stl' | '3mf'>('stl');
  readonly isGenerating = signal<boolean>(false);
  readonly activePresetId = signal<string>('twisted_hex_self_watering');

  readonly presets = PLANTER_PRESETS;

  readonly metrics = signal<GeometricPlantPotMetrics>({
    outerDiameterMm: 90,
    totalHeightMm: 85,
    reservoirCapacityMl: 110,
    potTriangleCount: 640,
    insertTriangleCount: 320,
    saucerTriangleCount: 0,
    totalTriangles: 960,
    estimatedGrams: 52.5,
    estimatedPrintTimeHours: 3.2,
    slicerTips: [
      'Watertight Printing: Use at least 3-4 perimeter walls and increase flow rate to 102% to eliminate microscopic pinhole leaks.',
      'Bottom Solid Layers: Set 5 to 6 solid bottom layers for a fully water-sealed base.',
    ],
  });

  // Track created object URLs
  private activeDownloadUrls: string[] = [];

  // Web Worker offloading
  private worker: Worker | null = null;
  private workerRequestId = 0;

  // Three.js Scene References
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private planterMeshGroup: THREE.Group | null = null;
  private animationFrameId: number | null = null;

  // Viewport navigation
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;
  private meshRotationY = -0.6;
  private meshRotationX = 0.35;
  private cameraDistance = 200;

  ngOnInit(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      } catch {
        // Fallback to inline processing if workers restricted
      }
    }
    this.recalculateMetrics();
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.rebuildMesh();
  }

  ngOnDestroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.planterMeshGroup) {
      this.planterMeshGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    for (const url of this.activeDownloadUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeDownloadUrls = [];
  }

  // --- ACTIONS & PRESETS ---

  applyPreset(preset: PresetPlanter): void {
    this.activePresetId.set(preset.id);

    if (preset.options.aestheticStyle) this.aestheticStyle.set(preset.options.aestheticStyle);
    if (preset.options.polygonSides !== undefined) this.polygonSides.set(preset.options.polygonSides);
    if (preset.options.twistAngleDeg !== undefined) this.twistAngleDeg.set(preset.options.twistAngleDeg);
    if (preset.options.topDiameterMm !== undefined) this.topDiameterMm.set(preset.options.topDiameterMm);
    if (preset.options.bottomDiameterMm !== undefined) this.bottomDiameterMm.set(preset.options.bottomDiameterMm);
    if (preset.options.heightMm !== undefined) this.heightMm.set(preset.options.heightMm);
    if (preset.options.wallThicknessMm !== undefined) this.wallThicknessMm.set(preset.options.wallThicknessMm);
    if (preset.options.planterType) this.planterType.set(preset.options.planterType);
    if (preset.options.waterSpoutOpening !== undefined) this.waterSpoutOpening.set(preset.options.waterSpoutOpening);

    this.rebuildMesh();
  }

  resetToDefaults(): void {
    this.activePresetId.set('twisted_hex_self_watering');
    this.aestheticStyle.set(DEFAULT_PLANTER_OPTIONS.aestheticStyle);
    this.polygonSides.set(DEFAULT_PLANTER_OPTIONS.polygonSides);
    this.twistAngleDeg.set(DEFAULT_PLANTER_OPTIONS.twistAngleDeg);
    this.topDiameterMm.set(DEFAULT_PLANTER_OPTIONS.topDiameterMm);
    this.bottomDiameterMm.set(DEFAULT_PLANTER_OPTIONS.bottomDiameterMm);
    this.heightMm.set(DEFAULT_PLANTER_OPTIONS.heightMm);
    this.wallThicknessMm.set(DEFAULT_PLANTER_OPTIONS.wallThicknessMm);
    this.planterType.set(DEFAULT_PLANTER_OPTIONS.planterType);
    this.wickHoleDiameterMm.set(DEFAULT_PLANTER_OPTIONS.wickHoleDiameterMm);
    this.waterSpoutOpening.set(DEFAULT_PLANTER_OPTIONS.waterSpoutOpening);
    this.explodedView.set(false);

    this.rebuildMesh();
  }

  setAestheticStyle(style: AestheticStyle): void {
    this.aestheticStyle.set(style);
    this.rebuildMesh();
  }

  setPlanterType(type: PlanterType): void {
    this.planterType.set(type);
    this.rebuildMesh();
  }

  setExportFormat(fmt: 'stl' | '3mf'): void {
    this.exportFormat.set(fmt);
  }

  toggleExplodedView(): void {
    this.explodedView.update((v) => !v);
    this.rebuildMesh();
  }

  toggleWaterSpout(): void {
    this.waterSpoutOpening.update((v) => !v);
    this.rebuildMesh();
  }

  onTopDiameterChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.topDiameterMm.set(val);
    this.rebuildMesh();
  }

  onBottomDiameterChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.bottomDiameterMm.set(val);
    this.rebuildMesh();
  }

  onHeightChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.heightMm.set(val);
    this.rebuildMesh();
  }

  onSidesChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.polygonSides.set(val);
    this.rebuildMesh();
  }

  onTwistChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.twistAngleDeg.set(val);
    this.rebuildMesh();
  }

  onWallChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.wallThicknessMm.set(val);
    this.rebuildMesh();
  }

  onWickDiameterChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.wickHoleDiameterMm.set(val);
    this.rebuildMesh();
  }

  // --- DOWNLOAD ACTIONS ---

  async downloadFormat(format: 'stl' | '3mf'): Promise<void> {
    this.isGenerating.set(true);

    const options = this.getOptions();

    try {
      if (this.worker) {
        const reqId = ++this.workerRequestId;
        await new Promise<void>((resolve, reject) => {
          const handler = (event: MessageEvent<GeometricPlantPotWorkerResponse>) => {
            if (event.data.id !== reqId) return;

            if (event.data.type === 'error') {
              this.worker?.removeEventListener('message', handler);
              reject(new Error(event.data.error || 'Export failed'));
            } else if (event.data.type === 'result' && event.data.buffer) {
              this.worker?.removeEventListener('message', handler);
              const blob = new Blob([event.data.buffer], {
                type: event.data.mimeType || 'application/octet-stream',
              });
              this.triggerFileDownload(blob, event.data.fileName || `planter.${format}`);
              resolve();
            }
          };
          this.worker!.addEventListener('message', handler);
          this.worker!.postMessage({ id: reqId, options, format } as GeometricPlantPotWorkerRequest);
        });
      } else {
        const result = await processPlanter(options, format);
        if (result.success && result.blob) {
          this.triggerFileDownload(result.blob, result.fileName);
        }
      }
    } catch {
      const result = await processPlanter(options, format);
      if (result.success && result.blob) {
        this.triggerFileDownload(result.blob, result.fileName);
      }
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
      if (idx !== -1) this.activeDownloadUrls.splice(idx, 1);
    }, 100);
  }

  // --- THREE.JS VIEWPORT & RENDERING ---

  private initThree(): void {
    if (!this.viewportContainer) return;

    try {
      const container = this.viewportContainer.nativeElement;
      const width = container.clientWidth || 400;
      const height = container.clientHeight || 380;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x090d16);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
      this.updateCameraPosition();

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(this.renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
      keyLight.position.set(120, 160, 140);
      this.scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x10b981, 0.45);
      rimLight.position.set(-100, -80, -100);
      this.scene.add(rimLight);

      this.planterMeshGroup = new THREE.Group();
      this.scene.add(this.planterMeshGroup);

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.planterMeshGroup) {
          this.planterMeshGroup.rotation.y = this.meshRotationY;
          this.planterMeshGroup.rotation.x = this.meshRotationX;
        }
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate();
    } catch {
      // Guard against headless test environments
    }
  }

  private updateCameraPosition(): void {
    if (!this.camera) return;
    this.camera.position.set(
      this.cameraDistance * 0.7,
      this.cameraDistance * 0.55,
      this.cameraDistance * 0.7
    );
    this.camera.lookAt(0, this.heightMm() / 2, 0);
  }

  private getOptions(exploded = false): GeometricPlantPotOptions {
    return {
      aestheticStyle: this.aestheticStyle(),
      polygonSides: this.polygonSides(),
      twistAngleDeg: this.twistAngleDeg(),
      topDiameterMm: this.topDiameterMm(),
      bottomDiameterMm: this.bottomDiameterMm(),
      heightMm: this.heightMm(),
      wallThicknessMm: this.wallThicknessMm(),
      planterType: this.planterType(),
      wickHoleDiameterMm: this.wickHoleDiameterMm(),
      waterSpoutOpening: this.waterSpoutOpening(),
      explodedView: exploded,
    };
  }

  private recalculateMetrics(): void {
    const options = this.getOptions();
    const { potGeometry, insertGeometry, saucerGeometry, combinedGeometry } = generatePlanterGeometries(options);
    const m = calculatePlanterMetrics(potGeometry, insertGeometry, saucerGeometry, options);
    this.metrics.set(m);

    potGeometry.dispose();
    insertGeometry.dispose();
    saucerGeometry.dispose();
    combinedGeometry.dispose();
  }

  private rebuildMesh(): void {
    const options = this.getOptions(this.explodedView());
    const { potGeometry, insertGeometry, saucerGeometry, combinedGeometry } = generatePlanterGeometries(
      options,
      options.explodedView
    );

    const m = calculatePlanterMetrics(potGeometry, insertGeometry, saucerGeometry, options);
    this.metrics.set(m);

    combinedGeometry.dispose();

    if (!this.scene || !this.planterMeshGroup) {
      potGeometry.dispose();
      insertGeometry.dispose();
      saucerGeometry.dispose();
      return;
    }

    while (this.planterMeshGroup.children.length > 0) {
      const child = this.planterMeshGroup.children[0];
      this.planterMeshGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    // Pot Material: Terracotta / Matte Ceramic Green
    const potMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.55,
      metalness: 0.1,
    });
    const potMesh = new THREE.Mesh(potGeometry, potMat);
    this.planterMeshGroup.add(potMesh);

    // Insert Basket Material: Charcoal Black recycled polymer
    if (
      this.planterType() === 'self_watering_insert' &&
      insertGeometry.attributes['position']?.count > 0
    ) {
      const insertMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.7,
        metalness: 0.05,
      });
      const insertMesh = new THREE.Mesh(insertGeometry, insertMat);
      this.planterMeshGroup.add(insertMesh);
    } else {
      insertGeometry.dispose();
    }

    // Saucer Material: Matching Terracotta
    if (
      this.planterType() === 'drainage_with_saucer' &&
      saucerGeometry.attributes['position']?.count > 0
    ) {
      const saucerMat = new THREE.MeshStandardMaterial({
        color: 0x059669,
        roughness: 0.55,
        metalness: 0.1,
      });
      const saucerMesh = new THREE.Mesh(saucerGeometry, saucerMat);
      this.planterMeshGroup.add(saucerMesh);
    } else {
      saucerGeometry.dispose();
    }
  }

  // --- MOUSE & VIEWPORT NAVIGATION ---

  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const deltaX = event.clientX - this.previousMouseX;
    const deltaY = event.clientY - this.previousMouseY;

    this.meshRotationY += deltaX * 0.01;
    this.meshRotationX += deltaY * 0.01;
    this.meshRotationX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.meshRotationX));

    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.previousMouseX = event.touches[0].clientX;
      this.previousMouseY = event.touches[0].clientY;
      event.preventDefault();
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;
    const deltaX = event.touches[0].clientX - this.previousMouseX;
    const deltaY = event.touches[0].clientY - this.previousMouseY;

    this.meshRotationY += deltaX * 0.01;
    this.meshRotationX += deltaY * 0.01;
    this.meshRotationX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.meshRotationX));

    this.previousMouseX = event.touches[0].clientX;
    this.previousMouseY = event.touches[0].clientY;
    event.preventDefault();
  }

  onTouchEnd(): void {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.cameraDistance = Math.max(100, Math.min(450, this.cameraDistance + event.deltaY * 0.15));
    this.updateCameraPosition();
  }
}
