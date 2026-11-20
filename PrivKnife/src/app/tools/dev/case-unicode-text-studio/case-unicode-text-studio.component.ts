import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge, Button, Card } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  applyZalgo,
  computeTextStats,
  deduplicateLines,
  filterKaomojis,
  generateZalgoSeed,
  removeEmptyLines,
  reverseText,
  sortLines,
  stripZalgo,
  transformAllCases,
  transformAllUnicodeStyles,
  trimLines,
} from './engine';
import { ACRONYM_VECTOR } from './test-fixtures';
import {
  CaseFormatId,
  DEFAULT_CASE_OPTIONS,
  DEFAULT_ZALGO_OPTIONS,
  KAOMOJI_CATEGORIES,
  KaomojiCategory,
  KaomojiEntry,
  StudioTab,
  TextStats,
  UnicodeStyleId,
} from './types';

export type QuickUtilAction =
  | 'trim'
  | 'dedup'
  | 'sort_asc'
  | 'sort_desc'
  | 'remove_empty'
  | 'reverse';

@Component({
  selector: 'app-case-unicode-text-studio',
  standalone: true,
  imports: [FormsModule, Badge, Button, Card, TranslatePipe],
  templateUrl: './case-unicode-text-studio.component.html',
  styleUrl: './case-unicode-text-studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseUnicodeTextStudioComponent implements OnDestroy {
  readonly kaomojiCategories = KAOMOJI_CATEGORIES;

  readonly activeTab = signal<StudioTab>('case');
  readonly inputText = signal<string>(ACRONYM_VECTOR);

  // Case options
  readonly batchLineByLine = signal<boolean>(DEFAULT_CASE_OPTIONS.batchLineByLine);
  readonly stripDiacriticsForSlug = signal<boolean>(
    DEFAULT_CASE_OPTIONS.stripDiacriticsForSlug,
  );

  // Zalgo options
  readonly zalgoIntensity = signal<number>(DEFAULT_ZALGO_OPTIONS.intensity);
  readonly zalgoUp = signal<boolean>(DEFAULT_ZALGO_OPTIONS.includeUp);
  readonly zalgoMid = signal<boolean>(DEFAULT_ZALGO_OPTIONS.includeMid);
  readonly zalgoDown = signal<boolean>(DEFAULT_ZALGO_OPTIONS.includeDown);
  readonly zalgoSeed = signal<number>(42);

  // Kaomoji filters
  readonly kaomojiQuery = signal<string>('');
  readonly kaomojiCategory = signal<KaomojiCategory | 'all'>('all');

  // Copy feedback
  readonly copiedKey = signal<string | null>(null);

  private readonly createdObjectUrls: string[] = [];
  private readonly pendingRevokeTimers = new Set<ReturnType<typeof setTimeout>>();
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly stats = computed<TextStats>(() => computeTextStats(this.inputText()));

  readonly readingTimeMinutes = computed<number>(() => {
    const words = this.stats().words;
    return words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));
  });

  readonly caseOutputs = computed<{ id: CaseFormatId; label: string; value: string }[]>(
    () =>
      transformAllCases(this.inputText(), {
        batchLineByLine: this.batchLineByLine(),
        stripDiacriticsForSlug: this.stripDiacriticsForSlug(),
      }),
  );

  readonly unicodeOutputs = computed<
    { id: UnicodeStyleId; label: string; value: string }[]
  >(() => transformAllUnicodeStyles(this.inputText()));

  readonly zalgoOutput = computed<string>(() =>
    applyZalgo(this.inputText(), {
      intensity: this.zalgoIntensity(),
      includeUp: this.zalgoUp(),
      includeMid: this.zalgoMid(),
      includeDown: this.zalgoDown(),
      seed: this.zalgoSeed(),
    }),
  );

  readonly filteredKaomojis = computed<readonly KaomojiEntry[]>(() =>
    filterKaomojis(this.kaomojiQuery(), this.kaomojiCategory()),
  );

  setZalgoIntensity(raw: unknown): void {
    const clamped = Math.min(15, Math.max(1, Math.round(Number(raw) || 1)));
    this.zalgoIntensity.set(clamped);
  }

  rerollZalgo(): void {
    this.zalgoSeed.set(generateZalgoSeed());
  }

  cleanZalgoInput(): void {
    this.inputText.set(stripZalgo(this.zalgoOutput()));
  }

  stripDirectInputZalgo(): void {
    this.inputText.set(stripZalgo(this.inputText()));
  }

  applyQuickUtil(action: QuickUtilAction): void {
    const raw = this.inputText();
    switch (action) {
      case 'trim':
        this.inputText.set(trimLines(raw));
        break;
      case 'dedup':
        this.inputText.set(deduplicateLines(raw));
        break;
      case 'sort_asc':
        this.inputText.set(sortLines(raw, 'asc'));
        break;
      case 'sort_desc':
        this.inputText.set(sortLines(raw, 'desc'));
        break;
      case 'remove_empty':
        this.inputText.set(removeEmptyLines(raw));
        break;
      case 'reverse':
        this.inputText.set(reverseText(raw));
        break;
    }
  }

  async copyValue(value: string, key: string): Promise<void> {
    if (!value) return;
    try {
      await globalThis.navigator?.clipboard?.writeText?.(value);
      this.copiedKey.set(key);
      if (this.copyTimer !== null) {
        clearTimeout(this.copyTimer);
      }
      this.copyTimer = setTimeout(() => {
        this.copiedKey.set(null);
        this.copyTimer = null;
      }, 1600);
    } catch {
      this.copiedKey.set(null);
    }
  }

  exportTxt(content: string, filename = 'privknife-text-transform.txt'): void {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    this.triggerBlobDownload(blob, filename);
  }

  reset(): void {
    this.inputText.set('');
    this.batchLineByLine.set(DEFAULT_CASE_OPTIONS.batchLineByLine);
    this.stripDiacriticsForSlug.set(DEFAULT_CASE_OPTIONS.stripDiacriticsForSlug);
    this.zalgoIntensity.set(DEFAULT_ZALGO_OPTIONS.intensity);
    this.zalgoUp.set(true);
    this.zalgoMid.set(true);
    this.zalgoDown.set(true);
    this.zalgoSeed.set(42);
    this.kaomojiQuery.set('');
    this.kaomojiCategory.set('all');
    this.copiedKey.set(null);
    this.clearCopyTimer();
    this.revokeAllObjectUrls();
  }

  ngOnDestroy(): void {
    this.clearCopyTimer();
    this.revokeAllObjectUrls();
  }

  private clearCopyTimer(): void {
    if (this.copyTimer !== null) {
      clearTimeout(this.copyTimer);
      this.copyTimer = null;
    }
  }

  private triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.push(url);

    if (typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
    }

    const timerId = setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = this.createdObjectUrls.indexOf(url);
      if (idx !== -1) {
        this.createdObjectUrls.splice(idx, 1);
      }
      this.pendingRevokeTimers.delete(timerId);
    }, 150);
    this.pendingRevokeTimers.add(timerId);
  }

  private revokeAllObjectUrls(): void {
    for (const timerId of this.pendingRevokeTimers) {
      clearTimeout(timerId);
    }
    this.pendingRevokeTimers.clear();

    while (this.createdObjectUrls.length > 0) {
      const url = this.createdObjectUrls.pop();
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }
}
