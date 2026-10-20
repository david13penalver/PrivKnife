import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EmergencyRecoveryKitComponent } from './emergency-recovery-kit.component';

describe('EmergencyRecoveryKitComponent', () => {
  let component: EmergencyRecoveryKitComponent;
  let fixture: ComponentFixture<EmergencyRecoveryKitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmergencyRecoveryKitComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmergencyRecoveryKitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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

  it('should switch between preset templates', () => {
    component.loadPreset('crypto_vault');
    fixture.detectChanges();

    expect(component.options().kitTitle).toContain('COLD STORAGE');
    expect(component.options().seedPhraseWordCount).toBe(12);
    expect(component.options().highContrastMonochrome).toBe(true);

    component.loadPreset('comprehensive');
    fixture.detectChanges();
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
});
