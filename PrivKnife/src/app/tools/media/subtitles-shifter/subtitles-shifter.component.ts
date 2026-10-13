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
  applyTimeShift,
  exportSubtitleBlob,
  formatTimestamp,
  parseSubtitles,
  serializeSubtitles,
} from './engine';
import { FPS_PRESETS, SAMPLE_CUES, SAMPLE_SRT } from './test-fixtures';
import {
  FpsPreset,
  ShiftDirection,
  SubtitleCue,
  SubtitleFormat,
  TimeUnit,
} from './types';

@Component({
  selector: 'app-subtitles-shifter',
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
          Subtitles Timestamp Shifter &amp; SRT/VTT Converter
        </h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 820px; margin: 0 auto; line-height: 1.6;">
          Fix out-of-sync movie subtitles, apply millisecond offsets, convert frame rates (FPS),
          and switch between SRT and WebVTT formats instantly. Completely offline in your browser.
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
        <div class="subs-studio-grid">
          <!-- Left Column: Controls & Ingestion -->
          <div class="subs-controls-col">
            <!-- File Ingestion Card -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">1. Ingest Subtitle File</h3>
                <app-button
                  variant="outline"
                  size="small"
                  (clicked)="loadDemoSubtitles()">
                  📄 Load Demo
                </app-button>
              </div>

              <div class="g--margin-top-3">
                <app-dropzone
                  accept=".srt,.vtt,text/plain"
                  [multiple]="false"
                  title="Drop your .srt or .vtt file here"
                  subtitle="Processed 100% locally with zero server upload"
                  (filesSelected)="onFileSelected($event)" />
              </div>

              <div class="file-status-bar g--margin-top-3">
                <span class="file-name-text">📁 {{ fileName() }}</span>
                <span class="c-badge c-badge--neutral">
                  {{ cues().length }} Cues ({{ sourceFormat().toUpperCase() }})
                </span>
              </div>
            </app-card>

            <!-- Time Shift & FPS Offset Controls -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">2. Time Shifting</h3>
                <app-button
                  variant="outline"
                  size="small"
                  [disabled]="totalOffsetMs() === 0 && activeFpsPresetId() === 'none'"
                  (clicked)="resetOffset()">
                  ↺ Reset
                </app-button>
              </div>

              <!-- Direction & Time Input -->
              <div class="shift-input-cluster g--margin-top-3 g--margin-bottom-3">
                <div class="direction-toggle-group">
                  <button
                    type="button"
                    class="dir-toggle-btn"
                    [class.is-active]="direction() === 'forward'"
                    (click)="setDirection('forward')">
                    + Forward (Delay)
                  </button>
                  <button
                    type="button"
                    class="dir-toggle-btn"
                    [class.is-active]="direction() === 'backward'"
                    (click)="setDirection('backward')">
                    - Backward (Earlier)
                  </button>
                </div>

                <div class="time-amount-row g--margin-top-3">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    [value]="offsetValue()"
                    (input)="updateOffsetValue(+$any($event.target).value)"
                    class="c-input--number"
                    placeholder="0" />

                  <select
                    class="c-select"
                    [value]="timeUnit()"
                    (change)="updateTimeUnit($any($event.target).value)">
                    <option value="ms">Milliseconds (ms)</option>
                    <option value="s">Seconds (s)</option>
                    <option value="m">Minutes (min)</option>
                  </select>
                </div>

                <div class="net-offset-readout g--margin-top-2">
                  <span>Net Applied Offset:</span>
                  <strong>{{ totalOffsetMs() >= 0 ? '+' : '' }}{{ totalOffsetMs() }} ms</strong>
                </div>
              </div>

              <!-- Quick Time Preset Chips -->
              <div class="quick-chips-wrapper g--margin-bottom-4">
                <span style="font-size: 0.75rem; color: var(--color-text-muted); display: block; margin-bottom: 6px;">
                  Quick Adjustments:
                </span>
                <div class="chips-flex">
                  <button type="button" class="quick-chip" (click)="applyQuickDelta(-1000)">-1s</button>
                  <button type="button" class="quick-chip" (click)="applyQuickDelta(-500)">-500ms</button>
                  <button type="button" class="quick-chip" (click)="applyQuickDelta(500)">+500ms</button>
                  <button type="button" class="quick-chip" (click)="applyQuickDelta(1000)">+1s</button>
                  <button type="button" class="quick-chip" (click)="applyQuickDelta(5000)">+5s</button>
                </div>
              </div>

              <!-- Frame Rate (FPS) Conversion Scaling -->
              <div class="fps-section">
                <label class="control-label" style="display: block; margin-bottom: 6px;">
                  Frame Rate (FPS) Speed Conversion:
                </label>
                <select
                  class="c-select"
                  style="width: 100%;"
                  [value]="activeFpsPresetId()"
                  (change)="setFpsPreset($any($event.target).value)">
                  <option value="none">None (Preserve Original Speed)</option>
                  @for (preset of fpsPresets; track preset.id) {
                    <option [value]="preset.id">{{ preset.name }}</option>
                  }
                </select>
              </div>
            </app-card>

            <!-- Output Format Card -->
            <app-card class="g--margin-bottom-4">
              <div card-header>
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">3. Target Format</h3>
              </div>

              <div class="format-toggle-grid g--margin-top-3">
                <button
                  type="button"
                  class="format-choice-btn"
                  [class.is-active]="targetFormat() === 'srt'"
                  (click)="setTargetFormat('srt')">
                  <strong>SRT Format</strong>
                  <span>Standard .srt file for VLC, TVs &amp; players</span>
                </button>
                <button
                  type="button"
                  class="format-choice-btn"
                  [class.is-active]="targetFormat() === 'vtt'"
                  (click)="setTargetFormat('vtt')">
                  <strong>WebVTT (.vtt)</strong>
                  <span>HTML5 video &amp; modern web streaming</span>
                </button>
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

          <!-- Right Column: Live Side-by-Side Comparison & Exporter -->
          <div class="subs-preview-col">
            <!-- Preview Stage Card -->
            <app-card class="g--margin-bottom-4">
              <div card-header class="c-card__header-flex">
                <div class="table-tabs-nav">
                  <button
                    type="button"
                    class="table-tab-btn"
                    [class.is-active]="activePreviewTab() === 'table'"
                    (click)="activePreviewTab.set('table')">
                    Side-by-Side Cues (First 25)
                  </button>
                  <button
                    type="button"
                    class="table-tab-btn"
                    [class.is-active]="activePreviewTab() === 'raw'"
                    (click)="activePreviewTab.set('raw')">
                    Raw Converted Code
                  </button>
                </div>

                <div class="export-actions-cluster">
                  <app-button
                    [variant]="copied() ? 'secondary' : 'outline'"
                    size="small"
                    (clicked)="copySubtitles()">
                    {{ copied() ? '✓ Copied!' : '📋 Copy' }}
                  </app-button>
                  <app-button
                    variant="primary"
                    size="small"
                    [disabled]="cues().length === 0"
                    (clicked)="downloadSubtitles()">
                    ⬇ Download .{{ targetFormat() }}
                  </app-button>
                </div>
              </div>

              <!-- Content Tab: Side-by-Side Table -->
              @if (activePreviewTab() === 'table') {
                <div class="table-responsive-box">
                  <table class="preview-table">
                    <thead>
                      <tr>
                        <th style="width: 44px;">#</th>
                        <th>Original Timing</th>
                        <th>Re-Synced Timing</th>
                        <th>Subtitle Text</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of previewRows(); track row.index) {
                        <tr>
                          <td class="text-center font-mono">{{ row.index }}</td>
                          <td class="timing-cell font-mono">
                            {{ row.origStart }} &rarr; {{ row.origEnd }}
                          </td>
                          <td class="timing-cell-shifted font-mono">
                            <strong>{{ row.newStart }} &rarr; {{ row.newEnd }}</strong>
                          </td>
                          <td class="cue-text-cell">{{ row.text }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <!-- Raw Text Preview Area -->
                <div class="code-snippet-box">
                  <pre class="code-snippet-pre"><code>{{ serializedOutput() }}</code></pre>
                </div>
              }
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
                Subtitle Download Started! 🎉
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
                Your re-synced subtitle file was compiled in-browser and downloaded to your device with 0 network tracking.
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
    .subs-studio-grid {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .subs-studio-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .format-toggle-grid {
        grid-template-columns: 1fr;
      }
      .direction-toggle-group {
        grid-template-columns: 1fr;
      }
      .time-amount-row {
        flex-direction: column;
      }
      .c-card__header-flex {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      .export-actions-cluster {
        width: 100%;
        justify-content: flex-end;
      }
    }
    .c-card__header-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .file-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--color-bg-subtle);
      border-radius: 6px;
      font-size: 0.8125rem;
    }
    .file-name-text {
      font-weight: 600;
      color: var(--color-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 220px;
    }
    .direction-toggle-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .dir-toggle-btn {
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-bg-subtle);
      color: var(--color-text);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      &.is-active {
        border-color: var(--color-primary);
        background: rgba(59, 130, 246, 0.1);
        color: var(--color-primary);
      }
    }
    .time-amount-row {
      display: flex;
      gap: 8px;
    }
    .c-input--number {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .c-select {
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.8125rem;
    }
    .net-offset-readout {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      strong { color: var(--color-primary); }
    }
    .chips-flex {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .quick-chip {
      padding: 4px 10px;
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text);
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover { border-color: var(--color-primary); }
    }
    .format-toggle-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .format-choice-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-bg-subtle);
      color: var(--color-text);
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      strong { font-size: 0.875rem; margin-bottom: 2px; }
      span { font-size: 0.75rem; color: var(--color-text-muted); }
      &.is-active {
        border-color: var(--color-primary);
        background: rgba(59, 130, 246, 0.08);
      }
    }
    .table-tabs-nav { display: flex; gap: 6px; }
    .table-tab-btn {
      padding: 6px 12px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      cursor: pointer;
      &.is-active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
      }
    }
    .export-actions-cluster {
      display: flex;
      gap: 8px;
    }
    .table-responsive-box {
      overflow-x: auto;
      max-height: 520px;
    }
    .preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
      th {
        padding: 8px 10px;
        text-align: left;
        background: var(--color-bg-subtle);
        border-bottom: 1px solid var(--color-border);
        color: var(--color-text-muted);
        font-weight: 600;
      }
      td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--color-border-subtle, rgba(0,0,0,0.05));
        vertical-align: top;
      }
    }
    .font-mono { font-family: 'Fira Code', monospace; font-size: 0.75rem; }
    .timing-cell { color: var(--color-text-muted); white-space: nowrap; }
    .timing-cell-shifted { color: var(--color-primary); white-space: nowrap; }
    .cue-text-cell { white-space: pre-line; line-height: 1.4; color: var(--color-text); }
    .code-snippet-box {
      background: #0f172a;
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      max-height: 520px;
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
export class SubtitlesShifterComponent implements OnDestroy {
  readonly fpsPresets = FPS_PRESETS;

  readonly cues = signal<SubtitleCue[]>(SAMPLE_CUES);
  readonly fileName = signal<string>('demo-subtitles.srt');
  readonly sourceFormat = signal<SubtitleFormat>('srt');
  readonly targetFormat = signal<SubtitleFormat>('srt');

  readonly offsetValue = signal<number>(0);
  readonly timeUnit = signal<TimeUnit>('ms');
  readonly direction = signal<ShiftDirection>('forward');
  readonly activeFpsPresetId = signal<string>('none');

  readonly copied = signal<boolean>(false);
  readonly showExportModal = signal<boolean>(false);
  readonly activePreviewTab = signal<'table' | 'raw'>('table');

  private copyTimeout: any = null;

  readonly totalOffsetMs = computed(() => {
    const val = this.offsetValue();
    const unit = this.timeUnit();
    const dir = this.direction();
    let ms = val;
    if (unit === 's') ms = val * 1000;
    if (unit === 'm') ms = val * 60000;
    return dir === 'backward' ? -Math.abs(ms) : Math.abs(ms);
  });

  readonly shiftedCues = computed(() => {
    const preset = this.fpsPresets.find(
      (p) => p.id === this.activeFpsPresetId()
    );
    return applyTimeShift(this.cues(), {
      offsetMs: this.totalOffsetMs(),
      fpsScale: preset
        ? { fromFps: preset.fromFps, toFps: preset.toFps }
        : undefined,
    });
  });

  readonly serializedOutput = computed(() => {
    return serializeSubtitles(this.shiftedCues(), this.targetFormat());
  });

  readonly previewRows = computed(() => {
    const originals = this.cues();
    const shifted = this.shiftedCues();
    const limit = Math.min(25, originals.length);
    const rows = [];
    for (let i = 0; i < limit; i++) {
      rows.push({
        index: i + 1,
        origStart: formatTimestamp(originals[i].startMs, this.sourceFormat()),
        origEnd: formatTimestamp(originals[i].endMs, this.sourceFormat()),
        newStart: formatTimestamp(shifted[i].startMs, this.targetFormat()),
        newEnd: formatTimestamp(shifted[i].endMs, this.targetFormat()),
        text: originals[i].text,
      });
    }
    return rows;
  });

  async onFileSelected(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    const text = await file.text();
    const parsed = parseSubtitles(text);

    this.fileName.set(file.name);
    this.cues.set(parsed.cues);
    this.sourceFormat.set(parsed.format);
    this.targetFormat.set(parsed.format);
  }

  loadDemoSubtitles(): void {
    const parsed = parseSubtitles(SAMPLE_SRT);
    this.fileName.set('demo-subtitles.srt');
    this.cues.set(parsed.cues);
    this.sourceFormat.set('srt');
    this.targetFormat.set('srt');
  }

  setOffset(val: number, unit: TimeUnit, direction: ShiftDirection): void {
    this.offsetValue.set(val);
    this.timeUnit.set(unit);
    this.direction.set(direction);
  }

  setDirection(direction: ShiftDirection): void {
    this.direction.set(direction);
  }

  updateOffsetValue(val: number): void {
    this.offsetValue.set(Math.max(0, val));
  }

  updateTimeUnit(unit: TimeUnit): void {
    this.timeUnit.set(unit);
  }

  applyQuickDelta(deltaMs: number): void {
    const current = this.totalOffsetMs();
    const newTotal = current + deltaMs;
    this.offsetValue.set(Math.abs(newTotal));
    this.timeUnit.set('ms');
    this.direction.set(newTotal < 0 ? 'backward' : 'forward');
  }

  resetOffset(): void {
    this.offsetValue.set(0);
    this.direction.set('forward');
    this.activeFpsPresetId.set('none');
  }

  setFpsPreset(id: string): void {
    this.activeFpsPresetId.set(id);
  }

  setTargetFormat(fmt: SubtitleFormat): void {
    this.targetFormat.set(fmt);
  }

  async copySubtitles(): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(this.serializedOutput());
        this.copied.set(true);
        if (this.copyTimeout) clearTimeout(this.copyTimeout);
        this.copyTimeout = setTimeout(() => this.copied.set(false), 2500);
      }
    } catch (e) {
      console.error('Failed to copy subtitle text', e);
    }
  }

  async downloadSubtitles(): Promise<void> {
    const content = this.serializedOutput();
    const fmt = this.targetFormat();
    const blob = exportSubtitleBlob(content, fmt);
    const url = URL.createObjectURL(blob);

    const base = this.fileName().replace(/\.[^/.]+$/, '');
    const downloadName = `${base}_resynced.${fmt}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);

    this.showExportModal.set(true);
  }

  closeExportModal(): void {
    this.showExportModal.set(false);
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }
}
