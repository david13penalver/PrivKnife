import { Component, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  CodeExportFormat,
  SvgOptimizerCleanerOptions,
  SvgOptimizerCleanerResult,
} from './types';
import { optimizeSvg, sanitizeSvgMarkup } from './engine';
import { SAMPLE_BLOATED_SVG } from './test-fixtures';

@Component({
  selector: 'app-svg-optimizer-cleaner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './svg-optimizer-cleaner.component.html',
  styleUrls: ['./svg-optimizer-cleaner.component.scss'],
})
export class SvgOptimizerCleanerComponent implements OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private activeObjectUrls = new Set<string>();

  // State Signals
  readonly inputSvg = signal<string>('');
  readonly floatPrecision = signal<number>(2);
  readonly stripMetadataComments = signal<boolean>(true);
  readonly cleanupIds = signal<boolean>(true);
  readonly collapseUselessGroups = signal<boolean>(true);
  readonly convertColorsToHex = signal<boolean>(true);
  readonly removeDimensionsForViewBox = signal<boolean>(true);
  readonly codeExportFormat = signal<CodeExportFormat>('svg');
  readonly componentName = signal<string>('CustomSvgIcon');
  readonly copiedFeedback = signal<boolean>(false);
  readonly activeTab = signal<'preview' | 'code'>('preview');

  // Computed Optimization
  readonly result = computed<SvgOptimizerCleanerResult | null>(() => {
    const raw = this.inputSvg().trim();
    if (!raw) return null;

    const options: SvgOptimizerCleanerOptions = {
      floatPrecision: this.floatPrecision(),
      stripMetadataComments: this.stripMetadataComments(),
      cleanupIds: this.cleanupIds(),
      collapseUselessGroups: this.collapseUselessGroups(),
      convertColorsToHex: this.convertColorsToHex(),
      removeDimensionsForViewBox: this.removeDimensionsForViewBox(),
      codeExportFormat: this.codeExportFormat(),
      componentName: this.componentName() || 'CustomSvgIcon',
    };

    return optimizeSvg(raw, options);
  });

  // Safe HTML views
  readonly safeOriginalSvg = computed<SafeHtml>(() => {
    return this.sanitizer.bypassSecurityTrustHtml(sanitizeSvgMarkup(this.inputSvg()));
  });

  readonly safeOptimizedSvg = computed<SafeHtml>(() => {
    const res = this.result();
    return this.sanitizer.bypassSecurityTrustHtml(sanitizeSvgMarkup(res?.optimizedSvg || ''));
  });

  setInputSvg(svg: string) {
    this.inputSvg.set(svg);
  }

  setFloatPrecision(precision: number) {
    this.floatPrecision.set(Math.max(0, Math.min(5, precision)));
  }

  setCodeExportFormat(format: CodeExportFormat) {
    this.codeExportFormat.set(format);
  }

  setComponentName(name: string) {
    this.componentName.set(name);
  }

  setActiveTab(tab: 'preview' | 'code') {
    this.activeTab.set(tab);
  }

  toggleStripMetadata() {
    this.stripMetadataComments.update((v) => !v);
  }

  toggleCleanupIds() {
    this.cleanupIds.update((v) => !v);
  }

  toggleCollapseGroups() {
    this.collapseUselessGroups.update((v) => !v);
  }

  toggleConvertColors() {
    this.convertColorsToHex.update((v) => !v);
  }

  toggleRemoveDimensions() {
    this.removeDimensionsForViewBox.update((v) => !v);
  }

  loadSampleSvg() {
    this.setInputSvg(SAMPLE_BLOATED_SVG);
  }

  async handleFileSelected(file: File) {
    if (!file) return;
    const text = await file.text();
    this.setInputSvg(text);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    if (baseName) {
      this.setComponentName(baseName.replace(/[^a-zA-Z0-9_]/g, ''));
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

  downloadResult() {
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

  async copyCode() {
    const res = this.result();
    if (!res || !res.success) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(res.code);
        this.copiedFeedback.set(true);
        setTimeout(() => this.copiedFeedback.set(false), 2000);
      }
    } catch {
      // Fallback or ignore
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
    this.inputSvg.set('');
    this.floatPrecision.set(2);
    this.stripMetadataComments.set(true);
    this.cleanupIds.set(true);
    this.collapseUselessGroups.set(true);
    this.convertColorsToHex.set(true);
    this.removeDimensionsForViewBox.set(true);
    this.codeExportFormat.set('svg');
    this.componentName.set('CustomSvgIcon');
    this.copiedFeedback.set(false);
    this.activeTab.set('preview');

    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }

  ngOnDestroy() {
    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();
  }
}
