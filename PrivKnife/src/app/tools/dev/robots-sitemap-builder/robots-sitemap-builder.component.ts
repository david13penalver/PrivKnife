import { TranslatePipe } from '../../../core/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import {
  exportRobotsBlob,
  exportSitemapBlob,
  generateRobotsTxt,
  generateSitemapXml,
  parseBulkUrls,
  validateSitemapXml,
} from './engine';
import {
  BLOCK_AI_ROBOTS_CONFIG,
  DEFAULT_ROBOTS_CONFIG,
  DEFAULT_SITEMAP_ENTRIES,
  STAGING_ROBOTS_CONFIG,
  WORDPRESS_ROBOTS_CONFIG,
} from './test-fixtures';
import {
  ChangeFrequency,
  RobotsConfig,
  RobotsPresetKey,
  RobotsUserAgentRule,
  SitemapUrlEntry,
} from './types';

@Component({
  selector: 'app-robots-sitemap-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, FormsModule, TranslatePipe],
  template: `
    <div
      class="l-columns l-columns--1 g--margin-x-auto"
      style="max-width: 1300px; padding: 0 16px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.025em;">{{ 'tools.robotsSitemap.name' | translate }}</h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 820px; margin: 0 auto; line-height: 1.6;">
          {{ 'tools.robotsSitemap.description' | translate }}
        </p>
      </div>

      <!-- Top Leaderboard Ad Slot (728x90) -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center print-hidden">
        <div
          class="ad-slot ad-slot--leaderboard"
          style="max-width: 728px; height: 90px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
          <span>SPONSOR ADVERTISEMENT (728&times;90 LEADERBOARD)</span>
        </div>
      </div>

      <!-- Mode Switcher Nav -->
      <div class="l-columns__area g--margin-bottom-4 g--flex-center">
        <div class="mode-switcher-container">
          <button
            type="button"
            class="mode-switch-btn"
            [class.mode-switch-btn--active]="activeMode() === 'robots'"
            (click)="activeMode.set('robots')">
            🤖 Robots.txt Generator
          </button>
          <button
            type="button"
            class="mode-switch-btn"
            [class.mode-switch-btn--active]="activeMode() === 'sitemap'"
            (click)="activeMode.set('sitemap')">
            🗺️ XML Sitemap Builder
          </button>
        </div>
      </div>

      <!-- Studio Grid -->
      <div class="l-columns__area">
        <div class="builder-studio-grid">
          <!-- Left Column: Form Controls -->
          <div class="builder-form-col">
            <!-- MODE 1: ROBOTS.TXT BUILDER -->
            @if (activeMode() === 'robots') {
              <!-- Presets Card -->
              <app-card class="g--margin-bottom-4">
                <div card-header class="c-card__header-flex">
                  <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Robots.txt Presets</h3>
                </div>
                <div class="preset-buttons-row g--margin-top-3">
                  <button type="button" class="c-button--chip" (click)="applyRobotsPreset('default')">
                    Standard SEO
                  </button>
                  <button type="button" class="c-button--chip" (click)="applyRobotsPreset('block-ai')">
                    🛡️ Block AI Scrapers
                  </button>
                  <button type="button" class="c-button--chip" (click)="applyRobotsPreset('wordpress')">
                    WordPress
                  </button>
                  <button type="button" class="c-button--chip" (click)="applyRobotsPreset('staging')">
                    🚫 Disallow All (Staging)
                  </button>
                </div>
              </app-card>

              <!-- Rules Configuration List -->
              <app-card class="g--margin-bottom-4">
                <div card-header class="c-card__header-flex">
                  <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">User-Agent Rules</h3>
                  <app-button variant="outline" size="small" (clicked)="addRobotsRule()">
                    + Add User-Agent Block
                  </app-button>
                </div>

                <div class="rules-list g--margin-top-3">
                  @for (rule of robotsConfig().rules; track $index) {
                    <div class="rule-card g--margin-bottom-3">
                      <div class="rule-card__header">
                        <span class="rule-card__badge">Block #{{ $index + 1 }}</span>
                        @if (robotsConfig().rules.length > 1) {
                          <button
                            type="button"
                            class="delete-btn"
                            (click)="removeRobotsRule($index)"
                            title="Remove Rule Block">
                            ✕
                          </button>
                        }
                      </div>

                      <div class="form-group g--margin-bottom-2">
                        <label class="form-label">User-Agent Identifier</label>
                        <input
                          type="text"
                          class="c-input--text"
                          [value]="rule.userAgent"
                          (input)="updateRuleUserAgent($index, $any($event.target).value)"
                          placeholder="* or Googlebot, GPTBot, etc." />
                      </div>

                      <div class="form-row g--margin-bottom-2">
                        <div class="form-group">
                          <label class="form-label">Allow Paths (one per line)</label>
                          <textarea
                            class="c-input--textarea"
                            rows="2"
                            [value]="rule.allow.join('\n')"
                            (input)="updateRuleAllow($index, $any($event.target).value)"
                            placeholder="/&#10;/public/"></textarea>
                        </div>
                        <div class="form-group">
                          <label class="form-label">Disallow Paths (one per line)</label>
                          <textarea
                            class="c-input--textarea"
                            rows="2"
                            [value]="rule.disallow.join('\n')"
                            (input)="updateRuleDisallow($index, $any($event.target).value)"
                            placeholder="/admin/&#10;/private/"></textarea>
                        </div>
                      </div>

                      <div class="form-group">
                        <label class="form-label">Crawl Delay (Seconds, optional)</label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          class="c-input--text"
                          [value]="rule.crawlDelay ?? ''"
                          (input)="updateRuleCrawlDelay($index, $any($event.target).value)"
                          placeholder="e.g. 5" />
                      </div>
                    </div>
                  }
                </div>
              </app-card>

              <!-- Global Sitemaps & Host Card -->
              <app-card class="g--margin-bottom-4">
                <div card-header class="c-card__header-flex">
                  <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Sitemaps &amp; Host Declaration</h3>
                  <app-button variant="outline" size="small" (clicked)="addSitemapDeclaration()">
                    + Add Sitemap Link
                  </app-button>
                </div>

                <div class="g--margin-top-3">
                  @for (sitemap of robotsConfig().sitemaps; track $index) {
                    <div class="sitemap-input-row g--margin-bottom-2">
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="sitemap"
                        (input)="updateSitemapDeclaration($index, $any($event.target).value)"
                        placeholder="https://example.com/sitemap.xml" />
                      <button
                        type="button"
                        class="delete-btn"
                        (click)="removeSitemapDeclaration($index)"
                        title="Remove Sitemap">
                        ✕
                      </button>
                    </div>
                  }

                  <div class="form-group g--margin-top-3">
                    <label class="form-label">Host Declaration (optional)</label>
                    <input
                      type="text"
                      class="c-input--text"
                      [value]="robotsConfig().host ?? ''"
                      (input)="updateRobotsHost($any($event.target).value)"
                      placeholder="https://example.com" />
                  </div>
                </div>
              </app-card>
            }

            <!-- MODE 2: XML SITEMAP BUILDER -->
            @if (activeMode() === 'sitemap') {
              <!-- Bulk Import Accordion/Card -->
              <app-card class="g--margin-bottom-4">
                <div card-header class="c-card__header-flex">
                  <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Bulk URL Import</h3>
                </div>
                <div class="g--margin-top-3">
                  <div class="form-group g--margin-bottom-2">
                    <label class="form-label">Default Domain Prefix (for relative paths)</label>
                    <input
                      type="text"
                      class="c-input--text"
                      [value]="defaultDomain()"
                      (input)="defaultDomain.set($any($event.target).value)"
                      placeholder="https://example.com" />
                  </div>
                  <div class="form-group g--margin-bottom-2">
                    <label class="form-label">Paste URLs (one per line or CSV: url,lastmod,freq,priority)</label>
                    <textarea
                      class="c-input--textarea"
                      rows="4"
                      [value]="bulkInputText()"
                      (input)="bulkInputText.set($any($event.target).value)"
                      placeholder="https://example.com/&#10;https://example.com/about&#10;/blog,2026-10-10,weekly,0.8"></textarea>
                  </div>
                  <div class="g--flex-center" style="gap: 8px;">
                    <app-button
                      variant="primary"
                      size="small"
                      (clicked)="importBulkUrls(bulkInputText(), false)">
                      Append URLs
                    </app-button>
                    <app-button
                      variant="outline"
                      size="small"
                      (clicked)="importBulkUrls(bulkInputText(), true)">
                      Replace All
                    </app-button>
                  </div>
                </div>
              </app-card>

              <!-- Dynamic URLs List Card -->
              <app-card class="g--margin-bottom-4">
                <div card-header class="c-card__header-flex">
                  <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">
                    Sitemap URLs ({{ sitemapEntries().length }})
                  </h3>
                  <app-button variant="outline" size="small" (clicked)="addSitemapUrl()">
                    + Add Single URL
                  </app-button>
                </div>

                <div class="sitemap-entries-list g--margin-top-3">
                  @for (entry of sitemapEntries(); track $index) {
                    <div class="sitemap-entry-row g--margin-bottom-2">
                      <div class="entry-field-loc">
                        <input
                          type="text"
                          class="c-input--text"
                          [value]="entry.loc"
                          (input)="updateSitemapUrl($index, { loc: $any($event.target).value })"
                          placeholder="https://example.com/page" />
                      </div>
                      <div class="entry-field-lastmod">
                        <input
                          type="date"
                          class="c-input--text"
                          [value]="entry.lastmod ?? ''"
                          (input)="updateSitemapUrl($index, { lastmod: $any($event.target).value })" />
                      </div>
                      <div class="entry-field-freq">
                        <select
                          class="c-input--select"
                          [value]="entry.changefreq ?? 'weekly'"
                          (change)="updateSitemapUrl($index, { changefreq: $any($event.target).value })">
                          <option value="always">always</option>
                          <option value="hourly">hourly</option>
                          <option value="daily">daily</option>
                          <option value="weekly">weekly</option>
                          <option value="monthly">monthly</option>
                          <option value="yearly">yearly</option>
                          <option value="never">never</option>
                        </select>
                      </div>
                      <div class="entry-field-prio">
                        <input
                          type="number"
                          step="0.1"
                          min="0.0"
                          max="1.0"
                          class="c-input--text"
                          [value]="entry.priority ?? 0.8"
                          (input)="updateSitemapUrl($index, { priority: +$any($event.target).value })" />
                      </div>
                      <button
                        type="button"
                        class="delete-btn"
                        (click)="removeSitemapUrl($index)"
                        title="Remove URL">
                        ✕
                      </button>
                    </div>
                  }
                </div>
              </app-card>
            }
          </div>

          <!-- Right Column: Code Preview & Export Actions -->
          <div class="builder-preview-col">
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <div class="g--flex-center" style="gap: 8px;">
                  <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">
                    Live {{ activeMode() === 'robots' ? 'robots.txt' : 'sitemap.xml' }}
                  </h3>
                  @if (activeMode() === 'sitemap') {
                    @if (sitemapValidation().isValid) {
                      <span class="valid-xml-badge">✓ Valid XML</span>
                    } @else {
                      <span class="invalid-xml-badge">⚠️ XML Error</span>
                    }
                  }
                </div>
              </div>

              <!-- Live Code Stage -->
              <div class="code-stage g--margin-top-3">
                <pre class="code-block"><code>{{ activeOutputCode() }}</code></pre>
              </div>

              <!-- Action Buttons -->
              <div class="action-buttons-row g--margin-top-4">
                <app-button
                  variant="primary"
                  size="normal"
                  (clicked)="copyActiveCode()">
                  {{ copiedState() ? '✓ Copied to Clipboard!' : '📋 Copy Code' }}
                </app-button>
                <app-button
                  variant="secondary"
                  size="normal"
                  (clicked)="downloadFile()">
                  💾 Download {{ activeMode() === 'robots' ? 'robots.txt' : 'sitemap.xml' }}
                </app-button>
              </div>

              @if (copiedState()) {
                <div class="copy-banner g--margin-top-3">
                  ✨ File content copied to your clipboard! Ready to save to your site root.
                </div>
              }

              <!-- Ad Slot 2 (Medium Rectangle 300x250) -->
              <div class="g--margin-top-4 g--text-center print-hidden">
                <div
                  class="ad-slot ad-slot--rectangle"
                  style="width: 300px; height: 250px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
                  <span>SPONSOR ADVERTISEMENT (300&times;250)</span>
                </div>
              </div>
            </app-card>

            <!-- SEO Deployment Guide Card -->
            <app-card>
              <h4 style="margin: 0 0 10px 0; font-size: 1rem; font-weight: 700;">
                Deployment &amp; Search Engine Verification
              </h4>
              <ul class="deploy-guide-list">
                <li>
                  <strong>Placement</strong>: Upload both files directly to the root of your web server (e.g. <code>https://yourdomain.com/robots.txt</code> and <code>https://yourdomain.com/sitemap.xml</code>).
                </li>
                <li>
                  <strong>Google Search Console</strong>: Navigate to <em>Index &rarr; Sitemaps</em> and submit your sitemap URL for immediate indexing.
                </li>
                <li>
                  <strong>AI Bots Protection</strong>: The <em>Block AI Scrapers</em> preset protects your private web assets from unauthorized LLM model scrapers (GPTBot, ClaudeBot, CCBot).
                </li>
              </ul>
            </app-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .mode-switcher-container {
      display: inline-flex;
      background: var(--color-bg-subtle);
      padding: 4px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      gap: 4px;
    }

    .mode-switch-btn {
      padding: 8px 18px;
      font-size: 0.875rem;
      font-weight: 700;
      border: none;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mode-switch-btn:hover {
      color: var(--color-text);
    }

    .mode-switch-btn--active {
      background: var(--color-primary);
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
    }

    .builder-studio-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (min-width: 1024px) {
      .builder-studio-grid {
        grid-template-columns: 1.15fr 1fr;
      }
    }

    .preset-buttons-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .c-button--chip {
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 9999px;
      padding: 4px 12px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--color-text);
      transition: all 0.15s ease;
    }

    .c-button--chip:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .rule-card {
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 14px;
    }

    .rule-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .rule-card__badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-primary);
      background: rgba(37, 99, 235, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .delete-btn {
      background: none;
      border: none;
      color: #ef4444;
      font-size: 0.875rem;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .delete-btn:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
        gap: 8px;
      }

      .sitemap-entry-row {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 10px;
      }

      .sitemap-entry-row > div {
        width: 100%;
      }

      .sitemap-entry-row .delete-btn {
        align-self: flex-end;
      }
    }

    .form-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .sitemap-input-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .sitemap-entry-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .entry-field-loc { flex: 3; }
    .entry-field-lastmod { flex: 2; }
    .entry-field-freq { flex: 1.5; }
    .entry-field-prio { flex: 1; min-width: 60px; }

    .code-stage {
      max-height: 480px;
      overflow: auto;
      border-radius: var(--radius-md);
      background: #0f172a;
      padding: 16px;
      border: 1px solid #1e293b;
    }

    .code-block {
      margin: 0;
      color: #e2e8f0;
      font-family: monospace;
      font-size: 0.8125rem;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .action-buttons-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .copy-banner {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid #10b981;
      color: #065f46;
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-size: 0.8125rem;
    }

    .valid-xml-badge {
      background: rgba(16, 185, 129, 0.15);
      color: #059669;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .invalid-xml-badge {
      background: rgba(239, 68, 68, 0.15);
      color: #dc2626;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .deploy-guide-list {
      margin: 0;
      padding-left: 20px;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      line-height: 1.6;
    }
  `,
})
export class RobotsSitemapBuilderComponent {
  readonly activeMode = signal<'robots' | 'sitemap'>('robots');
  readonly robotsConfig = signal<RobotsConfig>(this.clone(DEFAULT_ROBOTS_CONFIG));
  readonly sitemapEntries = signal<SitemapUrlEntry[]>(this.clone(DEFAULT_SITEMAP_ENTRIES));
  readonly bulkInputText = signal<string>('');
  readonly defaultDomain = signal<string>('https://example.com');
  readonly copiedState = signal<boolean>(false);

  readonly generatedRobotsTxt = computed(() => generateRobotsTxt(this.robotsConfig()));
  readonly generatedSitemapXml = computed(() => generateSitemapXml(this.sitemapEntries()));
  readonly sitemapValidation = computed(() => validateSitemapXml(this.generatedSitemapXml()));

  readonly activeOutputCode = computed(() =>
    this.activeMode() === 'robots' ? this.generatedRobotsTxt() : this.generatedSitemapXml()
  );

  applyRobotsPreset(presetKey: RobotsPresetKey): void {
    switch (presetKey) {
      case 'block-ai':
        this.robotsConfig.set(this.clone(BLOCK_AI_ROBOTS_CONFIG));
        break;
      case 'wordpress':
        this.robotsConfig.set(this.clone(WORDPRESS_ROBOTS_CONFIG));
        break;
      case 'staging':
        this.robotsConfig.set(this.clone(STAGING_ROBOTS_CONFIG));
        break;
      case 'default':
      default:
        this.robotsConfig.set(this.clone(DEFAULT_ROBOTS_CONFIG));
        break;
    }
  }

  addRobotsRule(userAgent = '*', allow: string[] = ['/'], disallow: string[] = [], crawlDelay?: number): void {
    this.robotsConfig.update((cfg) => ({
      ...cfg,
      rules: [
        ...cfg.rules,
        {
          userAgent,
          allow,
          disallow,
          crawlDelay,
        },
      ],
    }));
  }

  removeRobotsRule(index: number): void {
    this.robotsConfig.update((cfg) => ({
      ...cfg,
      rules: cfg.rules.filter((_, i) => i !== index),
    }));
  }

  updateRuleUserAgent(index: number, userAgent: string): void {
    this.robotsConfig.update((cfg) => {
      const rules = [...cfg.rules];
      rules[index] = { ...rules[index], userAgent };
      return { ...cfg, rules };
    });
  }

  updateRuleAllow(index: number, rawText: string): void {
    const allow = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => Boolean(l));
    this.robotsConfig.update((cfg) => {
      const rules = [...cfg.rules];
      rules[index] = { ...rules[index], allow };
      return { ...cfg, rules };
    });
  }

  updateRuleDisallow(index: number, rawText: string): void {
    const disallow = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== undefined);
    this.robotsConfig.update((cfg) => {
      const rules = [...cfg.rules];
      rules[index] = { ...rules[index], disallow };
      return { ...cfg, rules };
    });
  }

  updateRuleCrawlDelay(index: number, value: string): void {
    const crawlDelay = value === '' ? undefined : parseInt(value, 10);
    this.robotsConfig.update((cfg) => {
      const rules = [...cfg.rules];
      rules[index] = { ...rules[index], crawlDelay };
      return { ...cfg, rules };
    });
  }

  addSitemapDeclaration(): void {
    this.robotsConfig.update((cfg) => ({
      ...cfg,
      sitemaps: [...cfg.sitemaps, 'https://example.com/sitemap.xml'],
    }));
  }

  removeSitemapDeclaration(index: number): void {
    this.robotsConfig.update((cfg) => ({
      ...cfg,
      sitemaps: cfg.sitemaps.filter((_, i) => i !== index),
    }));
  }

  updateSitemapDeclaration(index: number, sitemap: string): void {
    this.robotsConfig.update((cfg) => {
      const sitemaps = [...cfg.sitemaps];
      sitemaps[index] = sitemap;
      return { ...cfg, sitemaps };
    });
  }

  updateRobotsHost(host: string): void {
    this.robotsConfig.update((cfg) => ({ ...cfg, host }));
  }

  addSitemapUrl(
    loc = 'https://example.com/new-page',
    changefreq: ChangeFrequency = 'weekly',
    priority = 0.8,
    lastmod = new Date().toISOString().slice(0, 10)
  ): void {
    this.sitemapEntries.update((entries) => [
      ...entries,
      {
        loc,
        changefreq,
        priority,
        lastmod,
      },
    ]);
  }

  removeSitemapUrl(index: number): void {
    this.sitemapEntries.update((entries) => entries.filter((_, i) => i !== index));
  }

  updateSitemapUrl(index: number, partial: Partial<SitemapUrlEntry>): void {
    this.sitemapEntries.update((entries) => {
      const updated = [...entries];
      updated[index] = { ...updated[index], ...partial };
      return updated;
    });
  }

  importBulkUrls(rawText: string, replaceAll: boolean): void {
    const parsed = parseBulkUrls(rawText, this.defaultDomain());
    if (parsed.length === 0) return;

    if (replaceAll) {
      this.sitemapEntries.set(parsed);
    } else {
      this.sitemapEntries.update((existing) => [...existing, ...parsed]);
    }
    this.bulkInputText.set('');
  }

  async copyActiveCode(): Promise<void> {
    const code = this.activeOutputCode();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      }
      this.copiedState.set(true);
      setTimeout(() => this.copiedState.set(false), 3000);
    } catch {
      // Ignore
    }
  }

  downloadFile(): void {
    if (this.activeMode() === 'robots') {
      const blob = exportRobotsBlob(this.generatedRobotsTxt());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'robots.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const blob = exportSitemapBlob(this.generatedSitemapXml());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
