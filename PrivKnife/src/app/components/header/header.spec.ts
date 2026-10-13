import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Header } from './header';
import { I18nService } from '../../core/i18n';

describe('Header Component', () => {
  let fixture: ComponentFixture<Header>;
  let component: Header;
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
      imports: [Header],
      providers: [provideRouter([]), I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create the header component', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand title PrivKnife', () => {
    const titleElement = fixture.nativeElement.querySelector('.c-header__title');
    expect(titleElement.textContent).toContain('PrivKnife');
  });

  it('should display privacy badge with localized text', () => {
    const badgeElement = fixture.nativeElement.querySelector('app-badge');
    expect(badgeElement).toBeTruthy();
    expect(badgeElement.textContent).toContain('100% In-Browser');
  });

  it('should display the language selector component', () => {
    const langSelector = fixture.nativeElement.querySelector('app-lang-selector');
    expect(langSelector).toBeTruthy();
  });

  it('should reactively update tagline and badge when switching language to Spanish', async () => {
    await i18nService.setLanguage('es');
    fixture.detectChanges();

    const taglineElement = fixture.nativeElement.querySelector('.c-header__tagline');
    expect(taglineElement.textContent).toContain('Caja de Herramientas Privada');

    const badgeElement = fixture.nativeElement.querySelector('app-badge');
    expect(badgeElement.textContent).toContain('100% en el Navegador');
  });
});
