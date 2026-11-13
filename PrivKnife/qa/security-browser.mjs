import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const baseUrl = process.env.PRIVKNIFE_PREVIEW_URL || 'http://127.0.0.1:4201';
const baseOrigin = new URL(baseUrl).origin;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function verifyLanguage(language) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument((lang) => localStorage.setItem('privknife_lang', lang), language);
  await page.setRequestInterception(true);
  const externalRequests = [];
  const pageErrors = [];
  const cspErrors = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === baseOrigin) {
      request.continue();
      return;
    }
    externalRequests.push({ url: request.url(), method: request.method() });
    if (['cloudflare-dns.com', 'dns.google', 'dns.quad9.net', 'dns.adguard-dns.com'].includes(url.hostname)) {
      request.respond({
        status: 200,
        contentType: 'application/dns-json',
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS' },
        body: JSON.stringify({ Status: 0, Answer: [{ name: 'example.com.', type: 1, TTL: 300, data: '93.184.215.14' }] }),
      }).catch((error) => pageErrors.push(`mock DoH response failed: ${error.message}`));
      return;
    }
    request.abort('blockedbyclient').catch(() => {});
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to (?:load|connect|create|execute)/i.test(message.text())) cspErrors.push(message.text());
  });

  try {
    await page.goto(`${baseUrl}/tools/web-vitals`, { waitUntil: 'networkidle2' });
    const cspHeader = await page.evaluate(async () => (await fetch('/')).headers.get('content-security-policy'));
    assert.ok(cspHeader?.includes("object-src 'none'"), 'legacy route response must include the production CSP');
    const legacyHeading = await page.$eval('h1', (element) => element.textContent || '');
    assert.match(legacyHeading, language === 'es' ? /no está disponible/i : /unavailable/i);
    assert.match(await page.$eval('body', (element) => element.innerText), /Google PageSpeed/);
    const legacyUrls = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
    assert.equal(legacyUrls.some((url) => /googleapis\.com|pagespeedonline/i.test(url)), false);
    assert.equal(externalRequests.length, 0, 'the disabled PageSpeed route must not make outgoing requests');

    await page.goto(`${baseUrl}/tools/dns-checker`, { waitUntil: 'networkidle2' });
    const disclosure = await page.$eval('#dns-query-disclosure-title', (element) => element.textContent || '');
    assert.match(disclosure, language === 'es' ? /sale de tu dispositivo/i : /leaves your device/i);
    assert.equal(await page.$eval('button[type="submit"]', (button) => button.disabled), true);
    assert.equal(externalRequests.length, 0, 'opening the DNS checker must not call public resolvers');

    await page.click('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.body.innerText.includes('93.184.215.14'), { timeout: 10000 });
    const resolverRequests = externalRequests.map(({ url }) => new URL(url));
    assert.equal(resolverRequests.length, 4);
    assert.deepEqual(new Set(resolverRequests.map((url) => url.host)), new Set([
      'cloudflare-dns.com',
      'dns.google',
      'dns.quad9.net:5053',
      'dns.adguard-dns.com',
    ]));
    for (const url of resolverRequests) {
      assert.deepEqual([...url.searchParams.keys()].sort(), ['name', 'type']);
      assert.equal(url.searchParams.get('name'), 'example.com');
      assert.equal(url.searchParams.get('type'), 'A');
    }

    const workerAndWasm = await page.evaluate(async () => {
      const workerUrl = URL.createObjectURL(new Blob(['self.postMessage("worker-ok")'], { type: 'text/javascript' }));
      try {
        const workerResult = await new Promise((resolve, reject) => {
          const worker = new Worker(workerUrl);
          const timeout = setTimeout(() => reject(new Error('blob worker timed out')), 3000);
          worker.onmessage = (event) => { clearTimeout(timeout); worker.terminate(); resolve(event.data); };
          worker.onerror = (event) => { clearTimeout(timeout); worker.terminate(); reject(new Error(event.message)); };
        });
        const wasm = await WebAssembly.instantiate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
        return { workerResult, wasmInstance: wasm.instance instanceof WebAssembly.Instance };
      } finally {
        URL.revokeObjectURL(workerUrl);
      }
    });
    assert.equal(workerAndWasm.workerResult, 'worker-ok');
    assert.equal(workerAndWasm.wasmInstance, true);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(cspErrors, []);
    console.log(`PASS privacy network flow, consent, CSP, blob Worker and WebAssembly: ${language}`);
  } finally {
    await page.close();
  }
}

try {
  for (const language of ['en', 'es']) await verifyLanguage(language);
  console.log(`PASS secure production preview: ${baseUrl}`);
} finally {
  await browser.close();
}
