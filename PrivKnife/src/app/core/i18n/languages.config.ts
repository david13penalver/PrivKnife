import { LanguageDefinition } from './types';

export const SUPPORTED_LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    direction: 'ltr',
  },
] as const;

export const DEFAULT_LANGUAGE_CODE = 'en';
export const STORAGE_KEY_LANG = 'privknife_lang';

export function getLanguageByCode(code: string): LanguageDefinition {
  const normalized = normalizeLanguageCode(code);
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.code === normalized);
  return (
    found ||
    SUPPORTED_LANGUAGES.find((lang) => lang.code === DEFAULT_LANGUAGE_CODE)!
  );
}

export function normalizeLanguageCode(rawCode: string | null | undefined): string {
  if (!rawCode) return DEFAULT_LANGUAGE_CODE;
  // Handle 'es-ES', 'es-MX', 'EN-US' etc.
  const primary = rawCode.toLowerCase().trim().split(/[-_]/)[0];
  const isSupported = SUPPORTED_LANGUAGES.some((lang) => lang.code === primary);
  return isSupported ? primary : DEFAULT_LANGUAGE_CODE;
}
