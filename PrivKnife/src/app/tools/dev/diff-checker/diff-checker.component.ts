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
  DiffCheckerOptions,
  DiffCheckerResult,
  DiffGranularity,
  DiffViewMode,
  DiffWorkerRequest,
  DiffWorkerResponse,
  SyntaxLanguage,
} from './types';
import { computeDiff } from './engine';
import {
  DEFAULT_DIFF_OPTIONS,
  SAMPLE_CODE_ORIGINAL,
  SAMPLE_CODE_MODIFIED,
  SAMPLE_CONTRACT_ORIGINAL,
  SAMPLE_CONTRACT_MODIFIED,
} from './test-fixtures';

@Component({
  selector: 'app-diff-checker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diff-checker.component.html',
  styleUrls: ['./diff-checker.component.scss'],
})
export class DiffCheckerComponent implements OnDestroy {
  @ViewChild('origTextarea') origTextareaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('modTextarea') modTextareaRef?: ElementRef<HTMLTextAreaElement>;

  private activeObjectUrls = new Set<string>();
  private worker: Worker | null = null;
  private requestId = 0;
  private isSyncingScroll = false;

  // State Signals
  readonly originalText = signal<string>('');
  readonly modifiedText = signal<string>('');
  readonly viewMode = signal<DiffViewMode>('side_by_side');
  readonly diffGranularity = signal<DiffGranularity>('word');
  readonly ignoreWhitespace = signal<boolean>(false);
  readonly ignoreCase = signal<boolean>(false);
  readonly syntaxLanguage = signal<SyntaxLanguage>('javascript');
  readonly syncScroll = signal<boolean>(true);
  readonly copiedFeedback = signal<boolean>(false);

  // Result Signal
  readonly result = signal<DiffCheckerResult>(
    computeDiff('', '', DEFAULT_DIFF_OPTIONS)
  );

  private triggerDiff() {
    const orig = this.originalText();
    const mod = this.modifiedText();
    const options: DiffCheckerOptions = {
      viewMode: this.viewMode(),
      diffGranularity: this.diffGranularity(),
      ignoreWhitespace: this.ignoreWhitespace(),
      ignoreCase: this.ignoreCase(),
      syntaxLanguage: this.syntaxLanguage(),
      syncScroll: this.syncScroll(),
    };

    if (typeof Worker !== 'undefined') {
      try {
        if (!this.worker) {
          this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module',
          });
          this.worker.onmessage = (
            event: MessageEvent<DiffWorkerResponse>
          ) => {
            if (event.data.requestId === this.requestId) {
              this.result.set(event.data.result);
            }
          };
        }

        const id = ++this.requestId;
        this.worker.postMessage({
          requestId: id,
          originalText: orig,
          modifiedText: mod,
          options,
        } satisfies DiffWorkerRequest);
        return;
      } catch {
        // Fall back to synchronous execution
      }
    }

    // Synchronous execution in test or worker-unsupported environment
    this.result.set(computeDiff(orig, mod, options));
  }

  setOriginalText(text: string) {
    this.originalText.set(text);
    this.triggerDiff();
  }

  setModifiedText(text: string) {
    this.modifiedText.set(text);
    this.triggerDiff();
  }

  setViewMode(mode: DiffViewMode) {
    this.viewMode.set(mode);
    this.triggerDiff();
  }

  setGranularity(granularity: DiffGranularity) {
    this.diffGranularity.set(granularity);
    this.triggerDiff();
  }

  setSyntaxLanguage(lang: SyntaxLanguage) {
    this.syntaxLanguage.set(lang);
    this.triggerDiff();
  }

  toggleIgnoreWhitespace() {
    this.ignoreWhitespace.update((v) => !v);
    this.triggerDiff();
  }

  toggleIgnoreCase() {
    this.ignoreCase.update((v) => !v);
    this.triggerDiff();
  }

  toggleSyncScroll() {
    this.syncScroll.update((v) => !v);
    this.triggerDiff();
  }

  onScrollOriginal(event: Event) {
    if (!this.syncScroll() || this.isSyncingScroll) return;
    const orig = event.target as HTMLTextAreaElement;
    const mod = this.modTextareaRef?.nativeElement;
    if (mod) {
      this.isSyncingScroll = true;
      try {
        const scrollRatio = orig.scrollTop / (orig.scrollHeight - orig.clientHeight || 1);
        mod.scrollTop = scrollRatio * (mod.scrollHeight - mod.clientHeight);
      } finally {
        this.isSyncingScroll = false;
      }
    }
  }

  onScrollModified(event: Event) {
    if (!this.syncScroll() || this.isSyncingScroll) return;
    const mod = event.target as HTMLTextAreaElement;
    const orig = this.origTextareaRef?.nativeElement;
    if (orig) {
      this.isSyncingScroll = true;
      try {
        const scrollRatio = mod.scrollTop / (mod.scrollHeight - mod.clientHeight || 1);
        orig.scrollTop = scrollRatio * (orig.scrollHeight - orig.clientHeight);
      } finally {
        this.isSyncingScroll = false;
      }
    }
  }

  loadSampleCode() {
    this.originalText.set(SAMPLE_CODE_ORIGINAL);
    this.modifiedText.set(SAMPLE_CODE_MODIFIED);
    this.syntaxLanguage.set('javascript');
    this.triggerDiff();
  }

  loadSampleContract() {
    this.originalText.set(SAMPLE_CONTRACT_ORIGINAL);
    this.modifiedText.set(SAMPLE_CONTRACT_MODIFIED);
    this.syntaxLanguage.set('plaintext');
    this.triggerDiff();
  }

  async handleOriginalFile(file: File) {
    if (!file) return;
    const text = await file.text();
    this.originalText.set(text);
    this.triggerDiff();
  }

  async handleModifiedFile(file: File) {
    if (!file) return;
    const text = await file.text();
    this.modifiedText.set(text);
    this.triggerDiff();
  }

  onOriginalFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleOriginalFile(input.files[0]);
    }
  }

  onModifiedFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleModifiedFile(input.files[0]);
    }
  }

  downloadExport(format: 'patch' | 'html' = 'patch') {
    const res = this.result();
    let content = res.patch;
    let fileName = 'diff_report.patch';
    let mimeType = 'text/x-diff';

    if (format === 'html') {
      content = res.htmlReport;
      fileName = 'diff_report.html';
      mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    this.activeObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    this.activeObjectUrls.delete(url);
  }

  async copyPatch() {
    const patch = this.result().patch;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(patch);
        this.copiedFeedback.set(true);
        setTimeout(() => this.copiedFeedback.set(false), 2000);
      }
    } catch {
      // Ignore clipboard error
    }
  }

  reset() {
    this.originalText.set('');
    this.modifiedText.set('');
    this.viewMode.set('side_by_side');
    this.diffGranularity.set('word');
    this.ignoreWhitespace.set(false);
    this.ignoreCase.set(false);
    this.syntaxLanguage.set('javascript');
    this.syncScroll.set(true);
    this.copiedFeedback.set(false);

    this.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.activeObjectUrls.clear();

    this.triggerDiff();
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
