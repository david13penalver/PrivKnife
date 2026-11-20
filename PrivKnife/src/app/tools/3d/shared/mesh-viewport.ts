import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PreviewPart } from './workshop-protocol';

export class MeshViewport {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
  private readonly model = new THREE.Group();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly resize: ResizeObserver;
  private readonly bounds = new THREE.Box3();
  private grid?: THREE.GridHelper;
  private wireframe = false;

  constructor(host: HTMLElement, label: string) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!context) throw new Error('WebGL2 unavailable');
    this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    canvas.setAttribute('aria-label', label);
    canvas.setAttribute('role', 'img');
    canvas.tabIndex = 0;
    host.append(canvas);
    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.listenToKeyEvents(canvas);
    this.controls.addEventListener('change', this.render);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x7a91a9, 2.2), this.model);
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(0, -150, 180);
    this.scene.add(key);
    this.resize = new ResizeObserver(() => {
      this.camera.aspect = Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight), false);
      this.render();
    });
    this.resize.observe(host);
  }

  setParts(parts: PreviewPart[], colors: string[]): void {
    this.clearParts();
    for (const part of parts) {
      const geometry = new THREE.BufferGeometry()
        .setAttribute('position', new THREE.BufferAttribute(new Float32Array(part.positions), 3));
      if (part.indices) geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(part.indices), 1));
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        color: colors[part.material] ?? '#276a78',
        wireframe: this.wireframe,
        roughness: 0.65,
      });
      this.model.add(new THREE.Mesh(geometry, material));
    }
    this.bounds.setFromObject(this.model);
    const size = this.bounds.getSize(new THREE.Vector3());
    const gridSize = Math.ceil(Math.max(size.x, size.y, 20) / 20) * 20 + 20;
    this.removeGrid();
    this.grid = new THREE.GridHelper(gridSize, gridSize / 10, 0xa2aeb8, 0x8696a4);
    this.grid.rotateX(Math.PI / 2);
    this.bounds.getCenter(this.grid.position);
    this.grid.position.z = -0.05;
    this.scene.add(this.grid);
    this.resetView();
  }

  resetView(): void {
    const center = this.bounds.getCenter(new THREE.Vector3());
    const extent = Math.max(20, this.bounds.getSize(new THREE.Vector3()).length());
    const distance = extent * Math.max(1, 1 / this.camera.aspect) * 1.4;
    this.camera.position.copy(center).addScaledVector(new THREE.Vector3(0.65, -1, 0.85).normalize(), distance);
    this.controls.target.copy(center);
    this.controls.update();
    this.render();
  }

  setWireframe(state: boolean): void {
    this.wireframe = state;
    for (const object of this.model.children as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[]) {
      object.material.wireframe = state;
    }
    this.render();
  }

  clearParts(): void {
    for (const object of this.model.children as THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]) {
      object.geometry.dispose();
      object.material.dispose();
    }
    this.model.clear();
    this.bounds.makeEmpty();
    this.removeGrid();
    this.render();
  }

  dispose(): void {
    this.resize.disconnect();
    this.controls.removeEventListener('change', this.render);
    this.controls.dispose();
    this.clearParts();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private readonly render = () => this.renderer.render(this.scene, this.camera);

  private removeGrid(): void {
    this.grid?.removeFromParent();
    this.grid?.dispose();
    this.grid = undefined;
  }
}
