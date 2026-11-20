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
  buildKnobFileBase,
  calculateKnobMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateKnobParts,
  validateKnobOptions,
} from './engine';
import { KNOB_PRESET_CARDS, KnobPresetCard } from './test-fixtures';
import {
  DEFAULT_KNOB_OPTIONS,
  KNOB_HARDWARE_STANDARDS,
  KnobDialHandwheelOptions,
  KnobDialMetrics,
  KnobGripStyle,
  KnobHardwarePreset,
  KnobParts,
  KnobWorkerRequest,
  KnobWorkerResponse,
  ShaftDriveType,
} from './types';

@Component({
  selector: 'app-knob-dial-handwheel-maker',
  standalone: true,
  imports: [Badge, Card, ProgressBar, TranslatePipe],
  templateUrl: './knob-dial-handwheel-maker.component.html',
  styleUrl: './knob-dial-handwheel-maker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnobDialHandwheelMakerComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer', { static: true })
  viewportContainer?: ElementRef<HTMLDivElement>;

  readonly options = signal<KnobDialHandwheelOptions>({ ...DEFAULT_KNOB_OPTIONS });
  readonly activePresetId = signal<string>('pot_dshaft_6mm');
  readonly metrics = signal<KnobDialMetrics | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly wireframe = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly exportProgress = signal<number>(0);

  readonly presets = KNOB_PRESET_CARDS;
  readonly hardwareStandards = Object.values(KNOB_HARDWARE_STANDARDS);
  readonly flatAngles: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];

  readonly createdObjectUrls: string[] = [];

  private readonly cutawayPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
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

  applyPreset(card: KnobPresetCard): void {
    this.activePresetId.set(card.id);
    this.options.set({ ...this.options(), ...card.patch });
    this.rebuildScene();
  }

  updateOption<K extends keyof KnobDialHandwheelOptions>(
    key: K,
    value: KnobDialHandwheelOptions[K]
  ): void {
    this.activePresetId.set('');
    this.options.set({ ...this.options(), [key]: value });
    this.rebuildScene();
  }

  patchOptions(patch: Partial<KnobDialHandwheelOptions>): void {
    this.activePresetId.set('');
    this.options.set({ ...this.options(), ...patch });
    this.rebuildScene();
  }

  onSelectChange(
    key: 'gripStyle' | 'driveType' | 'hardwarePreset' | 'flatRotationDeg',
    event: Event
  ): void {
    const val = (event.target as HTMLSelectElement).value;
    if (key === 'gripStyle') {
      this.updateOption('gripStyle', val as KnobGripStyle);
    } else if (key === 'driveType') {
      this.updateOption('driveType', val as ShaftDriveType);
    } else if (key === 'hardwarePreset') {
      this.updateOption('hardwarePreset', val as KnobHardwarePreset);
    } else {
      const deg = Number(val);
      if (deg === 0 || deg === 90 || deg === 180 || deg === 270) {
        this.updateOption('flatRotationDeg', deg);
      }
    }
  }

  onNumberInput(
    key:
      | 'gripDiameterMm'
      | 'gripHeightMm'
      | 'neckDiameterMm'
      | 'neckHeightMm'
      | 'knurlOrLobeCount'
      | 'topBevelMm'
      | 'shaftDiameterMm'
      | 'dFlatThicknessMm'
      | 'splineTeethCount'
      | 'socketDepthMm'
      | 'fitToleranceMm',
    event: Event,
    isFloat = false
  ): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    this.updateOption(key, parsed);
  }

  onCheckboxChange(
    key: 'sacrificialBridgeLayer' | 'includeIndicatorMark',
    event: Event
  ): void {
    this.updateOption(key, (event.target as HTMLInputElement).checked);
  }

  onColorInput(key: 'bodyColorHex' | 'indicatorColorHex', event: Event): void {
    this.updateOption(key, (event.target as HTMLInputElement).value);
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

  toggleSectionCutaway(): void {
    const next = !this.options().sectionCutaway;
    this.options.set({ ...this.options(), sectionCutaway: next });
    if (!this.previewGroup) return;
    const planes = next ? [this.cutawayPlane] : [];
    this.previewGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.clippingPlanes = planes;
        obj.material.side = next ? THREE.DoubleSide : THREE.FrontSide;
        obj.material.needsUpdate = true;
      }
    });
  }

  resetCamera(): void {
    const m = this.metrics();
    const span = m ? Math.max(m.outerDiameterMm, m.totalHeightMm, 24) : 44;
    if (this.camera) {
      this.camera.position.set(span * 1.15, -span * 1.45, span * 1.25);
      this.camera.up.set(0, 0, 1);
      if (this.controls) {
        this.controls.target.set(0, 0, (m?.totalHeightMm ?? 20) * 0.45);
        this.controls.update();
      } else {
        this.camera.lookAt(0, 0, (m?.totalHeightMm ?? 20) * 0.45);
      }
    }
  }

  resetDefaults(): void {
    this.revokeAllObjectUrls();
    this.activePresetId.set('pot_dshaft_6mm');
    this.options.set({ ...DEFAULT_KNOB_OPTIONS });
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
    const exportOpts = { ...this.options(), sectionCutaway: false };
    const check = validateKnobOptions(exportOpts);
    if (!check.valid) {
      this.validationError.set(check.error || 'Invalid configuration.');
      return;
    }

    this.isExporting.set(true);
    this.exportProgress.set(10);

    try {
      if (typeof Worker !== 'undefined') {
        try {
          await this.runWorkerExport(exportOpts, format);
          return;
        } catch {
          // Headless fallback to client engine when Worker cannot spawn
        }
      }

      const parts = generateKnobParts(exportOpts);
      try {
        this.exportProgress.set(60);
        const fileBase = buildKnobFileBase(exportOpts);
        if (format === '3mf') {
          const blob = await exportTo3mf(exportOpts, parts);
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

  private runWorkerExport(opts: KnobDialHandwheelOptions, format: 'stl' | '3mf'): Promise<void> {
    this.terminateActiveWorker();

    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.activeWorker = worker;

      worker.onmessage = (event: MessageEvent<KnobWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'progress' && typeof msg.percent === 'number') {
          this.exportProgress.set(msg.percent);
        } else if (msg.type === 'result' && msg.buffer) {
          const blob = new Blob([msg.buffer], {
            type: msg.mimeType || 'application/octet-stream',
          });
          this.triggerDownload(blob, msg.fileName || `${buildKnobFileBase(opts)}.${format}`);
          this.terminateActiveWorker();
          resolve();
        } else if (msg.type === 'error') {
          this.terminateActiveWorker();
          reject(new Error(msg.error || 'Knob export failed.'));
        }
      };

      worker.onerror = (err) => {
        this.terminateActiveWorker();
        reject(err);
      };

      const request: KnobWorkerRequest = {
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
    const check = validateKnobOptions(opts);
    if (!check.valid) {
      this.validationError.set(check.error || 'Invalid configuration.');
      this.metrics.set(null);
      this.disposePreviewGroup();
      return;
    }

    this.validationError.set(null);

    let parts: KnobParts | null = null;
    try {
      parts = generateKnobParts(opts);
      const computedMetrics = calculateKnobMetrics(opts, parts);
      this.metrics.set(computedMetrics);

      if (!this.scene) {
        return;
      }

      this.disposePreviewGroup();

      const group = new THREE.Group();
      const isWire = this.wireframe();
      const clipPlanes = opts.sectionCutaway ? [this.cutawayPlane] : [];
      const side = opts.sectionCutaway ? THREE.DoubleSide : THREE.FrontSide;

      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(opts.bodyColorHex || '#2563eb'),
        roughness: 0.4,
        metalness: 0.1,
        wireframe: isWire,
        clippingPlanes: clipPlanes,
        side,
      });

      const bodyMesh = new THREE.Mesh(parts.bodyGeometry.clone(), bodyMat);
      bodyMesh.name = 'knob-body';
      group.add(bodyMesh);

      if (parts.indicatorGeometry) {
        const indMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(opts.indicatorColorHex || '#f8fafc'),
          roughness: 0.3,
          metalness: 0.1,
          wireframe: isWire,
          clippingPlanes: clipPlanes,
          side,
        });
        const indMesh = new THREE.Mesh(parts.indicatorGeometry.clone(), indMat);
        indMesh.name = 'knob-indicator';
        group.add(indMesh);
      }

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

      const grid = new THREE.GridHelper(160, 16, 0x334155, 0x1e293b);
      grid.rotation.x = Math.PI / 2;
      scene.add(grid);

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 1500);
      camera.up.set(0, 0, 1);
      camera.position.set(48, -62, 54);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.localClippingEnabled = true;
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.target.set(0, 0, 10);
      controls.update();

      const ambient = new THREE.AmbientLight(0xffffff, 0.56);
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.92);
      keyLight.position.set(90, -110, 160);
      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.42);
      fillLight.position.set(-90, 90, 80);
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
      // Safe no-op in headless test environments lacking WebGL
    }
  }
}
