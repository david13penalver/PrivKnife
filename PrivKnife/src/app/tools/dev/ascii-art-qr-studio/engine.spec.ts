import { describe, expect, it, vi } from 'vitest';
import {
  buildQrPayload,
  computeQrContrast,
  convertImageDataToAscii,
  renderAsciiBanner,
  renderBarcode1dSvg,
  renderQrSvg,
  svgToDataUri,
  wrapAsciiComment,
} from './engine';
import {
  VALID_TINY_LOGO_DATA_URL,
  WIFI_ESCAPE_FIXTURE,
  createSingleDotBraillePatch,
  createSolidPixelPatch,
} from './test-fixtures';
import {
  ASCII_BANNER_FONTS,
  DEFAULT_BANNER_OPTIONS,
  DEFAULT_BARCODE_OPTIONS,
  DEFAULT_IMAGE_ASCII_OPTIONS,
  DEFAULT_QR_OPTIONS,
} from './types';

describe('ASCII Banner & Image-to-ASCII/Braille Engine (Spec 122 — Seam 1A)', () => {
  it('renders distinct multi-line ASCII banners across all 6 bundled fonts and supports multi-line/spacing/empty input', () => {
    const renderedOutputs = new Set<string>();

    for (const font of ASCII_BANNER_FONTS) {
      const out = renderAsciiBanner({
        text: 'OK!',
        font,
        letterSpacing: 1,
        commentWrapper: 'none',
      });
      expect(out.trim().length).toBeGreaterThan(0);
      expect(out.split('\n').length).toBeGreaterThanOrEqual(3);
      renderedOutputs.add(out);
    }

    expect(renderedOutputs.size).toBe(6);

    const multiLine = renderAsciiBanner({
      text: 'HI\nBYE',
      font: 'small',
      letterSpacing: 0,
      commentWrapper: 'none',
    });
    expect(multiLine.split('\n').length).toBe(7); // 3 rows + blank divider + 3 rows

    expect(
      renderAsciiBanner({
        text: '',
        font: 'standard',
        letterSpacing: 1,
        commentWrapper: 'hash',
      }),
    ).toBe('');
  });

  it('wraps ASCII banners cleanly across hash, js_line, js_block, html, and sql comment styles', () => {
    const hashed = renderAsciiBanner({
      text: 'DEV',
      font: 'standard',
      letterSpacing: 1,
      commentWrapper: 'hash',
    });
    const lines = hashed.split('\n');
    expect(lines.length).toBe(5);
    for (const line of lines) {
      expect(line.startsWith('# ')).toBe(true);
    }

    expect(wrapAsciiComment('A\nB', 'js_line')).toBe('// A\n// B');
    expect(wrapAsciiComment('A\nB', 'sql')).toBe('-- A\n-- B');
    expect(wrapAsciiComment('A\nB', 'js_block')).toBe('/*\n * A\n * B\n */');
    expect(wrapAsciiComment('A\nB', 'html')).toBe('<!--\nA\nB\n-->');
  });

  it('converts 2x4 pixel cells into ISO/IEC 10646 Unicode Braille patterns accurately', () => {
    const black2x4 = createSolidPixelPatch(2, 4, 0, 0, 0);
    const white2x4 = createSolidPixelPatch(2, 4, 255, 255, 255);

    const blackOut = convertImageDataToAscii(black2x4, {
      ...DEFAULT_IMAGE_ASCII_OPTIONS,
      mode: 'braille',
      columns: 1,
      ditherBraille: false,
      invertLuminance: false,
    });
    expect(blackOut).toBe('\u28ff'); // ⣿

    const whiteOut = convertImageDataToAscii(white2x4, {
      ...DEFAULT_IMAGE_ASCII_OPTIONS,
      mode: 'braille',
      columns: 1,
      ditherBraille: false,
      invertLuminance: false,
    });
    expect(whiteOut).toBe('\u2800'); // ⠀

    // Invert brightness reverses solid white -> full dots and solid black -> empty braille
    expect(
      convertImageDataToAscii(white2x4, {
        ...DEFAULT_IMAGE_ASCII_OPTIONS,
        mode: 'braille',
        columns: 1,
        ditherBraille: false,
        invertLuminance: true,
      }),
    ).toBe('\u28ff');

    // Individual dot bits match ISO/IEC 10646 dot positions
    const brailleOpts = {
      ...DEFAULT_IMAGE_ASCII_OPTIONS,
      mode: 'braille' as const,
      columns: 1,
      ditherBraille: false,
    };
    expect(convertImageDataToAscii(createSingleDotBraillePatch(0, 0), brailleOpts)).toBe('\u2801');
    expect(convertImageDataToAscii(createSingleDotBraillePatch(1, 0), brailleOpts)).toBe('\u2808');
    expect(convertImageDataToAscii(createSingleDotBraillePatch(0, 3), brailleOpts)).toBe('\u2840');
    expect(convertImageDataToAscii(createSingleDotBraillePatch(1, 3), brailleOpts)).toBe('\u2880');

    // Floyd-Steinberg dithering produces valid Braille glyphs on mid-gray grids
    const grayPatch = createSolidPixelPatch(8, 8, 128, 128, 128);
    const dithered = convertImageDataToAscii(grayPatch, {
      ...DEFAULT_IMAGE_ASCII_OPTIONS,
      mode: 'braille',
      columns: 4,
      ditherBraille: true,
    });
    const ditherRows = dithered.split('\n');
    expect(ditherRows).toHaveLength(2);
    expect(ditherRows[0]).toMatch(/^[\u2800-\u28ff]{4}$/);
  });

  it('renders ASCII luminance ramps with 0.5 aspect compensation and guards zero-sized inputs', () => {
    const blackBlock = createSolidPixelPatch(4, 4, 0, 0, 0);
    const whiteBlock = createSolidPixelPatch(4, 4, 255, 255, 255);

    expect(
      convertImageDataToAscii(blackBlock, {
        ...DEFAULT_IMAGE_ASCII_OPTIONS,
        mode: 'blocks',
        columns: 4,
      }).split('\n')[0],
    ).toBe('████');

    expect(
      convertImageDataToAscii(whiteBlock, {
        ...DEFAULT_IMAGE_ASCII_OPTIONS,
        mode: 'ramp_dense',
        columns: 4,
      }).split('\n')[0],
    ).toBe('    ');

    expect(
      convertImageDataToAscii({ width: 0, height: 0, data: [] }, DEFAULT_IMAGE_ASCII_OPTIONS),
    ).toBe('');
  });
});

describe('Static 2D QR, Contrast Check, 1D Barcodes & Privacy (Spec 122 — Seam 1B)', () => {
  it('builds escaped Wi-Fi, vCard (CRLF-safe), email, sms, geo, and text/URL QR payloads', () => {
    expect(buildQrPayload(WIFI_ESCAPE_FIXTURE)).toBe(
      'WIFI:T:WPA;S:Home\\;Net;P:p\\:a\\\\s\\,s;H:false;;',
    );

    const vcardPayload = buildQrPayload({
      ...DEFAULT_QR_OPTIONS,
      payloadType: 'vcard',
      vcard: {
        fullName: 'Ada\r\nBYE:INJECTED',
        phone: '+1-555-0199',
        email: 'ada@example.com',
        organization: 'Engines',
        website: 'https://example.com',
      },
    });
    expect(vcardPayload).toContain('BEGIN:VCARD\nVERSION:3.0');
    expect(vcardPayload).toContain('FN:Ada BYE:INJECTED');
    expect(vcardPayload).not.toContain('\nBYE:INJECTED');

    expect(buildQrPayload({ ...DEFAULT_QR_OPTIONS, payloadType: 'email' })).toMatch(
      /^mailto:security@example\.com\?/,
    );
    expect(buildQrPayload({ ...DEFAULT_QR_OPTIONS, payloadType: 'sms' })).toMatch(
      /^smsto:\+1-555-0199:/,
    );
    expect(buildQrPayload({ ...DEFAULT_QR_OPTIONS, payloadType: 'geo' })).toBe(
      'geo:40.4168,-3.7038',
    );
  });

  it('calculates WCAG luminance contrast and flags low-contrast or inverted QR colors', () => {
    const low = computeQrContrast('#EEEEEE', '#FFFFFF');
    expect(low.isScannable).toBe(false);
    expect(low.warningKey).toBe('low_contrast');
    expect(low.ratio).toBeLessThan(3);

    const optimal = computeQrContrast('#000000', '#FFFFFF');
    expect(optimal.ratio).toBe(21);
    expect(optimal.isScannable).toBe(true);
    expect(optimal.warningKey).toBeUndefined();

    const inverted = computeQrContrast('#fff', '#000');
    expect(inverted.ratio).toBe(21);
    expect(inverted.isScannable).toBe(false);
    expect(inverted.warningKey).toBe('inverted_polarity');
  });

  it('renders custom SVG QR codes (square/rounded/dots), auto-bumps EC to H for logos, and blocks unsafe URLs', () => {
    for (const style of ['square', 'rounded', 'dots'] as const) {
      const res = renderQrSvg({
        ...DEFAULT_QR_OPTIONS,
        moduleStyle: style,
      });
      expect(res.success).toBe(true);
      expect(res.svg).toContain('<svg');
      expect(res.moduleCount).toBeGreaterThanOrEqual(21);
      expect(svgToDataUri(res.svg)).toMatch(/^data:image\/svg\+xml;base64,/);
    }

    const withLogo = renderQrSvg({
      ...DEFAULT_QR_OPTIONS,
      errorCorrection: 'L',
      logoDataUrl: VALID_TINY_LOGO_DATA_URL,
      logoScalePercent: 55,
    });
    expect(withLogo.success).toBe(true);
    expect(withLogo.effectiveErrorCorrection).toBe('H');
    expect(withLogo.svg).toContain('<image');
    expect(withLogo.svg).not.toContain('javascript:');

    const unsafeLogo = renderQrSvg({
      ...DEFAULT_QR_OPTIONS,
      errorCorrection: 'L',
      logoDataUrl: 'javascript:alert(1)',
      logoScalePercent: 18,
    });
    expect(unsafeLogo.success).toBe(true);
    expect(unsafeLogo.effectiveErrorCorrection).toBe('L');
    expect(unsafeLogo.svg).not.toContain('<image');
    expect(unsafeLogo.svg).not.toContain('javascript:');

    const emptyQr = renderQrSvg({ ...DEFAULT_QR_OPTIONS, rawText: '   ' });
    expect(emptyQr.success).toBe(false);
  });

  it('renders crisp vector SVG 1D barcodes and rejects malformed symbology payloads cleanly', () => {
    const code128 = renderBarcode1dSvg({
      ...DEFAULT_BARCODE_OPTIONS,
      value: 'TEST<128>&"A"',
      format: 'CODE128',
    });
    expect(code128.success).toBe(true);
    expect(code128.svg).toContain('<svg');
    expect(code128.svg).toContain('&lt;128&gt;&amp;&quot;A&quot;');

    expect(
      renderBarcode1dSvg({
        ...DEFAULT_BARCODE_OPTIONS,
        format: 'EAN13',
        value: '5901234123457',
      }).success,
    ).toBe(true);
    expect(
      renderBarcode1dSvg({
        ...DEFAULT_BARCODE_OPTIONS,
        format: 'UPC',
        value: '036000291452',
      }).success,
    ).toBe(true);
    expect(
      renderBarcode1dSvg({
        ...DEFAULT_BARCODE_OPTIONS,
        format: 'CODE39',
        value: 'PRIV-123',
      }).success,
    ).toBe(true);
    expect(
      renderBarcode1dSvg({
        ...DEFAULT_BARCODE_OPTIONS,
        format: 'ITF14',
        value: '10012345678902',
      }).success,
    ).toBe(true);

    const invalidEan = renderBarcode1dSvg({
      ...DEFAULT_BARCODE_OPTIONS,
      format: 'EAN13',
      value: 'not-a-valid-ean',
    });
    expect(invalidEan.success).toBe(false);
    expect(invalidEan.error).toBeTruthy();
  });

  it('performs zero network requests, zero storage writes, and zero Math.random() calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const mathSpy = vi.spyOn(Math, 'random');

    try {
      renderAsciiBanner(DEFAULT_BANNER_OPTIONS);
      convertImageDataToAscii(createSolidPixelPatch(4, 8, 60, 60, 60), DEFAULT_IMAGE_ASCII_OPTIONS);
      renderQrSvg(DEFAULT_QR_OPTIONS);
      renderBarcode1dSvg(DEFAULT_BARCODE_OPTIONS);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(mathSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      storageSpy.mockRestore();
      mathSpy.mockRestore();
    }
  });
});
