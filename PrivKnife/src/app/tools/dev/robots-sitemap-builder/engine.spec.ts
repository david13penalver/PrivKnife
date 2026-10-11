import { describe, expect, it } from 'vitest';
import {
  exportRobotsBlob,
  exportSitemapBlob,
  generateRobotsTxt,
  generateSitemapXml,
  parseBulkUrls,
  validateSitemapXml,
} from './engine';
import {
  BLOCK_AI_ROBOTS_CONFIG,
  DEFAULT_ROBOTS_CONFIG,
  DEFAULT_SITEMAP_ENTRIES,
  RAW_BULK_CSV_TEXT,
  RAW_BULK_URLS_TEXT,
  STAGING_ROBOTS_CONFIG,
  WORDPRESS_ROBOTS_CONFIG,
} from './test-fixtures';

describe('Robots & Sitemap Builder Engine (engine.ts)', () => {
  describe('Robots.txt Generator (generateRobotsTxt)', () => {
    it('should generate valid robots.txt with all standard directives', () => {
      const robots = generateRobotsTxt(DEFAULT_ROBOTS_CONFIG);

      expect(robots).toContain('User-agent: *');
      expect(robots).toContain('Allow: /');
      expect(robots).toContain('Disallow: /admin/');
      expect(robots).toContain('Disallow: /private/');
      expect(robots).toContain('Disallow: /api/');
      expect(robots).toContain('Crawl-delay: 5');
      expect(robots).toContain('Sitemap: https://example.com/sitemap.xml');
      expect(robots).toContain('Host: https://example.com');
    });

    it('should generate Block AI Crawlers directives properly', () => {
      const robots = generateRobotsTxt(BLOCK_AI_ROBOTS_CONFIG);

      expect(robots).toContain('User-agent: GPTBot\nDisallow: /');
      expect(robots).toContain('User-agent: ClaudeBot\nDisallow: /');
      expect(robots).toContain('User-agent: CCBot\nDisallow: /');
      expect(robots).toContain('User-agent: Google-Extended\nDisallow: /');
      expect(robots).toContain('User-agent: PerplexityBot\nDisallow: /');
    });

    it('should generate WordPress optimized configuration', () => {
      const robots = generateRobotsTxt(WORDPRESS_ROBOTS_CONFIG);

      expect(robots).toContain('User-agent: *');
      expect(robots).toContain('Disallow: /wp-admin/');
      expect(robots).toContain('Allow: /wp-admin/admin-ajax.php');
      expect(robots).toContain('Sitemap: https://example.com/sitemap_index.xml');
    });

    it('should generate Staging / Disallow All configuration', () => {
      const robots = generateRobotsTxt(STAGING_ROBOTS_CONFIG);

      expect(robots).toBe('User-agent: *\nDisallow: /');
    });
  });

  describe('XML Sitemap Generator (generateSitemapXml)', () => {
    it('should generate standard compliant sitemap.xml', () => {
      const xml = generateSitemapXml(DEFAULT_SITEMAP_ENTRIES);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<loc>https://example.com/</loc>');
      expect(xml).toContain('<lastmod>2026-10-11</lastmod>');
      expect(xml).toContain('<changefreq>daily</changefreq>');
      expect(xml).toContain('<priority>1.0</priority>');
      expect(xml).toContain('<loc>https://example.com/about</loc>');
      expect(xml).toContain('</urlset>');
    });

    it('should XML-escape special characters in URLs', () => {
      const entries = [
        {
          loc: 'https://example.com/search?category=news&sort=desc',
          changefreq: 'weekly' as const,
          priority: 0.7,
        },
      ];
      const xml = generateSitemapXml(entries);

      expect(xml).toContain('&amp;');
      expect(xml).not.toContain('&sort');
    });
  });

  describe('XML Sitemap Validator (validateSitemapXml)', () => {
    it('should report valid sitemap XML as valid', () => {
      const xml = generateSitemapXml(DEFAULT_SITEMAP_ENTRIES);
      const result = validateSitemapXml(xml);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect malformed XML', () => {
      const malformedXml = '<urlset><url><loc>https://example.com</urlset>';
      const result = validateSitemapXml(malformedXml);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Bulk URL Import Parser (parseBulkUrls)', () => {
    it('should parse line-delimited URLs into SitemapUrlEntry array', () => {
      const entries = parseBulkUrls(RAW_BULK_URLS_TEXT);

      expect(entries.length).toBe(3);
      expect(entries[0].loc).toBe('https://example.com/pricing');
      expect(entries[1].loc).toBe('https://example.com/features');
      expect(entries[2].loc).toBe('https://example.com/docs/getting-started');
      expect(entries[0].priority).toBe(0.8); // default priority
    });

    it('should parse CSV lines with lastmod, changefreq, and priority', () => {
      const entries = parseBulkUrls(RAW_BULK_CSV_TEXT);

      expect(entries.length).toBe(2);
      expect(entries[0].loc).toBe('https://example.com/products/item-1');
      expect(entries[0].lastmod).toBe('2026-10-05');
      expect(entries[0].changefreq).toBe('weekly');
      expect(entries[0].priority).toBe(0.9);
    });

    it('should prepend defaultDomain to relative paths', () => {
      const text = '/about\n/contact';
      const entries = parseBulkUrls(text, 'https://mybrand.io');

      expect(entries.length).toBe(2);
      expect(entries[0].loc).toBe('https://mybrand.io/about');
      expect(entries[1].loc).toBe('https://mybrand.io/contact');
    });
  });

  describe('Blob Exporters (exportRobotsBlob & exportSitemapBlob)', () => {
    it('should export valid text/plain Blob for robots.txt', async () => {
      const text = generateRobotsTxt(DEFAULT_ROBOTS_CONFIG);
      const blob = exportRobotsBlob(text);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain;charset=utf-8');
      expect(await blob.text()).toContain('User-agent: *');
    });

    it('should export valid application/xml Blob for sitemap.xml', async () => {
      const xml = generateSitemapXml(DEFAULT_SITEMAP_ENTRIES);
      const blob = exportSitemapBlob(xml);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/xml;charset=utf-8');
      expect(await blob.text()).toContain('<?xml version="1.0"');
    });
  });
});
