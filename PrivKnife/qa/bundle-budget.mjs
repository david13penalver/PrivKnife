import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserRoot = path.join(root, 'dist/PrivKnife/browser');
const htmlPath = path.join(browserRoot, 'index.html');
if (!fs.existsSync(htmlPath)) throw new Error('Production build missing; run npm run build first.');

const html = fs.readFileSync(htmlPath, 'utf8');
const initialJs = new Set();
for (const match of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
  const tag = match[0];
  if (/rel=["']modulepreload["']|<script\b/i.test(tag)) {
    const source = tag.match(/(?:src|href)=["']([^"']+\.m?js)(?:\?[^"']*)?["']/i)?.[1];
    if (source) initialJs.add(source);
  }
}

const chunks = [...initialJs].map((source) => {
  const file = path.resolve(browserRoot, source.replace(/^\//, ''));
  if (!file.startsWith(`${browserRoot}${path.sep}`) || !fs.existsSync(file)) {
    throw new Error(`Initial JavaScript asset is missing or outside build output: ${source}`);
  }
  return { file: source, bytes: fs.statSync(file).size };
});
const totalBytes = chunks.reduce((total, chunk) => total + chunk.bytes, 0);
const maxBytes = Number(process.env.PRIVKNIFE_MAX_INITIAL_JS_BYTES || 200_000);
const result = { accounting: 'sum of raw bytes for script[src] and modulepreload[href] tags in production index.html', maxBytes, totalBytes, pass: totalBytes < maxBytes, chunks };
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 2;
