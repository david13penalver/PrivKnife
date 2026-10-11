export type ChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface RobotsUserAgentRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay?: number;
}

export interface RobotsConfig {
  rules: RobotsUserAgentRule[];
  sitemaps: string[];
  host?: string;
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: ChangeFrequency;
  priority?: number;
}

export type RobotsPresetKey =
  | 'default'
  | 'block-ai'
  | 'wordpress'
  | 'staging'
  | 'ecommerce';
