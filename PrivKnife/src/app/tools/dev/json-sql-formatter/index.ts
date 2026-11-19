import { ToolDefinition } from '../../../core/models/tool.model';

export const jsonSqlFormatterTool: ToolDefinition = {
  id: 'json-sql-formatter',
  name: 'JSON, SQL & YAML Formatter, Validator & Type Generator',
  category: 'dev',
  description:
    'Beautify, minify, validate, query via JSONPath, convert JSON/YAML, format multi-dialect SQL, and infer TypeScript interfaces & Zod schemas strictly offline.',
  keywords: [
    'json formatter',
    'sql formatter',
    'yaml converter',
    'json to typescript',
    'json to zod',
    'jsonpath tester',
    'client side',
  ],
  icon: 'braces',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./json-sql-formatter.component').then(
      (m) => m.JsonSqlFormatterComponent
    ),
};

export * from './types';
