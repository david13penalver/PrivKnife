import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { I18nService } from '../../../core/i18n';
import { DrawerDividerGridMakerComponent } from './drawer-divider-grid-maker.component';
import { DRAWER_GRID_PRESETS } from './test-fixtures';

describe('DrawerDividerGridMakerComponent (Spec 125 — Seam 3)', () => {
  let component: DrawerDividerGridMakerComponent;
  let fixture: ComponentFixture<DrawerDividerGridMakerComponent>;
  let i18n: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [DrawerDividerGridMakerComponent],
      providers: [I18nService],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    await i18n.loadEnglishTools('drawerDividerGridMaker');
    await i18n.setLanguage('en');

    fixture = TestBed.createComponent(DrawerDividerGridMakerComponent);
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
      'Parametric Custom Drawer Divider & Interlocking Grid Maker'
    );

    await i18n.setLanguage('es');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'Creador Paramétrico de Divisores y Rejillas para Cajones'
    );

    await i18n.setLanguage('ar');
    fixture.detectChanges();
    expect(el.querySelector('.c-header__title')?.textContent).toContain(
      'مصمم فواصل وشبكات الأدراج المتداخلة البارامتري'
    );
  });

  it('applies oversized preset, toggles view mode without rebuilding geometry, and validates out-of-range drawer size', () => {
    const cutlery = DRAWER_GRID_PRESETS.find((p) => p.id === 'kitchen_cutlery_500')!;
    component.applyPreset(cutlery);
    fixture.detectChanges();

    expect(component.options().drawerWidthMm).toBe(500);
    expect(component.metrics()?.dovetailSplitCount).toBeGreaterThanOrEqual(2);

    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    expect(component.options().viewMode).toBe('assembled');
    component.toggleViewMode();
    fixture.detectChanges();
    expect(component.options().viewMode).toBe('flat_plates');
    expect(rebuildSpy).not.toHaveBeenCalled();

    component.updateOption('drawerWidthMm', 20);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(component.validationError()).toBeTruthy();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('80');
  });

  it('triggers single rebuildScene pass on parameter change and disposes BufferGeometries cleanly', () => {
    const prevSlats = component.metrics()!.totalSlatsCount;
    const rebuildSpy = vi.spyOn(
      component as unknown as { rebuildScene: () => void },
      'rebuildScene'
    );
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

    component.patchOptions({ colCount: 5, customColRatios: '' });
    fixture.detectChanges();

    expect(rebuildSpy).toHaveBeenCalledTimes(1);
    expect(disposeSpy).toHaveBeenCalled();
    expect(component.metrics()!.totalSlatsCount).toBeGreaterThan(prevSlats);
  });

  it('enforces BEM input and viewport HUD classes across all controls', () => {
    const el = fixture.nativeElement as HTMLElement;
    const selects = el.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    selects.forEach((s) => expect(s.classList.contains('c-input__control')).toBe(true));

    const sliders = el.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBeGreaterThanOrEqual(6);
    sliders.forEach((r) => expect(r.classList.contains('c-input__slider')).toBe(true));

    const hud = el.querySelector('.c-drawer-grid__viewport-hud');
    expect(hud).toBeTruthy();
    expect(hud!.querySelectorAll('button').length).toBeGreaterThanOrEqual(4);
  });

  it('tracks and revokes createdObjectUrls on STL/3MF/ZIP export, reset(), and ngOnDestroy() and terminates Worker', async () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:grid-stl')
      .mockReturnValueOnce('blob:grid-3mf')
      .mockReturnValueOnce('blob:grid-zip');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const terminateSpy = vi.fn();

    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage(data: { id: number; type: 'export-stl' | 'export-3mf' | 'export-zip' }): void {
        const mime =
          data.type === 'export-stl'
            ? 'model/stl'
            : data.type === 'export-3mf'
              ? 'model/3mf'
              : 'application/zip';
        this.onmessage?.({
          data: {
            id: data.id,
            type: 'result',
            percent: 100,
            buffer: new Uint8Array(134).buffer,
            fileName: 'grid.out',
            mimeType: mime,
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
    await component.exportFormat('zip');

    expect(createSpy).toHaveBeenCalledTimes(3);
    expect(revokeSpy).toHaveBeenCalledWith('blob:grid-stl');
    expect(revokeSpy).toHaveBeenCalledWith('blob:grid-3mf');
    expect(revokeSpy).toHaveBeenCalledWith('blob:grid-zip');
    expect(terminateSpy).toHaveBeenCalledTimes(3);

    component['createdObjectUrls'].push('blob:stale-grid');
    component.reset();
    expect(revokeSpy).toHaveBeenCalledWith('blob:stale-grid');

    component['createdObjectUrls'].push('blob:destroy-grid');
    component.ngOnDestroy();
    expect(revokeSpy).toHaveBeenCalledWith('blob:destroy-grid');
  });

  it('performs zero fetch, XHR, or localStorage calls across interactions and exports', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-grid');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.stubGlobal('Worker', undefined);

    component.applyPreset(DRAWER_GRID_PRESETS[2]);
    component.toggleWireframe();
    component.resetView();
    await component.exportFormat('stl');
    await component.exportFormat('3mf');
    await component.exportFormat('zip');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
