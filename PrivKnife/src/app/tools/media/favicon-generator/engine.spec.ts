import { describe, expect, it } from 'vitest';
import {
  createFaviconZip,
  generateFaviconSuite,
  generateHtmlSnippet,
  generateWebManifest,
  packIcoBinary,
} from './engine';
import { createMockImageFile, DEFAULT_FAVICON_CONFIG } from './test-fixtures';

describe('FaviconSuiteEngine (Seam 1: ICO Packaging, Manifest, Suite Generation & ZIP)', () => {
  describe('packIcoBinary', () => {
    it('should package multiple PNG byte streams into a valid Windows binary .ico format', () => {
      const mock16Png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
      const mock32Png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 5, 6, 7, 8, 9, 10]);

      const icoBytes = packIcoBinary([
        { width: 16, height: 16, pngData: mock16Png },
        { width: 32, height: 32, pngData: mock32Png },
      ]);

      expect(icoBytes).toBeInstanceOf(Uint8Array);
      // Header: 6 bytes (Reserved: 0x0000, Type: 0x0001, Count: 0x0002)
      expect(icoBytes[0]).toBe(0);
      expect(icoBytes[1]).toBe(0);
      expect(icoBytes[2]).toBe(1); // Type 1 = Icon (.ico)
      expect(icoBytes[3]).toBe(0);
      expect(icoBytes[4]).toBe(2); // Count = 2
      expect(icoBytes[5]).toBe(0);

      // Total length: 6 (header) + 16 * 2 (dir entries) + 8 (mock16) + 10 (mock32) = 56 bytes
      expect(icoBytes.length).toBe(6 + 32 + 8 + 10);
    });
  });

  describe('generateWebManifest', () => {
    it('should generate valid site.webmanifest JSON with responsive icon definitions', () => {
      const manifestStr = generateWebManifest(DEFAULT_FAVICON_CONFIG);
      const manifest = JSON.parse(manifestStr);

      expect(manifest.name).toBe(DEFAULT_FAVICON_CONFIG.siteName);
      expect(manifest.short_name).toBe(DEFAULT_FAVICON_CONFIG.shortName);
      expect(manifest.theme_color).toBe(DEFAULT_FAVICON_CONFIG.themeColor);
      expect(manifest.background_color).toBe(DEFAULT_FAVICON_CONFIG.backgroundColor);
      expect(manifest.display).toBe('standalone');
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
      expect(manifest.icons.some((i: any) => i.sizes === '192x192')).toBe(true);
      expect(manifest.icons.some((i: any) => i.sizes === '512x512')).toBe(true);
    });
  });

  describe('generateHtmlSnippet', () => {
    it('should produce modern, standard HTML <head> tags for browsers, iOS, and PWA', () => {
      const snippet = generateHtmlSnippet(DEFAULT_FAVICON_CONFIG);

      expect(snippet).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico">');
      expect(snippet).toContain('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">');
      expect(snippet).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">');
      expect(snippet).toContain('<link rel="manifest" href="/site.webmanifest">');
      expect(snippet).toContain(`<meta name="theme-color" content="${DEFAULT_FAVICON_CONFIG.themeColor}">`);
    });
  });

  describe('generateFaviconSuite', () => {
    it('should generate complete suite of platform icons, multi-res .ico, and manifest', async () => {
      const sourceFile = createMockImageFile('test-logo.png', 'image/png', 4096);
      const result = await generateFaviconSuite(sourceFile, DEFAULT_FAVICON_CONFIG);

      expect(result).toBeDefined();
      expect(result.assets.length).toBeGreaterThanOrEqual(6);
      expect(result.icoBlob).toBeDefined();
      expect(result.icoBlob).toBeInstanceOf(Blob);
      expect(result.manifestJson).toContain(DEFAULT_FAVICON_CONFIG.siteName);
      expect(result.htmlSnippet).toContain('/apple-touch-icon.png');

      const fileNames = result.assets.map((a) => a.fileName);
      expect(fileNames).toContain('favicon-16x16.png');
      expect(fileNames).toContain('favicon-32x32.png');
      expect(fileNames).toContain('apple-touch-icon.png');
      expect(fileNames).toContain('android-chrome-192x192.png');
      expect(fileNames).toContain('android-chrome-512x512.png');
    });
  });

  describe('createFaviconZip', () => {
    it('should compile in-memory favicon-suite.zip containing all icons, .ico, and manifest', async () => {
      const sourceFile = createMockImageFile('logo.png', 'image/png', 3000);
      const suite = await generateFaviconSuite(sourceFile, DEFAULT_FAVICON_CONFIG);

      const zipBlob = await createFaviconZip(suite);

      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(0);
    });
  });
});
