import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Footer } from './footer';
import { I18nService } from '../../core/i18n';

describe('Footer Component', () => {
  let fixture: ComponentFixture<Footer>;
  let component: Footer;
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
      imports: [Footer],
      providers: [provideRouter([]), I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create the footer component', () => {
    expect(component).toBeTruthy();
  });

  it('should render copyright, privacy text, and navigation links in English', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('PrivKnife');
    expect(text).toContain('Zero Server Storage');
    expect(text).toContain('Zero Cookies');
    expect(text).toContain('Privacy');
    expect(text).toContain('Terms');
    expect(text).toContain('UI Kit');
  });

  it('should reactively update footer text when switching to Spanish', async () => {
    await i18nService.setLanguage('es');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Cero Almacenamiento en Servidor');
    expect(text).toContain('Privacidad');
    expect(text).toContain('Términos');
    expect(text).toContain('Kit de UI');
  });
});
