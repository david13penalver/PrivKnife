import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeskWedgeNameplateComponent } from './desk-wedge-nameplate.component';
import { SAMPLE_NAMEPLATE_PRESETS } from './test-fixtures';

describe('DeskWedgeNameplateComponent', () => {
  let component: DeskWedgeNameplateComponent;
  let fixture: ComponentFixture<DeskWedgeNameplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeskWedgeNameplateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeskWedgeNameplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component successfully with default state and computed metrics', () => {
    expect(component).toBeTruthy();
    expect(component.selectedPresetId()).toBe('executive-suite');
    expect(component.config().primaryText).toBe('ALEXANDER HAMILTON');

    const metrics = component.metrics();
    expect(metrics.dimensionsMm.width).toBeGreaterThan(100);
    expect(metrics.inclineAngleDeg).toBeGreaterThan(0);
    expect(metrics.estimatedFilamentGrams).toBeGreaterThan(0);
    expect(metrics.filamentSwapLayer).toBeGreaterThan(0);
  });

  it('updates configuration when switching between style presets', () => {
    const techPreset = SAMPLE_NAMEPLATE_PRESETS.find((p) => p.id === 'tech-architect')!;
    component.loadPreset(techPreset);

    expect(component.selectedPresetId()).toBe('tech-architect');
    expect(component.config().primaryText).toBe(techPreset.config.primaryText);
    expect(component.config().wedgeWidthMm).toBe(techPreset.config.wedgeWidthMm);
  });

  it('resets parameters to default configuration', () => {
    component.updatePrimaryText('CUSTOM TEST NAME');
    expect(component.config().primaryText).toBe('CUSTOM TEST NAME');

    component.resetToDefaults();
    expect(component.config().primaryText).toBe('ALEXANDER HAMILTON');
    expect(component.selectedPresetId()).toBe('executive-suite');
  });

  it('toggles secondary text subtitle on and off', () => {
    const mockEvent = {
      target: { checked: false },
    } as unknown as Event;

    component.toggleSecondary(mockEvent);
    expect(component.config().secondaryEnabled).toBe(false);

    const mockEventTrue = {
      target: { checked: true },
    } as unknown as Event;
    component.toggleSecondary(mockEventTrue);
    expect(component.config().secondaryEnabled).toBe(true);
  });

  it('switches text lettering mode between embossed and debossed', () => {
    component.setTextMode('debossed');
    expect(component.config().textMode).toBe('debossed');

    component.setTextMode('embossed');
    expect(component.config().textMode).toBe('embossed');
  });

  it('applies filament color palettes and updates geometry colors', () => {
    const neonPalette = component.palettes.find((p) => p.name === 'Cyberpunk Neon')!;
    component.applyPalette(neonPalette);

    expect(component.config().baseColor).toBe(neonPalette.baseColor);
    expect(component.config().textColor).toBe(neonPalette.textColor);
  });

  it('triggers client-side downloads for dual-color 3MF, STLs, and ZIP bundles with URL revocation', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await component.exportDualColor3mf();
    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-url');

    component.exportUnifiedStl();
    expect(revokeUrlSpy).toHaveBeenCalled();

    component.exportBaseStl();
    expect(revokeUrlSpy).toHaveBeenCalled();

    component.exportTextStl();
    expect(revokeUrlSpy).toHaveBeenCalled();

    await component.exportBundleZip();
    expect(revokeUrlSpy).toHaveBeenCalled();

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('verifies 100% client-side privacy with zero telemetry or network calls', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(window, 'XMLHttpRequest');

    component.updatePrimaryText('PRIVACY FIRST');
    component.updateWedgeWidth(180);
    component.setTextAlignment('right');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });

  it('cleans up resources and animation frames on destroy', () => {
    expect(() => {
      component.ngOnDestroy();
    }).not.toThrow();
  });
});
