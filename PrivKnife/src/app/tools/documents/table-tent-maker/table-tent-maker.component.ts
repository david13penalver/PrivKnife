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
import {
  calculateTentGeometry,
  generateQrDataUri,
  generateTableTentPdf,
} from './engine';
import {
  DEFAULT_TENT_CONFIG,
  TENT_PRESETS,
  THEME_PRESETS,
} from './test-fixtures';
import {
  FontFamily,
  Orientation,
  PanelContent,
  PaperFormat,
  TableTentConfig,
  TentFoldType,
  TentGeometry,
} from './types';

@Component({
  selector: 'app-table-tent-maker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, FormsModule],
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
          Foldable Table Tent &amp; Counter Sign Maker
        </h1>
        <p style="color: var(--color-text-muted); font-size: 1.0625rem; max-width: 820px; margin: 0 auto;">
          Design print-ready, double-sided folding table signs, QR menus, and Wi-Fi counter cards with automatic 180° inverted top panels and millimeter crease fold lines.
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
            ⚙️ Sign Settings
          </button>
          <button
            type="button"
            class="c-button c-button--small"
            [class.c-button--primary]="activeMobileTab() === 'preview'"
            [class.c-button--outline]="activeMobileTab() !== 'preview'"
            (click)="setMobileTab('preview')"
            style="flex: 1;">
            👁️ Print Preview
          </button>
        </div>
      </div>

      <!-- Main Two-Column Layout -->
      <div class="l-columns l-columns--2 tent-workspace" style="gap: 28px; align-items: start;">
        
        <!-- LEFT COLUMN: Configurator Sidebar -->
        <div
          class="l-columns__area controls-pane print-hidden"
          [class.mobile-hidden]="activeMobileTab() === 'preview'">

          <!-- Presets -->
          <div class="g--margin-bottom-4">
            <app-card title="1. Quick Design Presets">
              <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap; justify-content: flex-start;">
                @for (preset of presets; track preset.id) {
                  <button
                    type="button"
                    class="c-button c-button--small c-button--outline"
                    [title]="preset.description"
                    (click)="applyPreset(preset.id)">
                    {{ preset.name }}
                  </button>
                }
              </div>
            </app-card>
          </div>

          <!-- Paper & Fold Configuration -->
          <div class="g--margin-bottom-4">
            <app-card title="2. Paper &amp; Fold Format">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Fold Structure
                  </label>
                  <div style="display: flex; gap: 6px;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().foldType === 'bi-fold'"
                      [class.c-button--outline]="config().foldType !== 'bi-fold'"
                      (click)="setFoldType('bi-fold')"
                      style="flex: 1;">
                      Bi-Fold (V-Card)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().foldType === 'tri-fold'"
                      [class.c-button--outline]="config().foldType !== 'tri-fold'"
                      (click)="setFoldType('tri-fold')"
                      style="flex: 1;">
                      Tri-Fold (Prism)
                    </button>
                  </div>
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Paper Size
                  </label>
                  <div style="display: flex; gap: 6px;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().paperFormat === 'a4'"
                      [class.c-button--outline]="config().paperFormat !== 'a4'"
                      (click)="setPaperFormat('a4')"
                      style="flex: 1;">
                      A4 (210×297)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().paperFormat === 'letter'"
                      [class.c-button--outline]="config().paperFormat !== 'letter'"
                      (click)="setPaperFormat('letter')"
                      style="flex: 1;">
                      Letter (8.5×11")
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                  Sheet Orientation
                </label>
                <div style="display: flex; gap: 6px;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().orientation === 'portrait'"
                    [class.c-button--outline]="config().orientation !== 'portrait'"
                    (click)="setOrientation('portrait')"
                    style="flex: 1;">
                    Vertical / Portrait
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().orientation === 'landscape'"
                    [class.c-button--outline]="config().orientation !== 'landscape'"
                    (click)="setOrientation('landscape')"
                    style="flex: 1;">
                    Horizontal / Landscape
                  </button>
                </div>
              </div>
            </app-card>
          </div>

          <!-- Content Editor -->
          <div class="g--margin-bottom-4">
            <app-card title="3. Sign Content &amp; Messaging">
              <div style="margin-bottom: 12px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem;">
                  <input
                    type="checkbox"
                    [checked]="config().mirrorPanels"
                    (change)="toggleMirrorPanels()" />
                  <strong>Mirror Front Face to Back Face</strong> (Identical on both sides)
                </label>
              </div>

              <!-- Panel Tabs (if unmirrored) -->
              @if (!config().mirrorPanels) {
                <div class="g--flex-center g--margin-bottom-3" style="gap: 8px;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="activePanelTab() === 'front'"
                    [class.c-button--outline]="activePanelTab() !== 'front'"
                    (click)="activePanelTab.set('front')"
                    style="flex: 1;">
                    Face A (Front Panel)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="activePanelTab() === 'back'"
                    [class.c-button--outline]="activePanelTab() !== 'back'"
                    (click)="activePanelTab.set('back')"
                    style="flex: 1;">
                    Face B (Back Panel)
                  </button>
                </div>
              }

              <!-- Active Panel Fields -->
              @let currentPanel = activePanelTab() === 'front' || config().mirrorPanels ? config().frontPanel : config().backPanel;
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Title / Headline *
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    [value]="currentPanel.title"
                    (input)="updateActivePanel('title', $any($event.target).value)"
                    placeholder="e.g. Scan for Menu"
                    style="width: 100%;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Subtitle / Venue Name
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    [value]="currentPanel.subtitle"
                    (input)="updateActivePanel('subtitle', $any($event.target).value)"
                    placeholder="e.g. Table Service & Daily Specials"
                    style="width: 100%;" />
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      Table / Room Number Badge
                    </label>
                    <input
                      type="text"
                      class="c-input"
                      [value]="currentPanel.tableNumber || ''"
                      (input)="updateActivePanel('tableNumber', $any($event.target).value)"
                      placeholder="e.g. 12 or VIP"
                      style="width: 100%;" />
                  </div>
                  <div>
                    <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                      QR Code Action Label
                    </label>
                    <input
                      type="text"
                      class="c-input"
                      [value]="currentPanel.qrLabel || ''"
                      (input)="updateActivePanel('qrLabel', $any($event.target).value)"
                      placeholder="e.g. Scan Menu"
                      style="width: 100%;" />
                  </div>
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Body Text / Instructions / Wi-Fi Details
                  </label>
                  <textarea
                    class="c-input"
                    rows="3"
                    [value]="currentPanel.body"
                    (input)="updateActivePanel('body', $any($event.target).value)"
                    placeholder="Instructions or menu specials..."
                    style="width: 100%; font-size: 0.8125rem;"></textarea>
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    QR Code URL / Wi-Fi String
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    [value]="currentPanel.qrUrl || ''"
                    (input)="updateActivePanel('qrUrl', $any($event.target).value)"
                    placeholder="https://example.com/menu"
                    style="width: 100%; font-family: monospace; font-size: 0.8125rem;" />
                </div>
              </div>
            </app-card>
          </div>

          <!-- Visual Theme & Styling -->
          <div class="g--margin-bottom-4">
            <app-card title="4. Theme &amp; Typography">
              <div style="margin-bottom: 12px;">
                <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                  Color Palette Theme
                </label>
                <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap; justify-content: flex-start;">
                  @for (th of themes; track th.id) {
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().theme.id === th.id"
                      [class.c-button--outline]="config().theme.id !== th.id"
                      (click)="setTheme(th.id)">
                      {{ th.name }}
                    </button>
                  }
                </div>
              </div>

              <div>
                <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                  Typography
                </label>
                <div style="display: flex; gap: 6px;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().fontFamily === 'helvetica'"
                    [class.c-button--outline]="config().fontFamily !== 'helvetica'"
                    (click)="setFontFamily('helvetica')"
                    style="flex: 1;">
                    Sans-Serif (Modern)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().fontFamily === 'times'"
                    [class.c-button--outline]="config().fontFamily !== 'times'"
                    (click)="setFontFamily('times')"
                    style="flex: 1;">
                    Serif (Classic)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().fontFamily === 'courier'"
                    [class.c-button--outline]="config().fontFamily !== 'courier'"
                    (click)="setFontFamily('courier')"
                    style="flex: 1;">
                    Mono (Tech)
                  </button>
                </div>
              </div>
            </app-card>
          </div>

          <!-- Toggles & Print Marks -->
          <div class="g--margin-bottom-4">
            <app-card title="5. Print Marks &amp; Element Toggles">
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem;">
                  <input
                    type="checkbox"
                    [checked]="config().showFoldLines"
                    (change)="toggleFoldLines()" />
                  Print Dashed Fold / Crease Guidelines
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem;">
                  <input
                    type="checkbox"
                    [checked]="config().showCutMarks"
                    (change)="toggleCutMarks()" />
                  Print Corner Trim / Cut Marks
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem;">
                  <input
                    type="checkbox"
                    [checked]="config().showTableNumberBadge"
                    (change)="toggleTableNumberBadge()" />
                  Include Table Number Pill Badge
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem;">
                  <input
                    type="checkbox"
                    [checked]="config().includeQrCode"
                    (change)="toggleQrCode()" />
                  Include Vector QR Code
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
        </div>

        <!-- RIGHT COLUMN: Interactive Live Simulated Sheet Preview -->
        <div
          class="l-columns__area preview-pane"
          [class.mobile-hidden]="activeMobileTab() === 'controls'">
          
          <app-card [title]="previewTitle()">
            <div
              class="sheet-preview-viewport"
              style="background: #e2e8f0; padding: 24px; border-radius: var(--radius-md); display: flex; justify-content: center; overflow-x: auto;">
              
              <!-- Simulated Sheet -->
              <div
                class="simulated-sheet"
                [style.aspect-ratio]="sheetAspectRatio()"
                [style.background-color]="config().theme.backgroundColor"
                [style.color]="config().theme.textColor"
                style="
                  width: 100%;
                  max-width: 580px;
                  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
                  border-radius: 2px;
                  display: flex;
                  flex-direction: column;
                  position: relative;
                  box-sizing: border-box;
                  overflow: hidden;
                ">
                
                <!-- TOP PANEL (Face A - Inverted 180°) -->
                <div
                  class="panel-face panel-face--inverted"
                  style="
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    transform: rotate(180deg);
                    transform-origin: center center;
                    border-bottom: 1px dashed #94a3b8;
                    box-sizing: border-box;
                    text-align: center;
                  ">
                  
                  <span
                    style="
                      font-size: 0.625rem;
                      color: #94a3b8;
                      border: 1px solid #cbd5e1;
                      border-radius: 4px;
                      padding: 2px 6px;
                      margin-bottom: 8px;
                      user-select: none;
                    ">
                    🔄 INVERTED FOR FOLDING (Faces outward when stood)
                  </span>

                  @if (config().showTableNumberBadge && config().frontPanel.tableNumber) {
                    <span
                      [style.background-color]="config().theme.accentColor"
                      style="color: #ffffff; font-size: 0.6875rem; font-weight: 700; border-radius: 12px; padding: 2px 10px; margin-bottom: 6px;">
                      TABLE {{ config().frontPanel.tableNumber }}
                    </span>
                  }

                  <h3 style="margin: 0 0 4px 0; font-size: 1.25rem; font-weight: 700;">
                    {{ config().frontPanel.title }}
                  </h3>

                  @if (config().frontPanel.subtitle) {
                    <p [style.color]="config().theme.accentColor" style="margin: 0 0 8px 0; font-size: 0.8125rem; font-weight: 600;">
                      {{ config().frontPanel.subtitle }}
                    </p>
                  }

                  @if (config().frontPanel.body) {
                    <p style="margin: 0 0 10px 0; font-size: 0.75rem; opacity: 0.9; max-width: 85%; white-space: pre-line;">
                      {{ config().frontPanel.body }}
                    </p>
                  }

                  @if (config().includeQrCode && config().frontPanel.qrUrl) {
                    <div style="display: flex; flex-direction: column; align-items: center; margin-top: 4px;">
                      @if (frontQrPreview()) {
                        <img
                          [src]="frontQrPreview()"
                          alt="QR Code"
                          style="width: 72px; height: 72px; object-fit: contain; border-radius: 4px;" />
                      }
                      @if (config().frontPanel.qrLabel) {
                        <span [style.color]="config().theme.accentColor" style="font-size: 0.625rem; font-weight: 700; margin-top: 3px; text-transform: uppercase;">
                          {{ config().frontPanel.qrLabel }}
                        </span>
                      }
                    </div>
                  }
                </div>

                <!-- CREASE FOLD LINE DIVIDER -->
                <div
                  class="fold-line-indicator"
                  style="
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    font-size: 0.65rem;
                    font-weight: 600;
                    background: rgba(0,0,0,0.03);
                    user-select: none;
                  ">
                  - - - FOLD CREASE (APEX) - - -
                </div>

                <!-- BOTTOM PANEL (Face B - Upright 0°) -->
                <div
                  class="panel-face panel-face--upright"
                  style="
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    box-sizing: border-box;
                    text-align: center;
                  ">
                  
                  @let back = effectiveBackPanel();
                  @if (config().showTableNumberBadge && back.tableNumber) {
                    <span
                      [style.background-color]="config().theme.accentColor"
                      style="color: #ffffff; font-size: 0.6875rem; font-weight: 700; border-radius: 12px; padding: 2px 10px; margin-bottom: 6px;">
                      TABLE {{ back.tableNumber }}
                    </span>
                  }

                  <h3 style="margin: 0 0 4px 0; font-size: 1.25rem; font-weight: 700;">
                    {{ back.title }}
                  </h3>

                  @if (back.subtitle) {
                    <p [style.color]="config().theme.accentColor" style="margin: 0 0 8px 0; font-size: 0.8125rem; font-weight: 600;">
                      {{ back.subtitle }}
                    </p>
                  }

                  @if (back.body) {
                    <p style="margin: 0 0 10px 0; font-size: 0.75rem; opacity: 0.9; max-width: 85%; white-space: pre-line;">
                      {{ back.body }}
                    </p>
                  }

                  @if (config().includeQrCode && back.qrUrl) {
                    <div style="display: flex; flex-direction: column; align-items: center; margin-top: 4px;">
                      @if (backQrPreview()) {
                        <img
                          [src]="backQrPreview()"
                          alt="QR Code"
                          style="width: 72px; height: 72px; object-fit: contain; border-radius: 4px;" />
                      }
                      @if (back.qrLabel) {
                        <span [style.color]="config().theme.accentColor" style="font-size: 0.625rem; font-weight: 700; margin-top: 3px; text-transform: uppercase;">
                          {{ back.qrLabel }}
                        </span>
                      }
                    </div>
                  }
                </div>

                <!-- BASE FLAP (if Tri-Fold) -->
                @if (config().foldType === 'tri-fold') {
                  <div
                    class="panel-face panel-face--base-flap"
                    style="
                      height: 50px;
                      border-top: 1px dashed #94a3b8;
                      background: rgba(0,0,0,0.04);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 0.6875rem;
                      color: #64748b;
                      text-align: center;
                      padding: 8px;
                      box-sizing: border-box;
                    ">
                    <span>✂️ BASE FLAP — Fold inward and tape to base to secure triangular stand</span>
                  </div>
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
            <div style="font-size: 2rem;">⛺</div>
            <div>
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Print-Ready Table Tent PDF Ready!</h3>
              <p style="margin: 0; font-size: 0.875rem; color: var(--color-text-muted);">
                Your folding card has been compiled with precision crease guidelines.
              </p>
            </div>
          </div>

          <!-- Crucial Printer Setting Alert -->
          <div
            style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 0.8125rem; color: #92400e;">
            <strong>⚠️ Crucial Printer Setting:</strong> In your printer dialog (Adobe Acrobat or browser), set Page Scale to <strong>100%</strong> or <strong>Actual Size</strong>. Do NOT select "Fit to Page", or fold creases will shift!
          </div>

          <!-- Folding Tip -->
          <p style="font-size: 0.8125rem; color: #475569; margin-bottom: 16px; line-height: 1.4;">
            <strong>How to assemble:</strong> Print on heavy paper or cardstock (80 lb / 200+ gsm). Score lightly along the dashed line with a ruler, fold in half, and place on the table. Face A will be right-side up!
          </p>

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
})
export class TableTentMakerComponent {
  readonly presets = TENT_PRESETS;
  readonly themes = THEME_PRESETS;

  readonly config = signal<TableTentConfig>({
    ...DEFAULT_TENT_CONFIG,
    frontPanel: { ...DEFAULT_TENT_CONFIG.frontPanel },
    backPanel: { ...DEFAULT_TENT_CONFIG.backPanel },
  });

  readonly generatingPdf = signal<boolean>(false);
  readonly showDownloadModal = signal<boolean>(false);
  readonly activeMobileTab = signal<'controls' | 'preview'>('controls');
  readonly activePanelTab = signal<'front' | 'back'>('front');

  readonly frontQrPreview = signal<string>('');
  readonly backQrPreview = signal<string>('');

  readonly geometry = computed<TentGeometry>(() =>
    calculateTentGeometry(this.config())
  );

  readonly effectiveBackPanel = computed<PanelContent>(() =>
    this.config().mirrorPanels
      ? this.config().frontPanel
      : this.config().backPanel
  );

  readonly sheetAspectRatio = computed<string>(() => {
    const geo = this.geometry();
    return `${geo.pageWidthMm} / ${geo.pageHeightMm}`;
  });

  readonly previewTitle = computed<string>(() => {
    const cfg = this.config();
    const geo = this.geometry();
    return `Preview: ${cfg.paperFormat.toUpperCase()} (${geo.pageWidthMm} × ${geo.pageHeightMm} mm) • ${cfg.foldType === 'bi-fold' ? 'Bi-Fold (V-Card)' : 'Tri-Fold (Prism)'}`;
  });

  constructor() {
    // Regenerate QR preview images whenever QR URLs change
    effect(async () => {
      const frontUrl = this.config().frontPanel.qrUrl;
      const backUrl = this.effectiveBackPanel().qrUrl;
      const textColor = this.config().theme.textColor;

      if (frontUrl) {
        try {
          const uri = await generateQrDataUri(frontUrl, textColor);
          this.frontQrPreview.set(uri);
        } catch {
          // ignore
        }
      }

      if (backUrl) {
        try {
          const uri = await generateQrDataUri(backUrl, textColor);
          this.backQrPreview.set(uri);
        } catch {
          // ignore
        }
      }
    });
  }

  setMobileTab(tab: 'controls' | 'preview'): void {
    this.activeMobileTab.set(tab);
  }

  applyPreset(presetId: string): void {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return;

    this.config.update((c) => ({
      ...c,
      ...preset.config,
      frontPanel: {
        ...c.frontPanel,
        ...(preset.config.frontPanel || {}),
      },
      backPanel: {
        ...c.backPanel,
        ...(preset.config.backPanel || {}),
      },
    }));
  }

  setPaperFormat(paperFormat: PaperFormat): void {
    this.config.update((c) => ({ ...c, paperFormat }));
  }

  setOrientation(orientation: Orientation): void {
    this.config.update((c) => ({ ...c, orientation }));
  }

  setFoldType(foldType: TentFoldType): void {
    this.config.update((c) => ({ ...c, foldType }));
  }

  setTheme(themeId: string): void {
    const th = this.themes.find((t) => t.id === themeId);
    if (th) {
      this.config.update((c) => ({ ...c, theme: th }));
    }
  }

  setFontFamily(fontFamily: FontFamily): void {
    this.config.update((c) => ({ ...c, fontFamily }));
  }

  updateFrontContent(field: keyof PanelContent, val: string): void {
    this.config.update((c) => ({
      ...c,
      frontPanel: {
        ...c.frontPanel,
        [field]: val,
      },
    }));
  }

  updateBackContent(field: keyof PanelContent, val: string): void {
    this.config.update((c) => ({
      ...c,
      backPanel: {
        ...c.backPanel,
        [field]: val,
      },
    }));
  }

  updateActivePanel(field: keyof PanelContent, val: string): void {
    if (this.config().mirrorPanels || this.activePanelTab() === 'front') {
      this.updateFrontContent(field, val);
    } else {
      this.updateBackContent(field, val);
    }
  }

  toggleMirrorPanels(): void {
    this.config.update((c) => ({ ...c, mirrorPanels: !c.mirrorPanels }));
  }

  toggleFoldLines(): void {
    this.config.update((c) => ({ ...c, showFoldLines: !c.showFoldLines }));
  }

  toggleCutMarks(): void {
    this.config.update((c) => ({ ...c, showCutMarks: !c.showCutMarks }));
  }

  toggleTableNumberBadge(): void {
    this.config.update((c) => ({
      ...c,
      showTableNumberBadge: !c.showTableNumberBadge,
    }));
  }

  toggleQrCode(): void {
    this.config.update((c) => ({ ...c, includeQrCode: !c.includeQrCode }));
  }

  async downloadPdf(): Promise<void> {
    this.generatingPdf.set(true);
    try {
      const result = await generateTableTentPdf(this.config());
      const url = URL.createObjectURL(result.blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `table-tent-${this.config().foldType}.pdf`;
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
      ...DEFAULT_TENT_CONFIG,
      frontPanel: { ...DEFAULT_TENT_CONFIG.frontPanel },
      backPanel: { ...DEFAULT_TENT_CONFIG.backPanel },
    });
  }
}
