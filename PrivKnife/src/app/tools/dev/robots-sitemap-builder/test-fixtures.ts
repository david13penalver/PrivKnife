import { RobotsConfig, SitemapUrlEntry } from './types';

export const DEFAULT_ROBOTS_CONFIG: RobotsConfig = {
  rules: [
    {
      userAgent: '*',
      allow: ['/'],
      disallow: ['/admin/', '/private/', '/api/'],
      crawlDelay: 5,
    },
  ],
  sitemaps: ['https://example.com/sitemap.xml'],
  host: 'https://example.com',
};

export const BLOCK_AI_ROBOTS_CONFIG: RobotsConfig = {
  rules: [
    {
      userAgent: '*',
      allow: ['/'],
      disallow: ['/admin/'],
    },
    {
      userAgent: 'GPTBot',
      allow: [],
      disallow: ['/'],
    },
    {
      userAgent: 'ClaudeBot',
      allow: [],
      disallow: ['/'],
    },
    {
      userAgent: 'CCBot',
      allow: [],
      disallow: ['/'],
    },
    {
      userAgent: 'Google-Extended',
      allow: [],
      disallow: ['/'],
    },
    {
      userAgent: 'PerplexityBot',
      allow: [],
      disallow: ['/'],
    },
  ],
  sitemaps: ['https://example.com/sitemap.xml'],
};

export const WORDPRESS_ROBOTS_CONFIG: RobotsConfig = {
  rules: [
    {
      userAgent: '*',
      allow: ['/wp-admin/admin-ajax.php'],
      disallow: ['/wp-admin/'],
    },
  ],
  sitemaps: ['https://example.com/sitemap_index.xml'],
};

export const STAGING_ROBOTS_CONFIG: RobotsConfig = {
  rules: [
    {
      userAgent: '*',
      allow: [],
      disallow: ['/'],
    },
  ],
  sitemaps: [],
};

export const DEFAULT_SITEMAP_ENTRIES: SitemapUrlEntry[] = [
  {
    loc: 'https://example.com/',
    lastmod: '2026-10-11',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    loc: 'https://example.com/about',
    lastmod: '2026-10-01',
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    loc: 'https://example.com/blog',
    lastmod: '2026-10-10',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    loc: 'https://example.com/contact',
    lastmod: '2026-09-15',
    changefreq: 'yearly',
    priority: 0.5,
  },
];

export const RAW_BULK_URLS_TEXT = `
https://example.com/pricing
https://example.com/features
https://example.com/docs/getting-started
`;

export const RAW_BULK_CSV_TEXT = `
https://example.com/products/item-1,2026-10-05,weekly,0.9
https://example.com/products/item-2,2026-10-06,weekly,0.9
`;
