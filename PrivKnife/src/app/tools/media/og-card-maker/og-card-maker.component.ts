import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import {
  exportCanvasBlob,
  generateOgMetaSnippet,
  renderOgCardToCanvas,
} from './engine';
import { DEFAULT_OG_CONFIG } from './test-fixtures';
import {
  BackgroundStyle,
  CardFontFamily,
  OgCardConfig,
  OgCardTemplate,
} from './types';

export type MockupTab = 'studio' | 'twitter' | 'linkedin' | 'meta';

@Component({
  selector: 'app-og-card-maker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone, FormsModule],
  template: `
    <div
      class="l-columns l-columns--1 g--margin-x-auto"
      style="max-width: 1300px; padding: 0 16px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.025em;">
          Social Share (Open Graph) Card Maker
        </h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 800px; margin: 0 auto; line-height: 1.6;">
          Design pixel-perfect 1200&times;630 social preview cards for Twitter, LinkedIn, and Facebook in seconds.
          High-DPI PNG and WebP compilation executed completely in your browser.
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

      <!-- Main Studio 2-Column Grid -->
      <div class="l-columns l-columns--2 og-workspace g--margin-bottom-6" style="gap: 24px; align-items: start;">
        
        <!-- Left: Controls Panel -->
        <div class="l-columns__area" style="display: flex; flex-direction: column; gap: 20px;">
          <!-- 1. Templates Selection -->
          <app-card title="1. Choose Layout Preset">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="config().template === 'modern-tech'"
                [class.c-button--outline]="config().template !== 'modern-tech'"
                (click)="setTemplate('modern-tech')">
                💻 Modern Tech
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="config().template === 'article-blog'"
                [class.c-button--outline]="config().template !== 'article-blog'"
                (click)="setTemplate('article-blog')">
                📰 Article &amp; Blog
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="config().template === 'product-hunt'"
                [class.c-button--outline]="config().template !== 'product-hunt'"
                (click)="setTemplate('product-hunt')">
                🚀 Startup &amp; Launch
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="config().template === 'code-snippet'"
                [class.c-button--outline]="config().template !== 'code-snippet'"
                (click)="setTemplate('code-snippet')">
                ⚙️ Code Terminal
              </button>
            </div>
          </app-card>

          <!-- 2. Typography & Content -->
          <app-card title="2. Card Content &amp; Messaging">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Title -->
              <div>
                <label
                  for="cardTitleInput"
                  class="c-input__label"
                  style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                  Title Text
                </label>
                <textarea
                  id="cardTitleInput"
                  rows="2"
                  class="c-input"
                  style="width: 100%; resize: vertical;"
                  [ngModel]="config().title"
                  (ngModelChange)="updateConfig('title', $event)"
                  placeholder="Enter high-impact card headline..."></textarea>
              </div>

              <!-- Subtitle -->
              <div>
                <label
                  for="cardSubtitleInput"
                  class="c-input__label"
                  style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                  Subtitle / Description
                </label>
                <textarea
                  id="cardSubtitleInput"
                  rows="2"
                  class="c-input"
                  style="width: 100%; resize: vertical;"
                  [ngModel]="config().subtitle"
                  (ngModelChange)="updateConfig('subtitle', $event)"
                  placeholder="Enter card description..."></textarea>
              </div>

              <!-- Badge Tag & Reading Time Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label
                    for="badgeInput"
                    class="c-input__label"
                    style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Badge / Tag
                  </label>
                  <input
                    id="badgeInput"
                    type="text"
                    class="c-input"
                    style="width: 100%;"
                    [ngModel]="config().badgeText"
                    (ngModelChange)="updateConfig('badgeText', $event)"
                    placeholder="e.g. Tutorial" />
                </div>

                @if (config().template === 'article-blog') {
                  <div>
                    <label
                      for="readingTimeInput"
                      class="c-input__label"
                      style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Reading Time
                    </label>
                    <input
                      id="readingTimeInput"
                      type="text"
                      class="c-input"
                      style="width: 100%;"
                      [ngModel]="config().readingTime"
                      (ngModelChange)="updateConfig('readingTime', $event)"
                      placeholder="e.g. 5 min read" />
                  </div>
                } @else {
                  <div>
                    <label
                      for="domainInput"
                      class="c-input__label"
                      style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Domain Name
                    </label>
                    <input
                      id="domainInput"
                      type="text"
                      class="c-input"
                      style="width: 100%;"
                      [ngModel]="config().domain"
                      (ngModelChange)="updateConfig('domain', $event)"
                      placeholder="e.g. privknife.com" />
                  </div>
                }
              </div>

              <!-- Author & Domain for non-blog or blog -->
              @if (config().template === 'article-blog') {
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div>
                    <label
                      for="authorInput"
                      class="c-input__label"
                      style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Author Name
                    </label>
                    <input
                      id="authorInput"
                      type="text"
                      class="c-input"
                      style="width: 100%;"
                      [ngModel]="config().authorName"
                      (ngModelChange)="updateConfig('authorName', $event)"
                      placeholder="e.g. Jane Dev" />
                  </div>
                  <div>
                    <label
                      for="blogDomainInput"
                      class="c-input__label"
                      style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Domain
                    </label>
                    <input
                      id="blogDomainInput"
                      type="text"
                      class="c-input"
                      style="width: 100%;"
                      [ngModel]="config().domain"
                      (ngModelChange)="updateConfig('domain', $event)"
                      placeholder="privknife.com" />
                  </div>
                </div>
              }

              <!-- Code Snippet & Language (Visible for code-snippet template) -->
              @if (config().template === 'code-snippet') {
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <label
                      for="codeInput"
                      class="c-input__label"
                      style="font-size: 0.8125rem; font-weight: 600;">
                      Code Snippet
                    </label>
                    <input
                      type="text"
                      class="c-input"
                      style="width: 110px; padding: 2px 6px; font-size: 0.75rem;"
                      [ngModel]="config().codeLanguage"
                      (ngModelChange)="updateConfig('codeLanguage', $event)"
                      placeholder="Language" />
                  </div>
                  <textarea
                    id="codeInput"
                    rows="4"
                    class="c-input"
                    style="width: 100%; font-family: monospace; font-size: 0.8125rem; resize: vertical;"
                    [ngModel]="config().codeSnippet"
                    (ngModelChange)="updateConfig('codeSnippet', $event)"
                    placeholder="Enter code sample..."></textarea>
                </div>
              }
            </div>
          </app-card>

          <!-- 3. Styling & Color Palette -->
          <app-card title="3. Styling &amp; Colors">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Background Style Toggle -->
              <div>
                <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                  Background Style
                </label>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backgroundStyle === 'gradient'"
                    [class.c-button--outline]="config().backgroundStyle !== 'gradient'"
                    (click)="updateConfig('backgroundStyle', 'gradient')">
                    Linear Gradient
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backgroundStyle === 'mesh'"
                    [class.c-button--outline]="config().backgroundStyle !== 'mesh'"
                    (click)="updateConfig('backgroundStyle', 'mesh')">
                    Radial Mesh Glow
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backgroundStyle === 'solid'"
                    [class.c-button--outline]="config().backgroundStyle !== 'solid'"
                    (click)="updateConfig('backgroundStyle', 'solid')">
                    Solid Color
                  </button>
                </div>
              </div>

              <!-- Theme Toggle: Dark / Light -->
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8125rem; font-weight: 600;">Color Theme Mode</span>
                <div style="display: flex; gap: 6px;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().theme === 'dark'"
                    [class.c-button--outline]="config().theme !== 'dark'"
                    (click)="updateConfig('theme', 'dark')">
                    🌙 Dark
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().theme === 'light'"
                    [class.c-button--outline]="config().theme !== 'light'"
                    (click)="updateConfig('theme', 'light')">
                    ☀️ Light
                  </button>
                </div>
              </div>

              <!-- Color Pickers Row -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">
                    Primary
                  </label>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <input
                      type="color"
                      style="width: 34px; height: 34px; border: 1px solid var(--color-border-subtle); border-radius: 4px; cursor: pointer;"
                      [ngModel]="config().primaryColor"
                      (ngModelChange)="updateConfig('primaryColor', $event)" />
                    <span style="font-size: 0.75rem; color: var(--color-text-muted);">{{ config().primaryColor }}</span>
                  </div>
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">
                    Accent
                  </label>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <input
                      type="color"
                      style="width: 34px; height: 34px; border: 1px solid var(--color-border-subtle); border-radius: 4px; cursor: pointer;"
                      [ngModel]="config().accentColor"
                      (ngModelChange)="updateConfig('accentColor', $event)" />
                    <span style="font-size: 0.75rem; color: var(--color-text-muted);">{{ config().accentColor }}</span>
                  </div>
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">
                    Background
                  </label>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <input
                      type="color"
                      style="width: 34px; height: 34px; border: 1px solid var(--color-border-subtle); border-radius: 4px; cursor: pointer;"
                      [ngModel]="config().backgroundColor"
                      (ngModelChange)="updateConfig('backgroundColor', $event)" />
                    <span style="font-size: 0.75rem; color: var(--color-text-muted);">{{ config().backgroundColor }}</span>
                  </div>
                </div>
              </div>

              <!-- Font Family Selector -->
              <div>
                <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                  Typography Font
                </label>
                <div style="display: flex; gap: 6px;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().fontFamily === 'sans-serif'"
                    [class.c-button--outline]="config().fontFamily !== 'sans-serif'"
                    (click)="updateConfig('fontFamily', 'sans-serif')">
                    Modern Sans
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().fontFamily === 'serif'"
                    [class.c-button--outline]="config().fontFamily !== 'serif'"
                    (click)="updateConfig('fontFamily', 'serif')">
                    Editorial Serif
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().fontFamily === 'monospace'"
                    [class.c-button--outline]="config().fontFamily !== 'monospace'"
                    (click)="updateConfig('fontFamily', 'monospace')">
                    Code Monospace
                  </button>
                </div>
              </div>

              <!-- Title Font Size Slider -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                    Headline Font Size
                  </label>
                  <span style="font-size: 0.8125rem; font-weight: 600; color: var(--color-primary);">
                    {{ config().fontSize }}px
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="72"
                  step="2"
                  style="width: 100%; cursor: pointer;"
                  [ngModel]="config().fontSize"
                  (ngModelChange)="updateConfig('fontSize', +$event)" />
              </div>
            </div>
          </app-card>

          <!-- 4. Media & Avatars -->
          <app-card title="4. Images &amp; Avatars (Optional)">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                    Author Avatar
                  </label>
                  @if (avatarFile()) {
                    <button
                      type="button"
                      style="background: none; border: none; font-size: 0.75rem; color: #ef4444; cursor: pointer;"
                      (click)="removeAvatar()">
                      Remove Avatar
                    </button>
                  }
                </div>
                <app-dropzone
                  accept="image/*"
                  [multiple]="false"
                  title="Drop avatar / photo here"
                  subtitle="PNG or JPG thumbnail (rendered in 48x48 circle)"
                  (filesSelected)="onAvatarSelected($event)" />
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                    Custom Background Image
                  </label>
                  @if (customBgFile()) {
                    <button
                      type="button"
                      style="background: none; border: none; font-size: 0.75rem; color: #ef4444; cursor: pointer;"
                      (click)="removeCustomBg()">
                      Remove Background
                    </button>
                  }
                </div>
                <app-dropzone
                  accept="image/*"
                  [multiple]="false"
                  title="Drop background image here"
                  subtitle="Covers 1200x630 canvas with subtle contrast tint"
                  (filesSelected)="onCustomBgSelected($event)" />
              </div>
            </div>
          </app-card>

          <!-- Sidebar Ad Slot (300x250) -->
          <div
            class="ad-slot ad-slot--sidebar print-hidden"
            style="height: 250px; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
            <span>Responsive Ad Placement (300x250 Sidebar)</span>
          </div>
        </div>

        <!-- Right: Studio Canvas & Live Social Previews -->
        <div class="l-columns__area" style="position: sticky; top: 20px;">
          <app-card title="Studio Viewport (1200 &times; 630 px)">
            <!-- Mockup Tab Switcher -->
            <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="activeMockupTab() === 'studio'"
                [class.c-button--outline]="activeMockupTab() !== 'studio'"
                (click)="activeMockupTab.set('studio')">
                🎨 Canvas Editor
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="activeMockupTab() === 'twitter'"
                [class.c-button--outline]="activeMockupTab() !== 'twitter'"
                (click)="activeMockupTab.set('twitter')">
                🐦 Twitter / X Mockup
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="activeMockupTab() === 'linkedin'"
                [class.c-button--outline]="activeMockupTab() !== 'linkedin'"
                (click)="activeMockupTab.set('linkedin')">
                💼 LinkedIn Mockup
              </button>
              <button
                type="button"
                class="c-button c-button--small"
                [class.c-button--primary]="activeMockupTab() === 'meta'"
                [class.c-button--outline]="activeMockupTab() !== 'meta'"
                (click)="activeMockupTab.set('meta')">
                📋 HTML Meta Tags
              </button>
            </div>

            <!-- Viewport 1: Studio Canvas -->
            <div [style.display]="activeMockupTab() === 'studio' ? 'block' : 'none'">
              <div
                style="background: #090d16; border-radius: var(--radius-md); padding: 12px; border: 1px solid var(--color-border-subtle); display: flex; justify-content: center; align-items: center;">
                <canvas
                  #previewCanvas
                  width="1200"
                  height="630"
                  style="width: 100%; height: auto; aspect-ratio: 1200 / 630; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: block;">
                </canvas>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--color-text-muted); margin-top: 8px;">
                <span>Canvas Size: 1200 &times; 630 px</span>
                <span>Standard Open Graph 1.91:1 Aspect Ratio</span>
              </div>
            </div>

            <!-- Viewport 2: Twitter / X Mockup -->
            @if (activeMockupTab() === 'twitter') {
              <div
                style="background: #000; border: 1px solid #2f3336; border-radius: 16px; padding: 16px; color: #e7e9ea;">
                <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                  <div
                    style="width: 40px; height: 40px; border-radius: 50%; background: #1d9bf0; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff;">
                    {{ (config().authorName || 'U').charAt(0) }}
                  </div>
                  <div>
                    <div style="font-weight: 700; font-size: 0.9375rem;">
                      {{ config().authorName || 'Creator' }}
                      <span style="font-weight: 400; color: #71767b; font-size: 0.8125rem;">
                        &#64;{{ (config().authorName || 'creator').toLowerCase().replace(' ', '') }} &bull; Just now
                      </span>
                    </div>
                    <div style="font-size: 0.9375rem; margin-top: 4px; line-height: 1.4;">
                      Just published: {{ config().title }} 🚀 Check it out below!
                    </div>
                  </div>
                </div>

                <!-- Twitter Card Preview Box -->
                <div
                  style="border: 1px solid #2f3336; border-radius: 14px; overflow: hidden; background: #000;">
                  <div style="background: #090d16; padding: 4px;">
                    <canvas
                      #twitterCanvas
                      width="1200"
                      height="630"
                      style="width: 100%; height: auto; aspect-ratio: 1200 / 630; display: block; border-radius: 10px;">
                    </canvas>
                  </div>
                  <div style="padding: 10px 14px; background: #0a0a0a;">
                    <div style="font-size: 0.8125rem; color: #71767b;">
                      {{ config().domain || 'example.com' }}
                    </div>
                    <div style="font-weight: 700; font-size: 0.9375rem; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {{ config().title }}
                    </div>
                    <div style="font-size: 0.8125rem; color: #71767b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {{ config().subtitle }}
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Viewport 3: LinkedIn Mockup -->
            @if (activeMockupTab() === 'linkedin') {
              <div
                style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 16px; color: #000000;">
                <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                  <div
                    style="width: 44px; height: 44px; border-radius: 50%; background: #0a66c2; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff;">
                    {{ (config().authorName || 'P').charAt(0) }}
                  </div>
                  <div>
                    <div style="font-weight: 700; font-size: 0.9375rem; color: #000;">
                      {{ config().authorName || 'Professional' }}
                    </div>
                    <div style="font-size: 0.75rem; color: #666;">
                      Product Engineer &bull; 1h &bull; 🌐
                    </div>
                  </div>
                </div>

                <div style="font-size: 0.875rem; margin-bottom: 12px; line-height: 1.4; color: #191919;">
                  Excited to share our newest release: {{ config().title }}.
                </div>

                <!-- LinkedIn Image Card -->
                <div style="border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
                  <div style="background: #090d16; padding: 2px;">
                    <canvas
                      #linkedInCanvas
                      width="1200"
                      height="630"
                      style="width: 100%; height: auto; aspect-ratio: 1200 / 630; display: block;">
                    </canvas>
                  </div>
                  <div style="padding: 10px 14px; background: #f3f6f8;">
                    <div style="font-size: 0.75rem; color: #666; text-transform: uppercase;">
                      {{ config().domain || 'example.com' }}
                    </div>
                    <div style="font-weight: 600; font-size: 0.9375rem; color: #000; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {{ config().title }}
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Viewport 4: HTML Meta Tags Snippet -->
            @if (activeMockupTab() === 'meta') {
              <div>
                <pre
                  style="margin: 0; padding: 16px; background: #0f172a; color: #e2e8f0; border-radius: var(--radius-md); font-family: monospace; font-size: 0.8125rem; overflow-x: auto; line-height: 1.5;"><code>{{ htmlMetaSnippet() }}</code></pre>
                <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
                  <app-button
                    variant="secondary"
                    size="small"
                    (clicked)="copyMetaSnippet()">
                    @if (copiedSnippet()) {
                      <span>✓ Meta Tags Copied!</span>
                    } @else {
                      <span>📋 Copy HTML Tags</span>
                    }
                  </app-button>
                </div>
              </div>
            }

            <!-- Bottom Action Panel -->
            <div
              style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--color-border-subtle); display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <app-button
                  variant="primary"
                  [loading]="isExporting()"
                  (clicked)="downloadCard('png')">
                  <span>📥 Download 1200&times;630 PNG</span>
                </app-button>

                <app-button
                  variant="secondary"
                  [loading]="isExporting()"
                  (clicked)="downloadCard('webp')">
                  <span>⚡ Download WebP</span>
                </app-button>

                <app-button
                  variant="outline"
                  (clicked)="copyMetaSnippet()">
                  <span>{{ copiedSnippet() ? '✓ Copied' : '📋 Copy Meta Tags' }}</span>
                </app-button>
              </div>

              <div style="display: flex; justify-content: flex-end;">
                <app-button variant="outline" size="small" (clicked)="reset()">
                  Reset to Defaults
                </app-button>
              </div>
            </div>
          </app-card>
        </div>
      </div>

      <!-- Post-Export Instructions Dialog Modal -->
      @if (showExportModal()) {
        <div
          class="c-modal-overlay"
          style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;">
          <div
            class="c-card"
            style="max-width: 560px; width: 100%; background: var(--color-bg); border-radius: var(--radius-lg); padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid var(--color-border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0;">
                🎉 Social Preview Card Exported!
              </h3>
              <button
                type="button"
                style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-text-muted);"
                (click)="closeExportModal()">
                &times;
              </button>
            </div>

            <p style="font-size: 0.9375rem; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 16px;">
              Your 1200&times;630 social card has been generated in-browser and downloaded to your computer.
            </p>

            <ol style="margin: 0 0 20px 0; padding-left: 20px; font-size: 0.875rem; line-height: 1.6;">
              <li style="margin-bottom: 8px;">
                <strong>Upload the image</strong> to your static assets directory (e.g. <code>/public/og-image.png</code> or S3/CDN).
              </li>
              <li>
                <strong>Include the HTML meta tags</strong> in the <code>&lt;head&gt;</code> of your page to ensure Twitter, LinkedIn, and Facebook display your card.
              </li>
            </ol>

            <!-- Modal Ad Placement (300x250) -->
            <div
              class="ad-slot ad-slot--modal print-hidden"
              style="height: 160px; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem; margin-bottom: 20px;">
              <span>Responsive Ad Placement (Export Complete)</span>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <app-button variant="primary" (clicked)="closeExportModal()">
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
        .og-workspace {
          grid-template-columns: 1fr !important;
        }

        .og-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class OgCardMakerComponent implements AfterViewInit, OnDestroy {
  readonly previewCanvas = viewChild<ElementRef<HTMLCanvasElement>>('previewCanvas');
  readonly twitterCanvas = viewChild<ElementRef<HTMLCanvasElement>>('twitterCanvas');
  readonly linkedInCanvas = viewChild<ElementRef<HTMLCanvasElement>>('linkedInCanvas');

  readonly config = signal<OgCardConfig>({ ...DEFAULT_OG_CONFIG });
  readonly activeMockupTab = signal<MockupTab>('studio');

  readonly avatarFile = signal<File | null>(null);
  readonly avatarPreviewUrl = signal<string | null>(null);
  private avatarImageElement: HTMLImageElement | null = null;

  readonly customBgFile = signal<File | null>(null);
  readonly customBgPreviewUrl = signal<string | null>(null);
  private customBgImageElement: HTMLImageElement | null = null;

  readonly copiedSnippet = signal<boolean>(false);
  readonly copiedImage = signal<boolean>(false);
  readonly showExportModal = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);

  readonly htmlMetaSnippet = computed(() => generateOgMetaSnippet(this.config()));

  ngAfterViewInit(): void {
    void this.renderAllCanvases();
  }

  ngOnDestroy(): void {
    if (this.avatarPreviewUrl()) {
      URL.revokeObjectURL(this.avatarPreviewUrl()!);
      this.avatarPreviewUrl.set(null);
    }
    if (this.customBgPreviewUrl()) {
      URL.revokeObjectURL(this.customBgPreviewUrl()!);
      this.customBgPreviewUrl.set(null);
    }
  }

  updateConfig<K extends keyof OgCardConfig>(key: K, value: OgCardConfig[K]): void {
    this.config.set({ ...this.config(), [key]: value });
    void this.renderAllCanvases();
  }

  setTemplate(template: OgCardTemplate): void {
    this.config.set({ ...this.config(), template });
    void this.renderAllCanvases();
  }

  onAvatarSelected(files: File[]): void {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.avatarFile.set(file);

    if (this.avatarPreviewUrl()) {
      URL.revokeObjectURL(this.avatarPreviewUrl()!);
    }
    const url = URL.createObjectURL(file);
    this.avatarPreviewUrl.set(url);

    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.onload = () => {
        this.avatarImageElement = img;
        void this.renderAllCanvases();
      };
      img.src = url;
    } else {
      void this.renderAllCanvases();
    }
  }

  removeAvatar(): void {
    if (this.avatarPreviewUrl()) {
      URL.revokeObjectURL(this.avatarPreviewUrl()!);
      this.avatarPreviewUrl.set(null);
    }
    this.avatarFile.set(null);
    this.avatarImageElement = null;
    void this.renderAllCanvases();
  }

  onCustomBgSelected(files: File[]): void {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.customBgFile.set(file);

    if (this.customBgPreviewUrl()) {
      URL.revokeObjectURL(this.customBgPreviewUrl()!);
    }
    const url = URL.createObjectURL(file);
    this.customBgPreviewUrl.set(url);
    this.config.set({ ...this.config(), backgroundStyle: 'custom-image' });

    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.onload = () => {
        this.customBgImageElement = img;
        void this.renderAllCanvases();
      };
      img.src = url;
    } else {
      void this.renderAllCanvases();
    }
  }

  removeCustomBg(): void {
    if (this.customBgPreviewUrl()) {
      URL.revokeObjectURL(this.customBgPreviewUrl()!);
      this.customBgPreviewUrl.set(null);
    }
    this.customBgFile.set(null);
    this.customBgImageElement = null;
    this.config.set({ ...this.config(), backgroundStyle: 'gradient' });
    void this.renderAllCanvases();
  }

  async copyMetaSnippet(): Promise<void> {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.htmlMetaSnippet());
      }
      this.copiedSnippet.set(true);
      setTimeout(() => this.copiedSnippet.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy meta snippet', err);
    }
  }

  async downloadCard(format: 'png' | 'webp'): Promise<void> {
    this.isExporting.set(true);
    try {
      const canvasEl = this.previewCanvas()?.nativeElement;
      const canvas = await renderOgCardToCanvas(
        this.config(),
        canvasEl,
        this.avatarImageElement,
        this.customBgImageElement
      );

      const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
      const blob = await exportCanvasBlob(canvas, mimeType, 0.92);

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `og-card-1200x630.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);

      this.showExportModal.set(true);
    } catch (err) {
      console.error('Failed to export card', err);
    } finally {
      this.isExporting.set(false);
    }
  }

  closeExportModal(): void {
    this.showExportModal.set(false);
  }

  reset(): void {
    if (this.avatarPreviewUrl()) {
      URL.revokeObjectURL(this.avatarPreviewUrl()!);
      this.avatarPreviewUrl.set(null);
    }
    if (this.customBgPreviewUrl()) {
      URL.revokeObjectURL(this.customBgPreviewUrl()!);
      this.customBgPreviewUrl.set(null);
    }
    this.avatarFile.set(null);
    this.customBgFile.set(null);
    this.avatarImageElement = null;
    this.customBgImageElement = null;
    this.config.set({ ...DEFAULT_OG_CONFIG });
    this.copiedSnippet.set(false);
    this.showExportModal.set(false);
    void this.renderAllCanvases();
  }

  private async renderAllCanvases(): Promise<void> {
    const mainEl = this.previewCanvas()?.nativeElement;
    if (mainEl) {
      await renderOgCardToCanvas(
        this.config(),
        mainEl,
        this.avatarImageElement,
        this.customBgImageElement
      );
    }

    const twitterEl = this.twitterCanvas()?.nativeElement;
    if (twitterEl) {
      await renderOgCardToCanvas(
        this.config(),
        twitterEl,
        this.avatarImageElement,
        this.customBgImageElement
      );
    }

    const linkedInEl = this.linkedInCanvas()?.nativeElement;
    if (linkedInEl) {
      await renderOgCardToCanvas(
        this.config(),
        linkedInEl,
        this.avatarImageElement,
        this.customBgImageElement
      );
    }
  }
}
