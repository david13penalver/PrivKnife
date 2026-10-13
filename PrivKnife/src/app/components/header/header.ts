import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { LangSelector } from '../lang-selector/lang-selector';
import { TranslatePipe } from '../../core/i18n';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Button, LangSelector, TranslatePipe],
  template: `
    <header class="c-header">
      <div class="c-header__inner">
        <a class="c-header__brand" routerLink="/">
          <div class="c-header__logo" aria-hidden="true">🇨🇭</div>
          <div>
            <div class="c-header__title">{{ 'header.title' | translate }}</div>
            <div class="c-header__tagline">{{ 'header.tagline' | translate }}</div>
          </div>
        </a>

        <div class="c-header__actions">
          <app-badge variant="privacy" [dot]="true">
            {{ 'common.inBrowserBadge' | translate }}
          </app-badge>

          <app-lang-selector />

          <app-button
            variant="ghost"
            size="small"
            (clicked)="toggleTheme()"
            [attr.aria-label]="isDarkMode() ? ('common.themeLight' | translate) : ('common.themeDark' | translate)">
            {{ isDarkMode() ? ('common.themeLight' | translate) : ('common.themeDark' | translate) }}
          </app-button>
        </div>
      </div>
    </header>
  `,
})
export class Header {
  protected readonly isDarkMode = signal<boolean>(false);

  protected toggleTheme(): void {
    const nextMode = !this.isDarkMode();
    this.isDarkMode.set(nextMode);

    if (typeof document !== 'undefined') {
      if (nextMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }
}
