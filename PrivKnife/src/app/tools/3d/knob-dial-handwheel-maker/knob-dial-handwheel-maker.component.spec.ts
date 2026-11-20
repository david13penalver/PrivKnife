import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { I18nService } from '../../../core/i18n';
import { KnobDialHandwheelMakerComponent } from './knob-dial-handwheel-maker.component';
import { KNOB_PRESET_CARDS } from './test-fixtures';

describe('KnobDialHandwheelMakerComponent (Spec 128 — Seam 3)', () => {
  let component: KnobDialHandwheelMakerComponent;
  let fixture: ComponentFixture<KnobDialHandwheelMakerComponent>;
  let i18n: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [KnobDialHandwheelMakerComponent],
      providers: [I18nService],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    await i18n.loadEnglishTools('knobDialHandwheelMaker');
    await i18n.setLanguage('en');

    fixture = TestBed.createComponent(KnobDialHandwheelMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    setItemSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders privacy badge and resolves EN, ES, and AR localized titles cleanly', async () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')?.textContent).toContain('100% In-Browser');
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Parametric Replacement Knob, Dial & Captive-Nut Thumbscrew Maker'
    );

    await i18n.setLanguage('es');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Creador Paramétrico de Perillas, Diales y Pomos con Tuerca Cautiva'
    );

    await i18n.setLanguage('ar');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'مصمم المقابض والأقراص والبراغي اليدوية البارامتري'
    );
  });

  it('switches presets, toggles section cutaway without rebuilding CSG, and validates thin hub wall', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.c-input__slider').length).toBeGreaterThanOrEqual(4);
    expect(el.querySelectorAll('.c-input__control').length).toBeGreaterThanOrEqual(2);
    expect(el.querySelector('.c-knob-maker__viewport-hud')).toBeTruthy();

    const starPreset = KNOB_PRESET_CARDS.find((p) => p.id === 'star_m6_handwheel')!;
    component.applyPreset(starPreset);
    fixture.detectChanges();
    expect(component.options().gripStyle).toBe('star_handwheel');
    expect(component.options().driveType).toBe('captive_hex_nut');

    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    expect(component.options().sectionCutaway).toBe(false);
    component.toggleSectionCutaway();
    fixture.detectChanges();
    expect(component.options().sectionCutaway).toBe(true);
    expect(rebuildSpy).not.toHaveBeenCalled();

    component.patchOptions({
      driveType: 'd_shaft',
      gripDiameterMm: 10,
      neckDiameterMm: 10,
      shaftDiameterMm: 8,
    });
    fixture.detectChanges();
    expect(component.validationError()).toBeTruthy();
    expect(el.querySelector('[role="alert"]')?.textContent).toBeTruthy();
  });

  it('runs a single rebuildScene pass on parameter change and disposes BufferGeometries cleanly', () => {
    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

    component.patchOptions({ gripDiameterMm: 36, flatRotationDeg: 90 });
    fixture.detectChanges();

    expect(rebuildSpy).toHaveBeenCalledTimes(1);
    expect(disposeSpy).toHaveBeenCalled();
  });

  it('terminates active Web Worker, revokes all createdObjectUrls, and disposes GPU resources on ngOnDestroy', () => {
    const terminateSpy = vi.fn();
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage = vi.fn();
      terminate = terminateSpy;
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const url = 'blob:privknife-knob-dial-test';
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(url);
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    component.createdObjectUrls.push(url);
    void component.exportStl();
    fixture.destroy();

    expect(terminateSpy).toHaveBeenCalledTimes(1);
    expect(revokeUrlSpy).toHaveBeenCalledWith(url);
    expect(component.createdObjectUrls).toHaveLength(0);
    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('exports fallback STL and 3MF cleanly when Worker is unavailable without network or storage calls', async () => {
    vi.stubGlobal('Worker', undefined);
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-knob-stl');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await component.exportStl();
    await component.export3mf();

    expect(createUrlSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });
});
