import { inject, type Type } from '@angular/core';
import { I18nService } from './i18n.service';

/** Fetch English fallback strings alongside the component, before the first render. */
export function withEnglishToolCatalog<T>(
  loadComponent: () => Promise<Type<T>>,
  ...scopes: string[]
): () => Promise<Type<T>> {
  return async () => {
    const i18n = inject(I18nService);
    const [component] = await Promise.all([loadComponent(), i18n.loadEnglishTools(...scopes)]);
    return component;
  };
}
