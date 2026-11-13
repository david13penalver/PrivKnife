import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/PrivKnife/browser');
if (!fs.existsSync(path.join(root, 'index.html'))) {
  throw new Error(`Production build not found at ${root}; run npm run build first.`);
}

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webmanifest', 'application/manifest+json'],
]);

const parsedHeaders = new Map();
const headerFile = path.join(root, '_headers');
let activeHeaderName = '';
for (const line of fs.readFileSync(headerFile, 'utf8').split(/\r?\n/)) {
  if (!line.trim()) continue;
  if (!line.startsWith(' ') && !line.startsWith('\t')) {
    activeHeaderName = line.trim();
    continue;
  }
  const separator = line.indexOf(':');
  if (separator < 0) continue;
  parsedHeaders.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
}
if (activeHeaderName !== '/*' || !parsedHeaders.has('content-security-policy')) {
  throw new Error('The production _headers file is missing its /* Content-Security-Policy rule.');
}

const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 4201);
const server = http.createServer((request, response) => {
  for (const [name, value] of parsedHeaders) response.setHeader(name, value);
  const method = request.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  const requested = path.resolve(root, `.${pathname}`);
  if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  const file = fs.existsSync(requested) && fs.statSync(requested).isFile()
    ? requested
    : path.join(root, 'index.html');
  response.setHeader('Content-Type', mimeTypes.get(path.extname(file)) || 'application/octet-stream');
  response.setHeader('Content-Length', fs.statSync(file).size);
  response.writeHead(200);
  if (method === 'HEAD') response.end();
  else fs.createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Secure production preview listening on http://127.0.0.1:${port}\n`);
});
