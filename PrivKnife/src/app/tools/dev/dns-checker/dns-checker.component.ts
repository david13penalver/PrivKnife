import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Card } from '../../../components/card/card';
import {
  calculatePropagationSummary,
  exportDnsResultsAsCsv,
  exportDnsResultsAsJson,
  isValidDomain,
  queryDohProvider,
  queryWhoisRdap,
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
  WhoisResult,
} from './types';

@Component({
  selector: 'app-dns-checker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Card],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1280px; padding: 0 16px;">
      <!-- Header & Privacy Indicator -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            🛡️ Direct Browser-to-Resolver DoH &bull; Zero Server Middleware &bull; Zero Telemetry
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">
          Global DNS Propagation &amp; WHOIS Checker
        </h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 780px; color: var(--color-text-secondary); font-size: 1.1rem;">
          Verify DNS record propagation across multiple global Anycast resolvers in real time.
          Query direct DNS-over-HTTPS (DoH) and inspect RDAP domain registration records with zero intermediary servers.
        </p>
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
            <div class="l-columns l-columns--12" style="gap: 12px; align-items: end;">
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
                  [disabled]="isQuerying()">
                  @if (isQuerying()) {
                    Querying...
                  } @else {
                    🔍 Check DNS
                  }
                </button>
              </div>
            </div>

            <!-- Error message if domain is invalid -->
            @if (validationError()) {
              <div style="color: var(--color-danger, #ef4444); font-size: 0.85rem; font-weight: 600;">
                {{ validationError() }}
              </div>
            }
          </form>
        </div>
      </div>

      <!-- Navigation Tabs: DNS Table vs WHOIS -->
      <div class="l-columns__area g--margin-bottom-4">
        <div class="g--flex-center" style="gap: 12px; justify-content: space-between; flex-wrap: wrap;">
          <div class="g--flex-center" style="gap: 8px;">
            <button
              type="button"
              class="c-button"
              [class.c-button--primary]="activeTab() === 'dns'"
              [class.c-button--outline]="activeTab() !== 'dns'"
              (click)="setActiveTab('dns')">
              🌐 Global DNS Propagation ({{ results().length }} Resolvers)
            </button>
            <button
              type="button"
              class="c-button"
              [class.c-button--primary]="activeTab() === 'whois'"
              [class.c-button--outline]="activeTab() !== 'whois'"
              (click)="loadWhoisTab()">
              📋 WHOIS &amp; RDAP Details
            </button>
          </div>

          <!-- Export Actions -->
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
      @if (activeTab() === 'dns') {
        <!-- Summary Banner -->
        <div class="l-columns__area g--margin-bottom-5">
          <div class="c-card" style="padding: 16px;">
            <div class="l-columns l-columns--4" style="gap: 16px; text-align: center;">
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
                  <th style="padding: 12px 16px;">Region &amp; Location</th>
                  <th style="padding: 12px 16px;">Provider</th>
                  <th style="padding: 12px 16px;">Status</th>
                  <th style="padding: 12px 16px;">Resolved Record(s)</th>
                  <th style="padding: 12px 16px; text-align: right;">TTL</th>
                  <th style="padding: 12px 16px; text-align: right;">Latency</th>
                </tr>
              </thead>
              <tbody>
                @for (res of results(); track res.providerId) {
                  <tr style="border-bottom: 1px solid var(--color-border);">
                    <!-- Region & Location -->
                    <td style="padding: 12px 16px;">
                      <strong>{{ res.region }}</strong>
                      <div style="color: var(--color-text-secondary); font-size: 0.8rem;">{{ res.city }}</div>
                    </td>

                    <!-- Provider & IP -->
                    <td style="padding: 12px 16px;">
                      <div>{{ res.providerName }}</div>
                      <code style="font-size: 0.75rem; color: var(--color-text-secondary);">{{ res.ip }}</code>
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

      <!-- TAB 2: WHOIS & RDAP Details -->
      @if (activeTab() === 'whois') {
        <div class="l-columns__area g--margin-bottom-6">
          @if (isWhoisLoading()) {
            <div class="c-card" style="padding: 32px; text-align: center;">
              <h3>Querying RDAP Domain Registry...</h3>
              <p style="color: var(--color-text-secondary);">Direct browser lookup against rdap.org registry.</p>
            </div>
          } @else if (whoisData()) {
            <div class="l-columns l-columns--1" style="gap: 16px;">
              <app-card title="Domain Registration Overview (RDAP / WHOIS)">
                <div class="l-columns l-columns--2" style="gap: 16px;">
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.8rem;">Domain Name</span>
                    <strong style="font-size: 1.1rem; font-family: monospace;">{{ whoisData()?.domain }}</strong>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.8rem;">Registrar</span>
                    <strong>{{ whoisData()?.registrar || 'Not Specified' }}</strong>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.8rem;">Created On</span>
                    <span>{{ whoisData()?.creationDate || 'Not Available' }}</span>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.8rem;">Expires On</span>
                    <span>{{ whoisData()?.expirationDate || 'Not Available' }}</span>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.8rem;">Last Updated</span>
                    <span>{{ whoisData()?.updatedDate || 'Not Available' }}</span>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.8rem;">DNSSEC</span>
                    <span [style.color]="whoisData()?.dnssec ? '#10b981' : '#f59e0b'">
                      {{ whoisData()?.dnssec ? '✓ Active / Signed' : '○ Inactive / Unsigned' }}
                    </span>
                  </div>
                </div>

                <!-- Nameservers -->
                @if ((whoisData()?.nameServers?.length || 0) > 0) {
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.8rem; margin-bottom: 6px;">
                      Authoritative Name Servers:
                    </span>
                    <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
                      @for (ns of whoisData()?.nameServers; track ns) {
                        <code style="background: rgba(0,0,0,0.15); padding: 3px 8px; border-radius: 4px; font-size: 0.85rem;">
                          {{ ns }}
                        </code>
                      }
                    </div>
                  </div>
                }
              </app-card>

              <!-- Raw RDAP JSON Accordion -->
              @if (whoisData()?.rawJson) {
                <app-card title="Raw RDAP JSON Response">
                  <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; overflow-x: auto; max-height: 260px; font-size: 0.8rem;">{{ whoisData()?.rawJson }}</pre>
                </app-card>
              }
            </div>
          } @else {
            <div class="c-card" style="padding: 32px; text-align: center;">
              <h3>No WHOIS Data Available</h3>
              <p style="color: var(--color-text-secondary);">Click "Lookup WHOIS" to query the domain registry.</p>
              <button type="button" class="c-button c-button--primary" (click)="fetchWhois()">
                Lookup WHOIS Now
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DnsCheckerComponent implements OnInit, OnDestroy {
  readonly providers = GLOBAL_DOH_PROVIDERS;
  readonly presets = PRESET_TEST_DOMAINS;
  readonly recordTypes: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SOA'];

  readonly config = signal<DnsCheckerConfig>({ ...DEFAULT_DNS_CONFIG });
  readonly isQuerying = signal<boolean>(false);
  readonly isWhoisLoading = signal<boolean>(false);
  readonly activeTab = signal<'dns' | 'whois'>('dns');
  readonly validationError = signal<string | null>(null);

  readonly results = signal<DnsQueryResult[]>([]);
  readonly whoisData = signal<WhoisResult | null>(null);

  readonly summary = computed<PropagationSummary>(() => {
    return calculatePropagationSummary(this.results(), this.config().expectedValue);
  });

  private abortController: AbortController | null = null;

  ngOnInit(): void {
    // Initialize initial query for default domain
    this.executeDnsQueries();
  }

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

  setActiveTab(tab: 'dns' | 'whois'): void {
    this.activeTab.set(tab);
  }

  loadWhoisTab(): void {
    this.activeTab.set('whois');
    if (!this.whoisData()) {
      this.fetchWhois();
    }
  }

  loadPreset(preset: (typeof PRESET_TEST_DOMAINS)[0]): void {
    this.config.set({
      domain: preset.name,
      recordType: preset.type,
      expectedValue: preset.expected,
    });
    this.whoisData.set(null);
    this.executeDnsQueries();
  }

  resetDefaults(): void {
    this.config.set({ ...DEFAULT_DNS_CONFIG });
    this.whoisData.set(null);
    this.executeDnsQueries();
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.executeDnsQueries();
  }

  async executeDnsQueries(): Promise<void> {
    const rawDomain = this.config().domain;
    const cleanDomain = sanitizeDomain(rawDomain);

    if (!cleanDomain || !isValidDomain(cleanDomain)) {
      this.validationError.set('Please enter a valid domain name (e.g., example.com)');
      return;
    }

    this.validationError.set(null);
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

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const recordType = this.config().recordType;
    const expected = this.config().expectedValue;

    try {
      const queryPromises = this.providers.map(async (provider) => {
        const res = await queryDohProvider(
          provider,
          cleanDomain,
          recordType,
          expected
        );
        // Progressively update results
        this.results.update((current) =>
          current.map((item) => (item.providerId === provider.id ? res : item))
        );
        return res;
      });

      await Promise.allSettled(queryPromises);
    } finally {
      this.isQuerying.set(false);
    }
  }

  async fetchWhois(): Promise<void> {
    const cleanDomain = sanitizeDomain(this.config().domain);
    if (!cleanDomain || !isValidDomain(cleanDomain)) {
      this.validationError.set('Please enter a valid domain name for WHOIS lookup');
      return;
    }

    this.isWhoisLoading.set(true);
    try {
      const data = await queryWhoisRdap(cleanDomain);
      this.whoisData.set(data);
    } finally {
      this.isWhoisLoading.set(false);
    }
  }

  // --- Exports ---

  exportCsv(): void {
    const blob = exportDnsResultsAsCsv(
      this.results(),
      this.config().domain,
      this.config().recordType
    );
    this.triggerDownload(blob, `dns_propagation_${this.config().domain}_${this.config().recordType}.csv`);
  }

  exportJson(): void {
    const blob = exportDnsResultsAsJson(
      this.results(),
      this.whoisData(),
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
