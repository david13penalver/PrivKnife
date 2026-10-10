import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../components/badge/badge';
import { Card } from '../../components/card/card';

@Component({
  selector: 'app-terms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Card],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 840px;">
      <div class="l-columns__area g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="neutral">
            📜 MIT Open Source License &bull; Legal Terms
          </app-badge>
        </div>
        <h1 class="g--text-center">Terms of Service</h1>
        <p class="g--text-center g--margin-top-2" style="color: var(--color-text-muted);">
          Effective date: October 2026
        </p>
      </div>

      <div class="l-columns__area">
        <app-card title="1. Acceptance of Terms">
          <div>
            <p>
              By accessing and using <strong>PrivKnife</strong>, you agree to these Terms of Service.
              PrivKnife is provided free of charge, open-source, and operates strictly within your local web browser.
            </p>
          </div>
        </app-card>
      </div>

      <div class="l-columns__area g--margin-top-4">
        <app-card title="2. 100% User Data Ownership">
          <div>
            <p>
              You retain 100% of the ownership, intellectual property rights, and copyright to all files,
              images, documents, text, and data you process using PrivKnife tools.
            </p>
            <p class="g--margin-top-3">
              Because PrivKnife processes all operations locally without server ingestion, PrivKnife does
              not store, view, license, or claim any interest in your generated or modified assets.
            </p>
          </div>
        </app-card>
      </div>

      <div class="l-columns__area g--margin-top-4">
        <app-card title="3. Open Source Software (MIT License)">
          <div>
            <p>
              PrivKnife is licensed under the terms of the <strong>MIT License</strong>.
            </p>
            <div
              class="g--margin-top-3 g--padding-3"
              style="background-color: var(--color-surface-hover); border-radius: var(--radius-sm); font-family: var(--font-code); font-size: 0.875rem; line-height: 1.5;">
              Permission is hereby granted, free of charge, to any person obtaining a copy
              of this software and associated documentation files (the "Software"), to deal
              in the Software without restriction, including without limitation the rights
              to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
              copies of the Software.
            </div>
          </div>
        </app-card>
      </div>

      <div class="l-columns__area g--margin-top-4">
        <app-card title="4. Disclaimer of Warranty (&quot;AS IS&quot;)">
          <div>
            <p>
              THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
              AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
              LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
              OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
              SOFTWARE.
            </p>
          </div>
        </app-card>
      </div>

      <div class="l-columns__area g--margin-top-4">
        <app-card title="5. Lawful & Responsible Use">
          <div>
            <p>
              You agree to use PrivKnife in compliance with all applicable local, national, and
              international laws and regulations. You may not use this software for malicious file
              tampering, generating illicit content, or unauthorized cryptographic activities.
            </p>
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
export class Terms {}
