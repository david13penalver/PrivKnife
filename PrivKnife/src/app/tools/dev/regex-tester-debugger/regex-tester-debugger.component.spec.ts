import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { RegexTesterDebuggerComponent } from './regex-tester-debugger.component';
import { XSS_CORPUS_SAMPLE } from './test-fixtures';
import { RegexTesterResult } from './types';

describe('RegexTesterDebuggerComponent (Seam 3: Highlighting, XSS Safety, ReDoS Alert & Cleanup)', () => {
  let component: RegexTesterDebuggerComponent;
  let fixture: ComponentFixture<RegexTesterDebuggerComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    await TestBed.configureTestingModule({
      imports: [RegexTesterDebuggerComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(RegexTesterDebuggerComponent);
    component = fixture.componentInstance;
    await component.runTest();
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with default ISO date pattern, privacy badge, 2 matches, and AST explanation', () => {
    expect(component).toBeTruthy();
    expect(component.flags().global).toBe(true);
    expect(component.result()?.valid).toBe(true);
    expect(component.result()?.matches).toHaveLength(2);
    expect(component.result()?.explanation.length).toBeGreaterThanOrEqual(3);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
  });

  it('renders XSS corpus safely via text interpolation with zero <script> or <img> DOM injection', async () => {
    component.updateTestString(XSS_CORPUS_SAMPLE);
    await component.runTest();
    fixture.detectChanges();

    expect(component.result()?.matches).toHaveLength(2);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<script>alert(1)</script>');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('supports live replacement, 5-language code generator tabs, and ReDoS timeout alert display', async () => {
    component.toggleReplaceMode(true);
    await component.runTest();
    fixture.detectChanges();
    expect(component.result()?.replacedText).toBe('Dates: 19/11/2026 and 05/01/2027');

    component.setInspectorTab('codegen');
    component.setCodeLanguage('python');
    fixture.detectChanges();
    expect(component.generatedCode()).toContain('(?P<year>');

    // Verify ReDoS timeout warning state renders clearly
    const fakeTimeout: RegexTesterResult = {
      valid: true,
      timedOut: true,
      redosWarning: true,
      staticRedosHazard: true,
      truncated: false,
      matches: [],
      explanation: [],
      executionMs: 1500,
    };
    component.result.set(fakeTimeout);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toMatch(/ReDoS|timeout|terminated/i);
  });

  it('exports JSON/CSV match reports with ObjectURL revocation and disposes watchdog on reset/ngOnDestroy', async () => {
    vi.useFakeTimers();
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-regex-export');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.exportMatches('json');
    component.exportMatches('csv');
    expect(createSpy).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(200);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-regex-export');

    const disposeSpy = vi.spyOn(
      component as unknown as { disposeWatchdog: () => void },
      'disposeWatchdog'
    );
    component.reset();
    component.ngOnDestroy();
    expect(disposeSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
