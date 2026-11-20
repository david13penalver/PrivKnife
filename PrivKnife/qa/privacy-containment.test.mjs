import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

it('ships a restrictive CSP with only the explicit DNS-over-HTTPS endpoint exceptions', () => {
  const headers = read('public/_headers');
  const index = read('src/index.html');
  const angular = JSON.parse(read('angular.json'));
  const vercel = JSON.parse(read('vercel.json'));
  const cspLine = headers.match(/^\s+Content-Security-Policy:\s*(.+)$/m)?.[1];
  assert.ok(cspLine, 'public/_headers must define Content-Security-Policy');
  assert.match(cspLine, /default-src 'self'/);
  assert.match(cspLine, /script-src 'self' 'wasm-unsafe-eval'/);
  assert.match(cspLine, /object-src 'none'/);
  assert.match(cspLine, /connect-src 'self' blob: data:/);
  assert.match(cspLine, /worker-src 'self' blob:/);
  assert.match(cspLine, /frame-ancestors 'none'/);
  assert.doesNotMatch(
    cspLine,
    /\*|https?:\/\/(?!cloudflare-dns\.com|dns\.google|dns\.quad9\.net|dns\.adguard-dns\.com)/,
  );

  const endpoints = [
    ...read('src/app/tools/dev/dns-checker/test-fixtures.ts').matchAll(
      /endpointUrl: '(https:\/\/[^']+)'/g,
    ),
  ].map(([, endpoint]) => endpoint);
  assert.equal(endpoints.length, 4);
  assert.equal(new Set(endpoints).size, 4);
  const connectSrc = cspLine
    .split(';')
    .find((directive) => directive.trim().startsWith('connect-src '));
  assert.ok(connectSrc);
  for (const endpoint of endpoints)
    assert.ok(connectSrc.includes(endpoint), `CSP is missing exact resolver URL ${endpoint}`);
  for (const endpoint of endpoints)
    assert.ok(vercel.headers[0].headers[0].value.includes(endpoint));
  assert.equal(vercel.headers[0].headers[0].value, cspLine);
  assert.match(headers, /Referrer-Policy: no-referrer/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(index, /http-equiv="Content-Security-Policy"/);
  assert.match(index, /connect-src 'self' blob: data:/);
  assert.equal(
    angular.projects.PrivKnife.architect.build.configurations.production.optimization.styles
      .inlineCritical,
    false,
    'production critical-CSS inlining must not inject a script blocked by the strict CSP',
  );
});

it('keeps the disabled PageSpeed route informational and out of every tool catalog', () => {
  const registry = read('src/app/tools/tool-registry.ts');
  const home = read('src/app/pages/home/home.ts');
  const routes = read('src/app/app.routes.ts');
  const engine = read('src/app/tools/dev/web-vitals/engine.ts');
  assert.doesNotMatch(registry, /id:\s*'web-vitals'/);
  assert.doesNotMatch(home, /id:\s*'web-vitals'/);
  assert.match(
    routes,
    /path: 'tools\/web-vitals'/,
    'legacy bookmarks retain the explanatory route',
  );
  assert.doesNotMatch(engine, /pagespeedonline|runPageSpeedAudit|buildPageSpeedApiUrl|fetch\s*\(/i);
});

it('contains no WHOIS proxy and sends no expected value or file payload in DoH requests', () => {
  const dnsDirectory = path.join(root, 'src/app/tools/dev/dns-checker');
  const dnsSources = fs
    .readdirSync(dnsDirectory)
    .filter((name) => /\.(ts|html)$/.test(name) && !name.endsWith('.spec.ts'))
    .map((name) => fs.readFileSync(path.join(dnsDirectory, name), 'utf8'))
    .join('\n');
  const engine = read('src/app/tools/dev/dns-checker/engine.ts');
  const component = read('src/app/tools/dev/dns-checker/dns-checker.component.ts');
  assert.doesNotMatch(dnsSources, /rdap\.org|queryWhoisRdap|WhoisResult/i);
  assert.match(engine, /searchParams\.set\('name', domain\)/);
  assert.match(engine, /searchParams\.set\('type', recordType\)/);
  assert.doesNotMatch(engine, /expectedValue.*searchParams|file\.text\(\).*fetch/i);
  assert.match(component, /externalQueryConsent\(\)/);
  assert.match(component, /if \(!this\.externalQueryConsent\(\)\)/);
  assert.match(component, /'tools\.dnsChecker\.externalRequestDisclosure'/);
});

it('does not use JavaScript eval or Function constructors in application source', () => {
  const appRoot = path.join(root, 'src/app');
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:ts|html)$/.test(entry.name)) files.push(full);
    }
  };
  walk(appRoot);
  const matches = files.flatMap((file) => {
    const contents = fs.readFileSync(file, 'utf8');
    return [...contents.matchAll(/\beval\s*\(|\bnew\s+Function\s*\(/g)].map(
      (match) => `${path.relative(root, file)}:${match.index}`,
    );
  });
  assert.deepEqual(matches, [], `Found dynamic JavaScript execution:\n${matches.join('\n')}`);
});

it('keeps worker, object URL, and Three.js teardown paired in tool source', () => {
  const toolRoot = path.join(root, 'src/app/tools');
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) files.push(full);
    }
  };
  walk(toolRoot);

  const source = files.map((file) => [file, fs.readFileSync(file, 'utf8')]);
  const objectUrlLeaks = source.filter(
    ([, text]) => text.includes('URL.createObjectURL') && !text.includes('URL.revokeObjectURL'),
  );
  const workshop = fs.readFileSync(path.join(toolRoot, '3d/shared/workshop.ts'), 'utf8');
  const workerLifecycleSource = (text) =>
    text.includes("import { MeshWorkshop } from '../shared/workshop'") &&
    /worker:\s*\(\)\s*=>\s*new Worker\(/.test(text) &&
    text.includes('imports: [MeshWorkshop]')
      ? workshop
      : text;
  const workerLeaks = source.filter(
    ([, text]) => text.includes('new Worker') && !workerLifecycleSource(text).includes('terminate('),
  );
  const workerErrorLeaks = source.filter(
    ([, text]) => {
      const owner = workerLifecycleSource(text);
      return text.includes('new Worker') &&
        !(/\.onerror\s*=/.test(owner) || /addEventListener\s*\(\s*['"]error['"]/.test(owner));
    },
  );
  const rendererLeaks = source.filter(
    ([file, text]) =>
      text.includes('new THREE.WebGLRenderer') &&
      (!text.includes('.dispose(') || !(text.includes('ngOnDestroy') ||
        (file.endsWith('/3d/shared/mesh-viewport.ts') && workshop.includes('this.viewport?.dispose()')))),
  );
  const unsanitizedTrustedMarkup = source.filter(
    ([, text]) =>
      text.includes('bypassSecurityTrustHtml') &&
      !/sanitize(?:Html|Svg)Markup|DOMPurify\.sanitize/.test(text),
  );

  assert.deepEqual(
    objectUrlLeaks.map(([file]) => path.relative(root, file)),
    [],
    'every object URL creator must show a revocation path',
  );
  assert.deepEqual(
    workerLeaks.map(([file]) => path.relative(root, file)),
    [],
    'every worker creator must show a termination path',
  );
  assert.deepEqual(
    workerErrorLeaks.map(([file]) => path.relative(root, file)),
    [],
    'every worker creator must handle worker execution errors',
  );
  assert.deepEqual(
    rendererLeaks.map(([file]) => path.relative(root, file)),
    [],
    'every WebGL renderer must be disposed on destroy',
  );
  assert.deepEqual(
    unsanitizedTrustedMarkup.map(([file]) => path.relative(root, file)),
    [],
    'trusted markup must pass through a sanitizer',
  );
});
