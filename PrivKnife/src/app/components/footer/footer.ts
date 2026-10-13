import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <footer class="c-footer">
      <div class="c-footer__inner">
        <div class="c-footer__copy">
          {{ 'footer.copyright' | translate }}
        </div>

        <div class="c-footer__privacy-note">
          <span aria-hidden="true">🛡️</span>
          <span>{{ 'footer.zeroStorage' | translate }}</span>
        </div>

        <div class="c-footer__links">
          <a routerLink="/privacy">{{ 'footer.privacyLink' | translate }}</a>
          <a routerLink="/terms">{{ 'footer.termsLink' | translate }}</a>
          <a routerLink="/ui-kit">{{ 'footer.uiKitLink' | translate }}</a>
          <a
            href="https://github.com/david13penalver/PrivKnife"
            target="_blank"
            rel="noopener noreferrer">
            {{ 'footer.githubLink' | translate }}
          </a>
          <a
            href="https://github.com/david13penalver/PrivKnife/issues"
            target="_blank"
            rel="noopener noreferrer">
            {{ 'footer.contactLink' | translate }}
          </a>
        </div>
      </div>
    </footer>
  `,
})
export class Footer {}
