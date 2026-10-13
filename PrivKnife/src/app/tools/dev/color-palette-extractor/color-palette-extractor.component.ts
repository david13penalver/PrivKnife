import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import {
  buildContrastMatrix,
  createExtractedColor,
  encodeAseBinary,
  extractPaletteFromImageData,
  generateCssVariables,
  generateJsonTokens,
  generateWcagPdfReport,
  rgbToHex,
} from './engine';
import { SAMPLE_EXTRACTED_PALETTE } from './test-fixtures';
import {
  ContrastMatrixCell,
  ExtractedColor,
} from './types';

@Component({
  selector: 'app-color-palette-extractor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone, FormsModule],
  template: `
    <div
      class="l-columns l-columns--1 g--margin-x-auto"
      style="max-width: 1300px; padding: 0 16px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.025em;">
          Color Palette Extractor &amp; WCAG Contrast Checker
        </h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 820px; margin: 0 auto; line-height: 1.6;">
          Extract dominant color palettes from branding photos and UI mockups, sample individual pixels,
          and instantly verify WCAG 2.1 AA and AAA contrast accessibility ratios. Zero cloud ingestion.
        </p>
      </div>

      <!-- Top Leaderboard Ad Slot (728x90) -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center print-hidden">
        <div
          class="ad-slot ad-slot--leaderboard"
          style="max-width: 728px; height: 90px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
          <span>Responsive Ad Placement (728x90 Top Leaderboard)</span>
        </div>
      </div>

      <!-- 2-Column Main Workspace -->
      <div class="l-columns l-columns--2 palette-workspace g--margin-bottom-6" style="gap: 24px; align-items: start;">
        
        <!-- Left: Image Ingestion & Eyedropper Workspace -->
        <div class="l-columns__area" style="display: flex; flex-direction: column; gap: 20px;">
          <!-- 1. Image Uploader -->
          <app-card title="1. Ingest Image for Sampling">
            <app-dropzone
              accept="image/*"
              [multiple]="false"
              title="Drop photo, logo or screenshot here (PNG, JPG, WebP, SVG)"
              subtitle="All quantization is calculated in-browser via Canvas API"
              (filesSelected)="onImageSelected($event)" />

            <!-- Extraction Count Slider -->
            <div style="margin-top: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label for="colorCountRange" class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                  Target Dominant Colors
                </label>
                <span style="font-size: 0.8125rem; font-weight: 700; color: var(--color-primary);">
                  {{ colorCount() }} Colors
                </span>
              </div>
              <input
                id="colorCountRange"
                type="range"
                min="4"
                max="10"
                step="1"
                style="width: 100%; cursor: pointer;"
                [ngModel]="colorCount()"
                (ngModelChange)="onColorCountChange(+$event)" />
            </div>

            <!-- Image Canvas & Interactive Eyedropper -->
            @if (imagePreviewUrl()) {
              <div style="margin-top: 18px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 0.8125rem; font-weight: 600;">
                    Click image to sample pixel color (Eyedropper):
                  </span>
                  <button
                    type="button"
                    style="background: none; border: none; font-size: 0.75rem; color: #ef4444; cursor: pointer;"
                    (click)="clearImage()">
                    Clear Image
                  </button>
                </div>
                <div
                  style="position: relative; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--color-border-subtle); background: #000; text-align: center;">
                  <img
                    #previewImg
                    [src]="imagePreviewUrl()"
                    alt="Uploaded Sample"
                    (click)="onImageClick($event)"
                    style="max-width: 100%; max-height: 380px; object-fit: contain; cursor: crosshair; display: block; margin: 0 auto;" />
                </div>
              </div>
            }
          </app-card>

          <!-- 2. Extracted Palette Swatches -->
          <app-card title="2. Extracted Palette Swatches">
            <div style="display: flex; flex-direction: column; gap: 10px;">
              @for (color of palette(); track color.id) {
                <div
                  style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--color-bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle); gap: 12px;">
                  <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                    <!-- Color Swatch Circle -->
                    <div
                      style="width: 38px; height: 38px; border-radius: 8px; background: {{ color.hex }}; border: 1px solid rgba(0,0,0,0.15); flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                    </div>
                    <div style="min-width: 0;">
                      <div style="font-weight: 700; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        {{ color.name }}
                      </div>
                      <div style="font-size: 0.75rem; color: var(--color-text-muted); font-family: monospace;">
                        {{ color.hex.toUpperCase() }} &bull; RGB({{ color.rgb.r }}, {{ color.rgb.g }}, {{ color.rgb.b }}) &bull; Lum: {{ color.luminance.toFixed(2) }}
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px;">
                    <input
                      type="color"
                      [ngModel]="color.hex"
                      (ngModelChange)="updateColor(color.id, $event)"
                      style="width: 30px; height: 30px; border: 1px solid var(--color-border-subtle); border-radius: 4px; cursor: pointer;" />
                    <button
                      type="button"
                      style="background: none; border: none; font-size: 1rem; color: var(--color-text-muted); cursor: pointer; padding: 4px;"
                      title="Remove color"
                      (click)="removeColor(color.id)">
                      &times;
                    </button>
                  </div>
                </div>
              }

              <!-- Add Custom Color Row -->
              <div
                style="display: flex; align-items: center; gap: 10px; margin-top: 10px; padding-top: 12px; border-top: 1px dashed var(--color-border-subtle);">
                <input
                  type="color"
                  [ngModel]="newColorHex()"
                  (ngModelChange)="newColorHex.set($event)"
                  style="width: 36px; height: 36px; border: 1px solid var(--color-border-subtle); border-radius: 4px; cursor: pointer;" />
                <input
                  type="text"
                  class="c-input"
                  style="flex: 1;"
                  [ngModel]="newColorName()"
                  (ngModelChange)="newColorName.set($event)"
                  placeholder="Custom Color Name (optional)" />
                <app-button
                  variant="outline"
                  size="small"
                  (clicked)="addColor(newColorHex(), newColorName())">
                  + Add Swatch
                </app-button>
              </div>
            </div>
          </app-card>

          <!-- Sidebar Ad Slot (300x250) -->
          <div
            class="ad-slot ad-slot--sidebar print-hidden"
            style="height: 250px; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
            <span>Responsive Ad Placement (300x250 Sidebar)</span>
          </div>
        </div>

        <!-- Right: WCAG 2.1 Contrast Matrix & Readability Inspector -->
        <div class="l-columns__area" style="display: flex; flex-direction: column; gap: 20px;">
          <!-- 3. WCAG Contrast Matrix Table -->
          <app-card title="3. WCAG 2.1 Accessibility Matrix (N &times; N)">
            <p style="font-size: 0.8125rem; color: var(--color-text-muted); margin-top: 0; margin-bottom: 14px;">
              Cross-evaluates every foreground text and background pair. Click any ratio cell to inspect live text rendering.
            </p>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: center;">
                <thead>
                  <tr>
                    <th style="padding: 6px; border: 1px solid var(--color-border-subtle); background: var(--color-bg-subtle); font-weight: 700;">
                      FG \\ BG
                    </th>
                    @for (col of palette(); track col.id) {
                      <th
                        style="padding: 6px; border: 1px solid var(--color-border-subtle); background: var(--color-bg-subtle);"
                        [title]="col.name || col.hex">
                        <div
                          style="width: 14px; height: 14px; border-radius: 3px; background: {{ col.hex }}; margin: 0 auto 2px; border: 1px solid rgba(0,0,0,0.15);"></div>
                        <span>{{ col.hex.substring(1, 4) }}</span>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of matrix(); track $index; let rIdx = $index) {
                    <tr>
                      <td
                        style="padding: 6px; border: 1px solid var(--color-border-subtle); background: var(--color-bg-subtle); font-weight: 700;">
                        <div style="display: flex; align-items: center; gap: 4px; justify-content: center;">
                          <div
                            style="width: 14px; height: 14px; border-radius: 3px; background: {{ palette()[rIdx].hex }}; border: 1px solid rgba(0,0,0,0.15);"></div>
                          <span>{{ palette()[rIdx].hex.substring(1, 4) }}</span>
                        </div>
                      </td>

                      @for (cell of row; track $index) {
                        <td
                          (click)="selectCell(cell)"
                          [style.cursor]="'pointer'"
                          [style.background]="getCellBg(cell)"
                          [style.font-weight]="cell === activeCell() ? '800' : '500'"
                          [style.border]="cell === activeCell() ? '2px solid var(--color-primary)' : '1px solid var(--color-border-subtle)'"
                          style="padding: 8px 4px;">
                          <div>{{ cell.compliance.ratio }}:1</div>
                          @if (cell.compliance.passAaaNormal) {
                            <span style="font-size: 0.625rem; font-weight: 700; color: #047857;">AAA</span>
                          } @else if (cell.compliance.passAaNormal) {
                            <span style="font-size: 0.625rem; font-weight: 700; color: #1d4ed8;">AA</span>
                          } @else if (cell.compliance.passAaLarge) {
                            <span style="font-size: 0.625rem; font-weight: 700; color: #b45309;">Large</span>
                          } @else {
                            <span style="font-size: 0.625rem; color: #dc2626;">Fail</span>
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Matrix Legend -->
            <div
              style="display: flex; gap: 14px; margin-top: 14px; font-size: 0.75rem; color: var(--color-text-muted); flex-wrap: wrap;">
              <span style="display: flex; align-items: center; gap: 4px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: rgba(16, 185, 129, 0.25); display: inline-block;"></span>
                <strong>AAA</strong> (&ge;7.0:1 Enhanced)
              </span>
              <span style="display: flex; align-items: center; gap: 4px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: rgba(37, 99, 235, 0.25); display: inline-block;"></span>
                <strong>AA</strong> (&ge;4.5:1 Normal Text)
              </span>
              <span style="display: flex; align-items: center; gap: 4px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: rgba(245, 158, 11, 0.25); display: inline-block;"></span>
                <strong>Large</strong> (&ge;3.0:1 Large/UI)
              </span>
              <span style="display: flex; align-items: center; gap: 4px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: rgba(239, 68, 68, 0.2); display: inline-block;"></span>
                <strong>Fail</strong> (&lt;3.0:1)
              </span>
            </div>
          </app-card>

          <!-- 4. Live Pair Readability Inspector -->
          @if (activeCell()) {
            <app-card title="4. Live Readability Inspector">
              <div
                style="border-radius: var(--radius-md); padding: 24px; border: 1px solid var(--color-border-subtle); background: {{ activeCell()?.background?.hex }}; color: {{ activeCell()?.foreground?.hex }}; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; opacity: 0.8;">
                  Ratio: {{ activeCell()?.compliance?.ratio }}:1 &bull; FG: {{ activeCell()?.foreground?.hex }} &bull; BG: {{ activeCell()?.background?.hex }}
                </div>
                <h3 style="font-size: 1.5rem; font-weight: 800; margin: 0 0 10px 0; color: inherit;">
                  Typography Contrast Preview Headline
                </h3>
                <p style="font-size: 1rem; line-height: 1.6; margin: 0 0 16px 0; color: inherit;">
                  This is standard body copy rendered with the selected foreground and background colors.
                  Verify readability in actual simulated UI components.
                </p>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                  <button
                    type="button"
                    style="background: {{ activeCell()?.foreground?.hex }}; color: {{ activeCell()?.background?.hex }}; border: none; border-radius: 6px; padding: 8px 16px; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
                    Button Label
                  </button>
                  <div
                    style="border: 1px solid {{ activeCell()?.foreground?.hex }}; border-radius: 6px; padding: 8px 14px; font-size: 0.8125rem;">
                    Outlined Badge
                  </div>
                </div>
              </div>

              <!-- Compliance Verdict Badges -->
              <div style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
                <app-badge [variant]="activeCell()?.compliance?.passAaNormal ? 'success' : 'neutral'">
                  {{ activeCell()?.compliance?.passAaNormal ? '✓ Pass' : '✕ Fail' }} WCAG AA Normal (4.5:1)
                </app-badge>
                <app-badge [variant]="activeCell()?.compliance?.passAaLarge ? 'success' : 'neutral'">
                  {{ activeCell()?.compliance?.passAaLarge ? '✓ Pass' : '✕ Fail' }} WCAG AA Large (3.0:1)
                </app-badge>
                <app-badge [variant]="activeCell()?.compliance?.passAaaNormal ? 'success' : 'neutral'">
                  {{ activeCell()?.compliance?.passAaaNormal ? '✓ Pass' : '✕ Fail' }} WCAG AAA Normal (7.0:1)
                </app-badge>
                <app-badge [variant]="activeCell()?.compliance?.passUi ? 'success' : 'neutral'">
                  {{ activeCell()?.compliance?.passUi ? '✓ Pass' : '✕ Fail' }} UI Components (3.0:1)
                </app-badge>
              </div>
            </app-card>
          }

          <!-- 5. Export Action Panel -->
          <app-card title="5. Multi-Format Exports">
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <app-button variant="primary" (clicked)="downloadJson()">
                <span>📄 JSON Design Tokens</span>
              </app-button>

              <app-button variant="secondary" (clicked)="downloadAse()">
                <span>🎨 Adobe ASE Swatch</span>
              </app-button>

              <app-button variant="secondary" (clicked)="downloadPdf()">
                <span>📋 PDF Compliance Report</span>
              </app-button>

              <app-button variant="outline" (clicked)="copyCssVariables()">
                <span>{{ copiedCss() ? '✓ Copied' : '💻 Copy CSS Variables' }}</span>
              </app-button>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
              <app-button variant="outline" size="small" (clicked)="reset()">
                Reset to Default Palette
              </app-button>
            </div>
          </app-card>
        </div>
      </div>

      <!-- Post-Export Instructions Dialog Modal -->
      @if (showExportModal()) {
        <div
          class="c-modal-overlay"
          style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;">
          <div
            class="c-card"
            style="max-width: 540px; width: 100%; background: var(--color-bg); border-radius: var(--radius-lg); padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid var(--color-border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0;">
                🎉 Export Ready!
              </h3>
              <button
                type="button"
                style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-text-muted);"
                (click)="closeExportModal()">
                &times;
              </button>
            </div>

            <p style="font-size: 0.9375rem; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 16px;">
              Your palette asset has been downloaded to your device with 100% in-browser privacy.
            </p>

            <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 0.875rem; line-height: 1.6;">
              <li><strong>Adobe ASE:</strong> Import directly in Adobe Photoshop, Illustrator, or InDesign swatches panel.</li>
              <li><strong>JSON Tokens:</strong> Standardized tokens compatible with Tailwind CSS and Style Dictionary.</li>
              <li><strong>PDF Audit:</strong> Official compliance report for client handoff and accessibility audits.</li>
            </ul>

            <!-- Modal Ad Placement (300x250) -->
            <div
              class="ad-slot ad-slot--modal print-hidden"
              style="height: 160px; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem; margin-bottom: 20px;">
              <span>Responsive Ad Placement (Palette Download)</span>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <app-button variant="primary" (clicked)="closeExportModal()">
                Done
              </app-button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @media (max-width: 1024px) {
        .palette-workspace {
          grid-template-columns: 1fr !important;
        }

        .palette-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class ColorPaletteExtractorComponent implements OnDestroy {
  readonly previewImg = viewChild<ElementRef<HTMLImageElement>>('previewImg');

  readonly palette = signal<ExtractedColor[]>([...SAMPLE_EXTRACTED_PALETTE]);
  readonly colorCount = signal<number>(6);
  readonly imageFile = signal<File | null>(null);
  readonly imagePreviewUrl = signal<string | null>(null);
  readonly activeCell = signal<ContrastMatrixCell | null>(null);
  readonly copiedCss = signal<boolean>(false);
  readonly showExportModal = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);

  readonly newColorHex = signal<string>('#3b82f6');
  readonly newColorName = signal<string>('');

  readonly matrix = computed(() => buildContrastMatrix(this.palette()));

  constructor() {
    const mat = this.matrix();
    if (mat.length > 1 && mat[0].length > 1) {
      this.activeCell.set(mat[0][1]);
    }
  }

  ngOnDestroy(): void {
    if (this.imagePreviewUrl()) {
      URL.revokeObjectURL(this.imagePreviewUrl()!);
      this.imagePreviewUrl.set(null);
    }
  }

  async onImageSelected(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.imageFile.set(file);

    if (this.imagePreviewUrl()) {
      URL.revokeObjectURL(this.imagePreviewUrl()!);
    }
    const url = URL.createObjectURL(file);
    this.imagePreviewUrl.set(url);

    await this.extractFromLoadedImage(url);
  }

  async onColorCountChange(count: number): Promise<void> {
    this.colorCount.set(count);
    if (this.imagePreviewUrl()) {
      await this.extractFromLoadedImage(this.imagePreviewUrl()!);
    }
  }

  private async extractFromLoadedImage(url: string): Promise<void> {
    const isJsdom =
      typeof window !== 'undefined' &&
      window.navigator?.userAgent?.toLowerCase().includes('jsdom');

    if (isJsdom || typeof Image === 'undefined') {
      return;
    }

    this.isProcessing.set(true);
    try {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });

      if (typeof document !== 'undefined' && img.width > 0 && img.height > 0) {
        const canvas = document.createElement('canvas');
        const maxDim = 200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const colors = extractPaletteFromImageData(
            imgData.data,
            canvas.width,
            canvas.height,
            this.colorCount()
          );
          if (colors.length > 0) {
            this.palette.set(colors);
            const mat = this.matrix();
            if (mat.length > 1 && mat[0].length > 1) {
              this.activeCell.set(mat[0][1]);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to extract palette from image', err);
    } finally {
      this.isProcessing.set(false);
    }
  }

  onImageClick(event: MouseEvent): void {
    const imgEl = this.previewImg()?.nativeElement;
    if (!imgEl || !imgEl.naturalWidth) return;

    try {
      const rect = imgEl.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      const scaleX = imgEl.naturalWidth / rect.width;
      const scaleY = imgEl.naturalHeight / rect.height;

      const realX = Math.floor(clickX * scaleX);
      const realY = Math.floor(clickY * scaleY);

      const canvas = document.createElement('canvas');
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgEl, 0, 0);
        const pixel = ctx.getImageData(realX, realY, 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        this.addColor(hex, `Sample (${realX},${realY})`);
      }
    } catch (err) {
      console.error('Eyedropper pixel read error', err);
    }
  }

  addColor(hex: string, name?: string): void {
    const newColor = createExtractedColor(hex, name || undefined);
    this.palette.set([...this.palette(), newColor]);
    this.newColorName.set('');
  }

  updateColor(id: string, newHex: string): void {
    const updated = this.palette().map((c) => {
      if (c.id === id) {
        const col = createExtractedColor(newHex, c.name);
        return { ...col, id };
      }
      return c;
    });
    this.palette.set(updated);
  }

  removeColor(id: string): void {
    if (this.palette().length <= 2) return;
    const filtered = this.palette().filter((c) => c.id !== id);
    this.palette.set(filtered);
    if (this.activeCell()?.foreground.id === id || this.activeCell()?.background.id === id) {
      const mat = this.matrix();
      if (mat.length > 0 && mat[0].length > 0) {
        this.activeCell.set(mat[0][0]);
      }
    }
  }

  selectCell(cell: ContrastMatrixCell): void {
    this.activeCell.set(cell);
  }

  getCellBg(cell: ContrastMatrixCell): string {
    if (cell.compliance.passAaaNormal) {
      return 'rgba(16, 185, 129, 0.18)';
    }
    if (cell.compliance.passAaNormal) {
      return 'rgba(37, 99, 235, 0.16)';
    }
    if (cell.compliance.passAaLarge) {
      return 'rgba(245, 158, 11, 0.16)';
    }
    return 'rgba(239, 68, 68, 0.12)';
  }

  async copyCssVariables(): Promise<void> {
    try {
      const css = generateCssVariables(this.palette());
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(css);
      }
      this.copiedCss.set(true);
      setTimeout(() => this.copiedCss.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy CSS variables', err);
    }
  }

  async downloadJson(): Promise<void> {
    const jsonStr = generateJsonTokens(this.palette());
    const blob = new Blob([jsonStr], { type: 'application/json' });
    this.triggerDownload(blob, 'palette-design-tokens.json');
    this.showExportModal.set(true);
  }

  async downloadAse(): Promise<void> {
    const aseBytes = encodeAseBinary(this.palette());
    const blob = new Blob([aseBytes as any], { type: 'application/octet-stream' });
    this.triggerDownload(blob, 'palette.ase');
    this.showExportModal.set(true);
  }

  async downloadPdf(): Promise<void> {
    const blob = await generateWcagPdfReport(this.palette(), this.matrix());
    this.triggerDownload(blob, 'wcag-contrast-audit-report.pdf');
    this.showExportModal.set(true);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  closeExportModal(): void {
    this.showExportModal.set(false);
  }

  clearImage(): void {
    if (this.imagePreviewUrl()) {
      URL.revokeObjectURL(this.imagePreviewUrl()!);
      this.imagePreviewUrl.set(null);
    }
    this.imageFile.set(null);
  }

  reset(): void {
    this.clearImage();
    this.palette.set([...SAMPLE_EXTRACTED_PALETTE]);
    const mat = this.matrix();
    if (mat.length > 1 && mat[0].length > 1) {
      this.activeCell.set(mat[0][1]);
    }
    this.showExportModal.set(false);
  }
}
