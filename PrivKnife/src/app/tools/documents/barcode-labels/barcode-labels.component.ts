import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import {
  calculateLabelPositions,
  generateBarcodeDataUri,
  generateLabelSheetPdf,
  generateSequenceItems,
  getPresetTemplate,
  parseCsvItems,
} from './engine';
import {
  DEFAULT_SHEET_CONFIG,
  STANDARD_LABEL_TEMPLATES,
} from './test-fixtures';
import {
  BarcodeSymbology,
  DataInputMode,
  LabelItem,
  LabelPosition,
  LabelSheetConfig,
  LabelTemplate,
  SequenceConfig,
} from './types';

@Component({
  selector: 'app-barcode-labels',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, Dropzone, FormsModule],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1400px; padding: 0 16px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 8px;">
          Avery® Barcode &amp; Label Sheet Generator
        </h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 800px; margin: 0 auto;">
          Generate high-precision, grid-aligned sticker sheets for standard Avery® labels with Code128, QR codes, EAN-13, and custom inventory sequences.
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

      <!-- Mobile Tab Switcher -->
      <div class="l-columns__area mobile-tab-bar g--margin-bottom-4 print-hidden">
        <div class="g--flex-center" style="gap: 8px;">
          <button
            type="button"
            class="c-button c-button--small"
            [class.c-button--primary]="activeMobileTab() === 'controls'"
            [class.c-button--outline]="activeMobileTab() !== 'controls'"
            (click)="setMobileTab('controls')"
            style="flex: 1;">
            ⚙️ Label Settings
          </button>
          <button
            type="button"
            class="c-button c-button--small"
            [class.c-button--primary]="activeMobileTab() === 'preview'"
            [class.c-button--outline]="activeMobileTab() !== 'preview'"
            (click)="setMobileTab('preview')"
            style="flex: 1;">
            👁️ Sheet Preview
          </button>
        </div>
      </div>

      <!-- Main Two-Column Layout -->
      <div class="l-columns l-columns--2 barcode-workspace" style="gap: 28px; align-items: start;">
        
        <!-- LEFT COLUMN: Configurator Sidebar -->
        <div
          class="l-columns__area controls-pane print-hidden"
          [class.mobile-hidden]="activeMobileTab() === 'preview'">

          <!-- Avery Template Preset -->
          <div class="g--margin-bottom-4">
            <app-card title="1. Avery® Template Preset">
              <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap; justify-content: flex-start;">
                @for (preset of templates; track preset.id) {
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="selectedTemplate().id === preset.id"
                    [class.c-button--outline]="selectedTemplate().id !== preset.id"
                    (click)="selectTemplate(preset.id)">
                    {{ preset.name }}
                  </button>
                }
              </div>
              <p class="g--margin-top-2" style="font-size: 0.8125rem; color: var(--color-text-muted);">
                {{ selectedTemplate().description }} ({{ selectedTemplate().columns }} cols &times; {{ selectedTemplate().rows }} rows)
              </p>
            </app-card>
          </div>

          <!-- Barcode Symbology -->
          <div class="g--margin-bottom-4">
            <app-card title="2. Barcode Symbology">
              <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap; justify-content: flex-start;">
                @for (sym of symbologies; track sym.id) {
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().symbology === sym.id"
                    [class.c-button--outline]="config().symbology !== sym.id"
                    (click)="setSymbology(sym.id)">
                    {{ sym.label }}
                  </button>
                }
              </div>
            </app-card>
          </div>

          <!-- Data Input Mode -->
          <div class="g--margin-bottom-4">
            <app-card title="3. Label Data Source">
              <div class="g--flex-center g--margin-bottom-3" style="gap: 8px;">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="config().dataMode === 'single'"
                  [class.c-button--outline]="config().dataMode !== 'single'"
                  (click)="setDataMode('single')"
                  style="flex: 1;">
                  Single Barcode
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="config().dataMode === 'sequence'"
                  [class.c-button--outline]="config().dataMode !== 'sequence'"
                  (click)="setDataMode('sequence')"
                  style="flex: 1;">
                  Sequential
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="config().dataMode === 'csv'"
                  [class.c-button--outline]="config().dataMode !== 'csv'"
                  (click)="setDataMode('csv')"
                  style="flex: 1;">
                  CSV / Spreadsheet
                </button>
              </div>

              <!-- SINGLE MODE -->
              @if (config().dataMode === 'single') {
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  <div>
                    <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Barcode Value / SKU *
                    </label>
                    <input
                      type="text"
                      class="c-input"
                      [value]="config().singleItem.value"
                      (input)="updateSingleItem('value', $any($event.target).value)"
                      placeholder="e.g. SKU-10042"
                      style="width: 100%;" />
                  </div>
                  <div>
                    <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Top Header / Title (Optional)
                    </label>
                    <input
                      type="text"
                      class="c-input"
                      [value]="config().singleItem.title || ''"
                      (input)="updateSingleItem('title', $any($event.target).value)"
                      placeholder="e.g. Acme Premium Widget"
                      style="width: 100%;" />
                  </div>
                  <div>
                    <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Bottom Subtext / Price (Optional)
                    </label>
                    <input
                      type="text"
                      class="c-input"
                      [value]="config().singleItem.subtext || ''"
                      (input)="updateSingleItem('subtext', $any($event.target).value)"
                      placeholder="e.g. $24.99 • In Stock"
                      style="width: 100%;" />
                  </div>
                </div>
              }

              <!-- SEQUENCE MODE -->
              @if (config().dataMode === 'sequence') {
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                      <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                        Prefix
                      </label>
                      <input
                        type="text"
                        class="c-input"
                        [value]="config().sequenceConfig.prefix"
                        (input)="updateSequenceConfig({ prefix: $any($event.target).value })"
                        placeholder="INV-"
                        style="width: 100%;" />
                    </div>
                    <div>
                      <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                        Start Number
                      </label>
                      <input
                        type="number"
                        class="c-input"
                        [value]="config().sequenceConfig.startNumber"
                        (input)="updateSequenceConfig({ startNumber: +$any($event.target).value })"
                        style="width: 100%;" />
                    </div>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                      <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                        Zero Padding Digits
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        class="c-input"
                        [value]="config().sequenceConfig.digits"
                        (input)="updateSequenceConfig({ digits: +$any($event.target).value })"
                        style="width: 100%;" />
                    </div>
                    <div>
                      <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                        Suffix
                      </label>
                      <input
                        type="text"
                        class="c-input"
                        [value]="config().sequenceConfig.suffix"
                        (input)="updateSequenceConfig({ suffix: $any($event.target).value })"
                        style="width: 100%;" />
                    </div>
                  </div>
                  <div>
                    <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Shared Top Header (Optional)
                    </label>
                    <input
                      type="text"
                      class="c-input"
                      [value]="config().singleItem.title || ''"
                      (input)="updateSingleItem('title', $any($event.target).value)"
                      placeholder="e.g. Warehouse Inventory"
                      style="width: 100%;" />
                  </div>
                </div>
              }

              <!-- CSV MODE -->
              @if (config().dataMode === 'csv') {
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  <app-dropzone
                    accept=".csv,text/csv,text/plain"
                    title="Drop CSV inventory file here"
                    subtitle="Format: Title, BarcodeValue, Subtext"
                    (filesSelected)="onFilesSelected($event)" />

                  @if (csvFileName()) {
                    <p style="font-size: 0.8125rem; color: var(--color-success, #10b981);">
                      Loaded file: <strong>{{ csvFileName() }}</strong> ({{ computedItems().length }} items)
                    </p>
                  }

                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                        Or Paste CSV / Tab-Delimited Data
                      </label>
                      <button
                        type="button"
                        class="c-button c-button--ghost c-button--small"
                        (click)="loadSampleCsv()"
                        style="padding: 2px 6px; font-size: 0.75rem;">
                        Load Sample CSV
                      </button>
                    </div>
                    <textarea
                      class="c-input"
                      rows="4"
                      [value]="csvText()"
                      (input)="setCsvText($any($event.target).value)"
                      placeholder="Product,Barcode,Price&#10;Widget 1,SKU-001,$19.99&#10;Widget 2,SKU-002,$24.99"
                      style="width: 100%; font-family: monospace; font-size: 0.8125rem;"></textarea>
                  </div>
                </div>
              }
            </app-card>
          </div>

          <!-- Printing & Partial Sheet Reuse -->
          <div class="g--margin-bottom-4">
            <app-card title="4. Sheet Layout &amp; Reuse Options">
              <!-- Start Offset -->
              <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <label class="c-input__label" style="font-size: 0.8125rem; font-weight: 600;">
                    Start Printing at Label # (Reuse partially used sheets)
                  </label>
                  <span style="font-size: 0.8125rem; font-weight: 700; color: var(--color-primary);">
                    Slot {{ config().startOffsetIndex + 1 }} of {{ positions().length }}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  [max]="positions().length - 1"
                  [value]="config().startOffsetIndex"
                  (input)="setStartOffsetIndex(+$any($event.target).value)"
                  style="width: 100%; accent-color: var(--color-primary);" />
                <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 4px;">
                  Skip the first {{ config().startOffsetIndex }} empty slots on already used sticker paper.
                </p>
              </div>

              <!-- Toggles -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem;">
                  <input
                    type="checkbox"
                    [checked]="config().showGuideLines"
                    (change)="toggleGuideLines()" />
                  Show Label Cut / Alignment Outline Borders
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem;">
                  <input
                    type="checkbox"
                    [checked]="config().showHumanReadableBarcode"
                    (change)="toggleHumanReadable()" />
                  Include Human-Readable Numbers below Barcode
                </label>
              </div>
            </app-card>
          </div>

          <!-- Action Buttons -->
          <div class="g--margin-bottom-4" style="display: flex; flex-direction: column; gap: 10px;">
            <app-button
              variant="primary"
              size="large"
              [loading]="generatingPdf()"
              (clicked)="downloadPdf()"
              customClass="g--width-full">
              📥 Download Print-Ready PDF
            </app-button>
            <app-button
              variant="outline"
              size="normal"
              (clicked)="resetToDefaults()"
              customClass="g--width-full">
              ↺ Reset to Defaults
            </app-button>
          </div>

          <!-- Sidebar Ad Slot (300x250) -->
          <div class="g--margin-bottom-4 g--text-center">
            <div
              class="ad-slot ad-slot--sidebar"
              style="width: 300px; height: 250px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
              <span>Responsive Ad Placement (300x250 Medium Rectangle)</span>
            </div>
          </div>

          <!-- Legal Avery Disclaimer -->
          <p style="font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.4; border-top: 1px solid var(--color-border-subtle); padding-top: 12px;">
            *Avery&reg; and Avery product numbers are registered trademarks of CCL Label, Inc. PrivKnife is an independent software tool and is not affiliated with, endorsed by, or sponsored by Avery or CCL Label, Inc. Dimensions and layout templates are provided solely for compatibility and alignment.
          </p>
        </div>

        <!-- RIGHT COLUMN: Sheet Live Preview -->
        <div
          class="l-columns__area preview-pane"
          [class.mobile-hidden]="activeMobileTab() === 'controls'">
          
          <app-card [title]="previewSheetTitle()">
            <div
              class="sheet-preview-container"
              style="background: #e2e8f0; padding: 20px; border-radius: var(--radius-md); display: flex; justify-content: center; overflow-x: auto;">
              
              <!-- Printable Sheet Canvas Simulated Page -->
              <div
                class="simulated-sheet"
                [style.aspect-ratio]="sheetAspectRatio()"
                [style.grid-template-columns]="'repeat(' + selectedTemplate().columns + ', 1fr)'"
                [style.grid-template-rows]="'repeat(' + selectedTemplate().rows + ', 1fr)'"
                style="
                  width: 100%;
                  max-width: 620px;
                  background: #ffffff;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
                  border-radius: 2px;
                  display: grid;
                  gap: 4px;
                  padding: 12px;
                  box-sizing: border-box;
                ">
                
                @for (pos of positions(); track pos.index) {
                  @if (pos.index < config().startOffsetIndex) {
                    <!-- Skipped Label Slot -->
                    <div
                      class="label-slot label-slot--skipped"
                      style="
                        border: 1px dashed #cbd5e1;
                        background: #f8fafc;
                        border-radius: 3px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: #94a3b8;
                        font-size: 0.65rem;
                        min-height: 40px;
                        user-select: none;
                      ">
                      <span>#{{ pos.index + 1 }}</span>
                      <span>(Skipped)</span>
                    </div>
                  } @else {
                    <!-- Active Label Slot -->
                    @let item = getLabelItemForSlot(pos.index);
                    <div
                      class="label-slot label-slot--active"
                      [style.border]="config().showGuideLines ? '1px solid #e2e8f0' : '1px dashed transparent'"
                      style="
                        background: #ffffff;
                        border-radius: 3px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: space-between;
                        padding: 4px;
                        min-height: 40px;
                        box-sizing: border-box;
                        overflow: hidden;
                      ">
                      
                      @if (item.title) {
                        <div style="font-size: 0.625rem; font-weight: 700; color: #0f172a; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
                          {{ item.title }}
                        </div>
                      }

                      <!-- Barcode Graphic Preview -->
                      <div style="flex: 1; display: flex; align-items: center; justify-content: center; max-height: 48px; width: 100%;">
                        @let uri = previewDataUrls().get(item.value);
                        @if (uri) {
                          <img
                            [src]="uri"
                            alt="Barcode Preview"
                            style="max-height: 100%; max-width: 90%; object-fit: contain;" />
                        } @else {
                          <div style="height: 24px; width: 80%; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 4px);"></div>
                        }
                      </div>

                      @if (config().showHumanReadableBarcode && config().symbology !== 'QR') {
                        <div style="font-family: monospace; font-size: 0.5625rem; color: #334155; text-align: center;">
                          {{ item.value }}
                        </div>
                      }

                      @if (item.subtext) {
                        <div style="font-size: 0.5625rem; color: #64748b; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
                          {{ item.subtext }}
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </div>
          </app-card>
        </div>
      </div>
    </div>

    <!-- Post-Download Confirmation Modal -->
    @if (showDownloadModal()) {
      <div
        class="modal-backdrop"
        style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;">
        <div
          class="modal-card"
          style="background: #ffffff; border-radius: var(--radius-lg, 12px); max-width: 500px; width: 100%; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
          
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="font-size: 2rem;">✅</div>
            <div>
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Print-Ready PDF Downloaded!</h3>
              <p style="margin: 0; font-size: 0.875rem; color: var(--color-text-muted);">
                Your label sheet was compiled in-browser at 100% vector resolution.
              </p>
            </div>
          </div>

          <!-- Crucial Printer Scaling Alert -->
          <div
            style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 0.8125rem; color: #92400e;">
            <strong>⚠️ Crucial Printer Setting:</strong> When printing from Adobe Acrobat or your browser, select <strong>Actual Size</strong> or set Page Scale to <strong>100%</strong>. Never choose "Fit to Page", or labels will misalign with sticker cuts!
          </div>

          <!-- Modal Ad Slot -->
          <div
            class="ad-slot ad-slot--modal"
            style="width: 100%; height: 120px; background: var(--color-bg-subtle, #f8fafc); border: 1px dashed var(--color-border-subtle, #cbd5e1); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--color-text-muted, #94a3b8); font-size: 0.75rem; margin-bottom: 16px;">
            <span>Responsive Ad Placement</span>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <app-button variant="primary" (clicked)="closeDownloadModal()">
              Done
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .mobile-tab-bar {
        display: none;
      }

      @media (max-width: 900px) {
        .mobile-tab-bar {
          display: block;
        }

        .mobile-hidden {
          display: none !important;
        }

        .barcode-workspace {
          grid-template-columns: 1fr !important;
        }
      }
    `,
  ],
})
export class BarcodeLabelsComponent {
  readonly templates = STANDARD_LABEL_TEMPLATES;
  readonly symbologies: { id: BarcodeSymbology; label: string }[] = [
    { id: 'CODE128', label: 'Code 128' },
    { id: 'EAN13', label: 'EAN-13' },
    { id: 'UPC', label: 'UPC-A' },
    { id: 'CODE39', label: 'Code 39' },
    { id: 'QR', label: 'QR Code' },
  ];

  // Config State
  readonly config = signal<LabelSheetConfig>({
    ...DEFAULT_SHEET_CONFIG,
    items: [...DEFAULT_SHEET_CONFIG.items],
  });

  readonly csvText = signal<string>('');
  readonly csvFileName = signal<string>('');
  readonly generatingPdf = signal<boolean>(false);
  readonly showDownloadModal = signal<boolean>(false);
  readonly activeMobileTab = signal<'controls' | 'preview'>('controls');
  readonly previewDataUrls = signal<Map<string, string>>(new Map());

  // Computed state
  readonly selectedTemplate = computed<LabelTemplate>(() => this.config().template);
  readonly positions = computed<LabelPosition[]>(() =>
    calculateLabelPositions(this.selectedTemplate())
  );

  readonly sheetAspectRatio = computed<string>(() => {
    const tmpl = this.selectedTemplate();
    return `${tmpl.paperWidthMm} / ${tmpl.paperHeightMm}`;
  });

  readonly previewSheetTitle = computed<string>(() => {
    const tmpl = this.selectedTemplate();
    const total = tmpl.columns * tmpl.rows;
    return `Preview: ${tmpl.name} (${total} Labels on ${tmpl.paperFormat.toUpperCase()})`;
  });

  readonly computedItems = computed<LabelItem[]>(() => {
    const cfg = this.config();
    const totalSlots = this.positions().length;

    if (cfg.dataMode === 'single') {
      return Array(totalSlots).fill(cfg.singleItem);
    }

    if (cfg.dataMode === 'sequence') {
      const seq = cfg.sequenceConfig;
      const count = Math.max(seq.count, totalSlots);
      const seqItems = generateSequenceItems(
        seq.prefix,
        seq.startNumber,
        count,
        seq.digits,
        seq.suffix
      );
      // Attach singleItem's title/subtext if provided
      return seqItems.map((item) => ({
        ...item,
        title: cfg.singleItem.title,
        subtext: cfg.singleItem.subtext,
      }));
    }

    // CSV Mode
    const parsed = parseCsvItems(this.csvText());
    if (parsed.length > 0) {
      return parsed;
    }
    return [cfg.singleItem];
  });

  constructor() {
    // Regenerate preview barcode images whenever items, symbology, or showText change
    effect(async () => {
      const items = this.computedItems();
      const symbology = this.config().symbology;
      const showText = this.config().showHumanReadableBarcode;

      const urlMap = new Map<string, string>();
      const uniqueValues = Array.from(new Set(items.map((i) => i.value))).slice(0, 40);

      for (const val of uniqueValues) {
        try {
          const uri = await generateBarcodeDataUri(val, symbology, { showText });
          urlMap.set(val, uri);
        } catch {
          // ignore rendering fallback
        }
      }

      this.previewDataUrls.set(urlMap);
    });
  }

  setMobileTab(tab: 'controls' | 'preview'): void {
    this.activeMobileTab.set(tab);
  }

  selectTemplate(templateId: string): void {
    const tmpl = getPresetTemplate(templateId);
    this.config.update((c) => ({
      ...c,
      template: tmpl,
      startOffsetIndex: 0,
    }));
  }

  setSymbology(symbology: BarcodeSymbology): void {
    this.config.update((c) => ({ ...c, symbology }));
  }

  setDataMode(dataMode: DataInputMode): void {
    this.config.update((c) => ({ ...c, dataMode }));
  }

  updateSingleItem(field: 'value' | 'title' | 'subtext', val: string): void {
    this.config.update((c) => ({
      ...c,
      singleItem: {
        ...c.singleItem,
        [field]: val,
      },
    }));
  }

  setStartOffsetIndex(index: number): void {
    const maxIdx = Math.max(0, this.positions().length - 1);
    const safeIdx = Math.min(Math.max(0, index), maxIdx);
    this.config.update((c) => ({ ...c, startOffsetIndex: safeIdx }));
  }

  updateSequenceConfig(patch: Partial<SequenceConfig>): void {
    this.config.update((c) => ({
      ...c,
      sequenceConfig: {
        ...c.sequenceConfig,
        ...patch,
      },
    }));
  }

  setCsvText(text: string): void {
    this.csvText.set(text);
  }

  loadSampleCsv(): void {
    const sample = `Product,Barcode,Price
Wireless Keyboard,SKU-8921-A,$49.99
Ergonomic Mouse,SKU-8921-B,$29.99
USB-C Fast Charger,SKU-8921-C,$19.99
Braided HDMI Cable,SKU-8921-D,$12.50
Noise-Canceling Pods,SKU-8921-E,$89.00
Mechanical Numpad,SKU-8921-F,$34.00`;
    this.setCsvText(sample);
  }

  async onFilesSelected(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.csvFileName.set(file.name);
    try {
      const text = await file.text();
      this.setCsvText(text);
    } catch {
      // ignore
    }
  }

  toggleGuideLines(): void {
    this.config.update((c) => ({ ...c, showGuideLines: !c.showGuideLines }));
  }

  toggleHumanReadable(): void {
    this.config.update((c) => ({
      ...c,
      showHumanReadableBarcode: !c.showHumanReadableBarcode,
    }));
  }

  getLabelItemForSlot(slotIndex: number): LabelItem {
    const offset = this.config().startOffsetIndex;
    const items = this.computedItems();
    if (items.length === 0) return this.config().singleItem;

    const itemIdx = slotIndex - offset;
    return items[itemIdx % items.length];
  }

  async downloadPdf(): Promise<void> {
    this.generatingPdf.set(true);
    try {
      const currentConfig: LabelSheetConfig = {
        ...this.config(),
        items: this.computedItems(),
      };

      const result = await generateLabelSheetPdf(currentConfig);
      const url = URL.createObjectURL(result.blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${this.selectedTemplate().id}-labels.pdf`;
      anchor.click();

      // Memory hygiene: immediately revoke object URL
      URL.revokeObjectURL(url);

      this.showDownloadModal.set(true);
    } finally {
      this.generatingPdf.set(false);
    }
  }

  closeDownloadModal(): void {
    this.showDownloadModal.set(false);
  }

  resetToDefaults(): void {
    this.config.set({
      ...DEFAULT_SHEET_CONFIG,
      items: [...DEFAULT_SHEET_CONFIG.items],
    });
    this.csvText.set('');
    this.csvFileName.set('');
  }
}
