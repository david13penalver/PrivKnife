import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../components/badge/badge';
import { Card } from '../../components/card/card';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Card],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto g--text-center" style="max-width: 640px;">
      <div class="l-columns__area g--margin-bottom-4">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="danger">
            404 &bull; Not Found
          </app-badge>
        </div>

        <div class="g--margin-bottom-4">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            class="g--margin-x-auto">
            <rect width="120" height="120" rx="24" fill="#e11d48" fill-opacity="0.1" />
            <rect x="20" y="20" width="80" height="80" rx="16" fill="#e11d48" />
            <!-- Broken/Missing cross illustration -->
            <path
              d="M50 36H70V50H84V70H70V84H50V70H36V50H50V36Z"
              fill="white"
              fill-opacity="0.9" />
            <circle cx="82" cy="38" r="14" fill="#0f172a" />
            <path
              d="M78 34L86 42M86 34L78 42"
              stroke="#e11d48"
              stroke-width="2.5"
              stroke-linecap="round" />
          </svg>
        </div>

        <h1>Page Not Found</h1>
        <p class="g--margin-top-3" style="color: var(--color-text-muted); font-size: 1.125rem;">
          The tool or page you are looking for does not exist, was moved, or is still being forged.
        </p>
      </div>

      <div class="l-columns__area g--margin-bottom-6">
        <app-card>
          <div card-header>
            <h2 style="font-size: 1.125rem;">Looking for a tool?</h2>
          </div>
          <div>
            <p>
              PrivKnife features 29+ client-side tools designed for privacy, performance, and offline capability.
            </p>
            <div class="g--flex-center g--margin-top-4" style="gap: 12px; flex-wrap: wrap;">
              <a routerLink="/" class="c-button c-button--primary">
                &larr; Back to Tools Showcase
              </a>
              <a routerLink="/privacy" class="c-button c-button--outline">
                Privacy Architecture
              </a>
              <a
                href="https://github.com/david13penalver/PrivKnife/issues"
                target="_blank"
                rel="noopener noreferrer"
                class="c-button c-button--outline">
                Report an Issue
              </a>
            </div>
          </div>
        </app-card>
      </div>
    </div>
  `,
})
export class NotFound {}
