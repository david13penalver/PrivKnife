import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EmergencyRecoveryKitComponent } from './emergency-recovery-kit.component';
import { computeTemplateHash } from './engine';

describe('EmergencyRecoveryKitComponent', () => {
  let component: EmergencyRecoveryKitComponent;
  let fixture: ComponentFixture<EmergencyRecoveryKitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmergencyRecoveryKitComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmergencyRecoveryKitComponent);
    component = fixture.componentInstance;
    await component.syncChecksum();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display privacy indicator badge', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('100% In-Browser');
    expect(el.textContent).toContain('Never Leaves Your Device');
  });

  it('should switch between preset templates', async () => {
    component.loadPreset('crypto_vault');
    await component.syncChecksum();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.options().kitTitle).toContain('COLD STORAGE');
    expect(component.options().seedPhraseWordCount).toBe(12);
    expect(component.options().highContrastMonochrome).toBe(true);

    component.loadPreset('comprehensive');
    await component.syncChecksum();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.options().kitTitle).toContain('CONFIDENTIAL EMERGENCY');
    expect(component.options().seedPhraseWordCount).toBe(24);
  });

  it('should toggle options reactively', () => {
    component.updateFormat('us_letter');
    expect(component.options().paperFormat).toBe('us_letter');

    component.toggleOption('highContrastMonochrome');
    expect(component.options().highContrastMonochrome).toBe(true);

    component.updateWordCount(12);
    expect(component.options().seedPhraseWordCount).toBe(12);
  });

  it('should update real-time SVG preview with checksum', () => {
    const preview = component.svgPreview();
    expect(preview).toContain('<svg');
    expect(preview).toContain('CONFIDENTIAL EMERGENCY');
    expect(preview).toContain('SHA-256:');
  });

  it('should trigger PDF download and immediately revoke Object URL', async () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-recovery-pdf');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await component.downloadPdf();

    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-recovery-pdf');
  });

  it('should trigger window.print directly when user clicks Print', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    component.printSheet();
    expect(printSpy).toHaveBeenCalled();
  });

  it('should revoke active object URLs in ngOnDestroy', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-recovery-pdf');

    await component.downloadPdf();
    component.ngOnDestroy();

    expect(revokeSpy).toHaveBeenCalled();
  });

  // DEFECT-59-01: DOM Security & Sanitization
  it('should sanitize SVG to prevent DOM XSS injection via vaultCustodian', async () => {
    component.updateCustodian('Jane</text><img src=x onerror="window.__xss59=true"><text>');
    await component.syncChecksum();
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl: HTMLElement = fixture.nativeElement;
    const previewEl = hostEl.querySelector('.c-emergency-kit__preview-stage');
    expect(previewEl).toBeTruthy();

    const injectedImg = previewEl?.querySelector('img');
    expect(injectedImg).toBeNull();
    expect(previewEl?.querySelectorAll('img').length).toBe(0);

    const rawHtml = previewEl?.innerHTML || '';
    expect(rawHtml).toContain('&lt;img');
    expect((window as unknown as { __xss59?: boolean }).__xss59).toBeUndefined();
  });

  // DEFECT-59-02: Complete SVG Preview Sections
  it('should render additionalInstructions and QR matrix in SVG when enabled', async () => {
    component.updateInstructions('Deliver this envelope to my trusted executor immediately.');
    await component.syncChecksum();
    fixture.detectChanges();
    await fixture.whenStable();

    const preview = component.svgPreview();
    expect(preview).toContain('Deliver this envelope to my trusted executor immediately.');
    expect(preview).toContain('OFFLINE QR');
  });

  // DEFECT-59-03: Real SHA-256 Digest rather than repeated 8-char chunk
  it('should produce a genuine 64-character SHA-256 digest in ephemeralChecksum', async () => {
    await component.syncChecksum();
    fixture.detectChanges();
    await fixture.whenStable();

    const checksum = component.ephemeralChecksum();
    expect(checksum).toHaveLength(64);

    const first8 = checksum.substring(0, 8);
    // It should not be an 8-character string repeated 8 times
    expect(checksum).not.toBe(first8.repeat(8));

    // Verify it matches computeTemplateHash for current options
    const expectedHash = await computeTemplateHash(component.options());
    expect(checksum).toBe(expectedHash);
  });

  // DEFECT-59-04: BEM Layout, Area separation & controls
  it('should adhere to BEM structure with l-extremo area classes', () => {
    const hostEl: HTMLElement = fixture.nativeElement;
    const previewHeader = hostEl.querySelector('.c-emergency-kit__preview-card .c-card__header');
    expect(previewHeader).toBeTruthy();

    const leftArea = previewHeader?.querySelector('.l-extremo__area-izquierda');
    const rightArea = previewHeader?.querySelector('.l-extremo__area-derecha');
    expect(leftArea).toBeTruthy();
    expect(rightArea).toBeTruthy();

    const previewStage = hostEl.querySelector('.c-emergency-kit__preview-stage');
    expect(previewStage).toBeTruthy();
  });

  // Prime Directive: Zero Network Exfiltration
  it('should never make any network calls during preview and PDF generation', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(window, 'XMLHttpRequest');

    component.updateKitTitle('Private Air-Gapped Test Kit');
    await component.syncChecksum();
    fixture.detectChanges();
    await fixture.whenStable();

    await component.downloadPdf();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
