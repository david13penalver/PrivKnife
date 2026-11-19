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
  auditPasswordStrength,
  buildEntropyReport,
  exportCredentialsCsv,
  exportCredentialsEnv,
  exportCredentialsTxt,
  generateCredentials,
  tokenizePasswordForDisplay,
} from './engine';
import {
  BATCH_COUNT_PRESETS,
  CharToken,
  DEFAULT_PASSWORD_OPTIONS,
  DevSecretPreset,
  EntropyGrade,
  EntropyReport,
  GeneratorMode,
  PasswordGeneratorOptions,
  WordCaseMode,
} from './types';

@Component({
  selector: 'app-password-passphrase-generator',
  standalone: true,
  imports: [FormsModule, Badge, Button, Card, TranslatePipe],
  templateUrl: './password-passphrase-generator.component.html',
  styleUrl: './password-passphrase-generator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onGlobalKeydown($event)',
  },
})
export class PasswordPassphraseGeneratorComponent implements OnDestroy {
  readonly batchPresets = BATCH_COUNT_PRESETS;

  readonly mode = signal<GeneratorMode>(DEFAULT_PASSWORD_OPTIONS.mode);
  readonly batchCount = signal<number>(DEFAULT_PASSWORD_OPTIONS.batchCount);

  // Password mode controls
  readonly length = signal<number>(DEFAULT_PASSWORD_OPTIONS.length);
  readonly includeUppercase = signal<boolean>(DEFAULT_PASSWORD_OPTIONS.includeUppercase);
  readonly includeLowercase = signal<boolean>(DEFAULT_PASSWORD_OPTIONS.includeLowercase);
  readonly includeNumbers = signal<boolean>(DEFAULT_PASSWORD_OPTIONS.includeNumbers);
  readonly includeSymbols = signal<boolean>(DEFAULT_PASSWORD_OPTIONS.includeSymbols);
  readonly customSymbols = signal<string>(DEFAULT_PASSWORD_OPTIONS.customSymbols);
  readonly excludeAmbiguous = signal<boolean>(DEFAULT_PASSWORD_OPTIONS.excludeAmbiguous);
  readonly requireEachClass = signal<boolean>(DEFAULT_PASSWORD_OPTIONS.requireEachClass);

  // Passphrase mode controls
  readonly wordCount = signal<number>(DEFAULT_PASSWORD_OPTIONS.wordCount);
  readonly separator = signal<string>(DEFAULT_PASSWORD_OPTIONS.separator);
  readonly wordCase = signal<WordCaseMode>(DEFAULT_PASSWORD_OPTIONS.wordCase);
  readonly appendNumber = signal<boolean>(DEFAULT_PASSWORD_OPTIONS.appendNumber);
  readonly appendSymbol = signal<boolean>(Boolean(DEFAULT_PASSWORD_OPTIONS.appendSymbol));

  // Dev secret mode controls
  readonly devPreset = signal<DevSecretPreset>(DEFAULT_PASSWORD_OPTIONS.devPreset);
  readonly apiKeyPrefix = signal<string>(DEFAULT_PASSWORD_OPTIONS.apiKeyPrefix);
  readonly envVariableName = signal<string>(DEFAULT_PASSWORD_OPTIONS.envVariableName);

  // Auditor mode controls
  readonly auditorInput = signal<string>('');
  readonly showAuditorSecret = signal<boolean>(false);

  // Generated state
  readonly items = signal<string[]>([]);
  readonly entropy = signal<EntropyReport>(buildEntropyReport(0));
  readonly errorMessage = signal<string | null>(null);
  readonly copiedIndex = signal<number | null>(null);
  readonly copyAllFeedback = signal<boolean>(false);

  private readonly createdObjectUrls: string[] = [];
  private readonly pendingRevokeTimers = new Set<ReturnType<typeof setTimeout>>();
  private copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  readonly primaryCredential = computed<string>(() => this.items()[0] ?? '');

  readonly primaryTokens = computed<CharToken[]>(() => {
    const val = this.primaryCredential();
    return val ? tokenizePasswordForDisplay(val) : [];
  });

  readonly auditorReport = computed<EntropyReport>(() =>
    auditPasswordStrength(this.auditorInput()),
  );

  readonly activeReport = computed<EntropyReport>(() =>
    this.mode() === 'auditor' ? this.auditorReport() : this.entropy(),
  );

  readonly strengthPercent = computed<number>(() => {
    const bits = this.activeReport().bits;
    if (bits <= 0) return 0;
    return Math.min(100, Math.max(4, Math.round((bits / 128) * 100)));
  });

  readonly isCleared = computed<boolean>(
    () => this.mode() !== 'auditor' && this.items().length === 0 && !this.errorMessage(),
  );

  constructor() {
    this.regenerate();
  }

  onGlobalKeydown(event: KeyboardEvent): void {
    if (event.code !== 'Space' || this.mode() === 'auditor') {
      return;
    }
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName ?? '';
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      tag === 'BUTTON' ||
      tag === 'A' ||
      target?.isContentEditable
    ) {
      return;
    }
    event.preventDefault();
    this.regenerate();
  }

  selectMode(nextMode: GeneratorMode): void {
    this.mode.set(nextMode);
    this.copiedIndex.set(null);
    this.copyAllFeedback.set(false);
    if (nextMode !== 'auditor') {
      this.regenerate();
    }
  }

  setBatchCount(count: number): void {
    const clamped = Math.min(100, Math.max(1, Math.round(Number(count) || 1)));
    this.batchCount.set(clamped);
    this.regenerate();
  }

  setLength(raw: unknown): void {
    const num = Math.min(128, Math.max(8, Math.round(Number(raw) || 20)));
    this.length.set(num);
    this.regenerate();
  }

  setWordCount(raw: unknown): void {
    const num = Math.min(12, Math.max(3, Math.round(Number(raw) || 6)));
    this.wordCount.set(num);
    this.regenerate();
  }

  setWordCase(raw: unknown): void {
    const val = String(raw);
    if (val === 'lower' || val === 'title' || val === 'upper' || val === 'random_upper') {
      this.wordCase.set(val);
      this.regenerate();
    }
  }

  setDevPreset(raw: unknown): void {
    const val = String(raw);
    if (
      val === 'hex_256' ||
      val === 'base64url_256' ||
      val === 'api_key_prefixed' ||
      val === 'wpa2_63' ||
      val === 'recovery_codes'
    ) {
      this.devPreset.set(val);
      this.regenerate();
    }
  }

  toggleAndRegenerate(
    target:
      | 'includeUppercase'
      | 'includeLowercase'
      | 'includeNumbers'
      | 'includeSymbols'
      | 'excludeAmbiguous'
      | 'requireEachClass'
      | 'appendNumber'
      | 'appendSymbol',
    nextVal: boolean,
  ): void {
    this[target].set(Boolean(nextVal));
    this.regenerate();
  }

  regenerate(): void {
    const options: PasswordGeneratorOptions = {
      mode: this.mode(),
      batchCount: this.batchCount(),
      length: this.length(),
      includeUppercase: this.includeUppercase(),
      includeLowercase: this.includeLowercase(),
      includeNumbers: this.includeNumbers(),
      includeSymbols: this.includeSymbols(),
      customSymbols: this.customSymbols(),
      excludeAmbiguous: this.excludeAmbiguous(),
      requireEachClass: this.requireEachClass(),
      wordCount: this.wordCount(),
      separator: this.separator(),
      wordCase: this.wordCase(),
      appendNumber: this.appendNumber(),
      appendSymbol: this.appendSymbol(),
      devPreset: this.devPreset(),
      apiKeyPrefix: this.apiKeyPrefix(),
      envVariableName: this.envVariableName(),
    };

    const res = generateCredentials(options);
    if (!res.success) {
      this.items.set([]);
      this.entropy.set(res.entropy);
      this.errorMessage.set(res.error ?? 'Invalid configuration.');
      return;
    }

    this.errorMessage.set(null);
    this.items.set(res.items);
    this.entropy.set(res.entropy);
    this.copiedIndex.set(null);
    this.copyAllFeedback.set(false);
  }

  gradeTranslationKey(grade: EntropyGrade): string {
    switch (grade) {
      case 'very_weak':
        return 'tools.passwordPassphraseGenerator.gradeVeryWeak';
      case 'weak':
        return 'tools.passwordPassphraseGenerator.gradeWeak';
      case 'fair':
        return 'tools.passwordPassphraseGenerator.gradeFair';
      case 'strong':
        return 'tools.passwordPassphraseGenerator.gradeStrong';
      case 'excellent':
        return 'tools.passwordPassphraseGenerator.gradeExcellent';
    }
  }

  warningTranslationKey(code: string): string {
    switch (code) {
      case 'empty_password':
        return 'tools.passwordPassphraseGenerator.warnEmpty';
      case 'common_password':
        return 'tools.passwordPassphraseGenerator.warnCommon';
      case 'keyboard_or_sequence':
        return 'tools.passwordPassphraseGenerator.warnKeyboard';
      case 'repeated_chars':
        return 'tools.passwordPassphraseGenerator.warnRepeated';
      case 'date_or_year_pattern':
        return 'tools.passwordPassphraseGenerator.warnYear';
      default:
        return 'tools.passwordPassphraseGenerator.warnShort';
    }
  }

  async copyItem(value: string, index: number): Promise<void> {
    if (!value) return;
    try {
      await globalThis.navigator?.clipboard?.writeText?.(value);
      this.copiedIndex.set(index);
      this.copyAllFeedback.set(false);
      this.scheduleCopyReset();
    } catch {
      this.copiedIndex.set(null);
    }
  }

  async copyAll(): Promise<void> {
    const list = this.items();
    if (list.length === 0) return;
    try {
      await globalThis.navigator?.clipboard?.writeText?.(list.join('\n'));
      this.copiedIndex.set(null);
      this.copyAllFeedback.set(true);
      this.scheduleCopyReset();
    } catch {
      this.copyAllFeedback.set(false);
    }
  }

  exportFile(format: 'txt' | 'csv' | 'env'): void {
    const list = this.items();
    if (list.length === 0) return;

    let content = '';
    let mime = 'text/plain;charset=utf-8';
    let filename = 'privknife-credentials.txt';

    if (format === 'txt') {
      content = exportCredentialsTxt(list);
    } else if (format === 'csv') {
      content = exportCredentialsCsv(list);
      mime = 'text/csv;charset=utf-8';
      filename = 'privknife-credentials.csv';
    } else {
      content = exportCredentialsEnv(list, this.envVariableName());
      filename = 'privknife-secrets.env';
    }

    this.triggerBlobDownload(new Blob([content], { type: mime }), filename);
  }

  clearSecrets(): void {
    this.items.set([]);
    this.auditorInput.set('');
    this.errorMessage.set(null);
    this.copiedIndex.set(null);
    this.copyAllFeedback.set(false);
    this.clearCopyTimer();
    this.revokeAllObjectUrls();
  }

  ngOnDestroy(): void {
    this.items.set([]);
    this.auditorInput.set('');
    this.clearCopyTimer();
    this.revokeAllObjectUrls();
  }

  private scheduleCopyReset(): void {
    this.clearCopyTimer();
    this.copyFeedbackTimer = setTimeout(() => {
      this.copiedIndex.set(null);
      this.copyAllFeedback.set(false);
      this.copyFeedbackTimer = null;
    }, 1800);
  }

  private clearCopyTimer(): void {
    if (this.copyFeedbackTimer !== null) {
      clearTimeout(this.copyFeedbackTimer);
      this.copyFeedbackTimer = null;
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
