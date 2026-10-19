import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';

import { Card } from '../../../components';

import {
  BrailleAdaSignGeneratorOptions,
  BrailleStandard,
  SignExportFormat,
  SignMetrics,
  SignPictogram,
  SignPreset,
} from './types';
import {
  DEFAULT_BRAILLE_SIGN_OPTIONS,
  SIGN_PRESETS,
} from './test-fixtures';
import {
  cellsToUnicodeBraille,
  generateSignMesh,
  processSign,
  transliterateToBraille,
  validateSignOptions,
} from './engine';

@Component({
  selector: 'app-braille-ada-sign-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, Card],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Braille & ADA Tactile Door Sign Generator</h1>
          <p class="c-header__subtitle">
            Generate 100% ADA-compliant room signage featuring 1/32" raised tactile lettering, Grade 2 contracted Braille domes, standard pictograms, and multi-color 3MF slicer layers.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <!-- Presets Strip -->
      <div class="preset-strip g--margin-bottom-4">
        <span class="preset-label">Quick Sign Presets:</span>
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
              <h2 class="c-card__title">1. Sign Content & Tactile Typography</h2>
            </div>
            <div class="c-card__body">
              <!-- Room Title -->
              <div class="control-group">
                <label class="c-input__label" for="roomTitle">
                  Room Title / Identifier (Uppercase Tactile)
                </label>
                <input
                  id="roomTitle"
                  type="text"
                  class="c-input"
                  [ngModel]="roomTitle()"
                  (ngModelChange)="onRoomTitleChange($event)"
                  placeholder="e.g. RESTROOM, CONFERENCE A, EXIT"
                  maxlength="40"
                />
                <span class="input-hint">ADA §703.2 requires all-caps sans-serif tactile lettering.</span>
              </div>

              <!-- Secondary Subtext -->
              <div class="control-group">
                <label class="c-input__label" for="subText">
                  Secondary Subtext (Optional)
                </label>
                <input
                  id="subText"
                  type="text"
                  class="c-input"
                  [ngModel]="subText()"
                  (ngModelChange)="subText.set($event)"
                  placeholder="e.g. ALL GENDER, PRIVATE, ROOM 102"
                  maxlength="40"
                />
              </div>

              <!-- Pictogram Selection -->
              <div class="control-group">
                <label class="c-input__label">Standard ADA Pictogram</label>
                <div class="btn-grid-3">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pictogram() === 'restroom_unisex'"
                    [class.c-button--outline]="pictogram() !== 'restroom_unisex'"
                    (click)="setPictogram('restroom_unisex')"
                  >
                    🚻 Unisex / All Gender
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pictogram() === 'restroom_men'"
                    [class.c-button--outline]="pictogram() !== 'restroom_men'"
                    (click)="setPictogram('restroom_men')"
                  >
                    🚹 Men
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pictogram() === 'restroom_women'"
                    [class.c-button--outline]="pictogram() !== 'restroom_women'"
                    (click)="setPictogram('restroom_women')"
                  >
                    🚺 Women
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pictogram() === 'accessible_wheelchair'"
                    [class.c-button--outline]="pictogram() !== 'accessible_wheelchair'"
                    (click)="setPictogram('accessible_wheelchair')"
                  >
                    ♿ Accessible
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pictogram() === 'exit'"
                    [class.c-button--outline]="pictogram() !== 'exit'"
                    (click)="setPictogram('exit')"
                  >
                    🚪 Exit
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pictogram() === 'none'"
                    [class.c-button--outline]="pictogram() !== 'none'"
                    (click)="setPictogram('none')"
                  >
                    🚫 None (Text Only)
                  </button>
                </div>
              </div>

              <!-- Braille Standard -->
              <div class="control-group">
                <label class="c-input__label">Braille Standard</label>
                <div class="btn-grid-2">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="brailleStandard() === 'ada_compliant'"
                    [class.c-button--outline]="brailleStandard() !== 'ada_compliant'"
                    (click)="setBrailleStandard('ada_compliant')"
                  >
                    🏛️ ADA Standard (6.3mm Cell Spacing)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="brailleStandard() === 'california_title24'"
                    [class.c-button--outline]="brailleStandard() !== 'california_title24'"
                    (click)="setBrailleStandard('california_title24')"
                  >
                    🌴 CA Title 24 (7.0mm Cell Spacing)
                  </button>
                </div>
              </div>

              <!-- Live Braille Preview Badge -->
              <div class="braille-callout">
                <div class="braille-callout__label">Grade 2 Contracted Braille:</div>
                <div class="braille-callout__symbol">{{ unicodeBraille() || '⠀' }}</div>
                <div class="braille-callout__sub">
                  {{ brailleCellCount() }} Braille cells ({{ brailleDotCount() }} tactile domes)
                </div>
              </div>
            </div>
          </app-card>

          <!-- Plaque Physical Dimensions -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">2. Plaque Dimensions & Mounting</h2>
            </div>
            <div class="c-card__body">
              <div class="grid-2-col">
                <div class="control-group">
                  <label class="c-input__label" for="plaqueWidth">Width (mm): {{ plaqueWidthMm() }} mm</label>
                  <input
                    id="plaqueWidth"
                    type="range"
                    class="c-input c-input--range"
                    min="100"
                    max="300"
                    step="2"
                    [ngModel]="plaqueWidthMm()"
                    (ngModelChange)="plaqueWidthMm.set($event)"
                  />
                </div>
                <div class="control-group">
                  <label class="c-input__label" for="plaqueHeight">Height (mm): {{ plaqueHeightMm() }} mm</label>
                  <input
                    id="plaqueHeight"
                    type="range"
                    class="c-input c-input--range"
                    min="100"
                    max="300"
                    step="2"
                    [ngModel]="plaqueHeightMm()"
                    (ngModelChange)="plaqueHeightMm.set($event)"
                  />
                </div>
              </div>

              <div class="grid-2-col">
                <div class="control-group">
                  <label class="c-input__label" for="plaqueThickness">Base Thickness: {{ plaqueThicknessMm() }} mm</label>
                  <input
                    id="plaqueThickness"
                    type="range"
                    class="c-input c-input--range"
                    min="2"
                    max="8"
                    step="0.5"
                    [ngModel]="plaqueThicknessMm()"
                    (ngModelChange)="plaqueThicknessMm.set($event)"
                  />
                </div>
                <div class="control-group">
                  <label class="c-input__label" for="tactileRaise">Tactile Raise: {{ tactileRaiseMm() }} mm</label>
                  <input
                    id="tactileRaise"
                    type="range"
                    class="c-input c-input--range"
                    min="0.6"
                    max="2.0"
                    step="0.1"
                    [ngModel]="tactileRaiseMm()"
                    (ngModelChange)="tactileRaiseMm.set($event)"
                  />
                  <span class="input-hint">ADA standard: 0.8mm (1/32").</span>
                </div>
              </div>

              <div class="grid-2-col">
                <div class="control-group">
                  <label class="c-input__label" for="cornerRadius">Corner Radius: {{ cornerRadiusMm() }} mm</label>
                  <input
                    id="cornerRadius"
                    type="range"
                    class="c-input c-input--range"
                    min="0"
                    max="20"
                    step="1"
                    [ngModel]="cornerRadiusMm()"
                    (ngModelChange)="cornerRadiusMm.set($event)"
                  />
                </div>
                <div class="control-group">
                  <label class="c-input__label">Frame Border Ring</label>
                  <div class="toggle-row">
                    <input
                      type="checkbox"
                      id="includeFrameBorder"
                      [checked]="includeFrameBorder()"
                      (change)="includeFrameBorder.set(!includeFrameBorder())"
                    />
                    <label for="includeFrameBorder">Raised border frame (3mm)</label>
                  </div>
                </div>
              </div>

              <!-- Mounting Holes -->
              <div class="control-group">
                <div class="toggle-row">
                  <input
                    type="checkbox"
                    id="mountHoles"
                    [checked]="mountHoles()"
                    (change)="mountHoles.set(!mountHoles())"
                  />
                  <label for="mountHoles">4 Corner Screw Mounting Holes (Ø {{ mountHoleDiameterMm() }} mm)</label>
                </div>
              </div>
            </div>
            <div class="c-card__footer l-extremo">
              <div class="l-extremo__area-izquierda">
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="resetToDefaults()"
                >
                  🔄 Reset Defaults
                </button>
              </div>
            </div>
          </app-card>
        </div>

        <!-- Preview & Export Area -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header l-extremo">
              <div class="l-extremo__area-izquierda">
                <h2 class="c-card__title">Interactive 3D Sign Viewport</h2>
              </div>
              <div class="l-extremo__area-derecha">
                <span class="badge-dim">
                  {{ plaqueWidthMm() }} × {{ plaqueHeightMm() }} × {{ (plaqueThicknessMm() + tactileRaiseMm()).toFixed(1) }} mm
                </span>
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
                <span class="drag-hint">🖱️ Left-drag to rotate • Scroll to zoom</span>
              </div>

              <!-- Production & Regulatory Metrics -->
              @if (currentMetrics(); as metrics) {
                <div class="metrics-panel g--margin-top-4">
                  <div class="metric-row">
                    <span class="metric-key">Est. Weight (PLA/PETG):</span>
                    <span class="metric-val">~{{ metrics.estimatedGrams }} g</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-key">Print Time (Standard):</span>
                    <span class="metric-val">~{{ metrics.estimatedPrintTimeHours }} hrs</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-key">Total 3D Triangles:</span>
                    <span class="metric-val">{{ metrics.totalTriangles | number }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-key">Braille Domes:</span>
                    <span class="metric-val">{{ metrics.brailleDotCount }} domes (Grade 2)</span>
                  </div>
                </div>

                <!-- ADA Regulatory Notes -->
                <div class="ada-notes-card g--margin-top-3">
                  <div class="ada-notes-title">📋 ADA Standards Compliance (§703):</div>
                  <ul class="ada-notes-list">
                    @for (note of metrics.adaComplianceNotes; track note) {
                      <li>{{ note }}</li>
                    }
                  </ul>
                </div>
              }

              <!-- Export Buttons -->
              <div class="export-actions g--margin-top-4">
                <div class="export-buttons-grid">
                  <button
                    type="button"
                    class="c-button c-button--primary c-button--block"
                    [disabled]="isGenerating()"
                    (click)="downloadFormat('3mf_multicolor')"
                  >
                    📥 Download Multi-Color 3MF (Recommended)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--block"
                    [disabled]="isGenerating()"
                    (click)="downloadFormat('stl_unified')"
                  >
                    📦 Download Unified STL (Single Extruder)
                  </button>
                </div>
                <p class="export-hint">
                  Multi-color .3mf is split into Base Plate, Tactile Elements, and Braille Domes for instant AMS / MMU slicing.
                </p>
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
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .preset-label {
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--color-text-muted, #94a3b8);
      }
      .preset-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .btn-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.4rem;
        margin-top: 0.25rem;
      }
      .btn-grid-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.4rem;
        margin-top: 0.25rem;
      }
      .grid-2-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }
      .control-group {
        display: flex;
        flex-direction: column;
        margin-bottom: 0.85rem;
      }
      .c-input__label {
        font-size: 0.85rem;
        font-weight: 500;
        margin-bottom: 0.25rem;
        color: var(--color-text-main, #e2e8f0);
      }
      .input-hint {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
        margin-top: 0.2rem;
      }
      .toggle-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: var(--color-text-main, #e2e8f0);
      }
      .braille-callout {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        padding: 0.75rem;
        margin-top: 0.5rem;
        text-align: center;
      }
      .braille-callout__label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
      }
      .braille-callout__symbol {
        font-size: 2.2rem;
        letter-spacing: 0.25rem;
        line-height: 1.2;
        color: #38bdf8;
        font-family: monospace;
      }
      .braille-callout__sub {
        font-size: 0.75rem;
        color: #cbd5e1;
      }
      .preview-container {
        display: flex;
        flex-direction: column;
      }
      .canvas-wrapper {
        width: 100%;
        height: 380px;
        background: #0f172a;
        border-radius: 6px;
        position: relative;
        overflow: hidden;
      }
      .three-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .preview-controls-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.5rem;
      }
      .drag-hint {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
      }
      .badge-dim {
        font-size: 0.8rem;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        background: rgba(148, 163, 184, 0.15);
        color: #cbd5e1;
      }
      .metrics-panel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.4rem;
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 6px;
        padding: 0.65rem;
      }
      .metric-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
      }
      .metric-key {
        color: var(--color-text-muted, #94a3b8);
      }
      .metric-val {
        font-weight: 600;
        color: var(--color-text-main, #f8fafc);
      }
      .ada-notes-card {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(56, 189, 248, 0.2);
        border-radius: 6px;
        padding: 0.65rem;
      }
      .ada-notes-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #38bdf8;
        margin-bottom: 0.25rem;
      }
      .ada-notes-list {
        margin: 0;
        padding-left: 1.1rem;
        font-size: 0.75rem;
        color: #94a3b8;
        line-height: 1.35;
      }
      .export-actions {
        display: flex;
        flex-direction: column;
      }
      .export-buttons-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 0.5rem;
      }
      .export-hint {
        font-size: 0.72rem;
        color: var(--color-text-muted, #94a3b8);
        text-align: center;
        margin-top: 0.35rem;
      }
      @media (max-width: 768px) {
        .btn-grid-3 {
          grid-template-columns: 1fr 1fr;
        }
        .grid-2-col {
          grid-template-columns: 1fr;
        }
        .export-buttons-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class BrailleAdaSignGeneratorComponent implements OnInit, OnDestroy {
  @ViewChild('previewCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('canvasWrapper', { static: true })
  wrapperRef!: ElementRef<HTMLDivElement>;

  readonly presets = SIGN_PRESETS;
  readonly activePresetId = signal<string>('restroom_all_gender');

  // Reactive state signals
  readonly roomTitle = signal<string>(DEFAULT_BRAILLE_SIGN_OPTIONS.roomTitle);
  readonly subText = signal<string>(DEFAULT_BRAILLE_SIGN_OPTIONS.subText);
  readonly pictogram = signal<SignPictogram>(DEFAULT_BRAILLE_SIGN_OPTIONS.pictogram);
  readonly plaqueWidthMm = signal<number>(DEFAULT_BRAILLE_SIGN_OPTIONS.plaqueWidthMm);
  readonly plaqueHeightMm = signal<number>(DEFAULT_BRAILLE_SIGN_OPTIONS.plaqueHeightMm);
  readonly plaqueThicknessMm = signal<number>(DEFAULT_BRAILLE_SIGN_OPTIONS.plaqueThicknessMm);
  readonly tactileRaiseMm = signal<number>(DEFAULT_BRAILLE_SIGN_OPTIONS.tactileRaiseMm);
  readonly brailleStandard = signal<BrailleStandard>(DEFAULT_BRAILLE_SIGN_OPTIONS.brailleStandard);
  readonly cornerRadiusMm = signal<number>(DEFAULT_BRAILLE_SIGN_OPTIONS.cornerRadiusMm);
  readonly mountHoles = signal<boolean>(DEFAULT_BRAILLE_SIGN_OPTIONS.mountHoles);
  readonly mountHoleDiameterMm = signal<number>(DEFAULT_BRAILLE_SIGN_OPTIONS.mountHoleDiameterMm);
  readonly includeFrameBorder = signal<boolean>(
    DEFAULT_BRAILLE_SIGN_OPTIONS.includeFrameBorder ?? true
  );
  readonly isGenerating = signal<boolean>(false);

  // Active metrics
  readonly currentMetrics = signal<SignMetrics | null>(null);

  // Computed Braille representation
  readonly brailleCells = computed(() => transliterateToBraille(this.roomTitle()));
  readonly unicodeBraille = computed(() => cellsToUnicodeBraille(this.brailleCells()));
  readonly brailleCellCount = computed(() => this.brailleCells().length);
  readonly brailleDotCount = computed(() =>
    this.brailleCells().reduce((sum, cell) => sum + cell.dots.length, 0)
  );

  private readonly activeDownloadUrls: string[] = [];

  // Three.js scene instances
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private signGroup?: THREE.Group;
  private animationFrameId?: number;
  private resizeObserver?: ResizeObserver;

  // Interaction controls
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };

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

    this.disposeThreeObjects();

    if (this.renderer) {
      this.renderer.dispose();
    }

    for (const url of this.activeDownloadUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeDownloadUrls.length = 0;
  }

  onRoomTitleChange(newVal: string): void {
    this.roomTitle.set(newVal.toUpperCase());
    this.updatePreviewMesh();
  }

  setPictogram(p: SignPictogram): void {
    this.pictogram.set(p);
    this.updatePreviewMesh();
  }

  setBrailleStandard(s: BrailleStandard): void {
    this.brailleStandard.set(s);
    this.updatePreviewMesh();
  }

  applyPreset(preset: SignPreset): void {
    this.activePresetId.set(preset.id);
    const opt = preset.options;
    if (opt.roomTitle !== undefined) this.roomTitle.set(opt.roomTitle);
    if (opt.subText !== undefined) this.subText.set(opt.subText);
    if (opt.pictogram !== undefined) this.pictogram.set(opt.pictogram);
    if (opt.plaqueWidthMm !== undefined) this.plaqueWidthMm.set(opt.plaqueWidthMm);
    if (opt.plaqueHeightMm !== undefined) this.plaqueHeightMm.set(opt.plaqueHeightMm);
    if (opt.brailleStandard !== undefined) this.brailleStandard.set(opt.brailleStandard);

    this.updatePreviewMesh();
  }

  resetToDefaults(): void {
    this.applyPreset(this.presets[0]);
    this.plaqueThicknessMm.set(DEFAULT_BRAILLE_SIGN_OPTIONS.plaqueThicknessMm);
    this.tactileRaiseMm.set(DEFAULT_BRAILLE_SIGN_OPTIONS.tactileRaiseMm);
    this.cornerRadiusMm.set(DEFAULT_BRAILLE_SIGN_OPTIONS.cornerRadiusMm);
    this.mountHoles.set(DEFAULT_BRAILLE_SIGN_OPTIONS.mountHoles);
    this.mountHoleDiameterMm.set(DEFAULT_BRAILLE_SIGN_OPTIONS.mountHoleDiameterMm);
    this.includeFrameBorder.set(DEFAULT_BRAILLE_SIGN_OPTIONS.includeFrameBorder ?? true);
    this.updatePreviewMesh();
  }

  resetCameraView(): void {
    if (!this.camera || !this.signGroup) return;
    this.signGroup.rotation.set(-0.35, 0.45, 0.15);
    this.fitCameraToSign();
  }

  async downloadFormat(format: SignExportFormat): Promise<void> {
    this.isGenerating.set(true);
    try {
      const options = this.getCurrentOptions();
      const result = await processSign(options, format);

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

  private getCurrentOptions(): BrailleAdaSignGeneratorOptions {
    return {
      roomTitle: this.roomTitle().trim() || 'SIGN',
      subText: this.subText(),
      pictogram: this.pictogram(),
      plaqueWidthMm: this.plaqueWidthMm(),
      plaqueHeightMm: this.plaqueHeightMm(),
      plaqueThicknessMm: this.plaqueThicknessMm(),
      tactileRaiseMm: this.tactileRaiseMm(),
      brailleStandard: this.brailleStandard(),
      cornerRadiusMm: this.cornerRadiusMm(),
      mountHoles: this.mountHoles(),
      mountHoleDiameterMm: this.mountHoleDiameterMm(),
      includeFrameBorder: this.includeFrameBorder(),
      frameBorderWidthMm: 3.0,
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
      this.camera.position.set(0, -60, 260);

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(150, 200, 250);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
      fillLight.position.set(-150, -100, 150);
      this.scene.add(fillLight);

      this.signGroup = new THREE.Group();
      this.signGroup.rotation.set(-0.35, 0.45, 0.15);
      this.scene.add(this.signGroup);

      this.setupCanvasInteractions(canvas);

      // Resize observer
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          const h = entry.contentRect.height;
          if (w > 0 && h > 0 && this.renderer && this.camera) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
          }
        }
      });
      this.resizeObserver.observe(wrapper);

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate();
    } catch {
      // In headless / test environment, WebGL might not be supported.
    }
  }

  private setupCanvasInteractions(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.signGroup) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.signGroup.rotation.z += deltaX * 0.01;
      this.signGroup.rotation.x += deltaY * 0.01;

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.camera) return;
        e.preventDefault();
        this.camera.position.z += e.deltaY * 0.2;
        this.camera.position.z = Math.max(100, Math.min(800, this.camera.position.z));
      },
      { passive: false }
    );
  }

  private updatePreviewMesh(): void {
    const options = this.getCurrentOptions();
    const validation = validateSignOptions(options);
    if (!validation.valid) return;

    const { baseGeometry, tactileGeometry, brailleGeometry, metrics } =
      generateSignMesh(options);

    this.currentMetrics.set(metrics);

    if (!this.signGroup) return;

    this.disposeThreeObjects();

    // Base Plaque Mesh (Dark slate matte)
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.1,
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    this.signGroup.add(baseMesh);

    // Tactile Elements Mesh (High-contrast bright white)
    if (tactileGeometry.getAttribute('position')) {
      const tactileMaterial = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.3,
        metalness: 0.0,
      });
      const tactileMesh = new THREE.Mesh(tactileGeometry, tactileMaterial);
      this.signGroup.add(tactileMesh);
    }

    // Braille Domes Mesh (Crisp dome highlight)
    if (brailleGeometry.getAttribute('position')) {
      const brailleMaterial = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.2,
        metalness: 0.1,
      });
      const brailleMesh = new THREE.Mesh(brailleGeometry, brailleMaterial);
      this.signGroup.add(brailleMesh);
    }

    this.fitCameraToSign();
  }

  private fitCameraToSign(): void {
    if (!this.camera || !this.signGroup) return;
    const box = new THREE.Box3().setFromObject(this.signGroup);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    this.camera.position.set(0, -maxDim * 0.2, maxDim * 1.8);
    this.camera.lookAt(0, 0, 0);
  }

  private disposeThreeObjects(): void {
    if (!this.signGroup) return;

    while (this.signGroup.children.length > 0) {
      const child = this.signGroup.children[0] as THREE.Mesh;
      this.signGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
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
