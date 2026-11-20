import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { I18nService } from '../../../core/i18n';
import { ToolBitHolderMakerComponent } from './tool-bit-holder-maker.component';
import { TOOL_HOLDER_PRESET_CARDS } from './test-fixtures';

describe('ToolBitHolderMakerComponent (Spec 126 — Seam 3)', () => {
  let component: ToolBitHolderMakerComponent;
  let fixture: ComponentFixture<ToolBitHolderMakerComponent>;
  let i18n: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [ToolBitHolderMakerComponent],
      providers: [I18nService],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    await i18n.setLanguage('en');

    fixture = TestBed.createComponent(ToolBitHolderMakerComponent);
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
      'Parametric Tool, Drill Bit, Hex Key & Nozzle Organizer Maker'
    );

    await i18n.setLanguage('es');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Organizador Paramétrico de Brocas, Puntas Hex, Llaves Allen y Boquillas'
    );

    await i18n.setLanguage('ar');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'مصمم منظمات المثاقب والمفاتيح وفوهات الطابعات البارامتري'
    );
  });

  it('uses .c-input__control and .c-input__slider classes, switches presets, and shows validation alert on invalid input', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.c-input__slider').length).toBeGreaterThanOrEqual(4);
    expect(el.querySelectorAll('.c-input__control').length).toBeGreaterThanOrEqual(2);
    expect(el.querySelector('.c-tool-rack__viewport-hud')).toBeTruthy();

    const hexPreset = TOOL_HOLDER_PRESET_CARDS.find((p) => p.id === 'hex_bits_quarter')!;
    component.applyPreset(hexPreset);
    fixture.detectChanges();
    expect(component.options().preset).toBe('hex_bits_quarter');
    expect(component.options().includeBottomMagnets).toBe(true);
    expect(component.metrics()?.slotCount).toBe(12);

    component.updateOption('customSpecText', 'abc, -2');
    component.updateOption('preset', 'custom');
    fixture.detectChanges();
    expect(component.validationError()).toBeTruthy();
    expect(el.querySelector('[role="alert"]')?.textContent).toBeTruthy();
  });

  it('runs a single rebuildScene pass on parameter change and disposes BufferGeometries', () => {
    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

    component.patchOptions({ rows: 3, stepRiseMm: 14 });
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
    const url = 'blob:privknife-tool-rack-test';
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

  it('triggers fallback STL/3MF export cleanly when Worker is unavailable without network or storage calls', async () => {
    vi.stubGlobal('Worker', undefined);
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-rack-stl');
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
