import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRESET_AUDIT_SAMPLES } from './test-fixtures';
import { WebVitalsComponent } from './web-vitals.component';

describe('WebVitalsComponent', () => {
  let component: WebVitalsComponent;
  let fixture: ComponentFixture<WebVitalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebVitalsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WebVitalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates component with initial default fast site audit report', () => {
    expect(component).toBeTruthy();
    expect(component.targetUrl()).toBe('https://privknife.org');
    expect(component.report()).toBeDefined();
    expect(component.report()?.overallScore).toBe(98);
    expect(component.report()?.vitals.lcp.rating).toBe('good');
  });

  it('validates invalid URL inputs and shows error banner', async () => {
    component.updateUrl('invalid-url-without-domain');
    await component.runAudit();

    expect(component.validationError()).toContain('valid website URL');
  });

  it('loads sample presets updating url, strategy, and audit report', () => {
    const slowPreset = PRESET_AUDIT_SAMPLES.find((p) => p.id === 'heavy-ecommerce')!;
    component.loadPreset(slowPreset);

    expect(component.targetUrl()).toBe(slowPreset.url);
    expect(component.report()?.overallScore).toBe(48);
    expect(component.report()?.vitals.lcp.rating).toBe('poor');
  });

  it('updates device strategy between mobile and desktop', () => {
    component.setStrategy('desktop');
    expect(component.strategy()).toBe('desktop');

    component.setStrategy('mobile');
    expect(component.strategy()).toBe('mobile');
  });

  it('executes audit query with mocked fetch response', async () => {
    const mockJson = {
      lighthouseResult: {
        categories: { performance: { score: 0.91 } },
        audits: {
          'largest-contentful-paint': { numericValue: 1900 },
        },
      },
    };

    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockJson,
    } as unknown as Response);

    component.updateUrl('https://example.com');
    await component.runAudit();

    expect(component.report()?.overallScore).toBe(91);
    expect(component.isLoading()).toBe(false);
  });

  it('exports audit report as JSON and Markdown with memory revocation', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-vitals-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.exportJson();
    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-vitals-url');

    component.exportMarkdown();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-vitals-url');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('resets to defaults cleanly', () => {
    component.updateUrl('https://custom-domain.org');
    component.resetDefaults();

    expect(component.targetUrl()).toBe('https://privknife.org');
    expect(component.report()?.overallScore).toBe(98);
  });

  it('cleans up resources on destroy', () => {
    expect(() => {
      component.ngOnDestroy();
    }).not.toThrow();
  });
});
