import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import {
  NANOSECOND_VECTOR,
  NEGATIVE_EPOCH_VECTOR,
} from './test-fixtures';
import { TimestampTimezoneConverterComponent } from './timestamp-timezone-converter.component';

describe('TimestampTimezoneConverterComponent (Seam 2: Live Clock, Nanosecond UI & Lifecycle)', () => {
  let component: TimestampTimezoneConverterComponent;
  let fixture: ComponentFixture<TimestampTimezoneConverterComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let storageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [TimestampTimezoneConverterComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(TimestampTimezoneConverterComponent);
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

  it('initializes with privacy badge, live clock pause/resume toggle, and valid default output', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
    expect(component.nowEpochSeconds()).toBeGreaterThan(1_700_000_000);
    expect(component.isClockPaused()).toBe(false);

    component.toggleClockPause();
    expect(component.isClockPaused()).toBe(true);
    component.toggleClockPause();
    expect(component.isClockPaused()).toBe(false);
  });

  it('preserves nanosecond precision, decodes negative pre-1970 epochs, and pins/unpins IANA timezones', () => {
    component.inputText.set(NANOSECOND_VECTOR);
    fixture.detectChanges();
    expect(component.parsedResult().valid).toBe(true);
    expect(component.parsedResult().epochNanoseconds).toBe(NANOSECOND_VECTOR);
    expect(component.parsedResult().isoUtc).toBe('2025-11-19T11:20:00.123456789Z');

    component.inputText.set(NEGATIVE_EPOCH_VECTOR);
    fixture.detectChanges();
    expect(component.parsedResult().isoUtc).toBe('1969-12-31T00:00:00.000Z');

    const beforeCount = component.pinnedTimezones().length;
    component.pinTimezone('Europe/Berlin');
    expect(component.pinnedTimezones().length).toBe(beforeCount + 1);
    component.unpinTimezone('Europe/Berlin');
    expect(component.pinnedTimezones().length).toBe(beforeCount);
  });

  it('computes duration delta and applies calendar offsets in Delta Calculator tab', () => {
    component.setActiveTab('delta');
    component.deltaStartInput.set('2026-01-05T00:00:00Z');
    component.deltaEndInput.set('2026-01-07T12:30:00Z');
    fixture.detectChanges();

    expect(component.deltaResult()?.sign).toBe(1);
    expect(component.deltaResult()?.breakdown.days).toBe(2);
    expect(component.deltaResult()?.breakdown.hours).toBe(12);
    expect(component.deltaResult()?.breakdown.minutes).toBe(30);

    component.offsetDays.set(1);
    component.offsetHours.set(3);
    component.offsetMinutes.set(0);
    component.offsetSeconds.set(0);
    component.applyOffsetToEnd();
    expect(component.deltaEndInput()).toBe('2026-01-06T03:00:00.000Z');
  });

  it('exports CSV/JSON in Batch tab, clears clock interval, revokes ObjectURLs on reset/ngOnDestroy, and makes zero network/storage calls', () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:ts-csv')
      .mockReturnValueOnce('blob:ts-json')
      .mockReturnValueOnce('blob:ts-csv-2');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    component.setActiveTab('batch');
    fixture.detectChanges();
    expect(component.batchRows().length).toBe(6);

    component.exportBatchCsv();
    component.exportBatchJson();
    expect(createSpy).toHaveBeenCalledTimes(2);

    component.reset();
    expect(revokeSpy).toHaveBeenCalledWith('blob:ts-csv');
    expect(revokeSpy).toHaveBeenCalledWith('blob:ts-json');

    component.exportBatchCsv();
    component.ngOnDestroy();
    expect(revokeSpy).toHaveBeenCalledWith('blob:ts-csv-2');
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});
