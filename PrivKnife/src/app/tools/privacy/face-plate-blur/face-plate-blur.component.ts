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
  BlurPoint,
  BlurRegion,
  CensorMode,
  ExportImageFormat,
  FacePlateBlurOptions,
  FacePlateBlurResult,
  FacePlateBlurWorkerRequest,
  FacePlateBlurWorkerResponse,
  SelectionMode,
} from './types';
import {
  createSampleCarSaleBlob,
  detectPrivacyRegions,
  isJsdomEnvironment,
  loadImageElement,
  mapPointerToImageCoords,
  processPrivacyBlur,
} from './engine';

@Component({
  selector: 'app-face-plate-blur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './face-plate-blur.component.html',
  styleUrls: ['./face-plate-blur.component.scss'],
})
export class FacePlateBlurComponent implements OnDestroy {
  @ViewChild('previewCanvas') previewCanvasRef?: ElementRef<HTMLCanvasElement>;

  // Reactive state signals
  readonly censorMode = signal<CensorMode>('mosaic_pixelate');
  readonly mosaicBlockSize = signal<number>(16);
  readonly blurRadiusPx = signal<number>(12);
  readonly selectionMode = signal<SelectionMode>('manual_rect');
  readonly brushRadiusPx = signal<number>(20);
  readonly exportQuality = signal<number>(0.92);
  readonly exportFormat = signal<ExportImageFormat>('jpeg');
  readonly stripExif = signal<boolean>(true);
  readonly regions = signal<BlurRegion[]>([]);
  readonly isProcessing = signal<boolean>(false);
  readonly isDetecting = signal<boolean>(false);
  readonly previewUrl = signal<string | null>(null);
  readonly originalImage = signal<{
    file: File | Blob;
    name: string;
    url: string;
    size: number;
  } | null>(null);
  readonly lastResult = signal<FacePlateBlurResult | null>(null);

  private createdBlobUrls: string[] = [];
  private worker: Worker | null = null;
  private activeImageElement: HTMLImageElement | null = null;

  // Pointer drawing state
  private isDrawingRect = false;
  private rectStartX = 0;
  private rectStartY = 0;
  private currentRectX = 0;
  private currentRectY = 0;

  private isDrawingBrush = false;
  private currentBrushPoints: BlurPoint[] = [];

  ngOnDestroy(): void {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore error
      }
      this.worker = null;
    }
    this.cleanUpUrls();
  }

  setSelectionMode(mode: SelectionMode): void {
    this.selectionMode.set(mode);
  }

  setCensorMode(mode: CensorMode): void {
    this.censorMode.set(mode);
  }

  setMosaicBlockSize(size: number): void {
    const clamped = Math.max(2, Math.min(100, Number(size) || 16));
    this.mosaicBlockSize.set(clamped);
  }

  setBlurRadius(radius: number): void {
    const clamped = Math.max(1, Math.min(100, Number(radius) || 12));
    this.blurRadiusPx.set(clamped);
  }

  setBrushRadius(radius: number): void {
    const clamped = Math.max(5, Math.min(100, Number(radius) || 20));
    this.brushRadiusPx.set(clamped);
  }

  setExportFormat(format: ExportImageFormat): void {
    this.exportFormat.set(format);
  }

  addRegion(region: Omit<BlurRegion, 'id'> & { id?: string }): string {
    const id = region.id || 'reg-' + Math.random().toString(36).substring(2, 9);
    const newRegion: BlurRegion = {
      ...region,
      id,
      mode: region.mode || this.censorMode(),
      blockSize: region.blockSize || this.mosaicBlockSize(),
      blurRadius: region.blurRadius || this.blurRadiusPx(),
    };
    this.regions.update((list) => [...list, newRegion]);
    this.renderCanvas();
    return id;
  }

  addPresetRegion(type: 'face' | 'plate'): void {
    if (type === 'face') {
      this.addRegion({
        x: 120,
        y: 80,
        width: 140,
        height: 160,
        mode: this.censorMode(),
      });
    } else {
      this.addRegion({
        x: 100,
        y: 250,
        width: 200,
        height: 70,
        mode: this.censorMode(),
      });
    }
  }

  removeRegion(id: string): void {
    this.regions.update((list) => list.filter((r) => r.id !== id));
    this.renderCanvas();
  }

  clearAllRegions(): void {
    this.regions.set([]);
    this.renderCanvas();
  }

  updateRegionCoord(
    id: string,
    prop: 'x' | 'y' | 'width' | 'height',
    val: number | string
  ): void {
    const num = Math.max(0, Math.round(Number(val) || 0));
    this.regions.update((list) =>
      list.map((r) => (r.id === id ? { ...r, [prop]: num } : r))
    );
    this.renderCanvas();
  }

  updateRegionMode(id: string, mode: CensorMode): void {
    this.regions.update((list) =>
      list.map((r) => (r.id === id ? { ...r, mode } : r))
    );
    this.renderCanvas();
  }

  // File loading & State Reset
  async handleFileSelected(file: File | Blob, name?: string): Promise<void> {
    // Stale state reset
    const prevPreview = this.previewUrl();
    if (prevPreview) {
      URL.revokeObjectURL(prevPreview);
      this.previewUrl.set(null);
    }
    this.lastResult.set(null);
    this.regions.set([]);

    const fileName =
      name || (file instanceof File ? file.name : 'sample-photo.png');
    const url = URL.createObjectURL(file);
    this.createdBlobUrls.push(url);

    this.originalImage.set({
      file,
      name: fileName,
      url,
      size: file.size,
    });

    try {
      this.activeImageElement = await loadImageElement(file);
      this.renderCanvas();
    } catch {
      // Handle image decode error gracefully
      this.activeImageElement = null;
    }
  }

  async loadSamplePhoto(): Promise<void> {
    const sampleBlob = await createSampleCarSaleBlob();
    await this.handleFileSelected(sampleBlob, 'car-sale-sample.png');

    // Add preset face and license plate regions matching the sample image
    this.addRegion({
      x: 140,
      y: 130,
      width: 45,
      height: 55,
      mode: 'mosaic_pixelate',
    });
    this.addRegion({
      x: 165,
      y: 240,
      width: 70,
      height: 30,
      mode: 'blackout_box',
    });
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelected(input.files[0]);
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFileSelected(event.dataTransfer.files[0]);
    }
  }

  // Pointer event handlers for drawing directly on canvas
  onCanvasPointerDown(event: PointerEvent): void {
    if (!this.originalImage() || !this.previewCanvasRef?.nativeElement) return;
    const canvas = this.previewCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const natW = canvas.width || 800;
    const natH = canvas.height || 600;

    const coords = mapPointerToImageCoords(
      event.clientX,
      event.clientY,
      rect,
      natW,
      natH
    );

    if (this.selectionMode() === 'manual_rect') {
      this.isDrawingRect = true;
      this.rectStartX = coords.x;
      this.rectStartY = coords.y;
      this.currentRectX = coords.x;
      this.currentRectY = coords.y;
      canvas.setPointerCapture?.(event.pointerId);
    } else if (this.selectionMode() === 'brush_stroke') {
      this.isDrawingBrush = true;
      this.currentBrushPoints = [{ x: coords.x, y: coords.y }];
      canvas.setPointerCapture?.(event.pointerId);
      this.renderCanvas();
    }
  }

  onCanvasPointerMove(event: PointerEvent): void {
    if (!this.previewCanvasRef?.nativeElement) return;
    const canvas = this.previewCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const natW = canvas.width || 800;
    const natH = canvas.height || 600;

    const coords = mapPointerToImageCoords(
      event.clientX,
      event.clientY,
      rect,
      natW,
      natH
    );

    if (this.isDrawingRect) {
      this.currentRectX = coords.x;
      this.currentRectY = coords.y;
      this.renderCanvas();
    } else if (this.isDrawingBrush) {
      this.currentBrushPoints.push({ x: coords.x, y: coords.y });
      this.renderCanvas();
    }
  }

  onCanvasPointerUp(event: PointerEvent): void {
    if (!this.previewCanvasRef?.nativeElement) return;
    const canvas = this.previewCanvasRef.nativeElement;
    try {
      canvas.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore
    }

    if (this.isDrawingRect) {
      this.isDrawingRect = false;
      const rx = Math.min(this.rectStartX, this.currentRectX);
      const ry = Math.min(this.rectStartY, this.currentRectY);
      const rw = Math.abs(this.currentRectX - this.rectStartX);
      const rh = Math.abs(this.currentRectY - this.rectStartY);

      if (rw >= 6 && rh >= 6) {
        this.addRegion({
          x: rx,
          y: ry,
          width: rw,
          height: rh,
          mode: this.censorMode(),
        });
      } else {
        this.renderCanvas();
      }
    } else if (this.isDrawingBrush) {
      this.isDrawingBrush = false;
      if (this.currentBrushPoints.length > 0) {
        this.addRegion({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          points: [...this.currentBrushPoints],
          brushRadius: this.brushRadiusPx(),
          mode: this.censorMode(),
        });
        this.currentBrushPoints = [];
      } else {
        this.renderCanvas();
      }
    }
  }

  onCanvasPointerLeave(event: PointerEvent): void {
    if (this.isDrawingRect || this.isDrawingBrush) {
      this.onCanvasPointerUp(event);
    }
  }

  // Canvas Viewport Redraw
  renderCanvas(): void {
    if (isJsdomEnvironment() || !this.previewCanvasRef?.nativeElement) return;
    const canvas = this.previewCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!this.activeImageElement) {
      canvas.width = 400;
      canvas.height = 300;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const img = this.activeImageElement;
    if (canvas.width !== (img.naturalWidth || img.width || 800)) {
      canvas.width = img.naturalWidth || img.width || 800;
      canvas.height = img.naturalHeight || img.height || 600;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw active censor regions
    for (const r of this.regions()) {
      if (r.points && r.points.length > 0) {
        // Draw brush stroke points
        ctx.save();
        ctx.fillStyle =
          r.mode === 'blackout_box'
            ? 'rgba(0, 0, 0, 0.85)'
            : 'rgba(59, 130, 246, 0.5)';
        const radius = r.brushRadius || this.brushRadiusPx();
        for (const pt of r.points) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        // Draw rectangle overlay
        ctx.save();
        if (r.mode === 'blackout_box') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fillRect(r.x, r.y, r.width, r.height);
        } else {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
          ctx.fillRect(r.x, r.y, r.width, r.height);
        }
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(r.x, r.y, r.width, r.height);

        // Corner resize indicators
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(r.x - 3, r.y - 3, 6, 6);
        ctx.fillRect(r.x + r.width - 3, r.y + r.height - 3, 6, 6);
        ctx.restore();
      }
    }

    // Draw live rectangular drag preview
    if (this.isDrawingRect) {
      const rx = Math.min(this.rectStartX, this.currentRectX);
      const ry = Math.min(this.rectStartY, this.currentRectY);
      const rw = Math.abs(this.currentRectX - this.rectStartX);
      const rh = Math.abs(this.currentRectY - this.rectStartY);

      ctx.save();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }

    // Draw live brush stroke preview
    if (this.isDrawingBrush && this.currentBrushPoints.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
      const radius = this.brushRadiusPx();
      for (const pt of this.currentBrushPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Auto-detection runner
  async runAutoDetection(): Promise<void> {
    const original = this.originalImage();
    if (!original || !this.activeImageElement) return;

    this.isDetecting.set(true);

    try {
      let detected: BlurRegion[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = this.activeImageElement.naturalWidth || 800;
      canvas.height = this.activeImageElement.naturalHeight || 600;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(this.activeImageElement, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Offload to worker if available
        if (typeof Worker !== 'undefined') {
          try {
            detected = await this.detectWithWorker(imgData);
          } catch {
            detected = await detectPrivacyRegions({
              data: imgData.data,
              width: canvas.width,
              height: canvas.height,
            });
          }
        } else {
          detected = await detectPrivacyRegions({
            data: imgData.data,
            width: canvas.width,
            height: canvas.height,
          });
        }
      }

      for (const reg of detected) {
        this.addRegion(reg);
      }
    } finally {
      this.isDetecting.set(false);
    }
  }

  private detectWithWorker(imageData: ImageData): Promise<BlurRegion[]> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.worker = worker;

        worker.onmessage = (
          event: MessageEvent<FacePlateBlurWorkerResponse>
        ) => {
          if (event.data.type === 'detect') {
            worker.terminate();
            if (this.worker === worker) this.worker = null;
            if (event.data.success && event.data.detectedRegions) {
              resolve(event.data.detectedRegions);
            } else {
              reject(new Error(event.data.error || 'Worker detection failed'));
            }
          }
        };

        worker.onerror = (err) => {
          worker.terminate();
          if (this.worker === worker) this.worker = null;
          reject(err);
        };

        worker.postMessage({
          type: 'detect',
          imageData: {
            data: imageData.data,
            width: imageData.width,
            height: imageData.height,
          },
        } as FacePlateBlurWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
  }

  async processImage(): Promise<void> {
    const original = this.originalImage();
    if (!original) return;

    this.isProcessing.set(true);

    try {
      const options: FacePlateBlurOptions = {
        censorMode: this.censorMode(),
        mosaicBlockSize: this.mosaicBlockSize(),
        blurRadiusPx: this.blurRadiusPx(),
        selectionMode: this.selectionMode(),
        brushRadiusPx: this.brushRadiusPx(),
        exportQuality: this.exportQuality(),
        exportFormat: this.exportFormat(),
        stripExif: this.stripExif(),
        regions: this.regions(),
      };

      const result = await processPrivacyBlur(
        original.file,
        options,
        original.name
      );

      this.lastResult.set(result);

      const previewBlobUrl = URL.createObjectURL(result.blob);
      this.createdBlobUrls.push(previewBlobUrl);

      const currentPreview = this.previewUrl();
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }
      this.previewUrl.set(previewBlobUrl);
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadDeliverable(): void {
    const result = this.lastResult();
    if (!result) return;

    const downloadUrl = URL.createObjectURL(result.blob);
    this.createdBlobUrls.push(downloadUrl);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 100);
  }

  resetToDefaults(): void {
    this.cleanUpUrls();
    this.censorMode.set('mosaic_pixelate');
    this.mosaicBlockSize.set(16);
    this.blurRadiusPx.set(12);
    this.selectionMode.set('manual_rect');
    this.brushRadiusPx.set(20);
    this.exportQuality.set(0.92);
    this.exportFormat.set('jpeg');
    this.stripExif.set(true);
    this.regions.set([]);
    this.previewUrl.set(null);
    this.originalImage.set(null);
    this.activeImageElement = null;
    this.lastResult.set(null);
    this.renderCanvas();
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private cleanUpUrls(): void {
    for (const url of this.createdBlobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore errors
      }
    }
    this.createdBlobUrls = [];
  }
}
