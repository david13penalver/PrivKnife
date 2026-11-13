import { ToolDefinition } from '../../../core/models/tool.model';

export const dnsCheckerTool: ToolDefinition = {
  id: 'dns-checker',
  name: 'DNS Resolver Comparison',
  category: 'dev',
  description:
    'Compare DNS answers from public resolvers using direct, explicitly authorized DNS-over-HTTPS requests from your browser.',
  keywords: [
    'dns propagation checker',
    'check A record propagation',
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
