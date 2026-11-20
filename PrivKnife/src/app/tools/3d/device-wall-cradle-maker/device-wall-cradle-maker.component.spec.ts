import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { I18nService } from '../../../core/i18n';
import { DeviceWallCradleMakerComponent } from './device-wall-cradle-maker.component';
import { DEVICE_CRADLE_PRESET_CARDS } from './test-fixtures';

describe('DeviceWallCradleMakerComponent (Spec 129 — Seam 3)', () => {
  let component: DeviceWallCradleMakerComponent;
  let fixture: ComponentFixture<DeviceWallCradleMakerComponent>;
  let i18n: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [DeviceWallCradleMakerComponent],
      providers: [I18nService],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    await i18n.setLanguage('en');

    fixture = TestBed.createComponent(DeviceWallCradleMakerComponent);
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
      'Parametric Device Wall Mount & Power-Brick Cradle Maker'
    );

    await i18n.setLanguage('es');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Creador Paramétrico de Soportes de Pared y Fuentes bajo Escritorio'
    );

    await i18n.setLanguage('ar');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'مصمم حوامل الحائط وحاضنات الأجهزة البارامتري'
    );
  });

  it('switches device presets, surfaces bed-fit warnings, and validates thin walls', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.c-input__slider').length).toBeGreaterThanOrEqual(4);
    expect(el.querySelectorAll('.c-input__control').length).toBeGreaterThanOrEqual(2);
    expect(el.querySelector('.c-device-cradle__viewport-hud')).toBeTruthy();

    const railsPreset = DEVICE_CRADLE_PRESET_CARDS.find((p) => p.id === 'wide_minipc_rails')!;
    component.applyPreset(railsPreset);
    fixture.detectChanges();
    expect(component.options().cradleStyle).toBe('slide_rails_pair');
    expect(component.metrics()?.partCount).toBe(2);

    component.patchOptions({ cradleStyle: 'u_wrap_cradle', deviceWidthMm: 240 });
    fixture.detectChanges();
    expect(component.metrics()?.exceedsStandardBed).toBe(true);
    expect(el.querySelector('.c-device-cradle__bed-warn')).toBeTruthy();

    component.updateOption('wallThicknessMm', 1.0);
    fixture.detectChanges();
    expect(component.validationError()).toBeTruthy();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('2.8');
  });

  it('triggers a single rebuildScene pass on parameter change and disposes BufferGeometries', () => {
    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

    component.patchOptions({ deviceWidthMm: 88, fitClearanceMm: 1.0 });
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
    const url = 'blob:privknife-device-cradle-test';
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
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-cradle-stl');
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
