import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { I18nService } from '../../../core/i18n';
import { RuggedHingedBoxMakerComponent } from './rugged-hinged-box-maker.component';
import { RUGGED_BOX_PRESETS } from './test-fixtures';

describe('RuggedHingedBoxMakerComponent (Spec 124 — Seam 3)', () => {
  let component: RuggedHingedBoxMakerComponent;
  let fixture: ComponentFixture<RuggedHingedBoxMakerComponent>;
  let i18n: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [RuggedHingedBoxMakerComponent],
      providers: [I18nService],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    await i18n.setLanguage('en');

    fixture = TestBed.createComponent(RuggedHingedBoxMakerComponent);
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
      'Parametric Rugged Hinged Storage Box & Parts Organizer'
    );

    await i18n.setLanguage('es');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Caja Robusta Paramétrica con Bisagra y Organizador'
    );

    await i18n.setLanguage('ar');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'صندوق تخزين متين بمفصلات ومقسّمات بارامترية ثلاثي الأبعاد'
    );
  });

  it('applies presets, toggles open/closed preview without rebuilding geometry, and validates out-of-range dimensions', () => {
    const filterPreset = RUGGED_BOX_PRESETS.find((p) => p.id === 'waterproof_camera_box')!;
    component.applyPreset(filterPreset);
    fixture.detectChanges();

    expect(component.options().innerLengthMm).toBe(140);
    expect(component.options().includeGasketChannel).toBe(true);
    expect(component.metrics()?.outerWidthMm).toBeGreaterThan(146);

    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    const initialOpen = component.options().previewOpen;
    component.togglePreviewOpen();
    fixture.detectChanges();

    expect(component.options().previewOpen).toBe(!initialOpen);
    expect(rebuildSpy).not.toHaveBeenCalled();

    component.updateOption('innerLengthMm', 20);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(component.validationError()).toBeTruthy();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('60');
  });

  it('rebuilds geometry exactly once per option change and disposes BufferGeometries', () => {
    const prevTriCount = component.metrics()!.triangleCount;
    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

    component.updateOption('ribCountPerSide', 5);
    fixture.detectChanges();

    expect(rebuildSpy).toHaveBeenCalledTimes(1);
    expect(disposeSpy).toHaveBeenCalled();
    expect(component.metrics()!.triangleCount).toBeGreaterThan(prevTriCount);
  });

  it('enforces BEM input and viewport HUD classes across all controls', () => {
    const el = fixture.nativeElement as HTMLElement;
    const selects = el.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(3);
    selects.forEach((s) => expect(s.classList.contains('c-input__control')).toBe(true));

    const sliders = el.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBeGreaterThanOrEqual(6);
    sliders.forEach((r) => expect(r.classList.contains('c-input__slider')).toBe(true));

    const hud = el.querySelector('.c-rugged-box__viewport-hud');
    expect(hud).toBeTruthy();
    expect(hud!.querySelectorAll('button').length).toBeGreaterThanOrEqual(4);
  });

  it('tracks and revokes createdObjectUrls on export, reset(), and ngOnDestroy() and terminates Worker', async () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:box-stl')
      .mockReturnValueOnce('blob:box-3mf');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const terminateSpy = vi.fn();

    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage(data: { id: number; type: 'export-stl' | 'export-3mf' }): void {
        const isStl = data.type === 'export-stl';
        this.onmessage?.({
          data: {
            id: data.id,
            type: 'result',
            percent: 100,
            buffer: isStl ? new Uint8Array(134).buffer : new Uint8Array([0x50, 0x4b, 3, 4]).buffer,
            fileName: isStl ? 'box.stl' : 'box.3mf',
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
    expect(revokeSpy).toHaveBeenCalledWith('blob:box-stl');
    expect(revokeSpy).toHaveBeenCalledWith('blob:box-3mf');
    expect(terminateSpy).toHaveBeenCalledTimes(2);

    component['createdObjectUrls'].push('blob:leak-check-1');
    component.reset();
    expect(revokeSpy).toHaveBeenCalledWith('blob:leak-check-1');

    component['createdObjectUrls'].push('blob:leak-check-2');
    component.ngOnDestroy();
    expect(revokeSpy).toHaveBeenCalledWith('blob:leak-check-2');
  });

  it('performs zero fetch, XHR, or localStorage calls during interactions and exports', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-box');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.stubGlobal('Worker', undefined);

    component.applyPreset(RUGGED_BOX_PRESETS[3]);
    component.toggleWireframe();
    component.resetView();
    await component.exportFormat('stl');
    await component.exportFormat('3mf');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
