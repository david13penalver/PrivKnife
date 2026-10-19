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
  ClosureType,
  ElectronicsBoxEnclosureOptions,
  ElectronicsBoxMetrics,
  PcbPresetType,
  PresetEnclosure,
} from './types';
import {
  calculateEnclosureMetrics,
  generateEnclosureGeometries,
  processEnclosure,
} from './engine';
import {
  DEFAULT_ENCLOSURE_OPTIONS,
  ENCLOSURE_PRESETS,
} from './test-fixtures';

@Component({
  selector: 'app-electronics-box-enclosure',
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
          <h1 class="c-header__title">Parametric Electronics Box & Snap-Fit Enclosure</h1>
          <p class="c-header__subtitle">
            Generate custom two-part 3D printable enclosures for DIY electronics, microcontrollers (Arduino, ESP32, Raspberry Pi Pico), and custom PCBs with snap-fit or screw joints.
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
          <!-- Curated Presets -->
          <app-card>
            <div class="c-card__header">
              <h2 class="c-card__title">1. Common Microcontroller & Device Presets</h2>
            </div>
            <div class="c-card__body">
              <div class="enclosure-presets">
                @for (preset of presets; track preset.id) {
                  <button
                    type="button"
                    class="c-button c-button--outline enclosure-preset-btn"
                    [class.c-button--primary]="pcbPreset() === preset.options.pcbPreset"
                    (click)="applyPreset(preset)"
                  >
                    <strong>{{ preset.name }}</strong>
                    <span class="enclosure-preset-desc">{{ preset.description }}</span>
                  </button>
                }
              </div>
            </div>
          </app-card>

          <!-- Dimensions & Shell Parameters -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">2. Internal Dimensions & Wall Thickness</h2>
            </div>
            <div class="c-card__body">
              <!-- Internal Dimensions -->
              <div class="param-grid">
                <div class="control-group">
                  <label class="c-input__label">Inner Length: <strong>{{ innerLengthMm() }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="30"
                    max="180"
                    step="1"
                    [value]="innerLengthMm()"
                    (input)="onLengthChange($event)"
                  />
                </div>

                <div class="control-group">
                  <label class="c-input__label">Inner Width: <strong>{{ innerWidthMm() }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="20"
                    max="120"
                    step="1"
                    [value]="innerWidthMm()"
                    (input)="onWidthChange($event)"
                  />
                </div>
              </div>

              <div class="param-grid g--margin-top-3">
                <div class="control-group">
                  <label class="c-input__label">Inner Height: <strong>{{ innerHeightMm() }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="12"
                    max="80"
                    step="1"
                    [value]="innerHeightMm()"
                    (input)="onHeightChange($event)"
                  />
                </div>

                <div class="control-group">
                  <label class="c-input__label">Wall Thickness: <strong>{{ wallThicknessMm() | number:'1.1-1' }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="1.2"
                    max="3.6"
                    step="0.2"
                    [value]="wallThicknessMm()"
                    (input)="onWallChange($event)"
                  />
                </div>
              </div>

              <!-- Closure Mechanism -->
              <div class="control-group g--margin-top-4">
                <label class="c-input__label">Lid Closure Mechanism</label>
                <div class="closure-btn-row">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="closureType() === 'snap_fit'"
                    [class.c-button--outline]="closureType() !== 'snap_fit'"
                    (click)="setClosureType('snap_fit')"
                  >
                    Cantilever Snap-Fit (Toolless)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="closureType() === 'm3_screws'"
                    [class.c-button--outline]="closureType() !== 'm3_screws'"
                    (click)="setClosureType('m3_screws')"
                  >
                    M3 Screw Bosses (Heavy Duty)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="closureType() === 'slide_lid'"
                    [class.c-button--outline]="closureType() !== 'slide_lid'"
                    (click)="setClosureType('slide_lid')"
                  >
                    Friction Sliding Lid
                  </button>
                </div>
              </div>
            </div>
          </app-card>

          <!-- Ports & Standoffs -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">3. Standoffs, Ports & Cooling</h2>
            </div>
            <div class="c-card__body">
              <!-- Standoff Height -->
              <div class="control-row">
                <label class="c-input__label">
                  PCB Standoff Height: <strong>{{ standoffHeightMm() | number:'1.1-1' }} mm</strong>
                </label>
                <input
                  type="range"
                  class="c-input c-input--slider"
                  min="2"
                  max="14"
                  step="0.5"
                  [value]="standoffHeightMm()"
                  (input)="onStandoffChange($event)"
                />
              </div>

              <!-- Cable Slot -->
              <div class="control-row g--margin-top-4">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="cableSlot()"
                    (change)="toggleCableSlot()"
                  />
                  <span>Cable Pass-Through / USB Port Cutout</span>
                </label>
              </div>

              @if (cableSlot()) {
                <div class="control-row g--margin-top-2 g--margin-left-4">
                  <label class="c-input__label">Port Cutout Width: <strong>{{ cableSlotDiameterMm() }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="5"
                    max="18"
                    step="1"
                    [value]="cableSlotDiameterMm()"
                    (input)="onSlotDiameterChange($event)"
                  />
                </div>
              }

              <!-- Ventilation -->
              <div class="control-row g--margin-top-4">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="ventilationGrille()"
                    (change)="toggleVentilation()"
                  />
                  <span>Heat Dissipation Cooling Grille Slots</span>
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
                <h2 class="c-card__title">Interactive 3D Viewport</h2>
              </div>
              <!-- Exploded View Toggle -->
              <div class="l-extremo__area-derecha">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="explodedView()"
                  [class.c-button--outline]="!explodedView()"
                  (click)="toggleExplodedView()"
                  title="Hover lid above base to inspect internal layout"
                >
                  🔍 Exploded View: {{ explodedView() ? 'ON' : 'OFF' }}
                </button>
              </div>
            </div>

            <div class="c-card__body">
              <div
                #viewportContainer
                class="c-preview enclosure-viewport"
                (mousedown)="onMouseDown($event)"
                (mousemove)="onMouseMove($event)"
                (mouseup)="onMouseUp()"
                (mouseleave)="onMouseUp()"
              >
                <div class="viewport-hints">
                  <span>🖱️ Click & Drag to Orbit • Scroll to Zoom</span>
                </div>
              </div>

              <!-- Telemetry Metrics -->
              @if (currentMetrics(); as metrics) {
                <div class="metrics-grid g--margin-top-4">
                  <div class="metric-card">
                    <span class="metric-label">Outer Footprint</span>
                    <strong class="metric-value">{{ metrics.outerLengthMm }} × {{ metrics.outerWidthMm }} × {{ metrics.outerHeightMm }} mm</strong>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Polygons</span>
                    <strong class="metric-value">{{ metrics.totalTriangles | number }} tris</strong>
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
                  <h4 class="slicer-title">🛠️ Optimal 3D Printing Recommendations</h4>
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
                <span class="g--text-muted">Export deliverables:</span>
              </div>
              <div class="l-extremo__area-derecha export-actions">
                <button
                  type="button"
                  class="c-button c-button--outline"
                  (click)="downloadFormat('3mf')"
                >
                  Download .3MF (Multi-Object)
                </button>
                <button
                  type="button"
                  class="c-button c-button--primary"
                  (click)="downloadFormat('stl')"
                >
                  Download .STL (Bed Layout)
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
      .enclosure-presets {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }

      .enclosure-preset-btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
        padding: 12px;
        height: auto;
      }

      .enclosure-preset-desc {
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

      .closure-btn-row {
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

      .enclosure-viewport {
        position: relative;
        width: 100%;
        height: 380px;
        background: #090d16;
        border-radius: 8px;
        overflow: hidden;
        cursor: grab;
      }

      .enclosure-viewport:active {
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
export class ElectronicsBoxEnclosureComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer') viewportContainer!: ElementRef<HTMLDivElement>;

  // Domain signals
  readonly innerLengthMm = signal<number>(80);
  readonly innerWidthMm = signal<number>(50);
  readonly innerHeightMm = signal<number>(30);
  readonly wallThicknessMm = signal<number>(2.0);
  readonly cornerRadiusMm = signal<number>(3.0);
  readonly closureType = signal<ClosureType>('snap_fit');
  readonly pcbPreset = signal<PcbPresetType>('custom');
  readonly standoffHeightMm = signal<number>(5.0);
  readonly cableSlot = signal<boolean>(true);
  readonly cableSlotDiameterMm = signal<number>(8.0);
  readonly ventilationGrille = signal<boolean>(true);
  readonly explodedView = signal<boolean>(false);

  // Telemetry metrics
  readonly currentMetrics = signal<ElectronicsBoxMetrics | null>(null);

  // Presets
  readonly presets = ENCLOSURE_PRESETS;

  // Tracked object URLs
  private activeDownloadUrls: string[] = [];

  // Three.js internal refs
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private currentMesh: THREE.Mesh | null = null;
  private animationFrameId: number | null = null;

  // Mouse rotation orbit state
  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private meshRotationX = 0.55;
  private meshRotationY = -0.45;

  ngOnInit(): void {}

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

  applyPreset(preset: PresetEnclosure): void {
    if (preset.options.innerLengthMm !== undefined) this.innerLengthMm.set(preset.options.innerLengthMm);
    if (preset.options.innerWidthMm !== undefined) this.innerWidthMm.set(preset.options.innerWidthMm);
    if (preset.options.innerHeightMm !== undefined) this.innerHeightMm.set(preset.options.innerHeightMm);
    if (preset.options.wallThicknessMm !== undefined) this.wallThicknessMm.set(preset.options.wallThicknessMm);
    if (preset.options.closureType) this.closureType.set(preset.options.closureType);
    if (preset.options.pcbPreset) this.pcbPreset.set(preset.options.pcbPreset);
    if (preset.options.standoffHeightMm !== undefined) this.standoffHeightMm.set(preset.options.standoffHeightMm);
    if (preset.options.cableSlot !== undefined) this.cableSlot.set(preset.options.cableSlot);
    if (preset.options.ventilationGrille !== undefined) this.ventilationGrille.set(preset.options.ventilationGrille);

    this.rebuildMesh();
  }

  resetToDefaults(): void {
    this.innerLengthMm.set(DEFAULT_ENCLOSURE_OPTIONS.innerLengthMm);
    this.innerWidthMm.set(DEFAULT_ENCLOSURE_OPTIONS.innerWidthMm);
    this.innerHeightMm.set(DEFAULT_ENCLOSURE_OPTIONS.innerHeightMm);
    this.wallThicknessMm.set(DEFAULT_ENCLOSURE_OPTIONS.wallThicknessMm);
    this.cornerRadiusMm.set(DEFAULT_ENCLOSURE_OPTIONS.cornerRadiusMm);
    this.closureType.set(DEFAULT_ENCLOSURE_OPTIONS.closureType);
    this.pcbPreset.set(DEFAULT_ENCLOSURE_OPTIONS.pcbPreset);
    this.standoffHeightMm.set(DEFAULT_ENCLOSURE_OPTIONS.standoffHeightMm);
    this.cableSlot.set(DEFAULT_ENCLOSURE_OPTIONS.cableSlot);
    this.cableSlotDiameterMm.set(DEFAULT_ENCLOSURE_OPTIONS.cableSlotDiameterMm);
    this.ventilationGrille.set(DEFAULT_ENCLOSURE_OPTIONS.ventilationGrille);
    this.explodedView.set(false);

    this.rebuildMesh();
  }

  setClosureType(type: ClosureType): void {
    this.closureType.set(type);
    this.rebuildMesh();
  }

  toggleExplodedView(): void {
    this.explodedView.update((v) => !v);
    this.rebuildMesh();
  }

  toggleCableSlot(): void {
    this.cableSlot.update((v) => !v);
    this.rebuildMesh();
  }

  toggleVentilation(): void {
    this.ventilationGrille.update((v) => !v);
    this.rebuildMesh();
  }

  onLengthChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.innerLengthMm.set(val);
    this.rebuildMesh();
  }

  onWidthChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.innerWidthMm.set(val);
    this.rebuildMesh();
  }

  onHeightChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.innerHeightMm.set(val);
    this.rebuildMesh();
  }

  onWallChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.wallThicknessMm.set(val);
    this.rebuildMesh();
  }

  onStandoffChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.standoffHeightMm.set(val);
    this.rebuildMesh();
  }

  onSlotDiameterChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.cableSlotDiameterMm.set(val);
    this.rebuildMesh();
  }

  // --- DOWNLOAD ACTIONS ---

  async downloadFormat(format: 'stl' | '3mf'): Promise<void> {
    const options: ElectronicsBoxEnclosureOptions = {
      innerLengthMm: this.innerLengthMm(),
      innerWidthMm: this.innerWidthMm(),
      innerHeightMm: this.innerHeightMm(),
      wallThicknessMm: this.wallThicknessMm(),
      cornerRadiusMm: this.cornerRadiusMm(),
      closureType: this.closureType(),
      pcbPreset: this.pcbPreset(),
      standoffHeightMm: this.standoffHeightMm(),
      cableSlot: this.cableSlot(),
      cableSlotDiameterMm: this.cableSlotDiameterMm(),
      ventilationGrille: this.ventilationGrille(),
    };

    const result = await processEnclosure(options, format);
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
      this.scene.background = new THREE.Color(0x090d16);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
      this.camera.position.set(0, -120, 140);
      this.camera.lookAt(0, 0, 15);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(this.renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
      keyLight.position.set(100, -120, 160);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
      fillLight.position.set(-100, 120, 80);
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
    const options: ElectronicsBoxEnclosureOptions = {
      innerLengthMm: this.innerLengthMm(),
      innerWidthMm: this.innerWidthMm(),
      innerHeightMm: this.innerHeightMm(),
      wallThicknessMm: this.wallThicknessMm(),
      cornerRadiusMm: this.cornerRadiusMm(),
      closureType: this.closureType(),
      pcbPreset: this.pcbPreset(),
      standoffHeightMm: this.standoffHeightMm(),
      cableSlot: this.cableSlot(),
      cableSlotDiameterMm: this.cableSlotDiameterMm(),
      ventilationGrille: this.ventilationGrille(),
      explodedView: this.explodedView(),
    };

    const { baseGeometry, lidGeometry, combinedGeometry } = generateEnclosureGeometries(
      options,
      this.explodedView()
    );
    const metrics = calculateEnclosureMetrics(baseGeometry, lidGeometry, options);
    this.currentMetrics.set(metrics);

    baseGeometry.dispose();
    lidGeometry.dispose();

    if (!this.scene) {
      combinedGeometry.dispose();
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

    // Industrial matte cyan / slate plastic finish
    const material = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Precision engineering sky blue
      roughness: 0.4,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });

    this.currentMesh = new THREE.Mesh(combinedGeometry, material);
    this.scene.add(this.currentMesh);

    if (this.camera) {
      const maxDim = Math.max(metrics.outerLengthMm, metrics.outerWidthMm, metrics.outerHeightMm);
      const zoomFactor = this.explodedView() ? 2.5 : 2.0;
      this.camera.position.set(0, -maxDim * zoomFactor, maxDim * zoomFactor * 0.9);
      this.camera.lookAt(0, 0, metrics.outerHeightMm / 2);
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
