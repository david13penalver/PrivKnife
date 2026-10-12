import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DnsCheckerComponent } from './dns-checker.component';
import { MOCK_DOH_GOOGLE_RESPONSE, MOCK_RDAP_WHOIS_RESPONSE, PRESET_TEST_DOMAINS } from './test-fixtures';

describe('DnsCheckerComponent', () => {
  let component: DnsCheckerComponent;
  let fixture: ComponentFixture<DnsCheckerComponent>;

  beforeEach(async () => {
    // Mock global fetch to return deterministic DoH response
    vi.spyOn(window, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('rdap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => MOCK_RDAP_WHOIS_RESPONSE,
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => MOCK_DOH_GOOGLE_RESPONSE,
      } as unknown as Response;
    });

    await TestBed.configureTestingModule({
      imports: [DnsCheckerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DnsCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates component and triggers initial DNS query with default domain', async () => {
    expect(component).toBeTruthy();
    expect(component.config().domain).toBe('example.com');
    expect(component.config().recordType).toBe('A');

    // Wait for queries to resolve
    await fixture.whenStable();

    expect(component.results().length).toBe(component.providers.length);
    const summary = component.summary();
    expect(summary.totalNodes).toBe(component.providers.length);
  });

  it('validates invalid domain names and displays error banner', async () => {
    component.updateDomain('invalid..domain');
    await component.executeDnsQueries();

    expect(component.validationError()).toContain('valid domain');
  });

  it('switches between presets and updates domain configuration', async () => {
    const ghPreset = PRESET_TEST_DOMAINS.find((p) => p.name === 'github.com')!;
    component.loadPreset(ghPreset);

    expect(component.config().domain).toBe('github.com');
    expect(component.config().expectedValue).toBe(ghPreset.expected);
  });

  it('updates record type and expected value', () => {
    component.updateRecordType('MX');
    expect(component.config().recordType).toBe('MX');

    component.updateExpectedValue('10 mail.example.com');
    expect(component.config().expectedValue).toBe('10 mail.example.com');
  });

  it('switches tabs and triggers WHOIS lookup', async () => {
    component.loadWhoisTab();
    expect(component.activeTab()).toBe('whois');

    await fixture.whenStable();
    expect(component.whoisData()).toBeDefined();
    expect(component.whoisData()?.domain).toBe('example.com');
  });

  it('exports DNS query records as CSV and JSON with memory revocation', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-dns-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.exportCsv();
    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-dns-url');

    component.exportJson();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-dns-url');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('resets to defaults cleanly', () => {
    component.updateDomain('otherdomain.org');
    component.resetDefaults();

    expect(component.config().domain).toBe('example.com');
    expect(component.config().recordType).toBe('A');
  });

  it('aborts active queries and cleans up on destroy', () => {
    expect(() => {
      component.ngOnDestroy();
    }).not.toThrow();
  });
});
