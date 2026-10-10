import { DestroyRef, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly defaultTitle = 'PrivKnife — Private In-Browser Swiss Army Knife';
  readonly defaultDescription =
    'A private, client-side Swiss Army Knife of everyday tools. PDF tools, media compressors, EXIF strippers, 3D generators — 100% in-browser with zero servers and zero telemetry.';
  readonly defaultOgImage = 'https://privknife.com/og-image.png';
  readonly siteBaseUrl = 'https://privknife.com';

  /**
   * Initializes router subscription to automatically update title & meta tags from route data.
   */
  initRouteListener(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        let currentRoute = this.route.root;
        while (currentRoute.firstChild) {
          currentRoute = currentRoute.firstChild;
        }

        const data = currentRoute.snapshot.data as SeoConfig | undefined;
        if (data) {
          this.updateTags(data);
        }
      });
  }

  /**
   * Directly sets the document title and meta/OG tags.
   */
  updateTags(config: SeoConfig = {}): void {
    const title = config.title
      ? config.title.includes('PrivKnife')
        ? config.title
        : `${config.title} — PrivKnife`
      : this.defaultTitle;

    const description = config.description || this.defaultDescription;
    const ogImage = config.ogImage || this.defaultOgImage;
    const currentPath = this.router.url.split('?')[0];
    const fullUrl = config.url
      ? `${this.siteBaseUrl}${config.url.startsWith('/') ? config.url : `/${config.url}`}`
      : `${this.siteBaseUrl}${currentPath}`;

    this.titleService.setTitle(title);

    // Standard meta
    this.metaService.updateTag({ name: 'description', content: description });
    if (config.keywords && config.keywords.length > 0) {
      this.metaService.updateTag({ name: 'keywords', content: config.keywords.join(', ') });
    }

    // Open Graph
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: ogImage });
    this.metaService.updateTag({ property: 'og:url', content: fullUrl });

    // Twitter Cards
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: ogImage });
  }
}
