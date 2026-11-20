import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

it('contains no advertising placeholders in any canonical tool source or template', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa/tool-manifest.json'), 'utf8'));
  assert.equal(manifest.length, 88);
  const affected = fs.readFileSync(path.join(root, 'qa/ad-affected-tools.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
  assert.equal(affected.length, 14);
  assert.equal(new Set(affected).size, 14);
  assert.ok(affected.every((id) => manifest.some((tool) => tool.id === id)));
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:ts|html|scss|css)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, 'src/app/tools'));
  const pattern = /ad-slot|adsbygoogle|responsive ad placement|sponsor advertisement|sponsor\s*\(|export success ad modal|leaderboard ad|medium rectangle ad/i;
  const findings = files.flatMap((file) => [...fs.readFileSync(file, 'utf8').matchAll(new RegExp(pattern.source, 'gi'))].map((match) => `${path.relative(root, file)}:${match.index}`));
  assert.deepEqual(findings, [], `Advertising placeholder source remains:\n${findings.join('\n')}`);
});
