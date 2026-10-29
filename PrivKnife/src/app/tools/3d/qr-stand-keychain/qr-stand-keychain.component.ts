import { TranslatePipe } from '../../../core/i18n';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Badge } from '../../../components/badge/badge';
import { Card } from '../../../components/card/card';
import {
  buildQrModel,
  generate3mf,
  generateExportBundleZip,
  generateQrMatrix,
  generateStl,
} from './engine';
import {
  COLOR_PRESETS,
  DEFAULT_QR_STAND_CONFIG,
  SAMPLE_PRESETS,
} from './test-fixtures';
import {
  BaseShape,
  ColorPreset,
  PresetModel,
  QrErrorCorrectionLevel,
  QrStandConfig,
} from './types';

@Component({
  selector: 'app-qr-stand-keychain',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Card, TranslatePipe],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1280px; padding: 0 16px;">
      <!-- Tool Header & Privacy Assurance -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">{{ 'tools.qrStandKeychain.name' | translate }}</h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 760px; color: var(--color-text-secondary); font-size: 1.1rem;">
          {{ 'tools.qrStandKeychain.description' | translate }}
        </p>
      </div>

      <!-- Presets Quick Ribbon -->
      <div class="l-columns__area g--margin-bottom-5">
        <div class="c-card" style="padding: 12px 16px;">
          <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary);">Model Presets:</span>
              @for (preset of samplePresets; track preset.id) {
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="selectedPresetId() === preset.id"
                  [class.c-button--outline]="selectedPresetId() !== preset.id"
                  (click)="loadPreset(preset)">
                  {{ preset.name }}
                </button>
              }
            </div>
            <button
              type="button"
              class="c-button c-button--small c-button--ghost"
              (click)="resetToDefaults()">
              ↺ Reset Defaults
            </button>
          </div>
        </div>
      </div>

      <!-- Main Studio Layout: Controls (Left) vs 3D Interactive Viewport (Right) -->
      <div class="l-columns l-columns--12 qr-stand-workspace" style="gap: 24px; align-items: start;">
        
        <!-- Controls Column (5 cols) -->
        <div class="l-columns__area l-columns__area--span-5">
          <div class="l-columns l-columns--1" style="gap: 16px;">
            
            <!-- 1. Content & QR Matrix -->
            <app-card title="1. Content & QR Payload">
              <div class="l-columns l-columns--1" style="gap: 14px;">
                <div>
                  <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600;">
                    Target URL or Text Payload:
                  </label>
                  <textarea
                    class="c-input"
                    rows="2"
                    [ngModel]="config().text"
                    (ngModelChange)="updateText($event)"
                    placeholder="https://yourwebsite.com or WIFI:..."
                    style="width: 100%; font-family: monospace; font-size: 0.9rem; resize: vertical;"></textarea>
                </div>

                <div class="g--flex-center" style="justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                  <div style="flex: 1; min-width: 140px;">
                    <label class="c-input__label" style="display: block; margin-bottom: 4px; font-size: 0.85rem; font-weight: 600;">
                      Error Correction:
                    </label>
                    <select
                      class="c-input"
                      [ngModel]="config().errorCorrection"
                      (ngModelChange)="updateErrorCorrection($event)"
                      style="width: 100%;">
                      <option value="L">L (7% recovery - lowest density)</option>
                      <option value="M">M (15% recovery - balanced)</option>
                      <option value="Q">Q (25% recovery - high density)</option>
                      <option value="H">H (30% recovery - highest)</option>
                    </select>
                  </div>
                </div>

                <!-- Subtext Extrusion -->
                <div style="padding-top: 8px; border-top: 1px solid var(--color-border);">
                  <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 6px;">
                    <label style="font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                      <input
                        type="checkbox"
                        [checked]="config().subtextEnabled"
                        (change)="toggleSubtext($event)" />
                      Extrude Label Subtext Below QR
                    </label>
                  </div>
                  @if (config().subtextEnabled) {
                    <input
                      type="text"
                      class="c-input"
                      [ngModel]="config().subtext"
                      (ngModelChange)="updateSubtext($event)"
                      placeholder="e.g. SCAN ME, WIFI: GUEST"
                      maxlength="24"
                      style="width: 100%; font-size: 0.9rem;" />
                  }
                </div>
              </div>
            </app-card>

            <!-- 2. Base Shape & 3D Dimensions -->
            <app-card title="2. 3D Model Shape & Dimensions">
              <div class="l-columns l-columns--1" style="gap: 14px;">
                <!-- Shape Selector -->
                <div>
                  <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem;">
                    Model Style:
                  </label>
                  <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
                    <button
                      type="button"
                      class="c-button"
                      style="flex: 1 1 90px;"
                      [class.c-button--primary]="config().baseShape === 'desk-stand'"
                      [class.c-button--outline]="config().baseShape !== 'desk-stand'"
                      (click)="setBaseShape('desk-stand')">
                      🖥️ Desk Stand
                    </button>
                    <button
                      type="button"
                      class="c-button"
                      style="flex: 1;"
                      [class.c-button--primary]="config().baseShape === 'keychain'"
                      [class.c-button--outline]="config().baseShape !== 'keychain'"
                      (click)="setBaseShape('keychain')">
                      🔑 Keychain
                    </button>
                    <button
                      type="button"
                      class="c-button"
                      style="flex: 1;"
                      [class.c-button--primary]="config().baseShape === 'flat-plaque'"
                      [class.c-button--outline]="config().baseShape !== 'flat-plaque'"
                      (click)="setBaseShape('flat-plaque')">
                      🏷️ Plaque
                    </button>
                  </div>
                </div>

                <!-- Sliders -->
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                    <span style="font-weight: 600;">Module Size (Block Width):</span>
                    <span style="font-family: monospace;">{{ config().moduleSizeMm.toFixed(1) }} mm</span>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="3.5"
                    step="0.1"
                    [ngModel]="config().moduleSizeMm"
                    (ngModelChange)="updateModuleSize($event)"
                    style="width: 100%; margin-top: 4px;" />
                  <span style="font-size: 0.75rem; color: var(--color-text-secondary);">
                    💡 Recommended: &ge; 1.6mm for standard 0.4mm nozzle printers.
                  </span>
                </div>

                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Base Thickness:</span>
                      <span style="font-family: monospace;">{{ config().baseThicknessMm.toFixed(1) }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="1.6"
                      max="5.0"
                      step="0.2"
                      [ngModel]="config().baseThicknessMm"
                      (ngModelChange)="updateBaseThickness($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>

                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Relief Height:</span>
                      <span style="font-family: monospace;">{{ config().qrReliefMm.toFixed(1) }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.4"
                      step="0.2"
                      [ngModel]="config().qrReliefMm"
                      (ngModelChange)="updateQrRelief($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>
                </div>

                @if (config().baseShape === 'desk-stand') {
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Stand Tilt Angle:</span>
                      <span style="font-family: monospace;">{{ config().standAngleDeg }}°</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="80"
                      step="1"
                      [ngModel]="config().standAngleDeg"
                      (ngModelChange)="updateStandAngle($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>
                }

                @if (config().baseShape === 'keychain') {
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Keyring Hole Diameter:</span>
                      <span style="font-family: monospace;">{{ config().keychainHoleDiameterMm.toFixed(1) }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="3.0"
                      max="6.0"
                      step="0.5"
                      [ngModel]="config().keychainHoleDiameterMm"
                      (ngModelChange)="updateKeychainHole($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>
                }
              </div>
            </app-card>

            <!-- 3. Multi-Color Materials & Filaments -->
            <app-card title="3. Dual-Color Filament Preview">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <div class="g--flex-center" style="gap: 16px; flex-wrap: wrap;">
                  <!-- Base Color -->
                  <div style="flex: 1; min-width: 120px;">
                    <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">
                      Plate Color:
                    </label>
                    <div class="g--flex-center" style="gap: 8px;">
                      <input
                        type="color"
                        [ngModel]="config().baseColor"
                        (ngModelChange)="updateBaseColor($event)"
                        style="width: 36px; height: 36px; padding: 0; border: none; cursor: pointer; border-radius: 4px;" />
                      <span style="font-family: monospace; font-size: 0.85rem;">{{ config().baseColor }}</span>
                    </div>
                  </div>

                  <!-- QR Color -->
                  <div style="flex: 1; min-width: 120px;">
                    <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">
                      QR Code Color:
                    </label>
                    <div class="g--flex-center" style="gap: 8px;">
                      <input
                        type="color"
                        [ngModel]="config().qrColor"
                        (ngModelChange)="updateQrColor($event)"
                        style="width: 36px; height: 36px; padding: 0; border: none; cursor: pointer; border-radius: 4px;" />
                      <span style="font-family: monospace; font-size: 0.85rem;">{{ config().qrColor }}</span>
                    </div>
                  </div>
                </div>

                <!-- Palette Shortcuts -->
                <div class="g--flex-center" style="gap: 6px; flex-wrap: wrap; margin-top: 4px;">
                  <span style="font-size: 0.75rem; color: var(--color-text-secondary);">Duo Presets:</span>
                  @for (palette of colorPresets; track palette.name) {
                    <button
                      type="button"
                      class="c-button c-button--small c-button--outline"
                      style="font-size: 0.75rem; padding: 2px 8px;"
                      (click)="applyColorPreset(palette)">
                      <span [style.background-color]="palette.baseColor" style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; border: 1px solid #999; margin-right: 2px;"></span>
                      <span [style.background-color]="palette.qrColor" style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; border: 1px solid #999; margin-right: 4px;"></span>
                      {{ palette.name }}
                    </button>
                  }
                </div>
              </div>
            </app-card>

            <!-- 4. Scannability & Slicer Report Card -->
            <app-card title="4. Slicing &amp; Scannability Analysis">
              <div class="l-columns l-columns--1" style="gap: 10px; font-size: 0.85rem;">
                <div class="g--flex-center" style="justify-content: space-between;">
                  <span style="font-weight: 600;">Camera Scannability:</span>
                  @if (scannability().isScannable) {
                    <app-badge variant="success">✅ Verified Scannable ({{ scannability().qualityScore }}%)</app-badge>
                  } @else {
                    <app-badge variant="danger">⚠️ Scan Risk ({{ scannability().qualityScore }}%)</app-badge>
                  }
                </div>

                <div class="g--flex-center" style="justify-content: space-between;">
                  <span style="font-weight: 600;">Overall Dimensions:</span>
                  <span style="font-family: monospace;">
                    {{ scannability().physicalDimensions.widthMm }} &times;
                    {{ scannability().physicalDimensions.heightMm }} &times;
                    {{ scannability().physicalDimensions.depthMm }} mm
                  </span>
                </div>

                <div style="padding: 8px 12px; background: rgba(37, 99, 235, 0.08); border-radius: 6px; border-left: 3px solid var(--color-primary);">
                  <strong style="color: var(--color-primary);">🖨️ Slicer Tip:</strong><br />
                  Single Extruder: Add pause at <strong>Layer {{ scannability().filamentSwapLayer }} (Z = {{ config().baseThicknessMm.toFixed(2) }} mm)</strong> to swap filament.<br />
                  AMS / MMU: Import <strong>.3mf</strong> for instant multi-material color assignment.
                </div>

                <ul style="margin: 0; padding-left: 18px; font-size: 0.8rem; color: var(--color-text-secondary);">
                  @for (note of scannability().notes; track note) {
                    <li>{{ note }}</li>
                  }
                </ul>
              </div>
            </app-card>
          </div>
        </div>

        <!-- 3D Viewport & Action Column (7 cols) -->
        <div class="l-columns__area l-columns__area--span-7">
          <div class="c-card" style="padding: 16px;">
            
            <!-- Viewport Header Toolbar -->
            <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div class="g--flex-center" style="gap: 8px;">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="viewOrientation() === 'standing'"
                  [class.c-button--outline]="viewOrientation() !== 'standing'"
                  (click)="setViewOrientation('standing')">
                  Tabletop View
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="viewOrientation() === 'flat'"
                  [class.c-button--outline]="viewOrientation() !== 'flat'"
                  (click)="setViewOrientation('flat')">
                  Build Plate (Flat)
                </button>
              </div>

              <div class="g--flex-center" style="gap: 6px;">
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  (click)="toggleAutoRotate()">
                  {{ autoRotate() ? '⏸ Pause Spin' : '▶ Auto Spin' }}
                </button>
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  (click)="resetCamera()">
                  Reset View
                </button>
              </div>
            </div>

            <!-- Three.js Canvas Container -->
            <div
              #viewportContainer
              style="width: 100%; height: 460px; background: #0b0f17; border-radius: 8px; position: relative; overflow: hidden;">
              <canvas
                #viewportCanvas
                style="width: 100%; height: 100%; display: block; outline: none;">
              </canvas>
              
              <!-- Viewport Overlay Hints -->
              <div
                style="position: absolute; bottom: 10px; left: 12px; font-size: 0.75rem; color: #94a3b8; pointer-events: none; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px;">
                🖱️ Left Drag: Rotate &bull; Right Drag: Pan &bull; Scroll: Zoom
              </div>
            </div>

            <!-- Export Buttons Action Bar -->
            <div class="g--margin-top-5">
              <div class="g--flex-center" style="gap: 12px; flex-wrap: wrap;">
                <button
                  type="button"
                  class="c-button c-button--primary"
                  style="flex: 1; min-width: 180px;"
                  [disabled]="isExporting()"
                  (click)="export3mf()">
                  {{ isExporting() ? '⏳ Generating...' : '📦 Export Dual-Color .3MF' }}
                </button>

                <button
                  type="button"
                  class="c-button c-button--secondary"
                  style="flex: 1; min-width: 160px;"
                  [disabled]="isExporting()"
                  (click)="exportStl()">
                  🖨️ Export Single .STL
                </button>

                <button
                  type="button"
                  class="c-button c-button--outline"
                  [disabled]="isExporting()"
                  (click)="exportPng()">
                  📷 High-Res PNG
                </button>

                <button
                  type="button"
                  class="c-button c-button--outline"
                  [disabled]="isExporting()"
                  (click)="exportBundleZip()">
                  🗂️ Full Zip Bundle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @media (max-width: 1024px) {
        .qr-stand-workspace {
          grid-template-columns: 1fr !important;
        }

        .qr-stand-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class QrStandKeychainComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewportCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewportContainer') containerRef!: ElementRef<HTMLDivElement>;

  readonly samplePresets = SAMPLE_PRESETS;
  readonly colorPresets = COLOR_PRESETS;

  readonly config = signal<QrStandConfig>({ ...DEFAULT_QR_STAND_CONFIG });
  readonly selectedPresetId = signal<string | null>('wifi-desk-stand');
  readonly viewOrientation = signal<'standing' | 'flat'>('standing');
  readonly autoRotate = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);

  // Computed models
  readonly qrMatrix = computed(() => {
    return generateQrMatrix(this.config().text, this.config().errorCorrection);
  });

  readonly modelData = computed(() => {
    return buildQrModel(this.qrMatrix(), this.config());
  });

  readonly scannability = computed(() => {
    return this.modelData().scannability;
  });

  // Three.js runtime references
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private currentMeshGroup: THREE.Group | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private animFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    this.initThreeScene();
    this.updateThreeModel();
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.disposeThreeGroup(this.currentMeshGroup);
  }

  // --- Configuration Mutators ---

  updateText(text: string): void {
    this.selectedPresetId.set(null);
    this.config.update((c) => ({ ...c, text }));
    this.updateThreeModel();
  }

  updateErrorCorrection(ecl: QrErrorCorrectionLevel): void {
    this.selectedPresetId.set(null);
    this.config.update((c) => ({ ...c, errorCorrection: ecl }));
    this.updateThreeModel();
  }

  toggleSubtext(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.config.update((c) => ({ ...c, subtextEnabled: checked }));
    this.updateThreeModel();
  }

  updateSubtext(subtext: string): void {
    this.config.update((c) => ({ ...c, subtext }));
    this.updateThreeModel();
  }

  setBaseShape(baseShape: BaseShape): void {
    this.selectedPresetId.set(null);
    this.config.update((c) => ({ ...c, baseShape }));
    this.updateThreeModel();
  }

  updateModuleSize(val: number): void {
    this.config.update((c) => ({ ...c, moduleSizeMm: Number(val) }));
    this.updateThreeModel();
  }

  updateBaseThickness(val: number): void {
    this.config.update((c) => ({ ...c, baseThicknessMm: Number(val) }));
    this.updateThreeModel();
  }

  updateQrRelief(val: number): void {
    this.config.update((c) => ({ ...c, qrReliefMm: Number(val) }));
    this.updateThreeModel();
  }

  updateStandAngle(val: number): void {
    this.config.update((c) => ({ ...c, standAngleDeg: Number(val) }));
    this.updateThreeModel();
  }

  updateKeychainHole(val: number): void {
    this.config.update((c) => ({ ...c, keychainHoleDiameterMm: Number(val) }));
    this.updateThreeModel();
  }

  updateBaseColor(baseColor: string): void {
    this.config.update((c) => ({ ...c, baseColor }));
    this.updateThreeMaterials();
  }

  updateQrColor(qrColor: string): void {
    this.config.update((c) => ({ ...c, qrColor }));
    this.updateThreeMaterials();
  }

  applyColorPreset(palette: ColorPreset): void {
    this.config.update((c) => ({
      ...c,
      baseColor: palette.baseColor,
      qrColor: palette.qrColor,
    }));
    this.updateThreeMaterials();
  }

  loadPreset(preset: PresetModel): void {
    this.selectedPresetId.set(preset.id);
    this.config.set({ ...DEFAULT_QR_STAND_CONFIG, ...preset.config });
    this.updateThreeModel();
  }

  resetToDefaults(): void {
    this.selectedPresetId.set(null);
    this.config.set({ ...DEFAULT_QR_STAND_CONFIG });
    this.viewOrientation.set('standing');
    this.updateThreeModel();
    this.resetCamera();
  }

  setViewOrientation(orientation: 'standing' | 'flat'): void {
    this.viewOrientation.set(orientation);
    this.applyOrientationTransform();
  }

  toggleAutoRotate(): void {
    this.autoRotate.update((v) => !v);
    if (this.controls) {
      this.controls.autoRotate = this.autoRotate();
    }
  }

  resetCamera(): void {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(0, 45, 95);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  // --- Three.js WebGL Scene Operations ---

  private initThreeScene(): void {
    if (!this.canvasRef || typeof window === 'undefined') return;
    const canvas = this.canvasRef.nativeElement;

    // Check WebGL availability safely (guards headless / jsdom test environments)
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      return; // Gracefully no-op in headless test environment
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0f17);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(50, 80, 60);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 0.6);
    dirLight2.position.set(-50, -30, -40);
    this.scene.add(dirLight2);

    // Grid Floor
    this.gridHelper = new THREE.GridHelper(160, 32, 0x334155, 0x1e293b);
    this.gridHelper.position.y = -20;
    this.scene.add(this.gridHelper);

    // Camera & Controls
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);
    this.camera.position.set(0, 45, 95);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 250;
    this.controls.minDistance = 20;

    // Responsive Canvas Resizing
    if (this.containerRef) {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.containerRef.nativeElement);
    }

    this.animate();
  }

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    if (this.controls) {
      this.controls.update();
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private onResize(): void {
    if (!this.containerRef || !this.renderer || !this.camera) return;
    const width = this.containerRef.nativeElement.clientWidth;
    const height = this.containerRef.nativeElement.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private updateThreeModel(): void {
    if (!this.scene) return;

    // Dispose old mesh
    if (this.currentMeshGroup) {
      this.scene.remove(this.currentMeshGroup);
      this.disposeThreeGroup(this.currentMeshGroup);
      this.currentMeshGroup = null;
    }

    const { combinedMesh } = this.modelData();
    this.currentMeshGroup = combinedMesh;
    this.scene.add(this.currentMeshGroup);
    this.applyOrientationTransform();
  }

  private updateThreeMaterials(): void {
    if (!this.currentMeshGroup) {
      this.updateThreeModel();
      return;
    }

    const baseMesh = this.currentMeshGroup.children[0] as THREE.Mesh;
    const qrMesh = this.currentMeshGroup.children[1] as THREE.Mesh;

    if (baseMesh && baseMesh.material instanceof THREE.MeshStandardMaterial) {
      baseMesh.material.color.set(this.config().baseColor);
    }

    if (qrMesh && qrMesh.material instanceof THREE.MeshStandardMaterial) {
      qrMesh.material.color.set(this.config().qrColor);
    }
  }

  private applyOrientationTransform(): void {
    if (!this.currentMeshGroup) return;

    if (this.viewOrientation() === 'standing' && this.config().baseShape === 'desk-stand') {
      const tilt = ((90 - this.config().standAngleDeg) * Math.PI) / 180;
      this.currentMeshGroup.rotation.set(-tilt, 0, 0);
    } else {
      this.currentMeshGroup.rotation.set(0, 0, 0);
    }
  }

  private disposeThreeGroup(group: THREE.Group | null): void {
    if (!group) return;
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  // --- File Export Actions ---

  async export3mf(): Promise<void> {
    this.isExporting.set(true);
    try {
      const { baseGeometry, qrGeometry } = this.modelData();
      const blob = await generate3mf(baseGeometry, qrGeometry, this.config());
      this.triggerDownload(blob, `qr_stand_${this.config().baseShape}_dual_color.3mf`);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportStl(): void {
    this.isExporting.set(true);
    try {
      const { baseGeometry, qrGeometry } = this.modelData();
      const blob = generateStl(baseGeometry, qrGeometry);
      this.triggerDownload(blob, `qr_stand_${this.config().baseShape}_unified.stl`);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportPng(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const blob = dataUrlToBlob(dataUrl);
    this.triggerDownload(blob, `qr_stand_${this.config().baseShape}_preview.png`);
  }

  async exportBundleZip(): Promise<void> {
    this.isExporting.set(true);
    try {
      const { baseGeometry, qrGeometry } = this.modelData();
      let previewBlob: Blob | undefined;

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
        const dataUrl = this.renderer.domElement.toDataURL('image/png');
        previewBlob = dataUrlToBlob(dataUrl);
      }

      const zipBlob = await generateExportBundleZip(
        baseGeometry,
        qrGeometry,
        this.config(),
        previewBlob
      );

      this.triggerDownload(zipBlob, `qr_stand_${this.config().baseShape}_complete_bundle.zip`);
    } finally {
      this.isExporting.set(false);
    }
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

