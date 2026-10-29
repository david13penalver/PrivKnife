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
import { Dropzone } from '../../../components/dropzone/dropzone';
import {
  buildCookieCutterAssembly,
  generateCutterZipBundle,
  generateDualPart3mf,
  generateStlFiles,
  traceImageContours,
} from './engine';
import {
  DEFAULT_COOKIE_CUTTER_CONFIG,
  SAMPLE_COOKIE_PRESETS,
} from './test-fixtures';
import {
  ContourData,
  CookieCutterConfig,
  PresetShape,
  ViewMode,
} from './types';

@Component({
  selector: 'app-cookie-cutter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Card, Dropzone, TranslatePipe],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1280px; padding: 0 16px;">
      <!-- Tool Header & Privacy Indicator -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">{{ 'tools.cookieCutter.name' | translate }}</h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 760px; color: var(--color-text-secondary); font-size: 1.1rem;">
          {{ 'tools.cookieCutter.description' | translate }}
        </p>
      </div>

      <!-- Presets Selector Ribbon -->
      <div class="l-columns__area g--margin-bottom-5">
        <div class="c-card" style="padding: 12px 16px;">
          <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary);">Sample Shapes:</span>
              @for (preset of samplePresets; track preset.id) {
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="selectedPresetId() === preset.id"
                  [class.c-button--outline]="selectedPresetId() !== preset.id"
                  (click)="loadPreset(preset)">
                  {{ preset.icon }} {{ preset.name }}
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

      <!-- Main Layout: Left Controls vs Right 3D Viewport -->
      <div class="l-columns l-columns--12 cookie-cutter-workspace" style="gap: 24px; align-items: start;">
        
        <!-- Controls Column (5 cols) -->
        <div class="l-columns__area l-columns__area--span-5">
          <div class="l-columns l-columns--1" style="gap: 16px;">
            
            <!-- 1. Input Graphic & Vector Tracing -->
            <app-card title="1. Silhouette Image / Vector Upload">
              <div class="l-columns l-columns--1" style="gap: 14px;">
                <app-dropzone
                  label="Drop black & white graphic here or click to browse"
                  hint="PNG, JPG, SVG silhouette — processed locally with zero server upload"
                  accept="image/png,image/jpeg,image/svg+xml"
                  [multiple]="false"
                  (filesSelected)="onImageFileSelected($event)">
                </app-dropzone>

                @if (hasCustomImage()) {
                  <div style="padding-top: 10px; border-top: 1px solid var(--color-border);">
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Binarization Threshold:</span>
                      <span style="font-family: monospace;">{{ config().threshold }}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="240"
                      step="5"
                      [ngModel]="config().threshold"
                      (ngModelChange)="updateThreshold($event)"
                      style="width: 100%; margin-top: 4px;" />

                    <div class="g--flex-center" style="justify-content: space-between; margin-top: 8px;">
                      <label style="font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                        <input
                          type="checkbox"
                          [checked]="config().invertImage"
                          (change)="toggleInvert($event)" />
                        Invert Foreground / Background
                      </label>
                      <button
                        type="button"
                        class="c-button c-button--small c-button--outline"
                        (click)="clearCustomImage()">
                        Clear Image
                      </button>
                    </div>
                  </div>
                }
              </div>
            </app-card>

            <!-- 2. Dimensions & Cutter Geometry -->
            <app-card title="2. Cutter &amp; Stamp Dimensions">
              <div class="l-columns l-columns--1" style="gap: 14px;">
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                    <span style="font-weight: 600;">Target Size (Longest Dimension):</span>
                    <span style="font-family: monospace;">{{ config().targetSizeMm }} mm</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="130"
                    step="5"
                    [ngModel]="config().targetSizeMm"
                    (ngModelChange)="updateTargetSize($event)"
                    style="width: 100%; margin-top: 4px;" />
                </div>

                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Blade Height:</span>
                      <span style="font-family: monospace;">{{ config().bladeHeightMm }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="24"
                      step="1"
                      [ngModel]="config().bladeHeightMm"
                      (ngModelChange)="updateBladeHeight($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>

                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Blade Wall:</span>
                      <span style="font-family: monospace;">{{ config().bladeWallMm.toFixed(1) }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.8"
                      step="0.1"
                      [ngModel]="config().bladeWallMm"
                      (ngModelChange)="updateBladeWall($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>
                </div>

                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Press Flange Width:</span>
                      <span style="font-family: monospace;">{{ config().flangeWidthMm.toFixed(1) }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="3.0"
                      max="8.0"
                      step="0.5"
                      [ngModel]="config().flangeWidthMm"
                      (ngModelChange)="updateFlangeWidth($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>

                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Stamp Clearance:</span>
                      <span style="font-family: monospace;">{{ config().stampClearanceMm.toFixed(1) }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="2.0"
                      step="0.2"
                      [ngModel]="config().stampClearanceMm"
                      (ngModelChange)="updateClearance($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>
                </div>

                <div style="padding-top: 6px;">
                  <label style="font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                    <input
                      type="checkbox"
                      [checked]="config().stampHandleEnabled"
                      (change)="toggleHandle($event)" />
                    Include Rear Grip Handle on Stamp Plate
                  </label>
                </div>
              </div>
            </app-card>

            <!-- 3. PLA Filament Colors -->
            <app-card title="3. Material Preview Colors">
              <div class="g--flex-center" style="gap: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 120px;">
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">
                    Cutter Blade Color:
                  </label>
                  <div class="g--flex-center" style="gap: 8px;">
                    <input
                      type="color"
                      [ngModel]="config().cutterColor"
                      (ngModelChange)="updateCutterColor($event)"
                      style="width: 36px; height: 36px; padding: 0; border: none; cursor: pointer; border-radius: 4px;" />
                    <span style="font-family: monospace; font-size: 0.85rem;">{{ config().cutterColor }}</span>
                  </div>
                </div>

                <div style="flex: 1; min-width: 120px;">
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">
                    Impression Stamp Color:
                  </label>
                  <div class="g--flex-center" style="gap: 8px;">
                    <input
                      type="color"
                      [ngModel]="config().stampColor"
                      (ngModelChange)="updateStampColor($event)"
                      style="width: 36px; height: 36px; padding: 0; border: none; cursor: pointer; border-radius: 4px;" />
                    <span style="font-family: monospace; font-size: 0.85rem;">{{ config().stampColor }}</span>
                  </div>
                </div>
              </div>
            </app-card>

            <!-- 4. Slicing & Food-Safety Diagnostics -->
            <app-card title="4. Slicing &amp; Filament Estimation">
              <div class="l-columns l-columns--1" style="gap: 10px; font-size: 0.85rem;">
                <div class="g--flex-center" style="justify-content: space-between;">
                  <span style="font-weight: 600;">Cutter Outer Dimensions:</span>
                  <span style="font-family: monospace;">
                    {{ metrics().cutterDimensionsMm.width }} &times;
                    {{ metrics().cutterDimensionsMm.height }} &times;
                    {{ metrics().cutterDimensionsMm.depth }} mm
                  </span>
                </div>

                <div class="g--flex-center" style="justify-content: space-between;">
                  <span style="font-weight: 600;">Estimated Filament:</span>
                  <span style="font-family: monospace;">~{{ metrics().estimatedFilamentGrams }} g PLA</span>
                </div>

                <div style="padding: 8px 12px; background: rgba(225, 29, 72, 0.08); border-radius: 6px; border-left: 3px solid var(--color-primary);">
                  <strong style="color: var(--color-primary);">🍪 Slicer &amp; Food-Safety Tips:</strong><br />
                  &bull; Use <strong>Food-Safe PLA or PETG</strong> filament.<br />
                  &bull; Set <strong>3&ndash;4 wall perimeters</strong> so the blade wall is 100% solid.<br />
                  &bull; Hand wash only in lukewarm water (PLA warps above 55&deg;C).
                </div>
              </div>
            </app-card>
          </div>
        </div>

        <!-- 3D Viewport Column (7 cols) -->
        <div class="l-columns__area l-columns__area--span-7">
          <div class="c-card" style="padding: 16px;">
            
            <!-- View Mode Switcher -->
            <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div class="g--flex-center" style="gap: 6px; flex-wrap: wrap;">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="viewMode() === 'assembly'"
                  [class.c-button--outline]="viewMode() !== 'assembly'"
                  (click)="setViewMode('assembly')">
                  Both (Assembly)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="viewMode() === 'side-by-side'"
                  [class.c-button--outline]="viewMode() !== 'side-by-side'"
                  (click)="setViewMode('side-by-side')">
                  Side-by-Side (Print Bed)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="viewMode() === 'cutter-only'"
                  [class.c-button--outline]="viewMode() !== 'cutter-only'"
                  (click)="setViewMode('cutter-only')">
                  Cutter Blade
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="viewMode() === 'stamp-only'"
                  [class.c-button--outline]="viewMode() !== 'stamp-only'"
                  (click)="setViewMode('stamp-only')">
                  Stamp Plate
                </button>
              </div>

              <div class="g--flex-center" style="gap: 6px;">
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  (click)="toggleAutoRotate()">
                  {{ autoRotate() ? '⏸ Pause' : '▶ Spin' }}
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

              <div
                style="position: absolute; bottom: 10px; left: 12px; font-size: 0.75rem; color: #94a3b8; pointer-events: none; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px;">
                🖱️ Left Drag: Rotate &bull; Right Drag: Pan &bull; Scroll: Zoom
              </div>
            </div>

            <!-- Export Actions Bar -->
            <div class="g--margin-top-5">
              <div class="g--flex-center" style="gap: 12px; flex-wrap: wrap;">
                <button
                  type="button"
                  class="c-button c-button--primary"
                  style="flex: 1; min-width: 180px;"
                  [disabled]="isExporting()"
                  (click)="export3mf()">
                  {{ isExporting() ? '⏳ Generating...' : '📦 Export Dual-Part .3MF' }}
                </button>

                <button
                  type="button"
                  class="c-button c-button--secondary"
                  style="flex: 1; min-width: 140px;"
                  [disabled]="isExporting()"
                  (click)="exportCutterStl()">
                  🔪 Cutter .STL
                </button>

                <button
                  type="button"
                  class="c-button c-button--secondary"
                  style="flex: 1; min-width: 140px;"
                  [disabled]="isExporting()"
                  (click)="exportStampStl()">
                  🏷️ Stamp .STL
                </button>

                <button
                  type="button"
                  class="c-button c-button--outline"
                  [disabled]="isExporting()"
                  (click)="exportPng()">
                  📷 PNG
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
        .cookie-cutter-workspace {
          grid-template-columns: 1fr !important;
        }

        .cookie-cutter-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class CookieCutterComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewportCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewportContainer') containerRef!: ElementRef<HTMLDivElement>;

  readonly samplePresets = SAMPLE_COOKIE_PRESETS;

  readonly config = signal<CookieCutterConfig>({ ...DEFAULT_COOKIE_CUTTER_CONFIG });
  readonly selectedPresetId = signal<string | null>('gingerbread-man');
  readonly customImageData = signal<ImageData | null>(null);
  readonly hasCustomImage = computed(() => this.customImageData() !== null);
  readonly viewMode = signal<ViewMode>('assembly');
  readonly autoRotate = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);

  // Active shape data
  readonly activeContourData = computed(() => {
    if (this.customImageData()) {
      return traceImageContours(
        this.customImageData(),
        this.config().threshold,
        this.config().invertImage
      );
    }
    const currentPreset =
      this.samplePresets.find((p) => p.id === this.selectedPresetId()) ||
      this.samplePresets[0];
    return currentPreset;
  });

  // Model assembly
  readonly modelData = computed(() => {
    return buildCookieCutterAssembly(this.activeContourData(), this.config());
  });

  readonly metrics = computed(() => {
    return this.modelData().metrics;
  });

  // Three.js runtime
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

  // --- Mutators ---

  loadPreset(preset: PresetShape): void {
    this.customImageData.set(null);
    this.selectedPresetId.set(preset.id);
    this.updateThreeModel();
  }

  resetToDefaults(): void {
    this.customImageData.set(null);
    this.selectedPresetId.set('gingerbread-man');
    this.config.set({ ...DEFAULT_COOKIE_CUTTER_CONFIG });
    this.viewMode.set('assembly');
    this.updateThreeModel();
    this.resetCamera();
  }

  onImageFileSelected(files: File[]): void {
    if (files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = 160;
        offscreen.height = 160;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 160, 160);
          const imgData = ctx.getImageData(0, 0, 160, 160);
          this.selectedPresetId.set(null);
          this.customImageData.set(imgData);
          this.updateThreeModel();
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearCustomImage(): void {
    this.customImageData.set(null);
    this.selectedPresetId.set('gingerbread-man');
    this.updateThreeModel();
  }

  updateThreshold(val: number): void {
    this.config.update((c) => ({ ...c, threshold: Number(val) }));
    this.updateThreeModel();
  }

  toggleInvert(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.config.update((c) => ({ ...c, invertImage: checked }));
    this.updateThreeModel();
  }

  updateTargetSize(val: number): void {
    this.config.update((c) => ({ ...c, targetSizeMm: Number(val) }));
    this.updateThreeModel();
  }

  updateBladeHeight(val: number): void {
    this.config.update((c) => ({ ...c, bladeHeightMm: Number(val) }));
    this.updateThreeModel();
  }

  updateBladeWall(val: number): void {
    this.config.update((c) => ({ ...c, bladeWallMm: Number(val) }));
    this.updateThreeModel();
  }

  updateFlangeWidth(val: number): void {
    this.config.update((c) => ({ ...c, flangeWidthMm: Number(val) }));
    this.updateThreeModel();
  }

  updateClearance(val: number): void {
    this.config.update((c) => ({ ...c, stampClearanceMm: Number(val) }));
    this.updateThreeModel();
  }

  toggleHandle(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.config.update((c) => ({ ...c, stampHandleEnabled: checked }));
    this.updateThreeModel();
  }

  updateCutterColor(cutterColor: string): void {
    this.config.update((c) => ({ ...c, cutterColor }));
    this.updateMaterials();
  }

  updateStampColor(stampColor: string): void {
    this.config.update((c) => ({ ...c, stampColor }));
    this.updateMaterials();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.applyViewModeLayout();
  }

  toggleAutoRotate(): void {
    this.autoRotate.update((v) => !v);
    if (this.controls) {
      this.controls.autoRotate = this.autoRotate();
    }
  }

  resetCamera(): void {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(0, 45, 110);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  // --- Three.js Scene Setup ---

  private initThreeScene(): void {
    if (!this.canvasRef || typeof window === 'undefined') return;
    const canvas = this.canvasRef.nativeElement;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      return; // Safe no-op in headless test environment
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0f17);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dir1.position.set(40, 80, 70);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x94a3b8, 0.5);
    dir2.position.set(-50, -40, -40);
    this.scene.add(dir2);

    // Grid
    this.gridHelper = new THREE.GridHelper(160, 32, 0x334155, 0x1e293b);
    this.gridHelper.position.y = -15;
    this.scene.add(this.gridHelper);

    // Camera
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);
    this.camera.position.set(0, 45, 110);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

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

    if (this.currentMeshGroup) {
      this.scene.remove(this.currentMeshGroup);
      this.disposeThreeGroup(this.currentMeshGroup);
      this.currentMeshGroup = null;
    }

    const { combinedGroup } = this.modelData();
    this.currentMeshGroup = combinedGroup;
    this.scene.add(this.currentMeshGroup);
    this.applyViewModeLayout();
  }

  private updateMaterials(): void {
    if (!this.currentMeshGroup) {
      this.updateThreeModel();
      return;
    }

    const cutter = this.currentMeshGroup.getObjectByName('cutter') as THREE.Mesh;
    const stamp = this.currentMeshGroup.getObjectByName('stamp') as THREE.Mesh;

    if (cutter && cutter.material instanceof THREE.MeshStandardMaterial) {
      cutter.material.color.set(this.config().cutterColor);
    }

    if (stamp && stamp.material instanceof THREE.MeshStandardMaterial) {
      stamp.material.color.set(this.config().stampColor);
    }
  }

  private applyViewModeLayout(): void {
    if (!this.currentMeshGroup) return;

    const cutter = this.currentMeshGroup.getObjectByName('cutter') as THREE.Mesh;
    const stamp = this.currentMeshGroup.getObjectByName('stamp') as THREE.Mesh;
    if (!cutter || !stamp) return;

    const mode = this.viewMode();
    const targetSize = this.config().targetSizeMm;

    switch (mode) {
      case 'assembly':
        cutter.visible = true;
        stamp.visible = true;
        cutter.position.set(0, 0, 0);
        stamp.position.set(0, 0, 0);
        break;

      case 'side-by-side':
        cutter.visible = true;
        stamp.visible = true;
        cutter.position.set(-targetSize * 0.65, 0, 0);
        stamp.position.set(targetSize * 0.65, 0, 0);
        break;

      case 'cutter-only':
        cutter.visible = true;
        stamp.visible = false;
        cutter.position.set(0, 0, 0);
        break;

      case 'stamp-only':
        cutter.visible = false;
        stamp.visible = true;
        stamp.position.set(0, 0, 0);
        break;
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

  // --- Export Operations ---

  async export3mf(): Promise<void> {
    this.isExporting.set(true);
    try {
      const { cutterGeom, stampGeom } = this.modelData();
      const blob = await generateDualPart3mf(cutterGeom, stampGeom, this.config());
      this.triggerDownload(blob, `cookie_cutter_${this.selectedPresetId() || 'custom'}_dual_part.3mf`);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportCutterStl(): void {
    this.isExporting.set(true);
    try {
      const { cutterGeom, stampGeom } = this.modelData();
      const { cutterStl } = generateStlFiles(cutterGeom, stampGeom);
      this.triggerDownload(cutterStl, `cookie_cutter_${this.selectedPresetId() || 'custom'}_blade.stl`);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportStampStl(): void {
    this.isExporting.set(true);
    try {
      const { cutterGeom, stampGeom } = this.modelData();
      const { stampStl } = generateStlFiles(cutterGeom, stampGeom);
      this.triggerDownload(stampStl, `cookie_cutter_${this.selectedPresetId() || 'custom'}_stamp.stl`);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportPng(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const blob = dataUrlToBlob(dataUrl);
    this.triggerDownload(blob, `cookie_cutter_${this.selectedPresetId() || 'custom'}_preview.png`);
  }

  async exportBundleZip(): Promise<void> {
    this.isExporting.set(true);
    try {
      const { cutterGeom, stampGeom } = this.modelData();
      let previewBlob: Blob | undefined;

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
        const dataUrl = this.renderer.domElement.toDataURL('image/png');
        previewBlob = dataUrlToBlob(dataUrl);
      }

      const zipBlob = await generateCutterZipBundle(
        cutterGeom,
        stampGeom,
        this.config(),
        previewBlob
      );

      this.triggerDownload(zipBlob, `cookie_cutter_${this.selectedPresetId() || 'custom'}_complete_bundle.zip`);
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
