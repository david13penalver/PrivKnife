import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <footer class="c-footer">
      <div class="c-footer__inner">
        <div class="c-footer__copy">
          &copy; 2026 PrivKnife. Open Source under MIT License.
        </div>

        <div class="c-footer__privacy-note">
          <span aria-hidden="true">🛡️</span>
          <span>Zero Server Storage &bull; Zero Telemetry &bull; Zero Cookies</span>
        </div>

        <div class="c-footer__links">
          <a routerLink="/privacy">Privacy</a>
          <a routerLink="/terms">Terms</a>
          <a routerLink="/ui-kit">UI Kit</a>
          <a
            href="https://github.com/david13penalver/PrivKnife"
            target="_blank"
            rel="noopener noreferrer">
            GitHub
          </a>
          <a
            href="https://github.com/david13penalver/PrivKnife/issues"
            target="_blank"
            rel="noopener noreferrer">
            Contact & Issues
          </a>
        </div>
      </div>
    </footer>
  `,
})
export class Footer {}
