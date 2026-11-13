import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function assertCoverageFiles(sourceRoot, coverageSummary) {
  const required = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/(?:^|\.)(?:component|engine|worker)\.ts$/.test(entry.name) || entry.name === 'tool-registry.ts') required.push(path.resolve(full));
    }
  };
  walk(sourceRoot);
  const available = new Set(Object.keys(coverageSummary).filter((name) => name !== 'total').map((name) => path.resolve(name)));
  const missing = required.filter((file) => !available.has(file));
  if (missing.length) throw new Error(`Coverage report omits ${missing.length} required executable tool files:\n${missing.join('\n')}`);
  return required.length;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const candidates = [path.join(root, 'coverage/PrivKnife/coverage-summary.json'), path.join(root, 'coverage/coverage-summary.json')];
  const report = candidates.find((file) => fs.existsSync(file));
  if (!report) throw new Error(`Coverage summary missing; tried ${candidates.join(', ')}`);
  const count = assertCoverageFiles(path.join(root, 'src/app/tools'), JSON.parse(fs.readFileSync(report, 'utf8')));
  console.log(`Coverage manifest includes all ${count} tool engines, components, workers and registry files.`);
}
