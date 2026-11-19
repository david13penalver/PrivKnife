import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

export function assertManifest(manifest, expectedCount = 70) {
  if (manifest.length !== expectedCount) throw new Error(`Tool manifest has ${manifest.length} entries; expected ${expectedCount}`);
  const ids = new Set();
  const routes = new Set();
  for (const entry of manifest) {
    if (!entry.id || !entry.route.startsWith('/tools/')) throw new Error(`Invalid tool entry: ${JSON.stringify(entry)}`);
    if (ids.has(entry.id) || routes.has(entry.route)) throw new Error(`Duplicate tool id or route: ${entry.id} ${entry.route}`);
    ids.add(entry.id); routes.add(entry.route);
  }
}

export function assertBrowserHealthy(result) {
  const failures = [];
  if (result.httpStatus >= 400) failures.push(`HTTP ${result.httpStatus}`);
  if (result.pageErrors?.length) failures.push(...result.pageErrors.map((x) => `page error: ${x}`));
  if (result.failedRequests?.length) failures.push(...result.failedRequests.map((x) => `request failed: ${x.url} (${x.error})`));
  if (result.horizontalOverflow) failures.push('document has horizontal overflow');
  if (result.adSlots > 0) failures.push(`found ${result.adSlots} advertising slot element(s)`);
  if (result.advertisingCopy) failures.push('found advertising placeholder copy');
  if (result.missingHeading) failures.push('tool page has no H1');
  if (result.missingCanvas) failures.push('expected a rendered Canvas/WebGL surface');
  if (result.untranslatedKey) failures.push(`raw translation key rendered: ${result.untranslatedKey}`);
  if (failures.length) throw new Error(failures.join('\n'));
}

export function validateArtifact(file, extension) {
  const bytes = fs.readFileSync(file);
  const ext = extension.toLowerCase().replace(/^\./, '');
  if (!bytes.length) throw new Error('Export is empty');
  if (ext === 'pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF signature');
  if (ext === 'png' && !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Invalid PNG signature');
  if (['zip', '3mf'].includes(ext) && !(bytes[0] === 0x50 && bytes[1] === 0x4b)) throw new Error('Invalid ZIP/3MF signature');
  if (ext === 'stl') {
    if (bytes.length < 134) throw new Error('Binary STL is shorter than its header and one triangle');
    const triangles = bytes.readUInt32LE(80);
    if (triangles < 1 || bytes.length !== 84 + triangles * 50) throw new Error('Binary STL triangle count does not match file length');
    for (let offset = 84; offset < bytes.length; offset += 50) {
      for (let i = 0; i < 12; i++) if (!Number.isFinite(bytes.readFloatLE(offset + i * 4))) throw new Error(`Non-finite STL vertex at byte ${offset + i * 4}`);
    }
  }
  return { extension: ext, bytes: bytes.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const manifestPath = path.join(import.meta.dirname, 'tool-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assertManifest(manifest);
  const args = process.argv.slice(2);
  const option = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
  const baseUrl = option('--base-url', 'http://localhost:4200');
  const language = option('--language', 'en');
  const width = Number(option('--width', '390'));
  const route = option('--route');
  const routeList = option('--route-list');
  const routeListFile = option('--route-list-file');
  const clickText = option('--click-text');
  const allowKnownTranslationKeys = args.includes('--allow-known-translation-keys');
  const artifactExtension = option('--artifact-extension');
  const requireCanvas = args.includes('--require-canvas');
  const requireHeading = args.includes('--require-heading');
  const allowedRequestHosts = args.flatMap((arg, index) => arg === '--allow-request-host' && args[index + 1] ? [args[index + 1]] : []);
  const requested = routeListFile ? fs.readFileSync(path.resolve(routeListFile), 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : routeList ? routeList.split(',').map((x) => x.trim()).filter(Boolean) : route ? [route] : null;
  const targets = requested ? requested.map((id) => manifest.find((x) => x.route === id || x.id === id)).filter(Boolean) : manifest;
  if (requested && targets.length !== new Set(requested).size) throw new Error(`A requested route is missing or duplicated in manifest: ${requested.join(', ')}`);
  const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'privknife-qa-'));
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, isMobile: width <= 430, hasTouch: width <= 430 });
    await page.evaluateOnNewDocument((lang) => { try { localStorage.setItem('privknife_lang', lang); } catch {} }, language);
    const pageErrors = []; const failedRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => {
      const host = new URL(request.url()).hostname;
      if (allowedRequestHosts.includes(host)) console.warn(`EXPECTED EXTERNAL REQUEST FAILURE: ${host}`);
      else failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' });
    });
    page.on('response', (response) => { if (response.status() >= 400) {
      const host = new URL(response.url()).hostname;
      if (!allowedRequestHosts.includes(host)) failedRequests.push({ url: response.url(), error: `HTTP ${response.status()}` });
      else console.warn(`EXPECTED EXTERNAL RESPONSE ${host}: HTTP ${response.status()}`);
    } });
    const cdp = await page.createCDPSession();
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: temp });
    let passed = 0;
    for (const target of targets) {
      pageErrors.length = 0; failedRequests.length = 0;
      const response = await page.goto(new URL(target.route, baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('app-root', { timeout: 15000 });
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});
      const dom = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        adSlots: document.querySelectorAll('.ad-slot,ins.adsbygoogle,[data-ad-slot]').length,
        advertisingCopy: /responsive ad placement|sponsor advertisement|sponsor\s*\(|\bad slot\b/i.test(document.body.innerText),
        missingHeading: !document.querySelector('h1')?.textContent?.trim(),
        canvasCount: document.querySelectorAll('canvas').length,
        untranslatedKeys: [...document.querySelectorAll('button,[role="button"]')].map((x) => x.textContent.trim()).filter((x) => /^tools\.[\w.]+$/.test(x)),
      }));
      if (requireCanvas && dom.canvasCount === 0) dom.missingCanvas = true;
      if (!requireHeading) dom.missingHeading = false;
      if (dom.lang !== language) pageErrors.push(`document language is ${dom.lang}, expected ${language}`);
      if (dom.untranslatedKeys.length) {
        if (allowKnownTranslationKeys) console.warn(`KNOWN LOCALIZATION DEFECT ${target.id}: ${dom.untranslatedKeys.join(', ')}`);
        else pageErrors.push(`raw translation keys rendered: ${dom.untranslatedKeys.join(', ')}`);
      }
      const result = { httpStatus: response?.status() || 0, horizontalOverflow: dom.horizontalOverflow, adSlots: dom.adSlots, advertisingCopy: dom.advertisingCopy, missingHeading: dom.missingHeading, pageErrors: [...pageErrors], failedRequests: [...failedRequests] };
      if (clickText) {
        const buttons = await page.$$('button');
        let found = false;
        for (const button of buttons) if ((await button.evaluate((el) => el.innerText)).includes(clickText)) { await button.click(); found = true; break; }
        if (!found) result.pageErrors.push(`Export button not found: ${clickText}`);
        else {
          const deadline = Date.now() + 30000; let files = [];
          while (Date.now() < deadline && files.length === 0) { await new Promise((resolve) => setTimeout(resolve, 200)); files = fs.readdirSync(temp).filter((x) => !x.endsWith('.crdownload')); }
          if (!files.length) result.pageErrors.push('Export did not produce a completed download within 30 seconds');
          else { const file = path.join(temp, files[0]); try { result.artifact = validateArtifact(file, artifactExtension || path.extname(file)); } catch (error) { result.pageErrors.push(`Export validation failed: ${error.message}`); } }
        }
      }
      assertBrowserHealthy(result); passed++;
      console.log(`PASS ${target.id} ${language} ${width}px${result.artifact ? ` export=${result.artifact.extension} ${result.artifact.bytes}B` : ''}`);
    }
    console.log(`Passed ${passed}/${targets.length} tool route(s).`);
  } finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
}
