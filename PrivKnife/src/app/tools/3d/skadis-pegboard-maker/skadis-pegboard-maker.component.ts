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
  HolderStyle,
  PegboardSystem,
  PresetHolder,
  SkadisPegboardMakerOptions,
  SkadisPegboardMetrics,
} from './types';
import {
  DEFAULT_SKADIS_OPTIONS,
  SKADIS_PRESETS,
} from './test-fixtures';
import {
  calculateSkadisMetrics,
  generateSkadisGeometries,
  processSkadisHolder,
} from './engine';

@Component({
  selector: 'app-skadis-pegboard-maker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
  ],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">IKEA Skadis & Pegboard Hook & Holder Maker</h1>
          <p class="c-header__subtitle">
            Generate precision 3D printable hooks, prongs, tool holsters, and shelf brackets with custom mounting lugs for IKEA Skådis slots or standard 1/4" pegboards.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
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
        <!-- Controls Column -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header">
              <h2 class="c-card__title">1. Pegboard System & Style</h2>
            </div>
            <div class="c-card__body">
              <!-- System Selection -->
              <div class="control-group">
                <label class="c-input__label">Target Board System</label>
                <div class="btn-toggle-grid">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pegboardSystem() === 'ikea_skadis'"
                    [class.c-button--outline]="pegboardSystem() !== 'ikea_skadis'"
                    (click)="setPegboardSystem('ikea_skadis')"
                  >
                    IKEA Skådis (5×15mm Oval Slots)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pegboardSystem() === 'standard_pegboard_1_inch'"
                    [class.c-button--outline]="pegboardSystem() !== 'standard_pegboard_1_inch'"
                    (click)="setPegboardSystem('standard_pegboard_1_inch')"
                  >
                    Standard 1" Pegboard (1/4" Holes)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pegboardSystem() === 'standard_pegboard_half_inch'"
                    [class.c-button--outline]="pegboardSystem() !== 'standard_pegboard_half_inch'"
                    (click)="setPegboardSystem('standard_pegboard_half_inch')"
                  >
                    Mini 1/2" Pegboard (1/8" Holes)
                  </button>
                </div>
              </div>

              <!-- Holder Style -->
              <div class="control-group g--margin-top-4">
                <label class="c-input__label">Mounting Accessory Style</label>
                <div class="style-btn-grid">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="holderStyle() === 'single_hook'"
                    [class.c-button--outline]="holderStyle() !== 'single_hook'"
                    (click)="setHolderStyle('single_hook')"
                  >
                    🪝 Utility Hook
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="holderStyle() === 'dual_prong'"
                    [class.c-button--outline]="holderStyle() !== 'dual_prong'"
                    (click)="setHolderStyle('dual_prong')"
                  >
                    🔨 Dual Prong
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="holderStyle() === 'shelf_bracket'"
                    [class.c-button--outline]="holderStyle() !== 'shelf_bracket'"
                    (click)="setHolderStyle('shelf_bracket')"
                  >
                    📐 Shelf Bracket
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="holderStyle() === 'tool_holster'"
                    [class.c-button--outline]="holderStyle() !== 'tool_holster'"
                    (click)="setHolderStyle('tool_holster')"
                  >
                    📏 Caliper Holster
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="holderStyle() === 'cylinder_cup'"
                    [class.c-button--outline]="holderStyle() !== 'cylinder_cup'"
                    (click)="setHolderStyle('cylinder_cup')"
                  >
                    🥤 Parts Cup
                  </button>
                </div>
              </div>
            </div>
          </app-card>

          <!-- Parametric Dimensions -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">2. Dimensions & Fit</h2>
            </div>
            <div class="c-card__body">
              <!-- Hook Length -->
              <div class="control-group">
                <label class="c-input__label">
                  Length / Reach: <strong>{{ hookLengthMm() }} mm</strong>
                  @if (holderStyle() === 'cylinder_cup') {
                    <span class="control-hint">(Cup Height)</span>
                  }
                </label>
                <input
                  type="range"
                  class="c-input c-input--slider"
                  min="20"
                  max="120"
                  step="5"
                  [value]="hookLengthMm()"
                  (input)="onHookLengthChange($event)"
                />
              </div>

              <!-- Angle & Lip Height -->
              @if (holderStyle() === 'single_hook' || holderStyle() === 'dual_prong') {
                <div class="control-row-2 g--margin-top-4">
                  <div class="control-group">
                    <label class="c-input__label">
                      Upward Tilt: <strong>{{ hookAngleDeg() }}°</strong>
                    </label>
                    <input
                      type="range"
                      class="c-input c-input--slider"
                      min="0"
                      max="25"
                      step="1"
                      [value]="hookAngleDeg()"
                      (input)="onAngleChange($event)"
                    />
                  </div>
                  <div class="control-group">
                    <label class="c-input__label">
                      Front Lip: <strong>{{ lipHeightMm() }} mm</strong>
                    </label>
                    <input
                      type="range"
                      class="c-input c-input--slider"
                      min="4"
                      max="25"
                      step="1"
                      [value]="lipHeightMm()"
                      (input)="onLipChange($event)"
                    />
                  </div>
                </div>
              }

              <!-- Bracket Width -->
              <div class="control-group g--margin-top-4">
                <label class="c-input__label">
                  Faceplate Width: <strong>{{ bracketWidthMm() }} mm</strong>
                  <span class="control-hint">(≥60mm creates dual-column prongs)</span>
                </label>
                <input
                  type="range"
                  class="c-input c-input--slider"
                  min="20"
                  max="80"
                  step="4"
                  [value]="bracketWidthMm()"
                  (input)="onWidthChange($event)"
                />
              </div>

              <!-- Tool Diameter for Holster or Cup -->
              @if (holderStyle() === 'tool_holster' || holderStyle() === 'cylinder_cup') {
                <div class="control-group g--margin-top-4">
                  <label class="c-input__label">
                    Inner Opening Diameter: <strong>{{ toolDiameterMm() }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="14"
                    max="65"
                    step="2"
                    [value]="toolDiameterMm()"
                    (input)="onDiameterChange($event)"
                  />
                </div>
              }

              <!-- Reinforce & Wedge Toggles -->
              <div class="toggles-column g--margin-top-4">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="reinforceRib()"
                    (change)="toggleReinforceRib()"
                  />
                  <span>Reinforced Gusset Rib (Prevents sagging under heavy loads)</span>
                </label>

                @if (pegboardSystem() === 'ikea_skadis') {
                  <label class="c-input__checkbox-label g--margin-top-2">
                    <input
                      type="checkbox"
                      [checked]="lockingWedge()"
                      (change)="toggleLockingWedge()"
                    />
                    <span>Include Anti-Slip Locking Wedge Clip (Locks hook firmly into Skådis slot)</span>
                  </label>
                }
              </div>
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
                <h2 class="c-card__title">3D Preview & Mounting Simulation</h2>
              </div>
            </div>

            <div class="c-card__body">
              <!-- Three.js Viewport -->
              <div
                #viewportContainer
                class="skadis-viewport"
                (mousedown)="onMouseDown($event)"
                (mousemove)="onMouseMove($event)"
                (mouseup)="onMouseUp()"
                (mouseleave)="onMouseUp()"
                (wheel)="onWheel($event)"
              >
                <div class="viewport-hints">
                  Left-drag to rotate • Scroll to zoom • Live pegboard fit preview
                </div>
              </div>

              <!-- Estimated Physical Metrics -->
              <div class="metrics-grid g--margin-top-4">
                <div class="metric-card">
                  <span class="metric-label">Dimensions (W×D×H)</span>
                  <span class="metric-value">
                    {{ metrics().totalWidthMm }} × {{ metrics().totalDepthMm }} × {{ metrics().totalHeightMm }} mm
                  </span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Prong Pins</span>
                  <span class="metric-value">{{ metrics().prongCount }} Lugs</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Est. Weight</span>
                  <span class="metric-value">{{ metrics().estimatedGrams }} g (PLA/PETG)</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Est. Print Time</span>
                  <span class="metric-value">~{{ metrics().estimatedPrintTimeHours }} hrs</span>
                </div>
              </div>

              <!-- Slicer Optimization Tips -->
              <div class="slicer-tips-card g--margin-top-4">
                <h4 class="tips-title">💡 Slicer & 3D Print Recommendations</h4>
                <ul class="tips-list">
                  @for (tip of metrics().slicerTips; track tip) {
                    <li>{{ tip }}</li>
                  }
                </ul>
              </div>

              <!-- Export Box -->
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
                      Binary .STL (Print-Bed Orientation)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="exportFormat() === '3mf'"
                      [class.c-button--outline]="exportFormat() !== '3mf'"
                      (click)="setExportFormat('3mf')"
                    >
                      Multi-Object .3MF Package
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
                      <span>Generating 3D Deliverable...</span>
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
  styles: [
    `
      .preset-strip {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .preset-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #94a3b8;
      }

      .preset-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .btn-toggle-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 6px;
      }

      .style-btn-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        margin-top: 6px;
      }

      .control-group {
        display: flex;
        flex-direction: column;
      }

      .control-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .control-hint {
        font-size: 0.75rem;
        color: #64748b;
        font-weight: 400;
        margin-left: 4px;
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

      .toggles-column {
        display: flex;
        flex-direction: column;
      }

      .skadis-viewport {
        position: relative;
        width: 100%;
        height: 380px;
        background: #090d16;
        border-radius: 8px;
        overflow: hidden;
        cursor: grab;
      }

      .skadis-viewport:active {
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
        font-weight: 600;
        color: #f3f4f6;
        margin-top: 2px;
      }

      .slicer-tips-card {
        background: rgba(56, 189, 248, 0.05);
        border: 1px solid rgba(56, 189, 248, 0.2);
        border-radius: 6px;
        padding: 10px 14px;
      }

      .tips-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: #38bdf8;
        margin: 0 0 6px 0;
      }

      .tips-list {
        margin: 0;
        padding-left: 18px;
        font-size: 0.8rem;
        color: #cbd5e1;
        line-height: 1.4;
      }

      .export-box {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 14px;
      }

      .export-format-selector {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .format-radios {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .download-btn {
        width: 100%;
        justify-content: center;
      }
    `,
  ],
})
export class SkadisPegboardMakerComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer', { static: false })
  viewportContainer!: ElementRef<HTMLDivElement>;

  // --- SIGNALS FOR PARAMETRIC STATE ---
  readonly pegboardSystem = signal<PegboardSystem>(DEFAULT_SKADIS_OPTIONS.pegboardSystem);
  readonly holderStyle = signal<HolderStyle>(DEFAULT_SKADIS_OPTIONS.holderStyle);
  readonly hookLengthMm = signal<number>(DEFAULT_SKADIS_OPTIONS.hookLengthMm);
  readonly hookAngleDeg = signal<number>(DEFAULT_SKADIS_OPTIONS.hookAngleDeg);
  readonly lipHeightMm = signal<number>(DEFAULT_SKADIS_OPTIONS.lipHeightMm);
  readonly bracketWidthMm = signal<number>(DEFAULT_SKADIS_OPTIONS.bracketWidthMm);
  readonly toolDiameterMm = signal<number>(DEFAULT_SKADIS_OPTIONS.toolDiameterMm);
  readonly reinforceRib = signal<boolean>(DEFAULT_SKADIS_OPTIONS.reinforceRib);
  readonly lockingWedge = signal<boolean>(DEFAULT_SKADIS_OPTIONS.lockingWedge);
  readonly exportFormat = signal<'stl' | '3mf'>('stl');
  readonly isGenerating = signal<boolean>(false);
  readonly activePresetId = signal<string>('skadis_single_hook');

  readonly presets = SKADIS_PRESETS;

  readonly metrics = signal<SkadisPegboardMetrics>({
    totalWidthMm: 24,
    totalDepthMm: 55,
    totalHeightMm: 56,
    prongCount: 2,
    triangleCount: 420,
    estimatedGrams: 14.5,
    estimatedPrintTimeHours: 0.8,
    slicerTips: [
      'Print Orientation: Print hook on its SIDE so layer lines run along the arm.',
      'Perimeters: Use 4 to 5 wall perimeters for strong prongs and rigidity.',
    ],
  });

  // Track created object URLs
  private activeDownloadUrls: string[] = [];

  // Three.js Scene References
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private holderMeshGroup: THREE.Group | null = null;
  private pegboardMesh: THREE.Mesh | null = null;
  private animationFrameId: number | null = null;

  // Viewport navigation
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;
  private meshRotationY = -0.7;
  private meshRotationX = 0.25;
  private cameraDistance = 140;

  ngOnInit(): void {
    this.recalculateMetrics();
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.rebuildMesh();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.holderMeshGroup) {
      this.holderMeshGroup.traverse((obj) => {
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

  applyPreset(preset: PresetHolder): void {
    this.activePresetId.set(preset.id);

    if (preset.options.pegboardSystem) this.pegboardSystem.set(preset.options.pegboardSystem);
    if (preset.options.holderStyle) this.holderStyle.set(preset.options.holderStyle);
    if (preset.options.hookLengthMm !== undefined) this.hookLengthMm.set(preset.options.hookLengthMm);
    if (preset.options.hookAngleDeg !== undefined) this.hookAngleDeg.set(preset.options.hookAngleDeg);
    if (preset.options.lipHeightMm !== undefined) this.lipHeightMm.set(preset.options.lipHeightMm);
    if (preset.options.bracketWidthMm !== undefined) this.bracketWidthMm.set(preset.options.bracketWidthMm);
    if (preset.options.toolDiameterMm !== undefined) this.toolDiameterMm.set(preset.options.toolDiameterMm);
    if (preset.options.reinforceRib !== undefined) this.reinforceRib.set(preset.options.reinforceRib);
    if (preset.options.lockingWedge !== undefined) this.lockingWedge.set(preset.options.lockingWedge);

    this.rebuildMesh();
  }

  resetToDefaults(): void {
    this.activePresetId.set('skadis_single_hook');
    this.pegboardSystem.set(DEFAULT_SKADIS_OPTIONS.pegboardSystem);
    this.holderStyle.set(DEFAULT_SKADIS_OPTIONS.holderStyle);
    this.hookLengthMm.set(DEFAULT_SKADIS_OPTIONS.hookLengthMm);
    this.hookAngleDeg.set(DEFAULT_SKADIS_OPTIONS.hookAngleDeg);
    this.lipHeightMm.set(DEFAULT_SKADIS_OPTIONS.lipHeightMm);
    this.bracketWidthMm.set(DEFAULT_SKADIS_OPTIONS.bracketWidthMm);
    this.toolDiameterMm.set(DEFAULT_SKADIS_OPTIONS.toolDiameterMm);
    this.reinforceRib.set(DEFAULT_SKADIS_OPTIONS.reinforceRib);
    this.lockingWedge.set(DEFAULT_SKADIS_OPTIONS.lockingWedge);

    this.rebuildMesh();
  }

  setPegboardSystem(sys: PegboardSystem): void {
    this.pegboardSystem.set(sys);
    this.rebuildMesh();
  }

  setHolderStyle(style: HolderStyle): void {
    this.holderStyle.set(style);
    this.rebuildMesh();
  }

  setExportFormat(fmt: 'stl' | '3mf'): void {
    this.exportFormat.set(fmt);
  }

  toggleReinforceRib(): void {
    this.reinforceRib.update((v) => !v);
    this.rebuildMesh();
  }

  toggleLockingWedge(): void {
    this.lockingWedge.update((v) => !v);
    this.rebuildMesh();
  }

  onHookLengthChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.hookLengthMm.set(val);
    this.rebuildMesh();
  }

  onAngleChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.hookAngleDeg.set(val);
    this.rebuildMesh();
  }

  onLipChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.lipHeightMm.set(val);
    this.rebuildMesh();
  }

  onWidthChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.bracketWidthMm.set(val);
    this.rebuildMesh();
  }

  onDiameterChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.toolDiameterMm.set(val);
    this.rebuildMesh();
  }

  // --- DOWNLOAD ACTIONS ---

  async downloadFormat(format: 'stl' | '3mf'): Promise<void> {
    this.isGenerating.set(true);

    const options: SkadisPegboardMakerOptions = {
      pegboardSystem: this.pegboardSystem(),
      holderStyle: this.holderStyle(),
      hookLengthMm: this.hookLengthMm(),
      hookAngleDeg: this.hookAngleDeg(),
      lipHeightMm: this.lipHeightMm(),
      bracketWidthMm: this.bracketWidthMm(),
      toolDiameterMm: this.toolDiameterMm(),
      reinforceRib: this.reinforceRib(),
      lockingWedge: this.lockingWedge(),
    };

    try {
      const result = await processSkadisHolder(options, format);
      if (!result.success || !result.blob) return;

      const url = URL.createObjectURL(result.blob);
      this.activeDownloadUrls.push(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      this.isGenerating.set(false);
    }
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

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
      keyLight.position.set(120, 140, 120);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
      fillLight.position.set(-100, -80, -100);
      this.scene.add(fillLight);

      // Translucent Pegboard simulation plane
      const boardGeom = new THREE.BoxGeometry(5.0, 130, 130);
      const boardMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.35,
        roughness: 0.8,
      });
      this.pegboardMesh = new THREE.Mesh(boardGeom, boardMat);
      this.pegboardMesh.position.set(-2.5, 20, 0);
      this.scene.add(this.pegboardMesh);

      // Group for holder & accessories
      this.holderMeshGroup = new THREE.Group();
      this.scene.add(this.holderMeshGroup);

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.holderMeshGroup) {
          this.holderMeshGroup.rotation.y = this.meshRotationY;
          this.holderMeshGroup.rotation.x = this.meshRotationX;
        }
        if (this.pegboardMesh) {
          this.pegboardMesh.rotation.y = this.meshRotationY;
          this.pegboardMesh.rotation.x = this.meshRotationX;
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
      this.cameraDistance * 0.75,
      this.cameraDistance * 0.4,
      this.cameraDistance * 0.75
    );
    this.camera.lookAt(15, 20, 0);
  }

  private recalculateMetrics(): void {
    const options: SkadisPegboardMakerOptions = {
      pegboardSystem: this.pegboardSystem(),
      holderStyle: this.holderStyle(),
      hookLengthMm: this.hookLengthMm(),
      hookAngleDeg: this.hookAngleDeg(),
      lipHeightMm: this.lipHeightMm(),
      bracketWidthMm: this.bracketWidthMm(),
      toolDiameterMm: this.toolDiameterMm(),
      reinforceRib: this.reinforceRib(),
      lockingWedge: this.lockingWedge(),
    };

    const { holderGeometry, lockingWedgeGeometry, prongCount } = generateSkadisGeometries(options);
    const m = calculateSkadisMetrics(holderGeometry, lockingWedgeGeometry, options);
    m.prongCount = prongCount;
    this.metrics.set(m);

    holderGeometry.dispose();
    lockingWedgeGeometry.dispose();
  }

  private rebuildMesh(): void {
    this.recalculateMetrics();

    if (!this.scene || !this.holderMeshGroup) return;

    while (this.holderMeshGroup.children.length > 0) {
      const child = this.holderMeshGroup.children[0];
      this.holderMeshGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    const options: SkadisPegboardMakerOptions = {
      pegboardSystem: this.pegboardSystem(),
      holderStyle: this.holderStyle(),
      hookLengthMm: this.hookLengthMm(),
      hookAngleDeg: this.hookAngleDeg(),
      lipHeightMm: this.lipHeightMm(),
      bracketWidthMm: this.bracketWidthMm(),
      toolDiameterMm: this.toolDiameterMm(),
      reinforceRib: this.reinforceRib(),
      lockingWedge: this.lockingWedge(),
    };

    const { holderGeometry, lockingWedgeGeometry } = generateSkadisGeometries(options);

    // Holder Material: Vibrant teal / cyan
    const holderMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.2,
      roughness: 0.4,
    });
    const holderMesh = new THREE.Mesh(holderGeometry, holderMat);
    this.holderMeshGroup.add(holderMesh);

    // Locking Wedge Material: Signal Amber/Orange
    if (this.lockingWedge() && lockingWedgeGeometry.attributes['position']?.count > 0) {
      const wedgeMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.1,
        roughness: 0.5,
      });
      const wedgeMesh = new THREE.Mesh(lockingWedgeGeometry, wedgeMat);
      // Position wedge inserted above top prong
      wedgeMesh.position.set(-2, 42, 0);
      this.holderMeshGroup.add(wedgeMesh);
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

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.cameraDistance = Math.max(70, Math.min(280, this.cameraDistance + event.deltaY * 0.15));
    this.updateCameraPosition();
  }
}
