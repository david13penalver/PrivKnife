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
  buildNameplateAssembly,
  generateDualColor3mf,
  generateNameplateZipBundle,
  generateStlFiles,
} from './engine';
import {
  DEFAULT_NAMEPLATE_CONFIG,
  FILAMENT_PALETTES,
  SAMPLE_NAMEPLATE_PRESETS,
} from './test-fixtures';
import {
  FilamentPalette,
  FontFamilyPreset,
  NameplateConfig,
  NameplateMetrics,
  PresetNameplate,
  TextAlignment,
  TextMode,
} from './types';

@Component({
  selector: 'app-desk-wedge-nameplate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Card],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1280px; padding: 0 16px;">
      <!-- Header & Privacy Indicator -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            🛡️ 100% In-Browser 3D Fabrication &bull; Zero Server Ingestion &bull; Zero Telemetry
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">
          Parametric Desk Wedge &amp; Nameplate Maker
        </h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 780px; color: var(--color-text-secondary); font-size: 1.1rem;">
          Design bespoke executive, technical, and medical desk signs with crisp parametric bevels and dual-color typography.
          Exports dual-material <strong>.3mf</strong> archives for Bambu AMS / Prusa MMU3 and single-extruder <strong>.stl</strong> files.
        </p>
      </div>

      <!-- Presets Ribbon -->
      <div class="l-columns__area g--margin-bottom-5">
        <div class="c-card" style="padding: 12px 16px;">
          <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary);">Style Presets:</span>
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

      <!-- Main Layout: Controls Left (5 cols) vs 3D Viewport Right (7 cols) -->
      <div class="l-columns l-columns--12" style="gap: 24px; align-items: start;">
        
        <!-- Controls Column -->
        <div class="l-columns__area l-columns__area--span-5">
          <div class="l-columns l-columns--1" style="gap: 16px;">
            
            <!-- Inscription & Typography -->
            <app-card title="1. Inscription &amp; Typography">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <!-- Primary Text -->
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                    Primary Inscription (Name):
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    style="width: 100%; text-transform: uppercase;"
                    [ngModel]="config().primaryText"
                    (ngModelChange)="updatePrimaryText($event)"
                    placeholder="e.g. ALEXANDER HAMILTON" />
                </div>

                <!-- Primary Font Size -->
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                    <span style="font-weight: 600;">Primary Font Size:</span>
                    <span style="font-family: monospace;">{{ config().primaryFontSizeMm }} mm</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="22"
                    step="0.5"
                    [ngModel]="config().primaryFontSizeMm"
                    (ngModelChange)="updatePrimaryFontSize($event)"
                    style="width: 100%; margin-top: 4px;" />
                </div>

                <!-- Secondary Subtitle Checkbox -->
                <div style="padding-top: 6px; border-top: 1px solid var(--color-border);">
                  <label style="font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    <input
                      type="checkbox"
                      [checked]="config().secondaryEnabled"
                      (change)="toggleSecondary($event)" />
                    Include Subtitle / Position Title
                  </label>
                </div>

                @if (config().secondaryEnabled) {
                  <div>
                    <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                      Secondary Line (Title / Department):
                    </label>
                    <input
                      type="text"
                      class="c-input"
                      style="width: 100%; text-transform: uppercase;"
                      [ngModel]="config().secondaryText"
                      (ngModelChange)="updateSecondaryText($event)"
                      placeholder="e.g. MANAGING DIRECTOR" />
                  </div>

                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Secondary Font Size:</span>
                      <span style="font-family: monospace;">{{ config().secondaryFontSizeMm }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="14"
                      step="0.5"
                      [ngModel]="config().secondaryFontSizeMm"
                      (ngModelChange)="updateSecondaryFontSize($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>
                }

                <!-- Text Mode: Embossed vs Debossed -->
                <div style="padding-top: 6px; border-top: 1px solid var(--color-border);">
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                    Lettering Style:
                  </label>
                  <div class="g--flex-center" style="gap: 8px;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().textMode === 'embossed'"
                      [class.c-button--outline]="config().textMode !== 'embossed'"
                      style="flex: 1;"
                      (click)="setTextMode('embossed')">
                      Embossed (Raised)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().textMode === 'debossed'"
                      [class.c-button--outline]="config().textMode !== 'debossed'"
                      style="flex: 1;"
                      (click)="setTextMode('debossed')">
                      Debossed (Carved)
                    </button>
                  </div>
                </div>

                <!-- Text Alignment & Depth -->
                <div class="l-columns l-columns--2" style="gap: 12px; margin-top: 2px;">
                  <div>
                    <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                      Alignment:
                    </label>
                    <select
                      class="c-input"
                      style="width: 100%;"
                      [ngModel]="config().textAlignment"
                      (ngModelChange)="setTextAlignment($event)">
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                      <span style="font-weight: 600;">Relief Depth:</span>
                      <span style="font-family: monospace;">{{ config().reliefDepthMm }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.4"
                      step="0.2"
                      [ngModel]="config().reliefDepthMm"
                      (ngModelChange)="updateReliefDepth($event)"
                      style="width: 100%;" />
                  </div>
                </div>
              </div>
            </app-card>

            <!-- Wedge Dimensions -->
            <app-card title="2. Desk Wedge Dimensions">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                    <span style="font-weight: 600;">Wedge Width:</span>
                    <span style="font-family: monospace;">{{ config().wedgeWidthMm }} mm</span>
                  </div>
                  <input
                    type="range"
                    min="120"
                    max="240"
                    step="5"
                    [ngModel]="config().wedgeWidthMm"
                    (ngModelChange)="updateWedgeWidth($event)"
                    style="width: 100%; margin-top: 4px;" />
                </div>

                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Height:</span>
                      <span style="font-family: monospace;">{{ config().wedgeHeightMm }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="60"
                      step="2"
                      [ngModel]="config().wedgeHeightMm"
                      (ngModelChange)="updateWedgeHeight($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>

                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Base Depth:</span>
                      <span style="font-family: monospace;">{{ config().baseDepthMm }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="26"
                      max="55"
                      step="2"
                      [ngModel]="config().baseDepthMm"
                      (ngModelChange)="updateBaseDepth($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>
                </div>

                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Bottom Lip:</span>
                      <span style="font-family: monospace;">{{ config().lipHeightMm }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      step="1"
                      [ngModel]="config().lipHeightMm"
                      (ngModelChange)="updateLipHeight($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>

                  <div>
                    <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                      <span style="font-weight: 600;">Top Flat:</span>
                      <span style="font-family: monospace;">{{ config().topFlatMm }} mm</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="10"
                      step="1"
                      [ngModel]="config().topFlatMm"
                      (ngModelChange)="updateTopFlat($event)"
                      style="width: 100%; margin-top: 4px;" />
                  </div>
                </div>
              </div>
            </app-card>

            <!-- Filament & Colors -->
            <app-card title="3. Filament Material &amp; Colors">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <div class="g--flex-center" style="gap: 6px; flex-wrap: wrap;">
                  @for (palette of palettes; track palette.name) {
                    <button
                      type="button"
                      class="c-button c-button--small c-button--outline"
                      style="font-size: 0.75rem; padding: 4px 8px; display: inline-flex; align-items: center; gap: 6px;"
                      (click)="applyPalette(palette)">
                      <span [style.background-color]="palette.baseColor" style="width: 10px; height: 10px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.2);"></span>
                      <span [style.background-color]="palette.textColor" style="width: 10px; height: 10px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.2);"></span>
                      {{ palette.name }}
                    </button>
                  }
                </div>

                <div class="l-columns l-columns--2" style="gap: 12px; margin-top: 4px;">
                  <div>
                    <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                      Wedge Base:
                    </label>
                    <div class="g--flex-center" style="gap: 8px;">
                      <input
                        type="color"
                        [ngModel]="config().baseColor"
                        (ngModelChange)="updateBaseColor($event)"
                        style="width: 40px; height: 36px; border: none; border-radius: 4px; cursor: pointer;" />
                      <span style="font-family: monospace; font-size: 0.85rem;">{{ config().baseColor }}</span>
                    </div>
                  </div>

                  <div>
                    <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                      Inscription Text:
                    </label>
                    <div class="g--flex-center" style="gap: 8px;">
                      <input
                        type="color"
                        [ngModel]="config().textColor"
                        (ngModelChange)="updateTextColor($event)"
                        style="width: 40px; height: 36px; border: none; border-radius: 4px; cursor: pointer;" />
                      <span style="font-family: monospace; font-size: 0.85rem;">{{ config().textColor }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </app-card>
          </div>
        </div>

        <!-- 3D Viewport & Deliverables Column (7 cols) -->
        <div class="l-columns__area l-columns__area--span-7">
          <div class="l-columns l-columns--1" style="gap: 16px;">
            
            <!-- 3D Canvas Card -->
            <app-card title="Live 3D Slice &amp; Fabrication Preview">
              <!-- Viewport Toolbar -->
              <div class="g--flex-center g--margin-bottom-3" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div class="g--flex-center" style="gap: 6px;">
                  <button type="button" class="c-button c-button--small c-button--outline" (click)="setCameraView('incline')">
                    Incline Face
                  </button>
                  <button type="button" class="c-button c-button--small c-button--outline" (click)="setCameraView('isometric')">
                    Perspective
                  </button>
                  <button type="button" class="c-button c-button--small c-button--outline" (click)="setCameraView('top')">
                    Top
                  </button>
                </div>
                <button type="button" class="c-button c-button--small c-button--ghost" (click)="resetCamera()">
                  Reset View
                </button>
              </div>

              <!-- WebGL Container -->
              <div
                #viewportContainer
                style="width: 100%; height: 420px; background: radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%); border-radius: 8px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <canvas #viewportCanvas style="width: 100%; height: 100%; display: block;"></canvas>

                @if (isBuilding()) {
                  <div style="position: absolute; inset: 0; background: rgba(15, 23, 42, 0.7); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600;">
                    Calculating Parametric Mesh...
                  </div>
                }
              </div>

              <!-- Metrics Info Banner -->
              <div class="g--margin-top-3" style="background: var(--color-bg-secondary); border-radius: 6px; padding: 12px; font-size: 0.85rem;">
                <div class="l-columns l-columns--4" style="gap: 12px; text-align: center;">
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Model Dimensions</span>
                    <strong style="font-size: 0.95rem;">
                      {{ metrics().dimensionsMm.width }} &times; {{ metrics().dimensionsMm.height }} &times; {{ metrics().dimensionsMm.depth }} mm
                    </strong>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Face Angle</span>
                    <strong style="font-size: 0.95rem;">{{ metrics().inclineAngleDeg }}&deg;</strong>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Est. PLA Weight</span>
                    <strong style="font-size: 0.95rem;">~{{ metrics().estimatedFilamentGrams }} g</strong>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Swap Layer (0.2mm)</span>
                    <strong style="font-size: 0.95rem;">Layer #{{ metrics().filamentSwapLayer }}</strong>
                  </div>
                </div>
              </div>
            </app-card>

            <!-- Export Actions Card -->
            <app-card title="Export Deliverables (Client-Side Only)">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <div class="g--flex-center" style="gap: 10px; flex-wrap: wrap;">
                  <!-- Dual-color 3MF -->
                  <button
                    type="button"
                    class="c-button c-button--primary"
                    style="flex: 1; min-width: 220px;"
                    [disabled]="isExporting()"
                    (click)="exportDualColor3mf()">
                    Download Multi-Color .3MF (AMS/MMU)
                  </button>

                  <!-- Unified STL -->
                  <button
                    type="button"
                    class="c-button c-button--outline"
                    style="flex: 1; min-width: 180px;"
                    [disabled]="isExporting()"
                    (click)="exportUnifiedStl()">
                    Unified .STL (Single Color)
                  </button>
                </div>

                <div class="g--flex-center" style="gap: 10px; flex-wrap: wrap;">
                  <!-- Base Only STL -->
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small"
                    style="flex: 1;"
                    [disabled]="isExporting()"
                    (click)="exportBaseStl()">
                    Wedge Base .STL
                  </button>

                  <!-- Text Only STL -->
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small"
                    style="flex: 1;"
                    [disabled]="isExporting()"
                    (click)="exportTextStl()">
                    Inscription .STL
                  </button>

                  <!-- Screenshot -->
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small"
                    [disabled]="isExporting()"
                    (click)="exportPng()">
                    Preview .PNG
                  </button>
                </div>

                <div style="padding-top: 8px; border-top: 1px solid var(--color-border);">
                  <button
                    type="button"
                    class="c-button c-button--secondary"
                    style="width: 100%;"
                    [disabled]="isExporting()"
                    (click)="exportBundleZip()">
                    📦 Download Complete ZIP Bundle (.3MF + .STLs + Slicing Guide)
                  </button>
                </div>
              </div>
            </app-card>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DeskWedgeNameplateComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewportContainer') viewportContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('viewportCanvas') viewportCanvas!: ElementRef<HTMLCanvasElement>;

  readonly samplePresets = SAMPLE_NAMEPLATE_PRESETS;
  readonly palettes = FILAMENT_PALETTES;

  readonly selectedPresetId = signal<string>('executive-suite');
  readonly config = signal<NameplateConfig>({ ...DEFAULT_NAMEPLATE_CONFIG });
  readonly isBuilding = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);

  // Computed assembly
  readonly modelAssembly = computed(() => {
    return buildNameplateAssembly(this.config());
  });

  readonly metrics = computed<NameplateMetrics>(() => {
    return this.modelAssembly().metrics;
  });

  // Three.js State
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private currentMeshGroup: THREE.Group | null = null;
  private animFrameId: number | null = null;

  ngAfterViewInit(): void {
    this.initThree();
    this.updateSceneMesh();
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.controls) {
      this.controls.dispose();
    }
    this.disposeThreeGroup(this.currentMeshGroup);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }

  // --- Configuration Handlers ---

  loadPreset(preset: PresetNameplate): void {
    this.selectedPresetId.set(preset.id);
    this.config.update((prev) => ({
      ...prev,
      ...preset.config,
    }));
    this.updateSceneMesh();
  }

  resetToDefaults(): void {
    this.selectedPresetId.set('executive-suite');
    this.config.set({ ...DEFAULT_NAMEPLATE_CONFIG });
    this.updateSceneMesh();
  }

  applyPalette(palette: FilamentPalette): void {
    this.config.update((c) => ({
      ...c,
      baseColor: palette.baseColor,
      textColor: palette.textColor,
    }));
    this.updateMaterialColors();
  }

  updatePrimaryText(text: string): void {
    this.config.update((c) => ({ ...c, primaryText: text }));
    this.updateSceneMesh();
  }

  updatePrimaryFontSize(size: number): void {
    this.config.update((c) => ({ ...c, primaryFontSizeMm: Number(size) }));
    this.updateSceneMesh();
  }

  toggleSecondary(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.config.update((c) => ({ ...c, secondaryEnabled: checked }));
    this.updateSceneMesh();
  }

  updateSecondaryText(text: string): void {
    this.config.update((c) => ({ ...c, secondaryText: text }));
    this.updateSceneMesh();
  }

  updateSecondaryFontSize(size: number): void {
    this.config.update((c) => ({ ...c, secondaryFontSizeMm: Number(size) }));
    this.updateSceneMesh();
  }

  setTextMode(mode: TextMode): void {
    this.config.update((c) => ({ ...c, textMode: mode }));
    this.updateSceneMesh();
  }

  setTextAlignment(alignment: TextAlignment): void {
    this.config.update((c) => ({ ...c, textAlignment: alignment }));
    this.updateSceneMesh();
  }

  updateReliefDepth(depth: number): void {
    this.config.update((c) => ({ ...c, reliefDepthMm: Number(depth) }));
    this.updateSceneMesh();
  }

  updateWedgeWidth(width: number): void {
    this.config.update((c) => ({ ...c, wedgeWidthMm: Number(width) }));
    this.updateSceneMesh();
  }

  updateWedgeHeight(height: number): void {
    this.config.update((c) => ({ ...c, wedgeHeightMm: Number(height) }));
    this.updateSceneMesh();
  }

  updateBaseDepth(depth: number): void {
    this.config.update((c) => ({ ...c, baseDepthMm: Number(depth) }));
    this.updateSceneMesh();
  }

  updateLipHeight(lip: number): void {
    this.config.update((c) => ({ ...c, lipHeightMm: Number(lip) }));
    this.updateSceneMesh();
  }

  updateTopFlat(flat: number): void {
    this.config.update((c) => ({ ...c, topFlatMm: Number(flat) }));
    this.updateSceneMesh();
  }

  updateBaseColor(color: string): void {
    this.config.update((c) => ({ ...c, baseColor: color }));
    this.updateMaterialColors();
  }

  updateTextColor(color: string): void {
    this.config.update((c) => ({ ...c, textColor: color }));
    this.updateMaterialColors();
  }

  // --- Three.js Viewport Management ---

  private initThree(): void {
    if (!this.viewportCanvas || !this.viewportContainer) return;

    try {
      const container = this.viewportContainer.nativeElement;
      const canvas = this.viewportCanvas.nativeElement;
      const width = container.clientWidth || 640;
      const height = container.clientHeight || 420;

      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
      this.camera.position.set(0, 70, 220);

      // WebGL Renderer with graceful fallback
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;

      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.1;

      // Lighting Setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      this.scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight.position.set(100, 180, 120);
      dirLight.castShadow = true;
      this.scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
      fillLight.position.set(-100, 60, -80);
      this.scene.add(fillLight);

      // Build plate grid
      const grid = new THREE.GridHelper(250, 25, 0x475569, 0x334155);
      grid.position.y = -DEFAULT_NAMEPLATE_CONFIG.wedgeHeightMm / 2;
      this.scene.add(grid);

      const animate = () => {
        this.animFrameId = requestAnimationFrame(animate);
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate();
    } catch {
      // In headless test environments or browsers without WebGL
    }
  }

  updateSceneMesh(): void {
    if (!this.scene) return;

    if (this.currentMeshGroup) {
      this.scene.remove(this.currentMeshGroup);
      this.disposeThreeGroup(this.currentMeshGroup);
      this.currentMeshGroup = null;
    }

    const { combinedGroup } = this.modelAssembly();
    this.currentMeshGroup = combinedGroup.clone(true);
    this.scene.add(this.currentMeshGroup);
  }

  private updateMaterialColors(): void {
    if (!this.currentMeshGroup) return;

    const baseMesh = this.currentMeshGroup.getObjectByName('wedge-base') as THREE.Mesh;
    const textMesh = this.currentMeshGroup.getObjectByName('wedge-text') as THREE.Mesh;

    if (baseMesh && baseMesh.material instanceof THREE.MeshStandardMaterial) {
      baseMesh.material.color.set(this.config().baseColor);
    }
    if (textMesh && textMesh.material instanceof THREE.MeshStandardMaterial) {
      textMesh.material.color.set(this.config().textColor);
    }
  }

  setCameraView(view: 'incline' | 'isometric' | 'top'): void {
    if (!this.camera || !this.controls) return;

    switch (view) {
      case 'incline':
        this.camera.position.set(0, 30, 200);
        break;
      case 'isometric':
        this.camera.position.set(140, 120, 160);
        break;
      case 'top':
        this.camera.position.set(0, 240, 10);
        break;
    }
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  resetCamera(): void {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(0, 70, 220);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
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

  async exportDualColor3mf(): Promise<void> {
    this.isExporting.set(true);
    try {
      const { wedgeGeom, textGeom } = this.modelAssembly();
      const blob = await generateDualColor3mf(wedgeGeom, textGeom, this.config());
      this.triggerDownload(blob, `desk_nameplate_${this.selectedPresetId()}_dual_color.3mf`);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportUnifiedStl(): void {
    this.isExporting.set(true);
    try {
      const { wedgeGeom, textGeom } = this.modelAssembly();
      const { unifiedStl } = generateStlFiles(wedgeGeom, textGeom);
      this.triggerDownload(unifiedStl, `desk_nameplate_${this.selectedPresetId()}_unified.stl`);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportBaseStl(): void {
    this.isExporting.set(true);
    try {
      const { wedgeGeom, textGeom } = this.modelAssembly();
      const { baseStl } = generateStlFiles(wedgeGeom, textGeom);
      this.triggerDownload(baseStl, `desk_nameplate_${this.selectedPresetId()}_base.stl`);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportTextStl(): void {
    this.isExporting.set(true);
    try {
      const { wedgeGeom, textGeom } = this.modelAssembly();
      const { textStl } = generateStlFiles(wedgeGeom, textGeom);
      this.triggerDownload(textStl, `desk_nameplate_${this.selectedPresetId()}_text.stl`);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportPng(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const blob = dataUrlToBlob(dataUrl);
    this.triggerDownload(blob, `desk_nameplate_${this.selectedPresetId()}_preview.png`);
  }

  async exportBundleZip(): Promise<void> {
    this.isExporting.set(true);
    try {
      const { wedgeGeom, textGeom } = this.modelAssembly();
      let previewBlob: Blob | undefined;

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
        const dataUrl = this.renderer.domElement.toDataURL('image/png');
        previewBlob = dataUrlToBlob(dataUrl);
      }

      const zipBlob = await generateNameplateZipBundle(
        wedgeGeom,
        textGeom,
        this.config(),
        previewBlob
      );

      this.triggerDownload(zipBlob, `desk_nameplate_${this.selectedPresetId()}_complete_bundle.zip`);
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
