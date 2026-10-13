import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import {
  createFaviconZip,
  generateFaviconSuite,
  generateHtmlSnippet,
  generateWebManifest,
} from './engine';
import { DEFAULT_FAVICON_CONFIG } from './test-fixtures';
import { FaviconConfig, FaviconSuiteResult } from './types';

export type PreviewTab = 'all' | 'chrome' | 'iphone' | 'android' | 'google';

@Component({
  selector: 'app-favicon-generator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone, FormsModule],
  template: `
    <div
      class="l-columns l-columns--1 g--margin-x-auto"
      style="max-width: 1200px; padding: 0 16px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.025em;">
          App Icon &amp; Favicon Suite Generator
        </h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 780px; margin: 0 auto; line-height: 1.6;">
          Transform any logo or image into standard multi-resolution
          <code>favicon.ico</code>, Apple Touch Icon, Android Chrome PWAs,
          and webmanifest. Pure client-side processing with zero server uploads.
        </p>
      </div>

      <!-- Top Leaderboard Ad Slot (728x90) -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center print-hidden">
        <div
          class="ad-slot ad-slot--leaderboard"
          style="max-width: 728px; height: 90px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
          <span>Responsive Ad Placement (728x90 Top Leaderboard)</span>
        </div>
      </div>

      <!-- Main Step 1: File Dropzone -->
      <div class="g--margin-bottom-6">
        <app-card title="1. Select or Drop Source Image">
          <app-dropzone
            accept="image/*"
            [multiple]="false"
            title="Drop your high-resolution logo or icon here (PNG, SVG, JPG, WebP)"
            subtitle="Recommended size: 512x512px or larger for crisp downsampling"
            (filesSelected)="onFilesSelected($event)" />

          @if (sourceFile()) {
            <div
              style="margin-top: 14px; padding: 12px 16px; background: var(--color-bg-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; align-items: center; gap: 12px;">
                @if (sourcePreviewUrl()) {
                  <img
                    [src]="sourcePreviewUrl()"
                    alt="Source Preview"
                    style="width: 44px; height: 44px; object-fit: contain; border-radius: 6px; background: #fff; padding: 2px; border: 1px solid var(--color-border-subtle);" />
                }
                <div>
                  <div style="font-weight: 600; font-size: 0.9375rem;">
                    {{ sourceFile()?.name }}
                  </div>
                  <div style="font-size: 0.8125rem; color: var(--color-text-muted);">
                    {{ ((sourceFile()?.size || 0) / 1024).toFixed(1) }} KB &bull;
                    {{ sourceFile()?.type }}
                  </div>
                </div>
              </div>
              <app-button variant="outline" size="small" (clicked)="reset()">
                Remove
              </app-button>
            </div>
          }
        </app-card>
      </div>

      <!-- Configuration & Sidebar Grid -->
      <div class="l-columns l-columns--2 favicon-workspace g--margin-bottom-6" style="gap: 24px;">
        <!-- Left: Options Controls -->
        <div class="l-columns__area">
          <app-card title="2. Branding &amp; Platform Configuration">
            <div style="display: flex; flex-direction: column; gap: 18px;">
              <!-- Site Name -->
              <div>
                <label
                  for="siteNameInput"
                  class="c-input__label"
                  style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                  Application / Website Title
                </label>
                <input
                  id="siteNameInput"
                  type="text"
                  class="c-input"
                  style="width: 100%;"
                  [ngModel]="config().siteName"
                  (ngModelChange)="updateConfig('siteName', $event)"
                  placeholder="e.g. My Web Application" />
              </div>

              <!-- Short Name -->
              <div>
                <label
                  for="shortNameInput"
                  class="c-input__label"
                  style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                  Short Name (Home Screen Label)
                </label>
                <input
                  id="shortNameInput"
                  type="text"
                  class="c-input"
                  style="width: 100%;"
                  [ngModel]="config().shortName"
                  (ngModelChange)="updateConfig('shortName', $event)"
                  placeholder="e.g. App" />
              </div>

              <!-- Colors: Theme Color & Background Color -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                  <label
                    for="themeColorInput"
                    class="c-input__label"
                    style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                    Theme Color
                  </label>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <input
                      id="themeColorInput"
                      type="color"
                      style="width: 40px; height: 38px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sm); cursor: pointer; padding: 2px;"
                      [ngModel]="config().themeColor"
                      (ngModelChange)="updateConfig('themeColor', $event)" />
                    <input
                      type="text"
                      class="c-input"
                      style="flex: 1;"
                      [ngModel]="config().themeColor"
                      (ngModelChange)="updateConfig('themeColor', $event)" />
                  </div>
                </div>

                <div>
                  <label
                    for="bgColorInput"
                    class="c-input__label"
                    style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                    Icon Background Tile
                  </label>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <input
                      id="bgColorInput"
                      type="color"
                      style="width: 40px; height: 38px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sm); cursor: pointer; padding: 2px;"
                      [ngModel]="config().backgroundColor"
                      (ngModelChange)="updateConfig('backgroundColor', $event)" />
                    <input
                      type="text"
                      class="c-input"
                      style="flex: 1;"
                      [ngModel]="config().backgroundColor"
                      (ngModelChange)="updateConfig('backgroundColor', $event)" />
                  </div>
                </div>
              </div>

              <!-- Icon Inset / Padding Slider -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label
                    for="paddingSlider"
                    class="c-input__label"
                    style="font-size: 0.8125rem; font-weight: 600;">
                    Icon Padding / Margin Inset
                  </label>
                  <span style="font-size: 0.8125rem; font-weight: 600; color: var(--color-primary);">
                    {{ config().paddingPercent }}%
                  </span>
                </div>
                <input
                  id="paddingSlider"
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  style="width: 100%; cursor: pointer;"
                  [ngModel]="config().paddingPercent"
                  (ngModelChange)="updateConfig('paddingPercent', +$event)" />
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px;">
                  <span>0% (Edge-to-edge)</span>
                  <span>15% (Recommended for circles)</span>
                  <span>30%</span>
                </div>
              </div>
            </div>
          </app-card>
        </div>

        <!-- Right: Sidebar Ad Slot + Summary -->
        <div class="l-columns__area">
          <div
            class="ad-slot ad-slot--sidebar print-hidden g--margin-bottom-4"
            style="height: 250px; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
            <span>Responsive Ad Placement (300x250 Medium Rectangle)</span>
          </div>

          <app-card title="Package Contents">
            <ul style="margin: 0; padding-left: 20px; font-size: 0.875rem; line-height: 1.8; color: var(--color-text-muted);">
              <li><strong>favicon.ico</strong> &mdash; 16x16, 32x32, 48x48 combined binary</li>
              <li><strong>apple-touch-icon.png</strong> &mdash; 180x180 for iOS Home Screen</li>
              <li><strong>android-chrome-192x192.png</strong> &mdash; PWA standard size</li>
              <li><strong>android-chrome-512x512.png</strong> &mdash; PWA high-res splash</li>
              <li><strong>favicon-16x16.png &amp; 32x32.png</strong> &mdash; Modern web PNGs</li>
              <li><strong>site.webmanifest</strong> &mdash; Web application manifest</li>
            </ul>
          </app-card>
        </div>
      </div>

      <!-- Step 3: Live Multi-Platform Mockup Previews -->
      <div class="g--margin-bottom-6">
        <app-card title="3. Live Multi-Platform Previews">
          <!-- Mockup Tabs -->
          <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
            <button
              type="button"
              class="c-button c-button--small"
              [class.c-button--primary]="activePreviewTab() === 'all'"
              [class.c-button--outline]="activePreviewTab() !== 'all'"
              (click)="activePreviewTab.set('all')">
              All Platforms
            </button>
            <button
              type="button"
              class="c-button c-button--small"
              [class.c-button--primary]="activePreviewTab() === 'chrome'"
              [class.c-button--outline]="activePreviewTab() !== 'chrome'"
              (click)="activePreviewTab.set('chrome')">
              Desktop Chrome Tab
            </button>
            <button
              type="button"
              class="c-button c-button--small"
              [class.c-button--primary]="activePreviewTab() === 'iphone'"
              [class.c-button--outline]="activePreviewTab() !== 'iphone'"
              (click)="activePreviewTab.set('iphone')">
              iPhone Home Screen
            </button>
            <button
              type="button"
              class="c-button c-button--small"
              [class.c-button--primary]="activePreviewTab() === 'android'"
              [class.c-button--outline]="activePreviewTab() !== 'android'"
              (click)="activePreviewTab.set('android')">
              Android Launcher
            </button>
            <button
              type="button"
              class="c-button c-button--small"
              [class.c-button--primary]="activePreviewTab() === 'google'"
              [class.c-button--outline]="activePreviewTab() !== 'google'"
              (click)="activePreviewTab.set('google')">
              Google SERP Snippet
            </button>
          </div>

          <!-- Mockup Cards Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            <!-- 1. Chrome Tab Mockup -->
            @if (activePreviewTab() === 'all' || activePreviewTab() === 'chrome') {
              <div
                style="background: #1e293b; border-radius: var(--radius-md); padding: 16px; color: #f8fafc; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 12px; font-weight: 600;">
                  Chrome Desktop Tab
                </div>
                <div
                  style="background: #334155; border-radius: 8px 8px 0 0; padding: 10px 14px; display: inline-flex; align-items: center; gap: 10px; max-width: 220px; box-shadow: 0 -2px 6px rgba(0,0,0,0.2);">
                  <div
                    style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; background: {{ config().backgroundColor }}; border-radius: 2px; overflow: hidden; flex-shrink: 0;">
                    @if (sourcePreviewUrl()) {
                      <img
                        [src]="sourcePreviewUrl()"
                        alt="Tab Icon"
                        style="width: 100%; height: 100%; object-fit: contain; padding: {{ config().paddingPercent * 0.16 }}px;" />
                    } @else {
                      <span style="font-size: 10px;">🌐</span>
                    }
                  </div>
                  <span
                    style="font-size: 0.8125rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                    {{ config().siteName }}
                  </span>
                  <span style="font-size: 0.75rem; color: #94a3b8; cursor: pointer;">&times;</span>
                </div>
                <div
                  style="height: 48px; background: #0f172a; border-radius: 0 4px 8px 8px; border-top: 2px solid #334155; display: flex; align-items: center; padding: 0 12px;">
                  <div
                    style="background: #1e293b; border-radius: 20px; height: 26px; width: 100%; display: flex; align-items: center; padding: 0 10px; font-size: 0.75rem; color: #64748b;">
                    🔒 https://{{ getHostSlug() }}.com
                  </div>
                </div>
              </div>
            }

            <!-- 2. iPhone Mockup -->
            @if (activePreviewTab() === 'all' || activePreviewTab() === 'iphone') {
              <div
                style="background: linear-gradient(135deg, #1e1b4b, #312e81); border-radius: var(--radius-md); padding: 24px; color: #f8fafc; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #cbd5e1; margin-bottom: 16px; font-weight: 600;">
                  iOS Home Screen
                </div>
                <div style="display: inline-block;">
                  <div
                    style="width: 68px; height: 68px; border-radius: 16px; background: {{ config().backgroundColor }}; margin: 0 auto 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: {{ config().paddingPercent * 0.68 }}px;">
                    @if (sourcePreviewUrl()) {
                      <img
                        [src]="sourcePreviewUrl()"
                        alt="iOS Icon"
                        style="width: 100%; height: 100%; object-fit: contain;" />
                    } @else {
                      <span style="font-size: 28px;">📱</span>
                    }
                  </div>
                  <div style="font-size: 0.8125rem; font-weight: 500; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                    {{ config().shortName || 'App' }}
                  </div>
                </div>
              </div>
            }

            <!-- 3. Android Mockup -->
            @if (activePreviewTab() === 'all' || activePreviewTab() === 'android') {
              <div
                style="background: linear-gradient(135deg, #064e3b, #047857); border-radius: var(--radius-md); padding: 24px; color: #f8fafc; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #a7f3d0; margin-bottom: 16px; font-weight: 600;">
                  Android Adaptive Icon
                </div>
                <div style="display: inline-block;">
                  <div
                    style="width: 68px; height: 68px; border-radius: 50%; background: {{ config().backgroundColor }}; margin: 0 auto 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: {{ config().paddingPercent * 0.68 }}px;">
                    @if (sourcePreviewUrl()) {
                      <img
                        [src]="sourcePreviewUrl()"
                        alt="Android Icon"
                        style="width: 100%; height: 100%; object-fit: contain;" />
                    } @else {
                      <span style="font-size: 28px;">🤖</span>
                    }
                  </div>
                  <div style="font-size: 0.8125rem; font-weight: 500; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                    {{ config().shortName || 'App' }}
                  </div>
                </div>
              </div>
            }

            <!-- 4. Google SERP Mockup -->
            @if (activePreviewTab() === 'all' || activePreviewTab() === 'google') {
              <div
                style="background: var(--color-bg); border-radius: var(--radius-md); padding: 18px; border: 1px solid var(--color-border-subtle);">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin-bottom: 12px; font-weight: 600;">
                  Google Search Snippet
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                  <div
                    style="width: 26px; height: 26px; border-radius: 50%; background: {{ config().backgroundColor }}; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; border: 1px solid var(--color-border-subtle); padding: {{ config().paddingPercent * 0.26 }}px;">
                    @if (sourcePreviewUrl()) {
                      <img
                        [src]="sourcePreviewUrl()"
                        alt="SERP Icon"
                        style="width: 100%; height: 100%; object-fit: contain;" />
                    } @else {
                      <span style="font-size: 14px;">🔍</span>
                    }
                  </div>
                  <div>
                    <div style="font-size: 0.8125rem; font-weight: 600;">
                      {{ config().siteName }}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted);">
                      https://{{ getHostSlug() }}.com
                    </div>
                  </div>
                </div>
                <div style="color: #1a0dab; font-size: 1.0625rem; font-weight: 500; margin-top: 4px; text-decoration: underline; cursor: pointer;">
                  {{ config().siteName }} &mdash; Official Web Application
                </div>
                <div style="font-size: 0.8125rem; color: var(--color-text-muted); margin-top: 4px; line-height: 1.4;">
                  Fast, secure, client-side tools running in your web browser. Free utility suite with complete data privacy.
                </div>
              </div>
            }
          </div>
        </app-card>
      </div>

      <!-- Step 4: HTML Code Snippet -->
      <div class="g--margin-bottom-6">
        <app-card title="4. Generated HTML <head> Code">
          <div style="position: relative;">
            <pre
              style="margin: 0; padding: 16px; background: #0f172a; color: #e2e8f0; border-radius: var(--radius-md); font-family: monospace; font-size: 0.875rem; overflow-x: auto; line-height: 1.5;"><code>{{ htmlSnippet() }}</code></pre>
            <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
              <app-button
                variant="secondary"
                size="small"
                (clicked)="copyHtmlSnippet()">
                @if (copiedSnippet()) {
                  <span>✓ Copied to Clipboard!</span>
                } @else {
                  <span>📋 Copy HTML Code</span>
                }
              </app-button>
            </div>
          </div>
        </app-card>
      </div>

      <!-- Bottom Action Bar & Download -->
      <div class="l-columns__area g--margin-bottom-6">
        <div
          class="l-extremo"
          style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; padding: 18px 24px; background: var(--color-bg-subtle); border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle);">
          <div>
            <div style="font-weight: 700; font-size: 1.125rem;">
              Ready to Package Favicon Suite?
            </div>
            <div style="font-size: 0.875rem; color: var(--color-text-muted);">
              @if (suiteResult()) {
                {{ suiteResult()?.assets?.length }} asset files compiled in-memory.
              } @else {
                Upload an image above to automatically generate your assets.
              }
            </div>
          </div>

          <div style="display: flex; gap: 12px;">
            <app-button variant="outline" (clicked)="reset()">
              Reset
            </app-button>
            <app-button
              variant="primary"
              [disabled]="!sourceFile() || isGenerating()"
              [loading]="isDownloading()"
              (clicked)="downloadZip()">
              <span>📦 Download Favicon Suite (.zip)</span>
            </app-button>
          </div>
        </div>
      </div>

      <!-- Post-Download Instructions Modal Dialog -->
      @if (showDownloadModal()) {
        <div
          class="c-modal-overlay"
          style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;">
          <div
            class="c-card"
            style="max-width: 540px; width: 100%; background: var(--color-bg); border-radius: var(--radius-lg); padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid var(--color-border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0;">
                🎉 Favicon Suite Downloaded!
              </h3>
              <button
                type="button"
                style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-text-muted);"
                (click)="closeDownloadModal()">
                &times;
              </button>
            </div>

            <p style="font-size: 0.9375rem; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 16px;">
              Your <code>favicon-suite.zip</code> has been generated and saved to your device. Follow these two quick steps to install:
            </p>

            <ol style="margin: 0 0 20px 0; padding-left: 20px; font-size: 0.875rem; line-height: 1.6;">
              <li style="margin-bottom: 8px;">
                <strong>Extract files</strong> into your project's public root directory (e.g. <code>/public</code>, <code>/dist</code>, or <code>/www</code>).
              </li>
              <li>
                <strong>Paste snippet</strong> into the <code>&lt;head&gt;</code> tag of your <code>index.html</code> template.
              </li>
            </ol>

            <!-- Modal Ad Placement (300x250) -->
            <div
              class="ad-slot ad-slot--modal print-hidden"
              style="height: 160px; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem; margin-bottom: 20px;">
              <span>Responsive Ad Placement (Modal Placement)</span>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <app-button variant="primary" (clicked)="closeDownloadModal()">
                Done
              </app-button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @media (max-width: 1024px) {
        .favicon-workspace {
          grid-template-columns: 1fr !important;
        }

        .favicon-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class FaviconGeneratorComponent implements OnDestroy {
  readonly config = signal<FaviconConfig>({ ...DEFAULT_FAVICON_CONFIG });
  readonly sourceFile = signal<File | null>(null);
  readonly sourcePreviewUrl = signal<string | null>(null);
  readonly suiteResult = signal<FaviconSuiteResult | null>(null);
  readonly copiedSnippet = signal<boolean>(false);
  readonly showDownloadModal = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  readonly isDownloading = signal<boolean>(false);
  readonly activePreviewTab = signal<PreviewTab>('all');

  readonly htmlSnippet = computed(() => generateHtmlSnippet(this.config()));

  ngOnDestroy(): void {
    if (this.sourcePreviewUrl()) {
      URL.revokeObjectURL(this.sourcePreviewUrl()!);
      this.sourcePreviewUrl.set(null);
    }
  }

  updateConfig<K extends keyof FaviconConfig>(
    key: K,
    value: FaviconConfig[K]
  ): void {
    const updated = { ...this.config(), [key]: value };
    this.config.set(updated);

    if (this.sourceFile()) {
      if (key === 'paddingPercent') {
        void this.generateSuite();
      } else if (this.suiteResult()) {
        this.suiteResult.set({
          ...this.suiteResult()!,
          manifestJson: generateWebManifest(updated),
          htmlSnippet: generateHtmlSnippet(updated),
        });
      }
    }
  }

  async onFilesSelected(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.sourceFile.set(file);

    if (this.sourcePreviewUrl()) {
      URL.revokeObjectURL(this.sourcePreviewUrl()!);
    }
    const previewUrl = URL.createObjectURL(file);
    this.sourcePreviewUrl.set(previewUrl);

    await this.generateSuite();
  }

  async generateSuite(): Promise<void> {
    const file = this.sourceFile();
    if (!file) return;

    this.isGenerating.set(true);
    try {
      const result = await generateFaviconSuite(file, this.config());
      this.suiteResult.set(result);
    } catch (err) {
      console.error('Failed to generate favicon suite', err);
    } finally {
      this.isGenerating.set(false);
    }
  }

  async copyHtmlSnippet(): Promise<void> {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.htmlSnippet());
      }
      this.copiedSnippet.set(true);
      setTimeout(() => this.copiedSnippet.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy html snippet', err);
    }
  }

  async downloadZip(): Promise<void> {
    const suite = this.suiteResult();
    if (!suite) return;

    this.isDownloading.set(true);
    try {
      const zipBlob = await createFaviconZip(suite);
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'favicon-suite.zip';
      anchor.click();
      URL.revokeObjectURL(url);
      this.showDownloadModal.set(true);
    } catch (err) {
      console.error('Failed to create favicon zip', err);
    } finally {
      this.isDownloading.set(false);
    }
  }

  closeDownloadModal(): void {
    this.showDownloadModal.set(false);
  }

  reset(): void {
    if (this.sourcePreviewUrl()) {
      URL.revokeObjectURL(this.sourcePreviewUrl()!);
      this.sourcePreviewUrl.set(null);
    }
    this.sourceFile.set(null);
    this.suiteResult.set(null);
    this.copiedSnippet.set(false);
    this.showDownloadModal.set(false);
  }

  protected getHostSlug(): string {
    const name = this.config().siteName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return name || 'webapp';
  }
}
