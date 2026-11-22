import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';

const origin = new URL(process.env.PRIVKNIFE_QA_URL ?? 'http://127.0.0.1:4533').origin;
const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'privknife-115-'));
console.log('Artifacts', folder);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const unexpectedRequests = [];
browser.on('targetcreated', (target) => {
  if (target.type() === 'other' && /^https?:/.test(target.url()) && new URL(target.url()).origin !== origin) {
    unexpectedRequests.push(target.url());
  }
});
const artifact = async (basename) => {
  const file = path.join(folder, basename);
  for (let i = 0; i < 250; i++) {
    try {
      return { file, bytes: await fs.readFile(file) };
    } catch {
      await new Promise((done) => setTimeout(done, 100));
    }
  }
  throw new Error('Missing download ' + file);
};

async function open(route, width, language = 'en', setup) {
  const context = await browser.createBrowserContext({
    downloadBehavior: { policy: 'allow', downloadPath: folder },
  });
  const page = await context.newPage();
  await page.setViewport({ width, height: 850, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((lang) => {
    try {
      localStorage.setItem('privknife_lang', lang);
    } catch {}
  }, language);
  if (setup) await page.evaluateOnNewDocument(setup);

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== origin)
      unexpectedRequests.push('external ' + request.url());
  });
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED')
      console.error(request.url(), request.failure()?.errorText);
  });
  page.on('pageerror', (error) => unexpectedRequests.push(error.message));
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) console.error(route, msg.text());
  });
  page.on('workercreated', (worker) => console.log('worker', route, worker.url()));
  await page.goto(origin + '/tools/' + route);
  await page.waitForSelector('h1');
  await page.waitForFunction((language) => document.documentElement.lang === language, {}, language);
  return { page, context };
}

async function findButton(page, text) {
  const buttons = await page.$$('button');
  for (const button of buttons) {
    if ((await button.evaluate((value) => value.innerText.trim())).includes(text)) return button;
  }
  throw new Error('Missing button ' + text);
}
async function checkWidth(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
}
async function upload(page, file) {
  const input = await page.waitForSelector('input[type=file]', { visible: false });
  await input.uploadFile(file);
}

try {
  const source = await PDFDocument.create();
  source.setTitle('AUDITMARK');
  const sourcePage = source.addPage([200, 200]);
  const font = await source.embedFont(StandardFonts.Helvetica);
  sourcePage.drawText('VISIBLEWORD', { x: 16, y: 164, size: 14, font });
  sourcePage.drawText('AUDITMARK', { x: 16, y: 105, size: 14, font });
  sourcePage.node.set(
    PDFName.of('Annots'),
    source.context.obj([
      source.context.register(
        source.context.obj({
          Type: 'Annot',
          Subtype: 'Text',
          Rect: [16, 160, 26, 170],
          Contents: PDFString.of('AUDITMARK'),
        }),
      ),
    ]),
  );
  const sourcePdf = path.join(folder, 'redact.pdf');
  await fs.writeFile(sourcePdf, await source.save());
  {
    const { page, context } = await open('pdf-redaction', 390);
    await upload(page, sourcePdf);
    const image = await page.waitForSelector('img[alt*="Page"]');
    const stage = await image.evaluateHandle((element) => element.parentElement);
    await stage.asElement().scrollIntoView();
    const box = await stage.asElement().boundingBox();
    assert.ok(box);
    const down = { x: box.x + (8 / 200) * box.width, y: box.y + (75 / 200) * box.height };
    const end = { x: box.x + (130 / 200) * box.width, y: box.y + (105 / 200) * box.height };
    await page.touchscreen.touchStart(down.x, down.y);
    await page.touchscreen.touchMove(end.x, end.y);
    await page.touchscreen.touchEnd();
    await page.waitForFunction(() => document.body.innerText.includes('Burn & Export (1)'), {
      timeout: 4000,
    });
    const button = await findButton(page, 'Burn & Export (1)');
    await button.scrollIntoView();
    await page.waitForFunction((node) => !node.disabled, {}, button);
    await button.click();
    const output = await artifact('redact-redacted.pdf').catch(async (error) => {
      console.error((await page.$eval('body', (body) => body.innerText)).slice(0, 1500));
      throw error;
    });
    assert.equal(execFileSync('pdftotext', [output.file, '-'], { encoding: 'utf8' }).trim(), '');
    const reopened = await PDFDocument.load(output.bytes);
    assert.equal(reopened.getPage(0).node.get(PDFName.of('Annots'))?.size() ?? 0, 0);
    assert.equal(reopened.getTitle(), '');
    assert.equal(output.bytes.includes(Buffer.from('AUDITMARK')), false);
    assert.equal(reopened.catalog.get(PDFName.of('AcroForm')), undefined);
    execFileSync('pdftoppm', ['-r', '72', '-png', '-singlefile', output.file, path.join(folder, 'raster')]);
    const pixel = execFileSync(
      'magick',
      [path.join(folder, 'raster.png'), '-colorspace', 'Gray', '-format', '%[fx:p{65,87}]', 'info:'],
      { encoding: 'utf8' },
    );
    assert.equal(Number(pixel), 0);
    const visibleInk = execFileSync(
      'magick',
      [
        path.join(folder, 'raster.png'),
        '-crop',
        '125x22+5+20',
        '-colorspace',
        'Gray',
        '-format',
        '%[fx:minima]',
        'info:',
      ],
      { encoding: 'utf8' },
    );
    assert.ok(Number(visibleInk) < 0.1, 'The unredacted word is still visible in the rendered export.');
    console.log('PASS redaction touch export, independent text extraction and covered pixel');
    await context.close();
  }
  {
    const { page, context } = await open('pdf-redaction', 320, 'en', () => {
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        postMessage(data, options) {
          if (data?.redactions) {
            queueMicrotask(() =>
              this.dispatchEvent(new ErrorEvent('error', { message: 'forced PDF render failure' })),
            );
          } else {
            return super.postMessage(data, options);
          }
        }
      };
    });
    const failedPdf = path.join(folder, 'forced-failure.pdf');
    await fs.copyFile(sourcePdf, failedPdf);
    await upload(page, failedPdf);
    await page.waitForSelector('img[alt*="Page"]');
    const button = await findButton(page, 'Burn & Export');
    await button.scrollIntoView();
    await page.waitForFunction((node) => !node.disabled, {}, button);
    await button.click();
    await page.waitForFunction(() => document.body.innerText.includes('No redacted PDF was created.'));
    await assert.rejects(fs.access(path.join(folder, 'forced-failure-redacted.pdf')));
    console.log('PASS redaction worker failure blocks export');
    await context.close();
  }

  for (const [width, language] of [
    [320, 'en'],
    [390, 'es'],
  ]) {
    const { page, context } = await open('local-ocr-text-extractor', width, language);
    for (const [name, text] of [
      ['blank', ''],
      ['unique', 'SAPPHIRE ORCHARD XYZ'],
      ['broken', null],
    ]) {
      const fileName = path.join(folder, width + '-' + name + '.png');
      if (text === null) await fs.writeFile(fileName, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      else {
        const png = await page.evaluate((text) => {
          const canvas = document.createElement('canvas');
          canvas.width = 950;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#000';
          ctx.font = 'bold 56px sans-serif';
          if (text) ctx.fillText(text, 55, 112);
          return canvas.toDataURL('image/png').split(',')[1];
        }, text);
        await fs.writeFile(fileName, Buffer.from(png, 'base64'));
      }

      if (width === 320) {
        const picker = await page.waitForSelector('app-dropzone [role=button]');
        await picker.focus();
        const [chooser] = await Promise.all([page.waitForFileChooser(), page.keyboard.press('Enter')]);
        await chooser.accept([fileName]);
      } else await upload(page, fileName);
      await page.waitForFunction(
        (name) =>
          document.querySelector('.c-ocr__filename')?.textContent.includes(name) &&
          !document.querySelector('app-local-ocr-text-extractor [role=alert]'),
        { timeout: 5000 },
        path.basename(fileName),
      );
      const button = await findButton(page, language === 'es' ? 'Extraer Texto' : 'Extract Text');
      if (width === 320) {
        await button.focus();
        await page.keyboard.press('Enter');
      } else await button.tap();

      if (name !== 'unique') {
        await page.waitForSelector('app-local-ocr-text-extractor [role=alert]', { timeout: 30000 });
        const error = await page.$eval('app-local-ocr-text-extractor [role=alert]', (el) =>
          el.textContent.trim(),
        );
        assert.match(
          error,
          name === 'blank' ? /No readable text|No se encontró texto/ : /Could not open|No se pudo abrir/,
        );
        assert.equal(await page.$('.c-ocr__textarea'), null);
        const disabled = await findButton(page, language === 'es' ? 'Descargar' : 'Download');
        assert.equal(await disabled.evaluate((button) => button.disabled), true);
        const accessibility = await (await page.createCDPSession()).send('Accessibility.getFullAXTree');
        assert.ok(accessibility.nodes.some((node) => node.role?.value === 'alert'));
      } else {
        await page.waitForFunction(
          (text) =>
            document.querySelector('.c-ocr__textarea')?.value.includes(text) ||
            document.querySelector('app-local-ocr-text-extractor [role=alert]'),
          { timeout: 12000 },
          text,
        );
        const alert = await page.$('app-local-ocr-text-extractor [role=alert]');
        if (alert) throw new Error(await alert.evaluate((el) => el.textContent));
        const preview = await page.$eval('.c-ocr__textarea', (el) => el.value);
        const download = await findButton(page, language === 'es' ? 'Descargar TXT' : 'Download TXT');
        if (width === 320) {
          await download.focus();
          await page.keyboard.press('Enter');
        } else await download.tap();
        const output = await artifact(width + '-unique-ocr.txt');
        assert.equal(output.bytes.toString().trim(), preview.trim());
      }
      await checkWidth(page);
    }
    const reset = await findButton(page, language === 'es' ? 'Restablecer' : 'Reset');
    await reset.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('app-local-ocr-text-extractor [role=alert]'));
    assert.equal(await reset.evaluate((button) => button === document.activeElement), true);
    console.log('PASS OCR blank, unique and broken image, accessible errors, and reset at', width, language);
    if (width === 390) {
      const scanned = await PDFDocument.create();
      const textImage = await scanned.embedPng(await fs.readFile(path.join(folder, '390-unique.png')));
      scanned.addPage([475, 90]).drawImage(textImage, { x: 0, y: 0, width: 475, height: 90 });
      const scannedPdf = path.join(folder, 'scanned.pdf');
      await fs.writeFile(scannedPdf, await scanned.save());
      await upload(page, scannedPdf);
      await (await findButton(page, 'Extraer Texto')).click();
      await page.waitForFunction(
        () => document.querySelector('.c-ocr__textarea')?.value.includes('SAPPHIRE ORCHARD XYZ'),
        { timeout: 25000 },
      );
      console.log('PASS scanned PDF OCR');
    }
    await context.close();
  }
  {
    const { page, context } = await open('font-subsetter-converter', 390);
    await upload(
      page,
      new URL('../node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf', import.meta.url)
        .pathname,
    );
    const state = await page.waitForSelector('.c-font-subsetter__stats-banner, .c-alert--danger', {
      timeout: 20000,
    });
    assert.equal(
      await state.evaluate((element) => element.classList.contains('c-alert--danger')),
      false,
      await state.evaluate((element) => element.textContent),
    );
    const button = await findButton(page, 'Download liberationsans-regular.woff2');
    await button.click();
    const output = await artifact('liberationsans-regular.woff2');
    execFileSync('woff2_decompress', [output.file]);
    const reopened = output.file.replace(/\.woff2$/, '.ttf');
    const glyphs = execFileSync('fc-query', ['--format', '%{charset}', reopened], { encoding: 'utf8' });
    assert.match(glyphs, /20-7e/);
    await checkWidth(page);
    console.log('PASS real-font WOFF2 export, reference decoder and font character coverage');
    await context.close();
  }
  assert.deepEqual(unexpectedRequests, []);
  console.log('PASS Spec 115 audit browser regressions');
} finally {
  await browser.close();
}
