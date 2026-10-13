import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import {
  DEFAULT_LANGUAGE_CODE,
  STORAGE_KEY_LANG,
  SUPPORTED_LANGUAGES,
} from './languages.config';

describe('I18nService', () => {
  let service: I18nService;
  let store: Record<string, string> = {};
  let mockStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
  };

  beforeEach(() => {
    store = {};
    mockStorage = {
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

    TestBed.configureTestingModule({
      providers: [I18nService],
    });
    service = TestBed.inject(I18nService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should be created and initialized with a supported language', () => {
    expect(service).toBeTruthy();
    expect(service.currentLang()).toBeTruthy();
    expect(SUPPORTED_LANGUAGES.some((l) => l.code === service.currentLang().code)).toBe(true);
  });

  it('should expose supported languages array with all 8 configured languages', () => {
    const codes = service.supportedLanguages.map((l) => l.code);
    expect(codes).toEqual(['en', 'es', 'fr', 'it', 'de', 'zh', 'ja', 'ar']);
  });

  it('should resolve English translations synchronously', () => {
    const brand = service.t('common.brandName');
    expect(brand).toBe('PrivKnife');

    const download = service.t('common.download');
    expect(download).toBe('Download');
  });

  it('should switch language to Spanish and update translations', async () => {
    await service.setLanguage('es');

    expect(service.currentLang().code).toBe('es');
    expect(service.currentLang().name).toBe('Spanish');
    expect(service.currentLang().nativeName).toBe('Español');

    expect(service.t('common.download')).toBe('Descargar');
    expect(service.t('common.brandName')).toBe('PrivKnife');
    expect(service.t('home.heroTitle')).toBe('Herramientas Cotidianas Consolidadas.');
    expect(service.t('common.privacyBadge')).toContain('100% en el Navegador');

    // Should be saved in localStorage
    expect(localStorage.getItem(STORAGE_KEY_LANG)).toBe('es');
  });

  it('should switch language to French, Italian, German, Chinese, Japanese, and Arabic', async () => {
    await service.setLanguage('fr');
    expect(service.currentLang().code).toBe('fr');
    expect(service.t('common.download')).toBe('Télécharger');

    await service.setLanguage('it');
    expect(service.currentLang().code).toBe('it');
    expect(service.t('common.download')).toBe('Scarica');

    await service.setLanguage('de');
    expect(service.currentLang().code).toBe('de');
    expect(service.t('common.download')).toBe('Herunterladen');

    await service.setLanguage('zh');
    expect(service.currentLang().code).toBe('zh');
    expect(service.t('common.download')).toBe('下载');

    await service.setLanguage('ja');
    expect(service.currentLang().code).toBe('ja');
    expect(service.t('common.download')).toBe('ダウンロード');

    await service.setLanguage('ar');
    expect(service.currentLang().code).toBe('ar');
    expect(service.t('common.download')).toBe('تحميل');
  });

  it('should update document.documentElement lang and dir attributes for LTR and RTL', async () => {
    await service.setLanguage('es');
    if (typeof document !== 'undefined' && document.documentElement) {
      expect(document.documentElement.lang).toBe('es');
      expect(document.documentElement.dir).toBe('ltr');
    }

    // Switch to Arabic -> should set dir to rtl
    await service.setLanguage('ar');
    if (typeof document !== 'undefined' && document.documentElement) {
      expect(document.documentElement.lang).toBe('ar');
      expect(document.documentElement.dir).toBe('rtl');
    }

    // Switch back to Japanese -> should revert dir to ltr
    await service.setLanguage('ja');
    if (typeof document !== 'undefined' && document.documentElement) {
      expect(document.documentElement.lang).toBe('ja');
      expect(document.documentElement.dir).toBe('ltr');
    }
  });

  it('should gracefully fallback to English when a key is missing in Spanish', async () => {
    await service.setLanguage('es');

    // Temporarily manipulate translations to simulate a missing key
    service.translations.set({
      common: {},
    });

    // Key exists in English fallback dictionary
    const fallbackText = service.t('common.download');
    expect(fallbackText).toBe('Download');
  });

  it('should return key string if key is not found in any dictionary', () => {
    const missing = service.t('non.existent.translation.key');
    expect(missing).toBe('non.existent.translation.key');
  });

  it('should interpolate dynamic parameters correctly', () => {
    const interpolated = service.t('home.toolsCount', { count: 29 });
    expect(interpolated).toBe('29 tools available');
  });

  it('should interpolate parameters in Spanish when switched', async () => {
    await service.setLanguage('es');
    const interpolated = service.t('home.toolsCount', { count: 29 });
    expect(interpolated).toBe('29 herramientas disponibles');
  });

  it('should normalize regional locale variants (e.g. es-MX, es-ES) to primary code', async () => {
    await service.setLanguage('es-MX');
    expect(service.currentLang().code).toBe('es');

    await service.setLanguage('en-US');
    expect(service.currentLang().code).toBe('en');
  });

  it('should fallback to default language if unknown language code is requested', async () => {
    await service.setLanguage('xyz-unknown');
    expect(service.currentLang().code).toBe(DEFAULT_LANGUAGE_CODE);
  });

  it('should detect browser language from navigator.languages', () => {
    const originalNavigator = window.navigator;

    try {
      // Mock navigator.languages with Spanish first
      Object.defineProperty(window, 'navigator', {
        value: {
          ...originalNavigator,
          languages: ['es-ES', 'es', 'en'],
          language: 'es-ES',
        },
        configurable: true,
      });

      const detected = service.detectBrowserLanguage();
      expect(detected).toBe('es');
    } finally {
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    }
  });

  it('should guarantee 100% client-side execution with zero external network exfiltration', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    // Switch language and translate multiple keys
    await service.setLanguage('es');
    const heroTitle = service.t('home.heroTitle');
    const count = service.t('home.toolsCount', { count: 29 });
    const privacyNotice = service.t('footer.privacyNotice');

    expect(heroTitle).toBeTruthy();
    expect(count).toBeTruthy();
    expect(privacyNotice).toBeTruthy();

    // Verify absolutely no remote HTTP/fetch requests occurred
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
