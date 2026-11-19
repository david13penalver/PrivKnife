import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { base64UrlEncodeUtf8 } from './engine';
import { JwtDebuggerStudioComponent } from './jwt-debugger-studio.component';
import { RFC_HS256_TOKEN } from './test-fixtures';

describe('JwtDebuggerStudioComponent (Seam 2: Inspector UI, Web Crypto Mint/Verify & Secret Wipe)', () => {
  let component: JwtDebuggerStudioComponent;
  let fixture: ComponentFixture<JwtDebuggerStudioComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let localSetSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    localSetSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [JwtDebuggerStudioComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(JwtDebuggerStudioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localSetSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('initializes with default HS256 sample decoded, privacy badge rendered, claims annotated, and zero storage/network calls', () => {
    expect(component).toBeTruthy();
    expect(component.decodedResult().validStructure).toBe(true);
    expect(component.decodedResult().algorithm).toBe('HS256');
    expect(component.decodedResult().claims.some((c) => c.claim === 'sub')).toBe(true);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localSetSpy).not.toHaveBeenCalled();
  });

  it('verifies valid HS256 token and marks tampered token as invalid', async () => {
    await component.verifyCurrentToken();
    fixture.detectChanges();
    expect(component.verificationResult()?.status).toBe('valid');

    const [headerB64, , sigB64] = RFC_HS256_TOKEN.split('.');
    const tamperedPayloadB64 = base64UrlEncodeUtf8(
      JSON.stringify({ sub: '1234567890', name: 'John Foe', iat: 1516239022 })
    );
    component.onTokenInputChange(`${headerB64}.${tamperedPayloadB64}.${sigB64}`);
    await component.verifyCurrentToken();
    fixture.detectChanges();

    expect(component.verificationResult()?.verified).toBe(false);
    expect(component.verificationResult()?.status).toBe('invalid');
  });

  it('generates ephemeral ES256 keypair, applies +1h exp & jti helpers, mints a token, and verifies it as valid', async () => {
    await component.generateDevKeyPair('ES256');
    expect(component.selectedAlgorithm()).toBe('ES256');
    expect(component.generatedKeyPair()?.publicKeyPem).toContain('BEGIN PUBLIC KEY');

    component.applyExpOffset(3600);
    component.applyRandomJti();
    const parsedPayload = JSON.parse(component.payloadEditorText()) as Record<string, unknown>;
    expect(typeof parsedPayload['exp']).toBe('number');
    expect(typeof parsedPayload['jti']).toBe('string');

    await component.mintFromEditors();
    fixture.detectChanges();

    expect(component.actionError()).toBeNull();
    expect(component.decodedResult().algorithm).toBe('ES256');
    expect(component.verificationResult()?.status).toBe('valid');
  });

  it('loads alg:none demo preset with critical warning and never verifies signature as valid', async () => {
    await component.loadPreset('alg_none_demo');
    await component.verifyCurrentToken();
    fixture.detectChanges();

    const warnings = component.decodedResult().securityWarnings;
    expect(warnings.some((w) => /alg.*none/i.test(w))).toBe(true);
    expect(component.verificationResult()?.verified).toBe(false);
    expect(component.verificationResult()?.status).toBe('unsupported_alg');
  });

  it('wipes all secret/key/token signals and revokes created Object URLs on clearAllSecrets and ngOnDestroy', async () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-jwt-export');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await component.generateDevKeyPair('ES256');
    component.downloadDecodedJson();
    component.downloadPem('public');
    expect(createSpy).toHaveBeenCalledTimes(2);

    component.clearAllSecrets();
    expect(component.tokenInput()).toBe('');
    expect(component.verifyKeyInput()).toBe('');
    expect(component.mintPrivateKeyInput()).toBe('');
    expect(component.headerEditorText()).toBe('');
    expect(component.payloadEditorText()).toBe('');
    expect(component.generatedKeyPair()).toBeNull();
    expect(component.verificationResult()).toBeNull();
    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-jwt-export');

    component.tokenInput.set('secret.jwt.token');
    component.verifyKeyInput.set('secret-key');
    component.ngOnDestroy();
    expect(component.tokenInput()).toBe('');
    expect(component.verifyKeyInput()).toBe('');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localSetSpy).not.toHaveBeenCalled();
  });
});
