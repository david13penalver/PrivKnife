import { ChangeFrequency, RobotsConfig, SitemapUrlEntry } from './types';

/**
 * Escapes characters for valid XML attribute or text node content.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates formatted robots.txt string based on rules, sitemaps, and host declarations.
 */
export function generateRobotsTxt(config: RobotsConfig): string {
  const blocks: string[] = [];

  for (const rule of config.rules) {
    const lines: string[] = [];
    lines.push(`User-agent: ${rule.userAgent || '*'}`);

    if (rule.allow && rule.allow.length > 0) {
      for (const allow of rule.allow) {
        if (allow.trim()) lines.push(`Allow: ${allow.trim()}`);
      }
    }

    if (rule.disallow && rule.disallow.length > 0) {
      for (const disallow of rule.disallow) {
        if (disallow.trim() || disallow === '') lines.push(`Disallow: ${disallow.trim()}`);
      }
    }

    if (rule.crawlDelay !== undefined && rule.crawlDelay !== null && !isNaN(rule.crawlDelay)) {
      lines.push(`Crawl-delay: ${rule.crawlDelay}`);
    }

    blocks.push(lines.join('\n'));
  }

  const sitemapLines: string[] = [];
  if (config.sitemaps && config.sitemaps.length > 0) {
    for (const sitemap of config.sitemaps) {
      if (sitemap.trim()) sitemapLines.push(`Sitemap: ${sitemap.trim()}`);
    }
  }

  if (config.host && config.host.trim()) {
    sitemapLines.push(`Host: ${config.host.trim()}`);
  }

  if (sitemapLines.length > 0) {
    blocks.push(sitemapLines.join('\n'));
  }

  return blocks.join('\n\n').trim();
}

/**
 * Generates a valid, formatted XML Sitemap string conforming to standard sitemap protocol 0.9.
 */
export function generateSitemapXml(entries: SitemapUrlEntry[]): string {
  const urlNodes = entries
    .filter((entry) => Boolean(entry.loc && entry.loc.trim()))
    .map((entry) => {
      const parts: string[] = [];
      parts.push(`    <loc>${escapeXml(entry.loc.trim())}</loc>`);

      if (entry.lastmod && entry.lastmod.trim()) {
        parts.push(`    <lastmod>${escapeXml(entry.lastmod.trim())}</lastmod>`);
      }

      if (entry.changefreq) {
        parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      }

      if (entry.priority !== undefined && entry.priority !== null && !isNaN(entry.priority)) {
        parts.push(`    <priority>${Number(entry.priority).toFixed(1)}</priority>`);
      }

      return `  <url>\n${parts.join('\n')}\n  </url>`;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes.join('\n')}
</urlset>`;
}

/**
 * Validates XML sitemap markup using browser DOMParser and checks for parsererror nodes.
 */
export function validateSitemapXml(xmlString: string): { isValid: boolean; error?: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const parserError = doc.querySelector('parsererror');

    if (parserError) {
      return {
        isValid: false,
        error: parserError.textContent?.trim() || 'Malformed XML document.',
      };
    }

    return { isValid: true };
  } catch (err: any) {
    return {
      isValid: false,
      error: err?.message || 'Failed to parse XML.',
    };
  }
}

/**
 * Parses line-delimited or CSV formatted bulk URLs into structured SitemapUrlEntry items.
 */
export function parseBulkUrls(rawText: string, defaultDomain = ''): SitemapUrlEntry[] {
  if (!rawText) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const results: SitemapUrlEntry[] = [];
  const normalizedDomain = defaultDomain.trim().replace(/\/$/, '');

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    let rawLoc = parts[0];

    if (!rawLoc) continue;

    if (normalizedDomain && rawLoc.startsWith('/')) {
      rawLoc = `${normalizedDomain}${rawLoc}`;
    }

    let lastmod: string | undefined = undefined;
    let changefreq: ChangeFrequency | undefined = undefined;
    let priority = 0.8;

    if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) {
      lastmod = parts[1];
    }

    if (parts.length >= 3 && ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].includes(parts[2])) {
      changefreq = parts[2] as ChangeFrequency;
    }

    if (parts.length >= 4 && !isNaN(parseFloat(parts[3]))) {
      priority = Math.min(1.0, Math.max(0.0, parseFloat(parts[3])));
    }

    results.push({
      loc: rawLoc,
      lastmod,
      changefreq,
      priority,
    });
  }

  return results;
}

/**
 * Exports text as text/plain Blob for robots.txt file download.
 */
export function exportRobotsBlob(text: string): Blob {
  return new Blob([text], { type: 'text/plain;charset=utf-8' });
}

/**
 * Exports XML string as application/xml Blob for sitemap.xml file download.
 */
export function exportSitemapBlob(xml: string): Blob {
  return new Blob([xml], { type: 'application/xml;charset=utf-8' });
}
