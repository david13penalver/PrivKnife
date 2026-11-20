import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertManifest } from './smoke.mjs';

it('keeps the browser manifest in sync with canonical lazy routes', () => {
  const root = new URL('../src/app/tools/tool.routes.ts', import.meta.url);
  const source = fs.readFileSync(root, 'utf8');
  const canonical = [...source.matchAll(/path: '([^']+)'([\s\S]*?)(?=\n  \},)/g)]
    .filter((match) => match[0].includes('loadComponent'))
    .filter((match) => match[1] !== 'web-vitals')
    .map((match) => `/tools/${match[1]}`)
    .sort();
  const manifest = JSON.parse(fs.readFileSync(new URL('./tool-manifest.json', import.meta.url), 'utf8'));
  assertManifest(manifest);
  assert.deepEqual(manifest.map((entry) => entry.route).sort(), canonical);
});
