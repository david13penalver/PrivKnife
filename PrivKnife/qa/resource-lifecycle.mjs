import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa/tool-manifest.json'), 'utf8'));
const lifecycleTools = process.env.PRIVKNIFE_LIFECYCLE_LIMIT
  ? manifest.slice(0, Number(process.env.PRIVKNIFE_LIFECYCLE_LIMIT))
  : manifest;
const baseUrl = process.env.PRIVKNIFE_PREVIEW_URL || 'http://127.0.0.1:4201';
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(() => {
    const audit = { objectUrls: new Set(), workers: new Set() };
    Object.defineProperty(window, '__resourceAudit', { value: audit });

    const createObjectURL = URL.createObjectURL.bind(URL);
    const revokeObjectURL = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (value) => {
      const url = createObjectURL(value);
      audit.objectUrls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      audit.objectUrls.delete(url);
      return revokeObjectURL(url);
    };

    const NativeWorker = window.Worker;
    window.Worker = class AuditedWorker extends NativeWorker {
      constructor(...args) {
        super(...args);
        audit.workers.add(this);
      }

      terminate() {
        audit.workers.delete(this);
        return super.terminate();
      }
    };
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await page.waitForSelector('app-root app-header .c-header__brand');
  await delay(250);
  const baseline = await page.evaluate(() => ({
    objectUrls: window.__resourceAudit.objectUrls.size,
    workers: window.__resourceAudit.workers.size,
  }));
  const failures = [];

  for (const tool of lifecycleTools) {
    await page.evaluate((route) => {
      history.pushState({ audit: true }, '', route);
      window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    }, tool.route);
    await delay(350);
    const heading = await page.$eval('h1', (element) => element.textContent?.trim() || '').catch(() => '');
    if (!heading) failures.push(`${tool.id}: route did not render an h1`);

    await page.click('app-header .c-header__brand');
    await page.waitForFunction(() => location.pathname === '/');
    await delay(500);
    const current = await page.evaluate(() => ({
      objectUrls: window.__resourceAudit.objectUrls.size,
      workers: window.__resourceAudit.workers.size,
    }));
    if (current.objectUrls > baseline.objectUrls || current.workers > baseline.workers) {
      failures.push(`${tool.id}: resources after navigation ${JSON.stringify(current)}; baseline ${JSON.stringify(baseline)}`);
    }
    console.log(`${failures.some((failure) => failure.startsWith(`${tool.id}:`)) ? 'FAIL' : 'PASS'} ${tool.id} resources=${JSON.stringify(current)}`);
  }

  if (failures.length) throw new Error(failures.join('\n'));
  console.log(`PASS reset/navigation resource baseline for ${lifecycleTools.length} routes: ${JSON.stringify(baseline)}`);
} finally {
  await browser.close();
}
