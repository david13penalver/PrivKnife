import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import { ProgressBar } from '../../../components/progress-bar/progress-bar';
import { parseMetadata, stripMetadata } from './engine';
import { ParsedMetadata, StrippedResult } from './types';

@Component({
  selector: 'app-exif-stripper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone, ProgressBar],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 960px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1>EXIF & Privacy Metadata Stripper</h1>
        <p class="g--margin-top-2" style="color: var(--color-text-muted); font-size: 1.125rem;">
          Purge hidden GPS coordinates, camera model, and device timestamps from your photos in one click.
        </p>
      </div>

      <!-- Error Alert -->
      @if (errorMessage()) {
        <div class="l-columns__area g--margin-bottom-4">
          <div
            class="g--padding-3"
            style="background-color: var(--color-danger-subtle, #fee2e2); border: 1px solid var(--color-danger); border-radius: var(--radius-sm); color: var(--color-danger);">
            <strong>Error:</strong> {{ errorMessage() }}
          </div>
        </div>
      }

      <!-- Step 1: Upload Dropzone (When no file selected) -->
      @if (!selectedFile()) {
        <div class="l-columns__area">
          <app-dropzone
            title="Drop your photo here, or browse"
            subtitle="Supports JPEG, JPG, and PNG files up to 100MB"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            (filesSelected)="onFilesDropped($event)" />
        </div>
      } @else {
        <!-- Step 2: Metadata Inspection & Comparison View -->
        <div class="l-columns__area">
          <app-card>
            <!-- File Summary Header -->
            <div
              class="l-extremo g--margin-bottom-4 g--padding-bottom-4"
              style="border-bottom: 1px solid var(--color-border-default); align-items: center;">
              <div>
                <h2 style="font-size: 1.25rem;">{{ selectedFile()?.name }}</h2>
                <span style="color: var(--color-text-muted); font-size: 0.875rem;">
                  {{ formattedOriginalSize() }} &bull; {{ metadata()?.format?.toUpperCase() }}
                </span>
              </div>
              <div class="g--flex-center" style="gap: 8px;">
                @if (strippedResult()) {
                  <app-badge variant="success">
                    ✨ Cleaned &bull; 0 EXIF Tags Remaining
                  </app-badge>
                } @else if (metadata()?.hasMetadata) {
                  <app-badge variant="danger">
                    ⚠️ Before: {{ metadata()?.tagCount }} Tags Detected
                  </app-badge>
                } @else {
                  <app-badge variant="neutral">
                    No Metadata Found
                  </app-badge>
                }
              </div>
            </div>

            <!-- Preview & Tag Grid -->
            <div class="l-columns l-columns--2 exif-workspace g--margin-bottom-4" style="gap: 24px;">
              <!-- Image Preview -->
              <div class="l-columns__area g--text-center">
                @if (previewUrl()) {
                  <img
                    [src]="previewUrl()"
                    [alt]="selectedFile()?.name || 'Image preview'"
                    style="max-width: 100%; max-height: 280px; object-fit: contain; border-radius: var(--radius-sm); border: 1px solid var(--color-border-default);" />
                }
              </div>

              <!-- Metadata Table -->
              <div class="l-columns__area">
                <h3 style="font-size: 1rem; margin-bottom: 8px;">Detected Attributes</h3>
                @if (metadata()?.tags && metadata()!.tags.length > 0) {
                  <div
                    style="max-height: 240px; overflow-y: auto; border: 1px solid var(--color-border-default); border-radius: var(--radius-sm);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                      <tbody>
                        @for (tag of metadata()!.tags; track tag.name) {
                          <tr style="border-bottom: 1px solid var(--color-border-default);">
                            <td style="padding: 6px 10px; font-weight: 500;">
                              {{ tag.name }}
                              @if (tag.isSensitive) {
                                <span style="color: var(--color-danger); font-size: 0.75rem;">(Sensitive)</span>
                              }
                            </td>
                            <td style="padding: 6px 10px; color: var(--color-text-muted); word-break: break-all;">
                              {{ tag.value }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <p style="color: var(--color-text-muted); font-size: 0.875rem;">
                    This image contains zero metadata tags or was already stripped.
                  </p>
                }
              </div>
            </div>

            <!-- Processing Progress Bar -->
            @if (isProcessing()) {
              <div class="g--margin-bottom-4">
                <app-progress-bar [indeterminate]="true" />
              </div>
            }

            <!-- Action Bar -->
            <div
              class="l-extremo g--margin-top-4 g--padding-top-4"
              style="border-top: 1px solid var(--color-border-default); align-items: center; gap: 12px; flex-wrap: wrap;">
              <div>
                <app-button variant="outline" (clicked)="reset()">
                  &larr; Choose Another Photo
                </app-button>
              </div>

              <div class="g--flex-center" style="gap: 12px;">
                @if (cleanedDownloadUrl()) {
                  <a
                    [href]="cleanedDownloadUrl()"
                    [download]="cleanedFileName()"
                    class="c-button c-button--primary">
                    Download Cleaned Image ({{ formattedCleanedSize() }})
                  </a>
                } @else {
                  <app-button
                    variant="primary"
                    [loading]="isProcessing()"
                    (clicked)="stripAndDownload()">
                    Strip Metadata &amp; Download
                  </app-button>
                }
              </div>
            </div>
          </app-card>
        </div>
      }

      <!-- Educational Privacy Card -->
      <div class="l-columns__area g--margin-top-6">
        <app-card title="Why strip photo metadata?">
          <p style="color: var(--color-text-muted); font-size: 0.9375rem;">
            When you snap photos on smartphones or cameras, hidden metadata (EXIF) records your exact GPS
            coordinates, date and time, camera model, and device serial numbers. Sharing these photos online
            can expose your home address or location history. PrivKnife strips this data in your browser without
            sending a single byte across the internet.
          </p>
        </app-card>
      </div>
    </div>
  `,
  styles: [
    `
      @media (max-width: 900px) {
        .exif-workspace {
          grid-template-columns: 1fr !important;
        }

        .exif-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class ExifStripperComponent implements OnDestroy {
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly metadata = signal<ParsedMetadata | null>(null);
  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly strippedResult = signal<StrippedResult | null>(null);
  readonly cleanedDownloadUrl = signal<string | null>(null);
  readonly cleanedFileName = signal<string | null>(null);

  readonly formattedOriginalSize = computed(() => {
    const file = this.selectedFile();
    return file ? this.formatBytes(file.size) : '0 B';
  });

  readonly formattedCleanedSize = computed(() => {
    const res = this.strippedResult();
    return res ? this.formatBytes(res.cleanedSize) : '0 B';
  });

  onFilesDropped(files: File[]): void {
    if (files && files.length > 0) {
      this.onFileSelected(files[0]);
    }
  }

  async onFileSelected(file: File): Promise<void> {
    this.errorMessage.set(null);
    this.cleanObjectUrls();

    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const parsed = parseMetadata(buffer, file.name);

      this.selectedFile.set(file);
      this.metadata.set(parsed);
      this.previewUrl.set(URL.createObjectURL(file));
      this.strippedResult.set(null);
      this.cleanedDownloadUrl.set(null);
    } catch (err: any) {
      this.reset(true);
      this.errorMessage.set(err.message || 'Failed to parse image metadata. File may be corrupted.');
    }
  }

  async stripAndDownload(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = stripMetadata(buffer, file.name);

      const blob = new Blob([result.cleanedBuffer as BlobPart], { type: result.mimeType });
      const downloadUrl = URL.createObjectURL(blob);
      const cleanName = `clean-${file.name}`;

      this.strippedResult.set(result);
      this.cleanedDownloadUrl.set(downloadUrl);
      this.cleanedFileName.set(cleanName);

      // Trigger automatic download
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = cleanName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to strip metadata.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  reset(preserveError: boolean = false): void {
    this.cleanObjectUrls();
    this.selectedFile.set(null);
    this.metadata.set(null);
    this.strippedResult.set(null);
    this.cleanedDownloadUrl.set(null);
    this.cleanedFileName.set(null);
    if (!preserveError) {
      this.errorMessage.set(null);
    }
    this.isProcessing.set(false);
  }

  ngOnDestroy(): void {
    this.cleanObjectUrls();
  }

  private cleanObjectUrls(): void {
    const pUrl = this.previewUrl();
    if (pUrl) {
      URL.revokeObjectURL(pUrl);
      this.previewUrl.set(null);
    }
    const dUrl = this.cleanedDownloadUrl();
    if (dUrl) {
      URL.revokeObjectURL(dUrl);
      this.cleanedDownloadUrl.set(null);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
