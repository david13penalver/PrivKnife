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
  CharmShape,
  EmergencyIcon,
  PetIdTagGeneratorOptions,
  PetIdTagGeneratorResult,
  PetTagMetrics,
  PetTagPreset,
  PetTagWorkerRequest,
  PetTagWorkerResponse,
  TagExportFormat,
  TagFormat,
} from './types';
import {
  DEFAULT_PET_TAG_OPTIONS,
  PET_TAG_PRESETS,
} from './test-fixtures';
import {
  generatePetTagMesh,
  processPetTag,
} from './engine';

@Component({
  selector: 'app-pet-id-tag-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, TranslatePipe],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">{{ 'tools.petIdTagGenerator.name' | translate }}</h1>
          <p class="c-header__subtitle">
            {{ 'tools.petIdTagGenerator.description' | translate }}
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          {{ 'common.privacyBadge' | translate }}
        </div>
      </div>

      <!-- Presets Strip -->
      <div class="preset-strip g--margin-bottom-4">
        <span class="preset-label">Artisan Presets:</span>
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

      <!-- Tag Format Selector Tabs -->
      <div class="mode-tabs g--margin-bottom-4">
        <button
          type="button"
          class="mode-tab"
          [class.mode-tab--active]="tagFormat() === 'hanging_charm'"
          (click)="setTagFormat('hanging_charm')"
        >
          🏷️ Hanging Charm Tag
        </button>
        <button
          type="button"
          class="mode-tab"
          [class.mode-tab--active]="tagFormat() === 'collar_slide_on'"
          (click)="setTagFormat('collar_slide_on')"
        >
          🦮 Silent Collar Slide-On
        </button>
      </div>

      <!-- Main Columns -->
      <div class="l-columns l-columns--2">
        <!-- Controls Area -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header">
              <h2 class="c-card__title">1. Tag Geometry & Dimensions</h2>
            </div>
            <div class="c-card__body">
              @if (tagFormat() === 'hanging_charm') {
                <div class="control-group">
                  <label class="c-input__label">Charm Shape</label>
                  <div class="btn-grid-5">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="charmShape() === 'bone'"
                      [class.c-button--outline]="charmShape() !== 'bone'"
                      (click)="setCharmShape('bone')"
                    >
                      🦴 Bone
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="charmShape() === 'circle'"
                      [class.c-button--outline]="charmShape() !== 'circle'"
                      (click)="setCharmShape('circle')"
                    >
                      ⚪ Coin
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="charmShape() === 'heart'"
                      [class.c-button--outline]="charmShape() !== 'heart'"
                      (click)="setCharmShape('heart')"
                    >
                      ❤️ Heart
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="charmShape() === 'shield'"
                      [class.c-button--outline]="charmShape() !== 'shield'"
                      (click)="setCharmShape('shield')"
                    >
                      🛡️ Shield
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="charmShape() === 'hexagon'"
                      [class.c-button--outline]="charmShape() !== 'hexagon'"
                      (click)="setCharmShape('hexagon')"
                    >
                      ⬡ Hexagon
                    </button>
                  </div>
                </div>

                <div class="grid-2-col">
                  <div class="control-group">
                    <label class="c-input__label" for="tagWidth">Width: {{ tagWidthMm() }} mm</label>
                    <input
                      id="tagWidth"
                      type="range"
                      class="c-input c-input--range c-input__slider"
                      min="20"
                      max="65"
                      step="1"
                      [ngModel]="tagWidthMm()"
                      (ngModelChange)="tagWidthMm.set($event); updatePreviewMesh()"
                    />
                  </div>
                  <div class="control-group">
                    <label class="c-input__label" for="tagHeight">Height: {{ tagHeightMm() }} mm</label>
                    <input
                      id="tagHeight"
                      type="range"
                      class="c-input c-input--range c-input__slider"
                      min="15"
                      max="50"
                      step="1"
                      [ngModel]="tagHeightMm()"
                      (ngModelChange)="tagHeightMm.set($event); updatePreviewMesh()"
                    />
                  </div>
                </div>

                <div class="grid-2-col">
                  <div class="control-group">
                    <label class="c-input__label" for="tagThickness">Base Thickness: {{ tagThicknessMm() }} mm</label>
                    <input
                      id="tagThickness"
                      type="range"
                      class="c-input c-input--range c-input__slider"
                      min="1.6"
                      max="4.5"
                      step="0.2"
                      [ngModel]="tagThicknessMm()"
                      (ngModelChange)="tagThicknessMm.set($event); updatePreviewMesh()"
                    />
                  </div>
                  <div class="control-group">
                    <label class="c-input__label" for="holeDiameter">Split-Ring Eyelet: Ø {{ holeDiameterMm() }} mm</label>
                    <input
                      id="holeDiameter"
                      type="range"
                      class="c-input c-input--range c-input__slider"
                      min="3.0"
                      max="6.5"
                      step="0.5"
                      [ngModel]="holeDiameterMm()"
                      (ngModelChange)="holeDiameterMm.set($event); updatePreviewMesh()"
                    />
                  </div>
                </div>

                <div class="control-group">
                  <label class="c-input__label">Engraving Side</label>
                  <label class="checkbox-label">
                    <input
                      id="dualSided"
                      data-testid="dual-sided-checkbox"
                      type="checkbox"
                      [checked]="dualSided()"
                      (change)="dualSided.set(!dualSided()); updatePreviewMesh()"
                    />
                    Dual-Sided (Back-Face Contact Text)
                  </label>
                </div>
              } @else {
                <div class="control-group">
                  <label class="c-input__label">Collar Strap Width</label>
                  <div class="btn-grid-4">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="collarWidthMm() === 15"
                      [class.c-button--outline]="collarWidthMm() !== 15"
                      (click)="collarWidthMm.set(15); updatePreviewMesh()"
                    >
                      15mm (5/8")
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="collarWidthMm() === 20"
                      [class.c-button--outline]="collarWidthMm() !== 20"
                      (click)="collarWidthMm.set(20); updatePreviewMesh()"
                    >
                      20mm (3/4")
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="collarWidthMm() === 25"
                      [class.c-button--outline]="collarWidthMm() !== 25"
                      (click)="collarWidthMm.set(25); updatePreviewMesh()"
                    >
                      25mm (1.0")
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="collarWidthMm() === 38"
                      [class.c-button--outline]="collarWidthMm() !== 38"
                      (click)="collarWidthMm.set(38); updatePreviewMesh()"
                    >
                      38mm (1.5")
                    </button>
                  </div>
                </div>

                <div class="grid-2-col">
                  <div class="control-group">
                    <label class="c-input__label" for="slideTagWidth">Band Width: {{ tagWidthMm() }} mm</label>
                    <input
                      id="slideTagWidth"
                      type="range"
                      class="c-input c-input--range c-input__slider"
                      min="35"
                      max="68"
                      step="1"
                      [ngModel]="tagWidthMm()"
                      (ngModelChange)="tagWidthMm.set($event); updatePreviewMesh()"
                    />
                  </div>
                  <div class="control-group">
                    <label class="c-input__label" for="slideTagHeight">Band Height: {{ tagHeightMm() }} mm</label>
                    <input
                      id="slideTagHeight"
                      type="range"
                      class="c-input c-input--range c-input__slider"
                      min="20"
                      max="48"
                      step="1"
                      [ngModel]="tagHeightMm()"
                      (ngModelChange)="tagHeightMm.set($event); updatePreviewMesh()"
                    />
                  </div>
                </div>

                <div class="grid-2-col">
                  <div class="control-group">
                    <label class="c-input__label" for="slideSlotWidth">Strap Slot Thickness: {{ slotWidthMm() }} mm</label>
                    <input
                      id="slideSlotWidth"
                      type="range"
                      class="c-input c-input--range c-input__slider"
                      min="2.5"
                      max="5.5"
                      step="0.5"
                      [ngModel]="slotWidthMm()"
                      (ngModelChange)="slotWidthMm.set($event); updatePreviewMesh()"
                    />
                  </div>
                  <div class="control-group">
                    <label class="c-input__label">Ergonomic Fit</label>
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="curvedBand()"
                        (change)="curvedBand.set(!curvedBand()); updatePreviewMesh()"
                      />
                      Curved Neck Band
                    </label>
                  </div>
                </div>
              }
            </div>
          </app-card>

          <!-- Identification & Text -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">2. Identification & Emergency Text</h2>
            </div>
            <div class="c-card__body">
              <div class="control-group">
                <label class="c-input__label" for="petName">Pet Name (Line 1)</label>
                <input
                  id="petName"
                  type="text"
                  maxlength="16"
                  class="c-input c-input--text"
                  [ngModel]="petName()"
                  (ngModelChange)="setPetName($event)"
                  placeholder="LUNA"
                />
              </div>

              <div class="grid-2-col">
                <div class="control-group">
                  <label class="c-input__label" for="primaryPhone">Owner Phone (Line 2)</label>
                  <input
                    id="primaryPhone"
                    type="text"
                    maxlength="16"
                    class="c-input c-input--text"
                    [ngModel]="primaryPhone()"
                    (ngModelChange)="primaryPhone.set($event); updatePreviewMesh()"
                    placeholder="555-0192"
                  />
                </div>
                <div class="control-group">
                  <label class="c-input__label" for="secondaryPhone">Alert / Second Phone (Line 3)</label>
                  <input
                    id="secondaryPhone"
                    type="text"
                    maxlength="16"
                    class="c-input c-input--text"
                    [ngModel]="secondaryPhone()"
                    (ngModelChange)="secondaryPhone.set($event); updatePreviewMesh()"
                    placeholder="MICROCHIPPED"
                  />
                </div>
              </div>

              <div class="control-group">
                <label class="c-input__label" for="raisedHeight">
                  Tactile Text Emboss Height: {{ raisedTextHeightMm() }} mm
                </label>
                <input
                  id="raisedHeight"
                  type="range"
                  class="c-input c-input--range c-input__slider"
                  min="0.4"
                  max="1.8"
                  step="0.2"
                  [ngModel]="raisedTextHeightMm()"
                  (ngModelChange)="raisedTextHeightMm.set($event); updatePreviewMesh()"
                />
                <span class="input-hint">At 0.16mm layer height, 1.0mm equals 6 distinct multi-color top layers.</span>
              </div>
            </div>
          </app-card>

          <!-- Emergency Icon -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">3. Medical Alert & Motif Icon</h2>
            </div>
            <div class="c-card__body">
              <div class="btn-grid-5">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="emergencyIcon() === 'paw'"
                  [class.c-button--outline]="emergencyIcon() !== 'paw'"
                  (click)="setEmergencyIcon('paw')"
                >
                  🐾 Paw
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="emergencyIcon() === 'heart'"
                  [class.c-button--outline]="emergencyIcon() !== 'heart'"
                  (click)="setEmergencyIcon('heart')"
                >
                  ❤️ Heart
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="emergencyIcon() === 'medical_cross'"
                  [class.c-button--outline]="emergencyIcon() !== 'medical_cross'"
                  (click)="setEmergencyIcon('medical_cross')"
                >
                  ⚕️ Medical
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="emergencyIcon() === 'microchip'"
                  [class.c-button--outline]="emergencyIcon() !== 'microchip'"
                  (click)="setEmergencyIcon('microchip')"
                >
                  💾 Chipped
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="emergencyIcon() === 'none'"
                  [class.c-button--outline]="emergencyIcon() !== 'none'"
                  (click)="setEmergencyIcon('none')"
                >
                  🚫 None
                </button>
              </div>
            </div>
          </app-card>

          <div class="g--margin-top-4">
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="resetToDefaults()"
            >
              🔄 Reset Defaults
            </button>
          </div>
        </div>

        <!-- Preview & Export Area -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header l-extremo">
              <div class="l-extremo__area-izquierda">
                <h2 class="c-card__title">Interactive 3D Viewport</h2>
              </div>
              <div class="l-extremo__area-derecha">
                @if (currentMetrics(); as metrics) {
                  <span class="badge-dim">
                    {{ metrics.widthMm }} × {{ metrics.heightMm }} × {{ metrics.thicknessMm }} mm
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
                <span class="drag-hint">Left-drag to rotate • Scroll to zoom</span>
              </div>
            </div>
          </app-card>

          @if (currentMetrics(); as metrics) {
            <app-card class="g--margin-top-4">
              <div class="c-card__header">
                <h2 class="c-card__title">Manufacturing & Pet Safety Specs</h2>
              </div>
              <div class="c-card__body">
                <div class="metrics-panel">
                  <div class="metric-item">
                    <span class="metric-label">Dimensions</span>
                    <span class="metric-value">{{ metrics.widthMm }}×{{ metrics.heightMm }} mm</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Base Plate</span>
                    <span class="metric-value">{{ metrics.thicknessMm }} mm</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Est. Weight</span>
                    <span class="metric-value">~{{ metrics.estimatedGrams.toFixed(1) }} g</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Print Time</span>
                    <span class="metric-value">~{{ (metrics.estimatedPrintTimeHours * 60).toFixed(0) }} min</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Mesh Faces</span>
                    <span class="metric-value">{{ metrics.totalTriangles.toLocaleString() }} tris</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Multi-Color Objects</span>
                    <span class="metric-value">2–3 Bodies</span>
                  </div>
                </div>

                <div class="safety-box g--margin-top-4">
                  <h4 class="safety-title">🐕 Pet Safety & Slicing Notes</h4>
                  <ul class="safety-list">
                    @for (tip of metrics.petSafetyTips; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>
              </div>
            </app-card>
          }

          <!-- Export Deliverables -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">Export Deliverables</h2>
            </div>
            <div class="c-card__body">
              <div class="export-buttons-grid">
                <button
                  type="button"
                  class="c-button c-button--primary download-btn-3mf"
                  [disabled]="isGenerating()"
                  (click)="downloadFormat('3mf_multicolor')"
                >
                  🌈 Download Dual-Color 3MF
                </button>
                <button
                  type="button"
                  class="c-button c-button--outline download-btn-stl"
                  [disabled]="isGenerating()"
                  (click)="downloadFormat('stl_unified')"
                >
                  📦 Download Unified STL
                </button>
              </div>
              <span class="input-hint g--margin-top-2">
                100% processed client-side. Zero telemetry or server exfiltration.
              </span>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styleUrl: './pet-id-tag-generator.component.scss',
})
export class PetIdTagGeneratorComponent implements OnInit, OnDestroy {
  @ViewChild('previewCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('canvasWrapper', { static: true })
  wrapperRef!: ElementRef<HTMLDivElement>;

  readonly presets = PET_TAG_PRESETS;
  readonly activePresetId = signal<string>('classic_dog_bone');

  // Reactive state signals
  readonly tagFormat = signal<TagFormat>(DEFAULT_PET_TAG_OPTIONS.tagFormat);
  readonly charmShape = signal<CharmShape>(DEFAULT_PET_TAG_OPTIONS.charmShape);
  readonly collarWidthMm = signal<number>(DEFAULT_PET_TAG_OPTIONS.collarWidthMm);
  readonly tagWidthMm = signal<number>(DEFAULT_PET_TAG_OPTIONS.tagWidthMm);
  readonly tagHeightMm = signal<number>(DEFAULT_PET_TAG_OPTIONS.tagHeightMm);
  readonly tagThicknessMm = signal<number>(DEFAULT_PET_TAG_OPTIONS.tagThicknessMm);
  readonly petName = signal<string>(DEFAULT_PET_TAG_OPTIONS.petName);
  readonly primaryPhone = signal<string>(DEFAULT_PET_TAG_OPTIONS.primaryPhone);
  readonly secondaryPhone = signal<string>(DEFAULT_PET_TAG_OPTIONS.secondaryPhone);
  readonly emergencyIcon = signal<EmergencyIcon>(DEFAULT_PET_TAG_OPTIONS.emergencyIcon);
  readonly raisedTextHeightMm = signal<number>(DEFAULT_PET_TAG_OPTIONS.raisedTextHeightMm);
  readonly holeDiameterMm = signal<number>(DEFAULT_PET_TAG_OPTIONS.holeDiameterMm);
  readonly slotWidthMm = signal<number>(DEFAULT_PET_TAG_OPTIONS.slotWidthMm);
  readonly curvedBand = signal<boolean>(DEFAULT_PET_TAG_OPTIONS.curvedBand);
  readonly dualSided = signal<boolean>(DEFAULT_PET_TAG_OPTIONS.dualSided);
  readonly isGenerating = signal<boolean>(false);

  // Active metrics
  readonly currentMetrics = signal<PetTagMetrics | null>(null);

  private readonly activeDownloadUrls: string[] = [];
  private worker: Worker | null = null;

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
    this.initThree();
    this.updatePreviewMesh();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    window.removeEventListener('mouseup', this.onWindowMouseUp);
    window.removeEventListener('touchend', this.onWindowMouseUp);

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
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

  setTagFormat(f: TagFormat): void {
    this.tagFormat.set(f);
    if (f === 'collar_slide_on') {
      this.tagWidthMm.set(48.0);
      this.tagHeightMm.set(26.0);
      this.curvedBand.set(true);
    } else {
      this.tagWidthMm.set(40.0);
      this.tagHeightMm.set(24.0);
      this.curvedBand.set(false);
    }
    this.updatePreviewMesh();
  }

  setCharmShape(s: CharmShape): void {
    this.charmShape.set(s);
    this.updatePreviewMesh();
  }

  setEmergencyIcon(i: EmergencyIcon): void {
    this.emergencyIcon.set(i);
    this.updatePreviewMesh();
  }

  setPetName(name: string): void {
    this.petName.set(name.toUpperCase());
    this.updatePreviewMesh();
  }

  applyPreset(preset: PetTagPreset): void {
    this.activePresetId.set(preset.id);
    const opt = preset.options;
    if (opt.tagFormat !== undefined) this.tagFormat.set(opt.tagFormat);
    if (opt.charmShape !== undefined) this.charmShape.set(opt.charmShape);
    if (opt.collarWidthMm !== undefined) this.collarWidthMm.set(opt.collarWidthMm);
    if (opt.tagWidthMm !== undefined) this.tagWidthMm.set(opt.tagWidthMm);
    if (opt.tagHeightMm !== undefined) this.tagHeightMm.set(opt.tagHeightMm);
    if (opt.tagThicknessMm !== undefined) this.tagThicknessMm.set(opt.tagThicknessMm);
    if (opt.petName !== undefined) this.petName.set(opt.petName);
    if (opt.primaryPhone !== undefined) this.primaryPhone.set(opt.primaryPhone);
    if (opt.secondaryPhone !== undefined) this.secondaryPhone.set(opt.secondaryPhone);
    if (opt.emergencyIcon !== undefined) this.emergencyIcon.set(opt.emergencyIcon);
    if (opt.curvedBand !== undefined) this.curvedBand.set(opt.curvedBand);

    this.updatePreviewMesh();
  }

  resetToDefaults(): void {
    this.applyPreset(this.presets[0]);
    this.collarWidthMm.set(DEFAULT_PET_TAG_OPTIONS.collarWidthMm);
    this.tagWidthMm.set(DEFAULT_PET_TAG_OPTIONS.tagWidthMm);
    this.tagHeightMm.set(DEFAULT_PET_TAG_OPTIONS.tagHeightMm);
    this.tagThicknessMm.set(DEFAULT_PET_TAG_OPTIONS.tagThicknessMm);
    this.petName.set(DEFAULT_PET_TAG_OPTIONS.petName);
    this.primaryPhone.set(DEFAULT_PET_TAG_OPTIONS.primaryPhone);
    this.secondaryPhone.set(DEFAULT_PET_TAG_OPTIONS.secondaryPhone);
    this.emergencyIcon.set(DEFAULT_PET_TAG_OPTIONS.emergencyIcon);
    this.raisedTextHeightMm.set(DEFAULT_PET_TAG_OPTIONS.raisedTextHeightMm);
    this.holeDiameterMm.set(DEFAULT_PET_TAG_OPTIONS.holeDiameterMm);
    this.slotWidthMm.set(DEFAULT_PET_TAG_OPTIONS.slotWidthMm);
    this.curvedBand.set(DEFAULT_PET_TAG_OPTIONS.curvedBand);
    this.updatePreviewMesh();
  }

  resetCameraView(): void {
    if (!this.camera || !this.objectGroup) return;
    this.objectGroup.rotation.set(-0.35, 0.25, 0.05);
    this.fitCameraToObject();
  }

  async downloadFormat(format: TagExportFormat): Promise<void> {
    this.isGenerating.set(true);
    try {
      const options = this.getCurrentOptions();
      let result: PetIdTagGeneratorResult;

      if (typeof Worker !== 'undefined') {
        try {
          result = await this.runWorkerProcess(options, format);
        } catch {
          result = await processPetTag(options, format);
        }
      } else {
        result = await processPetTag(options, format);
      }

      if (!result.success || !result.blob) {
        return;
      }

      const url = URL.createObjectURL(result.blob);
      this.activeDownloadUrls.push(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
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
    } finally {
      this.isGenerating.set(false);
    }
  }

  private runWorkerProcess(
    options: PetIdTagGeneratorOptions,
    format: TagExportFormat
  ): Promise<PetIdTagGeneratorResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
        this.worker = worker;
        worker.onmessage = (event: MessageEvent<PetTagWorkerResponse>) => {
          worker.terminate();
          if (this.worker === worker) {
            this.worker = null;
          }
          if (event.data.success && event.data.blob) {
            resolve({
              success: true,
              blob: event.data.blob,
              fileName:
                event.data.fileName ||
                `pet-tag.${format === '3mf_multicolor' ? '3mf' : 'stl'}`,
              fileSize: event.data.fileSize || event.data.blob.size,
              mimeType: event.data.mimeType || 'application/octet-stream',
              metrics: event.data.metrics!,
            });
          } else {
            reject(new Error(event.data.error || 'Worker generation failed'));
          }
        };
        worker.onerror = (err) => {
          worker.terminate();
          if (this.worker === worker) {
            this.worker = null;
          }
          reject(err);
        };
        worker.postMessage({ options, format } as PetTagWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
  }

  updatePreviewMesh(): void {
    if (!this.scene || !this.objectGroup) return;

    try {
      this.disposeThreeObjects();

      const options = this.getCurrentOptions();
      const { baseGeometry, textGeometry, iconGeometry, metrics } = generatePetTagMesh(options);
      this.currentMetrics.set(metrics);

      // Base plate material (deep charcoal / midnight blue)
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.1,
      });
      const baseMesh = new THREE.Mesh(baseGeometry, baseMat);
      this.objectGroup.add(baseMesh);

      // Lettering text material (vibrant cyan / gold contrast)
      if (textGeometry.getAttribute('position')) {
        const textMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.25,
          metalness: 0.2,
        });
        const textMesh = new THREE.Mesh(textGeometry, textMat);
        this.objectGroup.add(textMesh);
      }

      // Icon material (warm amber / red accent)
      if (iconGeometry.getAttribute('position')) {
        const iconMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.25,
          metalness: 0.2,
        });
        const iconMesh = new THREE.Mesh(iconGeometry, iconMat);
        this.objectGroup.add(iconMesh);
      }

      this.fitCameraToObject();
    } catch {
      // Fallback in headless environment without WebGL
    }
  }

  private getCurrentOptions(): PetIdTagGeneratorOptions {
    return {
      tagFormat: this.tagFormat(),
      charmShape: this.charmShape(),
      collarWidthMm: this.collarWidthMm(),
      tagWidthMm: this.tagWidthMm(),
      tagHeightMm: this.tagHeightMm(),
      tagThicknessMm: this.tagThicknessMm(),
      petName: this.petName(),
      primaryPhone: this.primaryPhone(),
      secondaryPhone: this.secondaryPhone(),
      emergencyIcon: this.emergencyIcon(),
      raisedTextHeightMm: this.raisedTextHeightMm(),
      holeDiameterMm: this.holeDiameterMm(),
      slotWidthMm: this.slotWidthMm(),
      curvedBand: this.curvedBand(),
      dualSided: this.dualSided(),
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
      this.camera.position.set(0, -25, 120);

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(50, 70, 100);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
      fillLight.position.set(-60, -40, 50);
      this.scene.add(fillLight);

      this.objectGroup = new THREE.Group();
      this.objectGroup.rotation.set(-0.35, 0.25, 0.05);
      this.scene.add(this.objectGroup);

      this.setupMouseEvents(canvas);

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate();

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          if (!this.camera || !this.renderer || !wrapper) return;
          const w = wrapper.clientWidth;
          const h = wrapper.clientHeight;
          if (w > 0 && h > 0) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
          }
        });
        this.resizeObserver.observe(wrapper);
      }
    } catch {
      // Graceful fallback for headless JSDOM environments
    }
  }

  private setupMouseEvents(canvas: HTMLCanvasElement): void {
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
      'touchstart',
      (e) => {
        if (e.touches && e.touches.length > 0) {
          this.isDragging = true;
          this.previousMousePosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        }
      },
      { passive: true }
    );

    window.addEventListener('touchend', this.onWindowMouseUp);

    canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!this.isDragging || !this.objectGroup || !e.touches || e.touches.length === 0) return;

        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

        this.objectGroup.rotation.z += deltaX * 0.01;
        this.objectGroup.rotation.x += deltaY * 0.01;

        this.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      },
      { passive: true }
    );

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.camera) return;

      const zoomFactor = e.deltaY > 0 ? 1.05 : 0.95;
      this.camera.position.z = Math.min(Math.max(this.camera.position.z * zoomFactor, 20), 400);
    });
  }

  private fitCameraToObject(): void {
    if (!this.camera || !this.objectGroup) return;

    const box = new THREE.Box3().setFromObject(this.objectGroup);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    cameraZ = Math.max(cameraZ, 60);

    this.camera.position.set(0, 0, cameraZ);
    this.camera.lookAt(0, 0, 0);
  }

  private disposeThreeObjects(): void {
    if (!this.objectGroup) return;

    while (this.objectGroup.children.length > 0) {
      const child = this.objectGroup.children[0];
      this.objectGroup.remove(child);

      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
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
}
