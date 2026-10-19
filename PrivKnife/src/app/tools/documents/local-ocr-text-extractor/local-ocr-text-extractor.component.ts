import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ExportOcrFormat,
  LocalOcrTextExtractorOptions,
  LocalOcrTextExtractorResult,
  OcrLanguage,
  PageSegmentationMode,
} from './types';
import { processLocalOcr } from './engine';

@Component({
  selector: 'app-local-ocr-text-extractor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <header class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Local OCR Image & Scanned PDF to Text & Word</h1>
          <p class="c-header__subtitle">
            Extract editable text, tables, and paragraphs from photos, invoices, and scanned multi-page PDFs.
            100% private in-browser recognition with zero server uploads and zero telemetry.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </header>

      <!-- Main Columns Layout -->
      <div class="l-columns l-columns--2">
        <!-- Configuration & Upload Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">OCR Configuration & Input</h2>
          </div>

          <div class="c-card__body">
            <!-- Dropzone -->
            <div
              class="c-dropzone g--margin-bottom-4"
              (dragover)="$event.preventDefault()"
              (drop)="onFileDrop($event)"
              (click)="fileInput.click()"
            >
              <input
                #fileInput
                type="file"
                class="c-dropzone__input"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                (change)="onFileInputChange($event)"
              />
              <div class="c-dropzone__content">
                <span class="c-dropzone__icon">📄</span>
                <p class="c-dropzone__text">
                  @if (selectedFile()) {
                    Selected: <strong>{{ selectedFile()?.name }}</strong> ({{ formatBytes(selectedFile()?.size || 0) }})
                  } @else {
                    Drop scanned document or image here, or <strong>browse</strong>
                  }
                </p>
                <span class="c-dropzone__hint">Supports PDF, PNG, JPG, WebP</span>
              </div>
            </div>

            <!-- Language Selector -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Document Language</label>
              <select
                class="c-input__select"
                [ngModel]="ocrLanguage()"
                (ngModelChange)="setLanguage($event)"
              >
                <option value="eng">English (eng)</option>
                <option value="spa">Spanish / Español (spa)</option>
                <option value="fra">French / Français (fra)</option>
                <option value="deu">German / Deutsch (deu)</option>
                <option value="ita">Italian / Italiano (ita)</option>
                <option value="por">Portuguese / Português (por)</option>
              </select>
            </div>

            <!-- Page Segmentation Mode -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Page Segmentation (Layout Analysis)</label>
              <div class="c-button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="pageSegmentationMode() === 'auto'"
                  [class.c-button--outline]="pageSegmentationMode() !== 'auto'"
                  (click)="setSegmentation('auto')"
                >
                  Auto Detect
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="pageSegmentationMode() === 'single_block'"
                  [class.c-button--outline]="pageSegmentationMode() !== 'single_block'"
                  (click)="setSegmentation('single_block')"
                >
                  Single Block
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="pageSegmentationMode() === 'single_line'"
                  [class.c-button--outline]="pageSegmentationMode() !== 'single_line'"
                  (click)="setSegmentation('single_line')"
                >
                  Single Line
                </button>
              </div>
            </div>

            <!-- Text Formatting Toggles -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Post-Processing Optimizations</label>
              <div class="c-checkbox-group">
                <label class="c-checkbox-label">
                  <input
                    type="checkbox"
                    [ngModel]="cleanIrregularLinebreaks()"
                    (ngModelChange)="setCleanLinebreaks($event)"
                  />
                  <span>Unwrap hyphenated words & clean linebreaks</span>
                </label>
                <label class="c-checkbox-label g--margin-top-2">
                  <input
                    type="checkbox"
                    [ngModel]="preserveTableSpacing()"
                    (ngModelChange)="setPreserveTables($event)"
                  />
                  <span>Preserve tabular spacing (tab stops)</span>
                </label>
              </div>
            </div>

            <!-- Export Format Selector -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Export Format</label>
              <div class="c-button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'txt'"
                  [class.c-button--outline]="exportFormat() !== 'txt'"
                  (click)="setExportFormat('txt')"
                >
                  Plain Text (.txt)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'markdown'"
                  [class.c-button--outline]="exportFormat() !== 'markdown'"
                  (click)="setExportFormat('markdown')"
                >
                  Markdown (.md)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'docx'"
                  [class.c-button--outline]="exportFormat() !== 'docx'"
                  (click)="setExportFormat('docx')"
                >
                  Word Document (.docx)
                </button>
              </div>
            </div>

            <!-- Privacy Guarantee Notice -->
            <div class="c-privacy-notice g--margin-bottom-4">
              <span>🔒 <strong>Zero Network Ingestion:</strong> Optical character recognition executes 100% in your local browser sandbox. No file chunks or text strings ever leave your device.</span>
            </div>
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="resetToDefaults()"
              >
                Reset
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="isProcessing() || !selectedFile()"
                (click)="extractText()"
              >
                {{ isProcessing() ? 'Extracting Text...' : 'Start OCR Extraction' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Preview & Output Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <div class="l-extremo__area-izquierda">
              <h2 class="c-card__title">Extracted Text & Output</h2>
            </div>
            <div class="l-extremo__area-derecha">
              @if (previewText()) {
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="copyToClipboard()"
                >
                  {{ copySuccess() ? '✓ Copied!' : 'Copy Text' }}
                </button>
              }
            </div>
          </div>

          <div class="c-card__body">
            @if (isProcessing()) {
              <div class="c-progress g--margin-bottom-4">
                <div class="c-progress__bar" style="width: 100%"></div>
                <small class="g--text-small g--margin-top-2">Processing document with local client OCR engine...</small>
              </div>
            }

            @if (previewText()) {
              <div class="c-preview">
                <textarea
                  readonly
                  class="c-ocr-textarea"
                  [value]="previewText()"
                ></textarea>
              </div>

              <!-- Metadata badge bar -->
              <div class="c-result-meta g--margin-top-4">
                <div class="c-badge c-badge--success">
                  ✓ Recognition Completed ({{ formatBytes(extractedResult()?.fileSize || 0) }})
                </div>
                <p class="g--margin-top-2 g--text-small">
                  Pages: <strong>{{ extractedResult()?.metadata?.pageCount || 1 }}</strong> |
                  Words: <strong>{{ extractedResult()?.metadata?.wordCount || 0 }}</strong> |
                  Characters: <strong>{{ extractedResult()?.metadata?.characterCount || 0 }}</strong> |
                  Confidence: <strong>{{ extractedResult()?.metadata?.averageConfidence || 95 }}%</strong>
                </p>
              </div>
            } @else {
              <div class="c-preview__empty">
                <span>No document processed</span>
                <small>Upload an image or scanned PDF to extract text</small>
              </div>
            }
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="!extractedResult()"
                (click)="downloadDeliverable()"
              >
                Download {{ exportFormat().toUpperCase() }} Deliverable
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .c-button-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .c-checkbox-group {
      display: flex;
      flex-direction: column;
    }
    .c-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #334155;
      cursor: pointer;
    }
    .c-privacy-notice {
      padding: 0.75rem;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 4px;
      font-size: 0.85rem;
      color: #065f46;
    }
    .c-ocr-textarea {
      width: 100%;
      min-height: 380px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      padding: 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #f8fafc;
      color: #0f172a;
      resize: vertical;
    }
    .c-preview__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 380px;
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      color: #94a3b8;
    }
    .g--text-small {
      font-size: 0.85rem;
      color: #64748b;
    }
  `],
})
export class LocalOcrTextExtractorComponent implements OnDestroy {
  // Signals
  readonly ocrLanguage = signal<OcrLanguage>('eng');
  readonly pageSegmentationMode = signal<PageSegmentationMode>('auto');
  readonly cleanIrregularLinebreaks = signal<boolean>(true);
  readonly preserveTableSpacing = signal<boolean>(true);
  readonly exportFormat = signal<ExportOcrFormat>('txt');
  readonly binarizeThreshold = signal<number>(128);
  readonly enhanceContrast = signal<boolean>(true);

  readonly selectedFile = signal<{
    name: string;
    size: number;
    file: File;
    isPdf: boolean;
  } | null>(null);

  readonly isProcessing = signal<boolean>(false);
  readonly extractedResult = signal<LocalOcrTextExtractorResult | null>(null);
  readonly previewText = signal<string>('');
  readonly copySuccess = signal<boolean>(false);

  private createdBlobUrls: string[] = [];

  ngOnDestroy(): void {
    this.cleanUpUrls();
  }

  setLanguage(lang: OcrLanguage): void {
    this.ocrLanguage.set(lang);
  }

  setSegmentation(mode: PageSegmentationMode): void {
    this.pageSegmentationMode.set(mode);
  }

  setExportFormat(fmt: ExportOcrFormat): void {
    this.exportFormat.set(fmt);
  }

  setCleanLinebreaks(val: boolean): void {
    this.cleanIrregularLinebreaks.set(val);
  }

  setPreserveTables(val: boolean): void {
    this.preserveTableSpacing.set(val);
  }

  async handleFileSelected(file: File): Promise<void> {
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    const previewUrl = URL.createObjectURL(file);
    this.createdBlobUrls.push(previewUrl);

    this.selectedFile.set({
      name: file.name,
      size: file.size,
      file,
      isPdf,
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

  async extractText(): Promise<void> {
    const item = this.selectedFile();
    if (!item) return;

    this.isProcessing.set(true);

    try {
      const options: LocalOcrTextExtractorOptions = {
        ocrLanguage: this.ocrLanguage(),
        pageSegmentationMode: this.pageSegmentationMode(),
        cleanIrregularLinebreaks: this.cleanIrregularLinebreaks(),
        preserveTableSpacing: this.preserveTableSpacing(),
        exportFormat: this.exportFormat(),
        binarizeThreshold: this.binarizeThreshold(),
        enhanceContrast: this.enhanceContrast(),
      };

      const result = await processLocalOcr(item.file, options, item.name);
      this.extractedResult.set(result);
      this.previewText.set(result.extractedText);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async copyToClipboard(): Promise<void> {
    const text = this.previewText();
    if (!text) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      // Fallback
    }
  }

  downloadDeliverable(): void {
    const result = this.extractedResult();
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
    this.ocrLanguage.set('eng');
    this.pageSegmentationMode.set('auto');
    this.cleanIrregularLinebreaks.set(true);
    this.preserveTableSpacing.set(true);
    this.exportFormat.set('txt');
    this.selectedFile.set(null);
    this.extractedResult.set(null);
    this.previewText.set('');
    this.copySuccess.set(false);
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
