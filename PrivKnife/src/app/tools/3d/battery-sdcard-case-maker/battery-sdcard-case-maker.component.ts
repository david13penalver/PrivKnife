import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Badge, Card, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  buildBatteryCaseFileBase,
  calculateMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateBatteryCaseParts,
  validateBatteryCaseOptions,
} from './engine';
import { AA_DISPENSER_FIXTURE, BATTERY_CASE_PRESETS } from './test-fixtures';
import {
  BATTERY_CELL_SPECS,
  BatteryCaseMetrics,
  BatteryCaseParts,
  BatteryCasePreset,
  BatteryCaseWorkerRequest,
  BatteryCaseWorkerResponse,
  BatteryCellPreset,
  BatterySdcardCaseOptions,
  CardCaseStyle,
  DEFAULT_BATTERY_CASE_OPTIONS,
  DispenserMountStyle,
} from './types';

@Component({
  selector: 'app-battery-sdcard-case-maker',
  standalone: true,
  imports: [Badge, Card, ProgressBar, TranslatePipe],
  templateUrl: './battery-sdcard-case-maker.component.html',
  styleUrl: './battery-sdcard-case-maker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatterySdcardCaseMakerComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer', { static: true })
  viewportContainer?: ElementRef<HTMLDivElement>;

  readonly options = signal<BatterySdcardCaseOptions>({ ...DEFAULT_BATTERY_CASE_OPTIONS });
  readonly activePresetId = signal<string>('aa_desk_10');
  readonly metrics = signal<BatteryCaseMetrics | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly wireframe = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly exportProgress = signal<number>(0);

  readonly presets = BATTERY_CASE_PRESETS;
  readonly cellSpecs = Object.values(BATTERY_CELL_SPECS);

  readonly totalCaseSlots = computed(() => {
    const o = this.options();
    return o.sdSlots + o.microSdSlots + o.cfExpressSlots + o.switchCartSlots + o.usbASlots + o.usbCSlots;
  });

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

  applyPreset(preset: BatteryCasePreset): void {
    this.activePresetId.set(preset.id);
    this.options.set({ ...preset.options });
    this.rebuildScene();
  }

  setMode(mode: BatterySdcardCaseOptions['mode']): void {
    const current = this.options();
    const labelText =
      mode === 'battery_dispenser'
        ? BATTERY_CELL_SPECS[current.cellPreset].id.toUpperCase()
        : 'EDC MEDIA';
    this.activePresetId.set('');
    this.options.set({ ...current, mode, labelText });
    this.rebuildScene();
  }

  updateOption<K extends keyof BatterySdcardCaseOptions>(
    key: K,
    value: BatterySdcardCaseOptions[K]
  ): void {
    this.activePresetId.set('');
    const current = this.options();
    const next: BatterySdcardCaseOptions = { ...current, [key]: value };
    if (key === 'cellPreset' && typeof value === 'string') {
      next.labelText = value.toUpperCase();
    }
    this.options.set(next);
    this.rebuildScene();
  }

  patchOptions(patch: Partial<BatterySdcardCaseOptions>): void {
    this.activePresetId.set('');
    this.options.set({ ...this.options(), ...patch });
    this.rebuildScene();
  }

  onSelectChange(key: keyof BatterySdcardCaseOptions, event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (key === 'cellPreset') {
      this.updateOption('cellPreset', val as BatteryCellPreset);
    } else if (key === 'mountStyle') {
      this.updateOption('mountStyle', val as DispenserMountStyle);
    } else if (key === 'cardCaseStyle') {
      this.updateOption('cardCaseStyle', val as CardCaseStyle);
    }
  }

  onNumberInput(key: keyof BatterySdcardCaseOptions, event: Event, isFloat = false): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    this.updateOption(key, parsed as BatterySdcardCaseOptions[typeof key]);
  }

  onCheckboxChange(key: 'includeViewSlot' | 'includeEmbossedLabel', event: Event): void {
    this.updateOption(key, (event.target as HTMLInputElement).checked);
  }

  onTextInput(key: 'labelText' | 'bodyColorHex' | 'accentColorHex', event: Event): void {
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

  resetView(): void {
    const m = this.metrics();
    const span = m ? Math.max(m.widthMm, m.depthMm, m.heightMm) : 140;
    if (this.camera) {
      this.camera.position.set(span * 0.85, -span * 1.4, span * 1.15);
      this.camera.up.set(0, 0, 1);
      if (this.controls) {
        this.controls.target.set(0, 0, (m?.heightMm ?? 60) * 0.42);
        this.controls.update();
      } else {
        this.camera.lookAt(0, 0, (m?.heightMm ?? 60) * 0.42);
      }
    }
  }

  reset(): void {
    this.revokeAllObjectUrls();
    this.activePresetId.set('aa_desk_10');
    this.options.set({ ...AA_DISPENSER_FIXTURE });
    this.wireframe.set(false);
    this.rebuildScene();
    this.resetView();
  }

  async exportFormat(format: 'stl' | '3mf'): Promise<void> {
    const opts = this.options();
    const check = validateBatteryCaseOptions(opts);
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
          // Graceful fallback to direct client engine when Worker cannot spawn
        }
      }

      const parts = generateBatteryCaseParts(opts);
      try {
        this.exportProgress.set(60);
        const fileBase = buildBatteryCaseFileBase(opts);
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

  exportPng(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
    const canvas = this.renderer.domElement;
    const base = buildBatteryCaseFileBase(this.options());
    canvas.toBlob((blob) => {
      if (blob) {
        this.triggerDownload(blob, `${base}-preview.png`);
      }
    }, 'image/png');
  }

  formatFixed(value: number | undefined, digits: number): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
    return value.toFixed(digits);
  }

  private runWorkerExport(opts: BatterySdcardCaseOptions, format: 'stl' | '3mf'): Promise<void> {
    this.terminateActiveWorker();

    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.activeWorker = worker;

      worker.onmessage = (event: MessageEvent<BatteryCaseWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'progress' && typeof msg.percent === 'number') {
          this.exportProgress.set(msg.percent);
        } else if (msg.type === 'result' && msg.buffer) {
          const blob = new Blob([msg.buffer], {
            type: msg.mimeType || 'application/octet-stream',
          });
          this.triggerDownload(blob, msg.fileName || `${buildBatteryCaseFileBase(opts)}.${format}`);
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

      const request: BatteryCaseWorkerRequest = {
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
    const check = validateBatteryCaseOptions(opts);
    if (!check.valid) {
      this.validationError.set(check.error || 'Invalid configuration.');
      this.metrics.set(null);
      this.disposePreviewGroup();
      return;
    }

    this.validationError.set(null);

    let parts: BatteryCaseParts | null = null;
    try {
      parts = generateBatteryCaseParts(opts);
      const computedMetrics = calculateMetrics(opts, parts);
      this.metrics.set(computedMetrics);

      if (!this.scene) {
        return;
      }

      this.disposePreviewGroup();

      const group = new THREE.Group();
      const isWire = this.wireframe();

      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(opts.bodyColorHex || '#2563eb'),
        roughness: 0.42,
        metalness: 0.08,
        wireframe: isWire,
      });

      const bodyMesh = new THREE.Mesh(parts.bodyGeometry.clone(), bodyMat);
      bodyMesh.name = 'battery-case-body';
      group.add(bodyMesh);

      if (parts.lidGeometry) {
        const lidMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(opts.bodyColorHex || '#2563eb'),
          roughness: 0.42,
          metalness: 0.08,
          wireframe: isWire,
        });
        const lidMesh = new THREE.Mesh(parts.lidGeometry.clone(), lidMat);
        lidMesh.name = 'battery-case-lid';
        group.add(lidMesh);
      }

      if (parts.labelGeometry) {
        const accentMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(opts.accentColorHex || '#f8fafc'),
          roughness: 0.3,
          metalness: 0.1,
          wireframe: isWire,
        });
        const labelMesh = new THREE.Mesh(parts.labelGeometry.clone(), accentMat);
        labelMesh.name = 'battery-case-label';
        group.add(labelMesh);
      }

      // Center preview group horizontally around origin in XY while keeping Z >= 0 bed plane
      const box = new THREE.Box3().setFromObject(group);
      const center = new THREE.Vector3();
      box.getCenter(center);
      group.position.set(-center.x, -center.y, -box.min.z);

      this.previewGroup = group;
      this.scene.add(group);
      this.resetView();
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

      const grid = new THREE.GridHelper(240, 24, 0x334155, 0x1e293b);
      grid.rotation.x = Math.PI / 2;
      scene.add(grid);

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 2000);
      camera.up.set(0, 0, 1);
      camera.position.set(110, -170, 135);

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
      controls.target.set(0, 0, 35);
      controls.update();

      const ambient = new THREE.AmbientLight(0xffffff, 0.55);
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
      keyLight.position.set(140, -160, 220);
      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
      fillLight.position.set(-140, 140, 110);
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
      // Safe no-op in headless/jsdom environments lacking WebGL context
    }
  }
}
