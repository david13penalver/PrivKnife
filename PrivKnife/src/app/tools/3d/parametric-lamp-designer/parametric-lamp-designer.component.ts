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
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Badge } from '../../../components/badge/badge';
import { Card } from '../../../components/card/card';
import { TranslatePipe } from '../../../core/i18n';
import {
  calculateLampMetrics,
  computeLampMetrics,
  exportBinarySTL,
  export3mf,
  generateLampShadeGeometry,
} from './engine';
import {
  DEFAULT_LAMP_CONFIG,
  FILAMENT_OPTIONS,
  SAMPLE_LAMP_PRESETS,
  SOCKET_DIAMETERS,
} from './test-fixtures';
import {
  CurveType,
  FilamentOption,
  LampConfig,
  LampMetrics,
  LampWorkerRequest,
  LampWorkerResponse,
  MountPosition,
  PresetLampShade,
  PrintMode,
  RibProfile,
  SocketPreset,
} from './types';

@Component({
  selector: 'app-parametric-lamp-designer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DecimalPipe, Badge, Card, TranslatePipe],
  styleUrl: './parametric-lamp-designer.component.scss',
  template: `
    <div class="c-lamp-designer">
      <!-- Header & Privacy Indicator -->
      <div class="g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">
          {{ 'tools.parametricLampDesigner.name' | translate }}
        </h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 820px; color: var(--color-text-secondary); font-size: 1.05rem;">
          {{ 'tools.parametricLampDesigner.description' | translate }}
        </p>
      </div>

      <!-- Presets Ribbon -->
      <div class="g--margin-bottom-5">
        <div class="c-card" style="padding: 12px 16px;">
          <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary);">Curated Presets:</span>
              @for (preset of presets; track preset.id) {
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

      <!-- Main Layout: Controls Left vs 3D Viewport Right -->
      <div class="c-lamp-designer__workspace">
        
        <!-- Controls Column -->
        <div class="c-lamp-designer__controls-column">
          <div class="l-columns l-columns--1" style="gap: 16px;">
            
            <!-- 1. Silhouette & Dimensions -->
            <app-card title="1. Silhouette &amp; Proportions">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                    Silhouette Profile:
                  </label>
                  <select
                    class="c-input__control"
                    style="width: 100%;"
                    [ngModel]="config().curveType"
                    (ngModelChange)="updateConfig({ curveType: $event })">
                    <option value="spline">Spline (Organic Bezier)</option>
                    <option value="conical">Conical (Two-Stage Flared)</option>
                    <option value="hourglass">Hourglass (Pinched Waist)</option>
                    <option value="bulbous">Bulbous (Rounded Lantern)</option>
                    <option value="scurve">S-Curve (Bell Flare)</option>
                  </select>
                </div>

                <!-- Height -->
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                    <span style="font-weight: 600;">Total Height:</span>
                    <span style="font-family: monospace;">{{ config().height }} mm</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="280"
                    step="5"
                    class="c-input__slider"
                    style="width: 100%;"
                    [ngModel]="config().height"
                    (ngModelChange)="updateConfig({ height: +$event })" />
                </div>

                <!-- Top & Bottom Radii -->
                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600;">Top Radius:</span>
                      <span style="font-family: monospace;">{{ config().topRadius }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="110"
                      step="1"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().topRadius"
                      (ngModelChange)="updateConfig({ topRadius: +$event })" />
                  </div>
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600;">Bottom Radius:</span>
                      <span style="font-family: monospace;">{{ config().bottomRadius }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="35"
                      max="130"
                      step="1"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().bottomRadius"
                      (ngModelChange)="updateConfig({ bottomRadius: +$event })" />
                  </div>
                </div>

                <!-- Waist & Mid Radius -->
                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600;">Mid/Waist Radius:</span>
                      <span style="font-family: monospace;">{{ config().midRadius }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="135"
                      step="1"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().midRadius"
                      (ngModelChange)="updateConfig({ midRadius: +$event })" />
                  </div>
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600;">Waist Height Pos:</span>
                      <span style="font-family: monospace;">{{ Math.round(config().waistRatio * 100) }}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.85"
                      step="0.05"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().waistRatio"
                      (ngModelChange)="updateConfig({ waistRatio: +$event })" />
                  </div>
                </div>

                <!-- Mesh Segments Resolution -->
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                    <span style="font-weight: 600;">Radial Resolution:</span>
                    <span style="font-family: monospace;">{{ config().radialSegs }} segments</span>
                  </div>
                  <input
                    type="range"
                    min="36"
                    max="180"
                    step="6"
                    class="c-input__slider"
                    style="width: 100%;"
                    [ngModel]="config().radialSegs"
                    (ngModelChange)="updateConfig({ radialSegs: +$event })" />
                </div>
              </div>
            </app-card>

            <!-- 2. Ribs, Fluting & Surface -->
            <app-card title="2. Ribs, Fluting &amp; Surface Texture">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                    Rib Wave Shape:
                  </label>
                  <select
                    class="c-input__control"
                    style="width: 100%;"
                    [ngModel]="config().ribProfile"
                    (ngModelChange)="updateConfig({ ribProfile: $event })">
                    <option value="sine">Smooth Sine Flutes</option>
                    <option value="pleat">Sharp Origami Pleats</option>
                    <option value="scallop">Rounded Scalloped Arches</option>
                    <option value="gear">Flat-Top Fluted Grooves</option>
                    <option value="voronoi">Voronoi Cellular Relief</option>
                  </select>
                </div>

                <!-- Rib Count & Rib Depth -->
                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600;">Rib Count:</span>
                      <span style="font-family: monospace;">{{ config().ribCount }}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="2"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().ribCount"
                      (ngModelChange)="updateConfig({ ribCount: +$event })" />
                  </div>
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600;">Rib Depth:</span>
                      <span style="font-family: monospace;">{{ config().ribDepth }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="18"
                      step="0.5"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().ribDepth"
                      (ngModelChange)="updateConfig({ ribDepth: +$event })" />
                  </div>
                </div>

                <!-- Spiral Twist Angle -->
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                    <span style="font-weight: 600;">Spiral Twist Angle:</span>
                    <span style="font-family: monospace;">{{ config().twistAngle }}°</span>
                  </div>
                  <input
                    type="range"
                    min="-240"
                    max="240"
                    step="5"
                    class="c-input__slider"
                    style="width: 100%;"
                    [ngModel]="config().twistAngle"
                    (ngModelChange)="updateConfig({ twistAngle: +$event })" />
                </div>

                <!-- Vertical Waves -->
                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600;">Vertical Waves:</span>
                      <span style="font-family: monospace;">{{ config().vWaveFreq }}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="0.5"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().vWaveFreq"
                      (ngModelChange)="updateConfig({ vWaveFreq: +$event })" />
                  </div>
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600;">Wave Amplitude:</span>
                      <span style="font-family: monospace;">{{ config().vWaveAmp }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().vWaveAmp"
                      (ngModelChange)="updateConfig({ vWaveAmp: +$event })" />
                  </div>
                </div>
              </div>
            </app-card>

            <!-- 3. 3D Print & Socket Fitting -->
            <app-card title="3. 3D Print &amp; Socket Mount">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <!-- Print Mode Toggle -->
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                    Print Mode:
                  </label>
                  <div class="g--flex-center" style="gap: 8px;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      style="flex: 1;"
                      [class.c-button--primary]="config().printMode === 'shell'"
                      [class.c-button--outline]="config().printMode !== 'shell'"
                      (click)="updateConfig({ printMode: 'shell' })">
                      Watertight Hollow Shell
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      style="flex: 1;"
                      [class.c-button--primary]="config().printMode === 'vase'"
                      [class.c-button--outline]="config().printMode !== 'vase'"
                      (click)="updateConfig({ printMode: 'vase' })">
                      Spiralize Vase Mode
                    </button>
                  </div>
                </div>

                @if (config().printMode === 'shell') {
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Wall Thickness:</span>
                      <span style="font-family: monospace;">{{ config().wallThickness }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.2"
                      step="0.2"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().wallThickness"
                      (ngModelChange)="updateConfig({ wallThickness: +$event })" />
                  </div>
                }

                <!-- Socket Preset & Mount Position -->
                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <label style="font-size: 0.82rem; font-weight: 600; display: block; margin-bottom: 4px;">
                      Socket Preset:
                    </label>
                    <select
                      class="c-input__control"
                      style="width: 100%;"
                      [ngModel]="config().socketPreset"
                      (ngModelChange)="onSocketPresetChange($event)">
                      <option value="e27">E27 (41.0 mm)</option>
                      <option value="e14">E14 (28.0 mm)</option>
                      <option value="ikea">IKEA Stråla (34.0 mm)</option>
                      <option value="custom">Custom Diameter</option>
                      <option value="none">None (Pure Shade)</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size: 0.82rem; font-weight: 600; display: block; margin-bottom: 4px;">
                      Mount Position:
                    </label>
                    <select
                      class="c-input__control"
                      style="width: 100%;"
                      [ngModel]="config().mountPos"
                      (ngModelChange)="updateConfig({ mountPos: $event })">
                      <option value="bottom">Bottom (Table / Floor)</option>
                      <option value="top">Top (Pendant Hanging)</option>
                    </select>
                  </div>
                </div>

                @if (config().socketPreset === 'custom') {
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                      <span style="font-weight: 600;">Custom Socket Hole Dia:</span>
                      <span style="font-family: monospace;">{{ config().socketDia }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="18"
                      max="55"
                      step="1"
                      class="c-input__slider"
                      style="width: 100%;"
                      [ngModel]="config().socketDia"
                      (ngModelChange)="updateConfig({ socketDia: +$event })" />
                  </div>
                }

                @if (config().socketPreset !== 'none' && config().printMode === 'shell') {
                  <div class="l-columns l-columns--2" style="gap: 12px;">
                    <div>
                      <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                        <span style="font-weight: 600;">Spoke Count:</span>
                        <span style="font-family: monospace;">{{ config().spokeCount }}</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="6"
                        step="1"
                        class="c-input__slider"
                        style="width: 100%;"
                        [ngModel]="config().spokeCount"
                        (ngModelChange)="updateConfig({ spokeCount: +$event })" />
                    </div>
                    <div>
                      <div class="g--flex-center" style="justify-content: space-between; font-size: 0.82rem;">
                        <span style="font-weight: 600;">Spoke Width:</span>
                        <span style="font-family: monospace;">{{ config().spokeWidth }} mm</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="10"
                        step="0.5"
                        class="c-input__slider"
                        style="width: 100%;"
                        [ngModel]="config().spokeWidth"
                        (ngModelChange)="updateConfig({ spokeWidth: +$event })" />
                    </div>
                  </div>
                }
              </div>
            </app-card>

            <!-- 4. Material Simulation -->
            <app-card title="4. Filament Simulation (Preview Only)">
              <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
                @for (fil of filaments; track fil.id) {
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="selectedFilamentId() === fil.id"
                    [class.c-button--outline]="selectedFilamentId() !== fil.id"
                    (click)="selectFilament(fil.id)">
                    {{ fil.name }}
                  </button>
                }
              </div>
            </app-card>

          </div>
        </div>

        <!-- 3D Viewport & Output Column -->
        <div class="c-lamp-designer__viewport-column">
          <div class="l-columns l-columns--1" style="gap: 16px;">
            
            <!-- 3D Canvas Card -->
            <div class="c-card c-lamp-designer__viewport-card" style="padding: 0;">
              <!-- Viewport Overlay Badges & Controls -->
              <div class="c-lamp-designer__viewport-hud">
                <div class="c-lamp-designer__hud-group">
                  <span class="c-lamp-designer__hud-badge">
                    Bed: 256×256 mm
                  </span>
                  <span class="c-lamp-designer__hud-badge">
                    Triangles: {{ metrics()?.triangleCount | number }}
                  </span>
                </div>

                <div class="c-lamp-designer__hud-group">
                  <button
                    type="button"
                    class="c-lamp-designer__hud-btn"
                    [class.c-lamp-designer__hud-btn--active]="lampLit()"
                    (click)="toggleLampLit()"
                    title="Toggle Bulb Illumination">
                    💡 {{ lampLit() ? 'Bulb ON' : 'Bulb OFF' }}
                  </button>
                  <button
                    type="button"
                    class="c-lamp-designer__hud-btn"
                    [class.c-lamp-designer__hud-btn--active]="wireframe()"
                    (click)="toggleWireframe()"
                    title="Toggle Wireframe Mesh">
                    Mesh
                  </button>
                  <button
                    type="button"
                    class="c-lamp-designer__hud-btn"
                    (click)="resetCamera()"
                    title="Reset Camera View">
                    Reset View
                  </button>
                </div>
              </div>

              <!-- WebGL Canvas Container -->
              <div #rendererContainer class="c-lamp-designer__canvas"></div>
            </div>

            <!-- Print Telemetry & Specifications -->
            <app-card title="Manufacturing Telemetry &amp; Slicer Settings">
              @if (metrics(); as m) {
                <div class="l-columns l-columns--3 g--margin-bottom-4" style="gap: 16px; text-align: center;">
                  <div style="background: var(--color-bg-secondary); padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary); font-weight: 600;">DIMENSIONS</div>
                    <div style="font-size: 1.15rem; font-weight: 700; margin-top: 4px;">
                      {{ m.dimensionsMm.width }} × {{ m.dimensionsMm.depth }} × {{ m.dimensionsMm.height }} mm
                    </div>
                  </div>
                  <div style="background: var(--color-bg-secondary); padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary); font-weight: 600;">EST. FILAMENT</div>
                    <div style="font-size: 1.15rem; font-weight: 700; margin-top: 4px; color: #10b981;">
                      ~{{ m.estimatedGrams }} grams
                    </div>
                  </div>
                  <div style="background: var(--color-bg-secondary); padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary); font-weight: 600;">EST. PRINT TIME</div>
                    <div style="font-size: 1.15rem; font-weight: 700; margin-top: 4px;">
                      ~{{ m.estimatedPrintTimeHours }} hours
                    </div>
                  </div>
                </div>

                <div style="border-top: 1px solid var(--color-border); padding-top: 12px;">
                  <span style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Recommended Slicer Instructions:</span>
                  <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: var(--color-text-secondary);">
                    @for (tip of m.slicerTips; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>
              }
            </app-card>

            <!-- Export Actions Card -->
            <div class="c-card" style="padding: 16px;">
              <div class="l-extremo" style="flex-wrap: wrap; gap: 12px;">
                <div class="l-extremo__area-izquierda g--flex-center" style="gap: 8px;">
                  <button
                    type="button"
                    class="c-button c-button--outline"
                    (click)="captureSnapshot()">
                    📷 High-Res PNG
                  </button>
                </div>
                <div class="l-extremo__area-derecha g--flex-center" style="gap: 10px;">
                  <button
                    type="button"
                    class="c-button c-button--secondary"
                    (click)="download3mf()">
                    Download .3MF Archive
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--primary"
                    (click)="downloadStl()">
                    Download Print-Ready .STL
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `,
})
export class ParametricLampDesignerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef<HTMLDivElement>;

  readonly Math = Math;
  readonly presets = SAMPLE_LAMP_PRESETS;
  readonly filaments = FILAMENT_OPTIONS;

  // Reactive state
  readonly config = signal<LampConfig>({ ...DEFAULT_LAMP_CONFIG });
  readonly selectedPresetId = signal<string>('nordic');
  readonly selectedFilamentId = signal<string>('warmwhite');
  readonly lampLit = signal<boolean>(true);
  readonly wireframe = signal<boolean>(false);
  readonly autoRotate = signal<boolean>(false);

  readonly selectedFilament = computed<FilamentOption>(() => {
    const id = this.selectedFilamentId();
    return this.filaments.find((f) => f.id === id) || this.filaments[0];
  });

  // Dedicated single-pass metrics signal (DEFECT-31-02 deduplication)
  readonly metrics = signal<LampMetrics | null>(
    calculateLampMetrics(DEFAULT_LAMP_CONFIG)
  );

  // Three.js instances
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private shadeMesh?: THREE.Mesh;
  private bulbLight?: THREE.PointLight;
  private bulbMesh?: THREE.Mesh;
  private gridHelper?: THREE.GridHelper;
  private animFrameId?: number;
  private worker?: Worker;

  ngAfterViewInit(): void {
    this.initThree();
    this.rebuildShadeMesh();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.shadeMesh) {
      this.shadeMesh.geometry.dispose();
      this.disposeMaterial(this.shadeMesh.material);
    }
    if (this.bulbMesh) {
      this.bulbMesh.geometry.dispose();
      this.disposeMaterial(this.bulbMesh.material);
    }
    if (this.gridHelper) {
      this.gridHelper.geometry.dispose();
      this.disposeMaterial(this.gridHelper.material);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  loadPreset(preset: PresetLampShade): void {
    this.selectedPresetId.set(preset.id);
    this.config.update((prev) => ({
      ...prev,
      ...preset.config,
    }));
    this.rebuildShadeMesh();
  }

  resetToDefaults(): void {
    this.selectedPresetId.set('nordic');
    this.selectedFilamentId.set('warmwhite');
    this.config.set({ ...DEFAULT_LAMP_CONFIG });
    this.rebuildShadeMesh();
  }

  updateConfig(partial: Partial<LampConfig>): void {
    this.config.update((prev) => ({
      ...prev,
      ...partial,
    }));
    this.rebuildShadeMesh();
  }

  onSocketPresetChange(preset: SocketPreset): void {
    const dia = SOCKET_DIAMETERS[preset] ?? this.config().socketDia;
    this.updateConfig({
      socketPreset: preset,
      socketDia: dia,
    });
  }

  selectFilament(id: string): void {
    this.selectedFilamentId.set(id);
    this.updateMaterial();
  }

  toggleLampLit(): void {
    this.lampLit.update((v) => !v);
    if (this.bulbLight) {
      this.bulbLight.visible = this.lampLit();
    }
    this.updateMaterial();
  }

  toggleWireframe(): void {
    this.wireframe.update((v) => !v);
    if (this.shadeMesh && this.shadeMesh.material instanceof THREE.Material) {
      (this.shadeMesh.material as THREE.MeshStandardMaterial).wireframe = this.wireframe();
    }
  }

  resetCamera(): void {
    if (this.camera && this.controls) {
      this.camera.position.set(0, 180, 360);
      this.controls.target.set(0, this.config().height * 0.5, 0);
      this.controls.update();
    }
  }

  async downloadStl(): Promise<void> {
    const baseName = `PrivKnife_Shade_${this.config().curveType}_${this.config().height}mm_${this.config().socketPreset.toUpperCase()}`;
    let buffer: ArrayBuffer | undefined;

    if (typeof Worker !== 'undefined') {
      try {
        buffer = await this.executeWorkerTask('export-stl');
      } catch {
        // Fallback to synchronous in test or restricted environments
      }
    }

    if (!buffer) {
      const geom = generateLampShadeGeometry(this.config());
      buffer = exportBinarySTL(geom, baseName);
      geom.dispose();
    }

    const blob = new Blob([buffer], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    this.triggerDownload(url, `${baseName}.stl`);
    URL.revokeObjectURL(url);
  }

  async download3mf(): Promise<void> {
    const baseName = `PrivKnife_Shade_${this.config().curveType}_${this.config().height}mm_${this.config().socketPreset.toUpperCase()}`;
    let blob: Blob | undefined;

    if (typeof Worker !== 'undefined') {
      try {
        const buffer = await this.executeWorkerTask('export-3mf');
        blob = new Blob([buffer], {
          type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
        });
      } catch {
        // Fallback
      }
    }

    if (!blob) {
      const geom = generateLampShadeGeometry(this.config());
      blob = await export3mf(geom, this.config());
      geom.dispose();
    }

    const url = URL.createObjectURL(blob);
    this.triggerDownload(url, `${baseName}.3mf`);
    URL.revokeObjectURL(url);
  }

  captureSnapshot(): void {
    if (!this.renderer) return;
    this.renderer.render(this.scene!, this.camera!);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    this.triggerDownload(
      dataUrl,
      `PrivKnife_LampShade_${this.config().curveType}_${this.config().height}mm.png`
    );
  }

  private triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private executeWorkerTask(type: 'export-stl' | 'export-3mf'): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.worker) {
          this.worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
        }
        const id = Date.now();
        const handler = (e: MessageEvent<LampWorkerResponse>) => {
          if (e.data.id === id) {
            if (e.data.type === 'result' && e.data.buffer) {
              this.worker?.removeEventListener('message', handler);
              resolve(e.data.buffer);
            } else if (e.data.type === 'error') {
              this.worker?.removeEventListener('message', handler);
              reject(new Error(e.data.error || 'Worker task failed'));
            }
          }
        };
        this.worker.addEventListener('message', handler);
        this.worker.postMessage({ id, type, config: this.config() } as LampWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
  }

  private initThree(): void {
    const container = this.rendererContainer.nativeElement;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 520;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
    this.camera.position.set(0, 180, 360);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    // Key direct light
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
    dirLight.position.set(200, 400, 250);
    this.scene.add(dirLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.35);
    fillLight.position.set(-200, 150, -200);
    this.scene.add(fillLight);

    // Internal Warm LED bulb point light
    this.bulbLight = new THREE.PointLight(0xffaa44, 2.5, 450, 1.2);
    this.bulbLight.position.set(0, this.config().height * 0.5, 0);
    this.scene.add(this.bulbLight);

    // Bulb visual sphere
    const bulbGeom = new THREE.SphereGeometry(14, 24, 16);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffea88 });
    this.bulbMesh = new THREE.Mesh(bulbGeom, bulbMat);
    this.bulbMesh.position.copy(this.bulbLight.position);
    this.scene.add(this.bulbMesh);

    // 3D Printer Bed Grid (256x256mm)
    this.gridHelper = new THREE.GridHelper(256, 16, 0x38bdf8, 0x334155);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      container.appendChild(this.renderer.domElement);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.target.set(0, this.config().height * 0.5, 0);
      this.controls.update();
    } catch {
      // In headless test environments where WebGL is mocked or unavailable
    }
  }

  private rebuildShadeMesh(): void {
    if (!this.scene) return;

    if (this.shadeMesh) {
      this.scene.remove(this.shadeMesh);
      this.shadeMesh.geometry.dispose();
      this.disposeMaterial(this.shadeMesh.material);
      this.shadeMesh = undefined;
    }

    try {
      const geom = generateLampShadeGeometry(this.config());
      this.metrics.set(calculateLampMetrics(this.config(), geom));
      const mat = this.createShadeMaterial();

      this.shadeMesh = new THREE.Mesh(geom, mat);
      this.shadeMesh.castShadow = true;
      this.shadeMesh.receiveShadow = true;
      this.scene.add(this.shadeMesh);

      if (this.bulbLight && this.bulbMesh) {
        const bulbY = this.config().height * (this.config().mountPos === 'top' ? 0.65 : 0.45);
        this.bulbLight.position.y = bulbY;
        this.bulbMesh.position.y = bulbY;
      }

      if (this.controls) {
        this.controls.target.set(0, this.config().height * 0.5, 0);
      }
    } catch {
      // Handles headless test mode
    }
  }

  private createShadeMaterial(): THREE.MeshStandardMaterial {
    const fil = this.selectedFilament();
    const isLit = this.lampLit();

    return new THREE.MeshStandardMaterial({
      color: fil.baseColor,
      roughness: fil.roughness,
      metalness: 0.05,
      side: THREE.DoubleSide,
      wireframe: this.wireframe(),
      emissive: isLit ? fil.glowColor : 0x000000,
      emissiveIntensity: isLit ? 0.45 * fil.transmissionStrength : 0.0,
      vertexColors: false,
    });
  }

  private updateMaterial(): void {
    if (this.shadeMesh) {
      this.disposeMaterial(this.shadeMesh.material);
      const newMat = this.createShadeMaterial();
      this.shadeMesh.material = newMat;
    }
  }

  private disposeMaterial(mat: THREE.Material | THREE.Material[] | undefined): void {
    if (!mat) return;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else {
      mat.dispose();
    }
  }

  private animate = (): void => {
    if (this.renderer && this.scene && this.camera) {
      if (this.controls) {
        this.controls.update();
      }
      if (this.autoRotate() && this.shadeMesh) {
        this.shadeMesh.rotation.y += 0.005;
      }
      this.renderer.render(this.scene, this.camera);
    }
    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(this.animate);
    }
  };
}
