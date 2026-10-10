import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../components/badge/badge';
import { Card } from '../../components/card/card';

@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Card],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 840px;">
      <div class="l-columns__area g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Zero Server Ingestion
          </app-badge>
        </div>
        <h1 class="g--text-center">Privacy Policy & Architecture</h1>
        <p class="g--text-center g--margin-top-2" style="color: var(--color-text-muted);">
          Last updated: October 2026 &bull; Architecture Guarantee
        </p>
      </div>

      <div class="l-columns__area">
        <app-card title="1. Privacy by Architecture, Not by Policy">
          <div>
            <p>
              Most online utilities upload your sensitive files, documents, photos, and spreadsheets
              to remote cloud servers for processing. Even when services advertise a strict privacy policy,
              your data still traverses external networks and sits in third-party server memory or storage.
            </p>
            <p class="g--margin-top-3">
              <strong>PrivKnife is built on a fundamentally different principle:</strong>
              We do not operate backend ingestion servers. Every transformation, conversion, compression,
              and metadata extraction executes <strong>100% inside your web browser</strong> using
              client-side WebAssembly (WASM), Web Workers, the Web Crypto API, and the HTML5 Canvas API.
              Your files physically cannot leave your machine because there is nowhere to send them.
            </p>
          </div>
        </app-card>
      </div>

      <div class="l-columns__area g--margin-top-4">
        <app-card title="2. Zero Telemetry & Zero Tracking">
          <div>
            <p>
              PrivKnife does <strong>not</strong> include:
            </p>
            <ul class="g--margin-top-2 g--padding-left-4" style="list-style-type: disc;">
              <li>Google Analytics, Mixpanel, PostHog, or Segment tracking</li>
              <li>User fingerprinting scripts or canvas tracking</li>
              <li>Third-party advertising pixels (Facebook Pixel, TikTok, Twitter/X)</li>
              <li>Remote exception reporters that exfiltrate file metadata (Sentry, LogRocket)</li>
            </ul>
            <p class="g--margin-top-3">
              We respect your right to complete digital anonymity.
            </p>
          </div>
        </app-card>
      </div>

      <div class="l-columns__area g--margin-top-4">
        <app-card title="3. Zero-Cookie Policy">
          <div>
            <p>
              PrivKnife does not use any tracking cookies, advertising cookies, or third-party cookies.
              Under the EU GDPR and ePrivacy Directive, intrusive cookie consent banners are only required
              when non-essential tracking cookies are deployed. Because we use zero tracking cookies,
              we do not bombard you with cookie popups.
            </p>
            <p class="g--margin-top-3">
              The only browser storage used is client-side <code>localStorage</code>, strictly for
              persisting your visual interface preferences (such as Light/Dark mode). This data never
              leaves your browser.
            </p>
          </div>
        </app-card>
      </div>

      <div class="l-columns__area g--margin-top-4">
        <app-card title="4. Memory Hygiene & Resource Disposal">
          <div>
            <p>
              When you load files into a PrivKnife tool, temporary in-memory objects (such as
              <code>Blob</code> and <code>ObjectURL</code> references) are created within your browser's
              sandbox.
            </p>
            <p class="g--margin-top-3">
              All object URLs are systematically revoked immediately upon download completion or when you
              navigate away from the tool, preventing memory leaks and ensuring your data does not persist
              in memory.
            </p>
          </div>
        </app-card>
      </div>

      <div class="l-columns__area g--margin-top-4">
        <app-card title="5. Verifiable Open Source Code">
          <div>
            <p>
              You do not have to take our word for it. You can verify our zero-network architecture at any time:
            </p>
            <ol class="g--margin-top-2 g--padding-left-4" style="list-style-type: decimal;">
              <li>
                <strong>Browser DevTools:</strong> Open your browser's Developer Tools (F12) &rarr;
                <em>Network</em> tab. Drag and drop any file into any tool and observe that zero network
                requests are transmitted.
              </li>
              <li class="g--margin-top-2">
                <strong>Public Source Code:</strong> PrivKnife is fully open source under the MIT license.
                Review every line of code on GitHub.
              </li>
            </ol>
            <div class="g--margin-top-4">
              <a
                href="https://github.com/david13penalver/PrivKnife"
                target="_blank"
                rel="noopener noreferrer"
                class="c-button c-button--outline">
                Inspect GitHub Repository &rarr;
              </a>
            </div>
          </div>
        </app-card>
      </div>

      <div class="l-columns__area g--margin-top-6 g--text-center">
        <a routerLink="/" class="c-button c-button--primary">
          &larr; Back to Tools Showcase
        </a>
      </div>
    </div>
  `,
})
export class Privacy {}
