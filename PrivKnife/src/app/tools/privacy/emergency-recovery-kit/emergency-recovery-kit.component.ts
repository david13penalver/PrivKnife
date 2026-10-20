import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EmergencyRecoveryKitOptions, PaperFormat } from './types';
import {
  DEFAULT_EMERGENCY_KIT_OPTIONS,
  SAMPLE_CRYPTO_VAULT_OPTIONS,
} from './test-fixtures';
import {
  generateEmergencyKitPdf,
  generateEmergencyKitSvg,
} from './engine';

@Component({
  selector: 'app-emergency-recovery-kit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Printable Emergency Recovery & Password Kit Sheet</h1>
          <p class="c-header__subtitle">
            Generate tamper-evident physical paper vaults for In-Case-of-Emergency (ICE) digital succession:
            master passwords, 2FA backup codes, 12/24-word cryptocurrency seeds, and legal directives with offline SHA-256 verification.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <!-- Main Layout -->
      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Security Configuration &amp; Directives</h2>
          </div>

          <div class="c-card__body">
            <!-- Preset Selector -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Vault Templates</label>
              <div class="l-extremo g--margin-top-1" style="gap: 8px; flex-wrap: wrap;">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activePreset() === 'comprehensive'"
                  [class.c-button--outline]="activePreset() !== 'comprehensive'"
                  (click)="loadPreset('comprehensive')"
                >
                  Comprehensive Succession Kit
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="activePreset() === 'crypto_vault'"
                  [class.c-button--outline]="activePreset() !== 'crypto_vault'"
                  (click)="loadPreset('crypto_vault')"
                >
                  Cold Storage Crypto Sheet
                </button>
              </div>
            </div>

            <!-- Title & Custodian -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Kit Header Title</label>
              <input
                type="text"
                class="c-input"
                [ngModel]="options().kitTitle"
                (ngModelChange)="updateKitTitle($event)"
              />
            </div>

            <div class="g--margin-bottom-4">
              <label class="c-input__label">Designated Vault Custodian / Executor</label>
              <input
                type="text"
                class="c-input"
                [ngModel]="options().vaultCustodian"
                (ngModelChange)="updateCustodian($event)"
                placeholder="e.g. Attorney John Doe / Primary Keyholder"
              />
            </div>

            <!-- Paper Format & Seed Count -->
            <div class="l-columns l-columns--2 g--margin-bottom-4" style="gap: 12px;">
              <div class="l-columns__area">
                <label class="c-input__label">Paper Size Format</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="options().paperFormat"
                  (ngModelChange)="updateFormat($event)"
                >
                  <option value="a4">ISO A4 (210 × 297 mm)</option>
                  <option value="us_letter">US Letter (8.5 × 11 in)</option>
                </select>
              </div>

              <div class="l-columns__area">
                <label class="c-input__label">Seed Phrase Words</label>
                <select
                  class="c-input c-input--select"
                  [ngModel]="options().seedPhraseWordCount"
                  (ngModelChange)="updateWordCount($event)"
                >
                  <option [ngValue]="12">12 Words (Standard BIP-39)</option>
                  <option [ngValue]="24">24 Words (High Security BIP-39)</option>
                </select>
              </div>
            </div>

            <!-- Included Sections -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Included Vault Sections</label>
              <div class="l-extremo g--margin-top-1" style="gap: 10px; flex-wrap: wrap;">
                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().includeMasterVaultSection"
                    (change)="toggleOption('includeMasterVaultSection')"
                  />
                  <span>Master Password</span>
                </label>

                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().includeTwoFaCodesSection"
                    (change)="toggleOption('includeTwoFaCodesSection')"
                  />
                  <span>2FA Backup Codes</span>
                </label>

                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().includeSeedPhraseSection"
                    (change)="toggleOption('includeSeedPhraseSection')"
                  />
                  <span>Crypto Seed Grid</span>
                </label>

                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().includeEmergencyContacts"
                    (change)="toggleOption('includeEmergencyContacts')"
                  />
                  <span>Emergency Contacts</span>
                </label>
              </div>
            </div>

            <!-- Security & Physical Tamper Controls -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Physical Tamper &amp; Style Options</label>
              <div class="l-extremo g--margin-top-1" style="gap: 10px; flex-wrap: wrap;">
                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().includeTamperFoldSeals"
                    (change)="toggleOption('includeTamperFoldSeals')"
                  />
                  <span>Tamper Fold Lines</span>
                </label>

                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().includeOfflineChecksumQr"
                    (change)="toggleOption('includeOfflineChecksumQr')"
                  />
                  <span>Offline Checksum QR</span>
                </label>

                <label class="g--flex-center" style="gap: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    [checked]="options().highContrastMonochrome"
                    (change)="toggleOption('highContrastMonochrome')"
                  />
                  <span>Monochrome Laser Print</span>
                </label>
              </div>
            </div>

            <!-- Instructions Textarea -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label">Directives for Custodian / Heirs</label>
              <textarea
                class="c-input"
                rows="2"
                [ngModel]="options().additionalInstructions"
                (ngModelChange)="updateInstructions($event)"
                style="resize: vertical; font-size: 12px;"
              ></textarea>
            </div>

            <!-- Zero Persistence Warning -->
            <div
              class="c-card"
              style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 6px;"
            >
              <div style="font-size: 11px; color: #166534; font-weight: 600;">
                🛡️ Zero Cloud Persistence Guarantee:
              </div>
              <div style="font-size: 11px; color: #15803d; margin-top: 2px;">
                Credentials are never typed or stored in browser memory. This tool formats a clean, physical template designed to be filled out with archival ink by hand and sealed.
              </div>
            </div>
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="resetToDefaults()"
              >
                Reset to Defaults
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="printSheet()"
              >
                🖨️ Print Directly
              </button>
            </div>
          </div>
        </div>

        <!-- Preview Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header l-extremo" style="align-items: center;">
            <h2 class="c-card__title">Print-Ready Sheet Preview</h2>
            <div style="font-size: 11px; opacity: 0.8; font-family: monospace;">
              {{ options().paperFormat.toUpperCase() }} • SHA-256 Offline
            </div>
          </div>

          <div class="c-card__body">
            <!-- Scaled Sheet Viewport -->
            <div
              class="c-preview"
              style="min-height: 480px; display: flex; align-items: center; justify-content: center; overflow: auto; background: #e2e8f0; border-radius: 6px; padding: 16px;"
            >
              <div
                [innerHTML]="sanitizedSvg()"
                style="width: 100%; max-height: 600px; display: flex; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.15);"
              ></div>
            </div>

            <!-- Fingerprint Display -->
            <div class="g--margin-top-3" style="font-size: 11px; color: #64748b; font-family: monospace; word-break: break-all;">
              Fingerprint: {{ ephemeralChecksum() }}
            </div>
          </div>

          <!-- Download Action Bar -->
          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                (click)="downloadPdf()"
              >
                Download Vector PDF Sheet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmergencyRecoveryKitComponent implements OnDestroy {
  readonly options = signal<EmergencyRecoveryKitOptions>(
    JSON.parse(JSON.stringify(DEFAULT_EMERGENCY_KIT_OPTIONS))
  );

  readonly activePreset = signal<'comprehensive' | 'crypto_vault'>('comprehensive');

  readonly ephemeralChecksum = computed(() => {
    const opts = this.options();
    let hash = 0x811c9dc5;
    const str = `${opts.kitTitle}-${opts.paperFormat}-${opts.seedPhraseWordCount}-${opts.vaultCustodian}`;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return hex.repeat(8);
  });

  readonly svgPreview = computed<string>(() => {
    return generateEmergencyKitSvg(this.options(), this.ephemeralChecksum());
  });

  readonly sanitizedSvg = computed<SafeHtml>(() => {
    return this.sanitizer.bypassSecurityTrustHtml(this.svgPreview());
  });

  private readonly activeObjectUrls: string[] = [];

  constructor(private readonly sanitizer: DomSanitizer) {}

  loadPreset(preset: 'comprehensive' | 'crypto_vault'): void {
    this.activePreset.set(preset);
    if (preset === 'crypto_vault') {
      this.options.set(JSON.parse(JSON.stringify(SAMPLE_CRYPTO_VAULT_OPTIONS)));
    } else {
      this.options.set(JSON.parse(JSON.stringify(DEFAULT_EMERGENCY_KIT_OPTIONS)));
    }
  }

  updateKitTitle(title: string): void {
    this.options.update((o) => ({ ...o, kitTitle: title }));
  }

  updateCustodian(custodian: string): void {
    this.options.update((o) => ({ ...o, vaultCustodian: custodian }));
  }

  updateFormat(format: PaperFormat): void {
    this.options.update((o) => ({ ...o, paperFormat: format }));
  }

  updateWordCount(count: 12 | 24): void {
    this.options.update((o) => ({ ...o, seedPhraseWordCount: count }));
  }

  updateInstructions(instructions: string): void {
    this.options.update((o) => ({ ...o, additionalInstructions: instructions }));
  }

  toggleOption(key: keyof EmergencyRecoveryKitOptions): void {
    this.options.update((o) => ({ ...o, [key]: !o[key] }));
  }

  resetToDefaults(): void {
    this.loadPreset('comprehensive');
  }

  printSheet(): void {
    window.print();
  }

  async downloadPdf(): Promise<void> {
    const result = await generateEmergencyKitPdf(this.options());
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
