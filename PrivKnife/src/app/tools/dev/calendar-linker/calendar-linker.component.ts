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
import {
  exportIcsBlob,
  generateCalendarUrls,
  generateHtmlEmbed,
  generateIcsFile,
  generateMarkdownEmbed,
} from './engine';
import { DEFAULT_CALENDAR_EVENT } from './test-fixtures';
import { CalendarEvent, EmbedSnippetType, RecurrenceFreq } from './types';

@Component({
  selector: 'app-calendar-linker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, FormsModule],
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
          Universal Event &amp; .ics Calendar Linker
        </h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 820px; margin: 0 auto; line-height: 1.6;">
          Generate universal "Add to Calendar" links for Google, Outlook, Office 365, and Yahoo.
          Export standard RFC 5545 .ics files and email newsletter embed snippets offline with zero tracking.
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

      <!-- Main Studio Layout -->
      <div class="l-columns__area">
        <div class="cal-studio-grid">
          <!-- Left Column: Event Configuration Form -->
          <div class="cal-form-col">
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Event Details</h3>
                <app-button
                  variant="outline"
                  size="small"
                  (clicked)="loadDemoEvent()">
                  📄 Load Demo
                </app-button>
              </div>

              <!-- Title -->
              <div class="form-group g--margin-top-3 g--margin-bottom-3">
                <label class="form-label">Event Title *</label>
                <input
                  type="text"
                  class="c-input--text"
                  [value]="event().title"
                  (input)="updateField('title', $any($event.target).value)"
                  placeholder="e.g. Q4 Strategy Launch" />
              </div>

              <!-- Start / End Datetime -->
              <div class="dates-grid g--margin-bottom-3">
                <div class="form-group">
                  <label class="form-label">Starts *</label>
                  <input
                    [type]="event().isAllDay ? 'date' : 'datetime-local'"
                    class="c-input--text"
                    [value]="event().startDate"
                    (input)="updateField('startDate', $any($event.target).value)" />
                </div>
                <div class="form-group">
                  <label class="form-label">Ends *</label>
                  <input
                    [type]="event().isAllDay ? 'date' : 'datetime-local'"
                    class="c-input--text"
                    [value]="event().endDate"
                    (input)="updateField('endDate', $any($event.target).value)" />
                </div>
              </div>

              <!-- All Day & Timezone -->
              <div class="checkbox-row g--margin-bottom-3">
                <label class="toggle-label">
                  <input
                    type="checkbox"
                    [checked]="event().isAllDay"
                    (change)="toggleAllDay($any($event.target).checked)" />
                  <span>All-day event</span>
                </label>
              </div>

              <!-- Location / Video Link -->
              <div class="form-group g--margin-bottom-3">
                <label class="form-label">Location or Meeting URL</label>
                <input
                  type="text"
                  class="c-input--text"
                  [value]="event().location || ''"
                  (input)="updateField('location', $any($event.target).value)"
                  placeholder="e.g. https://zoom.us/j/... or Room 302" />
              </div>

              <!-- Recurrence -->
              <div class="form-group g--margin-bottom-3">
                <label class="form-label">Recurrence Rule</label>
                <select
                  class="c-select"
                  style="width: 100%;"
                  [value]="event().recurrence || 'none'"
                  (change)="updateField('recurrence', $any($event.target).value)">
                  <option value="none">One-time event (No repeat)</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <!-- Description -->
              <div class="form-group">
                <label class="form-label">Description / Agenda Notes</label>
                <textarea
                  rows="4"
                  class="c-textarea"
                  [value]="event().description || ''"
                  (input)="updateField('description', $any($event.target).value)"
                  placeholder="Add details, call links, or agenda topics..."></textarea>
              </div>
            </app-card>

            <!-- Sidebar Ad Slot (300x250) -->
            <div class="g--margin-bottom-4 g--text-center print-hidden">
              <div
                class="ad-slot ad-slot--sidebar"
                style="max-width: 300px; height: 250px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
                <span>SPONSOR (300&times;250)</span>
              </div>
            </div>
          </div>

          <!-- Right Column: Live Previews & Code Exporter -->
          <div class="cal-preview-col">
            <!-- Event Live Card & Provider Links -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Live Calendar Links</h3>
                <app-button
                  variant="primary"
                  size="small"
                  (clicked)="downloadIcsFile()">
                  ⬇ Download .ics File
                </app-button>
              </div>

              <!-- Event Summary Banner -->
              <div class="event-summary-card g--margin-top-3 g--margin-bottom-4">
                <div class="event-icon-badge">📅</div>
                <div class="event-summary-details">
                  <h4 class="event-summary-title">{{ event().title || 'Untitled Event' }}</h4>
                  <div class="event-meta-line">
                    <span>🕒 {{ event().startDate }} &rarr; {{ event().endDate }}</span>
                    @if (event().location) {
                      <span class="meta-dot">&bull;</span>
                      <span>📍 {{ event().location }}</span>
                    }
                  </div>
                </div>
              </div>

              <!-- Provider Link Grid -->
              <div class="provider-grid">
                <!-- Google Calendar -->
                <div class="provider-item">
                  <div class="provider-info">
                    <span class="provider-badge google-badge">Google</span>
                    <span class="provider-name">Google Calendar</span>
                  </div>
                  <div class="provider-actions">
                    <a
                      [href]="calendarUrls().google"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="provider-open-btn">
                      Open ↗
                    </a>
                    <button
                      type="button"
                      class="provider-copy-btn"
                      (click)="copyProviderUrl('google')">
                      {{ copiedKey() === 'google' ? '✓ Copied' : 'Copy Link' }}
                    </button>
                  </div>
                </div>

                <!-- Outlook Live -->
                <div class="provider-item">
                  <div class="provider-info">
                    <span class="provider-badge outlook-badge">Outlook</span>
                    <span class="provider-name">Outlook Web (Live)</span>
                  </div>
                  <div class="provider-actions">
                    <a
                      [href]="calendarUrls().outlook"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="provider-open-btn">
                      Open ↗
                    </a>
                    <button
                      type="button"
                      class="provider-copy-btn"
                      (click)="copyProviderUrl('outlook')">
                      {{ copiedKey() === 'outlook' ? '✓ Copied' : 'Copy Link' }}
                    </button>
                  </div>
                </div>

                <!-- Office 365 -->
                <div class="provider-item">
                  <div class="provider-info">
                    <span class="provider-badge office-badge">O365</span>
                    <span class="provider-name">Office 365 (Work / School)</span>
                  </div>
                  <div class="provider-actions">
                    <a
                      [href]="calendarUrls().office365"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="provider-open-btn">
                      Open ↗
                    </a>
                    <button
                      type="button"
                      class="provider-copy-btn"
                      (click)="copyProviderUrl('office365')">
                      {{ copiedKey() === 'office365' ? '✓ Copied' : 'Copy Link' }}
                    </button>
                  </div>
                </div>

                <!-- Yahoo Calendar -->
                <div class="provider-item">
                  <div class="provider-info">
                    <span class="provider-badge yahoo-badge">Yahoo</span>
                    <span class="provider-name">Yahoo Calendar</span>
                  </div>
                  <div class="provider-actions">
                    <a
                      [href]="calendarUrls().yahoo"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="provider-open-btn">
                      Open ↗
                    </a>
                    <button
                      type="button"
                      class="provider-copy-btn"
                      (click)="copyProviderUrl('yahoo')">
                      {{ copiedKey() === 'yahoo' ? '✓ Copied' : 'Copy Link' }}
                    </button>
                  </div>
                </div>
              </div>
            </app-card>

            <!-- Embed Code Snippets Card -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <div class="snippet-tabs-nav">
                  <button
                    type="button"
                    class="snippet-tab-btn"
                    [class.is-active]="activeTab() === 'links'"
                    (click)="setActiveTab('links')">
                    All Direct URLs
                  </button>
                  <button
                    type="button"
                    class="snippet-tab-btn"
                    [class.is-active]="activeTab() === 'html'"
                    (click)="setActiveTab('html')">
                    Email HTML Embed
                  </button>
                  <button
                    type="button"
                    class="snippet-tab-btn"
                    [class.is-active]="activeTab() === 'markdown'"
                    (click)="setActiveTab('markdown')">
                    Markdown Links
                  </button>
                  <button
                    type="button"
                    class="snippet-tab-btn"
                    [class.is-active]="activeTab() === 'ics'"
                    (click)="setActiveTab('ics')">
                    Raw .ics File
                  </button>
                </div>

                <app-button
                  [variant]="copiedKey() === 'snippet' ? 'secondary' : 'outline'"
                  size="small"
                  (clicked)="copyActiveSnippet()">
                  {{ copiedKey() === 'snippet' ? '✓ Copied!' : '📋 Copy Snippet' }}
                </app-button>
              </div>

              <!-- Code Box -->
              <div class="code-snippet-box">
                <pre class="code-snippet-pre"><code>{{ activeSnippet() }}</code></pre>
              </div>
            </app-card>
          </div>
        </div>
      </div>

      <!-- Export Success Ad Modal -->
      @if (showExportModal()) {
        <div class="c-modal" (click)="closeExportModal()">
          <div class="c-modal__backdrop"></div>
          <div class="c-modal__dialog" (click)="$event.stopPropagation()">
            <div class="c-modal__header">
              <h3 class="c-modal__title">
                .ics Calendar File Downloaded! 🎉
              </h3>
              <button
                type="button"
                style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-muted);"
                (click)="closeExportModal()">
                &times;
              </button>
            </div>
            <div class="c-modal__body g--text-center">
              <p style="color: var(--color-text-muted); font-size: 0.9375rem; margin-bottom: 16px;">
                Your universal .ics file was generated completely in-browser and downloaded to your device with 0 network calls.
              </p>

              <!-- Modal Ad Slot (300x250) -->
              <div
                class="ad-slot ad-slot--modal"
                style="max-width: 300px; height: 250px; margin: 0 auto 16px; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
                <span>SPONSOR (300&times;250)</span>
              </div>

              <app-button
                variant="primary"
                (clicked)="closeExportModal()">
                Done
              </app-button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cal-studio-grid {
      display: grid;
      grid-template-columns: 460px 1fr;
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .cal-studio-grid { grid-template-columns: 1fr; }
    }
    .c-card__header-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text);
    }
    .c-input--text {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.875rem;
    }
    .c-textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.875rem;
      resize: vertical;
      font-family: inherit;
    }
    .c-select {
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.875rem;
    }
    .dates-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .checkbox-row {
      display: flex;
      align-items: center;
    }
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--color-text);
      cursor: pointer;
    }
    .event-summary-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }
    .event-icon-badge {
      font-size: 1.75rem;
    }
    .event-summary-details {
      flex: 1;
      overflow: hidden;
    }
    .event-summary-title {
      margin: 0 0 4px 0;
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .event-meta-line {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .meta-dot { opacity: 0.5; }
    .provider-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .provider-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }
    .provider-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .provider-badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
      color: #fff;
    }
    .google-badge { background: #4285f4; }
    .outlook-badge { background: #0078d4; }
    .office-badge { background: #d83b01; }
    .yahoo-badge { background: #6001d2; }
    .provider-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text);
    }
    .provider-actions {
      display: flex;
      gap: 8px;
    }
    .provider-open-btn, .provider-copy-btn {
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .provider-open-btn {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      &:hover { border-color: var(--color-primary); }
    }
    .provider-copy-btn {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.25);
      color: var(--color-primary);
      &:hover { background: rgba(59, 130, 246, 0.18); }
    }
    .snippet-tabs-nav {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .snippet-tab-btn {
      padding: 6px 10px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-muted);
      cursor: pointer;
      &.is-active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
      }
    }
    .code-snippet-box {
      background: #0f172a;
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      max-height: 280px;
    }
    .code-snippet-pre {
      margin: 0;
      font-family: 'Fira Code', monospace;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: #e2e8f0;
      white-space: pre;
    }
  `],
})
export class CalendarLinkerComponent implements OnDestroy {
  readonly event = signal<CalendarEvent>({ ...DEFAULT_CALENDAR_EVENT });
  readonly activeTab = signal<EmbedSnippetType>('links');
  readonly copiedKey = signal<string | null>(null);
  readonly showExportModal = signal<boolean>(false);

  private copyTimeout: any = null;

  readonly calendarUrls = computed(() => generateCalendarUrls(this.event()));
  readonly icsContent = computed(() => generateIcsFile(this.event()));
  readonly htmlSnippet = computed(() =>
    generateHtmlEmbed(this.event(), this.calendarUrls())
  );
  readonly markdownSnippet = computed(() =>
    generateMarkdownEmbed(this.event(), this.calendarUrls())
  );

  readonly activeSnippet = computed(() => {
    const tab = this.activeTab();
    if (tab === 'html') return this.htmlSnippet();
    if (tab === 'markdown') return this.markdownSnippet();
    if (tab === 'ics') return this.icsContent();

    // Default 'links' tab: list of all urls
    const urls = this.calendarUrls();
    return `Google Calendar:
${urls.google}

Outlook Web:
${urls.outlook}

Office 365:
${urls.office365}

Yahoo Calendar:
${urls.yahoo}`;
  });

  updateField<K extends keyof CalendarEvent>(
    key: K,
    value: CalendarEvent[K]
  ): void {
    this.event.update((e) => ({ ...e, [key]: value }));
  }

  toggleAllDay(checked: boolean): void {
    this.event.update((e) => ({ ...e, isAllDay: checked }));
  }

  loadDemoEvent(): void {
    this.event.set({ ...DEFAULT_CALENDAR_EVENT });
  }

  setActiveTab(tab: EmbedSnippetType): void {
    this.activeTab.set(tab);
  }

  async copyProviderUrl(
    provider: 'google' | 'outlook' | 'office365' | 'yahoo'
  ): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(this.calendarUrls()[provider]);
        this.triggerCopyFeedback(provider);
      }
    } catch (e) {
      console.error('Failed to copy provider link', e);
    }
  }

  async copyActiveSnippet(): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(this.activeSnippet());
        this.triggerCopyFeedback('snippet');
      }
    } catch (e) {
      console.error('Failed to copy snippet', e);
    }
  }

  async downloadIcsFile(): Promise<void> {
    const ics = this.icsContent();
    const blob = exportIcsBlob(ics);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = this.calendarUrls().icsDownloadFilename;
    a.click();
    URL.revokeObjectURL(url);

    this.showExportModal.set(true);
  }

  closeExportModal(): void {
    this.showExportModal.set(false);
  }

  private triggerCopyFeedback(key: string): void {
    this.copiedKey.set(key);
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    this.copyTimeout = setTimeout(() => this.copiedKey.set(null), 2500);
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }
}
