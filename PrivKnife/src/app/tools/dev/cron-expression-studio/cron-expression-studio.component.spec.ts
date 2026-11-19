import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { CronExpressionStudioComponent } from './cron-expression-studio.component';
import { ANCHOR_2026_START_UTC_MS } from './test-fixtures';

describe('CronExpressionStudioComponent (Seam 2: Builder UI, Bilingual Explainer & Lifecycle)', () => {
  let component: CronExpressionStudioComponent;
  let fixture: ComponentFixture<CronExpressionStudioComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let storageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [CronExpressionStudioComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(CronExpressionStudioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    storageSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('initializes with privacy badge, default valid 5-field schedule, human summary, and 10 runs', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();

    expect(component.format()).toBe('standard_5');
    expect(component.result().valid).toBe(true);
    expect(component.result().humanDescription).toMatch(/15 minutes/i);
    expect(component.result().runs).toHaveLength(10);
  });

  it('switches bilingual EN/ES explainer, 5-field vs 6-field formats, and leap-day preset', () => {
    component.setExplainerLocale('es');
    fixture.detectChanges();
    expect(component.result().humanDescription).toMatch(/15 minutos/i);

    component.setFormat('extended_6');
    fixture.detectChanges();
    expect(component.format()).toBe('extended_6');
    expect(component.expression().split(/\s+/)).toHaveLength(6);

    component.timezone.set('UTC');
    component.referenceDateMs.set(ANCHOR_2026_START_UTC_MS);
    component.applyPreset('leap_day');
    fixture.detectChanges();
    expect(component.format()).toBe('standard_5');
    expect(component.result().runs[0]?.isoUtc).toBe('2028-02-29T00:00:00.000Z');
  });

  it('updates expression bidirectionally via visual builder helpers and flags impossible dates safely', () => {
    component.setActiveBuilderField('hours');
    component.applyFieldInterval(2);
    expect(component.expression()).toContain('*/2');

    component.setActiveBuilderField('daysOfWeek');
    component.applyFieldEvery();
    component.toggleChipValue(1);
    expect(component.expression().endsWith('1')).toBe(true);

    component.expression.set('0 0 31 2 *');
    fixture.detectChanges();
    expect(component.result().valid).toBe(true);
    expect(component.result().impossibleDateWarning).toBe(true);
    expect(component.result().runs).toEqual([]);
  });

  it('exports JSON and CSV runs and revokes every created ObjectURL on reset and ngOnDestroy with zero network/storage calls', () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:cron-json')
      .mockReturnValueOnce('blob:cron-csv')
      .mockReturnValueOnce('blob:cron-json-2');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.exportJson();
    component.exportCsv();
    expect(createSpy).toHaveBeenCalledTimes(2);

    component.reset();
    expect(revokeSpy).toHaveBeenCalledWith('blob:cron-json');
    expect(revokeSpy).toHaveBeenCalledWith('blob:cron-csv');

    component.applyPreset('every_5m');
    component.exportJson();
    component.ngOnDestroy();
    expect(revokeSpy).toHaveBeenCalledWith('blob:cron-json-2');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});
