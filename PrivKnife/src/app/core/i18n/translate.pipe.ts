import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from './i18n.service';
import { TranslationParams } from './types';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, params?: TranslationParams): string {
    return this.i18n.t(key, params);
  }
}
