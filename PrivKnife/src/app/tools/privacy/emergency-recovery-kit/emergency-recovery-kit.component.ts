import { TranslatePipe } from '../../../core/i18n';
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { EmergencyRecoveryKitOptions, PaperFormat } from './types';
import {
  DEFAULT_EMERGENCY_KIT_OPTIONS,
  SAMPLE_CRYPTO_VAULT_OPTIONS,
} from './test-fixtures';
import {
  generateEmergencyKitPdf,
  generateEmergencyKitSvg,
  computeTemplateHash,
} from './engine';

@Component({
  selector: 'app-emergency-recovery-kit',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './emergency-recovery-kit.component.html',
  styleUrls: ['./emergency-recovery-kit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmergencyRecoveryKitComponent implements OnDestroy {
  readonly options = signal<EmergencyRecoveryKitOptions>(
    JSON.parse(JSON.stringify(DEFAULT_EMERGENCY_KIT_OPTIONS))
  );

  readonly activePreset = signal<'comprehensive' | 'crypto_vault'>('comprehensive');

  readonly ephemeralChecksum = signal<string>(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );

  readonly svgPreview = computed<string>(() => {
    return generateEmergencyKitSvg(this.options(), this.ephemeralChecksum());
  });

  readonly sanitizedSvg = computed<SafeHtml>(() => {
    const cleanSvg = DOMPurify.sanitize(this.svgPreview(), {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    return this.sanitizer.bypassSecurityTrustHtml(cleanSvg);
  });

  private readonly activeObjectUrls: string[] = [];

  constructor(private readonly sanitizer: DomSanitizer) {
    // Initial sync
    void this.syncChecksum();

    // Reactive effect for options synchronization
    effect(() => {
      const opts = this.options();
      void computeTemplateHash(opts).then((hash) => {
        this.ephemeralChecksum.set(hash);
      });
    });
  }

  async syncChecksum(): Promise<string> {
    const hash = await computeTemplateHash(this.options());
    this.ephemeralChecksum.set(hash);
    return hash;
  }

  loadPreset(preset: 'comprehensive' | 'crypto_vault'): void {
    this.activePreset.set(preset);
    if (preset === 'crypto_vault') {
      this.options.set(JSON.parse(JSON.stringify(SAMPLE_CRYPTO_VAULT_OPTIONS)));
    } else {
      this.options.set(JSON.parse(JSON.stringify(DEFAULT_EMERGENCY_KIT_OPTIONS)));
    }
    void this.syncChecksum();
  }

  updateKitTitle(title: string): void {
    this.options.update((o) => ({ ...o, kitTitle: title }));
    void this.syncChecksum();
  }

  updateCustodian(custodian: string): void {
    this.options.update((o) => ({ ...o, vaultCustodian: custodian }));
    void this.syncChecksum();
  }

  updateFormat(format: PaperFormat): void {
    this.options.update((o) => ({ ...o, paperFormat: format }));
    void this.syncChecksum();
  }

  updateWordCount(count: 12 | 24): void {
    this.options.update((o) => ({ ...o, seedPhraseWordCount: count }));
    void this.syncChecksum();
  }

  updateInstructions(instructions: string): void {
    this.options.update((o) => ({ ...o, additionalInstructions: instructions }));
    void this.syncChecksum();
  }

  toggleOption(key: keyof EmergencyRecoveryKitOptions): void {
    this.options.update((o) => ({ ...o, [key]: !o[key] }));
    void this.syncChecksum();
  }

  resetToDefaults(): void {
    this.loadPreset('comprehensive');
  }

  printSheet(): void {
    window.print();
  }

  async downloadPdf(): Promise<void> {
    const result = await generateEmergencyKitPdf(
      this.options(),
      this.ephemeralChecksum()
    );
    this.triggerDownload(result.blob, result.fileName);
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    this.activeObjectUrls.push(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Immediate cleanup as per Directive 4
    URL.revokeObjectURL(url);
    const idx = this.activeObjectUrls.indexOf(url);
    if (idx !== -1) {
      this.activeObjectUrls.splice(idx, 1);
    }
  }

  ngOnDestroy(): void {
    for (const url of this.activeObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeObjectUrls.length = 0;
  }
}
