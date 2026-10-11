import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Badge } from '../../../components/badge/badge';
import { Card } from '../../../components/card/card';
import {
  calculateTotals,
  createDefaultInvoice,
  deserializeDraft,
  formatCurrency,
  generateInvoicePdf,
  serializeDraft,
  validateInvoice,
} from './engine';
import { SAMPLE_INVOICE, SAMPLE_RECEIPT } from './test-fixtures';
import {
  COLOR_PRESETS,
  DocumentType,
  InvoiceDocument,
  InvoiceLineItem,
  InvoiceRecipient,
  InvoiceSender,
  InvoiceTotals,
  SUPPORTED_CURRENCIES,
  TemplateStyle,
} from './types';

const DRAFT_STORAGE_KEY = 'privknife_invoice_draft';

@Component({
  selector: 'app-invoice-maker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Card, FormsModule],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1280px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-4 g--text-center">
        <div class="g--flex-center g--margin-bottom-2">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1>Instant Client-Side Invoice &amp; Receipt Maker</h1>
        <p class="g--margin-top-1" style="color: var(--color-text-muted); font-size: 1.0625rem;">
          Draft clean vector PDF invoices and printable receipts offline. Zero server retention &bull; Zero telemetry.
        </p>
      </div>

      <!-- Top Leaderboard Ad Container (728x90) -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center">
        <div
          class="ad-slot ad-slot--leaderboard"
          style="max-width: 728px; height: 90px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
          <span>Responsive Ad Placement (728x90 Top Leaderboard)</span>
        </div>
      </div>

      <!-- Mobile Tab Switcher (Visible on small screens) -->
      <div class="l-columns__area mobile-tab-bar g--margin-bottom-4">
        <div class="g--flex-center" style="gap: 8px;">
          <button
            type="button"
            class="c-button c-button--small"
            [class.c-button--primary]="activeMobileTab() === 'edit'"
            [class.c-button--outline]="activeMobileTab() !== 'edit'"
            (click)="setMobileTab('edit')"
            style="flex: 1;">
            ✏️ Edit Document
          </button>
          <button
            type="button"
            class="c-button c-button--small"
            [class.c-button--primary]="activeMobileTab() === 'preview'"
            [class.c-button--outline]="activeMobileTab() !== 'preview'"
            (click)="setMobileTab('preview')"
            style="flex: 1;">
            👁️ Live PDF Preview
          </button>
        </div>
      </div>

      <!-- Main Two-Column Split Layout -->
      <div class="l-columns l-columns--2 invoice-workspace" style="gap: 28px; align-items: start;">
        
        <!-- LEFT COLUMN: Live Form Editor -->
        <div
          class="l-columns__area editor-pane"
          [class.mobile-hidden]="activeMobileTab() === 'preview'">
          
          <!-- Document Settings & Style Card -->
          <div class="g--margin-bottom-5">
            <app-card title="Document Configuration">
              <div class="l-columns l-columns--3" style="gap: 16px; margin-bottom: 16px;">
                <!-- Document Type Switcher -->
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                    Document Type
                  </label>
                  <div class="g--flex-center" style="gap: 6px; justify-content: flex-start;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="invoice().documentType === 'invoice'"
                      [class.c-button--outline]="invoice().documentType !== 'invoice'"
                      (click)="setDocumentType('invoice')">
                      Invoice
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="invoice().documentType === 'receipt'"
                      [class.c-button--outline]="invoice().documentType !== 'receipt'"
                      (click)="setDocumentType('receipt')">
                      Receipt
                    </button>
                  </div>
                </div>

                <!-- Template Style -->
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                    Template Preset
                  </label>
                  <select
                    class="c-input"
                    [ngModel]="invoice().templateStyle"
                    (ngModelChange)="setTemplateStyle($event)"
                    style="width: 100%; padding: 6px 10px; font-size: 0.875rem;">
                    <option value="modern">Modern Minimal</option>
                    <option value="classic">Classic Corporate</option>
                    <option value="receipt">Compact Slip</option>
                  </select>
                </div>

                <!-- Currency Selector -->
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                    Currency
                  </label>
                  <select
                    class="c-input"
                    [ngModel]="invoice().currency"
                    (ngModelChange)="setCurrency($event)"
                    style="width: 100%; padding: 6px 10px; font-size: 0.875rem;">
                    @for (curr of supportedCurrencies; track curr.code) {
                      <option [value]="curr.symbol">{{ curr.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Accent Color Palette & Quick Numbers -->
              <div class="l-columns l-columns--3" style="gap: 16px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                    Accent Color
                  </label>
                  <div class="g--flex-center" style="gap: 8px; justify-content: flex-start;">
                    @for (color of colorPresets; track color.id) {
                      <button
                        type="button"
                        [title]="color.name"
                        [style.background-color]="color.hex"
                        [style.outline]="invoice().themeColor === color.hex ? '2px solid var(--color-primary)' : 'none'"
                        [style.outline-offset]="'2px'"
                        style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.15); cursor: pointer;"
                        (click)="setThemeColor(color.hex)">
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                    {{ invoice().documentType === 'receipt' ? 'Receipt #' : 'Invoice #' }}
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    [ngModel]="invoice().documentNumber"
                    (ngModelChange)="updateDocField('documentNumber', $event)"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    class="c-input"
                    [ngModel]="invoice().issueDate"
                    (ngModelChange)="updateDocField('issueDate', $event)"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>
              </div>
            </app-card>
          </div>

          <!-- Business / Sender Information Card -->
          <div class="g--margin-bottom-5">
            <app-card title="Your Business (From)">
              <div class="l-columns l-columns--2" style="gap: 16px; margin-bottom: 12px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Company / Freelancer Name *
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="e.g. Acme Creative Studio LLC"
                    [ngModel]="invoice().sender.name"
                    (ngModelChange)="updateSender({ name: $event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Email Address
                  </label>
                  <input
                    type="email"
                    class="c-input"
                    placeholder="billing@yourdomain.com"
                    [ngModel]="invoice().sender.email"
                    (ngModelChange)="updateSender({ email: $event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>
              </div>

              <div class="l-columns l-columns--3" style="gap: 16px; margin-bottom: 12px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Phone
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="+1 (555) 012-3456"
                    [ngModel]="invoice().sender.phone"
                    (ngModelChange)="updateSender({ phone: $event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Tax ID / VAT
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="e.g. US-123456789"
                    [ngModel]="invoice().sender.taxId"
                    (ngModelChange)="updateSender({ taxId: $event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Website
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="https://yourdomain.com"
                    [ngModel]="invoice().sender.website"
                    (ngModelChange)="updateSender({ website: $event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                  Address
                </label>
                <textarea
                  class="c-input"
                  rows="2"
                  placeholder="Street, City, State / Province, Postal Code"
                  [ngModel]="invoice().sender.address"
                  (ngModelChange)="updateSender({ address: $event })"
                  style="width: 100%; font-size: 0.875rem; resize: vertical;"></textarea>
              </div>

              <!-- Company Logo Upload -->
              <div>
                <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">
                  Company Logo (Stored 100% in local browser storage)
                </label>
                @if (invoice().sender.logoBase64) {
                  <div class="g--flex-center" style="gap: 12px; justify-content: flex-start;">
                    <img
                      [src]="invoice().sender.logoBase64"
                      alt="Company Logo Preview"
                      style="max-height: 48px; max-width: 120px; object-fit: contain; border: 1px solid var(--color-border-subtle); border-radius: 4px; padding: 4px;" />
                    <button
                      type="button"
                      class="c-button c-button--outline c-button--small"
                      (click)="removeLogo()">
                      Remove Logo
                    </button>
                  </div>
                } @else {
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    (change)="onLogoFileInput($event)"
                    style="font-size: 0.8125rem;" />
                }
              </div>
            </app-card>
          </div>

          <!-- Client / Recipient Information Card -->
          <div class="g--margin-bottom-5">
            <app-card [title]="invoice().documentType === 'receipt' ? 'Customer / Recipient' : 'Billed To (Client)'">
              <div class="l-columns l-columns--2" style="gap: 16px; margin-bottom: 12px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Client / Customer Name *
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="Client or Company Name"
                    [ngModel]="invoice().recipient.name"
                    (ngModelChange)="updateRecipient({ name: $event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Client Email
                  </label>
                  <input
                    type="email"
                    class="c-input"
                    placeholder="client@company.com"
                    [ngModel]="invoice().recipient.email"
                    (ngModelChange)="updateRecipient({ email: $event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>
              </div>

              <div class="l-columns l-columns--2" style="gap: 16px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Client Address
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="Street, City, Postal Code"
                    [ngModel]="invoice().recipient.address"
                    (ngModelChange)="updateRecipient({ address: $event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Client Phone
                  </label>
                  <input
                    type="text"
                    class="c-input"
                    placeholder="+1 (555) 987-6543"
                    [ngModel]="invoice().recipient.phone"
                    (ngModelChange)="updateRecipient({ phone: $event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>
              </div>
            </app-card>
          </div>

          <!-- Dynamic Line Items Card -->
          <div class="g--margin-bottom-5">
            <app-card title="Line Items">
              <div style="overflow-x: auto; margin-bottom: 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                  <thead>
                    <tr style="border-bottom: 2px solid var(--color-border-subtle); text-align: left; color: var(--color-text-secondary); font-size: 0.75rem;">
                      <th style="padding: 8px 4px;">DESCRIPTION</th>
                      <th style="padding: 8px 4px; width: 70px;">QTY</th>
                      <th style="padding: 8px 4px; width: 110px;">UNIT PRICE</th>
                      <th style="padding: 8px 4px; width: 90px; text-align: right;">TOTAL</th>
                      <th style="padding: 8px 4px; width: 40px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of invoice().items; track item.id; let idx = $index) {
                      <tr style="border-bottom: 1px solid var(--color-border-subtle);">
                        <td style="padding: 8px 4px;">
                          <input
                            type="text"
                            class="c-input"
                            placeholder="Service or Product description"
                            [ngModel]="item.description"
                            (ngModelChange)="updateLineItem(idx, { description: $event })"
                            style="width: 100%; font-size: 0.875rem; padding: 6px 8px;" />
                        </td>
                        <td style="padding: 8px 4px;">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            class="c-input"
                            [ngModel]="item.quantity"
                            (ngModelChange)="updateLineItem(idx, { quantity: +$event })"
                            style="width: 100%; font-size: 0.875rem; padding: 6px 8px;" />
                        </td>
                        <td style="padding: 8px 4px;">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            class="c-input"
                            [ngModel]="item.unitPrice"
                            (ngModelChange)="updateLineItem(idx, { unitPrice: +$event })"
                            style="width: 100%; font-size: 0.875rem; padding: 6px 8px;" />
                        </td>
                        <td style="padding: 8px 4px; text-align: right; font-weight: 600;">
                          {{ formatMoney((item.quantity || 0) * (item.unitPrice || 0)) }}
                        </td>
                        <td style="padding: 8px 4px; text-align: center;">
                          <button
                            type="button"
                            class="c-button c-button--outline c-button--small"
                            title="Delete Line Item"
                            (click)="removeLineItem(idx)"
                            style="padding: 4px 8px; color: var(--color-danger); border-color: var(--color-danger-subtle);">
                            &times;
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="l-extremo" style="align-items: center;">
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="addLineItem()">
                  + Add Line Item
                </button>
                <div style="font-size: 0.875rem; color: var(--color-text-secondary);">
                  Subtotal: <strong>{{ formatMoney(totals().subtotal) }}</strong>
                </div>
              </div>
            </app-card>
          </div>

          <!-- Financial Adjustments, Taxes & Terms Card -->
          <div class="g--margin-bottom-5">
            <app-card title="Financial Adjustments &amp; Terms">
              <div class="l-columns l-columns--4" style="gap: 12px; margin-bottom: 16px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    class="c-input"
                    [ngModel]="invoice().discountRate"
                    (ngModelChange)="updateFinancials({ discountRate: +$event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    class="c-input"
                    [ngModel]="invoice().taxRate"
                    (ngModelChange)="updateFinancials({ taxRate: +$event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Shipping / Fee
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    class="c-input"
                    [ngModel]="invoice().shipping"
                    (ngModelChange)="updateFinancials({ shipping: +$event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    class="c-input"
                    [ngModel]="invoice().amountPaid"
                    (ngModelChange)="updateFinancials({ amountPaid: +$event })"
                    style="width: 100%; font-size: 0.875rem;" />
                </div>
              </div>

              <div class="l-columns l-columns--2" style="gap: 16px;">
                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Notes / Comments
                  </label>
                  <textarea
                    class="c-input"
                    rows="2"
                    placeholder="Thank you for your business!"
                    [ngModel]="invoice().notes"
                    (ngModelChange)="updateDocField('notes', $event)"
                    style="width: 100%; font-size: 0.875rem; resize: vertical;"></textarea>
                </div>

                <div>
                  <label class="c-input__label" style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">
                    Payment Terms / Wire Details
                  </label>
                  <textarea
                    class="c-input"
                    rows="2"
                    placeholder="Bank routing, wire info, or PayPal link"
                    [ngModel]="invoice().paymentTerms"
                    (ngModelChange)="updateDocField('paymentTerms', $event)"
                    style="width: 100%; font-size: 0.875rem; resize: vertical;"></textarea>
                </div>
              </div>
            </app-card>
          </div>

          <!-- Draft Controls Deck -->
          <div class="g--flex-center" style="gap: 10px; justify-content: flex-start; flex-wrap: wrap;">
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="saveDraftToStorage()">
              💾 Save Draft
            </button>
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="exportDraftJson()">
              📤 Export JSON
            </button>
            <label class="c-button c-button--outline c-button--small" style="cursor: pointer; margin: 0;">
              📥 Import JSON
              <input
                type="file"
                accept=".json,application/json"
                (change)="onImportFileInput($event)"
                style="display: none;" />
            </label>
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="loadSampleInvoice()">
              📋 Load Sample
            </button>
            <button
              type="button"
              class="c-button c-button--outline c-button--small"
              (click)="resetToDefault()"
              style="color: var(--color-danger);">
              🗑️ Reset
            </button>
            @if (saveFeedback()) {
              <span style="font-size: 0.8125rem; color: var(--color-success); font-weight: 500;">
                {{ saveFeedback() }}
              </span>
            }
          </div>
        </div>

        <!-- RIGHT COLUMN: Sticky Real-Time Live Preview & Actions -->
        <div
          class="l-columns__area preview-pane"
          [class.mobile-hidden]="activeMobileTab() === 'edit'">
          
          <div style="position: sticky; top: 20px;">
            <!-- Primary Action Bar -->
            <div class="c-card g--margin-bottom-4" style="padding: 16px;">
              <div class="l-extremo" style="align-items: center; gap: 12px; flex-wrap: wrap;">
                <div>
                  <div style="font-size: 0.8125rem; color: var(--color-text-muted);">
                    {{ invoice().documentType === 'receipt' ? 'Receipt' : 'Invoice' }} Summary
                  </div>
                  <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-text-primary);">
                    {{ formatMoney(totals().grandTotal) }}
                  </div>
                </div>

                <div class="g--flex-center" style="gap: 8px;">
                  <button
                    type="button"
                    class="c-button c-button--secondary c-button--small"
                    (click)="printPdf()">
                    🖨️ Print
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--primary"
                    [disabled]="isGenerating()"
                    (click)="downloadPdf()">
                    @if (isGenerating()) {
                      <span>Compiling...</span>
                    } @else {
                      <span>⬇️ Download PDF</span>
                    }
                  </button>
                </div>
              </div>

              <!-- Quick Figures Ribbon -->
              <div
                class="l-columns l-columns--4 g--margin-top-4"
                style="gap: 8px; font-size: 0.8125rem; background: var(--color-bg-subtle); padding: 10px; border-radius: var(--radius-sm);">
                <div>
                  <span style="color: var(--color-text-muted); display: block;">Subtotal</span>
                  <strong>{{ formatMoney(totals().subtotal) }}</strong>
                </div>
                <div>
                  <span style="color: var(--color-text-muted); display: block;">Discount</span>
                  <strong>-{{ formatMoney(totals().discountAmount) }}</strong>
                </div>
                <div>
                  <span style="color: var(--color-text-muted); display: block;">Tax ({{ totals().taxRate }}%)</span>
                  <strong>{{ formatMoney(totals().taxAmount) }}</strong>
                </div>
                <div>
                  <span style="color: var(--color-text-muted); display: block;">Balance Due</span>
                  <strong [style.color]="totals().balanceDue > 0 ? 'var(--color-danger)' : 'var(--color-success)'">
                    {{ formatMoney(totals().balanceDue) }}
                  </strong>
                </div>
              </div>
            </div>

            <!-- Vector Document Preview Box -->
            <div class="c-card" style="padding: 0; overflow: hidden; background: #525659; min-height: 520px; display: flex; flex-direction: column;">
              <div
                style="padding: 10px 16px; background: var(--color-bg-subtle); border-bottom: 1px solid var(--color-border-subtle); display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary);">
                  Interactive Vector Preview ({{ invoice().documentNumber }})
                </span>
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="refreshPreview()"
                  style="padding: 2px 8px; font-size: 0.75rem;">
                  ↻ Refresh
                </button>
              </div>

              <div style="flex: 1; min-height: 500px; display: flex; align-items: center; justify-content: center;">
                @if (safePreviewUrl()) {
                  <iframe
                    [src]="safePreviewUrl()"
                    title="PDF Invoice Preview"
                    style="width: 100%; height: 580px; border: none; background: #fff;"
                    tabindex="-1"></iframe>
                } @else {
                  <div style="color: #fff; font-size: 0.875rem;">
                    Generating vector preview...
                  </div>
                }
              </div>
            </div>

            <!-- Sidebar Sticky Ad Container (300x250) -->
            <div
              class="ad-slot ad-slot--sidebar g--margin-top-4"
              style="max-width: 300px; height: 250px; margin: 16px auto 0; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem; text-align: center; padding: 12px;">
              <span>Responsive Ad Placement<br />(300x250 Sticky Unit)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Post-Download Trigger Modal Container -->
      @if (showDownloadModal()) {
        <div class="c-modal" role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
          <div class="c-modal__backdrop" (click)="closeDownloadModal()"></div>
          <div class="c-modal__dialog">
            <div class="c-modal__header">
              <h2 id="download-modal-title" class="c-modal__title">
                🎉 Document Downloaded Successfully!
              </h2>
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="closeDownloadModal()"
                aria-label="Close dialog">
                &times;
              </button>
            </div>
            <div class="c-modal__body g--text-center">
              <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                Your vector PDF <strong>{{ invoice().documentNumber }}.pdf</strong> was compiled entirely inside your browser and downloaded without touching any servers.
              </p>

              <div class="g--flex-center g--margin-bottom-4">
                <app-badge variant="privacy">
                  🛡️ Zero Telemetry &bull; 0 Bytes Transmitted
                </app-badge>
              </div>

              <!-- Post-Download Modal Ad Unit -->
              <div
                class="ad-slot ad-slot--modal"
                style="max-width: 300px; height: 250px; margin: 0 auto; background: var(--color-bg-subtle); border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.75rem;">
                <span>Responsive Ad Placement (300x250 Modal Unit)</span>
              </div>
            </div>
            <div class="c-modal__footer">
              <button
                type="button"
                class="c-button c-button--primary"
                (click)="closeDownloadModal()">
                Done
              </button>
            </div>
          </div>
        </div>
      }
    </div>
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

        .invoice-workspace {
          grid-template-columns: 1fr !important;
        }
      }
    `,
  ],
})
export class InvoiceMakerComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly supportedCurrencies = SUPPORTED_CURRENCIES;
  readonly colorPresets = COLOR_PRESETS;

  readonly invoice = signal<InvoiceDocument>(createDefaultInvoice());
  readonly totals = computed(() => calculateTotals(this.invoice()));
  readonly activeMobileTab = signal<'edit' | 'preview'>('edit');
  readonly showDownloadModal = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  readonly previewDataUri = signal<string>('');
  readonly saveFeedback = signal<string>('');

  readonly safePreviewUrl = computed<SafeResourceUrl | null>(() => {
    const uri = this.previewDataUri();
    if (!uri) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(uri);
  });

  private previewDebounceTimer: any = null;

  ngOnInit(): void {
    this.loadDraftFromStorage();
    this.schedulePreviewRefresh();

    this.destroyRef.onDestroy(() => {
      if (this.previewDebounceTimer) {
        clearTimeout(this.previewDebounceTimer);
      }
    });
  }

  // --- Document & Line Item Mutations ---

  addLineItem(): void {
    const current = this.invoice();
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
    };
    this.invoice.set({
      ...current,
      items: [...current.items, newItem],
    });
    this.schedulePreviewRefresh();
  }

  updateLineItem(index: number, changes: Partial<InvoiceLineItem>): void {
    const current = this.invoice();
    const updatedItems = [...current.items];
    if (updatedItems[index]) {
      updatedItems[index] = { ...updatedItems[index], ...changes };
      this.invoice.set({
        ...current,
        items: updatedItems,
      });
      this.schedulePreviewRefresh();
    }
  }

  removeLineItem(index: number): void {
    const current = this.invoice();
    const updatedItems = current.items.filter((_, i) => i !== index);
    this.invoice.set({
      ...current,
      items: updatedItems,
    });
    this.schedulePreviewRefresh();
  }

  updateSender(changes: Partial<InvoiceSender>): void {
    const current = this.invoice();
    this.invoice.set({
      ...current,
      sender: { ...current.sender, ...changes },
    });
    this.schedulePreviewRefresh();
  }

  updateRecipient(changes: Partial<InvoiceRecipient>): void {
    const current = this.invoice();
    this.invoice.set({
      ...current,
      recipient: { ...current.recipient, ...changes },
    });
    this.schedulePreviewRefresh();
  }

  updateFinancials(changes: {
    taxRate?: number;
    discountRate?: number;
    shipping?: number;
    amountPaid?: number;
  }): void {
    const current = this.invoice();
    this.invoice.set({
      ...current,
      ...changes,
    });
    this.schedulePreviewRefresh();
  }

  updateDocField<K extends keyof InvoiceDocument>(field: K, value: InvoiceDocument[K]): void {
    const current = this.invoice();
    this.invoice.set({
      ...current,
      [field]: value,
    });
    this.schedulePreviewRefresh();
  }

  setDocumentType(type: DocumentType): void {
    const current = this.invoice();
    this.invoice.set({
      ...current,
      documentType: type,
    });
    this.schedulePreviewRefresh();
  }

  setTemplateStyle(style: TemplateStyle): void {
    const current = this.invoice();
    this.invoice.set({
      ...current,
      templateStyle: style,
    });
    this.schedulePreviewRefresh();
  }

  setThemeColor(color: string): void {
    const current = this.invoice();
    this.invoice.set({
      ...current,
      themeColor: color,
    });
    this.schedulePreviewRefresh();
  }

  setCurrency(curr: string): void {
    const current = this.invoice();
    this.invoice.set({
      ...current,
      currency: curr,
    });
    this.schedulePreviewRefresh();
  }

  // --- Logo Handling ---

  onLogoFileInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target?.files?.[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          this.setLogoBase64(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  setLogoBase64(base64: string): void {
    this.updateSender({ logoBase64: base64 });
  }

  removeLogo(): void {
    const current = this.invoice();
    this.invoice.set({
      ...current,
      sender: { ...current.sender, logoBase64: undefined },
    });
    this.schedulePreviewRefresh();
  }

  // --- Storage & Draft Management ---

  saveDraftToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const serialized = serializeDraft(this.invoice());
        localStorage.setItem(DRAFT_STORAGE_KEY, serialized);
        this.saveFeedback.set('Draft saved locally!');
        setTimeout(() => this.saveFeedback.set(''), 2500);
      } catch {
        // Storage limit reached or restricted
      }
    }
  }

  loadDraftFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const restored = deserializeDraft(saved);
        if (restored) {
          this.invoice.set(restored);
        }
      }
    }
  }

  resetToDefault(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
    this.invoice.set(createDefaultInvoice());
    this.schedulePreviewRefresh();
  }

  loadSampleInvoice(): void {
    this.invoice.set({ ...SAMPLE_INVOICE });
    this.schedulePreviewRefresh();
  }

  // --- PDF Export, Print & JSON ---

  async downloadPdf(): Promise<void> {
    this.isGenerating.set(true);
    try {
      const { blob } = await generateInvoicePdf(this.invoice());
      const fileName = `${this.invoice().documentType}-${this.invoice().documentNumber || 'doc'}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Strict memory hygiene: revoke object URL immediately
      URL.revokeObjectURL(url);

      this.showDownloadModal.set(true);
    } finally {
      this.isGenerating.set(false);
    }
  }

  async printPdf(): Promise<void> {
    if (typeof window !== 'undefined') {
      const { dataUri } = await generateInvoicePdf(this.invoice());
      const printWindow = window.open(dataUri);
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      }
    }
  }

  exportDraftJson(): void {
    const jsonStr = serializeDraft(this.invoice());
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.invoice().documentNumber || 'invoice'}-draft.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  onImportFileInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target?.files?.[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          this.importDraftJson(content);
        }
      };
      reader.readAsText(file);
    }
  }

  importDraftJson(jsonStr: string): void {
    const imported = deserializeDraft(jsonStr);
    if (imported) {
      this.invoice.set(imported);
      this.schedulePreviewRefresh();
      this.saveFeedback.set('Draft imported successfully!');
      setTimeout(() => this.saveFeedback.set(''), 2500);
    }
  }

  closeDownloadModal(): void {
    this.showDownloadModal.set(false);
  }

  setMobileTab(tab: 'edit' | 'preview'): void {
    this.activeMobileTab.set(tab);
    if (tab === 'preview') {
      this.schedulePreviewRefresh();
    }
  }

  formatMoney(val: number): string {
    return formatCurrency(val, this.invoice().currency);
  }

  refreshPreview(): void {
    generateInvoicePdf(this.invoice()).then(({ dataUri }) => {
      this.previewDataUri.set(dataUri);
    });
  }

  private schedulePreviewRefresh(): void {
    if (this.previewDebounceTimer) {
      clearTimeout(this.previewDebounceTimer);
    }
    this.previewDebounceTimer = setTimeout(() => {
      this.refreshPreview();
    }, 200);
  }
}
