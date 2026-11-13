import { TranslatePipe } from '../../../core/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import {
  calculatePropagationSummary,
  exportDnsResultsAsCsv,
  exportDnsResultsAsJson,
  isValidDomain,
  queryDohProvider,
  sanitizeDomain,
} from './engine';
import {
  DEFAULT_DNS_CONFIG,
  GLOBAL_DOH_PROVIDERS,
  PRESET_TEST_DOMAINS,
} from './test-fixtures';
import {
  DnsCheckerConfig,
  DnsQueryResult,
  DnsRecordType,
  PropagationSummary,
} from './types';

@Component({
  selector: 'app-dns-checker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, TranslatePipe],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1280px; padding: 0 16px;">
      <!-- Header & Privacy Indicator -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">{{ 'tools.dnsChecker.name' | translate }}</h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 780px; color: var(--color-text-secondary); font-size: 1.1rem;">
          {{ 'tools.dnsChecker.description' | translate }}
        </p>
      </div>

      <div class="l-columns__area g--margin-bottom-5">
        <section class="c-card" style="padding: 20px;" role="note" aria-labelledby="dns-query-disclosure-title">
          <h2 id="dns-query-disclosure-title">{{ 'tools.dnsChecker.externalRequestTitle' | translate }}</h2>
          <p>{{ 'tools.dnsChecker.externalRequestDisclosure' | translate }}</p>
          <label class="g--flex-center" style="justify-content: flex-start; gap: 10px; align-items: flex-start;">
            <input
              type="checkbox"
              [checked]="externalQueryConsent()"
              [disabled]="isQuerying()"
              (change)="externalQueryConsent.set($any($event.target).checked)" />
            <span>{{ 'tools.dnsChecker.externalRequestConsent' | translate }}</span>
          </label>
        </section>
      </div>

      <!-- Presets Ribbon -->
      <div class="l-columns__area g--margin-bottom-5">
        <div class="c-card" style="padding: 12px 16px;">
          <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary);">Test Presets:</span>
              @for (preset of presets; track preset.name + preset.type) {
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  (click)="loadPreset(preset)">
                  {{ preset.name }} ({{ preset.type }})
                </button>
              }
            </div>
            <button
              type="button"
              class="c-button c-button--small c-button--ghost"
              (click)="resetDefaults()">
              ↺ Reset Defaults
            </button>
          </div>
        </div>
      </div>

      <!-- Search & Controls Section -->
      <div class="l-columns__area g--margin-bottom-5">
        <div class="c-card" style="padding: 20px;">
          <form (submit)="onSubmit($event)" class="l-columns l-columns--1" style="gap: 16px;">
            <div class="l-columns l-columns--12 dns-form-grid" style="gap: 12px; align-items: end;">
              <!-- Domain Name Input (6 cols) -->
              <div class="l-columns__area l-columns__area--span-6">
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                  Domain or Hostname:
                </label>
                <input
                  type="text"
                  class="c-input"
                  style="width: 100%; font-family: monospace;"
                  [ngModel]="config().domain"
                  (ngModelChange)="updateDomain($event)"
                  name="domain"
                  placeholder="e.g. example.com or mail.google.com" />
              </div>

              <!-- Record Type Dropdown (2 cols) -->
              <div class="l-columns__area l-columns__area--span-2">
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                  Record Type:
                </label>
                <select
                  class="c-input"
                  style="width: 100%; font-weight: 600;"
                  [ngModel]="config().recordType"
                  (ngModelChange)="updateRecordType($event)"
                  name="recordType">
                  @for (type of recordTypes; track type) {
                    <option [value]="type">{{ type }}</option>
                  }
                </select>
              </div>

              <!-- Expected Value (Optional) (2 cols) -->
              <div class="l-columns__area l-columns__area--span-2">
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                  Expected Value (Optional):
                </label>
                <input
                  type="text"
                  class="c-input"
                  style="width: 100%; font-family: monospace;"
                  [ngModel]="config().expectedValue"
                  (ngModelChange)="updateExpectedValue($event)"
                  name="expectedValue"
                  placeholder="e.g. 93.184.215.14" />
              </div>

              <!-- Action Buttons (2 cols) -->
              <div class="l-columns__area l-columns__area--span-2">
                <button
                  type="submit"
                  class="c-button c-button--primary"
                  style="width: 100%; font-weight: 700;"
                  [disabled]="isQuerying() || !externalQueryConsent()">
                  @if (isQuerying()) {
                    Querying...
                  } @else {
                    🔍 {{ 'tools.dnsChecker.runQuery' | translate }}
                  }
                </button>
              </div>
            </div>

            <!-- Error message if domain is invalid -->
            @if (validationError()) {
              <div style="color: var(--color-danger, #ef4444); font-size: 0.85rem; font-weight: 600;">
                {{ (validationError() ?? '') | translate }}
              </div>
            }
          </form>
        </div>
      </div>

      <!-- Export Actions -->
      <div class="l-columns__area g--margin-bottom-4">
        <div class="g--flex-center" style="gap: 12px; justify-content: space-between; flex-wrap: wrap;">
          <div class="g--flex-center" style="gap: 8px;">
            <button
              type="button"
              class="c-button c-button--small c-button--outline"
              [disabled]="results().length === 0"
              (click)="exportCsv()">
              Export CSV
            </button>
            <button
              type="button"
              class="c-button c-button--small c-button--outline"
              [disabled]="results().length === 0"
              (click)="exportJson()">
              Export JSON Audit
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 1: Global DNS Propagation Table -->
      @if (results().length > 0) {
        <!-- Summary Banner -->
        <div class="l-columns__area g--margin-bottom-5">
          <div class="c-card" style="padding: 16px;">
            <div class="l-columns l-columns--4 dns-metrics-grid" style="gap: 16px; text-align: center;">
              <div>
                <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Global Propagation</span>
                <strong style="font-size: 1.25rem; color: #10b981;">
                  {{ summary().propagationPercent }}%
                </strong>
              </div>
              <div>
                <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Matching Nodes</span>
                <strong style="font-size: 1.25rem;">
                  {{ summary().matchingNodes }} / {{ summary().totalNodes }}
                </strong>
              </div>
              <div>
                <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Resolved Nodes</span>
                <strong style="font-size: 1.25rem;">
                  {{ summary().resolvedNodes }} / {{ summary().totalNodes }}
                </strong>
              </div>
              <div>
                <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Avg Resolver Latency</span>
                <strong style="font-size: 1.25rem;">
                  {{ summary().averageLatencyMs }} ms
                </strong>
              </div>
            </div>

            <!-- Progress Bar -->
            <div style="margin-top: 14px; background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden;">
              <div
                style="height: 100%; background: linear-gradient(90deg, #38bdf8 0%, #10b981 100%); transition: width 0.3s ease;"
                [style.width.%]="summary().propagationPercent">
              </div>
            </div>
          </div>
        </div>

        <!-- Multi-Location DNS Records Table -->
        <div class="l-columns__area g--margin-bottom-6">
          <div class="c-card" style="overflow-x: auto; padding: 0;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
              <thead>
                <tr style="background: rgba(0,0,0,0.15); border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;">
                  <th style="padding: 12px 16px;">Resolver &amp; Host</th>
                  <th style="padding: 12px 16px;">Status</th>
                  <th style="padding: 12px 16px;">Resolved Record(s)</th>
                  <th style="padding: 12px 16px; text-align: right;">TTL</th>
                  <th style="padding: 12px 16px; text-align: right;">Latency</th>
                </tr>
              </thead>
              <tbody>
                @for (res of results(); track res.providerId) {
                  <tr style="border-bottom: 1px solid var(--color-border);">
                    <!-- Resolver and its actual request host; resolver networks are not geographic probes. -->
                    <td style="padding: 12px 16px;">
                      <div>{{ res.providerName }}</div>
                      <code style="font-size: 0.75rem; color: var(--color-text-secondary);">{{ res.city }}</code>
                    </td>

                    <!-- Status Badge -->
                    <td style="padding: 12px 16px;">
                      @if (res.status === 'pending') {
                        <span class="c-badge" style="background: #e2e8f0; color: #475569;">⏳ Querying...</span>
                      } @else if (res.matchesExpected) {
                        <span class="c-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 600;">✓ MATCH</span>
                      } @else if (res.status === 'success') {
                        <span class="c-badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; font-weight: 600;">● RESOLVED</span>
                      } @else {
                        <span class="c-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; font-weight: 600;">✕ ERROR</span>
                      }
                    </td>

                    <!-- Resolved Record Data -->
                    <td style="padding: 12px 16px;">
                      @if (res.records.length > 0) {
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          @for (rec of res.records; track rec) {
                            <div class="g--flex-center" style="gap: 8px;">
                              <code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; word-break: break-all;">
                                {{ rec }}
                              </code>
                            </div>
                          }
                        </div>
                      } @else {
                        <span style="color: var(--color-text-secondary); font-style: italic; font-size: 0.85rem;">
                          {{ res.errorMessage || 'No records returned' }}
                        </span>
                      }
                    </td>

                    <!-- TTL -->
                    <td style="padding: 12px 16px; text-align: right; font-family: monospace; font-size: 0.85rem;">
                      {{ res.ttl !== undefined ? res.ttl + 's' : '—' }}
                    </td>

                    <!-- Latency -->
                    <td style="padding: 12px 16px; text-align: right; font-family: monospace; font-size: 0.85rem;">
                      {{ res.latencyMs }} ms
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

    </div>
  `,
  styles: [
    `
      @media (max-width: 900px) {
        .dns-form-grid {
          grid-template-columns: 1fr !important;
        }

        .dns-form-grid > .l-columns__area {
          grid-column: span 1 !important;
        }

        .dns-metrics-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }

      }

      @media (max-width: 500px) {
        .dns-metrics-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `,
  ],
})
export class DnsCheckerComponent implements OnDestroy {
  readonly providers = GLOBAL_DOH_PROVIDERS;
  readonly presets = PRESET_TEST_DOMAINS;
  readonly recordTypes: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SOA'];

  readonly config = signal<DnsCheckerConfig>({ ...DEFAULT_DNS_CONFIG });
  readonly isQuerying = signal<boolean>(false);
  readonly externalQueryConsent = signal<boolean>(false);
  readonly validationError = signal<string | null>(null);

  readonly results = signal<DnsQueryResult[]>([]);

  readonly summary = computed<PropagationSummary>(() => {
    return calculatePropagationSummary(this.results(), this.config().expectedValue);
  });

  private abortController: AbortController | null = null;

  ngOnDestroy(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  // --- Handlers ---

  updateDomain(domain: string): void {
    this.config.update((c) => ({ ...c, domain }));
    this.validationError.set(null);
  }

  updateRecordType(type: DnsRecordType): void {
    this.config.update((c) => ({ ...c, recordType: type }));
  }

  updateExpectedValue(val: string): void {
    this.config.update((c) => ({ ...c, expectedValue: val }));
  }

  loadPreset(preset: (typeof PRESET_TEST_DOMAINS)[0]): void {
    this.config.set({
      domain: preset.name,
      recordType: preset.type,
      expectedValue: preset.expected,
    });
    this.results.set([]);
    this.validationError.set(null);
  }

  resetDefaults(): void {
    this.config.set({ ...DEFAULT_DNS_CONFIG });
    this.results.set([]);
    this.validationError.set(null);
    this.externalQueryConsent.set(false);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.executeDnsQueries();
  }

  async executeDnsQueries(): Promise<void> {
    if (!this.externalQueryConsent()) {
      this.validationError.set('tools.dnsChecker.consentRequired');
      return;
    }

    const rawDomain = this.config().domain;
    const cleanDomain = sanitizeDomain(rawDomain);

    if (!cleanDomain || !isValidDomain(cleanDomain)) {
      this.validationError.set('Please enter a valid domain name (e.g., example.com)');
      return;
    }

    this.validationError.set(null);
    this.abortController?.abort();
    const requestController = new AbortController();
    this.abortController = requestController;
    this.isQuerying.set(true);

    // Initialize pending rows
    const pendingResults: DnsQueryResult[] = this.providers.map((p) => ({
      providerId: p.id,
      providerName: p.name,
      region: p.region,
      city: p.city,
      ip: p.ip,
      status: 'pending',
      latencyMs: 0,
      records: [],
      matchesExpected: false,
    }));
    this.results.set(pendingResults);

    const recordType = this.config().recordType;
    const expected = this.config().expectedValue;

    try {
      const queryPromises = this.providers.map(async (provider) => {
        const res = await queryDohProvider(
          provider,
          cleanDomain,
          recordType,
          expected,
          window.fetch.bind(window),
          6000,
          requestController.signal
        );
        // Progressively update results
        if (this.abortController === requestController && !requestController.signal.aborted) {
          this.results.update((current) =>
            current.map((item) => (item.providerId === provider.id ? res : item))
          );
        }
        return res;
      });

      await Promise.allSettled(queryPromises);
    } finally {
      if (this.abortController === requestController) {
        this.isQuerying.set(false);
      }
    }
  }

  // --- Exports ---

  exportCsv(): void {
    const blob = exportDnsResultsAsCsv(
      this.results(),
      this.config().domain,
      this.config().recordType
    );
      this.triggerDownload(blob, `dns_resolver_comparison_${this.config().domain}_${this.config().recordType}.csv`);
  }

  exportJson(): void {
    const blob = exportDnsResultsAsJson(
      this.results(),
      this.config()
    );
    this.triggerDownload(blob, `dns_audit_${this.config().domain}_${this.config().recordType}.json`);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
