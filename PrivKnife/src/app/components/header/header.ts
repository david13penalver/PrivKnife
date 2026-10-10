import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button],
  template: `
    <header class="c-header">
      <div class="c-header__inner">
        <a class="c-header__brand" href="/">
          <div class="c-header__logo" aria-hidden="true">🇨🇭</div>
          <div>
            <div class="c-header__title">PrivKnife</div>
            <div class="c-header__tagline">Private In-Browser Toolkit</div>
          </div>
        </a>

        <div class="c-header__actions">
          <app-badge variant="privacy" [dot]="true">
            100% In-Browser
          </app-badge>

          <app-button
            variant="ghost"
            size="small"
            (clicked)="toggleTheme()"
            [attr.aria-label]="isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'">
            {{ isDarkMode() ? '☀️ Light' : '🌙 Dark' }}
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
