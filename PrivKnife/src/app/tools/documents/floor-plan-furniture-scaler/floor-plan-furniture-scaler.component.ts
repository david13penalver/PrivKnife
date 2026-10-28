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
import DOMPurify from 'dompurify';
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
  resizeRoomDimensions,
  snapToGrid,
} from './engine';

function getSanitizer(): { sanitize: (html: string, options?: any) => string } {
  if (DOMPurify && typeof (DOMPurify as any).sanitize === 'function') {
    return DOMPurify as any;
  }
  const win = typeof window !== 'undefined' ? window : undefined;
  if (typeof DOMPurify === 'function' && win) {
    return (DOMPurify as any)(win);
  }
  return {
    sanitize: (dirty: string) => dirty,
  };
}

@Component({
  selector: 'app-floor-plan-furniture-scaler',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './floor-plan-furniture-scaler.component.html',
  styleUrl: './floor-plan-furniture-scaler.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanFurnitureScalerComponent implements OnDestroy {
  readonly furnitureTemplates: FurnitureTemplate[] = FURNITURE_TEMPLATES;

  // State signals
  readonly project = signal<FloorPlanProject>(JSON.parse(JSON.stringify(SAMPLE_STUDIO_PLAN)));
  readonly activePreset = signal<'studio_30m' | 'one_bedroom_50m' | 'office_60m'>('studio_30m');
  readonly selectedFurnitureId = signal<string | null>(null);
  readonly importError = signal<string | null>(null);

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
    const rawSvg = this.svgPreview();
    const cleanSvg = getSanitizer().sanitize(rawSvg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    return this.sanitizer.bypassSecurityTrustHtml(cleanSvg);
  });

  readonly viewportBackground = computed<string>(() => {
    const theme = this.project().options.themeColor;
    if (theme === 'classic_cad_dark') return '#111827';
    if (theme === 'clean_white') return '#ffffff';
    return '#0f2338';
  });

  readonly currentRoomWidth = computed<number>(() => {
    const walls = this.project().walls;
    if (!walls || walls.length === 0) return 600;
    const minX = Math.min(...walls.flatMap((w) => [w.start.x, w.end.x]));
    const maxX = Math.max(...walls.flatMap((w) => [w.start.x, w.end.x]));
    return maxX - minX || 600;
  });

  readonly currentRoomDepth = computed<number>(() => {
    const walls = this.project().walls;
    if (!walls || walls.length === 0) return 500;
    const minY = Math.min(...walls.flatMap((w) => [w.start.y, w.end.y]));
    const maxY = Math.max(...walls.flatMap((w) => [w.start.y, w.end.y]));
    return maxY - minY || 500;
  });

  // Memory hygiene: track active Object URLs to revoke
  private readonly activeObjectUrls: string[] = [];

  constructor(private readonly sanitizer: DomSanitizer) {}

  loadPreset(preset: 'studio_30m' | 'one_bedroom_50m' | 'office_60m'): void {
    this.importError.set(null);
    this.activePreset.set(preset);
    this.project.set(createPresetProject(preset));
    this.selectedFurnitureId.set(null);
  }

  onRoomWidthChange(width: number): void {
    if (!width || width < 100) return;
    this.project.update((p) => resizeRoomDimensions(p, width, this.currentRoomDepth()));
  }

  onRoomDepthChange(depth: number): void {
    if (!depth || depth < 100) return;
    this.project.update((p) => resizeRoomDimensions(p, this.currentRoomWidth(), depth));
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

    const step = this.project().options.gridSnapStepCm || 25;
    const newId = `f_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newItem: FurnitureItem = {
      id: newId,
      type: tpl.type,
      name: tpl.name,
      x: snapToGrid(300, step),
      y: snapToGrid(250, step),
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

    const step = this.project().options.gridSnapStepCm || 1;
    const normalizedChanges: Partial<FurnitureItem> = { ...changes };
    if (normalizedChanges.x !== undefined && step > 1) {
      normalizedChanges.x = snapToGrid(Number(normalizedChanges.x), step);
    }
    if (normalizedChanges.y !== undefined && step > 1) {
      normalizedChanges.y = snapToGrid(Number(normalizedChanges.y), step);
    }

    this.project.update((p) => ({
      ...p,
      furniture: p.furniture.map((f) => (f.id === id ? { ...f, ...normalizedChanges } : f)),
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
    this.importError.set(null);
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
      this.importError.set(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON file format';
      this.importError.set(`Failed to import JSON floor plan: ${msg}`);
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
