import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import {
  Badge,
  Card,
} from '../../../components';
import {
  GridfinityLipStyle,
  GridfinityBinGeneratorOptions,
  GridfinityBinMetrics,
  PresetGridfinityBin,
} from './types';
import {
  calculateGridfinityMetrics,
  generateGridfinityGeometry,
  processGridfinity,
} from './engine';
import {
  DEFAULT_GRIDFINITY_OPTIONS,
  GRIDFINITY_PRESETS,
} from './test-fixtures';

@Component({
  selector: 'app-gridfinity-bin-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    Badge,
    Card,
  ],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Gridfinity & Modular Drawer Bin Generator</h1>
          <p class="c-header__subtitle">
            Parametric 3D printable bins conforming strictly to Zack Freedman's open-source Gridfinity storage standard. Custom unit sizes, internal dividers, scoops, and label tabs.
          </p>
        </div>
        <app-badge variant="privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </app-badge>
      </div>

      <!-- Main Layout: 2 Columns -->
      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__area">
          <!-- Preset Templates -->
          <app-card>
            <div class="c-card__header">
              <h2 class="c-card__title">1. Curated Presets</h2>
            </div>
            <div class="c-card__body">
              <div class="gridfinity-presets">
                @for (preset of presets; track preset.id) {
                  <button
                    type="button"
                    class="c-button c-button--outline gridfinity-preset-btn"
                    [class.c-button--primary]="gridX() === preset.options.gridX && gridY() === preset.options.gridY && heightUnits() === preset.options.heightUnits"
                    (click)="applyPreset(preset)"
                  >
                    <strong>{{ preset.name }}</strong>
                    <span class="gridfinity-preset-desc">{{ preset.description }}</span>
                  </button>
                }
              </div>
            </div>
          </app-card>

          <!-- Grid Dimensions & Height -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">2. Grid Units & Bin Height</h2>
            </div>
            <div class="c-card__body">
              <!-- Grid X & Y Selectors -->
              <div class="param-grid">
                <div class="control-group">
                  <label class="c-input__label">
                    Grid Width (X): <strong>{{ gridX() }} units</strong> ({{ gridX() * 42 - 0.5 }} mm)
                  </label>
                  <div class="unit-btn-row">
                    @for (val of [1, 2, 3, 4, 5, 6]; track val) {
                      <button
                        type="button"
                        class="c-button c-button--small"
                        [class.c-button--primary]="gridX() === val"
                        [class.c-button--outline]="gridX() !== val"
                        (click)="setGridX(val)"
                      >
                        {{ val }}
                      </button>
                    }
                  </div>
                </div>

                <div class="control-group">
                  <label class="c-input__label">
                    Grid Depth (Y): <strong>{{ gridY() }} units</strong> ({{ gridY() * 42 - 0.5 }} mm)
                  </label>
                  <div class="unit-btn-row">
                    @for (val of [1, 2, 3, 4, 5, 6]; track val) {
                      <button
                        type="button"
                        class="c-button c-button--small"
                        [class.c-button--primary]="gridY() === val"
                        [class.c-button--outline]="gridY() !== val"
                        (click)="setGridY(val)"
                      >
                        {{ val }}
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Height in 7mm Units -->
              <div class="control-row g--margin-top-4">
                <label class="c-input__label">
                  Bin Height: <strong>{{ heightUnits() }}U</strong> ({{ heightUnits() * 7 }} mm / {{ (heightUnits() * 7 / 25.4) | number:'1.1-1' }} in)
                </label>
                <input
                  type="range"
                  class="c-input c-input--slider"
                  min="2"
                  max="14"
                  step="1"
                  [value]="heightUnits()"
                  (input)="onHeightChange($event)"
                />
              </div>

              <!-- Stacking Lip Style -->
              <div class="control-group g--margin-top-4">
                <label class="c-input__label">Top Stacking Lip Style</label>
                <div class="lip-button-row">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="lipStyle() === 'standard'"
                    [class.c-button--outline]="lipStyle() !== 'standard'"
                    (click)="setLipStyle('standard')"
                  >
                    Standard Gridfinity (Stackable)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="lipStyle() === 'flat'"
                    [class.c-button--outline]="lipStyle() !== 'flat'"
                    (click)="setLipStyle('flat')"
                  >
                    Flat Rim (Drawer Flush)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="lipStyle() === 'none'"
                    [class.c-button--outline]="lipStyle() !== 'none'"
                    (click)="setLipStyle('none')"
                  >
                    None (Raw Edge)
                  </button>
                </div>
              </div>
            </div>
          </app-card>

          <!-- Dividers & Ergonomics -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">3. Dividers, Scoops & Tabs</h2>
            </div>
            <div class="c-card__body">
              <!-- Internal Subdivisions -->
              <div class="param-grid">
                <div class="control-group">
                  <label class="c-input__label">X Compartments: <strong>{{ subdivisionsX() }}</strong></label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="1"
                    max="6"
                    step="1"
                    [value]="subdivisionsX()"
                    (input)="onSubdivisionsXChange($event)"
                  />
                </div>

                <div class="control-group">
                  <label class="c-input__label">Y Compartments: <strong>{{ subdivisionsY() }}</strong></label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="1"
                    max="6"
                    step="1"
                    [value]="subdivisionsY()"
                    (input)="onSubdivisionsYChange($event)"
                  />
                </div>
              </div>

              <!-- Finger Scoop Toggle -->
              <div class="control-row g--margin-top-4">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="fingerScoop()"
                    (change)="toggleFingerScoop()"
                  />
                  <span>Curved Finger Scoop (Smooth bottom fillet for sliding small parts out)</span>
                </label>
              </div>

              <!-- Label Tab Toggle -->
              <div class="control-row g--margin-top-3">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="labelTab()"
                    (change)="toggleLabelTab()"
                  />
                  <span>Angled 45° Label Tab (Compatible with 9mm / 12mm label makers)</span>
                </label>
              </div>

              <!-- Magnet / Screw Base Features -->
              <div class="control-row g--margin-top-3">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="baseMagnetHoles()"
                    (change)="toggleMagnetHoles()"
                  />
                  <span>Base Magnet Pockets (6×2mm neodymium press-fit pockets)</span>
                </label>
              </div>
            </div>

            <div class="c-card__footer l-extremo">
              <div class="l-extremo__area-izquierda">
                <button
                  type="button"
                  class="c-button c-button--outline"
                  (click)="resetToDefaults()"
                >
                  Reset Defaults
                </button>
              </div>
            </div>
          </app-card>
        </div>

        <!-- 3D Viewport & Deliverables Column -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header l-extremo">
              <div class="l-extremo__area-izquierda">
                <h2 class="c-card__title">Interactive 3D Preview</h2>
              </div>
              <div class="l-extremo__area-derecha">
                <span class="badge-dim">Grid: {{ gridX() }}×{{ gridY() }} ({{ heightUnits() }}U)</span>
              </div>
            </div>

            <div class="c-card__body">
              <!-- 3D Canvas Viewport -->
              <div
                #viewportContainer
                class="c-preview gridfinity-viewport"
                (mousedown)="onMouseDown($event)"
                (mousemove)="onMouseMove($event)"
                (mouseup)="onMouseUp()"
                (mouseleave)="onMouseUp()"
              >
                <div class="viewport-hints">
                  <span>🖱️ Click & Drag to Rotate • Scroll to Zoom</span>
                </div>
              </div>

              <!-- Telemetry Metrics -->
              @if (currentMetrics(); as metrics) {
                <div class="metrics-grid g--margin-top-4">
                  <div class="metric-card">
                    <span class="metric-label">Dimensions</span>
                    <strong class="metric-value">{{ metrics.totalWidthMm }} × {{ metrics.totalLengthMm }} × {{ metrics.totalHeightMm }} mm</strong>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Compartments</span>
                    <strong class="metric-value">{{ metrics.internalCompartments }} {{ metrics.internalCompartments === 1 ? 'pocket' : 'pockets' }}</strong>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Est. Weight</span>
                    <strong class="metric-value">{{ metrics.estimatedGrams }} g (PLA)</strong>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Est. Print Time</span>
                    <strong class="metric-value">~{{ metrics.estimatedPrintTimeHours }} hrs</strong>
                  </div>
                </div>

                <!-- Slicer Tips -->
                <div class="slicer-box g--margin-top-3">
                  <h4 class="slicer-title">🛠️ Optimal Gridfinity Slicer Settings</h4>
                  <ul class="slicer-list">
                    @for (tip of metrics.slicerTips; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>
              }
            </div>

            <!-- Export Buttons -->
            <div class="c-card__footer l-extremo">
              <div class="l-extremo__area-izquierda">
                <span class="g--text-muted">Export formats:</span>
              </div>
              <div class="l-extremo__area-derecha export-actions">
                <button
                  type="button"
                  class="c-button c-button--outline"
                  (click)="downloadFormat('3mf')"
                >
                  Download .3MF (Bambu / Prusa)
                </button>
                <button
                  type="button"
                  class="c-button c-button--primary"
                  (click)="downloadFormat('stl')"
                >
                  Download .STL (Binary Mesh)
                </button>
              </div>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .gridfinity-presets {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 12px;
      }

      .gridfinity-preset-btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
        padding: 12px;
        height: auto;
      }

      .gridfinity-preset-desc {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-top: 4px;
        font-weight: normal;
      }

      .param-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .unit-btn-row {
        display: flex;
        gap: 6px;
        margin-top: 6px;
      }

      .lip-button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 6px;
      }

      .c-input--slider {
        width: 100%;
        margin-top: 4px;
      }

      .c-input__checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.9rem;
      }

      .badge-dim {
        font-size: 0.85rem;
        background: rgba(255, 255, 255, 0.08);
        padding: 4px 10px;
        border-radius: 4px;
        color: #94a3b8;
      }

      .gridfinity-viewport {
        position: relative;
        width: 100%;
        height: 380px;
        background: #0f172a;
        border-radius: 8px;
        overflow: hidden;
        cursor: grab;
      }

      .gridfinity-viewport:active {
        cursor: grabbing;
      }

      .viewport-hints {
        position: absolute;
        bottom: 8px;
        left: 8px;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        pointer-events: none;
        user-select: none;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .metric-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
      }

      .metric-label {
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .metric-value {
        font-size: 0.95rem;
        color: #f3f4f6;
        margin-top: 2px;
      }

      .slicer-box {
        background: rgba(59, 130, 246, 0.08);
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 6px;
        padding: 10px 14px;
      }

      .slicer-title {
        font-size: 0.85rem;
        margin: 0 0 6px 0;
        color: #93c5fd;
      }

      .slicer-list {
        margin: 0;
        padding-left: 18px;
        font-size: 0.8rem;
        color: #cbd5e1;
        line-height: 1.4;
      }

      .export-actions {
        display: flex;
        gap: 8px;
      }

      @media (max-width: 768px) {
        .param-grid {
          grid-template-columns: 1fr;
        }

        .metrics-grid {
          grid-template-columns: 1fr;
        }

        .export-actions {
          flex-direction: column;
          width: 100%;
        }
      }
    `,
  ],
})
export class GridfinityBinGeneratorComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer') viewportContainer!: ElementRef<HTMLDivElement>;

  // Domain signals
  readonly gridX = signal<number>(1);
  readonly gridY = signal<number>(1);
  readonly heightUnits = signal<number>(3);
  readonly subdivisionsX = signal<number>(1);
  readonly subdivisionsY = signal<number>(1);
  readonly lipStyle = signal<GridfinityLipStyle>('standard');
  readonly fingerScoop = signal<boolean>(true);
  readonly fingerScoopRadiusMm = signal<number>(10);
  readonly labelTab = signal<boolean>(true);
  readonly labelTabWidthMm = signal<number>(24);
  readonly labelAngleDeg = signal<number>(45);
  readonly baseMagnetHoles = signal<boolean>(true);
  readonly baseScrewHoles = signal<boolean>(false);
  readonly wallThicknessMm = signal<number>(1.2);

  // Telemetry metrics
  readonly currentMetrics = signal<GridfinityBinMetrics | null>(null);

  // Available Presets
  readonly presets = GRIDFINITY_PRESETS;

  // Tracked object URLs for disposal
  private activeDownloadUrls: string[] = [];

  // Three.js internal engine refs
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private currentMesh: THREE.Mesh | null = null;
  private animationFrameId: number | null = null;

  // Mouse rotation orbit state
  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private meshRotationX = 0.5; // Slight isometric tilt
  private meshRotationY = -0.5;

  ngOnInit(): void {
    // Initial state set
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.rebuildMesh();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.currentMesh) {
      this.currentMesh.geometry.dispose();
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else {
        this.currentMesh.material.dispose();
      }
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    for (const url of this.activeDownloadUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeDownloadUrls = [];
  }

  // --- PRESETS & CONFIGURATION ---

  applyPreset(preset: PresetGridfinityBin): void {
    if (preset.options.gridX !== undefined) this.gridX.set(preset.options.gridX);
    if (preset.options.gridY !== undefined) this.gridY.set(preset.options.gridY);
    if (preset.options.heightUnits !== undefined) this.heightUnits.set(preset.options.heightUnits);
    if (preset.options.subdivisionsX !== undefined)
      this.subdivisionsX.set(preset.options.subdivisionsX);
    if (preset.options.subdivisionsY !== undefined)
      this.subdivisionsY.set(preset.options.subdivisionsY);
    if (preset.options.lipStyle !== undefined) this.lipStyle.set(preset.options.lipStyle);
    if (preset.options.fingerScoop !== undefined) this.fingerScoop.set(preset.options.fingerScoop);
    if (preset.options.labelTab !== undefined) this.labelTab.set(preset.options.labelTab);
    if (preset.options.baseMagnetHoles !== undefined)
      this.baseMagnetHoles.set(preset.options.baseMagnetHoles);

    this.rebuildMesh();
  }

  resetToDefaults(): void {
    this.gridX.set(DEFAULT_GRIDFINITY_OPTIONS.gridX);
    this.gridY.set(DEFAULT_GRIDFINITY_OPTIONS.gridY);
    this.heightUnits.set(DEFAULT_GRIDFINITY_OPTIONS.heightUnits);
    this.subdivisionsX.set(DEFAULT_GRIDFINITY_OPTIONS.subdivisionsX);
    this.subdivisionsY.set(DEFAULT_GRIDFINITY_OPTIONS.subdivisionsY);
    this.lipStyle.set(DEFAULT_GRIDFINITY_OPTIONS.lipStyle);
    this.fingerScoop.set(DEFAULT_GRIDFINITY_OPTIONS.fingerScoop);
    this.fingerScoopRadiusMm.set(DEFAULT_GRIDFINITY_OPTIONS.fingerScoopRadiusMm);
    this.labelTab.set(DEFAULT_GRIDFINITY_OPTIONS.labelTab);
    this.labelTabWidthMm.set(DEFAULT_GRIDFINITY_OPTIONS.labelTabWidthMm);
    this.labelAngleDeg.set(DEFAULT_GRIDFINITY_OPTIONS.labelAngleDeg);
    this.baseMagnetHoles.set(DEFAULT_GRIDFINITY_OPTIONS.baseMagnetHoles);
    this.baseScrewHoles.set(DEFAULT_GRIDFINITY_OPTIONS.baseScrewHoles);
    this.wallThicknessMm.set(DEFAULT_GRIDFINITY_OPTIONS.wallThicknessMm || 1.2);

    this.rebuildMesh();
  }

  setGridX(val: number): void {
    this.gridX.set(val);
    this.rebuildMesh();
  }

  setGridY(val: number): void {
    this.gridY.set(val);
    this.rebuildMesh();
  }

  setLipStyle(style: GridfinityLipStyle): void {
    this.lipStyle.set(style);
    this.rebuildMesh();
  }

  toggleFingerScoop(): void {
    this.fingerScoop.update((v) => !v);
    this.rebuildMesh();
  }

  toggleLabelTab(): void {
    this.labelTab.update((v) => !v);
    this.rebuildMesh();
  }

  toggleMagnetHoles(): void {
    this.baseMagnetHoles.update((v) => !v);
    this.rebuildMesh();
  }

  toggleScrewHoles(): void {
    this.baseScrewHoles.update((v) => !v);
    this.rebuildMesh();
  }

  onHeightChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.heightUnits.set(val);
    this.rebuildMesh();
  }

  onSubdivisionsXChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.subdivisionsX.set(val);
    this.rebuildMesh();
  }

  onSubdivisionsYChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.subdivisionsY.set(val);
    this.rebuildMesh();
  }

  // --- DOWNLOAD ACTIONS ---

  async downloadFormat(format: 'stl' | '3mf'): Promise<void> {
    const options: GridfinityBinGeneratorOptions = {
      gridX: this.gridX(),
      gridY: this.gridY(),
      heightUnits: this.heightUnits(),
      subdivisionsX: this.subdivisionsX(),
      subdivisionsY: this.subdivisionsY(),
      lipStyle: this.lipStyle(),
      fingerScoop: this.fingerScoop(),
      fingerScoopRadiusMm: this.fingerScoopRadiusMm(),
      labelTab: this.labelTab(),
      labelTabWidthMm: this.labelTabWidthMm(),
      labelAngleDeg: this.labelAngleDeg(),
      baseMagnetHoles: this.baseMagnetHoles(),
      baseScrewHoles: this.baseScrewHoles(),
      wallThicknessMm: this.wallThicknessMm(),
    };

    const result = await processGridfinity(options, format);
    if (!result.success || !result.blob) return;

    const url = URL.createObjectURL(result.blob);
    this.activeDownloadUrls.push(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // --- THREE.JS VIEWPORT & RENDERING ---

  private initThree(): void {
    if (!this.viewportContainer) return;

    try {
      const container = this.viewportContainer.nativeElement;
      const width = container.clientWidth || 400;
      const height = container.clientHeight || 380;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0f172a);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
      this.camera.position.set(0, -90, 100);
      this.camera.lookAt(0, 0, 10);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(this.renderer.domElement);

      // Lighting: Key, Fill, and Ambient
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
      keyLight.position.set(80, -100, 140);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.4);
      fillLight.position.set(-80, 100, 60);
      this.scene.add(fillLight);

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.currentMesh) {
          this.currentMesh.rotation.z = this.meshRotationY;
          this.currentMesh.rotation.x = this.meshRotationX;
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

  private rebuildMesh(): void {
    const options: GridfinityBinGeneratorOptions = {
      gridX: this.gridX(),
      gridY: this.gridY(),
      heightUnits: this.heightUnits(),
      subdivisionsX: this.subdivisionsX(),
      subdivisionsY: this.subdivisionsY(),
      lipStyle: this.lipStyle(),
      fingerScoop: this.fingerScoop(),
      fingerScoopRadiusMm: this.fingerScoopRadiusMm(),
      labelTab: this.labelTab(),
      labelTabWidthMm: this.labelTabWidthMm(),
      labelAngleDeg: this.labelAngleDeg(),
      baseMagnetHoles: this.baseMagnetHoles(),
      baseScrewHoles: this.baseScrewHoles(),
      wallThicknessMm: this.wallThicknessMm(),
    };

    const geometry = generateGridfinityGeometry(options);
    const metrics = calculateGridfinityMetrics(geometry, options);
    this.currentMetrics.set(metrics);

    if (!this.scene) {
      geometry.dispose();
      return;
    }

    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else {
        this.currentMesh.material.dispose();
      }
    }

    // Gridfinity matte orange / slate industrial plastic look
    const material = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Zack Freedman signature Gridfinity safety orange
      roughness: 0.45,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    this.currentMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.currentMesh);

    // Adjust camera distance based on bin diagonal
    if (this.camera) {
      const maxDim = Math.max(metrics.totalWidthMm, metrics.totalLengthMm, metrics.totalHeightMm);
      this.camera.position.set(0, -maxDim * 1.6, maxDim * 1.5);
      this.camera.lookAt(0, 0, metrics.totalHeightMm / 2);
    }
  }

  // --- MOUSE ORBIT CONTROLS ---

  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.prevMouseX = event.clientX;
    this.prevMouseY = event.clientY;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const deltaX = event.clientX - this.prevMouseX;
    const deltaY = event.clientY - this.prevMouseY;

    this.meshRotationY += deltaX * 0.01;
    this.meshRotationX += deltaY * 0.01;

    this.meshRotationX = Math.max(0.1, Math.min(Math.PI / 2.2, this.meshRotationX));

    this.prevMouseX = event.clientX;
    this.prevMouseY = event.clientY;
  }

  onMouseUp(): void {
    this.isDragging = false;
  }
}
