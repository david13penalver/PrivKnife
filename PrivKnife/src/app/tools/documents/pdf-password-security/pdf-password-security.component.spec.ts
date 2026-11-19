import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PdfPasswordSecurityComponent } from './pdf-password-security.component';
import { createSyntheticPdf } from './test-fixtures';

describe('PdfPasswordSecurityComponent (Seam 3: Angular UI, Zero-Knowledge Hygiene & Round-Trip)', () => {
  let component: PdfPasswordSecurityComponent;
  let fixture: ComponentFixture<PdfPasswordSecurityComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let localStorageSpy: ReturnType<typeof vi.spyOn>;
  let sessionStorageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    sessionStorageSpy = vi.spyOn(window.sessionStorage, 'setItem');

    await TestBed.configureTestingModule({
      imports: [PdfPasswordSecurityComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PdfPasswordSecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    localStorageSpy.mockRestore();
    sessionStorageSpy.mockRestore();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with secure AES-256 defaults and zero secret or file state', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe('protect');
    expect(component.keyLength()).toBe(256);
    expect(component.allowPrint()).toBe('full');
    expect(component.allowModify()).toBe('none');
    expect(component.allowExtractText()).toBe(false);
    expect(component.allowAccessibility()).toBe(true);
    expect(component.userPassword()).toBe('');
    expect(component.confirmPassword()).toBe('');
    expect(component.ownerPassword()).toBe('');
    expect(component.unlockPassword()).toBe('');
    expect(component.isProcessing()).toBe(false);
    expect(component.pdfBytes()).toBeNull();
    expect(component.canProtect()).toBe(false);
    expect(component.canUnlock()).toBe(false);
  });

  it('evaluates live password entropy and enforces confirm-password mismatch guard', () => {
    expect(component.passwordStrength().grade).toBe('empty');

    component.userPassword.set('123456');
    expect(component.passwordStrength().grade).toBe('weak');

    component.userPassword.set('CorrectHorse99!#');
    expect(['strong', 'excellent']).toContain(component.passwordStrength().grade);
    expect(component.passwordsMismatch()).toBe(true);

    component.pdfBytes.set(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]));
    expect(component.canProtect()).toBe(false);

    component.confirmPassword.set('CorrectHorse99!#');
    expect(component.passwordsMismatch()).toBe(false);
    expect(component.canProtect()).toBe(true);
  });

  it('rejects non-PDF files cleanly and flags files > 100 MB with a non-blocking warning', async () => {
    const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'photo.png', {
      type: 'image/png',
    });
    await component.onFileDropped([pngFile]);
    expect(component.errorMessage()).toBeTruthy();
    expect(component.pdfBytes()).toBeNull();

    const smallPdf = await createSyntheticPdf(1);
    const hugePdf = new File([smallPdf.buffer as ArrayBuffer], 'huge.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(hugePdf, 'size', { value: 115 * 1024 * 1024 });

    await component.onFileDropped([hugePdf]);
    expect(component.largeFileWarning()).toBe(true);
    expect(component.pdfBytes()).not.toBeNull();
  });

  it('completes real QPDF AES-256 protect -> wrong password -> unlock round-trip with zero network or storage writes', async () => {
    const srcBytes = await createSyntheticPdf(2);
    const srcFile = new File([srcBytes.buffer as ArrayBuffer], 'board-deck.pdf', {
      type: 'application/pdf',
    });

    await component.onFileDropped([srcFile]);
    expect(component.encryptionInfo()?.isEncrypted).toBe(false);
    expect(component.encryptionInfo()?.algorithm).toBe('none');
    expect(component.encryptionInfo()?.pageCount).toBe(2);

    component.userPassword.set('PrivKnife-Test-2026!');
    component.confirmPassword.set('PrivKnife-Test-2026!');
    await component.processProtect();

    const protectRes = component.lastResult();
    expect(protectRes?.success).toBe(true);
    expect(protectRes?.resultingInfo?.algorithm).toBe('AES-256');
    expect(protectRes?.bytes).toBeDefined();

    component.setMode('unlock');
    const lockedFile = new File([protectRes!.bytes!.buffer as ArrayBuffer], 'board-deck-protected.pdf', {
      type: 'application/pdf',
    });
    await component.onFileDropped([lockedFile]);
    expect(component.encryptionInfo()?.isEncrypted).toBe(true);
    expect(component.encryptionInfo()?.requiresUserPassword).toBe(true);

    component.unlockPassword.set('WrongPassword!');
    await component.processUnlock();
    expect(component.lastResult()?.success).toBe(false);
    expect(component.lastResult()?.errorCode).toBe('WRONG_PASSWORD');
    expect(component.errorMessage()).toBeTruthy();

    component.unlockPassword.set('PrivKnife-Test-2026!');
    await component.processUnlock();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.resultingInfo?.isEncrypted).toBe(false);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();
  });

  it('supports owner-only restriction stripping without entering a user password', async () => {
    const srcBytes = await createSyntheticPdf(1);
    await component.onFileDropped([
      new File([srcBytes.buffer as ArrayBuffer], 'restricted.pdf', { type: 'application/pdf' }),
    ]);

    component.userPassword.set('');
    component.confirmPassword.set('');
    component.ownerPassword.set('OwnerLock!99');
    await component.processProtect();
    const lockedBytes = component.lastResult()?.bytes;
    expect(component.lastResult()?.success).toBe(true);
    expect(lockedBytes).toBeDefined();

    component.setMode('unlock');
    await component.onFileDropped([
      new File([lockedBytes!.buffer as ArrayBuffer], 'restricted-protected.pdf', {
        type: 'application/pdf',
      }),
    ]);

    expect(component.encryptionInfo()?.isEncrypted).toBe(true);
    expect(component.encryptionInfo()?.requiresUserPassword).toBe(false);
    expect(component.canUnlock()).toBe(true);

    await component.processUnlock();
    expect(component.lastResult()?.success).toBe(true);
    expect(component.lastResult()?.resultingInfo?.isEncrypted).toBe(false);
  });

  it('updates localized UI text when switching EN <-> ES and cleans up URLs, workers, and password signals on reset/destroy', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-pdf-security');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const sampleBytes = await createSyntheticPdf(1);
    await component.onFileDropped([
      new File([sampleBytes.buffer as ArrayBuffer], 'doc.pdf', { type: 'application/pdf' }),
    ]);
    component.userPassword.set('Secret#2026');
    component.confirmPassword.set('Secret#2026');
    component.ownerPassword.set('Owner#2026');
    await component.processProtect();

    component.downloadResult();
    expect(createUrlSpy).toHaveBeenCalledTimes(1);

    await i18nService.setLanguage('es');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Protector');

    component.reset();
    expect(component.userPassword()).toBe('');
    expect(component.confirmPassword()).toBe('');
    expect(component.ownerPassword()).toBe('');
    expect(component.unlockPassword()).toBe('');
    expect(component.pdfBytes()).toBeNull();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-pdf-security');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });
});
