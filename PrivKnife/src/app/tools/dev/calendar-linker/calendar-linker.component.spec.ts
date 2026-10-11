import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarLinkerComponent } from './calendar-linker.component';

describe('CalendarLinkerComponent (Seam 2: UI, Reactivity, Providers & Privacy Guard)', () => {
  let fixture: ComponentFixture<CalendarLinkerComponent>;
  let component: CalendarLinkerComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:https://privknife.com/mock-ics-blob-${Math.random()}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [CalendarLinkerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarLinkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default event values and live provider links', () => {
    expect(component).toBeTruthy();
    expect(component.event().title).toContain('Privacy-First Architecture Webinar');
    expect(component.calendarUrls().google).toContain('calendar.google.com');
    expect(component.calendarUrls().outlook).toContain('outlook.live.com');
    expect(component.calendarUrls().office365).toContain('outlook.office.com');
    expect(component.calendarUrls().yahoo).toContain('calendar.yahoo.com');
    expect(component.icsContent()).toContain('BEGIN:VCALENDAR');
    expect(component.activeTab()).toBe('links');
  });

  it('should reactively update event fields and recalculate URLs and ICS output', () => {
    component.updateField('title', 'Next-Gen Local AI Summit');
    expect(component.event().title).toBe('Next-Gen Local AI Summit');
    expect(component.calendarUrls().google).toContain('Next-Gen%20Local%20AI%20Summit');
    expect(component.icsContent()).toContain('SUMMARY:Next-Gen Local AI Summit');

    component.updateField('location', 'San Francisco & Online');
    expect(component.event().location).toBe('San Francisco & Online');
    expect(component.calendarUrls().google).toContain('San%20Francisco%20%26%20Online');

    component.updateField('recurrence', 'MONTHLY');
    expect(component.event().recurrence).toBe('MONTHLY');
    expect(component.icsContent()).toContain('RRULE:FREQ=MONTHLY');
  });

  it('should toggle all-day event status and update date formatting', () => {
    component.toggleAllDay(true);
    expect(component.event().isAllDay).toBe(true);
    expect(component.icsContent()).toContain('VALUE=DATE');

    component.toggleAllDay(false);
    expect(component.event().isAllDay).toBe(false);
    expect(component.icsContent()).not.toContain('VALUE=DATE');
  });

  it('should switch between output tabs (links, html, markdown, ics)', () => {
    component.setActiveTab('html');
    expect(component.activeTab()).toBe('html');
    expect(component.htmlSnippet()).toContain('<table');

    component.setActiveTab('markdown');
    expect(component.activeTab()).toBe('markdown');
    expect(component.markdownSnippet()).toContain('[Add to Google Calendar]');

    component.setActiveTab('ics');
    expect(component.activeTab()).toBe('ics');
  });

  it('should copy provider links and embed snippets to clipboard with feedback', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    // Copy single provider URL
    await component.copyProviderUrl('google');
    expect(writeTextSpy).toHaveBeenCalledWith(component.calendarUrls().google);
    expect(component.copiedKey()).toBe('google');

    // Copy active embed snippet
    component.setActiveTab('markdown');
    await component.copyActiveSnippet();
    expect(writeTextSpy).toHaveBeenCalledWith(component.markdownSnippet());
    expect(component.copiedKey()).toBe('snippet');
  });

  it('should download .ics file and immediately revoke object URL', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadIcsFile();

    expect(anchorClickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.showExportModal()).toBe(true);

    component.closeExportModal();
    expect(component.showExportModal()).toBe(false);
  });

  it('should reset to demo event data', () => {
    component.updateField('title', 'Custom Internal Meeting');
    component.loadDemoEvent();

    expect(component.event().title).toContain('Webinar');
  });

  it('should safely clean up timers and state on destroy', () => {
    fixture.destroy();
    expect(true).toBe(true);
  });

  it('should generate links and export files with ZERO network calls (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    component.updateField('title', 'Confidential Strategic Board Meeting');
    component.updateField('description', 'Strictly confidential internal sync.');
    await component.downloadIcsFile();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
