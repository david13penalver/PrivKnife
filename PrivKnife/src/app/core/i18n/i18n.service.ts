import { Injectable, signal } from '@angular/core';
import { en } from './locales/en';
import {
  DEFAULT_LANGUAGE_CODE,
  getLanguageByCode,
  normalizeLanguageCode,
  STORAGE_KEY_LANG,
  SUPPORTED_LANGUAGES,
} from './languages.config';
import { LanguageDefinition, TranslationDictionary, TranslationParams } from './types';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  readonly supportedLanguages = SUPPORTED_LANGUAGES;

  // Primary reactive signals
  readonly currentLang = signal<LanguageDefinition>(
    getLanguageByCode(DEFAULT_LANGUAGE_CODE)
  );
  readonly translations = signal<Record<string, any>>(en);
  readonly isLoading = signal<boolean>(false);

  // In-memory dictionary cache to prevent redundant dynamic imports
  private readonly dictionaryCache = new Map<string, Record<string, any>>([
    ['en', en],
  ]);

  private readonly englishCatalog = signal<TranslationDictionary>({});
  private readonly englishToolDetails = signal<TranslationDictionary>({});
  private readonly englishToolRequests = new Map<string, Promise<void>>();
  private englishCatalogRequest?: Promise<void>;
  private languageRequest = 0;

  constructor() {
    this.initLanguage();
  }

  /**
   * Initializes the active language following the 3-tier resolution ladder:
   * 1. Explicit user choice in localStorage ('privknife_lang')
   * 2. OS / Browser language auto-detection via navigator.languages
   * 3. Default fallback ('en')
   */
  initLanguage(): void {
    let targetCode = DEFAULT_LANGUAGE_CODE;

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_LANG);
        if (stored) {
          targetCode = normalizeLanguageCode(stored);
        } else {
          targetCode = this.detectBrowserLanguage();
        }
      } catch {
        targetCode = this.detectBrowserLanguage();
      }
    } else {
      targetCode = this.detectBrowserLanguage();
    }

    // Apply resolved language
    this.setLanguage(targetCode).catch((err) => {
      console.error('Failed to initialize language:', err);
    });
  }

  /**
   * Inspects browser/OS navigator.languages to find the first matching supported language.
   */
  detectBrowserLanguage(): string {
    if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE_CODE;

    const languages = navigator.languages || [navigator.language || ''];
    for (const lang of languages) {
      if (!lang) continue;
      const normalized = normalizeLanguageCode(lang);
      // If normalized matches a supported non-default language (or explicitly default)
      const isDirectMatch = SUPPORTED_LANGUAGES.some(
        (sl) => sl.code === lang.toLowerCase().trim().split(/[-_]/)[0]
      );
      if (isDirectMatch) {
        return normalized;
      }
    }

    return DEFAULT_LANGUAGE_CODE;
  }

  /**
   * Switches the active language, loading dictionary asynchronously if needed.
   */
  async setLanguage(rawCode: string): Promise<void> {
    const code = normalizeLanguageCode(rawCode);
    const targetLangDef = getLanguageByCode(code);

    const request = ++this.languageRequest;
    this.isLoading.set(true);
    try {
      const dictionary = await this.loadDictionary(code);
      if (request !== this.languageRequest) return;
      this.translations.set(dictionary);
      this.currentLang.set(targetLangDef);

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY_LANG, code);
        } catch {
          // Ignore localStorage errors (e.g. private mode quota)
        }
      }

      this.updateDocumentAttributes(targetLangDef);
    } finally {
      if (request === this.languageRequest) this.isLoading.set(false);
    }
  }

  /**
   * Dynamic chunk loader for modular dictionaries.
   * New languages can be added here with zero changes to any component or template.
   */
  private async loadDictionary(code: string): Promise<Record<string, any>> {
    if (this.dictionaryCache.has(code)) {
      return this.dictionaryCache.get(code)!;
    }

    let dict: Record<string, any>;
    switch (code) {
      case 'es':
        dict = (await import('./locales/es')).es;
        break;
      case 'fr':
        dict = (await import('./locales/fr')).fr;
        break;
      case 'it':
        dict = (await import('./locales/it')).it;
        break;
      case 'de':
        dict = (await import('./locales/de')).de;
        break;
      case 'zh':
        dict = (await import('./locales/zh')).zh;
        break;
      case 'ja':
        dict = (await import('./locales/ja')).ja;
        break;
      case 'ar':
        dict = (await import('./locales/ar')).ar;
        break;
      case 'en':
      default:
        dict = en;
        break;
    }

    this.dictionaryCache.set(code, dict);
    return dict;
  }

  /** Load tool card text and the requested English controls before a route renders. */
  async loadEnglishTools(...scopes: string[]): Promise<void> {
    const catalog = this.englishCatalogRequest ??= import('./locales/en-tool-catalog')
      .then(({ enToolCatalog }) => this.englishCatalog.set(enToolCatalog))
      .catch((error: unknown) => {
        this.englishCatalogRequest = undefined;
        throw error;
      });

    await Promise.all([catalog, ...scopes.map((scope) => this.loadEnglishToolDetails(scope))]);
  }

  private loadEnglishToolDetails(scope: string): Promise<void> {
    const pending = this.englishToolRequests.get(scope);
    if (pending) return pending;

    const request = import('./locales/en-tool-loaders').then(async ({ enToolLoaders }) => {
      if (!Object.hasOwn(enToolLoaders, scope)) return;
      const { default: details } = await enToolLoaders[scope as keyof typeof enToolLoaders]();
      this.englishToolDetails.update((current) => ({ ...current, [scope]: details }));
    }).catch((error: unknown) => {
      this.englishToolRequests.delete(scope);
      throw error;
    });
    this.englishToolRequests.set(scope, request);
    return request;
  }

  /**
   * Synchronizes document.documentElement lang and dir attributes.
   */
  private updateDocumentAttributes(langDef: LanguageDefinition): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = langDef.code;
      document.documentElement.dir = langDef.direction;
    }
  }

  /**
   * Translates a dot-notation key (e.g. 'home.heroTitle') with optional parameter interpolation.
   * Gracefully falls back to English if the key is missing in the active language.
   */
  t(key: string, params?: TranslationParams): string {
    if (!key) return '';

    const currentDict = this.translations();
    let value = this.resolveKeyPath(currentDict, key);

    // Fallback to English if missing or not a string
    if (typeof value !== 'string') {
      if (key.startsWith('tools.')) {
        const path = key.slice('tools.'.length);
        value = this.resolveKeyPath(this.englishCatalog(), path) ??
          this.resolveKeyPath(this.englishToolDetails(), path);
      } else {
        value = this.resolveKeyPath(en, key);
      }
    }

    // If still not a string, return the key itself
    if (typeof value !== 'string') {
      return key;
    }

    // Interpolate dynamic parameters {param}
    if (params) {
      return this.interpolate(value, params);
    }

    return value;
  }

  /**
   * Traverses nested object paths using dot notation.
   */
  private resolveKeyPath(obj: Record<string, any>, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;

    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Replaces {token} with provided parameter values.
   */
  private interpolate(text: string, params: TranslationParams): string {
    let result = text;
    for (const [k, v] of Object.entries(params)) {
      const token = `{${k}}`;
      result = result.replaceAll(token, String(v));
    }
    return result;
  }
}
