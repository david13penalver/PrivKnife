import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { I18nService } from '../../../core/i18n';
import { CableCombClipMakerComponent } from './cable-comb-clip-maker.component';
import { CABLE_PRESET_CARDS, OVERLOADED_TINY_WINDER_FIXTURE } from './test-fixtures';

describe('CableCombClipMakerComponent (Spec 130 — Seam 3)', () => {
  let component: CableCombClipMakerComponent;
  let fixture: ComponentFixture<CableCombClipMakerComponent>;
  let i18n: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [CableCombClipMakerComponent],
      providers: [I18nService],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    await i18n.loadEnglishTools('cableCombClipMaker');
    await i18n.setLanguage('en');

    fixture = TestBed.createComponent(CableCombClipMakerComponent);
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
      'Parametric Cable Comb, Travel Cord Winder & Wall Clip Maker'
    );

    await i18n.setLanguage('es');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Creador Paramétrico de Peines para Cables, Enrolladores y Grapas de Pared'
    );

    await i18n.setLanguage('ar');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'مصمم أمشاط الكابلات وبكرات السفر ومشابك الحائط البارامتري'
    );
  });

  it('applies gauge chips, detects winder capacity overflows, and validates core bend radii', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.c-input__slider').length).toBeGreaterThanOrEqual(3);
    expect(el.querySelectorAll('.c-input__control').length).toBeGreaterThanOrEqual(1);
    expect(el.querySelector('.c-cable-maker__viewport-hud')).toBeTruthy();

    component.applyGaugePreset(8.0);
    fixture.detectChanges();
    expect(component.options().cableDiameterMm).toBe(8.0);

    const winderPreset = CABLE_PRESET_CARDS.find((p) => p.id === 'travel_winder_2m')!;
    component.applyPreset(winderPreset);
    fixture.detectChanges();
    expect(component.options().mode).toBe('travel_winder');
    expect(component.metrics()?.cordCapacityOk).toBe(true);

    component.patchOptions(OVERLOADED_TINY_WINDER_FIXTURE);
    fixture.detectChanges();
    expect(component.metrics()?.cordCapacityOk).toBe(false);
    expect(el.querySelector('.c-cable-maker__capacity-warn')).toBeTruthy();

    component.updateOption('winderCoreDiameterMm', 10);
    fixture.detectChanges();
    expect(component.validationError()).toBeTruthy();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('22');
  });

  it('runs a single rebuildScene pass on parameter change and disposes BufferGeometries', () => {
    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

    component.patchOptions({ slotCount: 8, entryPinchRatio: 0.85 });
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
    const url = 'blob:privknife-cable-comb-test';
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
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-cable-stl');
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
