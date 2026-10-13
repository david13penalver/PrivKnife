import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Badge } from '../../components/badge/badge';
import { Button } from '../../components/button/button';
import { Card } from '../../components/card/card';
import { Dropzone } from '../../components/dropzone/dropzone';
import { ProgressBar } from '../../components/progress-bar/progress-bar';
import { SplitPreview } from '../../components/split-preview/split-preview';

@Component({
  selector: 'app-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Badge, Card, Dropzone, ProgressBar, SplitPreview],
  template: `
    <section class="g--margin-bottom-8">
      <div class="g--text-center g--margin-bottom-8">
        <h2>Component Design System & UI Kit</h2>
        <p class="g--margin-top-1">
          Live interactive showcase of the SASS BEM architecture and Angular standalone components.
        </p>
      </div>

      <!-- 1. Badges & Indicators -->
      <div class="g--margin-bottom-8">
        <h3 class="g--margin-bottom-3">1. Badges & Status Indicators</h3>
        <div class="g--flex g--flex-wrap g--items-center" style="gap: 12px;">
          <app-badge variant="privacy" [dot]="true">
            🛡️ 100% In-Browser • Never Leaves Your Device
          </app-badge>
          <app-badge variant="success" [dot]="true">WASM Ready</app-badge>
          <app-badge variant="warning">Worker Busy</app-badge>
          <app-badge variant="danger">Failed</app-badge>
          <app-badge variant="info">Client-Side</app-badge>
          <app-badge variant="neutral">v1.0.0</app-badge>
        </div>
      </div>

      <!-- 2. Buttons -->
      <div class="g--margin-bottom-8">
        <h3 class="g--margin-bottom-3">2. Buttons & Actions</h3>
        <div class="g--flex g--flex-wrap g--items-center" style="gap: 12px;">
          <app-button variant="primary">Primary Action</app-button>
          <app-button variant="secondary">Secondary Action</app-button>
          <app-button variant="outline">Outline</app-button>
          <app-button variant="ghost">Ghost</app-button>
          <app-button variant="danger">Delete / Reset</app-button>
          <app-button variant="primary" [loading]="true">Loading</app-button>
          <app-button variant="primary" [disabled]="true">Disabled</app-button>
          <app-button variant="primary" size="small">Small</app-button>
          <app-button variant="primary" size="large">Large</app-button>
        </div>
      </div>

      <!-- 3. Layout Grid & Cards -->
      <div class="g--margin-bottom-8">
        <h3 class="g--margin-bottom-3">3. Cards & 3-Column Grid (.l-columns--3, .l-columns--cards)</h3>
        <div class="l-columns l-columns--3 l-columns--cards">
          <div class="l-columns__area">
            <app-card title="EXIF Stripper" [hasFooter]="true">
              <p>Remove location, camera metadata, and timestamps from JPEG/PNG images locally.</p>
              <div card-footer class="l-extremo">
                <div class="l-extremo__area-izquierda">
                  <app-badge variant="privacy">Client-Only</app-badge>
                </div>
                <div class="l-extremo__area-derecha">
                  <app-button variant="primary" size="small">Open Tool</app-button>
                </div>
              </div>
            </app-card>
          </div>

          <div class="l-columns__area">
            <app-card title="PDF Redaction" [hasFooter]="true">
              <p>Sanitize and black-out confidential paragraphs directly in HTML5 canvas.</p>
              <div card-footer class="l-extremo">
                <div class="l-extremo__area-izquierda">
                  <app-badge variant="privacy">No Uploads</app-badge>
                </div>
                <div class="l-extremo__area-derecha">
                  <app-button variant="primary" size="small">Open Tool</app-button>
                </div>
              </div>
            </app-card>
          </div>

          <div class="l-columns__area">
            <app-card title="Hash Generator" [interactive]="true" [hasFooter]="true">
              <p>Generate SHA-256, MD5, and UUIDv4 hashes using the native Web Crypto API.</p>
              <div card-footer class="l-extremo">
                <div class="l-extremo__area-izquierda">
                  <app-badge variant="success">Web Crypto</app-badge>
                </div>
                <div class="l-extremo__area-derecha">
                  <app-button variant="outline" size="small">Launch</app-button>
                </div>
              </div>
            </app-card>
          </div>
        </div>
      </div>

      <!-- 4. Interactive File Dropzone -->
      <div class="g--margin-bottom-8">
        <h3 class="g--margin-bottom-3">4. File Ingestion Dropzone</h3>
        <app-dropzone
          accept="image/*,application/pdf"
          title="Drop image or PDF files here"
          subtitle="All files are processed strictly in memory inside your browser"
          (filesSelected)="onFilesSelected($event)"
          (rejected)="onFileRejected($event)">
          <div dropzone-hint class="g--margin-top-2">
            <small class="c-badge c-badge--privacy">Maximum file size: 100MB</small>
          </div>
        </app-dropzone>

        @if (selectedFiles().length > 0) {
          <div class="g--margin-top-3">
            <strong>Selected Files:</strong>
            <ul>
              @for (file of selectedFiles(); track file) {
                <li class="g--margin-top-1">📄 {{ file }}</li>
              }
            </ul>
          </div>
        }

        @if (dropzoneError()) {
          <div class="c-input__error g--margin-top-2">
            ⚠️ {{ dropzoneError() }}
          </div>
        }
      </div>

      <!-- 5. Real-Time Progress Bar -->
      <div class="g--margin-bottom-8">
        <h3 class="g--margin-bottom-3">5. Progress Bar</h3>
        <div class="g--flex g--flex-col" style="gap: 16px;">
          <app-progress-bar
            [value]="progressValue()"
            label="Simulating Web Worker Processing..."
            variant="primary" />

          <div class="g--flex g--items-center" style="gap: 12px;">
            <label class="c-input__label">Adjust Progress:</label>
            <input
              type="range"
              class="c-input__slider"
              min="0"
              max="100"
              [value]="progressValue()"
              (input)="onProgressChange($event)"
              style="max-width: 240px;" />
            <span class="g--user-select-none">{{ progressValue() }}%</span>
          </div>

          <app-progress-bar
            [indeterminate]="true"
            label="Indeterminate background WASM compilation"
            variant="primary" />
        </div>
      </div>

      <!-- 6. Split Preview Comparison -->
      <div class="g--margin-bottom-8">
        <h3 class="g--margin-bottom-3">6. Before / After Split Comparison Preview</h3>
        <p class="g--margin-bottom-3">
          Drag the center handle horizontally to compare before and after outputs in real time:
        </p>

        <app-split-preview
          beforeLabel="Original (2.4 MB)"
          afterLabel="Compressed WebP (180 KB)">
          <!-- Before Canvas / Box -->
          <div
            before
            style="width: 100%; height: 320px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1e293b, #0f172a); color: #ffffff;">
            <div class="g--text-center">
              <div style="font-size: 3rem;">🖼️</div>
              <p style="color: #cbd5e1; font-weight: 600;">Original Uncompressed Media</p>
              <small style="color: #94a3b8;">Format: JPEG • Quality: 100% • Size: 2.4 MB</small>
            </div>
          </div>

          <!-- After Canvas / Box -->
          <div
            after
            style="width: 100%; height: 320px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #059669, #047857); color: #ffffff;">
            <div class="g--text-center">
              <div style="font-size: 3rem;">⚡</div>
              <p style="color: #ffffff; font-weight: 600;">Optimized WebP (92% Saved)</p>
              <small style="color: #d1fae5;">Format: WebP • Quality: 80% • Size: 180 KB</small>
            </div>
          </div>
        </app-split-preview>
      </div>

      <!-- 7. Form Controls & Sliders -->
      <div class="g--margin-bottom-8">
        <h3 class="g--margin-bottom-3">7. Form Controls & Modifiers</h3>
        <div class="l-columns l-columns--2">
          <div class="l-columns__area">
            <div class="c-input">
              <label class="c-input__label">Output Format</label>
              <select class="c-input__control">
                <option value="webp">WebP (Recommended)</option>
                <option value="jpg">JPEG Standard</option>
                <option value="png">PNG Lossless</option>
                <option value="avif">AVIF High Compression</option>
              </select>
              <span class="c-input__hint">Selected format determines client-side compression algorithm.</span>
            </div>
          </div>

          <div class="l-columns__area">
            <div class="c-input">
              <label class="c-input__label">Preset Options</label>
              <div class="g--flex g--items-center" style="gap: 16px; margin-top: 8px;">
                <label class="c-input__switch">
                  <input type="checkbox" checked />
                  <span class="c-input__switch-track"></span>
                  <span>Strip EXIF Data</span>
                </label>

                <label class="c-input__switch">
                  <input type="checkbox" checked />
                  <span class="c-input__switch-track"></span>
                  <span>Retain Color Profile</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class Showcase {
  protected readonly progressValue = signal<number>(65);
  protected readonly selectedFiles = signal<string[]>([]);
  protected readonly dropzoneError = signal<string>('');

  protected onFilesSelected(files: File[]): void {
    this.dropzoneError.set('');
    const descriptions = files.map(
      (f) => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`
    );
    this.selectedFiles.set(descriptions);
  }

  protected onFileRejected(errorMsg: string): void {
    this.dropzoneError.set(errorMsg);
  }

  protected onProgressChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.progressValue.set(val);
  }
}
