import { I18nService } from '../../../core/i18n';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DnsCheckerComponent } from './dns-checker.component';
import { MOCK_DOH_GOOGLE_RESPONSE, PRESET_TEST_DOMAINS } from './test-fixtures';

describe('DnsCheckerComponent privacy and request flow', () => {
  let component: DnsCheckerComponent;
  let fixture: ComponentFixture<DnsCheckerComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_DOH_GOOGLE_RESPONSE,
    } as unknown as Response);

    await TestBed.configureTestingModule({ imports: [DnsCheckerComponent] }).compileComponents();
    await TestBed.inject(I18nService).loadEnglishTools('dnsChecker');
    fixture = TestBed.createComponent(DnsCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the disclosure and makes no request on initial load', () => {
    expect(component.config().domain).toBe('example.com');
    expect(component.results()).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('cloudflare-dns.com');
    expect(fixture.nativeElement.textContent).toContain('dns.quad9.net:5053');
    expect(fixture.nativeElement.textContent).not.toContain('WHOIS');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('rejects programmatic query attempts before explicit consent', async () => {
    await component.executeDnsQueries();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(component.validationError()).toBe('tools.dnsChecker.consentRequired');
  });

  it('sends only the selected domain and record type after consent', async () => {
    component.updateExpectedValue('private-expected-value');
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    await component.executeDnsQueries();

    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(component.results()).toHaveLength(4);
    const requestedUrls = (fetchSpy.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit?]>).map(([input]) => new URL(String(input)));
    expect(new Set(requestedUrls.map((url) => url.host))).toEqual(new Set([
      'cloudflare-dns.com',
      'dns.google',
      'dns.quad9.net:5053',
      'dns.adguard-dns.com',
    ]));
    for (const url of requestedUrls) {
      expect(url.searchParams.get('name')).toBe('example.com');
      expect(url.searchParams.get('type')).toBe('A');
      expect([...url.searchParams.keys()].sort()).toEqual(['name', 'type']);
      expect(url.href).not.toContain('private-expected-value');
    }
  });

  it('does not query malformed domains even after consent', async () => {
    component.externalQueryConsent.set(true);
    component.updateDomain('invalid..domain');
    await component.executeDnsQueries();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(component.validationError()).toContain('valid domain');
  });

  it('loads presets locally and only runs after the user submits', () => {
    const preset = PRESET_TEST_DOMAINS.find((item) => item.name === 'github.com')!;
    component.loadPreset(preset);

    expect(component.config().domain).toBe('github.com');
    expect(component.config().expectedValue).toBe(preset.expected);
    expect(component.results()).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resets query state and clears consent without making a request', () => {
    component.externalQueryConsent.set(true);
    component.loadPreset(PRESET_TEST_DOMAINS[1]);
    component.resetDefaults();

    expect(component.config().domain).toBe('example.com');
    expect(component.config().recordType).toBe('A');
    expect(component.externalQueryConsent()).toBe(false);
    expect(component.results()).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('aborts active resolver requests on destroy without leaving a pending state', async () => {
    fetchSpy.mockImplementation(((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })) as typeof fetch);
    component.externalQueryConsent.set(true);

    const query = component.executeDnsQueries();
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    component.ngOnDestroy();
    await query;

    expect(component.isQuerying()).toBe(false);
  });

  it('revokes object URLs after exporting local results', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-dns-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.exportCsv();
    component.exportJson();

    expect(createUrlSpy).toHaveBeenCalledTimes(2);
    expect(revokeUrlSpy).toHaveBeenCalledTimes(2);
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-dns-url');
  });
});
