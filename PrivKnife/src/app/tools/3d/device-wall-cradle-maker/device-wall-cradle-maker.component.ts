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
  buildDeviceCradleFileBase,
  calculateDeviceCradleMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateDeviceCradleParts,
  validateDeviceCradleOptions,
} from './engine';
import { DEVICE_CRADLE_PRESET_CARDS, DeviceCradlePresetCard } from './test-fixtures';
import {
  CradleStyle,
  DEFAULT_DEVICE_CRADLE_OPTIONS,
  DeviceCradleMetrics,
  DeviceCradleParts,
  DeviceCradleWorkerRequest,
  DeviceCradleWorkerResponse,
  DeviceWallCradleOptions,
  MountFlangePlacement,
} from './types';

@Component({
  selector: 'app-device-wall-cradle-maker',
  standalone: true,
  imports: [Badge, Card, ProgressBar, TranslatePipe],
  templateUrl: './device-wall-cradle-maker.component.html',
  styleUrl: './device-wall-cradle-maker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceWallCradleMakerComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer', { static: true })
  viewportContainer?: ElementRef<HTMLDivElement>;

  readonly options = signal<DeviceWallCradleOptions>({ ...DEFAULT_DEVICE_CRADLE_OPTIONS });
  readonly activePresetId = signal<string>('gan_brick_140w');
  readonly metrics = signal<DeviceCradleMetrics | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly wireframe = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly exportProgress = signal<number>(0);

  readonly presets = DEVICE_CRADLE_PRESET_CARDS;
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

  applyPreset(card: DeviceCradlePresetCard): void {
    this.activePresetId.set(card.id);
    this.options.set({ ...this.options(), ...card.patch });
    this.rebuildScene();
  }

  updateOption<K extends keyof DeviceWallCradleOptions>(
    key: K,
    value: DeviceWallCradleOptions[K]
  ): void {
    this.activePresetId.set('');
    this.options.set({ ...this.options(), [key]: value });
    this.rebuildScene();
  }

  patchOptions(patch: Partial<DeviceWallCradleOptions>): void {
    this.activePresetId.set('');
    this.options.set({ ...this.options(), ...patch });
    this.rebuildScene();
  }

  onSelectChange(key: 'cradleStyle' | 'mountFlangePlacement', event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (key === 'cradleStyle') {
      this.updateOption('cradleStyle', val as CradleStyle);
    } else {
      this.updateOption('mountFlangePlacement', val as MountFlangePlacement);
    }
  }

  onNumberInput(
    key:
      | 'deviceWidthMm'
      | 'deviceThicknessMm'
      | 'mountSpanMm'
      | 'wallThicknessMm'
      | 'fitClearanceMm'
      | 'railShelfWidthMm'
      | 'screwDiameterMm',
    event: Event,
    isFloat = false
  ): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    this.updateOption(key, parsed);
  }

  onCheckboxChange(key: 'includeBackstop' | 'includeThermalVents', event: Event): void {
    this.updateOption(key, (event.target as HTMLInputElement).checked);
  }

  onColorInput(event: Event): void {
    this.updateOption('filamentColorHex', (event.target as HTMLInputElement).value);
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
    const span = m ? Math.max(m.widthMm, m.depthMm, m.heightMm, 60) : 110;
    if (this.camera) {
      this.camera.position.set(span * 0.9, -span * 1.35, span * 1.1);
      this.camera.up.set(0, 0, 1);
      if (this.controls) {
        this.controls.target.set(0, 0, (m?.heightMm ?? 60) * 0.42);
        this.controls.update();
      } else {
        this.camera.lookAt(0, 0, (m?.heightMm ?? 60) * 0.42);
      }
    }
  }

  resetDefaults(): void {
    this.revokeAllObjectUrls();
    this.activePresetId.set('gan_brick_140w');
    this.options.set({ ...DEFAULT_DEVICE_CRADLE_OPTIONS });
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
    const check = validateDeviceCradleOptions(opts);
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

      const parts = generateDeviceCradleParts(opts);
      try {
        this.exportProgress.set(60);
        const fileBase = buildDeviceCradleFileBase(opts);
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

  private runWorkerExport(opts: DeviceWallCradleOptions, format: 'stl' | '3mf'): Promise<void> {
    this.terminateActiveWorker();

    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.activeWorker = worker;

      worker.onmessage = (event: MessageEvent<DeviceCradleWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'progress' && typeof msg.percent === 'number') {
          this.exportProgress.set(msg.percent);
        } else if (msg.type === 'result' && msg.buffer) {
          const blob = new Blob([msg.buffer], {
            type: msg.mimeType || 'application/octet-stream',
          });
          this.triggerDownload(
            blob,
            msg.fileName || `${buildDeviceCradleFileBase(opts)}.${format}`
          );
          this.terminateActiveWorker();
          resolve();
        } else if (msg.type === 'error') {
          this.terminateActiveWorker();
          reject(new Error(msg.error || 'Device cradle export failed.'));
        }
      };

      worker.onerror = (err) => {
        this.terminateActiveWorker();
        reject(err);
      };

      const request: DeviceCradleWorkerRequest = {
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
    const check = validateDeviceCradleOptions(opts);
    if (!check.valid) {
      this.validationError.set(check.error || 'Invalid configuration.');
      this.metrics.set(null);
      this.disposePreviewGroup();
      return;
    }

    this.validationError.set(null);

    let parts: DeviceCradleParts | null = null;
    try {
      parts = generateDeviceCradleParts(opts);
      const computedMetrics = calculateDeviceCradleMetrics(opts, parts);
      this.metrics.set(computedMetrics);

      if (!this.scene) {
        return;
      }

      this.disposePreviewGroup();

      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(opts.filamentColorHex || '#2563eb'),
        roughness: 0.42,
        metalness: 0.08,
        wireframe: this.wireframe(),
      });

      const mesh = new THREE.Mesh(parts.mergedGeometry.clone(), mat);
      mesh.name = 'device-cradle-mesh';
      group.add(mesh);

      const box = new THREE.Box3().setFromObject(group);
      const center = new THREE.Vector3();
      box.getCenter(center);
      group.position.set(-center.x, -center.y, -box.min.z);

      this.previewGroup = group;
      this.scene.add(group);
      this.resetCamera();
    } finally {
      parts?.dispose();
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

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 2000);
      camera.up.set(0, 0, 1);
      camera.position.set(110, -150, 120);

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
      controls.target.set(0, 0, 30);
      controls.update();

      const ambient = new THREE.AmbientLight(0xffffff, 0.56);
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
      keyLight.position.set(140, -160, 220);
      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
      fillLight.position.set(-140, 140, 100);
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
