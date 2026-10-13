import { ToolDefinition } from '../../../core/models/tool.model';

export const dnsCheckerTool: ToolDefinition = {
  id: 'dns-checker',
  name: 'Global DNS Propagation & WHOIS Checker',
  category: 'dev',
  description:
    'Verify DNS record propagation across multiple global Anycast resolvers in real time using direct browser DNS-over-HTTPS (DoH) and inspect RDAP domain registration records.',
  keywords: [
    'dns propagation checker',
    'check A record propagation',
    'online whois lookup tool',
    'test mx record global',
    'dns over https checker',
    'browser doh lookup',
    'global dns lookup tool',
    'doh propagation test',
  ],
  icon: 'globe',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./dns-checker.component').then((m) => m.DnsCheckerComponent),
};

export { DnsCheckerComponent } from './dns-checker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
