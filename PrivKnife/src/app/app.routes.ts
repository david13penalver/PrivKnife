import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'PrivKnife — Private In-Browser Swiss Army Knife',
    data: {
      description:
        'A private, client-side Swiss Army Knife of everyday tools. PDF tools, media compressors, EXIF strippers, 3D generators — 100% in-browser with zero servers and zero telemetry.',
      keywords: ['privacy', 'swiss army knife', 'client-side tools', 'wasm', 'browser tools'],
      url: '/',
    },
    loadComponent: () => import('./pages/showcase/showcase').then((m) => m.Showcase),
  },
  {
    path: 'privacy',
    title: 'Privacy Policy & Architecture — PrivKnife',
    data: {
      description:
        'PrivKnife operates with zero servers and zero telemetry. Learn how our client-side architecture keeps your sensitive files on your machine.',
      keywords: ['privacy policy', 'zero telemetry', 'zero knowledge', 'in-browser', 'gdpr compliance'],
      url: '/privacy',
    },
    loadComponent: () => import('./pages/privacy/privacy').then((m) => m.Privacy),
  },
  {
    path: 'terms',
    title: 'Terms of Service — PrivKnife',
    data: {
      description:
        'Terms of Service and MIT Open Source License for PrivKnife. You retain 100% ownership of all processed files.',
      keywords: ['terms of service', 'mit license', 'open source', 'user ownership'],
      url: '/terms',
    },
    loadComponent: () => import('./pages/terms/terms').then((m) => m.Terms),
  },
  {
    path: '**',
    title: 'Page Not Found — PrivKnife',
    data: {
      description:
        'The tool or page you requested could not be found. Explore 29+ private, client-side tools.',
      url: '/404',
    },
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
