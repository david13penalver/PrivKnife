import { TranslatePipe } from '../../../core/i18n';
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SeamlessTextureGeneratorOptions,
  SeamlessTextureGeneratorResult,
  TextureBlendMode,
  TextureImageData,
  TextureWorkerRequest,
  TextureWorkerResponse,
} from './types';
import { processTexture } from './engine';
import { createSyntheticSurface } from './test-fixtures';

@Component({
  selector: 'app-seamless-texture-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './seamless-texture-generator.component.html',
  styleUrl: './seamless-texture-generator.component.scss',
})
export class SeamlessTextureGeneratorComponent implements OnDestroy {
  @ViewChild('previewCanvas') previewCanvasRef?: ElementRef<HTMLCanvasElement>;
  private activeObjectUrls = new Set<string>();
  private worker?: Worker;
  private requestId = 0;

  // State Signals
  readonly sourceImageData = signal<TextureImageData | null>(null);
  readonly selectedFileName = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly blendMode = signal<TextureBlendMode>('linear_crossfade');
  readonly edgeOverlapPercentage = signal<number>(20);
  readonly generateNormalMap = signal<boolean>(true);
  readonly normalMapStrength = signal<number>(2.5);
  readonly invertNormalY = signal<boolean>(false);
  readonly previewTilingMultiplier = signal<number>(3);
  readonly outputResolutionPx = signal<number>(256);
  readonly activePreviewTab = signal<'diffuse' | 'normal' | 'tiled' | 'css'>('tiled');
  readonly copiedCssFeedback = signal<boolean>(false);

  // Result signal
  readonly result = signal<SeamlessTextureGeneratorResult | null>(null);

  setBlendMode(mode: TextureBlendMode) {
    this.blendMode.set(mode);
    this.recomputeTexture();
  }

  setEdgeOverlap(percent: number) {
    this.edgeOverlapPercentage.set(percent);
    this.recomputeTexture();
  }

  toggleGenerateNormalMap() {
    this.generateNormalMap.update((v) => !v);
    this.recomputeTexture();
  }

  toggleInvertNormalY() {
    this.invertNormalY.update((v) => !v);
    this.recomputeTexture();
  }

  setNormalStrength(strength: number) {
    this.normalMapStrength.set(strength);
    this.recomputeTexture();
  }

  setOutputResolution(resolution: number) {
    this.outputResolutionPx.set(resolution);
    this.recomputeTexture();
  }

  setTiling(tiling: number) {
    this.previewTilingMultiplier.set(tiling);
    this.renderCanvas();
  }

  setActivePreviewTab(tab: 'diffuse' | 'normal' | 'tiled' | 'css') {
    this.activePreviewTab.set(tab);
    setTimeout(() => this.renderCanvas(), 10);
  }

  async loadSampleSurface() {
    this.errorMessage.set(null);
    const surface = createSyntheticSurface(64, 64);
    this.sourceImageData.set(surface);
    this.selectedFileName.set('sample_brick_surface.png');
    await this.recomputeTexture();
  }

  async handleFileSelected(file: File) {
    if (!file) return;
    this.selectedFileName.set(file.name);
    this.errorMessage.set(null);

    let bitmap: ImageBitmap | null = null;
    try {
      if (typeof createImageBitmap === 'function') {
        bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }
        ctx.drawImage(bitmap, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.sourceImageData.set({
          width: canvas.width,
          height: canvas.height,
          data: imgData.data,
        });
        await this.recomputeTexture();
      } else {
        throw new Error('createImageBitmap is not supported');
      }
    } catch {
      this.errorMessage.set(
        'Failed to decode image file. Please upload a valid PNG, JPG, or WebP texture.'
      );
      this.result.set(null);
    } finally {
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
    }
  }

  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFileSelected(input.files[0]);
    }
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.handleFileSelected(event.dataTransfer.files[0]);
    }
  }

  async recomputeTexture() {
    const src = this.sourceImageData();
    if (!src) {
      this.result.set(null);
      return;
    }

    const options: SeamlessTextureGeneratorOptions = {
      blendMode: this.blendMode(),
      edgeOverlapPercentage: this.edgeOverlapPercentage(),
      generateNormalMap: this.generateNormalMap(),
      normalMapStrength: this.normalMapStrength(),
      invertNormalY: this.invertNormalY(),
      previewTilingMultiplier: this.previewTilingMultiplier(),
      outputResolutionPx: this.outputResolutionPx(),
    };

    if (typeof Worker !== 'undefined') {
      try {
        if (!this.worker) {
          this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module',
          });
          this.worker.onmessage = (event: MessageEvent<TextureWorkerResponse>) => {
            const data = event.data;
            if (data.id === this.requestId) {
              if (data.type === 'SUCCESS' && data.result) {
                this.result.set(data.result);
                setTimeout(() => this.renderCanvas(), 10);
              } else if (data.type === 'ERROR') {
                this.errorMessage.set(data.error || 'Failed to process texture in worker.');
                this.result.set(null);
              }
            }
          };
        }

        const id = ++this.requestId;
        const request: TextureWorkerRequest = {
          id,
          type: 'PROCESS_TEXTURE',
          source: src,
          options,
        };
        this.worker.postMessage(request);
        return;
      } catch {
        // Fall back to main thread execution
      }
    }

    // Direct synchronous fallback in test or worker-unsupported environments
    const res = await processTexture(src, options);
    this.result.set(res);
    setTimeout(() => this.renderCanvas(), 10);
  }

  renderCanvas() {
    if (!this.previewCanvasRef?.nativeElement) return;
    const canvas = this.previewCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const res = this.result();
    if (!res || !res.success || !res.diffusePixels) return;

    const diffuse = res.diffusePixels;
    const tab = this.activePreviewTab();

    if (tab === 'diffuse') {
      canvas.width = diffuse.width;
      canvas.height = diffuse.height;
      const imgData = ctx.createImageData(diffuse.width, diffuse.height);
      imgData.data.set(diffuse.data);
      ctx.putImageData(imgData, 0, 0);
    } else if (tab === 'normal' && res.normalPixels) {
      const normalMap = res.normalPixels;
      canvas.width = normalMap.width;
      canvas.height = normalMap.height;
      const imgData = ctx.createImageData(normalMap.width, normalMap.height);
      imgData.data.set(normalMap.data);
      ctx.putImageData(imgData, 0, 0);
    } else {
      // Tiled repeat
      const tiles = this.previewTilingMultiplier();
      canvas.width = diffuse.width * tiles;
      canvas.height = diffuse.height * tiles;

      const singleCanvas = document.createElement('canvas');
      singleCanvas.width = diffuse.width;
      singleCanvas.height = diffuse.height;
      const sCtx = singleCanvas.getContext('2d');
      if (sCtx) {
        const imgData = sCtx.createImageData(diffuse.width, diffuse.height);
        imgData.data.set(diffuse.data);
        sCtx.putImageData(imgData, 0, 0);

        for (let y = 0; y < tiles; y++) {
          for (let x = 0; x < tiles; x++) {
            ctx.drawImage(singleCanvas, x * diffuse.width, y * diffuse.height);
          }
        }
      }
    }
  }

  downloadZip() {
    const res = this.result();
    if (!res || !res.success || !res.zipBlob) return;

    const url = URL.createObjectURL(res.zipBlob);
    this.activeObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = res.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    this.activeObjectUrls.delete(url);
  }

  downloadDiffuse() {
    const res = this.result();
    if (!res || !res.success || !res.diffuseBlob) return;

    const url = URL.createObjectURL(res.diffuseBlob);
    this.activeObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'diffuse_seamless.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    this.activeObjectUrls.delete(url);
  }

  downloadNormal() {
    const res = this.result();
    if (!res || !res.success || !res.normalMapBlob) return;

    const url = URL.createObjectURL(res.normalMapBlob);
    this.activeObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'normal_map.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    this.activeObjectUrls.delete(url);
  }

  async copyCssSnippet() {
    const res = this.result();
    if (!res || !res.success) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(res.cssSnippet);
        this.copiedCssFeedback.set(true);
        setTimeout(() => this.copiedCssFeedback.set(false), 2000);
      }
    } catch {
      // Ignore
    }
  }

  reset() {
    this.sourceImageData.set(null);
    this.selectedFileName.set('');
    this.errorMessage.set(null);
    this.blendMode.set('linear_crossfade');
    this.edgeOverlapPercentage.set(20);
    this.generateNormalMap.set(true);
    this.normalMapStrength.set(2.5);
    this.invertNormalY.set(false);
    this.previewTilingMultiplier.set(3);
    this.outputResolutionPx.set(256);
    this.activePreviewTab.set('tiled');
    this.copiedCssFeedback.set(false);
    this.result.set(null);

    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }
}
