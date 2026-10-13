export type TextDirection = 'ltr' | 'rtl';

export interface LanguageDefinition {
  code: string;            // ISO 639-1 code ('en', 'es', etc.)
  name: string;            // English name ('English', 'Spanish')
  nativeName: string;      // Native name ('English', 'Español')
  flag: string;            // Emoji flag or icon indicator ('🇺🇸', '🇪🇸')
  direction: TextDirection;// Text directionality ('ltr' or 'rtl')
}

export type TranslationParams = Record<string, string | number>;

export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}
