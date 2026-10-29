import { TranslatePipe } from '../../../core/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import {
  exportSignatureHtmlBlob,
  generatePlainTextSignature,
  generateSignatureHtml,
} from './engine';
import {
  COMPACT_SIGNATURE_CONFIG,
  CORPORATE_SIGNATURE_CONFIG,
  DEFAULT_SIGNATURE_CONFIG,
  MINIMAL_SIGNATURE_CONFIG,
  TWO_COLUMN_SIGNATURE_CONFIG,
} from './test-fixtures';
import {
  SignatureAvatarShape,
  SignatureConfig,
  SignatureContactInfo,
  SignatureFont,
  SignatureFontSize,
  SignatureImagesConfig,
  SignaturePersonalInfo,
  SignatureSocialLinks,
  SignatureStyleConfig,
  SignatureTemplate,
} from './types';

@Component({
  selector: 'app-email-signature-generator',
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
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.025em;">{{ 'tools.emailSignature.name' | translate }}</h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 820px; margin: 0 auto; line-height: 1.6;">
          {{ 'tools.emailSignature.description' | translate }}
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

      <!-- Studio Layout -->
      <div class="l-columns__area">
        <div class="sig-studio-grid">
          <!-- Left Column: Form Configuration Panels -->
          <div class="sig-form-col">
            <!-- Preset & Template Bar -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Template Presets</h3>
                <div class="g--flex-center" style="gap: 8px;">
                  <app-button variant="outline" size="small" (clicked)="resetToDefaults()">
                    🔄 Reset
                  </app-button>
                </div>
              </div>

              <!-- Template Selector Cards -->
              <div class="template-selector-grid g--margin-top-3">
                <button
                  type="button"
                  class="template-card"
                  [class.template-card--active]="config().style.template === 'modern'"
                  (click)="selectTemplate('modern')">
                  <div class="template-card__icon">🎨</div>
                  <div class="template-card__name">Modern</div>
                  <div class="template-card__desc">Color bar &amp; avatar</div>
                </button>
                <button
                  type="button"
                  class="template-card"
                  [class.template-card--active]="config().style.template === 'compact'"
                  (click)="selectTemplate('compact')">
                  <div class="template-card__icon">⚡</div>
                  <div class="template-card__name">Compact</div>
                  <div class="template-card__desc">One-line reply style</div>
                </button>
                <button
                  type="button"
                  class="template-card"
                  [class.template-card--active]="config().style.template === 'corporate'"
                  (click)="selectTemplate('corporate')">
                  <div class="template-card__icon">🏢</div>
                  <div class="template-card__name">Corporate</div>
                  <div class="template-card__desc">Logo &amp; disclaimer</div>
                </button>
                <button
                  type="button"
                  class="template-card"
                  [class.template-card--active]="config().style.template === 'minimal'"
                  (click)="selectTemplate('minimal')">
                  <div class="template-card__icon">✨</div>
                  <div class="template-card__name">Minimal</div>
                  <div class="template-card__desc">Clean typography</div>
                </button>
                <button
                  type="button"
                  class="template-card"
                  [class.template-card--active]="config().style.template === 'two-column'"
                  (click)="selectTemplate('two-column')">
                  <div class="template-card__icon">📑</div>
                  <div class="template-card__name">Two-Column</div>
                  <div class="template-card__desc">Side-by-side layout</div>
                </button>
              </div>

              <!-- Sample Demo Loaders -->
              <div class="g--margin-top-3 g--flex-center" style="gap: 6px; flex-wrap: wrap;">
                <span style="font-size: 0.8125rem; color: var(--color-text-muted); font-weight: 600;">Load Sample:</span>
                <button type="button" class="c-button--chip" (click)="loadPreset('default')">Engineer</button>
                <button type="button" class="c-button--chip" (click)="loadPreset('corporate')">Executive</button>
                <button type="button" class="c-button--chip" (click)="loadPreset('compact')">Designer</button>
                <button type="button" class="c-button--chip" (click)="loadPreset('minimal')">Journalist</button>
                <button type="button" class="c-button--chip" (click)="loadPreset('two-column')">VP Tech</button>
              </div>
            </app-card>

            <!-- Configuration Sections Tabs -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <div class="tab-nav">
                  <button
                    type="button"
                    class="tab-nav__item"
                    [class.tab-nav__item--active]="activeSection() === 'personal'"
                    (click)="activeSection.set('personal')">
                    Personal
                  </button>
                  <button
                    type="button"
                    class="tab-nav__item"
                    [class.tab-nav__item--active]="activeSection() === 'contact'"
                    (click)="activeSection.set('contact')">
                    Contact
                  </button>
                  <button
                    type="button"
                    class="tab-nav__item"
                    [class.tab-nav__item--active]="activeSection() === 'social'"
                    (click)="activeSection.set('social')">
                    Social
                  </button>
                  <button
                    type="button"
                    class="tab-nav__item"
                    [class.tab-nav__item--active]="activeSection() === 'images'"
                    (click)="activeSection.set('images')">
                    Images
                  </button>
                  <button
                    type="button"
                    class="tab-nav__item"
                    [class.tab-nav__item--active]="activeSection() === 'style'"
                    (click)="activeSection.set('style')">
                    Style
                  </button>
                </div>
              </div>

              <!-- SECTION: PERSONAL INFO -->
              @if (activeSection() === 'personal') {
                <div class="section-content g--margin-top-3">
                  <div class="form-group g--margin-bottom-3">
                    <label class="form-label">Full Name *</label>
                    <input
                      type="text"
                      class="c-input--text"
                      [value]="config().personal.fullName"
                      (input)="updatePersonalInfo({ fullName: $any($event.target).value })"
                      placeholder="e.g. Alex Morgan" />
                  </div>
                  <div class="form-row g--margin-bottom-3">
                    <div class="form-group">
                      <label class="form-label">Job Title *</label>
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().personal.jobTitle"
                        (input)="updatePersonalInfo({ jobTitle: $any($event.target).value })"
                        placeholder="e.g. Senior Software Engineer" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Department</label>
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().personal.department"
                        (input)="updatePersonalInfo({ department: $any($event.target).value })"
                        placeholder="e.g. Platform Engineering" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Company Name</label>
                    <input
                      type="text"
                      class="c-input--text"
                      [value]="config().personal.company"
                      (input)="updatePersonalInfo({ company: $any($event.target).value })"
                      placeholder="e.g. Apex Cloud Solutions" />
                  </div>
                </div>
              }

              <!-- SECTION: CONTACT INFO -->
              @if (activeSection() === 'contact') {
                <div class="section-content g--margin-top-3">
                  <div class="form-row g--margin-bottom-3">
                    <div class="form-group">
                      <label class="form-label">Email Address *</label>
                      <input
                        type="email"
                        class="c-input--text"
                        [value]="config().contact.email"
                        (input)="updateContactInfo({ email: $any($event.target).value })"
                        placeholder="e.g. alex@apexcloud.io" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Website</label>
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().contact.website"
                        (input)="updateContactInfo({ website: $any($event.target).value })"
                        placeholder="e.g. https://apexcloud.io" />
                    </div>
                  </div>
                  <div class="form-row g--margin-bottom-3">
                    <div class="form-group">
                      <label class="form-label">Office Phone</label>
                      <input
                        type="tel"
                        class="c-input--text"
                        [value]="config().contact.phone"
                        (input)="updateContactInfo({ phone: $any($event.target).value })"
                        placeholder="e.g. +1 (555) 019-2834" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Mobile Number</label>
                      <input
                        type="tel"
                        class="c-input--text"
                        [value]="config().contact.mobile"
                        (input)="updateContactInfo({ mobile: $any($event.target).value })"
                        placeholder="e.g. +1 (555) 019-9944" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Address / Office Location</label>
                    <input
                      type="text"
                      class="c-input--text"
                      [value]="config().contact.address"
                      (input)="updateContactInfo({ address: $any($event.target).value })"
                      placeholder="e.g. 100 Innovation Way, Suite 400, San Francisco, CA" />
                  </div>
                </div>
              }

              <!-- SECTION: SOCIAL LINKS -->
              @if (activeSection() === 'social') {
                <div class="section-content g--margin-top-3">
                  <div class="form-row g--margin-bottom-3">
                    <div class="form-group">
                      <label class="form-label">LinkedIn URL</label>
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().social.linkedin"
                        (input)="updateSocialLinks({ linkedin: $any($event.target).value })"
                        placeholder="https://linkedin.com/in/username" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">X / Twitter URL</label>
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().social.twitter"
                        (input)="updateSocialLinks({ twitter: $any($event.target).value })"
                        placeholder="https://x.com/username" />
                    </div>
                  </div>
                  <div class="form-row g--margin-bottom-3">
                    <div class="form-group">
                      <label class="form-label">GitHub URL</label>
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().social.github"
                        (input)="updateSocialLinks({ github: $any($event.target).value })"
                        placeholder="https://github.com/username" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Instagram URL</label>
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().social.instagram"
                        (input)="updateSocialLinks({ instagram: $any($event.target).value })"
                        placeholder="https://instagram.com/username" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Facebook URL</label>
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().social.facebook"
                        (input)="updateSocialLinks({ facebook: $any($event.target).value })"
                        placeholder="https://facebook.com/username" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">YouTube URL</label>
                      <input
                        type="text"
                        class="c-input--text"
                        [value]="config().social.youtube"
                        (input)="updateSocialLinks({ youtube: $any($event.target).value })"
                        placeholder="https://youtube.com/@channel" />
                    </div>
                  </div>
                </div>
              }

              <!-- SECTION: IMAGES & LOGOS -->
              @if (activeSection() === 'images') {
                <div class="section-content g--margin-top-3">
                  @if (imageUploadError()) {
                    <div class="c-badge--error g--margin-bottom-3" style="padding: 8px 12px; border-radius: 6px; font-size: 0.8125rem;">
                      {{ imageUploadError() }}
                    </div>
                  }

                  <!-- Profile Avatar -->
                  <div class="g--margin-bottom-4" style="border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 16px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 0.9375rem; font-weight: 700;">Avatar / Profile Picture</h4>
                    <div class="form-row g--margin-bottom-2">
                      <div class="form-group" style="flex: 2;">
                        <label class="form-label">Avatar URL</label>
                        <input
                          type="text"
                          class="c-input--text"
                          [value]="config().images.avatarUrl"
                          (input)="updateImages({ avatarUrl: $any($event.target).value })"
                          placeholder="https://example.com/avatar.jpg" />
                      </div>
                      <div class="form-group" style="flex: 1;">
                        <label class="form-label">Or Upload File</label>
                        <input
                          type="file"
                          accept="image/*"
                          class="file-input-btn"
                          (change)="onAvatarFileSelected($event)" />
                      </div>
                    </div>
                    <div class="form-row g--margin-top-2">
                      <div class="form-group">
                        <label class="form-label">Avatar Shape</label>
                        <select
                          class="c-input--select"
                          [value]="config().images.avatarShape"
                          (change)="updateAvatarShape($any($event.target).value)">
                          <option value="round">Round (50%)</option>
                          <option value="rounded">Rounded Corners (8px)</option>
                          <option value="square">Square</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Avatar Size ({{ config().images.avatarSize }}px)</label>
                        <input
                          type="range"
                          min="48"
                          max="120"
                          step="4"
                          class="c-input--range"
                          [value]="config().images.avatarSize"
                          (input)="updateImages({ avatarSize: +$any($event.target).value })" />
                      </div>
                    </div>
                  </div>

                  <!-- Company Logo -->
                  <div>
                    <h4 style="margin: 0 0 10px 0; font-size: 0.9375rem; font-weight: 700;">Company Logo</h4>
                    <div class="form-row g--margin-bottom-2">
                      <div class="form-group" style="flex: 2;">
                        <label class="form-label">Logo URL</label>
                        <input
                          type="text"
                          class="c-input--text"
                          [value]="config().images.logoUrl"
                          (input)="updateImages({ logoUrl: $any($event.target).value })"
                          placeholder="https://example.com/logo.png" />
                      </div>
                      <div class="form-group" style="flex: 1;">
                        <label class="form-label">Or Upload File</label>
                        <input
                          type="file"
                          accept="image/*"
                          class="file-input-btn"
                          (change)="onLogoFileSelected($event)" />
                      </div>
                    </div>
                    <div class="form-group g--margin-top-2">
                      <label class="form-label">Logo Height ({{ config().images.logoSize }}px)</label>
                      <input
                        type="range"
                        min="24"
                        max="80"
                        step="4"
                        class="c-input--range"
                        [value]="config().images.logoSize"
                        (input)="updateImages({ logoSize: +$any($event.target).value })" />
                    </div>
                  </div>
                </div>
              }

              <!-- SECTION: STYLE & DESIGN -->
              @if (activeSection() === 'style') {
                <div class="section-content g--margin-top-3">
                  <div class="form-row g--margin-bottom-3">
                    <div class="form-group">
                      <label class="form-label">Accent / Primary Color</label>
                      <div class="color-picker-input">
                        <input
                          type="color"
                          [value]="config().style.primaryColor"
                          (input)="updateStyle({ primaryColor: $any($event.target).value })"
                          class="color-swatch" />
                        <input
                          type="text"
                          class="c-input--text"
                          [value]="config().style.primaryColor"
                          (input)="updateStyle({ primaryColor: $any($event.target).value })" />
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Secondary / Muted Color</label>
                      <div class="color-picker-input">
                        <input
                          type="color"
                          [value]="config().style.secondaryColor"
                          (input)="updateStyle({ secondaryColor: $any($event.target).value })"
                          class="color-swatch" />
                        <input
                          type="text"
                          class="c-input--text"
                          [value]="config().style.secondaryColor"
                          (input)="updateStyle({ secondaryColor: $any($event.target).value })" />
                      </div>
                    </div>
                  </div>
                  <div class="form-row g--margin-bottom-3">
                    <div class="form-group">
                      <label class="form-label">Font Family (Email-Safe)</label>
                      <select
                        class="c-input--select"
                        [value]="config().style.fontFamily"
                        (change)="updateFontFamily($any($event.target).value)">
                        <option value="Arial, sans-serif">Arial (Modern Sans)</option>
                        <option value="Helvetica, sans-serif">Helvetica (Clean Sans)</option>
                        <option value="Georgia, serif">Georgia (Classic Serif)</option>
                        <option value="'Times New Roman', serif">Times New Roman (Formal)</option>
                        <option value="Verdana, sans-serif">Verdana (Readable Sans)</option>
                        <option value="'Trebuchet MS', sans-serif">Trebuchet MS (Friendly Sans)</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Font Size Scale</label>
                      <select
                        class="c-input--select"
                        [value]="config().style.fontSize"
                        (change)="updateFontSize($any($event.target).value)">
                        <option value="sm">Small (Compact, 12px base)</option>
                        <option value="md">Medium (Standard, 14px base)</option>
                        <option value="lg">Large (Spacious, 16px base)</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group g--margin-bottom-3">
                    <label class="form-label">Legal Confidentiality Disclaimer</label>
                    <textarea
                      class="c-input--textarea"
                      rows="3"
                      [value]="config().style.disclaimerText"
                      (input)="updateStyle({ disclaimerText: $any($event.target).value })"
                      placeholder="Optional confidentiality or legal notice for corporate email compliance..."></textarea>
                  </div>
                  <div class="form-group">
                    <label class="c-checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="config().style.includeBranding"
                        (change)="updateStyle({ includeBranding: $any($event.target).checked })" />
                      <span>Include subtle "Created with PrivKnife" support badge</span>
                    </label>
                  </div>
                </div>
              }
            </app-card>
          </div>

          <!-- Right Column: Live Preview & Export Hub -->
          <div class="sig-preview-col">
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <div class="view-tabs">
                  <button
                    type="button"
                    class="view-tab"
                    [class.view-tab--active]="activeView() === 'preview'"
                    (click)="activeView.set('preview')">
                    👁️ Visual Preview
                  </button>
                  <button
                    type="button"
                    class="view-tab"
                    [class.view-tab--active]="activeView() === 'html'"
                    (click)="activeView.set('html')">
                    &lt;/&gt; HTML Source
                  </button>
                  <button
                    type="button"
                    class="view-tab"
                    [class.view-tab--active]="activeView() === 'text'"
                    (click)="activeView.set('text')">
                    📄 Plain Text
                  </button>
                </div>
              </div>

              <!-- VIEW 1: VISUAL PREVIEW -->
              @if (activeView() === 'preview') {
                <div class="preview-stage g--margin-top-3">
                  <div class="email-mockup-header">
                    <span class="dot dot--red"></span>
                    <span class="dot dot--yellow"></span>
                    <span class="dot dot--green"></span>
                    <span class="mockup-title">Inbox Message Preview</span>
                  </div>
                  <div class="email-mockup-body">
                    <div class="email-dummy-text">
                      Hi there,<br /><br />
                      Thanks for reaching out! Let me know if you have any questions, and feel free to schedule a quick call.<br /><br />
                      Best regards,
                    </div>
                    <div class="rendered-signature-container" [innerHTML]="safePreviewHtml()"></div>
                  </div>
                </div>
              }

              <!-- VIEW 2: HTML CODE VIEW -->
              @if (activeView() === 'html') {
                <div class="code-stage g--margin-top-3">
                  <pre class="code-block"><code>{{ generatedHtml() }}</code></pre>
                </div>
              }

              <!-- VIEW 3: PLAIN TEXT VIEW -->
              @if (activeView() === 'text') {
                <div class="code-stage g--margin-top-3">
                  <pre class="code-block"><code>{{ generatedPlainText() }}</code></pre>
                </div>
              }

              <!-- ACTION BUTTONS BAR -->
              <div class="action-buttons-grid g--margin-top-4">
                <app-button
                  variant="primary"
                  size="normal"
                  (clicked)="copyRichText()">
                  {{ copiedRichText() ? '✓ Copied Rich Text!' : '📋 Copy Rich Text (Direct Paste)' }}
                </app-button>
                <app-button
                  variant="secondary"
                  size="normal"
                  (clicked)="copyRawHtml()">
                  {{ copiedRawHtml() ? '✓ Copied Code!' : '&lt;/&gt; Copy HTML Code' }}
                </app-button>
                <app-button
                  variant="outline"
                  size="normal"
                  (clicked)="downloadHtmlFile()">
                  💾 Download .html
                </app-button>
              </div>

              <!-- Feedback message -->
              @if (copiedRichText()) {
                <div class="copy-feedback-banner g--margin-top-3">
                  ✨ <strong>Rich Text copied to clipboard!</strong> In Gmail or Outlook Settings &rarr; Signatures, simply press <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong>) to paste your formatted signature.
                </div>
              }
              @if (copiedRawHtml()) {
                <div class="copy-feedback-banner g--margin-top-3">
                  ✨ <strong>Raw HTML copied to clipboard!</strong> Ready to paste into your webmail or code editor.
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

            <!-- Instructions Guide Card -->
            <app-card>
              <h4 style="margin: 0 0 10px 0; font-size: 1rem; font-weight: 700;">
                How to Install in Your Email Client
              </h4>
              <ul class="install-guide-list">
                <li>
                  <strong>Gmail</strong>: Go to Settings (gear) &rarr; See all settings &rarr; General &rarr; Signature &rarr; Click "+ Create new" &rarr; Paste (Ctrl+V / Cmd+V) &rarr; Save Changes.
                </li>
                <li>
                  <strong>Outlook Web (Office 365)</strong>: Settings &rarr; View all Outlook settings &rarr; Mail &rarr; Compose and reply &rarr; Email signature &rarr; Paste &rarr; Save.
                </li>
                <li>
                  <strong>Apple Mail (Mac)</strong>: Mail &rarr; Settings &rarr; Signatures &rarr; Add signature &rarr; Uncheck "Always match my default message font" &rarr; Paste.
                </li>
              </ul>
            </app-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .sig-studio-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      align-items: start;
    }

    .sig-form-col,
    .sig-preview-col {
      min-width: 0;
      width: 100%;
    }

    @media (min-width: 1024px) {
      .sig-studio-grid {
        grid-template-columns: 1fr 1.15fr;
      }
    }

    .template-selector-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 8px;
    }

    .template-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 10px 6px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .template-card:hover {
      border-color: var(--color-primary);
      background: var(--color-bg-subtle);
    }

    .template-card--active {
      border-color: var(--color-primary);
      background: rgba(37, 99, 235, 0.08);
      outline: 2px solid var(--color-primary);
    }

    .template-card__icon {
      font-size: 1.25rem;
      margin-bottom: 4px;
    }

    .template-card__name {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--color-text);
    }

    .template-card__desc {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      margin-top: 2px;
    }

    .tab-nav {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      border-bottom: 1px solid var(--color-border-subtle);
      width: 100%;
    }

    .tab-nav__item {
      padding: 8px 14px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .tab-nav__item:hover {
      color: var(--color-text);
    }

    .tab-nav__item--active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    @media (max-width: 640px) {
      .form-row {
        flex-direction: column;
        gap: 8px;
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

    .color-picker-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .color-swatch {
      width: 38px;
      height: 38px;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      background: none;
    }

    .view-tabs {
      display: flex;
      gap: 8px;
    }

    .view-tab {
      padding: 6px 12px;
      font-size: 0.8125rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-bg);
      color: var(--color-text-muted);
      cursor: pointer;
    }

    .view-tab--active {
      background: var(--color-primary);
      color: #ffffff;
      border-color: var(--color-primary);
    }

    .preview-stage {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .email-mockup-header {
      background: #f1f5f9;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #e2e8f0;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot--red { background: #ef4444; }
    .dot--yellow { background: #f59e0b; }
    .dot--green { background: #10b981; }

    .mockup-title {
      font-size: 0.75rem;
      color: #64748b;
      margin-left: 6px;
      font-weight: 500;
    }

    .email-mockup-body {
      padding: 16px;
      color: #334155;
      max-width: 100%;
      overflow-x: auto;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
    }

    .email-dummy-text {
      font-family: Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #64748b;
      margin-bottom: 24px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 16px;
    }

    .rendered-signature-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      max-width: 100%;
    }

    .code-stage {
      max-height: 380px;
      overflow: auto;
      border-radius: var(--radius-md);
      background: #0f172a;
      padding: 16px;
    }

    .code-block {
      margin: 0;
      color: #e2e8f0;
      font-family: monospace;
      font-size: 0.8125rem;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .action-buttons-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .copy-feedback-banner {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid #10b981;
      color: #065f46;
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .install-guide-list {
      margin: 0;
      padding-left: 20px;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      line-height: 1.6;
    }

    .file-input-btn {
      font-size: 0.75rem;
      padding: 4px;
    }

    .c-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .c-button--chip {
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 9999px;
      padding: 2px 10px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      color: var(--color-text);
      transition: all 0.15s ease;
    }
    .c-button--chip:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  `,
})
export class EmailSignatureGeneratorComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly STORAGE_KEY = 'privknife_email_signature_draft';

  readonly config = signal<SignatureConfig>(this.cloneConfig(DEFAULT_SIGNATURE_CONFIG));
  readonly activeSection = signal<'personal' | 'contact' | 'social' | 'images' | 'style'>('personal');
  readonly activeView = signal<'preview' | 'html' | 'text'>('preview');

  readonly copiedRichText = signal<boolean>(false);
  readonly copiedRawHtml = signal<boolean>(false);
  readonly copiedPlainText = signal<boolean>(false);
  readonly imageUploadError = signal<string | null>(null);

  readonly generatedHtml = computed(() => generateSignatureHtml(this.config()));
  readonly generatedPlainText = computed(() => generatePlainTextSignature(this.config()));
  readonly safePreviewHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.generatedHtml())
  );

  ngOnInit(): void {
    this.loadSavedDraft();
  }

  updatePersonalInfo(partial: Partial<SignaturePersonalInfo>): void {
    this.config.update((c) => {
      const next = { ...c, personal: { ...c.personal, ...partial } };
      this.saveDraft(next);
      return next;
    });
  }

  updateContactInfo(partial: Partial<SignatureContactInfo>): void {
    this.config.update((c) => {
      const next = { ...c, contact: { ...c.contact, ...partial } };
      this.saveDraft(next);
      return next;
    });
  }

  updateSocialLinks(partial: Partial<SignatureSocialLinks>): void {
    this.config.update((c) => {
      const next = { ...c, social: { ...c.social, ...partial } };
      this.saveDraft(next);
      return next;
    });
  }

  updateImages(partial: Partial<SignatureImagesConfig>): void {
    this.config.update((c) => {
      const next = { ...c, images: { ...c.images, ...partial } };
      this.saveDraft(next);
      return next;
    });
  }

  updateAvatarShape(shape: string): void {
    this.updateImages({ avatarShape: shape as SignatureAvatarShape });
  }

  updateStyle(partial: Partial<SignatureStyleConfig>): void {
    this.config.update((c) => {
      const next = { ...c, style: { ...c.style, ...partial } };
      this.saveDraft(next);
      return next;
    });
  }

  updateFontFamily(fontFamily: string): void {
    this.updateStyle({ fontFamily: fontFamily as SignatureFont });
  }

  updateFontSize(fontSize: string): void {
    this.updateStyle({ fontSize: fontSize as SignatureFontSize });
  }

  selectTemplate(template: SignatureTemplate): void {
    this.updateStyle({ template });
  }

  loadPreset(presetName: 'default' | 'corporate' | 'compact' | 'minimal' | 'two-column'): void {
    let preset: SignatureConfig;
    switch (presetName) {
      case 'corporate':
        preset = CORPORATE_SIGNATURE_CONFIG;
        break;
      case 'compact':
        preset = COMPACT_SIGNATURE_CONFIG;
        break;
      case 'minimal':
        preset = MINIMAL_SIGNATURE_CONFIG;
        break;
      case 'two-column':
        preset = TWO_COLUMN_SIGNATURE_CONFIG;
        break;
      case 'default':
      default:
        preset = DEFAULT_SIGNATURE_CONFIG;
        break;
    }
    const cloned = this.cloneConfig(preset);
    this.config.set(cloned);
    this.saveDraft(cloned);
  }

  resetToDefaults(): void {
    const fresh = this.cloneConfig(DEFAULT_SIGNATURE_CONFIG);
    this.config.set(fresh);
    this.saveDraft(fresh);
    this.imageUploadError.set(null);
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      this.imageUploadError.set('Avatar image must be smaller than 2 MB for fast email rendering.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.updateImages({ avatarUrl: dataUrl });
      this.imageUploadError.set(null);
    };
    reader.readAsDataURL(file);
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      this.imageUploadError.set('Logo image must be smaller than 2 MB for fast email rendering.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.updateImages({ logoUrl: dataUrl });
      this.imageUploadError.set(null);
    };
    reader.readAsDataURL(file);
  }

  async copyRichText(): Promise<void> {
    const html = this.generatedHtml();
    const plainText = this.generatedPlainText();

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const htmlBlob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(html);
      }
      this.copiedRichText.set(true);
      setTimeout(() => this.copiedRichText.set(false), 3000);
    } catch {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(html);
          this.copiedRichText.set(true);
          setTimeout(() => this.copiedRichText.set(false), 3000);
        }
      } catch {
        // Ignore clipboard write errors
      }
    }
  }

  async copyRawHtml(): Promise<void> {
    const html = this.generatedHtml();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(html);
      }
      this.copiedRawHtml.set(true);
      setTimeout(() => this.copiedRawHtml.set(false), 3000);
    } catch {
      // Ignore
    }
  }

  async copyPlainText(): Promise<void> {
    const text = this.generatedPlainText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      this.copiedPlainText.set(true);
      setTimeout(() => this.copiedPlainText.set(false), 3000);
    } catch {
      // Ignore
    }
  }

  downloadHtmlFile(): void {
    const html = this.generatedHtml();
    const blob = exportSignatureHtmlBlob(html);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signature-${this.config().style.template}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private saveDraft(cfg: SignatureConfig): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      // Ignore storage errors
    }
  }

  private loadSavedDraft(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.personal && parsed.contact && parsed.style) {
          this.config.set(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }

  private cloneConfig(source: SignatureConfig): SignatureConfig {
    return JSON.parse(JSON.stringify(source));
  }
}
