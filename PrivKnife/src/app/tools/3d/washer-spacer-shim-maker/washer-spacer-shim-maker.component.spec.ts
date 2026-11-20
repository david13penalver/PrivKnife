import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { I18nService } from '../../../core/i18n';
import { WasherSpacerShimMakerComponent } from './washer-spacer-shim-maker.component';
import { HARDWARE_PRESET_CARDS } from './test-fixtures';

describe('WasherSpacerShimMakerComponent (Spec 127 — Seam 3)', () => {
  let component: WasherSpacerShimMakerComponent;
  let fixture: ComponentFixture<WasherSpacerShimMakerComponent>;
  let i18n: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [WasherSpacerShimMakerComponent],
      providers: [I18nService],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    await i18n.setLanguage('en');

    fixture = TestBed.createComponent(WasherSpacerShimMakerComponent);
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
      'Parametric Washer, Spacer, Standoff, Shim & Bushing Maker'
    );

    await i18n.setLanguage('es');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Generador Paramétrico de Arandelas, Espaciadores, Separadores y Cuñas'
    );

    await i18n.setLanguage('ar');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'مصمم الحلقات والفواصل والدعامات البارامتري'
    );
  });

  it('applies M2-M10 fastener presets, validates thin radial walls, and surfaces high-aspect stability warnings', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.c-input__slider').length).toBeGreaterThanOrEqual(4);
    expect(el.querySelectorAll('.c-input__control').length).toBeGreaterThanOrEqual(1);
    expect(el.querySelector('.c-hardware-part__viewport-hud')).toBeTruthy();

    component.applyBoltPreset('M4');
    fixture.detectChanges();
    expect(component.options().boltPreset).toBe('M4');
    expect(component.options().innerDiameterMm).toBe(4.3);

    const standoffPreset = HARDWARE_PRESET_CARDS.find((p) => p.id === 'vesa_m4_standoff')!;
    component.applyPreset(standoffPreset);
    fixture.detectChanges();
    expect(component.options().partType).toBe('hex_standoff');

    component.patchOptions({ partType: 'washer_spacer', outerDiameterMm: 8, heightMm: 36, innerDiameterMm: 3.2 });
    fixture.detectChanges();
    expect(component.metrics()?.highAspectWarning).toBe(true);
    expect(el.querySelector('.c-hardware-part__stability-warn')).toBeTruthy();

    component.patchOptions({ outerDiameterMm: 10, innerDiameterMm: 9, holeToleranceMm: 0 });
    fixture.detectChanges();
    expect(component.validationError()).toBeTruthy();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('0.80');
  });

  it('triggers a single rebuildScene pass on parameter change and disposes BufferGeometries cleanly', () => {
    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

    component.patchOptions({ quantity: 6, heightMm: 8 });
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
    const url = 'blob:privknife-hardware-part-test';
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

  it('runs fallback STL and 3MF export cleanly without Worker or network/storage calls', async () => {
    vi.stubGlobal('Worker', undefined);
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-hardware-stl');
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
