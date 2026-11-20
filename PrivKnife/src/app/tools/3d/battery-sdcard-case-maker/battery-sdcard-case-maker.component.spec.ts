import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { I18nService } from '../../../core/i18n';
import { BatterySdcardCaseMakerComponent } from './battery-sdcard-case-maker.component';
import { BATTERY_CASE_PRESETS } from './test-fixtures';

describe('BatterySdcardCaseMakerComponent (Spec 123 — Seam 3)', () => {
  let component: BatterySdcardCaseMakerComponent;
  let fixture: ComponentFixture<BatterySdcardCaseMakerComponent>;
  let i18n: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [BatterySdcardCaseMakerComponent],
      providers: [I18nService],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    await i18n.setLanguage('en');

    fixture = TestBed.createComponent(BatterySdcardCaseMakerComponent);
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

  it('renders privacy badge, localized title, and updates reactively for ES and AR locales', async () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')?.textContent).toContain('100% In-Browser');
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Parametric Battery Dispenser & Memory Card Case Maker'
    );

    await i18n.setLanguage('es');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Creador Paramétrico de Dispensadores de Pilas y Estuches SD'
    );

    await i18n.setLanguage('ar');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'مصمم موزّع البطاريات وحافظات بطاقات الذاكرة ثلاثي الأبعاد'
    );
  });

  it('switches between battery_dispenser and memory_card_case modes and applies presets cleanly', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(component.options().mode).toBe('battery_dispenser');
    expect(component.metrics()?.widthMm).toBeGreaterThan(50);

    const caseBtn = el.querySelector<HTMLButtonElement>('[data-testid="mode-memory-card-case"]');
    caseBtn?.click();
    fixture.detectChanges();

    expect(component.options().mode).toBe('memory_card_case');
    expect(el.querySelector('[data-testid="sd-slots-slider"]')).toBeTruthy();

    const skadisPreset = BATTERY_CASE_PRESETS.find((p) => p.id === '18650_skadis_8')!;
    component.applyPreset(skadisPreset);
    fixture.detectChanges();

    expect(component.options().cellPreset).toBe('18650');
    expect(component.options().mountStyle).toBe('skadis');
    expect(component.metrics()?.widthMm).toBeGreaterThan(68);
  });

  it('triggers exactly 1 rebuild per parameter update and disposes BufferGeometries cleanly', () => {
    const prevMetrics = component.metrics();
    const rebuildSpy = vi.spyOn(component as unknown as { rebuildScene: () => void }, 'rebuildScene');
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

    component.updateOption('stackCount', 16);
    fixture.detectChanges();

    expect(rebuildSpy).toHaveBeenCalledTimes(1);
    expect(disposeSpy).toHaveBeenCalled();
    expect(component.options().stackCount).toBe(16);
    expect(component.metrics()!.heightMm).toBeGreaterThan(prevMetrics!.heightMm);
  });

  it('shows accessible validation error alert when memory card case has all slots set to zero', () => {
    component.patchOptions({
      mode: 'memory_card_case',
      sdSlots: 0,
      microSdSlots: 0,
      cfExpressSlots: 0,
      switchCartSlots: 0,
      usbASlots: 0,
      usbCSlots: 0,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(component.validationError()).toBeTruthy();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('slot');
  });

  it('enforces BEM input and viewport HUD classes across all controls', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const selects = el.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
    selects.forEach((sel) => expect(sel.classList.contains('c-input__control')).toBe(true));

    const sliders = el.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBeGreaterThan(0);
    sliders.forEach((s) => expect(s.classList.contains('c-input__slider')).toBe(true));

    const hud = el.querySelector('.c-battery-case__viewport-hud');
    expect(hud).toBeTruthy();
    expect(hud!.querySelectorAll('button').length).toBeGreaterThanOrEqual(3);
  });

  it('tracks createdObjectUrls, revokes on export, reset(), and ngOnDestroy(), and terminates worker cleanly', async () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:stl-1')
      .mockReturnValueOnce('blob:3mf-1')
      .mockReturnValueOnce('blob:png-1');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const terminateSpy = vi.fn();

    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage(data: { id: number; type: 'export-stl' | 'export-3mf' }): void {
        const isStl = data.type === 'export-stl';
        const payload = isStl ? new Uint8Array(134).buffer : new Uint8Array([0x50, 0x4b, 3, 4]).buffer;
        this.onmessage?.({
          data: {
            id: data.id,
            type: 'result',
            percent: 100,
            buffer: payload,
            fileName: isStl ? 'out.stl' : 'out.3mf',
            mimeType: isStl ? 'model/stl' : 'model/3mf',
          },
        } as MessageEvent);
      }
      terminate(): void {
        terminateSpy();
      }
    }

    vi.stubGlobal('Worker', MockWorker);

    await component.exportFormat('stl');
    await component.exportFormat('3mf');

    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenCalledWith('blob:stl-1');
    expect(revokeSpy).toHaveBeenCalledWith('blob:3mf-1');
    expect(terminateSpy).toHaveBeenCalledTimes(2);

    // Track unrevoked URL edge case on reset() and ngOnDestroy()
    component['createdObjectUrls'].push('blob:stale-1', 'blob:stale-2');
    component.reset();
    expect(revokeSpy).toHaveBeenCalledWith('blob:stale-1');
    expect(revokeSpy).toHaveBeenCalledWith('blob:stale-2');
    expect(component['createdObjectUrls']).toHaveLength(0);

    component['createdObjectUrls'].push('blob:destroy-1');
    component.ngOnDestroy();
    expect(revokeSpy).toHaveBeenCalledWith('blob:destroy-1');
  });

  it('performs zero network requests or localStorage writes during full interaction & exports', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-only');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.applyPreset(BATTERY_CASE_PRESETS[3]);
    component.updateOption('fitToleranceMm', 0.45);
    component.toggleWireframe();
    component.resetView();

    // Disable global Worker so fallback path also stays 100% network/storage free
    vi.stubGlobal('Worker', undefined);
    await component.exportFormat('stl');
    await component.exportFormat('3mf');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
