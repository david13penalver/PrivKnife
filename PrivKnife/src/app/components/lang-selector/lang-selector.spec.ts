import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LangSelector } from './lang-selector';
import { I18nService } from '../../core/i18n';
import { STORAGE_KEY_LANG } from '../../core/i18n/languages.config';

describe('LangSelector Component', () => {
  let fixture: ComponentFixture<LangSelector>;
  let component: LangSelector;
  let i18nService: I18nService;
  let store: Record<string, string> = {};

  beforeEach(async () => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    };
    vi.stubGlobal('localStorage', mockStorage);

    await TestBed.configureTestingModule({
      imports: [LangSelector],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(LangSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create the language selector component', () => {
    expect(component).toBeTruthy();
  });

  it('should render trigger button with current language code and flag', () => {
    const button = fixture.nativeElement.querySelector('.c-lang-selector__button');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('en');
  });

  it('should have menu closed initially', () => {
    const menu = fixture.nativeElement.querySelector('.c-lang-selector__menu');
    expect(menu).toBeNull();
  });

  it('should open menu when button is clicked', () => {
    const button = fixture.nativeElement.querySelector('.c-lang-selector__button');
    button.click();
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('.c-lang-selector__menu');
    expect(menu).toBeTruthy();

    const items = fixture.nativeElement.querySelectorAll('.c-lang-selector__item');
    expect(items.length).toBe(i18nService.supportedLanguages.length);
  });

  it('should switch language to Spanish and close menu when Spanish is selected', async () => {
    const button = fixture.nativeElement.querySelector('.c-lang-selector__button');
    button.click();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.c-lang-selector__item');
    const spanishItem = Array.from(items).find((el: any) =>
      el.textContent.includes('Español')
    ) as HTMLButtonElement;

    expect(spanishItem).toBeTruthy();
    spanishItem.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    fixture.detectChanges();

    expect(i18nService.currentLang().code).toBe('es');
    expect(store[STORAGE_KEY_LANG]).toBe('es');

    const menuAfter = fixture.nativeElement.querySelector('.c-lang-selector__menu');
    expect(menuAfter).toBeNull();
  });

  it('should close menu when Escape key is pressed', () => {
    const button = fixture.nativeElement.querySelector('.c-lang-selector__button');
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.c-lang-selector__menu')).toBeTruthy();

    window.document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.c-lang-selector__menu')).toBeNull();
  });

  it('should close menu when clicking outside', () => {
    const button = fixture.nativeElement.querySelector('.c-lang-selector__button');
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.c-lang-selector__menu')).toBeTruthy();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.c-lang-selector__menu')).toBeNull();
  });
});
