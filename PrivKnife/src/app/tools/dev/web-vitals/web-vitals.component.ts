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
  exportAuditReportAsJson,
  exportAuditReportAsMarkdown,
  isValidUrl,
  normalizeUrl,
  runPageSpeedAudit,
} from './engine';
import {
  PRESET_AUDIT_SAMPLES,
  SAMPLE_FAST_SITE_REPORT,
} from './test-fixtures';
import {
  AuditStrategy,
  DiagnosticTip,
  PresetAuditSample,
  VitalsAuditReport,
} from './types';

@Component({
  selector: 'app-web-vitals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Card],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1280px; padding: 0 16px;">
      <!-- Header & Privacy Indicator -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            🛡️ Direct Client-Side Audit &bull; Zero Server Middleware &bull; Zero Telemetry
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">
          Website Performance &amp; Core Web Vitals Checker
        </h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 780px; color: var(--color-text-secondary); font-size: 1.1rem;">
          Audit page loading speed, inspect official Google Core Web Vitals (LCP, INP, CLS, FCP, TTFB),
          and receive actionable developer diagnostics directly from your browser.
        </p>
      </div>

      <!-- Presets Ribbon -->
      <div class="l-columns__area g--margin-bottom-5">
        <div class="c-card" style="padding: 12px 16px;">
          <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary);">Sample Audits:</span>
              @for (preset of presets; track preset.id) {
                <button
                  type="button"
                  class="c-button c-button--small c-button--outline"
                  (click)="loadPreset(preset)">
                  {{ preset.name }}
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

      <!-- URL Input & Audit Control Bar -->
      <div class="l-columns__area g--margin-bottom-5">
        <div class="c-card" style="padding: 20px;">
          <form (submit)="onSubmit($event)" class="l-columns l-columns--1" style="gap: 16px;">
            <div class="l-columns l-columns--12 vitals-form-grid" style="gap: 12px; align-items: end;">
              <!-- Website URL (7 cols) -->
              <div class="l-columns__area l-columns__area--span-7">
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                  Website URL to Audit:
                </label>
                <input
                  type="text"
                  class="c-input"
                  style="width: 100%; font-family: monospace;"
                  [ngModel]="targetUrl()"
                  (ngModelChange)="updateUrl($event)"
                  name="targetUrl"
                  placeholder="https://example.com" />
              </div>

              <!-- Strategy Selector (3 cols) -->
              <div class="l-columns__area l-columns__area--span-3">
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                  Device Strategy:
                </label>
                <div class="g--flex-center" style="gap: 6px;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="strategy() === 'mobile'"
                    [class.c-button--outline]="strategy() !== 'mobile'"
                    style="flex: 1;"
                    (click)="setStrategy('mobile')">
                    📱 Mobile
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="strategy() === 'desktop'"
                    [class.c-button--outline]="strategy() !== 'desktop'"
                    style="flex: 1;"
                    (click)="setStrategy('desktop')">
                    💻 Desktop
                  </button>
                </div>
              </div>

              <!-- Submit Button (2 cols) -->
              <div class="l-columns__area l-columns__area--span-2">
                <button
                  type="submit"
                  class="c-button c-button--primary"
                  style="width: 100%; font-weight: 700;"
                  [disabled]="isLoading()">
                  @if (isLoading()) {
                    Auditing...
                  } @else {
                    ⚡ Run Audit
                  }
                </button>
              </div>
            </div>

            <!-- Optional Custom Google API Key -->
            <div style="font-size: 0.85rem;">
              <details>
                <summary style="cursor: pointer; color: var(--color-text-secondary); font-weight: 600;">
                  Optional: Provide Custom Google PageSpeed API Key (for high-frequency testing)
                </summary>
                <div style="margin-top: 8px;">
                  <input
                    type="password"
                    class="c-input"
                    style="width: 100%; max-width: 480px; font-family: monospace;"
                    [ngModel]="apiKey()"
                    (ngModelChange)="updateApiKey($event)"
                    name="apiKey"
                    placeholder="AIzaSy... (leave blank to use free public quota)" />
                </div>
              </details>
            </div>

            <!-- Validation Error -->
            @if (validationError()) {
              <div style="color: var(--color-danger, #ef4444); font-size: 0.85rem; font-weight: 600;">
                {{ validationError() }}
              </div>
            }
          </form>
        </div>
      </div>

      <!-- Audit Report Presentation -->
      @if (report(); as rep) {
        <!-- Report Top Header & Export Ribbon -->
        <div class="l-columns__area g--margin-bottom-4">
          <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
              <span style="font-size: 0.85rem; color: var(--color-text-secondary);">Audited Target:</span>
              <strong style="margin-left: 6px; font-family: monospace;">{{ rep.url }}</strong>
              <span class="c-badge" style="margin-left: 8px; text-transform: uppercase;">{{ rep.strategy }}</span>
            </div>

            <div class="g--flex-center" style="gap: 8px;">
              <button
                type="button"
                class="c-button c-button--small c-button--outline"
                (click)="exportJson()">
                Export JSON
              </button>
              <button
                type="button"
                class="c-button c-button--small c-button--outline"
                (click)="exportMarkdown()">
                Export Markdown
              </button>
            </div>
          </div>
        </div>

        <!-- Category Score Gauges -->
        <div class="l-columns__area g--margin-bottom-5">
          <div class="l-columns l-columns--4 vitals-gauges-grid" style="gap: 16px;">
            @for (cat of rep.categories; track cat.id) {
              <div class="c-card" style="padding: 20px; text-align: center;">
                <span style="color: var(--color-text-secondary); display: block; font-size: 0.85rem; font-weight: 600;">
                  {{ cat.title }}
                </span>
                <div style="font-size: 2.5rem; font-weight: 800; line-height: 1.1; margin: 8px 0;" [style.color]="getRatingColor(cat.rating)">
                  {{ cat.score }}
                </div>
                <span
                  class="c-badge"
                  [style.background]="getRatingBg(cat.rating)"
                  [style.color]="getRatingColor(cat.rating)"
                  style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">
                  {{ cat.rating }}
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Core Web Vitals Deep-Dive Grid -->
        <div class="l-columns__area g--margin-bottom-5">
          <app-card title="Core Web Vitals Assessment (Field / Lab Diagnostics)">
            <div class="l-columns l-columns--3" style="gap: 16px;">
              <!-- LCP -->
              <div style="background: var(--color-bg-secondary); border-radius: 8px; padding: 16px; border: 1px solid var(--color-border);">
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 1rem;">LCP</strong>
                  <span
                    class="c-badge"
                    [style.background]="getRatingBg(rep.vitals.lcp.rating)"
                    [style.color]="getRatingColor(rep.vitals.lcp.rating)"
                    style="font-size: 0.75rem; font-weight: 700;">
                    {{ rep.vitals.lcp.rating.toUpperCase() }}
                  </span>
                </div>
                <div style="font-size: 1.6rem; font-weight: 800;" [style.color]="getRatingColor(rep.vitals.lcp.rating)">
                  {{ rep.vitals.lcp.formattedValue }}
                </div>
                <p style="color: var(--color-text-secondary); font-size: 0.8rem; margin-top: 6px;">
                  {{ rep.vitals.lcp.name }} &bull; Target &le; 2.5s
                </p>
              </div>

              <!-- INP / TBT -->
              <div style="background: var(--color-bg-secondary); border-radius: 8px; padding: 16px; border: 1px solid var(--color-border);">
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 1rem;">INP / TBT</strong>
                  <span
                    class="c-badge"
                    [style.background]="getRatingBg(rep.vitals.inp.rating)"
                    [style.color]="getRatingColor(rep.vitals.inp.rating)"
                    style="font-size: 0.75rem; font-weight: 700;">
                    {{ rep.vitals.inp.rating.toUpperCase() }}
                  </span>
                </div>
                <div style="font-size: 1.6rem; font-weight: 800;" [style.color]="getRatingColor(rep.vitals.inp.rating)">
                  {{ rep.vitals.inp.formattedValue }}
                </div>
                <p style="color: var(--color-text-secondary); font-size: 0.8rem; margin-top: 6px;">
                  {{ rep.vitals.inp.name }} &bull; Target &le; 200ms
                </p>
              </div>

              <!-- CLS -->
              <div style="background: var(--color-bg-secondary); border-radius: 8px; padding: 16px; border: 1px solid var(--color-border);">
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 1rem;">CLS</strong>
                  <span
                    class="c-badge"
                    [style.background]="getRatingBg(rep.vitals.cls.rating)"
                    [style.color]="getRatingColor(rep.vitals.cls.rating)"
                    style="font-size: 0.75rem; font-weight: 700;">
                    {{ rep.vitals.cls.rating.toUpperCase() }}
                  </span>
                </div>
                <div style="font-size: 1.6rem; font-weight: 800;" [style.color]="getRatingColor(rep.vitals.cls.rating)">
                  {{ rep.vitals.cls.formattedValue }}
                </div>
                <p style="color: var(--color-text-secondary); font-size: 0.8rem; margin-top: 6px;">
                  {{ rep.vitals.cls.name }} &bull; Target &le; 0.1
                </p>
              </div>

              <!-- FCP -->
              <div style="background: var(--color-bg-secondary); border-radius: 8px; padding: 16px; border: 1px solid var(--color-border);">
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 1rem;">FCP</strong>
                  <span
                    class="c-badge"
                    [style.background]="getRatingBg(rep.vitals.fcp.rating)"
                    [style.color]="getRatingColor(rep.vitals.fcp.rating)"
                    style="font-size: 0.75rem; font-weight: 700;">
                    {{ rep.vitals.fcp.rating.toUpperCase() }}
                  </span>
                </div>
                <div style="font-size: 1.6rem; font-weight: 800;" [style.color]="getRatingColor(rep.vitals.fcp.rating)">
                  {{ rep.vitals.fcp.formattedValue }}
                </div>
                <p style="color: var(--color-text-secondary); font-size: 0.8rem; margin-top: 6px;">
                  {{ rep.vitals.fcp.name }} &bull; Target &le; 1.8s
                </p>
              </div>

              <!-- TTFB -->
              <div style="background: var(--color-bg-secondary); border-radius: 8px; padding: 16px; border: 1px solid var(--color-border);">
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 1rem;">TTFB</strong>
                  <span
                    class="c-badge"
                    [style.background]="getRatingBg(rep.vitals.ttfb.rating)"
                    [style.color]="getRatingColor(rep.vitals.ttfb.rating)"
                    style="font-size: 0.75rem; font-weight: 700;">
                    {{ rep.vitals.ttfb.rating.toUpperCase() }}
                  </span>
                </div>
                <div style="font-size: 1.6rem; font-weight: 800;" [style.color]="getRatingColor(rep.vitals.ttfb.rating)">
                  {{ rep.vitals.ttfb.formattedValue }}
                </div>
                <p style="color: var(--color-text-secondary); font-size: 0.8rem; margin-top: 6px;">
                  {{ rep.vitals.ttfb.name }} &bull; Target &le; 800ms
                </p>
              </div>

              <!-- Speed Index -->
              <div style="background: var(--color-bg-secondary); border-radius: 8px; padding: 16px; border: 1px solid var(--color-border);">
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 1rem;">Speed Index</strong>
                  <span
                    class="c-badge"
                    [style.background]="getRatingBg(rep.vitals.speedIndex.rating)"
                    [style.color]="getRatingColor(rep.vitals.speedIndex.rating)"
                    style="font-size: 0.75rem; font-weight: 700;">
                    {{ rep.vitals.speedIndex.rating.toUpperCase() }}
                  </span>
                </div>
                <div style="font-size: 1.6rem; font-weight: 800;" [style.color]="getRatingColor(rep.vitals.speedIndex.rating)">
                  {{ rep.vitals.speedIndex.formattedValue }}
                </div>
                <p style="color: var(--color-text-secondary); font-size: 0.8rem; margin-top: 6px;">
                  {{ rep.vitals.speedIndex.name }} &bull; Target &le; 3.4s
                </p>
              </div>
            </div>
          </app-card>
        </div>

        <!-- Prioritized Diagnostic Tips -->
        <div class="l-columns__area g--margin-bottom-6">
          <app-card title="Prioritized Performance Optimization Tips">
            <div class="l-columns l-columns--1" style="gap: 12px;">
              @for (tip of rep.diagnostics; track tip.id) {
                <div
                  style="padding: 14px 18px; border-radius: 8px; background: var(--color-bg-secondary); border-left: 4px solid;"
                  [style.border-left-color]="getPriorityColor(tip.priority)">
                  <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 4px;">
                    <strong style="font-size: 0.95rem;">{{ tip.title }}</strong>
                    <div class="g--flex-center" style="gap: 8px;">
                      @if (tip.estimatedSavingsMs) {
                        <span class="c-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 0.75rem;">
                          Save ~{{ tip.estimatedSavingsMs }}ms
                        </span>
                      }
                      <span
                        class="c-badge"
                        [style.color]="getPriorityColor(tip.priority)"
                        style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">
                        {{ tip.priority }} IMPACT
                      </span>
                    </div>
                  </div>
                  <p style="color: var(--color-text-secondary); font-size: 0.85rem; line-height: 1.4;">
                    {{ tip.description }}
                  </p>
                </div>
              }
            </div>
          </app-card>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @media (max-width: 900px) {
        .vitals-form-grid {
          grid-template-columns: 1fr !important;
        }

        .vitals-form-grid > .l-columns__area {
          grid-column: span 1 !important;
        }

        .vitals-gauges-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }

      @media (max-width: 500px) {
        .vitals-gauges-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `,
  ],
})
export class WebVitalsComponent implements OnInit, OnDestroy {
  readonly presets = PRESET_AUDIT_SAMPLES;

  readonly targetUrl = signal<string>('https://privknife.org');
  readonly strategy = signal<AuditStrategy>('mobile');
  readonly apiKey = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly validationError = signal<string | null>(null);

  readonly report = signal<VitalsAuditReport | null>(SAMPLE_FAST_SITE_REPORT);

  private abortController: AbortController | null = null;

  ngOnInit(): void {
    // Initial report is loaded from default fast sample
  }

  ngOnDestroy(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  // --- Handlers ---

  updateUrl(url: string): void {
    this.targetUrl.set(url);
    this.validationError.set(null);
  }

  setStrategy(strat: AuditStrategy): void {
    this.strategy.set(strat);
  }

  updateApiKey(key: string): void {
    this.apiKey.set(key);
  }

  loadPreset(preset: PresetAuditSample): void {
    this.targetUrl.set(preset.url);
    this.strategy.set(preset.strategy);
    this.report.set(preset.mockReport);
    this.validationError.set(null);
  }

  resetDefaults(): void {
    this.targetUrl.set('https://privknife.org');
    this.strategy.set('mobile');
    this.apiKey.set('');
    this.report.set(SAMPLE_FAST_SITE_REPORT);
    this.validationError.set(null);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.runAudit();
  }

  async runAudit(): Promise<void> {
    const rawUrl = this.targetUrl();
    if (!isValidUrl(rawUrl)) {
      this.validationError.set('Please enter a valid website URL (e.g., https://example.com)');
      return;
    }

    this.validationError.set(null);
    this.isLoading.set(true);

    try {
      const res = await runPageSpeedAudit(
        rawUrl,
        this.strategy(),
        this.apiKey()
      );
      this.report.set(res);
    } catch (err: any) {
      this.validationError.set(err?.message || 'Failed to complete speed audit');
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- UI Color Helpers ---

  getRatingColor(rating: string): string {
    switch (rating) {
      case 'good':
        return '#10b981';
      case 'needs-improvement':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      default:
        return 'var(--color-text)';
    }
  }

  getRatingBg(rating: string): string {
    switch (rating) {
      case 'good':
        return 'rgba(16, 185, 129, 0.15)';
      case 'needs-improvement':
        return 'rgba(245, 158, 11, 0.15)';
      case 'poor':
        return 'rgba(239, 68, 68, 0.15)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#38bdf8';
      default:
        return 'var(--color-border)';
    }
  }

  // --- Exports ---

  exportJson(): void {
    const r = this.report();
    if (!r) return;
    const blob = exportAuditReportAsJson(r);
    this.triggerDownload(blob, `web_vitals_audit_${new URL(r.url).hostname}.json`);
  }

  exportMarkdown(): void {
    const r = this.report();
    if (!r) return;
    const blob = exportAuditReportAsMarkdown(r);
    this.triggerDownload(blob, `web_vitals_audit_${new URL(r.url).hostname}.md`);
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
