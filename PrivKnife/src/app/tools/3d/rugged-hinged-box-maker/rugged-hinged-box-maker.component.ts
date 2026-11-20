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
  buildRuggedBoxFileBase,
  calculateRuggedBoxMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateRuggedBoxParts,
  validateRuggedBoxOptions,
} from './engine';
import { RUGGED_BOX_PRESETS } from './test-fixtures';
import {
  DEFAULT_RUGGED_BOX_OPTIONS,
  DividerMode,
  HingeType,
  LatchType,
  RuggedBoxMetrics,
  RuggedBoxParts,
  RuggedBoxPreset,
  RuggedBoxWorkerRequest,
  RuggedBoxWorkerResponse,
  RuggedHingedBoxOptions,
} from './types';

@Component({
  selector: 'app-rugged-hinged-box-maker',
  standalone: true,
  imports: [Badge, Card, ProgressBar, TranslatePipe],
  templateUrl: './rugged-hinged-box-maker.component.html',
  styleUrl: './rugged-hinged-box-maker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuggedHingedBoxMakerComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer', { static: true })
  viewportContainer?: ElementRef<HTMLDivElement>;

  readonly options = signal<RuggedHingedBoxOptions>({ ...DEFAULT_RUGGED_BOX_OPTIONS });
  readonly activePresetId = signal<string>('m3_fastener_case');
  readonly metrics = signal<RuggedBoxMetrics | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly wireframe = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly exportProgress = signal<number>(0);

  readonly presets = RUGGED_BOX_PRESETS;
  readonly createdObjectUrls: string[] = [];

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private previewGroup: THREE.Group | null = null;
  private lidMesh: THREE.Mesh | null = null;
  private animationFrameId: number | null = null;
  private activeWorker: Worker | null = null;

  private lastHingeCenterYMm = -47.55;
  private lastClosedHeightMm = 58.1;

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

  applyPreset(preset: RuggedBoxPreset): void {
    this.activePresetId.set(preset.id);
    this.options.set({ ...preset.options });
    this.rebuildScene();
  }

  togglePreviewOpen(): void {
    const cur = this.options();
    const nextOpen = !cur.previewOpen;
    this.options.set({ ...cur, previewOpen: nextOpen });
    this.applyLidPose(nextOpen);
  }

  updateOption<K extends keyof RuggedHingedBoxOptions>(
    key: K,
    value: RuggedHingedBoxOptions[K]
  ): void {
    this.activePresetId.set('');
    this.options.set({ ...this.options(), [key]: value });
    this.rebuildScene();
  }

  onSelectChange(key: 'hingeType' | 'latchType' | 'dividerMode', event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (key === 'hingeType') {
      this.updateOption('hingeType', val as HingeType);
    } else if (key === 'latchType') {
      this.updateOption('latchType', val as LatchType);
    } else {
      this.updateOption('dividerMode', val as DividerMode);
    }
  }

  onNumberInput(key: keyof RuggedHingedBoxOptions, event: Event, isFloat = false): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    this.updateOption(key, parsed as RuggedHingedBoxOptions[typeof key]);
  }

  onGasketChange(event: Event): void {
    this.updateOption('includeGasketChannel', (event.target as HTMLInputElement).checked);
  }

  onTextInput(key: 'frontLabelText' | 'bodyColorHex' | 'accentColorHex', event: Event): void {
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
    const span = m ? Math.max(m.flatPlateWidthMm, m.flatPlateDepthMm) : 180;
    if (this.camera) {
      this.camera.position.set(span * 0.72, span * 0.85, span * 0.72);
      this.camera.up.set(0, 0, 1);
      if (this.controls) {
        this.controls.target.set(0, 0, (m?.closedHeightMm ?? 50) * 0.35);
        this.controls.update();
      } else {
        this.camera.lookAt(0, 0, (m?.closedHeightMm ?? 50) * 0.35);
      }
    }
  }

  reset(): void {
    this.revokeAllObjectUrls();
    this.activePresetId.set('m3_fastener_case');
    this.options.set({ ...DEFAULT_RUGGED_BOX_OPTIONS });
    this.wireframe.set(false);
    this.rebuildScene();
    this.resetView();
  }

  async exportFormat(format: 'stl' | '3mf'): Promise<void> {
    const opts = this.options();
    const check = validateRuggedBoxOptions(opts);
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
          // Graceful fallback when Worker is unavailable
        }
      }

      const parts = generateRuggedBoxParts(opts);
      try {
        this.exportProgress.set(60);
        const fileBase = buildRuggedBoxFileBase(opts);
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
    const base = buildRuggedBoxFileBase(this.options());
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

  private applyLidPose(isOpen: boolean): void {
    if (!this.lidMesh) return;
    if (isOpen) {
      this.lidMesh.rotation.set(0, 0, 0);
      this.lidMesh.position.set(0, 0, 0);
    } else {
      this.lidMesh.rotation.set(Math.PI, 0, 0);
      this.lidMesh.position.set(0, 2 * this.lastHingeCenterYMm, this.lastClosedHeightMm);
    }
  }

  private runWorkerExport(opts: RuggedHingedBoxOptions, format: 'stl' | '3mf'): Promise<void> {
    this.terminateActiveWorker();
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.activeWorker = worker;

      worker.onmessage = (event: MessageEvent<RuggedBoxWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'progress' && typeof msg.percent === 'number') {
          this.exportProgress.set(msg.percent);
        } else if (msg.type === 'result' && msg.buffer) {
          const blob = new Blob([msg.buffer], {
            type: msg.mimeType || 'application/octet-stream',
          });
          this.triggerDownload(blob, msg.fileName || `${buildRuggedBoxFileBase(opts)}.${format}`);
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

      const request: RuggedBoxWorkerRequest = {
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
    const check = validateRuggedBoxOptions(opts);
    if (!check.valid) {
      this.validationError.set(check.error || 'Invalid configuration.');
      this.metrics.set(null);
      this.disposePreviewGroup();
      return;
    }

    this.validationError.set(null);

    let parts: RuggedBoxParts | null = null;
    try {
      parts = generateRuggedBoxParts(opts);
      const computedMetrics = calculateRuggedBoxMetrics(opts, parts);
      this.metrics.set(computedMetrics);
      this.lastHingeCenterYMm = parts.layoutMeta.hingeCenterYMm;
      this.lastClosedHeightMm = parts.layoutMeta.closedHeightMm;

      if (!this.scene) return;

      this.disposePreviewGroup();

      const group = new THREE.Group();
      const isWire = this.wireframe();

      const makeMat = (hex: string, roughness = 0.42) =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(hex),
          roughness,
          metalness: 0.1,
          wireframe: isWire,
        });

      const bodyHex = opts.bodyColorHex || '#3b82f6';
      const accentHex = opts.accentColorHex || '#f97316';

      const baseMesh = new THREE.Mesh(parts.baseGeometry.clone(), makeMat(bodyHex));
      group.add(baseMesh);

      const lidMesh = new THREE.Mesh(parts.lidGeometry.clone(), makeMat(bodyHex));
      this.lidMesh = lidMesh;
      this.applyLidPose(opts.previewOpen);
      group.add(lidMesh);

      const latchesMesh = new THREE.Mesh(parts.latchesGeometry.clone(), makeMat(accentHex, 0.35));
      group.add(latchesMesh);

      if (parts.dividersGeometry) {
        group.add(new THREE.Mesh(parts.dividersGeometry.clone(), makeMat(bodyHex)));
      }
      if (parts.gasketGeometry) {
        group.add(new THREE.Mesh(parts.gasketGeometry.clone(), makeMat('#0ea5e9', 0.55)));
      }
      if (parts.labelGeometry) {
        group.add(new THREE.Mesh(parts.labelGeometry.clone(), makeMat(accentHex, 0.3)));
      }

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
    this.lidMesh = null;
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

      const grid = new THREE.GridHelper(280, 28, 0x334155, 0x1e293b);
      grid.rotation.x = Math.PI / 2;
      scene.add(grid);

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 2200);
      camera.up.set(0, 0, 1);
      camera.position.set(160, 180, 150);

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
      controls.target.set(0, 0, 25);
      controls.update();

      const ambient = new THREE.AmbientLight(0xffffff, 0.55);
      const key = new THREE.DirectionalLight(0xffffff, 0.9);
      key.position.set(140, 180, 240);
      const fill = new THREE.DirectionalLight(0x93c5fd, 0.4);
      fill.position.set(-140, -140, 120);
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
      // Safe fallback in headless tests lacking WebGL
    }
  }
}
