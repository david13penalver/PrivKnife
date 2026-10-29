import { TranslatePipe } from '../../../core/i18n';
import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FontOutputFormat,
  FontSubsetPreset,
  FontSubsetWorkerRequest,
  FontSubsetWorkerResponse,
  FontSubsetterConverterOptions,
  FontSubsetterConverterResult,
} from './types';
import { processFontSubset } from './engine';
import { createSyntheticTrueTypeFont } from './test-fixtures';

@Component({
  selector: 'app-font-subsetter-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './font-subsetter-converter.component.html',
  styleUrls: ['./font-subsetter-converter.component.scss'],
})
export class FontSubsetterConverterComponent implements OnDestroy {
  private activeObjectUrls = new Set<string>();
  private worker: Worker | null = null;
  private requestId = 0;

  // State Signals
  readonly fontBuffer = signal<ArrayBuffer | null>(null);
  readonly selectedFileName = signal<string>('');
  readonly subsetPreset = signal<FontSubsetPreset>('basic_latin_ascii');
  readonly customCharacters = signal<string>('');
  readonly keepKerningTables = signal<boolean>(false);
  readonly dropLayoutFeatures = signal<boolean>(true);
  readonly outputFormat = signal<FontOutputFormat>('woff2');
  readonly fontFamilyName = signal<string>('CustomFont');
  readonly specimenText = signal<string>(
    'The quick brown fox jumps over the lazy dog 1234567890'
  );
  readonly specimenFontSize = signal<number>(24);
  readonly copiedCssFeedback = signal<boolean>(false);
  readonly previewFontFamily = signal<string>('inherit');

  // Result Signal
  readonly result = signal<FontSubsetterConverterResult | null>(null);

  private triggerSubset() {
    const buffer = this.fontBuffer();
    if (!buffer) {
      this.result.set(null);
      this.previewFontFamily.set('inherit');
      return;
    }

    const options: FontSubsetterConverterOptions = {
      subsetPreset: this.subsetPreset(),
      customCharacters: this.customCharacters(),
      keepKerningTables: this.keepKerningTables(),
      dropLayoutFeatures: this.dropLayoutFeatures(),
      outputFormat: this.outputFormat(),
      fontFamilyName: this.fontFamilyName() || 'CustomFont',
    };

    if (typeof Worker !== 'undefined') {
      try {
        if (!this.worker) {
          this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module',
          });
          this.worker.onmessage = (
            event: MessageEvent<FontSubsetWorkerResponse>
          ) => {
            if (event.data.id === this.requestId) {
              this.applyResult(event.data.result);
            }
          };
        }

        const id = ++this.requestId;
        this.worker.postMessage({
          id,
          buffer,
          options,
        } satisfies FontSubsetWorkerRequest);
        return;
      } catch {
        // Fall back to synchronous execution
      }
    }

    // Synchronous execution in test or non-worker environment
    const res = processFontSubset(buffer, options);
    this.applyResult(res);
  }

  private applyResult(res: FontSubsetterConverterResult) {
    this.result.set(res);
    if (!res || !res.success) {
      this.previewFontFamily.set('inherit');
      return;
    }

    const familyName = `Preview_${this.fontFamilyName() || 'Font'}_${Date.now()}`;
    if (typeof FontFace !== 'undefined' && typeof document !== 'undefined' && document.fonts) {
      try {
        res.blob.arrayBuffer().then((ab) => {
          const fontFace = new FontFace(familyName, ab);
          fontFace
            .load()
            .then((loaded) => {
              document.fonts.add(loaded);
              this.previewFontFamily.set(`"${familyName}", sans-serif`);
            })
            .catch(() => {
              this.previewFontFamily.set(`"${this.fontFamilyName() || 'CustomFont'}", sans-serif`);
            });
        });
        return;
      } catch {
        // Fallback
      }
    }
    this.previewFontFamily.set(`"${this.fontFamilyName() || 'CustomFont'}", sans-serif`);
  }

  setSubsetPreset(preset: FontSubsetPreset) {
    this.subsetPreset.set(preset);
    this.triggerSubset();
  }

  setCustomCharacters(chars: string) {
    this.customCharacters.set(chars);
    this.triggerSubset();
  }

  setOutputFormat(format: FontOutputFormat) {
    this.outputFormat.set(format);
    this.triggerSubset();
  }

  setFontFamilyName(name: string) {
    this.fontFamilyName.set(name);
    this.triggerSubset();
  }

  toggleDropLayoutFeatures() {
    this.dropLayoutFeatures.update((v) => !v);
    this.triggerSubset();
  }

  toggleKeepKerningTables() {
    this.keepKerningTables.update((v) => !v);
    this.triggerSubset();
  }

  loadSampleFont() {
    const buffer = createSyntheticTrueTypeFont();
    this.fontBuffer.set(buffer);
    this.selectedFileName.set('sample_font.ttf');
    this.fontFamilyName.set('SampleFont');
    this.triggerSubset();
  }

  async handleFileSelected(file: File) {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    this.fontBuffer.set(buffer);
    this.selectedFileName.set(file.name);

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    if (baseName) {
      this.fontFamilyName.set(baseName.replace(/[^a-zA-Z0-9_-]/g, ''));
    }
    this.triggerSubset();
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

  downloadFont() {
    const res = this.result();
    if (!res || !res.success) return;

    const url = URL.createObjectURL(res.blob);
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

  downloadCss() {
    const res = this.result();
    if (!res || !res.success) return;

    const blob = new Blob([res.cssSnippet], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    this.activeObjectUrls.add(url);

    const safeName = (this.fontFamilyName() || 'font').toLowerCase();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.css`;
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

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  reset() {
    this.fontBuffer.set(null);
    this.selectedFileName.set('');
    this.subsetPreset.set('basic_latin_ascii');
    this.customCharacters.set('');
    this.keepKerningTables.set(false);
    this.dropLayoutFeatures.set(true);
    this.outputFormat.set('woff2');
    this.fontFamilyName.set('CustomFont');
    this.copiedCssFeedback.set(false);
    this.previewFontFamily.set('inherit');

    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();

    this.triggerSubset();
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }
}
