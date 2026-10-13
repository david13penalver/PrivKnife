import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { I18nService } from '../../core/i18n';

@Component({
  selector: 'app-lang-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="c-lang-selector" [class.c-lang-selector--open]="isOpen()">
      <button
        type="button"
        class="c-lang-selector__button"
        (click)="toggleMenu()"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="listbox"
        [attr.aria-label]="i18n.t('header.languageSelectAria')"
      >
        <span class="c-lang-selector__globe" aria-hidden="true">{{ currentLang().flag }}</span>
        <span class="c-lang-selector__code">{{ currentLang().code }}</span>
        <span
          class="c-lang-selector__chevron"
          [class.c-lang-selector__chevron--open]="isOpen()"
          aria-hidden="true"
        >▼</span>
      </button>

      @if (isOpen()) {
        <div
          class="c-lang-selector__menu"
          role="listbox"
          tabindex="-1"
          [attr.aria-label]="i18n.t('header.languageSelectAria')"
        >
          @for (lang of supportedLanguages; track lang.code) {
            <button
              type="button"
              class="c-lang-selector__item"
              [class.c-lang-selector__item--active]="lang.code === currentLang().code"
              role="option"
              [attr.aria-selected]="lang.code === currentLang().code"
              (click)="selectLanguage(lang.code)"
            >
              <div class="c-lang-selector__item-content">
                <span class="c-lang-selector__flag" aria-hidden="true">{{ lang.flag }}</span>
                <span class="c-lang-selector__name">{{ lang.nativeName }}</span>
              </div>
              @if (lang.code === currentLang().code) {
                <span class="c-lang-selector__check" aria-hidden="true">✓</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class LangSelector {
  protected readonly i18n = inject(I18nService);
  private readonly elementRef = inject(ElementRef);

  protected readonly isOpen = signal<boolean>(false);

  protected readonly currentLang = this.i18n.currentLang;
  protected readonly supportedLanguages = this.i18n.supportedLanguages;

  protected toggleMenu(): void {
    this.isOpen.update((v) => !v);
  }

  protected async selectLanguage(code: string): Promise<void> {
    await this.i18n.setLanguage(code);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
  }
}
