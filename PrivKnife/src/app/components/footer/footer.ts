import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="c-footer">
      <div class="c-footer__inner">
        <div class="c-footer__copy">
          &copy; 2026 PrivKnife. Open Source under MIT License.
        </div>

        <div class="c-footer__privacy-note">
          <span aria-hidden="true">🛡️</span>
          <span>Zero Server Storage &bull; Zero Telemetry &bull; Client-Side Only</span>
        </div>

        <div class="c-footer__links">
          <a
            href="https://github.com/david13penalver/PrivKnife"
            target="_blank"
            rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  `,
})
export class Footer {}
