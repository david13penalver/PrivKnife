import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { PasswordPassphraseGeneratorComponent } from './password-passphrase-generator.component';
import { SAMPLE_AUDITOR_PASSWORDS } from './test-fixtures';

describe('PasswordPassphraseGeneratorComponent (Spec 120 — Seam 2)', () => {
  let component: PasswordPassphraseGeneratorComponent;
  let fixture: ComponentFixture<PasswordPassphraseGeneratorComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let storageSpy: ReturnType<typeof vi.spyOn>;
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    mathRandomSpy = vi.spyOn(Math, 'random');

    await TestBed.configureTestingModule({
      imports: [PasswordPassphraseGeneratorComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(PasswordPassphraseGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    fetchSpy.mockRestore();
    storageSpy.mockRestore();
    mathRandomSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders with privacy badge, initial CSPRNG credential, and color-coded tokens without Math.random()', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
    expect(component.items().length).toBe(1);
    expect(component.primaryCredential().length).toBe(20);
    expect(
      component
        .primaryTokens()
        .map((t) => t.ch)
        .join(''),
    ).toBe(component.primaryCredential());
    expect(mathRandomSpy).not.toHaveBeenCalled();
  });

  it('switches cleanly between Password, Passphrase, Dev API Keys, and Strength Auditor modes', () => {
    component.selectMode('passphrase');
    fixture.detectChanges();
    expect(component.mode()).toBe('passphrase');
    expect(component.primaryCredential().split('-').length).toBe(6);

    component.selectMode('dev_secret');
    component.devPreset.set('hex_256');
    component.regenerate();
    fixture.detectChanges();
    expect(component.primaryCredential()).toMatch(/^[0-9a-f]{64}$/);
    expect(component.entropy().bits).toBe(256);

    component.selectMode('auditor');
    component.auditorInput.set(SAMPLE_AUDITOR_PASSWORDS.weakCommon);
    fixture.detectChanges();
    expect(component.auditorReport().grade).toBe('very_weak');
    expect(component.auditorReport().warnings).toContain('common_password');

    component.auditorInput.set(SAMPLE_AUDITOR_PASSWORDS.strongRandom);
    fixture.detectChanges();
    expect(component.auditorReport().grade).toBe('excellent');
  });

  it('displays a graceful error when all password character sets are disabled', () => {
    component.includeUppercase.set(false);
    component.includeLowercase.set(false);
    component.includeNumbers.set(false);
    component.includeSymbols.set(false);
    component.regenerate();
    fixture.detectChanges();

    expect(component.errorMessage()).toBeTruthy();
    expect(component.items()).toEqual([]);
  });

  it('exports .txt, .csv, and .env and revokes every created ObjectURL (even with identical mock URLs)', () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-identical');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);

    component.setBatchCount(5);
    component.exportFile('txt');
    component.exportFile('csv');
    component.exportFile('env');

    expect(createSpy).toHaveBeenCalledTimes(3);

    component.clearSecrets();
    expect(revokeSpy).toHaveBeenCalledTimes(3);
  });

  it('wipes secret signals, clears timers, and performs zero network or storage calls on Clear and ngOnDestroy', () => {
    component.auditorInput.set('SensitiveSecret2026!');
    component.setBatchCount(10);
    fixture.detectChanges();
    expect(component.items()).toHaveLength(10);

    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:leak-check');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);

    component.exportFile('txt');
    component.clearSecrets();

    expect(component.items()).toEqual([]);
    expect(component.auditorInput()).toBe('');
    expect(component.copiedIndex()).toBeNull();
    expect(revokeSpy).toHaveBeenCalledTimes(1);

    component.regenerate();
    expect(component.items().length).toBeGreaterThan(0);
    component.ngOnDestroy();
    expect(component.items()).toEqual([]);
    expect(component.auditorInput()).toBe('');

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(mathRandomSpy).not.toHaveBeenCalled();
  });
});
