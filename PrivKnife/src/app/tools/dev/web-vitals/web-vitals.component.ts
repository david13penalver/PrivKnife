import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n';

/**
 * Kept only for old bookmarks. PageSpeed requires sending the target URL to a
 * third party, so this route now explains why the former tool is unavailable.
 */
@Component({
  selector: 'app-web-vitals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <main class="l-page g--padding-4">
      <section class="c-card g--margin-x-auto g--padding-6" style="max-width: 760px;" role="status">
        <h1>{{ 'tools.webVitals.disabledTitle' | translate }}</h1>
        <p>{{ 'tools.webVitals.disabledDescription' | translate }}</p>
      </section>
    </main>
  `,
})
export class WebVitalsComponent {}
