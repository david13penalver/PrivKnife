import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Badge, Card, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  buildDrawerGridFileBase,
  calculateDrawerGridMetrics,
  exportPlateZip,
  exportTo3mf,
  exportToBinaryStl,
  generateDrawerGridParts,
  validateDrawerGridOptions,
} from './engine';
import { DRAWER_GRID_PRESETS } from './test-fixtures';
import {
  BED_PRESETS,
  DEFAULT_DRAWER_GRID_OPTIONS,
  DrawerDividerGridOptions,
  DrawerGridMetrics,
  DrawerGridParts,
  DrawerGridPreset,
  DrawerGridWorkerRequest,
  DrawerGridWorkerResponse,
} from './types';

@Component({
  selector: 'app-drawer-divider-grid-maker',
  standalone: true,
  imports: [Badge, Card, ProgressBar, TranslatePipe],
  templateUrl: './drawer-divider-grid-maker.component.html',
  styleUrl: './drawer-divider-grid-maker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerDividerGridMakerComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer', { static: true })
  viewportContainer?: ElementRef<HTMLDivElement>;

  readonly options = signal<DrawerDividerGridOptions>({ ...DEFAULT_DRAWER_GRID_OPTIONS });
  readonly activePresetId = signal<string>('ikea_alex_desk');
  readonly metrics = signal<DrawerGridMetrics | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly wireframe = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly exportProgress = signal<number>(0);

  readonly presets = DRAWER_GRID_PRESETS;
  readonly bedPresets = BED_PRESETS;
  readonly createdObjectUrls: string[] = [];

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private rootGroup: THREE.Group | null = null;
  private assembledGroup: THREE.Group | null = null;
  private flatGroup: THREE.Group | null = null;
  private animationFrameId: number | null = null;
  private activeWorker: Worker | null = null;

  ngOnInit(): void {
    this.initThree();
    this.rebuildScene();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.terminateActiveWorker();
    this.revokeAllObjectUrls();
    this.disposeRootGroup();

    this.controls?.dispose();
    this.controls = null;

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
  }

  applyPreset(preset: DrawerGridPreset): void {
    this.activePresetId.set(preset.id);
    this.options.set({ ...preset.options });
    this.rebuildScene();
  }

  toggleViewMode(): void {
    const cur = this.options();
    const nextMode = cur.viewMode === 'assembled' ? 'flat_plates' : 'assembled';
    this.options.set({ ...cur, viewMode: nextMode });
    this.applyViewVisibility(nextMode);
    this.resetView();
  }

  updateOption<K extends keyof DrawerDividerGridOptions>(
    key: K,
    value: DrawerDividerGridOptions[K]
  ): void {
    this.activePresetId.set('');
    this.options.set({ ...this.options(), [key]: value });
    this.rebuildScene();
  }

  patchOptions(patch: Partial<DrawerDividerGridOptions>): void {
    this.activePresetId.set('');
    this.options.set({ ...this.options(), ...patch });
    this.rebuildScene();
  }

  onNumberInput(key: keyof DrawerDividerGridOptions, event: Event, isFloat = false): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    this.updateOption(key, parsed as DrawerDividerGridOptions[typeof key]);
  }

  onBedSelect(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    if (Number.isFinite(val)) {
      this.updateOption('printerBedMm', val);
    }
  }

  onCheckboxChange(key: 'includeBaseFeet' | 'includePieceLabels', event: Event): void {
    this.updateOption(key, (event.target as HTMLInputElement).checked);
  }

  onTextInput(
    key: 'customColRatios' | 'customRowRatios' | 'filamentColorHex',
    event: Event
  ): void {
    this.updateOption(key, (event.target as HTMLInputElement).value);
  }

  toggleWireframe(): void {
    const next = !this.wireframe();
    this.wireframe.set(next);
    if (!this.rootGroup) return;
    this.rootGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.wireframe = next;
        obj.material.needsUpdate = true;
      }
    });
  }

  resetView(): void {
    const m = this.metrics();
    const isFlat = this.options().viewMode === 'flat_plates';
    const span = m
      ? Math.max(m.usableWidthMm, m.usableDepthMm) * (isFlat ? 1.05 : 0.85)
      : 220;
    if (this.camera) {
      if (isFlat) {
        this.camera.position.set(0, -span * 0.6, span * 1.15);
      } else {
        this.camera.position.set(span * 0.85, -span * 1.05, span * 0.82);
      }
      this.camera.up.set(0, 0, 1);
      if (this.controls) {
        this.controls.target.set(0, 0, isFlat ? 0 : this.options().dividerHeightMm * 0.45);
        this.controls.update();
      } else {
        this.camera.lookAt(0, 0, isFlat ? 0 : this.options().dividerHeightMm * 0.45);
      }
    }
  }

  reset(): void {
    this.revokeAllObjectUrls();
    this.activePresetId.set('ikea_alex_desk');
    this.options.set({ ...DEFAULT_DRAWER_GRID_OPTIONS });
    this.wireframe.set(false);
    this.rebuildScene();
    this.resetView();
  }

  async exportFormat(format: 'stl' | '3mf' | 'zip'): Promise<void> {
    const opts = this.options();
    const check = validateDrawerGridOptions(opts);
    if (!check.valid) {
      this.validationError.set(check.error || 'Invalid configuration.');
      return;
    }

    this.isExporting.set(true);
    this.exportProgress.set(10);

    try {
      if (typeof Worker !== 'undefined') {
        try {
          await this.runWorkerExport(opts, format);
          return;
        } catch {
          // Safe fallback
        }
      }

      const parts = generateDrawerGridParts(opts);
      try {
        this.exportProgress.set(60);
        const fileBase = buildDrawerGridFileBase(opts);
        if (format === '3mf') {
          const blob = await exportTo3mf(opts, parts);
          this.triggerDownload(blob, `${fileBase}.3mf`);
        } else if (format === 'zip') {
          const blob = await exportPlateZip(opts, parts);
          this.triggerDownload(blob, `${fileBase}-plates.zip`);
        } else {
          const buffer = exportToBinaryStl(parts);
          this.triggerDownload(new Blob([buffer], { type: 'model/stl' }), `${fileBase}.stl`);
        }
        this.exportProgress.set(100);
      } finally {
        parts.dispose();
      }
    } finally {
      this.isExporting.set(false);
    }
  }

  exportPng(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
    const base = buildDrawerGridFileBase(this.options());
    this.renderer.domElement.toBlob((blob) => {
      if (blob) {
        this.triggerDownload(blob, `${base}-preview.png`);
      }
    }, 'image/png');
  }

  formatFixed(value: number | undefined, digits: number): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
    return value.toFixed(digits);
  }

  private applyViewVisibility(mode: DrawerDividerGridOptions['viewMode']): void {
    if (this.assembledGroup) {
      this.assembledGroup.visible = mode === 'assembled';
    }
    if (this.flatGroup) {
      this.flatGroup.visible = mode === 'flat_plates';
    }
  }

  private runWorkerExport(
    opts: DrawerDividerGridOptions,
    format: 'stl' | '3mf' | 'zip'
  ): Promise<void> {
    this.terminateActiveWorker();
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.activeWorker = worker;

      worker.onmessage = (event: MessageEvent<DrawerGridWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'progress' && typeof msg.percent === 'number') {
          this.exportProgress.set(msg.percent);
        } else if (msg.type === 'result' && msg.buffer) {
          const blob = new Blob([msg.buffer], {
            type: msg.mimeType || 'application/octet-stream',
          });
          this.triggerDownload(blob, msg.fileName || `${buildDrawerGridFileBase(opts)}.${format}`);
          this.terminateActiveWorker();
          resolve();
        } else if (msg.type === 'error') {
          this.terminateActiveWorker();
          reject(new Error(msg.error || 'Export failed'));
        }
      };

      worker.onerror = (err) => {
        this.terminateActiveWorker();
        reject(err);
      };

      const request: DrawerGridWorkerRequest = {
        id: 1,
        type: format === '3mf' ? 'export-3mf' : format === 'zip' ? 'export-zip' : 'export-stl',
        options: opts,
      };
      worker.postMessage(request);
    });
  }

  private terminateActiveWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.push(url);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(url);
      const idx = this.createdObjectUrls.indexOf(url);
      if (idx >= 0) this.createdObjectUrls.splice(idx, 1);
    }
  }

  private revokeAllObjectUrls(): void {
    while (this.createdObjectUrls.length > 0) {
      const url = this.createdObjectUrls.pop();
      if (url) URL.revokeObjectURL(url);
    }
  }

  private rebuildScene(): void {
    const opts = this.options();
    const check = validateDrawerGridOptions(opts);
    if (!check.valid) {
      this.validationError.set(check.error || 'Invalid configuration.');
      this.metrics.set(null);
      this.disposeRootGroup();
      return;
    }

    this.validationError.set(null);

    let parts: DrawerGridParts | null = null;
    try {
      parts = generateDrawerGridParts(opts);
      const computedMetrics = calculateDrawerGridMetrics(opts, parts);
      this.metrics.set(computedMetrics);

      if (!this.scene) return;

      this.disposeRootGroup();

      const root = new THREE.Group();
      const assembled = new THREE.Group();
      const flat = new THREE.Group();
      const isWire = this.wireframe();

      const slatMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(opts.filamentColorHex || '#10b981'),
        roughness: 0.42,
        metalness: 0.08,
        wireframe: isWire,
      });
      const labelMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.35,
        metalness: 0.1,
        wireframe: isWire,
      });

      for (const seg of parts.segments) {
        assembled.add(new THREE.Mesh(seg.assembledGeometry.clone(), slatMat.clone()));
        flat.add(new THREE.Mesh(seg.flatGeometry.clone(), slatMat.clone()));
        if (seg.labelAssembledGeometry) {
          assembled.add(new THREE.Mesh(seg.labelAssembledGeometry.clone(), labelMat.clone()));
        }
        if (seg.labelFlatGeometry) {
          flat.add(new THREE.Mesh(seg.labelFlatGeometry.clone(), labelMat.clone()));
        }
      }

      slatMat.dispose();
      labelMat.dispose();

      // Center flat plate cluster neatly around origin XY
      const flatBox = new THREE.Box3().setFromObject(flat);
      if (!flatBox.isEmpty()) {
        const fc = new THREE.Vector3();
        flatBox.getCenter(fc);
        flat.position.set(-fc.x, -fc.y, -flatBox.min.z);
      }

      root.add(assembled, flat);
      this.assembledGroup = assembled;
      this.flatGroup = flat;
      this.rootGroup = root;
      this.applyViewVisibility(opts.viewMode);

      this.scene.add(root);
      this.resetView();
    } finally {
      parts?.dispose();
    }
  }

  private disposeRootGroup(): void {
    this.assembledGroup = null;
    this.flatGroup = null;
    if (!this.rootGroup) return;
    if (this.scene) {
      this.scene.remove(this.rootGroup);
    }
    this.rootGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.rootGroup = null;
  }

  private initThree(): void {
    const container = this.viewportContainer?.nativeElement;
    if (!container) return;

    try {
      const width = container.clientWidth || 560;
      const height = container.clientHeight || 400;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);

      const grid = new THREE.GridHelper(320, 32, 0x334155, 0x1e293b);
      grid.rotation.x = Math.PI / 2;
      scene.add(grid);

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 3000);
      camera.up.set(0, 0, 1);
      camera.position.set(180, -240, 210);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.target.set(0, 0, 20);
      controls.update();

      const ambient = new THREE.AmbientLight(0xffffff, 0.55);
      const key = new THREE.DirectionalLight(0xffffff, 0.9);
      key.position.set(180, -200, 260);
      const fill = new THREE.DirectionalLight(0x93c5fd, 0.4);
      fill.position.set(-180, 180, 120);
      scene.add(ambient, key, fill);

      this.scene = scene;
      this.camera = camera;
      this.renderer = renderer;
      this.controls = controls;

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
    } catch {
      // Safe headless fallback
    }
  }
}
