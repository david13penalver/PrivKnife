import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BLOCK_AI_ROBOTS_CONFIG,
  DEFAULT_ROBOTS_CONFIG,
  DEFAULT_SITEMAP_ENTRIES,
  STAGING_ROBOTS_CONFIG,
} from './test-fixtures';
import { RobotsSitemapBuilderComponent } from './robots-sitemap-builder.component';

describe('RobotsSitemapBuilderComponent (Seam 2: UI, Signals & Privacy Boundary)', () => {
  let component: RobotsSitemapBuilderComponent;
  let fixture: ComponentFixture<RobotsSitemapBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RobotsSitemapBuilderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RobotsSitemapBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize in robots mode with default robots.txt content', () => {
    expect(component).toBeTruthy();
    expect(component.activeMode()).toBe('robots');
    expect(component.generatedRobotsTxt()).toContain('User-agent: *');
    expect(component.generatedRobotsTxt()).toContain('Disallow: /admin/');
    expect(component.generatedRobotsTxt()).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('should switch between robots and sitemap modes', () => {
    component.activeMode.set('sitemap');
    fixture.detectChanges();

    expect(component.activeMode()).toBe('sitemap');
    expect(component.generatedSitemapXml()).toContain('<?xml version="1.0"');
    expect(component.generatedSitemapXml()).toContain('<loc>https://example.com/</loc>');
  });

  it('should apply robots presets reactively (e.g. Block AI Bots, Staging)', () => {
    component.applyRobotsPreset('block-ai');
    fixture.detectChanges();

    expect(component.generatedRobotsTxt()).toContain('User-agent: GPTBot');
    expect(component.generatedRobotsTxt()).toContain('User-agent: ClaudeBot');

    component.applyRobotsPreset('staging');
    fixture.detectChanges();

    expect(component.generatedRobotsTxt()).toBe('User-agent: *\nDisallow: /');
  });

  it('should add and remove robots rules and update output', () => {
    component.addRobotsRule('Bingbot', ['/public/'], ['/temp/']);
    fixture.detectChanges();

    expect(component.generatedRobotsTxt()).toContain('User-agent: Bingbot');
    expect(component.generatedRobotsTxt()).toContain('Allow: /public/');
    expect(component.generatedRobotsTxt()).toContain('Disallow: /temp/');

    component.removeRobotsRule(1); // remove the added rule
    fixture.detectChanges();

    expect(component.generatedRobotsTxt()).not.toContain('User-agent: Bingbot');
  });

  it('should add a sitemap URL entry and update XML preview', () => {
    component.activeMode.set('sitemap');
    component.addSitemapUrl('https://example.com/new-feature', 'weekly', 0.9);
    fixture.detectChanges();

    expect(component.generatedSitemapXml()).toContain('<loc>https://example.com/new-feature</loc>');
    expect(component.generatedSitemapXml()).toContain('<changefreq>weekly</changefreq>');
    expect(component.generatedSitemapXml()).toContain('<priority>0.9</priority>');
  });

  it('should import bulk URLs from text/CSV into sitemap entries', () => {
    component.activeMode.set('sitemap');
    const bulkText = 'https://example.com/page-1\nhttps://example.com/page-2';
    component.importBulkUrls(bulkText, true);
    fixture.detectChanges();

    expect(component.sitemapEntries().length).toBe(2);
    expect(component.generatedSitemapXml()).toContain('<loc>https://example.com/page-1</loc>');
    expect(component.generatedSitemapXml()).toContain('<loc>https://example.com/page-2</loc>');
  });

  it('should copy active code to clipboard with user feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    await component.copyActiveCode();
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('User-agent: *'));
    expect(component.copiedState()).toBe(true);
  });

  it('should download file and revoke object URL immediately', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-file');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Download robots.txt
    component.activeMode.set('robots');
    component.downloadFile();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-file');

    // Download sitemap.xml
    component.activeMode.set('sitemap');
    component.downloadFile();
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(2);
  });

  it('should verify 100% offline isolation with zero network leakage', () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    component.applyRobotsPreset('block-ai');
    component.activeMode.set('sitemap');
    component.addSitemapUrl('https://example.com/secure', 'daily', 1.0);
    component.downloadFile();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
