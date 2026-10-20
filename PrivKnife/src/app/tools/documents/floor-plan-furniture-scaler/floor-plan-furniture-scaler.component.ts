import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  BlueprintScale,
  ClearanceWarning,
  FloorPlanProject,
  FurnitureItem,
  FurnitureTemplate,
  FurnitureType,
  MeasurementUnit,
  ThemeColor,
} from './types';
import {
  DEFAULT_FLOOR_PLAN_OPTIONS,
  FURNITURE_TEMPLATES,
  SAMPLE_STUDIO_PLAN,
} from './test-fixtures';
import {
  checkFurnitureClearances,
  createPresetProject,
  exportProjectToJson,
  generateBlueprintPdf,
  generateFloorPlanSvg,
  importProjectFromJson,
} from './engine';

@Component({
  selector: 'app-floor-plan-furniture-scaler',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Interactive 2D Floor Plan & Room Furniture Scaler</h1>
          <p class="c-header__subtitle">
            Draft scaled architectural walls, position real-dimension furniture items, verify clearance zones,
            and export print-ready dimensioned blueprints or vector SVGs directly in your browser.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <!-- Main Layout -->
      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Layout & Architectural Configuration</h2>
          </div>

          <div class="c-card__body">
            <!-- Preset Selector -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Architectural Presets</label>
              <div class="l-extremo g--margin-top-1" style="gap: 8px; flex-wrap: wrap;">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activePreset() === 'studio_30m'"
                  [class.c-button--outline]="activePreset() !== 'studio_30m'"
                  (click)="loadPreset('studio_30m')"
                >
                  Studio (30m²)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activePreset() === 'one_bedroom_50m'"
                  [class.c-button--outline]="activePreset() !== 'one_bedroom_50m'"
                  (click)="loadPreset('one_bedroom_50m')"
                >
                  1-Bedroom (50m²)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activePreset() === 'office_60m'"
                  [class.c-button--outline]="activePreset() !== 'office_60m'"
                  (click)="loadPreset('office_60m')"
                >
                  Studio Office (60m²)
                </button>
              </div>
            </div>

            <!-- Units & Scale -->
            <div class="l-columns l-columns--2 g--margin-bottom-4" style="gap: 12px;">
              <div class="l-columns__area">
                <label class="c-input__label">Measurement Unit</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="project().options.measurementUnit"
                  (ngModelChange)="updateUnit($event)"
                >
                  <option value="metric_meters">Metric (Meters / cm)</option>
                  <option value="imperial_feet">Imperial (Feet / Inches)</option>
                </select>
              </div>

              <div class="l-columns__area">
                <label class="c-input__label">Blueprint Scale</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="project().options.blueprintScale"
                  (ngModelChange)="updateScale($event)"
                >
                  <option value="1:20">1:20 (Detail View)</option>
                  <option value="1:50">1:50 (Standard Architectural)</option>
                  <option value="1:100">1:100 (Site / Overall)</option>
                </select>
              </div>
            </div>

            <!-- Visual Theme & Snap -->
            <div class="l-columns l-columns--2 g--margin-bottom-4" style="gap: 12px;">
              <div class="l-columns__area">
                <label class="c-input__label">Visual Theme</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="project().options.themeColor"
                  (ngModelChange)="updateTheme($event)"
                >
                  <option value="blueprint_blue">Classic Cyan Blueprint</option>
                  <option value="classic_cad_dark">Dark CAD Workstation</option>
                  <option value="clean_white">Clean Paper White</option>
                </select>
              </div>

              <div class="l-columns__area">
                <label class="c-input__label">Grid Snap Step</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="project().options.gridSnapStepCm"
                  (ngModelChange)="updateSnap($event)"
                >
                  <option [ngValue]="10">10 cm</option>
                  <option [ngValue]="25">25 cm (Quarter Meter)</option>
                  <option [ngValue]="50">50 cm (Half Meter)</option>
                  <option [ngValue]="100">100 cm (Full Meter)</option>
                </select>
              </div>
            </div>

            <!-- Display Toggles -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Layer Visibility</label>
              <div class="l-extremo g--margin-top-1" style="gap: 12px; flex-wrap: wrap;">
                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="project().options.showGrid"
                    (change)="toggleOption('showGrid')"
                  />
                  <span>Grid</span>
                </label>
                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="project().options.showDimensions"
                    (change)="toggleOption('showDimensions')"
                  />
                  <span>Dimensions</span>
                </label>
                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="project().options.showAreaReadouts"
                    (change)="toggleOption('showAreaReadouts')"
                  />
                  <span>Area Readouts</span>
                </label>
                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="project().options.showFurniture"
                    (change)="toggleOption('showFurniture')"
                  />
                  <span>Furniture</span>
                </label>
              </div>
            </div>

            <!-- Add Furniture Section -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Add Scaled Furniture</label>
              <div
                class="g--margin-top-1"
                style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px;"
              >
                @for (tpl of furnitureTemplates; track tpl.type) {
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small"
                    style="font-size: 11px; padding: 4px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                    (click)="addFurniture(tpl.type)"
                  >
                    + {{ tpl.name }}
                  </button>
                }
              </div>
            </div>

            <!-- Selected Furniture Item Inspector -->
            @if (selectedFurnitureItem(); as selected) {
              <div
                class="c-card g--margin-bottom-4"
                style="background: rgba(0,0,0,0.03); border: 1px dashed #cbd5e1; padding: 12px; border-radius: 6px;"
              >
                <div class="l-extremo" style="align-items: center; margin-bottom: 8px;">
                  <span style="font-weight: 600; font-size: 13px;">Selected: {{ selected.name }}</span>
                  <button
                    type="button"
                    class="c-button c-button--danger c-button--small"
                    style="padding: 2px 8px; font-size: 11px;"
                    (click)="deleteFurniture(selected.id)"
                  >
                    Delete
                  </button>
                </div>

                <div class="l-columns l-columns--3" style="gap: 8px;">
                  <div class="l-columns__area">
                    <label class="c-input__label" style="font-size: 11px;">X (cm)</label>
                    <input
                      type="number"
                      class="c-input c-input--small"
                      [ngModel]="selected.x"
                      (ngModelChange)="updateSelectedItem({ x: $event })"
                    />
                  </div>
                  <div class="l-columns__area">
                    <label class="c-input__label" style="font-size: 11px;">Y (cm)</label>
                    <input
                      type="number"
                      class="c-input c-input--small"
                      [ngModel]="selected.y"
                      (ngModelChange)="updateSelectedItem({ y: $event })"
                    />
                  </div>
                  <div class="l-columns__area">
                    <label class="c-input__label" style="font-size: 11px;">Rotation (°)</label>
                    <input
                      type="number"
                      class="c-input c-input--small"
                      [ngModel]="selected.rotationDeg"
                      (ngModelChange)="updateSelectedItem({ rotationDeg: $event })"
                      step="15"
                    />
                  </div>
                </div>

                <div class="l-columns l-columns--2 g--margin-top-2" style="gap: 8px;">
                  <div class="l-columns__area">
                    <label class="c-input__label" style="font-size: 11px;">Width (cm)</label>
                    <input
                      type="number"
                      class="c-input c-input--small"
                      [ngModel]="selected.widthCm"
                      (ngModelChange)="updateSelectedItem({ widthCm: $event })"
                    />
                  </div>
                  <div class="l-columns__area">
                    <label class="c-input__label" style="font-size: 11px;">Depth (cm)</label>
                    <input
                      type="number"
                      class="c-input c-input--small"
                      [ngModel]="selected.depthCm"
                      (ngModelChange)="updateSelectedItem({ depthCm: $event })"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- Warnings / Clearance Notice -->
            @if (clearanceWarnings().length > 0) {
              <div
                class="c-card g--margin-bottom-4"
                style="background: #fffbeb; border: 1px solid #fef08a; padding: 10px; border-radius: 6px;"
              >
                <div style="font-size: 12px; color: #b45309; font-weight: 600;">
                  ⚠️ Clearance & Overlap Warning:
                </div>
                @for (w of clearanceWarnings(); track w.itemId1 + w.itemId2) {
                  <div style="font-size: 11px; color: #92400e; margin-top: 2px;">
                    • <strong>{{ w.item1Name }}</strong> overlaps with <strong>{{ w.item2Name }}</strong>
                  </div>
                }
              </div>
            }
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="resetToDefaults()"
              >
                Reset to Defaults
              </button>
            </div>
            <div class="l-extremo__area-derecha" style="display: flex; gap: 8px;">
              <label class="c-button c-button--outline" style="cursor: pointer; margin: 0;">
                Import JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  style="display: none;"
                  (change)="onJsonFileSelected($event)"
                />
              </label>
              <button
                type="button"
                class="c-button c-button--secondary"
                (click)="downloadJson()"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>

        <!-- Preview Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header l-extremo" style="align-items: center;">
            <h2 class="c-card__title">Real-Time Scaled Blueprint</h2>
            <div style="font-size: 12px; opacity: 0.7;">
              Walls: {{ project().walls.length }} • Furniture: {{ project().furniture.length }}
            </div>
          </div>

          <div class="c-card__body">
            <!-- Scaled Interactive SVG Viewport -->
            <div
              class="c-preview"
              style="min-height: 440px; display: flex; align-items: center; justify-content: center; overflow: auto; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;"
              [style.background]="viewportBackground()"
            >
              <div
                [innerHTML]="sanitizedSvg()"
                style="width: 100%; max-height: 520px; display: flex; justify-content: center;"
              ></div>
            </div>

            <!-- List of Furniture Items in Scene -->
            <div class="g--margin-top-3">
              <label class="c-input__label">Furniture in Plan (Click to Select)</label>
              <div class="l-extremo g--margin-top-1" style="gap: 6px; flex-wrap: wrap;">
                @for (item of project().furniture; track item.id) {
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="selectedFurnitureId() === item.id"
                    [class.c-button--outline]="selectedFurnitureId() !== item.id"
                    style="font-size: 11px; padding: 2px 8px;"
                    (click)="selectFurniture(item.id)"
                  >
                    {{ item.name }}
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Export Action Bar -->
          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--secondary"
                (click)="downloadSvg()"
              >
                Download Vector SVG
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                (click)="downloadPdf()"
              >
                Download Blueprint PDF (A4)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanFurnitureScalerComponent implements OnDestroy {
  readonly furnitureTemplates: FurnitureTemplate[] = FURNITURE_TEMPLATES;

  // State signals
  readonly project = signal<FloorPlanProject>(JSON.parse(JSON.stringify(SAMPLE_STUDIO_PLAN)));
  readonly activePreset = signal<'studio_30m' | 'one_bedroom_50m' | 'office_60m'>('studio_30m');
  readonly selectedFurnitureId = signal<string | null>(null);

  // Computed state
  readonly selectedFurnitureItem = computed(() => {
    const id = this.selectedFurnitureId();
    if (!id) return null;
    return this.project().furniture.find((f) => f.id === id) || null;
  });

  readonly clearanceWarnings = computed<ClearanceWarning[]>(() => {
    return checkFurnitureClearances(this.project().furniture, this.project().walls);
  });

  readonly svgPreview = computed<string>(() => {
    return generateFloorPlanSvg(this.project());
  });

  readonly sanitizedSvg = computed<SafeHtml>(() => {
    return this.sanitizer.bypassSecurityTrustHtml(this.svgPreview());
  });

  readonly viewportBackground = computed<string>(() => {
    const theme = this.project().options.themeColor;
    if (theme === 'classic_cad_dark') return '#111827';
    if (theme === 'clean_white') return '#ffffff';
    return '#0f2338';
  });

  // Memory hygiene: track active Object URLs to revoke
  private readonly activeObjectUrls: string[] = [];

  constructor(private readonly sanitizer: DomSanitizer) {}

  loadPreset(preset: 'studio_30m' | 'one_bedroom_50m' | 'office_60m'): void {
    this.activePreset.set(preset);
    this.project.set(createPresetProject(preset));
    this.selectedFurnitureId.set(null);
  }

  updateUnit(unit: MeasurementUnit): void {
    this.project.update((p) => ({
      ...p,
      options: { ...p.options, measurementUnit: unit },
    }));
  }

  updateScale(scale: BlueprintScale): void {
    this.project.update((p) => ({
      ...p,
      options: { ...p.options, blueprintScale: scale },
    }));
  }

  updateTheme(theme: ThemeColor): void {
    this.project.update((p) => ({
      ...p,
      options: { ...p.options, themeColor: theme },
    }));
  }

  updateSnap(snap: number): void {
    this.project.update((p) => ({
      ...p,
      options: { ...p.options, gridSnapStepCm: snap },
    }));
  }

  toggleOption(
    key: 'showGrid' | 'showDimensions' | 'showAreaReadouts' | 'showFurniture'
  ): void {
    this.project.update((p) => ({
      ...p,
      options: { ...p.options, [key]: !p.options[key] },
    }));
  }

  addFurniture(type: FurnitureType): void {
    const tpl = this.furnitureTemplates.find((t) => t.type === type);
    if (!tpl) return;

    const newId = `f_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newItem: FurnitureItem = {
      id: newId,
      type: tpl.type,
      name: tpl.name,
      x: 300,
      y: 250,
      widthCm: tpl.defaultWidthCm,
      depthCm: tpl.defaultDepthCm,
      rotationDeg: 0,
    };

    this.project.update((p) => ({
      ...p,
      furniture: [...p.furniture, newItem],
    }));
    this.selectedFurnitureId.set(newId);
  }

  selectFurniture(id: string): void {
    this.selectedFurnitureId.set(this.selectedFurnitureId() === id ? null : id);
  }

  updateSelectedItem(changes: Partial<FurnitureItem>): void {
    const id = this.selectedFurnitureId();
    if (!id) return;

    this.project.update((p) => ({
      ...p,
      furniture: p.furniture.map((f) => (f.id === id ? { ...f, ...changes } : f)),
    }));
  }

  deleteFurniture(id: string): void {
    this.project.update((p) => ({
      ...p,
      furniture: p.furniture.filter((f) => f.id !== id),
    }));
    if (this.selectedFurnitureId() === id) {
      this.selectedFurnitureId.set(null);
    }
  }

  resetToDefaults(): void {
    this.loadPreset('studio_30m');
  }

  downloadSvg(): void {
    const svgStr = this.svgPreview();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    this.triggerDownload(blob, `${this.getSanitizedFileName()}.svg`);
  }

  downloadJson(): void {
    const jsonStr = exportProjectToJson(this.project());
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    this.triggerDownload(blob, `${this.getSanitizedFileName()}.json`);
  }

  async downloadPdf(): Promise<void> {
    const blob = await generateBlueprintPdf(this.project());
    this.triggerDownload(blob, `${this.getSanitizedFileName()}-blueprint.pdf`);
  }

  async onJsonFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const text = await file.text();
      const imported = importProjectFromJson(text);
      this.project.set(imported);
      this.selectedFurnitureId.set(null);
    } catch (err) {
      console.error('Failed to import JSON floor plan:', err);
    } finally {
      input.value = '';
    }
  }

  private getSanitizedFileName(): string {
    const name = this.project().name || 'floor-plan';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-');
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    this.activeObjectUrls.push(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Immediate cleanup as per Directive 4
    URL.revokeObjectURL(url);
    const idx = this.activeObjectUrls.indexOf(url);
    if (idx !== -1) {
      this.activeObjectUrls.splice(idx, 1);
    }
  }

  ngOnDestroy(): void {
    for (const url of this.activeObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeObjectUrls.length = 0;
  }
}
