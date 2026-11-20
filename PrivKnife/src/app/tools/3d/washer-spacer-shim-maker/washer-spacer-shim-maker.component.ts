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
  buildHardwareFileBase,
  calculateHardwareMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateHardwarePlateParts,
  validateHardwareOptions,
} from './engine';
import { HARDWARE_PRESET_CARDS, HardwarePresetCard } from './test-fixtures';
import {
  DEFAULT_HARDWARE_OPTIONS,
  HardwarePartMetrics,
  HardwarePartType,
  HardwarePlateParts,
  HardwareWorkerRequest,
  HardwareWorkerResponse,
  METRIC_BOLT_PRESETS,
  MetricBoltPreset,
  WasherSpacerShimOptions,
} from './types';

@Component({
  selector: 'app-washer-spacer-shim-maker',
  standalone: true,
  imports: [Badge, Card, ProgressBar, TranslatePipe],
  templateUrl: './washer-spacer-shim-maker.component.html',
  styleUrl: './washer-spacer-shim-maker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WasherSpacerShimMakerComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer', { static: true })
  viewportContainer?: ElementRef<HTMLDivElement>;

  readonly options = signal<WasherSpacerShimOptions>({ ...DEFAULT_HARDWARE_OPTIONS });
  readonly activePresetId = signal<string>('flat_m6_washer');
  readonly metrics = signal<HardwarePartMetrics | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly wireframe = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly exportProgress = signal<number>(0);

  readonly presets = HARDWARE_PRESET_CARDS;
  readonly boltSpecs = Object.values(METRIC_BOLT_PRESETS);

  readonly createdObjectUrls: string[] = [];

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private previewGroup: THREE.Group | null = null;
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
    this.disposePreviewGroup();

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

  applyPreset(card: HardwarePresetCard): void {
    this.activePresetId.set(card.id);
    this.options.set({ ...this.options(), ...card.patch });
    this.rebuildScene();
  }

  applyBoltPreset(preset: Exclude<MetricBoltPreset, 'custom'>): void {
    const spec = METRIC_BOLT_PRESETS[preset];
    if (!spec) return;
    this.activePresetId.set('');
    const current = this.options();
    const minSafeOd = Math.max(current.outerDiameterMm, spec.recommendedOdMm);
    this.options.set({
      ...current,
      boltPreset: preset,
      innerDiameterMm: spec.boreMm,
      outerDiameterMm:
        current.partType === 'leveling_wedge' || current.partType === 'u_slot_shim'
          ? current.outerDiameterMm
          : minSafeOd,
    });
    this.rebuildScene();
  }

  updateOption<K extends keyof WasherSpacerShimOptions>(
    key: K,
    value: WasherSpacerShimOptions[K]
  ): void {
    this.activePresetId.set('');
    const next: WasherSpacerShimOptions = { ...this.options(), [key]: value };
    if (key === 'innerDiameterMm' || key === 'outerDiameterMm') {
      next.boltPreset = 'custom';
    }
    this.options.set(next);
    this.rebuildScene();
  }

  patchOptions(patch: Partial<WasherSpacerShimOptions>): void {
    this.activePresetId.set('');
    this.options.set({ ...this.options(), ...patch });
    this.rebuildScene();
  }

  onPartTypeChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as HardwarePartType;
    this.updateOption('partType', val);
  }

  onNumberInput(
    key:
      | 'outerDiameterMm'
      | 'flangeDiameterMm'
      | 'flangeHeightMm'
      | 'innerDiameterMm'
      | 'heightMm'
      | 'chamferMm'
      | 'wedgeLengthMm'
      | 'wedgeMinHeightMm'
      | 'holeToleranceMm'
      | 'quantity',
    event: Event,
    isFloat = false
  ): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    this.updateOption(key, parsed);
  }

  onCheckboxChange(
    key: 'includeWedgeRibs' | 'includeScrewSlot' | 'includeBrimTabs',
    event: Event
  ): void {
    this.updateOption(key, (event.target as HTMLInputElement).checked);
  }

  onColorInput(event: Event): void {
    this.updateOption('partColorHex', (event.target as HTMLInputElement).value);
  }

  toggleWireframe(): void {
    const next = !this.wireframe();
    this.wireframe.set(next);
    if (!this.previewGroup) return;
    this.previewGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.wireframe = next;
        obj.material.needsUpdate = true;
      }
    });
  }

  resetCamera(): void {
    const m = this.metrics();
    const span = m ? Math.max(m.widthMm, m.depthMm, m.heightMm, 32) : 65;
    if (this.camera) {
      this.camera.position.set(span * 0.9, -span * 1.45, span * 1.25);
      this.camera.up.set(0, 0, 1);
      if (this.controls) {
        this.controls.target.set(0, 0, (m?.heightMm ?? 6) * 0.45);
        this.controls.update();
      } else {
        this.camera.lookAt(0, 0, (m?.heightMm ?? 6) * 0.45);
      }
    }
  }

  resetDefaults(): void {
    this.revokeAllObjectUrls();
    this.activePresetId.set('flat_m6_washer');
    this.options.set({ ...DEFAULT_HARDWARE_OPTIONS });
    this.wireframe.set(false);
    this.rebuildScene();
    this.resetCamera();
  }

  async exportStl(): Promise<void> {
    await this.exportFormat('stl');
  }

  async export3mf(): Promise<void> {
    await this.exportFormat('3mf');
  }

  async exportFormat(format: 'stl' | '3mf'): Promise<void> {
    const opts = this.options();
    const check = validateHardwareOptions(opts);
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
          // Headless fallback to client engine when Worker cannot spawn
        }
      }

      const parts = generateHardwarePlateParts(opts);
      try {
        this.exportProgress.set(60);
        const fileBase = buildHardwareFileBase(opts);
        if (format === '3mf') {
          const blob = await exportTo3mf(opts, parts);
          this.triggerDownload(blob, `${fileBase}.3mf`);
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

  formatFixed(value: number | undefined, digits: number): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
    return value.toFixed(digits);
  }

  private runWorkerExport(opts: WasherSpacerShimOptions, format: 'stl' | '3mf'): Promise<void> {
    this.terminateActiveWorker();

    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.activeWorker = worker;

      worker.onmessage = (event: MessageEvent<HardwareWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'progress' && typeof msg.percent === 'number') {
          this.exportProgress.set(msg.percent);
        } else if (msg.type === 'result' && msg.buffer) {
          const blob = new Blob([msg.buffer], {
            type: msg.mimeType || 'application/octet-stream',
          });
          this.triggerDownload(blob, msg.fileName || `${buildHardwareFileBase(opts)}.${format}`);
          this.terminateActiveWorker();
          resolve();
        } else if (msg.type === 'error') {
          this.terminateActiveWorker();
          reject(new Error(msg.error || 'Hardware export failed.'));
        }
      };

      worker.onerror = (err) => {
        this.terminateActiveWorker();
        reject(err);
      };

      const request: HardwareWorkerRequest = {
        id: 1,
        type: format === '3mf' ? 'export-3mf' : 'export-stl',
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
    const check = validateHardwareOptions(opts);
    if (!check.valid) {
      this.validationError.set(check.error || 'Invalid configuration.');
      this.metrics.set(null);
      this.disposePreviewGroup();
      return;
    }

    this.validationError.set(null);

    let plate: HardwarePlateParts | null = null;
    try {
      plate = generateHardwarePlateParts(opts);
      const computedMetrics = calculateHardwareMetrics(opts, plate);
      this.metrics.set(computedMetrics);

      if (!this.scene) {
        return;
      }

      this.disposePreviewGroup();

      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(opts.partColorHex || '#2563eb'),
        roughness: 0.38,
        metalness: 0.12,
        wireframe: this.wireframe(),
      });

      const mesh = new THREE.Mesh(plate.mergedGeometry.clone(), mat);
      mesh.name = 'hardware-plate-mesh';
      group.add(mesh);

      const box = new THREE.Box3().setFromObject(group);
      const center = new THREE.Vector3();
      box.getCenter(center);
      group.position.set(-center.x, -center.y, -box.min.z);

      this.previewGroup = group;
      this.scene.add(group);
      this.resetCamera();
    } finally {
      plate?.dispose();
    }
  }

  private disposePreviewGroup(): void {
    if (!this.previewGroup) return;
    if (this.scene) {
      this.scene.remove(this.previewGroup);
    }
    this.previewGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.previewGroup = null;
  }

  private initThree(): void {
    const container = this.viewportContainer?.nativeElement;
    if (!container) return;

    try {
      const width = container.clientWidth || 560;
      const height = container.clientHeight || 400;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);

      const grid = new THREE.GridHelper(220, 22, 0x334155, 0x1e293b);
      grid.rotation.x = Math.PI / 2;
      scene.add(grid);

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 2000);
      camera.up.set(0, 0, 1);
      camera.position.set(55, -85, 70);

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
      controls.target.set(0, 0, 5);
      controls.update();

      const ambient = new THREE.AmbientLight(0xffffff, 0.58);
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.92);
      keyLight.position.set(110, -130, 180);
      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
      fillLight.position.set(-100, 110, 90);
      scene.add(ambient, keyLight, fillLight);

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
      // Safe no-op in headless environments without WebGL
    }
  }
}
