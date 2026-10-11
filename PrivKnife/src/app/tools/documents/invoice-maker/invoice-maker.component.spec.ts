import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceMakerComponent } from './invoice-maker.component';
import { SAMPLE_INVOICE, SAMPLE_LOGO_BASE64 } from './test-fixtures';

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('InvoiceMakerComponent (Seam 2: UI, Signals, LocalStorage & Privacy Boundary)', () => {
  let fixture: ComponentFixture<InvoiceMakerComponent>;
  let component: InvoiceMakerComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;
  let mockStorage: MockStorage;

  beforeEach(async () => {
    mockStorage = new MockStorage();
    vi.stubGlobal('localStorage', mockStorage);

    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:https://privknife.com/mock-invoice-blob');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [InvoiceMakerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InvoiceMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should create the component with initial draft and calculated totals', () => {
    expect(component).toBeTruthy();
    expect(component.invoice()).toBeDefined();
    expect(component.invoice().items.length).toBeGreaterThan(0);
    expect(component.totals().grandTotal).toBeGreaterThan(0);
  });

  it('should dynamically add a line item and update totals reactively', () => {
    const initialItemCount = component.invoice().items.length;
    const initialSubtotal = component.totals().subtotal;

    component.addLineItem();

    expect(component.invoice().items.length).toBe(initialItemCount + 1);

    // Update the newly added item
    const lastIndex = component.invoice().items.length - 1;
    component.updateLineItem(lastIndex, {
      description: 'New Consultation Service',
      quantity: 5,
      unitPrice: 100,
    });

    expect(component.totals().subtotal).toBe(initialSubtotal + 500);
  });

  it('should remove a line item and recalculate totals', () => {
    // Ensure we have at least 2 items
    if (component.invoice().items.length < 2) {
      component.addLineItem();
    }
    const countBefore = component.invoice().items.length;
    const removedItem = component.invoice().items[0];
    const removedAmount = (removedItem.quantity || 0) * (removedItem.unitPrice || 0);
    const subtotalBefore = component.totals().subtotal;

    component.removeLineItem(0);

    expect(component.invoice().items.length).toBe(countBefore - 1);
    expect(component.totals().subtotal).toBe(Math.max(0, subtotalBefore - removedAmount));
  });

  it('should update tax rate, discount rate, and shipping and recalculate totals', () => {
    component.updateFinancials({
      taxRate: 10,
      discountRate: 10,
      shipping: 25,
      amountPaid: 100,
    });

    const totals = component.totals();
    expect(totals.taxRate).toBe(10);
    expect(totals.discountRate).toBe(10);
    expect(totals.shipping).toBe(25);
    expect(totals.amountPaid).toBe(100);
  });

  it('should switch document type between invoice and receipt', () => {
    component.setDocumentType('receipt');
    expect(component.invoice().documentType).toBe('receipt');

    component.setDocumentType('invoice');
    expect(component.invoice().documentType).toBe('invoice');
  });

  it('should handle logo upload and logo removal', () => {
    component.setLogoBase64(SAMPLE_LOGO_BASE64);
    expect(component.invoice().sender.logoBase64).toBe(SAMPLE_LOGO_BASE64);

    component.removeLogo();
    expect(component.invoice().sender.logoBase64).toBeUndefined();
  });

  it('should persist draft to localStorage and recover it on initialization', () => {
    component.updateSender({ name: 'Unique Persisted Business Name' });
    component.saveDraftToStorage();

    const saved = localStorage.getItem('privknife_invoice_draft');
    expect(saved).not.toBeNull();
    expect(saved).toContain('Unique Persisted Business Name');

    // Create a new component instance to verify recovery from storage
    const newFixture = TestBed.createComponent(InvoiceMakerComponent);
    const newComponent = newFixture.componentInstance as InvoiceMakerComponent;
    newFixture.detectChanges();

    expect(newComponent.invoice().sender.name).toBe('Unique Persisted Business Name');
  });

  it('should reset draft to initial default on clearDraft', () => {
    component.updateSender({ name: 'Changed Name' });
    component.saveDraftToStorage();

    component.resetToDefault();

    expect(component.invoice().sender.name).not.toBe('Changed Name');
    expect(localStorage.getItem('privknife_invoice_draft')).toBeNull();
  });

  it('should download PDF, revoke object URL immediately, and open post-download modal', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadPdf();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:https://privknife.com/mock-invoice-blob');
    expect(component.showDownloadModal()).toBe(true);

    component.closeDownloadModal();
    expect(component.showDownloadModal()).toBe(false);
  });

  it('should export draft JSON and revoke object URL immediately', () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    component.exportDraftJson();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:https://privknife.com/mock-invoice-blob');
  });

  it('should import valid draft JSON and update state', () => {
    const customJson = JSON.stringify({
      ...SAMPLE_INVOICE,
      documentNumber: 'IMPORTED-999',
    });

    component.importDraftJson(customJson);

    expect(component.invoice().documentNumber).toBe('IMPORTED-999');
  });

  it('should toggle mobile active tab between edit and preview', () => {
    expect(component.activeMobileTab()).toBe('edit');

    component.setMobileTab('preview');
    expect(component.activeMobileTab()).toBe('preview');

    component.setMobileTab('edit');
    expect(component.activeMobileTab()).toBe('edit');
  });

  it('should execute processing with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    // Trigger PDF download
    await component.downloadPdf();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
