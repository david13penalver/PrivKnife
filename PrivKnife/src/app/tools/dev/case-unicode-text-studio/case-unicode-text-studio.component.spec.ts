import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { CaseUnicodeTextStudioComponent } from './case-unicode-text-studio.component';
import { ACRONYM_VECTOR, BATCH_IDENTIFIERS, SURROGATE_SAMPLE } from './test-fixtures';

describe('CaseUnicodeTextStudioComponent (Spec 121 — Seam 2)', () => {
  let component: CaseUnicodeTextStudioComponent;
  let fixture: ComponentFixture<CaseUnicodeTextStudioComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let storageSpy: ReturnType<typeof vi.spyOn>;
  let mathSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    mathSpy = vi.spyOn(Math, 'random');

    await TestBed.configureTestingModule({
      imports: [CaseUnicodeTextStudioComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(CaseUnicodeTextStudioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    fetchSpy.mockRestore();
    storageSpy.mockRestore();
    mathSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders privacy badge, default input stats, and 13 live case cards', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
    expect(component.caseOutputs()).toHaveLength(13);
    expect(component.stats().characters).toBeGreaterThan(0);

    component.inputText.set(ACRONYM_VECTOR);
    fixture.detectChanges();
    const snake = component.caseOutputs().find((c) => c.id === 'snake');
    expect(snake?.value).toBe('xml_http_request_2_id');
  });

  it('switches cleanly across Unicode Styles (with accessibility note), Zalgo (with De-Zalgo), and Kaomoji search tabs', () => {
    component.activeTab.set('unicode');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(component.unicodeOutputs()).toHaveLength(16);
    expect(el.querySelector('.c-text-studio__advisory')).not.toBeNull();

    component.inputText.set('PrivKnife');
    component.activeTab.set('zalgo');
    fixture.detectChanges();
    expect(component.zalgoOutput().length).toBeGreaterThan('PrivKnife'.length);
    component.cleanZalgoInput();
    fixture.detectChanges();
    expect(component.inputText()).toBe('PrivKnife');

    component.activeTab.set('kaomoji');
    fixture.detectChanges();
    expect(component.filteredKaomojis().length).toBeGreaterThanOrEqual(150);
    component.kaomojiQuery.set('shrug');
    fixture.detectChanges();
    expect(component.filteredKaomojis().some((k) => k.emoticon === '¯\\_(ツ)_/¯')).toBe(true);
  });

  it('applies batch mode and quick text utilities including surrogate-safe reverse', () => {
    component.inputText.set(BATCH_IDENTIFIERS);
    component.batchLineByLine.set(true);
    fixture.detectChanges();
    const kebab = component.caseOutputs().find((c) => c.id === 'kebab');
    expect(kebab?.value).toBe('first-name\nlast-name\n\nxml-parser');

    component.applyQuickUtil('remove_empty');
    component.applyQuickUtil('sort_asc');
    expect(component.inputText()).toBe('firstName\nLAST_NAME\nXMLParser');

    component.inputText.set(SURROGATE_SAMPLE);
    component.applyQuickUtil('reverse');
    expect(component.inputText()).toBe('éB🚀A');
  });

  it('exports .txt files and revokes every created ObjectURL cleanly on reset and ngOnDestroy', () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-text-export');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);

    component.exportTxt('custom output', 'test.txt');
    component.exportTxt('second output', 'second.txt');
    expect(createSpy).toHaveBeenCalledTimes(2);

    component.reset();
    expect(revokeSpy).toHaveBeenCalledTimes(2);

    component.exportTxt('third output', 'third.txt');
    component.ngOnDestroy();
    expect(revokeSpy).toHaveBeenCalledTimes(3);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(mathSpy).not.toHaveBeenCalled();
  });
});
