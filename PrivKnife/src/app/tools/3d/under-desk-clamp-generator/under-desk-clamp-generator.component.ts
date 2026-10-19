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

import { Card } from '../../../components';

import {
  AccessoryType,
  PresetClamp,
  UnderDeskClampGeneratorOptions,
  UnderDeskClampMetrics,
} from './types';
import {
  CLAMP_PRESETS,
  DEFAULT_CLAMP_OPTIONS,
} from './test-fixtures';
import {
  calculateClampMetrics,
  generateClampGeometries,
  processClamp,
} from './engine';

@Component({
  selector: 'app-under-desk-clamp-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    Card,
  ],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Under-Desk Clamp & Cable Management Generator</h1>
          <p class="c-header__subtitle">
            Generate heavy-duty parametric C-clamps with 3D-printable trapezoidal screw threads, clamping bolt knobs, and customizable attachments for headphones, cable raceways, power strips, and beverages.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <!-- Presets Selector -->
      <div class="preset-strip g--margin-bottom-4">
        <span class="preset-label">Quick Presets:</span>
        <div class="preset-buttons">
          @for (preset of presets; track preset.id) {
            <button
              type="button"
              class="c-button c-button--small"
              [class.c-button--primary]="accessoryType() === preset.options.accessoryType"
              [class.c-button--outline]="accessoryType() !== preset.options.accessoryType"
              (click)="applyPreset(preset)"
            >
              @if (preset.options.accessoryType === 'headphone_hanger') { 🎧 }
              @if (preset.options.accessoryType === 'cable_raceway') { 🔌 }
              @if (preset.options.accessoryType === 'power_strip_holder') { ⚡ }
              @if (preset.options.accessoryType === 'cup_holder') { ☕ }
              {{ preset.name }}
            </button>
          }
        </div>
      </div>

      <!-- Main Layout -->
      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header">
              <h2 class="c-card__title">1. Desk & Clamp Dimensions</h2>
            </div>
            <div class="c-card__body">
              <!-- Desk Thickness -->
              <div class="control-group">
                <label class="c-input__label">
                  Desk Thickness: <strong>{{ deskThicknessMm() }} mm</strong>
                  <span class="control-hint">(Actual desktop thickness)</span>
                </label>
                <input
                  type="range"
                  class="c-input c-input--slider"
                  min="12"
                  max="65"
                  step="1"
                  [value]="deskThicknessMm()"
                  (input)="onDeskThicknessChange($event)"
                />
              </div>

              <!-- Max Clamp Gap -->
              <div class="control-group g--margin-top-4">
                <label class="c-input__label">
                  Clamp Opening Jaw Gap: <strong>{{ maxClampGapMm() }} mm</strong>
                  <span class="control-hint">(Must exceed desk thickness by ≥5mm)</span>
                </label>
                <input
                  type="range"
                  class="c-input c-input--slider"
                  [min]="deskThicknessMm() + 5"
                  max="90"
                  step="1"
                  [value]="maxClampGapMm()"
                  (input)="onClampGapChange($event)"
                />
              </div>

              <!-- Throat Depth & Frame Width in 2-cols -->
              <div class="control-row-2 g--margin-top-4">
                <div class="control-group">
                  <label class="c-input__label">
                    Throat Depth: <strong>{{ throatDepthMm() }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="35"
                    max="110"
                    step="5"
                    [value]="throatDepthMm()"
                    (input)="onThroatDepthChange($event)"
                  />
                </div>

                <div class="control-group">
                  <label class="c-input__label">
                    Clamp Width: <strong>{{ frameWidthMm() }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="24"
                    max="60"
                    step="2"
                    [value]="frameWidthMm()"
                    (input)="onFrameWidthChange($event)"
                  />
                </div>
              </div>

              <!-- Structural Spine Thickness -->
              <div class="control-group g--margin-top-4">
                <label class="c-input__label">
                  Spine Wall Thickness: <strong>{{ frameThicknessMm() }} mm</strong>
                  <span class="control-hint">(Thicker wall = less flex under torque)</span>
                </label>
                <input
                  type="range"
                  class="c-input c-input--slider"
                  min="8"
                  max="20"
                  step="1"
                  [value]="frameThicknessMm()"
                  (input)="onFrameThicknessChange($event)"
                />
              </div>
            </div>
          </app-card>

          <!-- Accessory & Attachment Type -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">2. Under-Desk Attachment</h2>
            </div>
            <div class="c-card__body">
              <div class="accessory-btn-grid">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="accessoryType() === 'headphone_hanger'"
                  [class.c-button--outline]="accessoryType() !== 'headphone_hanger'"
                  (click)="setAccessoryType('headphone_hanger')"
                >
                  🎧 Headphone Cradle
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="accessoryType() === 'cable_raceway'"
                  [class.c-button--outline]="accessoryType() !== 'cable_raceway'"
                  (click)="setAccessoryType('cable_raceway')"
                >
                  🔌 Cable Raceway
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="accessoryType() === 'power_strip_holder'"
                  [class.c-button--outline]="accessoryType() !== 'power_strip_holder'"
                  (click)="setAccessoryType('power_strip_holder')"
                >
                  ⚡ Power Strip Cradle
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="accessoryType() === 'cup_holder'"
                  [class.c-button--outline]="accessoryType() !== 'cup_holder'"
                  (click)="setAccessoryType('cup_holder')"
                >
                  ☕ Desk Drink Ring
                </button>
              </div>

              @if (accessoryType() === 'cable_raceway') {
                <div class="control-row-2 g--margin-top-4">
                  <div class="control-group">
                    <label class="c-input__label">Cable Slots: <strong>{{ racewaySlots() }}</strong></label>
                    <input
                      type="range"
                      class="c-input c-input--slider"
                      min="1"
                      max="6"
                      step="1"
                      [value]="racewaySlots()"
                      (input)="onRacewaySlotsChange($event)"
                    />
                  </div>
                  <div class="control-group">
                    <label class="c-input__label">Slot Dia: <strong>{{ racewaySlotDiameterMm() }} mm</strong></label>
                    <input
                      type="range"
                      class="c-input c-input--slider"
                      min="5"
                      max="14"
                      step="1"
                      [value]="racewaySlotDiameterMm()"
                      (input)="onRacewayDiameterChange($event)"
                    />
                  </div>
                </div>
              }
            </div>
          </app-card>

          <!-- Clamping Screw & Knob -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">3. Screw Bolt & Swivel Foot Pad</h2>
            </div>
            <div class="c-card__body">
              <div class="control-row-2">
                <div class="control-group">
                  <label class="c-input__label">
                    Thread Diameter: <strong>{{ screwDiameterMm() }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="14"
                    max="26"
                    step="2"
                    [value]="screwDiameterMm()"
                    (input)="onScrewDiameterChange($event)"
                  />
                </div>

                <div class="control-group">
                  <label class="c-input__label">
                    Thread Pitch: <strong>{{ screwPitchMm() }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input--slider"
                    min="2"
                    max="5"
                    step="0.5"
                    [value]="screwPitchMm()"
                    (input)="onScrewPitchChange($event)"
                  />
                </div>
              </div>

              <!-- Swivel Foot Pad Toggle -->
              <div class="control-row g--margin-top-4">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="swivelFootPad()"
                    (change)="toggleSwivelFootPad()"
                  />
                  <span>Include Swivel Foot Pad (Protects desk surface & distributes clamping force)</span>
                </label>
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

        <!-- Preview & Export Column -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header l-extremo">
              <div class="l-extremo__area-izquierda">
                <h2 class="c-card__title">Live 3D Viewport</h2>
              </div>
              <div class="l-extremo__area-derecha">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="explodedView()"
                  [class.c-button--outline]="!explodedView()"
                  (click)="toggleExplodedView()"
                >
                  {{ explodedView() ? 'Assemble View' : 'Exploded View' }}
                </button>
              </div>
            </div>

            <div class="c-card__body">
              <!-- Viewport Container -->
              <div
                #viewportContainer
                class="clamp-viewport"
                (mousedown)="onMouseDown($event)"
                (mousemove)="onMouseMove($event)"
                (mouseup)="onMouseUp()"
                (mouseleave)="onMouseUp()"
                (wheel)="onWheel($event)"
              >
                <div class="viewport-hints">
                  Left-drag to rotate • Scroll to zoom • Dual-color assembly preview
                </div>
              </div>

              <!-- Estimated Metrics -->
              <div class="metrics-grid g--margin-top-4">
                <div class="metric-card">
                  <span class="metric-label">Dimensions (W×D×H)</span>
                  <span class="metric-value">
                    {{ metrics().totalWidthMm }} × {{ metrics().totalDepthMm }} × {{ metrics().totalHeightMm }} mm
                  </span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Est. Filament Weight</span>
                  <span class="metric-value">{{ metrics().estimatedGrams }} g (PETG/PLA)</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Est. Print Time</span>
                  <span class="metric-value">~{{ metrics().estimatedPrintTimeHours }} hrs</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Total Triangles</span>
                  <span class="metric-value">{{ metrics().totalTriangles | number }}</span>
                </div>
              </div>

              <!-- Slicer Optimization Tips -->
              <div class="slicer-tips-card g--margin-top-4">
                <h4 class="tips-title">💡 3D Printing & Strength Tips</h4>
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
                      Binary .STL (Combined Bed Layout)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="exportFormat() === '3mf'"
                      [class.c-button--outline]="exportFormat() !== '3mf'"
                      (click)="setExportFormat('3mf')"
                    >
                      Multi-Object .3MF (Assembly Package)
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

      .accessory-btn-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .clamp-viewport {
        position: relative;
        width: 100%;
        height: 380px;
        background: #090d16;
        border-radius: 8px;
        overflow: hidden;
        cursor: grab;
      }

      .clamp-viewport:active {
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
export class UnderDeskClampGeneratorComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer', { static: false })
  viewportContainer!: ElementRef<HTMLDivElement>;

  // --- SIGNALS FOR PARAMETRIC STATE ---
  readonly deskThicknessMm = signal<number>(DEFAULT_CLAMP_OPTIONS.deskThicknessMm);
  readonly maxClampGapMm = signal<number>(DEFAULT_CLAMP_OPTIONS.maxClampGapMm);
  readonly throatDepthMm = signal<number>(DEFAULT_CLAMP_OPTIONS.throatDepthMm);
  readonly frameThicknessMm = signal<number>(DEFAULT_CLAMP_OPTIONS.frameThicknessMm);
  readonly frameWidthMm = signal<number>(DEFAULT_CLAMP_OPTIONS.frameWidthMm);
  readonly accessoryType = signal<AccessoryType>(DEFAULT_CLAMP_OPTIONS.accessoryType);
  readonly racewaySlots = signal<number>(DEFAULT_CLAMP_OPTIONS.racewaySlots);
  readonly racewaySlotDiameterMm = signal<number>(DEFAULT_CLAMP_OPTIONS.racewaySlotDiameterMm);
  readonly screwDiameterMm = signal<number>(DEFAULT_CLAMP_OPTIONS.screwDiameterMm);
  readonly screwPitchMm = signal<number>(DEFAULT_CLAMP_OPTIONS.screwPitchMm);
  readonly swivelFootPad = signal<boolean>(DEFAULT_CLAMP_OPTIONS.swivelFootPad);
  readonly explodedView = signal<boolean>(false);
  readonly exportFormat = signal<'stl' | '3mf'>('stl');
  readonly isGenerating = signal<boolean>(false);

  readonly presets = CLAMP_PRESETS;

  // Initial dummy metrics
  readonly metrics = signal<UnderDeskClampMetrics>({
    totalWidthMm: 36,
    totalDepthMm: 72,
    totalHeightMm: 80,
    clampTriangleCount: 240,
    boltTriangleCount: 420,
    footPadTriangleCount: 96,
    accessoryTriangleCount: 84,
    totalTriangles: 840,
    estimatedGrams: 58.4,
    estimatedPrintTimeHours: 3.7,
    slicerTips: [
      'Orientation: Print clamp frame on its SIDE (Z plane) so layer lines run lengthwise against bending torque.',
      'Thread Bolt: Print clamping bolt standing upright on its flat knob base. Overhang angles are ≤45° — no supports needed!',
    ],
  });

  // Track created object URLs for memory hygiene
  private activeDownloadUrls: string[] = [];

  // Three.js Scene References
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private clampMeshGroup: THREE.Group | null = null;
  private deskPreviewMesh: THREE.Mesh | null = null;
  private animationFrameId: number | null = null;

  // Mouse interaction state
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;
  private meshRotationY = -0.6;
  private meshRotationX = 0.35;
  private cameraDistance = 180;

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

    if (this.clampMeshGroup) {
      this.clampMeshGroup.traverse((obj) => {
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

  // --- PRESETS & CONFIGURATION ---

  applyPreset(preset: PresetClamp): void {
    if (preset.options.deskThicknessMm !== undefined) {
      this.deskThicknessMm.set(preset.options.deskThicknessMm);
    }
    if (preset.options.maxClampGapMm !== undefined) {
      this.maxClampGapMm.set(preset.options.maxClampGapMm);
    }
    if (preset.options.throatDepthMm !== undefined) {
      this.throatDepthMm.set(preset.options.throatDepthMm);
    }
    if (preset.options.frameThicknessMm !== undefined) {
      this.frameThicknessMm.set(preset.options.frameThicknessMm);
    }
    if (preset.options.frameWidthMm !== undefined) {
      this.frameWidthMm.set(preset.options.frameWidthMm);
    }
    if (preset.options.accessoryType) {
      this.accessoryType.set(preset.options.accessoryType);
    }
    if (preset.options.racewaySlots !== undefined) {
      this.racewaySlots.set(preset.options.racewaySlots);
    }
    if (preset.options.racewaySlotDiameterMm !== undefined) {
      this.racewaySlotDiameterMm.set(preset.options.racewaySlotDiameterMm);
    }

    this.rebuildMesh();
  }

  resetToDefaults(): void {
    this.deskThicknessMm.set(DEFAULT_CLAMP_OPTIONS.deskThicknessMm);
    this.maxClampGapMm.set(DEFAULT_CLAMP_OPTIONS.maxClampGapMm);
    this.throatDepthMm.set(DEFAULT_CLAMP_OPTIONS.throatDepthMm);
    this.frameThicknessMm.set(DEFAULT_CLAMP_OPTIONS.frameThicknessMm);
    this.frameWidthMm.set(DEFAULT_CLAMP_OPTIONS.frameWidthMm);
    this.accessoryType.set(DEFAULT_CLAMP_OPTIONS.accessoryType);
    this.racewaySlots.set(DEFAULT_CLAMP_OPTIONS.racewaySlots);
    this.racewaySlotDiameterMm.set(DEFAULT_CLAMP_OPTIONS.racewaySlotDiameterMm);
    this.screwDiameterMm.set(DEFAULT_CLAMP_OPTIONS.screwDiameterMm);
    this.screwPitchMm.set(DEFAULT_CLAMP_OPTIONS.screwPitchMm);
    this.swivelFootPad.set(DEFAULT_CLAMP_OPTIONS.swivelFootPad);
    this.explodedView.set(false);

    this.rebuildMesh();
  }

  setAccessoryType(type: AccessoryType): void {
    this.accessoryType.set(type);
    this.rebuildMesh();
  }

  setExportFormat(format: 'stl' | '3mf'): void {
    this.exportFormat.set(format);
  }

  toggleExplodedView(): void {
    this.explodedView.update((v) => !v);
    this.rebuildMesh();
  }

  toggleSwivelFootPad(): void {
    this.swivelFootPad.update((v) => !v);
    this.rebuildMesh();
  }

  onDeskThicknessChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.deskThicknessMm.set(val);
    if (this.maxClampGapMm() < val + 5) {
      this.maxClampGapMm.set(val + 10);
    }
    this.rebuildMesh();
  }

  onClampGapChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.maxClampGapMm.set(val);
    this.rebuildMesh();
  }

  onThroatDepthChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.throatDepthMm.set(val);
    this.rebuildMesh();
  }

  onFrameWidthChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.frameWidthMm.set(val);
    this.rebuildMesh();
  }

  onFrameThicknessChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.frameThicknessMm.set(val);
    this.rebuildMesh();
  }

  onRacewaySlotsChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.racewaySlots.set(val);
    this.rebuildMesh();
  }

  onRacewayDiameterChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.racewaySlotDiameterMm.set(val);
    this.rebuildMesh();
  }

  onScrewDiameterChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.screwDiameterMm.set(val);
    this.rebuildMesh();
  }

  onScrewPitchChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.screwPitchMm.set(val);
    this.rebuildMesh();
  }

  // --- DOWNLOAD ACTIONS ---

  async downloadFormat(format: 'stl' | '3mf'): Promise<void> {
    this.isGenerating.set(true);

    const options: UnderDeskClampGeneratorOptions = {
      deskThicknessMm: this.deskThicknessMm(),
      maxClampGapMm: this.maxClampGapMm(),
      throatDepthMm: this.throatDepthMm(),
      frameThicknessMm: this.frameThicknessMm(),
      frameWidthMm: this.frameWidthMm(),
      accessoryType: this.accessoryType(),
      racewaySlots: this.racewaySlots(),
      racewaySlotDiameterMm: this.racewaySlotDiameterMm(),
      screwDiameterMm: this.screwDiameterMm(),
      screwPitchMm: this.screwPitchMm(),
      swivelFootPad: this.swivelFootPad(),
    };

    try {
      const result = await processClamp(options, format);
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
      keyLight.position.set(120, 160, 140);
      this.scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
      rimLight.position.set(-100, -80, -100);
      this.scene.add(rimLight);

      // Desk tabletop representation (translucent plate)
      const deskGeom = new THREE.BoxGeometry(160, 25, 120);
      const deskMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.35,
        roughness: 0.6,
      });
      this.deskPreviewMesh = new THREE.Mesh(deskGeom, deskMat);
      this.scene.add(this.deskPreviewMesh);

      // Clamp Mesh Group
      this.clampMeshGroup = new THREE.Group();
      this.scene.add(this.clampMeshGroup);

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.clampMeshGroup) {
          this.clampMeshGroup.rotation.y = this.meshRotationY;
          this.clampMeshGroup.rotation.x = this.meshRotationX;
        }
        if (this.deskPreviewMesh) {
          this.deskPreviewMesh.rotation.y = this.meshRotationY;
          this.deskPreviewMesh.rotation.x = this.meshRotationX;
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
      this.cameraDistance * 0.5,
      this.cameraDistance * 0.7
    );
    this.camera.lookAt(20, 15, 0);
  }

  private recalculateMetrics(): void {
    const options: UnderDeskClampGeneratorOptions = {
      deskThicknessMm: this.deskThicknessMm(),
      maxClampGapMm: this.maxClampGapMm(),
      throatDepthMm: this.throatDepthMm(),
      frameThicknessMm: this.frameThicknessMm(),
      frameWidthMm: this.frameWidthMm(),
      accessoryType: this.accessoryType(),
      racewaySlots: this.racewaySlots(),
      racewaySlotDiameterMm: this.racewaySlotDiameterMm(),
      screwDiameterMm: this.screwDiameterMm(),
      screwPitchMm: this.screwPitchMm(),
      swivelFootPad: this.swivelFootPad(),
    };

    const { clampGeometry, boltGeometry, footPadGeometry } = generateClampGeometries(options);
    const m = calculateClampMetrics(clampGeometry, boltGeometry, footPadGeometry, options);
    this.metrics.set(m);

    clampGeometry.dispose();
    boltGeometry.dispose();
    footPadGeometry.dispose();
  }

  private rebuildMesh(): void {
    this.recalculateMetrics();

    if (!this.scene || !this.clampMeshGroup) return;

    // Clear existing group meshes
    while (this.clampMeshGroup.children.length > 0) {
      const child = this.clampMeshGroup.children[0];
      this.clampMeshGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    const options: UnderDeskClampGeneratorOptions = {
      deskThicknessMm: this.deskThicknessMm(),
      maxClampGapMm: this.maxClampGapMm(),
      throatDepthMm: this.throatDepthMm(),
      frameThicknessMm: this.frameThicknessMm(),
      frameWidthMm: this.frameWidthMm(),
      accessoryType: this.accessoryType(),
      racewaySlots: this.racewaySlots(),
      racewaySlotDiameterMm: this.racewaySlotDiameterMm(),
      screwDiameterMm: this.screwDiameterMm(),
      screwPitchMm: this.screwPitchMm(),
      swivelFootPad: this.swivelFootPad(),
      explodedView: this.explodedView(),
    };

    const { clampGeometry, boltGeometry, footPadGeometry } = generateClampGeometries(
      options,
      options.explodedView
    );

    // Frame Material: Industrial matte deep blue/charcoal
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      metalness: 0.15,
      roughness: 0.45,
    });
    const frameMesh = new THREE.Mesh(clampGeometry, frameMat);
    this.clampMeshGroup.add(frameMesh);

    // Bolt Material: Safety amber / gold
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.25,
      roughness: 0.35,
    });
    const boltMesh = new THREE.Mesh(boltGeometry, boltMat);
    this.clampMeshGroup.add(boltMesh);

    // Foot Pad Material: Dark protective pad
    if (this.swivelFootPad() && footPadGeometry.attributes['position']?.count > 0) {
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.05,
        roughness: 0.75,
      });
      const padMesh = new THREE.Mesh(footPadGeometry, padMat);
      this.clampMeshGroup.add(padMesh);
    }

    // Update desk representation thickness and location
    if (this.deskPreviewMesh) {
      this.deskPreviewMesh.geometry.dispose();
      this.deskPreviewMesh.geometry = new THREE.BoxGeometry(
        options.throatDepthMm + 60,
        options.deskThicknessMm,
        options.frameWidthMm + 40
      );
      this.deskPreviewMesh.position.set(
        (options.throatDepthMm + 60) / 2,
        options.deskThicknessMm / 2,
        0
      );
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

    // Clamp vertical tilt
    this.meshRotationX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.meshRotationX));

    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.cameraDistance = Math.max(90, Math.min(350, this.cameraDistance + event.deltaY * 0.15));
    this.updateCameraPosition();
  }
}
